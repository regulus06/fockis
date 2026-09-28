// ============================================================================
// FOCKIS JWT STRATEGY
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
// JWT STRATEGY
// ============================================================================

@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
  "jwt",
) {
  private readonly DEFAULT_INACTIVITY_TIMEOUT_MINUTES = 15;

  private readonly DEFAULT_MAXIMUM_SESSION_HOURS = 12;

  private readonly ACTIVITY_UPDATE_INTERVAL_MS =
    60 * 1000;

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      secretOrKey:
        process.env.JWT_SECRET ||
        "secretKey123",

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
    console.log(
      "🔐 JWT STRATEGY: validate() reached",
    );

    // ========================================================================
    // RESOLVE USER ID
    // ========================================================================

    const userId =
      payload?.sub ??
      payload?.userId ??
      payload?.id;

    if (!userId) {
      console.error(
        "❌ JWT AUTH: token has no user ID",
      );

      throw new UnauthorizedException(
        "Invalid authentication token: user ID is missing.",
      );
    }

    if (
      !Types.ObjectId.isValid(userId)
    ) {
      console.error(
        "❌ JWT AUTH: invalid user ID",
      );

      throw new UnauthorizedException(
        "Invalid authentication token: invalid user ID.",
      );
    }

    console.log(
      "🔐 JWT AUTH: user ID resolved",
      userId,
    );

    // ========================================================================
    // LOAD CURRENT USER
    // ========================================================================

    const user =
      await this.userModel
        .findById(userId)
        .lean()
        .exec();

    if (!user) {
      console.error(
        "❌ JWT AUTH: user not found",
      );

      throw new UnauthorizedException(
        "User not found.",
      );
    }

    // ========================================================================
    // RESOLVE ROLE
    // ========================================================================

    const userRole =
      String(
        (user as any).role ??
        payload?.role ??
        "user",
      )
        .trim()
        .toLowerCase();

    // ========================================================================
    // RESOLVE SUPER ADMIN
    // ========================================================================

    const databaseIsSuperAdmin =
      Boolean(
        (user as any)
          .isSuperAdmin,
      );

    const roleIsSuperAdmin =
      userRole ===
        "super_admin" ||
      userRole ===
        "superadmin";

    const isSuperAdmin =
      databaseIsSuperAdmin ||
      roleIsSuperAdmin;

    console.log(
      "🔐 JWT AUTHORIZATION",
      {
        userId:
          String(user._id),

        role:
          userRole,

        databaseIsSuperAdmin,

        roleIsSuperAdmin,

        isSuperAdmin,
      },
    );

    // ========================================================================
    // USER FOUND
    // ========================================================================

    console.log(
      "🔐 JWT AUTH: user found",
      {
        id:
          String(user._id),

        fockisId:
          String(
            (user as any)
              .fockisId || "",
          ),

        email:
          user.email,

        role:
          userRole,

        isActive:
          user.isActive,

        isSuperAdmin,

        mustChangePassword:
          Boolean(
            user.mustChangePassword,
          ),
      },
    );

    // ========================================================================
    // ACCOUNT STATUS
    // ========================================================================

    if (!Boolean(user.isActive)) {
      console.error(
        "❌ JWT AUTH: account disabled",
      );

      throw new UnauthorizedException(
        "This account has been disabled.",
      );
    }

    // ========================================================================
    // ACCOUNT LOCKOUT
    // ========================================================================

    const lockedUntil =
      this.toDate(
        user.lockedUntil,
      );

    if (
      lockedUntil &&
      lockedUntil.getTime() >
        Date.now()
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

      console.error(
        "❌ JWT AUTH: account locked",
      );

      throw new UnauthorizedException(
        `This account is temporarily locked. Try again in ${remainingSeconds} seconds.`,
      );
    }

    // ========================================================================
    // JWT MAXIMUM SESSION AGE
    // ========================================================================

    if (
      typeof payload?.iat ===
      "number"
    ) {
      const issuedAtMs =
        payload.iat * 1000;

      const maximumSessionMs =
        this.DEFAULT_MAXIMUM_SESSION_HOURS *
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
        console.error(
          "❌ JWT AUTH: maximum session age exceeded",
        );

        throw new UnauthorizedException(
          "Your session has expired. Please sign in again.",
        );
      }
    }

    // ========================================================================
    // INACTIVITY SECURITY
    // ========================================================================

    const lastActiveAt =
      this.toDate(
        user.lastActiveAt,
      );

    if (lastActiveAt) {
      const inactivityLimitMs =
        this.DEFAULT_INACTIVITY_TIMEOUT_MINUTES *
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
              lastSeen:
                new Date(),
            },
          },
        );

        console.error(
          "❌ JWT AUTH: inactivity timeout",
        );

        throw new UnauthorizedException(
          "Your session expired because of inactivity. Please sign in again.",
        );
      }
    }

    // ========================================================================
    // REFRESH ACTIVITY
    // ========================================================================

    const now =
      Date.now();

    let shouldUpdateActivity =
      false;

    if (!lastActiveAt) {
      shouldUpdateActivity =
        true;
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
        (user as any)
          .fockisId || "",
      )
        .trim()
        .toUpperCase();

    // ========================================================================
    // SUCCESS
    // ========================================================================

    console.log(
      "✅ JWT AUTH SUCCESS",
      {
        userId:
          String(user._id),

        fockisId,

        role:
          userRole,

        isSuperAdmin,
      },
    );

    // ========================================================================
    // REQUEST.USER
    // ========================================================================

    return {
      id:
        user._id.toString(),

      userId:
        user._id.toString(),

      sub:
        user._id.toString(),

      // PUBLIC FOCKIS ID
      fockisId,

      email:
        user.email,

      username:
        user.username,

      role:
        userRole,

      permissions:
        user.permissions ||
        [],

      isSuperAdmin,

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
          user.failedLoginAttempts ||
          0,
        ),

      lockedUntil:
        user.lockedUntil ||
        null,

      lockoutCount:
        Number(
          user.lockoutCount ||
          0,
        ),

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
        (user as any)
          .operatingSystem,
    };
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

    if (
      value instanceof Date
    ) {
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