import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcryptjs";

import { UsersService } from "../users/users.service";
import {
  User,
  UserDocument,
} from "../users/user.schema";

import { AuthTokenService } from "./auth-token.service";
import { AuthSecurityService } from "./auth-security.service";

@Injectable()
export class AuthLoginService {
  private readonly MAX_FAILED_LOGIN_ATTEMPTS = 5;
  private readonly LOGIN_RETRY_DELAY_SECONDS = 30;
  private readonly ACCOUNT_LOCKOUT_MINUTES = 15;
  private readonly FAILED_LOGIN_RESET_MINUTES = 30;

  constructor(
    private readonly usersService: UsersService,

    private readonly jwtService: JwtService,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly tokenService: AuthTokenService,

    private readonly securityService: AuthSecurityService,
  ) {}

  async login(
    email: string,
    password: string,
    request?: any,
  ) {
    const normalizedEmail = String(
      email || "",
    )
      .toLowerCase()
      .trim();

    // ------------------------------------------------------------
    // BASIC VALIDATION
    // ------------------------------------------------------------

    if (
      !normalizedEmail ||
      !password
    ) {
      throw new UnauthorizedException(
        "Invalid credentials",
      );
    }

    // ------------------------------------------------------------
    // FIND USER
    // ------------------------------------------------------------

    const user =
      await this.usersService.findByEmail(
        normalizedEmail,
      );

    if (!user) {
      throw new UnauthorizedException(
        "Invalid credentials",
      );
    }

    // ------------------------------------------------------------
    // ACCOUNT STATUS
    // ------------------------------------------------------------

    if (user.isActive === false) {
      throw new UnauthorizedException(
        "This account has been disabled.",
      );
    }

    const now = Date.now();

    // ------------------------------------------------------------
    // ACCOUNT LOCKOUT
    // ------------------------------------------------------------

    if (user.lockedUntil) {
      const lockedUntil =
        new Date(
          user.lockedUntil,
        ).getTime();

      if (lockedUntil > now) {
        const remainingSeconds =
          Math.max(
            1,
            Math.ceil(
              (lockedUntil - now) /
                1000,
            ),
          );

        throw this.securityService.tooManyRequests(
          `Account locked. Try again in ${remainingSeconds} seconds.`,
        );
      }

      await this.usersService.clearLoginLockout(
        String(user._id),
      );
    }

    // ------------------------------------------------------------
    // LOGIN RETRY DELAY
    // ------------------------------------------------------------

    if (user.lastFailedLoginAt) {
      const lastFailedAt =
        new Date(
          user.lastFailedLoginAt,
        ).getTime();

      const retryDelayMilliseconds =
        this
          .LOGIN_RETRY_DELAY_SECONDS *
        1000;

      const elapsed =
        now - lastFailedAt;

      if (
        elapsed <
        retryDelayMilliseconds
      ) {
        const remainingSeconds =
          Math.max(
            1,
            Math.ceil(
              (retryDelayMilliseconds -
                elapsed) /
                1000,
            ),
          );

        throw this.securityService.tooManyRequests(
          `Please wait ${remainingSeconds} seconds before trying again.`,
        );
      }
    }

    // ------------------------------------------------------------
    // PASSWORD
    // ------------------------------------------------------------

    if (!user.password) {
      throw new UnauthorizedException(
        "Invalid credentials",
      );
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password,
      );

    // ------------------------------------------------------------
    // FAILED LOGIN
    // ------------------------------------------------------------

    if (!passwordMatches) {
      const securityResult =
        await this.usersService.recordFailedLogin(
          String(user._id),
          {
            maxFailedAttempts:
              this
                .MAX_FAILED_LOGIN_ATTEMPTS,

            retryDelaySeconds:
              this
                .LOGIN_RETRY_DELAY_SECONDS,

            lockoutMinutes:
              this
                .ACCOUNT_LOCKOUT_MINUTES,

            failedResetMinutes:
              this
                .FAILED_LOGIN_RESET_MINUTES,
          },
        );

      if (
        securityResult?.locked
      ) {
        throw this.securityService.tooManyRequests(
          "Too many failed login attempts. Your account has been locked for 15 minutes.",
        );
      }

      throw new UnauthorizedException(
        "Invalid credentials",
      );
    }

    // ------------------------------------------------------------
    // SUCCESSFUL LOGIN
    // ------------------------------------------------------------

    const userId =
      user._id.toString();

    const ip =
      this.securityService.getRequestIp(
        request,
      );

    const userAgent =
      typeof request?.headers?.[
        "user-agent"
      ] === "string"
        ? request.headers[
            "user-agent"
          ]
        : undefined;

    const updatedUser =
      await this.usersService.recordSuccessfulLogin(
        userId,
        ip || undefined,
        userAgent || undefined,
      );

    const currentUser =
      updatedUser || user;

    // ------------------------------------------------------------
    // FOCKIS ID
    // ------------------------------------------------------------

    let finalFockisId = String(
      (currentUser as any)
        .fockisId || "",
    )
      .trim()
      .toUpperCase();

    if (!finalFockisId) {
      finalFockisId =
        await this.usersService.getOrCreateFockisId(
          userId,
        );
    }

    // ------------------------------------------------------------
    // REFRESH USER FROM DATABASE
    //
    // This makes sure MFA/security fields are current.
    // ------------------------------------------------------------

    const freshUser =
      await this.userModel
        .findById(userId)
        .select(
          "+mfaSecret +mfaRecoveryCodes",
        )
        .exec();

    const loginUser =
      freshUser ||
      (currentUser as UserDocument);

    // ------------------------------------------------------------
    // MFA REQUIREMENT
    // ------------------------------------------------------------

    const mfaRequired =
      this.isMfaRequired(
        loginUser,
      );

    if (mfaRequired) {
      // ----------------------------------------------------------
      // MFA SETUP REQUIRED
      // ----------------------------------------------------------

      if (!loginUser.mfaEnabled) {
        const setupToken =
          this.jwtService.sign(
            {
              sub: userId,
              email: loginUser.email,
              purpose:
                "mfa_setup",
              tokenType:
                "mfa_setup",
            },
            {
              expiresIn: "5m",
            },
          );

        return {
          requiresMfa: true,

          mfaSetupRequired:
            true,

          mfaVerified:
            false,

          setup_token:
            setupToken,

          message:
            "MFA setup is required before access is granted.",

          user: {
            _id: userId,

            id: userId,

            email:
              loginUser.email,

            username:
              loginUser.username,

            role:
              loginUser.role ||
              "user",

            mfaEnabled:
              false,

            mfaRequired:
              true,
          },
        };
      }

      // ----------------------------------------------------------
      // MFA CHALLENGE REQUIRED
      // ----------------------------------------------------------

      const challengeToken =
        this.jwtService.sign(
          {
            sub: userId,

            email:
              loginUser.email,

            purpose:
              "mfa_challenge",

            tokenType:
              "mfa_challenge",
          },
          {
            expiresIn: "5m",
          },
        );

      return {
        requiresMfa: true,

        mfaSetupRequired:
          false,

        mfaVerified:
          false,

        challenge_token:
          challengeToken,

        message:
          "MFA verification required.",

        user: {
          _id: userId,

          id: userId,

          email:
            loginUser.email,

          username:
            loginUser.username,

          role:
            loginUser.role ||
            "user",

          mfaEnabled:
            true,

          mfaRequired:
            true,
        },
      };
    }

    // ------------------------------------------------------------
    // CREATE ACCESS TOKEN
    // ------------------------------------------------------------

    const token =
      this.tokenService.createAccessToken(
        loginUser,
        userId,
        false,
      );

    // ------------------------------------------------------------
    // NORMAL LOGIN RESPONSE
    // ------------------------------------------------------------

    return {
      access_token:
        token,

      requiresMfa:
        false,

      mfaVerified:
        false,

      mustChangePassword:
        Boolean(
          (loginUser as any)
            .mustChangePassword,
        ),

      user:
        await this.tokenService.buildUserForTokenResponse(
          loginUser,
          userId,
        ),
    };
  }

  // ============================================================
  // MFA REQUIREMENT
  // ============================================================

  private isMfaRequired(
    user: any,
  ): boolean {
    const role = String(
      user?.role || "",
    )
      .trim()
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        "_",
      );

    return (
      role === "admin" ||
      role === "super_admin" ||
      role === "superadmin" ||
      Boolean(
        user?.mfaRequired,
      )
    );
  }
}