
// ============================================================================
// FOCKIS JWT STRATEGY
//
// Database-authoritative authentication
// Persistent sessions for regular users
// Route-aware administrator security
// Effective RBAC permissions
//
// SESSION POLICY:
// - Regular users: no inactivity expiration or maximum session age.
// - Premium users, sellers, employers and Academy students: same as regular.
// - Admins: existing security restrictions on admin routes.
// - Super Admins: existing stricter security restrictions.
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

  iat?: number;
  exp?: number;
}

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
  // REGULAR FOCKIS USERS
  // ==========================================================================
  //
  // Persistent login.
  //
  // No inactivity timeout.
  // No maximum session age enforced by this strategy.
  //
  // Applies to:
  // - Regular users
  // - Premium users
  // - Sellers
  // - Employers
  // - Academy students
  // - Other non-administrator accounts
  //
  // NOTE: Passport still validates the JWT exp claim.
  // A persistent login requires a working refresh-token mechanism.
  // ==========================================================================

  private readonly STANDARD_SESSION: SessionPolicy = {
    name: "standard",
    inactivityMinutes: 0,
    maximumSessionHours: 0,
  };

  // ==========================================================================
  // ADMIN
  // ==========================================================================

  private readonly ADMIN_SESSION: SessionPolicy = {
    name: "admin",
    inactivityMinutes: 10,
    maximumSessionHours: 8,
  };

  // ==========================================================================
  // SUPER ADMIN
  // ==========================================================================

  private readonly SUPER_ADMIN_SESSION: SessionPolicy = {
    name: "super_admin",
    inactivityMinutes: 5,
    maximumSessionHours: 4,
  };

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

    const sessionPolicy =
      this.getSessionPolicy(
        request,
        userRole,
        isSuperAdmin,
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
        Boolean(user.mustChangePassword),

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
  ): SessionPolicy {

    // ========================================================================
    // SUPER ADMIN
    // ========================================================================

    if (
      isSuperAdmin ||
      userRole === "super_admin"
    ) {
      return this.SUPER_ADMIN_SESSION;
    }

    // ========================================================================
    // ADMIN AND MODERATOR
    // ========================================================================

    if (
      userRole === "admin" ||
      userRole === "moderator"
    ) {
      const path =
        this.getRequestPath(request);

      if (this.isAdminPath(path)) {
        return this.ADMIN_SESSION;
      }
    }

    // ========================================================================
    // ALL OTHER ACCOUNTS
    // ========================================================================
    //
    // Do not expire sessions because of:
    // - Inactivity
    // - Time spent logged in
    // - Accessing Academy
    // - Accessing Careers
    // - Accessing Organizations
    // - Accessing Marketplace
    // - Accessing Seller Center
    //
    // All non-super-admin accounts use the standard persistent policy.
    // ========================================================================

    return this.STANDARD_SESSION;
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
