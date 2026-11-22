
// ============================================================================
// FOCKIS JWT STRATEGY
//
// Database-authoritative authentication
// Persistent sessions for regular users
// Route-aware administrator security
// Effective RBAC permissions
//
// SESSION POLICY (from the platform security policy in MongoDB):
// - Regular users: effective inactivity / maximum-session limits
//   (0 = none, which keeps the previous persistent sessions).
// - Organization-managed users: may be stricter via their organization.
// - Admins on /admin routes and Super Admins: their own limits.
// - Revoked sessions (password/security changes) are rejected.
// ============================================================================

import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import {
  PassportStrategy,
} from "@nestjs/passport";

import {
  ExtractJwt,
  Strategy,
} from "passport-jwt";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  User,
  UserDocument,
} from "../users/user.schema";

import {
  AdminRole,
  AdminRoleDocument,
} from "../admin/roles/admin-role.schema";

import {
  Role,
} from "../admin/rbac/roles.enum";

import {
  RolePermissions,
} from "../admin/rbac/role-permissions";

import {
  PlatformSecurityPolicyService,
} from "../admin/security/platform-security/platform-security-policy.service";

import {
  isPasswordExpired,
} from "../admin/security/platform-security/password-policy";

// ============================================================================
// JWT PAYLOAD
// ============================================================================

interface JwtPayload {
  sub?: string;
  id?: string;
  userId?: string;

  email?: string;
  username?: string;

  role?: string;
  permissions?: string[];

  isSuperAdmin?: boolean;

  mustChangePassword?: boolean;

  tokenType?: string;
  purpose?: string;

  iat?: number;
  exp?: number;
}

/**
 * Tokens that are only valid for one step of a flow and must never be
 * accepted as an access token (for example the MFA challenge token issued
 * after the password check, before the two-factor code).
 */
const NON_ACCESS_TOKEN_TYPES = new Set([
  "mfa_setup",
  "mfa_challenge",
  "reauth",
]);

// ============================================================================
// SESSION POLICY
// ============================================================================

type SessionPolicyName =
  | "standard"
  | "admin"
  | "super_admin";

interface SessionPolicy {
  name: SessionPolicyName;

  // Zero means no inactivity expiration.
  inactivityMinutes: number;

  // Zero means no maximum session age enforced here.
  maximumSessionHours: number;
}

// ============================================================================
// JWT STRATEGY
// ============================================================================

@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
  "jwt",
) {

  // ==========================================================================
  // SESSION LIMITS
  //
  // Inactivity and maximum-session limits come from the platform security
  // policy (Admin Center → Security & Identity → Session Management):
  //
  // - Super administrators: superAdmin* limits on every route.
  // - Administrators/moderators on /admin routes: admin* limits.
  // - Everyone else: the effective account policy (organization-managed
  //   users may have stricter limits from their organization). With the
  //   initial configuration (0 = off) regular users keep persistent sessions.
  // ==========================================================================

  // ==========================================================================
  // ACTIVITY WRITE THROTTLE
  // ==========================================================================

  private readonly ACTIVITY_UPDATE_INTERVAL_MS =
    60 * 1000;

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(AdminRole.name)
    private readonly adminRoleModel: Model<AdminRoleDocument>,

    private readonly securityPolicy: PlatformSecurityPolicyService,
  ) {
    const jwtSecret =
      process.env.JWT_SECRET?.trim();

    if (!jwtSecret) {
      throw new Error(
        "JWT_SECRET environment variable is required.",
      );
    }

    if (jwtSecret.length < 32) {
      throw new Error(
        "JWT_SECRET must be at least 32 characters.",
      );
    }

    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      secretOrKey: jwtSecret,

      // JWT expiration is still checked by Passport.
      ignoreExpiration: false,

      passReqToCallback: true,
    });
  }

  // ==========================================================================
  // VALIDATE JWT
  // ==========================================================================

  async validate(
    request: any,
    payload: JwtPayload,
  ) {

    // ========================================================================
    // RESOLVE USER ID
    // ========================================================================

    const userId =
      payload?.sub ??
      payload?.userId ??
      payload?.id;

    if (!userId) {
      throw new UnauthorizedException(
        "Invalid authentication token.",
      );
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new UnauthorizedException(
        "Invalid authentication token.",
      );
    }

    if (
      (payload?.tokenType &&
        NON_ACCESS_TOKEN_TYPES.has(String(payload.tokenType))) ||
      (payload?.purpose &&
        NON_ACCESS_TOKEN_TYPES.has(String(payload.purpose)))
    ) {
      throw new UnauthorizedException(
        "Invalid authentication token.",
      );
    }

    // ========================================================================
    // LOAD CURRENT USER
    // ========================================================================

    const user = await this.userModel
      .findById(userId)
      .lean()
      .exec();

    if (!user) {
      throw new UnauthorizedException(
        "User not found.",
      );
    }

    // ========================================================================
    // ACCOUNT STATUS
    // ========================================================================

    if (!Boolean(user.isActive)) {
      throw new UnauthorizedException(
        "This account has been disabled.",
      );
    }

    // ========================================================================
    // ACCOUNT LOCKOUT
    // ========================================================================

    const lockedUntil =
      this.toDate(user.lockedUntil);

    if (
      lockedUntil &&
      lockedUntil.getTime() > Date.now()
    ) {
      const remainingSeconds =
        Math.max(
          1,
          Math.ceil(
            (
              lockedUntil.getTime() -
              Date.now()
            ) / 1000,
          ),
        );

      throw new UnauthorizedException(
        `This account is temporarily locked. Try again in ${remainingSeconds} seconds.`,
      );
    }

    // ========================================================================
    // SESSION REVOCATION
    //
    // Tokens issued before the account's sessions were revoked (password
    // change, security change, administrator action) are rejected. The
    // session that made the change may be exempt.
    // ========================================================================

    const sessionsRevokedAt =
      this.toDate((user as any).sessionsRevokedAt);

    if (
      sessionsRevokedAt &&
      typeof payload?.iat === "number"
    ) {
      const revokedAtSeconds =
        Math.floor(
          sessionsRevokedAt.getTime() / 1000,
        );

      const exemptIat =
        Number(
          (user as any).sessionRevocationExemptIat,
        );

      if (
        payload.iat < revokedAtSeconds &&
        !(
          Number.isFinite(exemptIat) &&
          exemptIat > 0 &&
          payload.iat === exemptIat
        )
      ) {
        throw new UnauthorizedException(
          "You were signed out. Please sign in again.",
        );
      }
    }

    // ========================================================================
    // SYSTEM ROLE
    // ========================================================================

    const userRole =
      this.normalizeRole(
        String(
          (user as any).role ?? "user",
        ),
      );

    // ========================================================================
    // SUPER ADMIN
    // ========================================================================

    const databaseIsSuperAdmin =
      Boolean(
        (user as any).isSuperAdmin,
      );

    const roleIsSuperAdmin =
      userRole === "super_admin";

    const isSuperAdmin =
      databaseIsSuperAdmin ||
      roleIsSuperAdmin;

    // ========================================================================
    // SYSTEM ROLE PERMISSIONS
    // ========================================================================

    let systemRolePermissions: string[] = [];

    const roleEnumValue =
      this.getRoleEnumValue(userRole);

    if (roleEnumValue) {
      systemRolePermissions =
        this.normalizePermissions(
          RolePermissions[roleEnumValue] ?? [],
        );
    }

    // ========================================================================
    // CUSTOM ADMIN ROLE
    // ========================================================================

    let customRole:
      | AdminRoleDocument
      | null = null;

    let customRolePermissions: string[] = [];

    const adminRoleId =
      (user as any).adminRoleId;

    if (
      adminRoleId &&
      Types.ObjectId.isValid(
        String(adminRoleId),
      )
    ) {
      customRole =
        await this.adminRoleModel
          .findOne({
            _id: adminRoleId,
            isActive: true,
          })
          .lean()
          .exec() as
          | AdminRoleDocument
          | null;

      if (customRole) {
        customRolePermissions =
          this.normalizePermissions(
            Array.isArray(
              (customRole as any).permissions,
            )
              ? (customRole as any).permissions
              : [],
          );
      }
    }

    // ========================================================================
    // DIRECT USER PERMISSIONS
    // ========================================================================

    const directPermissions =
      this.normalizePermissions(
        Array.isArray(
          (user as any).permissions,
        )
          ? (user as any).permissions
          : [],
      );

    // ========================================================================
    // MERGE EFFECTIVE PERMISSIONS
    // ========================================================================

    const permissions =
      Array.from(
        new Set([
          ...systemRolePermissions,
          ...customRolePermissions,
          ...directPermissions,
        ]),
      );

    // ========================================================================
    // DETERMINE SESSION POLICY
    // ========================================================================

    const effectivePolicy =
      await this.securityPolicy.getEffectiveForUser({
        _id: user._id,
        role: userRole,
        isSuperAdmin,
        mfaRequired: (user as any).mfaRequired,
      });

    const platformPolicy =
      await this.securityPolicy.getPlatform();

    const sessionPolicy =
      this.getSessionPolicy(
        request,
        userRole,
        isSuperAdmin,
        effectivePolicy.values,
        platformPolicy.accounts,
      );

    // ========================================================================
    // PASSWORD EXPIRATION
    // ========================================================================

    const passwordExpired =
      isPasswordExpired(
        (user as any).passwordChangedAt ??
          (user as any).createdAt,
        effectivePolicy.values,
      );

    // ========================================================================
    // JWT MAXIMUM SESSION AGE
    // ========================================================================
    //
    // A zero maximumSessionHours means this strategy does not
    // enforce a maximum session age.
    //
    // Administrators retain their existing maximum-age limits.
    // ========================================================================

    if (
      sessionPolicy.maximumSessionHours > 0 &&
      typeof payload?.iat === "number"
    ) {
      const issuedAtMs =
        payload.iat * 1000;

      const maximumSessionMs =
        sessionPolicy.maximumSessionHours *
        60 *
        60 *
        1000;

      const sessionAgeMs =
        Date.now() -
        issuedAtMs;

      if (
        sessionAgeMs > maximumSessionMs
      ) {
        throw new UnauthorizedException(
          "Your session has expired. Please sign in again.",
        );
      }
    }

    // ========================================================================
    // ROUTE-AWARE INACTIVITY SECURITY
    // ========================================================================
    //
    // Regular users:
    // inactivityMinutes = 0
    // Therefore no inactivity logout.
    //
    // Administrators:
    // Existing inactivity restrictions remain.
    // ========================================================================

    const lastActiveAt =
      this.toDate(
        user.lastActiveAt,
      );

    if (
      sessionPolicy.inactivityMinutes > 0 &&
      lastActiveAt
    ) {
      const inactivityLimitMs =
        sessionPolicy.inactivityMinutes *
        60 *
        1000;

      const inactiveForMs =
        Date.now() -
        lastActiveAt.getTime();

      if (
        inactiveForMs > inactivityLimitMs
      ) {
        await this.userModel.updateOne(
          {
            _id: user._id,
          },
          {
            $set: {
              online: false,
              lastSeen: new Date(),
            },
          },
        );

        throw new UnauthorizedException(
          `Your ${sessionPolicy.name} session expired because of inactivity. Please sign in again.`,
        );
      }
    }

    // ========================================================================
    // REFRESH ACTIVITY
    // ========================================================================

    const now = Date.now();

    let shouldUpdateActivity = false;

    if (!lastActiveAt) {
      shouldUpdateActivity = true;
    } else {
      const elapsedSinceActivity =
        now -
        lastActiveAt.getTime();

      shouldUpdateActivity =
        elapsedSinceActivity >=
        this.ACTIVITY_UPDATE_INTERVAL_MS;
    }

    if (shouldUpdateActivity) {
      const activityDate =
        new Date();

      await this.userModel.updateOne(
        {
          _id: user._id,
        },
        {
          $set: {
            lastActiveAt: activityDate,
            lastSeen: activityDate,
            online: true,
          },
        },
      );
    }

    // ========================================================================
    // NORMALIZE FOCKIS ID
    // ========================================================================

    const fockisId =
      String(
        (user as any).fockisId || "",
      )
        .trim()
        .toUpperCase();

    // ========================================================================
    // CUSTOM ROLE INFORMATION
    // ========================================================================

    const customRoleId =
      customRole
        ? String(
            (customRole as any)._id,
          )
        : null;

    const customRoleSlug =
      customRole
        ? String(
            (customRole as any).slug || "",
          )
            .trim()
            .toLowerCase()
        : null;

    const customRoleName =
      customRole
        ? String(
            (customRole as any).name || "",
          ).trim()
        : null;

    // ========================================================================
    // REQUEST.USER
    // ========================================================================

    return {

      // IDENTIFIERS

      id: user._id.toString(),

      userId: user._id.toString(),

      sub: user._id.toString(),

      fockisId,

      // ACCOUNT

      email: user.email,

      username: user.username,

      // SYSTEM ROLE

      role: userRole,

      // CUSTOM ADMIN ROLE

      adminRoleId: customRoleId,

      adminRoleSlug: customRoleSlug,

      adminRoleName: customRoleName,

      // EFFECTIVE PERMISSIONS

      permissions,

      // SUPER ADMIN

      isSuperAdmin,

      // SESSION POLICY

      sessionPolicy: sessionPolicy.name,

      inactivityTimeoutMinutes:
        sessionPolicy.inactivityMinutes,

      maximumSessionHours:
        sessionPolicy.maximumSessionHours,

      // ACCOUNT SECURITY

      isActive: Boolean(user.isActive),

      verified: Boolean(user.verified),

      mustChangePassword:
        Boolean(user.mustChangePassword) ||
        passwordExpired,

      passwordExpired,

      // Issue time of the presented token (used to keep the current
      // session signed in when other sessions are revoked).
      tokenIssuedAt:
        typeof payload?.iat === "number"
          ? payload.iat
          : null,

      requiresTwoFactor:
        effectivePolicy.requiresTwoFactor,

      passwordChangedAt:
        user.passwordChangedAt || null,

      passwordResetByAdmin:
        Boolean(user.passwordResetByAdmin),

      failedLoginAttempts:
        Number(user.failedLoginAttempts || 0),

      lockedUntil:
        user.lockedUntil || null,

      lockoutCount:
        Number(user.lockoutCount || 0),

      // ACTIVITY

      lastLoginAt:
        user.lastLoginAt || null,

      lastActiveAt:
        user.lastActiveAt || null,

      lastSeen:
        user.lastSeen || null,

      online:
        Boolean(user.online),

      // PROFILE / OPTIONAL FIELDS

      age: (user as any).age,

      gender: (user as any).gender,

      country: (user as any).country,

      state: (user as any).state,

      city: (user as any).city,

      interests: (user as any).interests,

      categories: (user as any).categories,

      behaviors: (user as any).behaviors,

      device: (user as any).device,

      operatingSystem:
        (user as any).operatingSystem,
    };
  }

  // ==========================================================================
  // SYSTEM ROLE → ROLE ENUM
  // ==========================================================================

  private getRoleEnumValue(
    normalizedRole: string,
  ): Role | null {

    switch (normalizedRole) {
      case "user":
        return Role.USER;

      case "moderator":
        return Role.MODERATOR;

      case "admin":
        return Role.ADMIN;

      case "super_admin":
        return Role.SUPER_ADMIN;

      default:
        return null;
    }
  }

  // ==========================================================================
  // SESSION POLICY ROUTER
  // ==========================================================================

  private getSessionPolicy(
    request: any,
    userRole: string,
    isSuperAdmin: boolean,
    effective: Record<string, boolean | number>,
    platform: Record<string, boolean | number>,
  ): SessionPolicy {

    // ========================================================================
    // SUPER ADMIN
    // ========================================================================

    if (
      isSuperAdmin ||
      userRole === "super_admin"
    ) {
      return {
        name: "super_admin",
        inactivityMinutes:
          Number(platform.superAdminInactivityMinutes) || 5,
        maximumSessionHours:
          Number(platform.superAdminMaximumSessionHours) || 4,
      };
    }

    // ========================================================================
    // ADMIN AND MODERATOR ON ADMIN ROUTES
    // ========================================================================

    if (
      userRole === "admin" ||
      userRole === "moderator"
    ) {
      const path =
        this.getRequestPath(request);

      if (this.isAdminPath(path)) {
        return {
          name: "admin",
          inactivityMinutes:
            Number(platform.adminInactivityMinutes) || 10,
          maximumSessionHours:
            Number(platform.adminMaximumSessionHours) || 8,
        };
      }
    }

    // ========================================================================
    // ALL OTHER ACCOUNTS
    //
    // 0 means "no limit" for both values.
    // ========================================================================

    return {
      name: "standard",
      inactivityMinutes:
        Math.max(0, Number(effective.inactivityTimeoutMinutes) || 0),
      maximumSessionHours:
        Math.max(0, Number(effective.maximumSessionHours) || 0),
    };
  }

  // ==========================================================================
  // REQUEST PATH
  // ==========================================================================

  private getRequestPath(
    request: any,
  ): string {

    const rawPath =
      String(
        request?.originalUrl ??
        request?.url ??
        request?.path ??
        "",
      );

    const path =
      rawPath.split("?")[0];

    return path
      .trim()
      .toLowerCase()
      .replace(/\/+/g, "/");
  }

  // ==========================================================================
  // ADMIN ROUTES
  // ==========================================================================

  private isAdminPath(
    path: string,
  ): boolean {

    return (
      path === "/admin" ||
      path.startsWith("/admin/")
    );
  }

  // ==========================================================================
  // ROLE NORMALIZATION
  // ==========================================================================

  private normalizeRole(
    role: unknown,
  ): string {

    return String(
      role ?? "",
    )
      .trim()
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        "_",
      );
  }

  // ==========================================================================
  // PERMISSION NORMALIZATION
  // ==========================================================================

  private normalizePermissions(
    permissions: unknown,
  ): string[] {

    if (!Array.isArray(permissions)) {
      return [];
    }

    return Array.from(
      new Set(
        permissions
          .map(
            (permission) =>
              String(permission)
                .trim()
                .toLowerCase(),
          )
          .filter(Boolean),
      ),
    );
  }

  // ==========================================================================
  // DATE HELPER
  // ==========================================================================

  private toDate(
    value: unknown,
  ): Date | null {

    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(
        value.getTime(),
      )
        ? null
        : value;
    }

    const date =
      new Date(
        String(value),
      );

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return null;
    }

    return date;
  }
}
