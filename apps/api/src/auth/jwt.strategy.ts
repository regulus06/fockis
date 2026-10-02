// ============================================================================
// FOCKIS JWT STRATEGY
// Database-authoritative authentication + route-aware session security
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
  | "protected"
  | "admin"
  | "super_admin";

interface SessionPolicy {
  name: SessionPolicyName;
  inactivityMinutes: number;
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
  // STANDARD FOCKIS
  // ==========================================================================

  /**
   * Normal social/platform areas should not force users to re-authenticate
   * after only a few minutes of inactivity.
   *
   * Applies to:
   * - Feed
   * - Social
   * - Shop
   * - Marketplace
   * - Real Estate
   * - Travel
   * - Music
   * - Playlists
   * - Messages
   * - Other normal Fockis features
   */
  private readonly STANDARD_SESSION: SessionPolicy = {
    name: "standard",
    inactivityMinutes: 120,
    maximumSessionHours: 24,
  };

  // ==========================================================================
  // PROTECTED FOCKIS AREAS
  // ==========================================================================

  /**
   * More sensitive application areas.
   *
   * Applies to:
   * - Organizations
   * - Academy
   * - Careers
   */
  private readonly PROTECTED_SESSION: SessionPolicy = {
    name: "protected",
    inactivityMinutes: 15,
    maximumSessionHours: 12,
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

  /**
   * Avoid writing to MongoDB on every API request.
   */
  private readonly ACTIVITY_UPDATE_INTERVAL_MS =
    60 * 1000;

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(AdminRole.name)
    private readonly adminRoleModel: Model<AdminRoleDocument>,
  ) {
    const jwtSecret = process.env.JWT_SECRET?.trim();

    // ------------------------------------------------------------------------
    // JWT SECRET
    // ------------------------------------------------------------------------

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

    /**
     * Authorization is always based on the current database record.
     *
     * The JWT does NOT get to decide:
     *
     * - role
     * - permissions
     * - super-admin status
     * - account status
     * - custom admin role
     */

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
      const remainingSeconds = Math.max(
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

    /**
     * Database is authoritative.
     *
     * Never fall back to payload.role.
     */
    const userRole =
      this.normalizeRole(
        String(
          (user as any).role ?? "user",
        ),
      );

    // ========================================================================
    // SUPER ADMIN
    // ========================================================================

    /**
     * JWT claims cannot elevate a user.
     */
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
          .exec() as AdminRoleDocument | null;

      /**
       * If a referenced custom role no longer exists
       * or is inactive, do not grant its permissions.
       */
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
    // MERGE PERMISSIONS
    // ========================================================================

    const permissions =
      Array.from(
        new Set([
          ...directPermissions,
          ...customRolePermissions,
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

    if (
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
        sessionAgeMs >
        maximumSessionMs
      ) {
        throw new UnauthorizedException(
          "Your session has expired. Please sign in again.",
        );
      }
    }

    // ========================================================================
    // ROUTE-AWARE INACTIVITY SECURITY
    // ========================================================================

    const lastActiveAt =
      this.toDate(
        user.lastActiveAt,
      );

    if (lastActiveAt) {
      const inactivityLimitMs =
        sessionPolicy.inactivityMinutes *
        60 *
        1000;

      const inactiveForMs =
        Date.now() -
        lastActiveAt.getTime();

      if (
        inactiveForMs >
        inactivityLimitMs
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
            lastActiveAt:
              activityDate,

            lastSeen:
              activityDate,

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
      // ======================================================================
      // IDENTIFIERS
      // ======================================================================

      id:
        user._id.toString(),

      userId:
        user._id.toString(),

      sub:
        user._id.toString(),

      fockisId,

      // ======================================================================
      // ACCOUNT
      // ======================================================================

      email:
        user.email,

      username:
        user.username,

      // ======================================================================
      // SYSTEM ROLE
      // ======================================================================

      role:
        userRole,

      // ======================================================================
      // CUSTOM ADMIN ROLE
      // ======================================================================

      adminRoleId:
        customRoleId,

      adminRoleSlug:
        customRoleSlug,

      adminRoleName:
        customRoleName,

      // ======================================================================
      // PERMISSIONS
      // ======================================================================

      permissions,

      // ======================================================================
      // SUPER ADMIN
      // ======================================================================

      isSuperAdmin,

      // ======================================================================
      // SESSION POLICY
      // ======================================================================

      sessionPolicy:
        sessionPolicy.name,

      inactivityTimeoutMinutes:
        sessionPolicy.inactivityMinutes,

      maximumSessionHours:
        sessionPolicy.maximumSessionHours,

      // ======================================================================
      // ACCOUNT SECURITY
      // ======================================================================

      isActive:
        Boolean(
          user.isActive,
        ),

      verified:
        Boolean(
          user.verified,
        ),

      mustChangePassword:
        Boolean(
          user.mustChangePassword,
        ),

      passwordChangedAt:
        user.passwordChangedAt ||
        null,

      passwordResetByAdmin:
        Boolean(
          user.passwordResetByAdmin,
        ),

      failedLoginAttempts:
        Number(
          user.failedLoginAttempts || 0,
        ),

      lockedUntil:
        user.lockedUntil ||
        null,

      lockoutCount:
        Number(
          user.lockoutCount || 0,
        ),

      // ======================================================================
      // ACTIVITY
      // ======================================================================

      lastLoginAt:
        user.lastLoginAt ||
        null,

      lastActiveAt:
        user.lastActiveAt ||
        null,

      lastSeen:
        user.lastSeen ||
        null,

      online:
        Boolean(
          user.online,
        ),

      // ======================================================================
      // PROFILE / OPTIONAL FIELDS
      // ======================================================================

      age:
        (user as any).age,

      gender:
        (user as any).gender,

      country:
        (user as any).country,

      state:
        (user as any).state,

      city:
        (user as any).city,

      interests:
        (user as any).interests,

      categories:
        (user as any).categories,

      behaviors:
        (user as any).behaviors,

      device:
        (user as any).device,

      operatingSystem:
        (user as any).operatingSystem,
    };
  }

  // ==========================================================================
  // SESSION POLICY ROUTER
  // ==========================================================================

  /**
   * Determines the security policy based on the current API route.
   *
   * IMPORTANT:
   *
   * This does NOT change authorization.
   *
   * It only determines how long the current authentication session
   * may remain valid and how long it may remain inactive.
   */
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
    // ADMIN
    // ========================================================================

    if (
      userRole === "admin" ||
      userRole === "moderator"
    ) {
      const path =
        this.getRequestPath(request);

      if (
        this.isAdminPath(path)
      ) {
        return this.ADMIN_SESSION;
      }
    }

    // ========================================================================
    // PROTECTED APPLICATION AREAS
    // ========================================================================

    const path =
      this.getRequestPath(request);

    if (
      this.isProtectedApplicationPath(path)
    ) {
      return this.PROTECTED_SESSION;
    }

    // ========================================================================
    // NORMAL FOCKIS
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

    /**
     * Remove query string.
     */
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
  // PROTECTED APPLICATION ROUTES
  // ==========================================================================

  private isProtectedApplicationPath(
    path: string,
  ): boolean {
    return (
      // Organizations
      path === "/organizations" ||
      path.startsWith("/organizations/") ||

      // Academy
      path === "/academy" ||
      path.startsWith("/academy/") ||

      // Careers
      path === "/careers" ||
      path.startsWith("/careers/") ||

      // Singular route variants if used by older Fockis modules
      path === "/organization" ||
      path.startsWith("/organization/") ||

      path === "/career" ||
      path.startsWith("/career/")
    );
  }

  // ==========================================================================
  // ROLE NORMALIZATION
  // ==========================================================================

  private normalizeRole(
    role: unknown,
  ): string {
    return String(role ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
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
          .map((permission) =>
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