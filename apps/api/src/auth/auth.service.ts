import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

import { UsersService } from "../users/users.service";

import * as bcrypt from "bcryptjs";

import { JwtService } from "@nestjs/jwt";

import {
  formatPublicFockisId,
} from "../users/constants/fockis-country.constants";

@Injectable()
export class AuthService {
  // ============================================================
  // SECURITY DEFAULTS
  // ============================================================

  private readonly MAX_FAILED_LOGIN_ATTEMPTS = 5;

  private readonly LOGIN_RETRY_DELAY_SECONDS = 30;

  private readonly ACCOUNT_LOCKOUT_MINUTES = 15;

  private readonly FAILED_LOGIN_RESET_MINUTES = 30;

  private readonly PASSWORD_MINIMUM_LENGTH = 12;

  private readonly PASSWORD_BCRYPT_ROUNDS = 12;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // ============================================================
  // REGISTER
  // ============================================================

  async register(
    username: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    countryCode?: string,
  ) {
    // ==========================================================
    // NORMALIZE
    // ==========================================================

    const normalizedEmail = String(email || "")
      .toLowerCase()
      .trim();

    const normalizedUsername = String(username || "")
      .trim()
      .toLowerCase();

    const normalizedFirstName = String(firstName || "")
      .trim();

    const normalizedLastName = String(lastName || "")
      .trim();

    const normalizedCountryCode = String(countryCode || "")
      .trim()
      .toUpperCase();

    // ==========================================================
    // BASIC VALIDATION
    // ==========================================================

    if (!normalizedUsername) {
      throw new BadRequestException(
        "Username is required.",
      );
    }

    if (!normalizedEmail) {
      throw new BadRequestException(
        "Email is required.",
      );
    }

    if (!password) {
      throw new BadRequestException(
        "Password is required.",
      );
    }

    // ==========================================================
    // COUNTRY IS REQUIRED
    // ==========================================================

    if (!normalizedCountryCode) {
      throw new BadRequestException(
        "Country is required.",
      );
    }

    if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
      throw new BadRequestException(
        "Invalid country code.",
      );
    }

    // ==========================================================
    // CHECK EMAIL
    // ==========================================================

    const existing =
      await this.usersService.findByEmail(
        normalizedEmail,
      );

    if (existing) {
      throw new BadRequestException(
        "Email already exists.",
      );
    }

    // ==========================================================
    // PASSWORD SECURITY
    // ==========================================================

    this.validatePassword(password);

    // ==========================================================
    // HASH PASSWORD
    // ==========================================================

    const hash =
      await bcrypt.hash(
        password,
        this.PASSWORD_BCRYPT_ROUNDS,
      );

    // ==========================================================
    // CREATE USER
    // ==========================================================
    //
    // We send countryCode.
    //
    // We DO NOT send callingCode.
    //
    // UsersService determines the calling code from countryCode.
    //
    // Examples:
    //
    // HT -> +509
    // US -> +1
    // FR -> +33
    //
    // ==========================================================

    const user =
      await this.usersService.create({
        username:
          normalizedUsername,

        email:
          normalizedEmail,

        password:
          hash,

        firstName:
          normalizedFirstName,

        lastName:
          normalizedLastName,

        countryCode:
          normalizedCountryCode,

        mustChangePassword:
          false,

        passwordHistory:
          [],

        passwordChangedAt:
          new Date(),

        passwordResetByAdmin:
          false,

        failedLoginAttempts:
          0,

        lastFailedLoginAt:
          null,

        lockedUntil:
          null,

        lockoutCount:
          0,

        lastLoginAt:
          null,

        lastLoginIp:
          null,

        lastLoginUserAgent:
          null,

        lastActiveAt:
          null,

        online:
          false,

        lastSeen:
          null,
      });

    // ==========================================================
    // PUBLIC FOCKIS ID
    // ==========================================================

    const publicFockisId =
      user.fockisId &&
      user.callingCode
        ? formatPublicFockisId(
            user.fockisId,
            user.callingCode,
          )
        : null;

    // ==========================================================
    // RESPONSE
    // ==========================================================

    return {
      message:
        "User created successfully.",

      user: {
        _id:
          user._id,

        id:
          user._id,

        username:
          user.username,

        email:
          user.email,

        firstName:
          user.firstName || "",

        lastName:
          user.lastName || "",

        // Internal identity.
        fockisId:
          user.fockisId,

        // Country selected by user.
        countryCode:
          user.countryCode,

        // Generated by backend.
        callingCode:
          user.callingCode,

        // Public Fockis identity.
        publicFockisId,

        role:
          user.role || "user",

        isActive:
          user.isActive,

        mustChangePassword:
          Boolean(
            user.mustChangePassword,
          ),
      },
    };
  }

  // ============================================================
  // LOGIN
  // ============================================================

  async login(
    email: string,
    password: string,
    request?: any,
  ) {
    const normalizedEmail =
      String(email || "")
        .toLowerCase()
        .trim();

    if (
      !normalizedEmail ||
      !password
    ) {
      throw new UnauthorizedException(
        "Invalid credentials",
      );
    }

    const user =
      await this.usersService.findByEmail(
        normalizedEmail,
      );

    if (!user) {
      throw new UnauthorizedException(
        "Invalid credentials",
      );
    }

    if (user.isActive === false) {
      throw new UnauthorizedException(
        "This account has been disabled.",
      );
    }

    const now =
      Date.now();

    // ==========================================================
    // ACCOUNT LOCKOUT
    // ==========================================================

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

        throw this.tooManyRequests(
          `Account locked. Try again in ${remainingSeconds} seconds.`,
        );
      }

      await this.usersService.clearLoginLockout(
        String(user._id),
      );
    }

    // ==========================================================
    // RETRY DELAY
    // ==========================================================

    if (user.lastFailedLoginAt) {
      const lastFailedAt =
        new Date(
          user.lastFailedLoginAt,
        ).getTime();

      const retryDelayMilliseconds =
        this.LOGIN_RETRY_DELAY_SECONDS *
        1000;

      const elapsed =
        now -
        lastFailedAt;

      if (
        elapsed <
        retryDelayMilliseconds
      ) {
        const remainingSeconds =
          Math.max(
            1,
            Math.ceil(
              (
                retryDelayMilliseconds -
                elapsed
              ) / 1000,
            ),
          );

        throw this.tooManyRequests(
          `Please wait ${remainingSeconds} seconds before trying again.`,
        );
      }
    }

    // ==========================================================
    // PASSWORD
    // ==========================================================

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

    if (!passwordMatches) {
      const securityResult =
        await this.usersService.recordFailedLogin(
          String(user._id),
          {
            maxFailedAttempts:
              this.MAX_FAILED_LOGIN_ATTEMPTS,

            retryDelaySeconds:
              this.LOGIN_RETRY_DELAY_SECONDS,

            lockoutMinutes:
              this.ACCOUNT_LOCKOUT_MINUTES,

            failedResetMinutes:
              this.FAILED_LOGIN_RESET_MINUTES,
          },
        );

      if (securityResult?.locked) {
        throw this.tooManyRequests(
          "Too many failed login attempts. Your account has been locked for 15 minutes.",
        );
      }

      throw new UnauthorizedException(
        "Invalid credentials",
      );
    }

    // ==========================================================
    // SUCCESSFUL LOGIN
    // ==========================================================

    const userId =
      user._id.toString();

    const ip =
      this.getRequestIp(
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
      updatedUser ||
      user;

    // ==========================================================
    // FOCKIS ID
    // ==========================================================

    let finalFockisId =
      String(
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

    // ==========================================================
    // COUNTRY
    // ==========================================================

    const countryCode =
      String(
        (currentUser as any)
          .countryCode || "",
      )
        .trim()
        .toUpperCase();

    const callingCode =
      String(
        (currentUser as any)
          .callingCode || "",
      ).trim();

    const publicFockisId =
      callingCode
        ? formatPublicFockisId(
            finalFockisId,
            callingCode,
          )
        : finalFockisId;

    // ==========================================================
    // JWT
    // ==========================================================

    const payload = {
      sub:
        userId,

      email:
        currentUser.email,

      username:
        currentUser.username,

      role:
        currentUser.role ||
        "user",

      permissions:
        currentUser.permissions ||
        [],

      mustChangePassword:
        Boolean(
          (currentUser as any)
            .mustChangePassword,
        ),
    };

    const token =
      this.jwtService.sign(
        payload,
      );

    // ==========================================================
    // RESPONSE
    // ==========================================================

    return {
      access_token:
        token,

      mustChangePassword:
        Boolean(
          (currentUser as any)
            .mustChangePassword,
        ),

      user: {
        _id:
          userId,

        id:
          userId,

        fockisId:
          finalFockisId,

        publicFockisId,

        countryCode,

        callingCode,

        username:
          currentUser.username,

        email:
          currentUser.email,

        firstName:
          currentUser.firstName ||
          "",

        lastName:
          currentUser.lastName ||
          "",

        role:
          currentUser.role ||
          "user",

        permissions:
          currentUser.permissions ||
          [],

        mustChangePassword:
          Boolean(
            (currentUser as any)
              .mustChangePassword,
          ),
      },
    };
  }

  // ============================================================
  // PASSWORD VALIDATION
  // ============================================================

  private validatePassword(
    password: string,
  ): void {
    const value =
      String(password || "");

    if (
      value.length <
      this.PASSWORD_MINIMUM_LENGTH
    ) {
      throw new BadRequestException(
        `Password must be at least ${this.PASSWORD_MINIMUM_LENGTH} characters long.`,
      );
    }

    if (!/[A-Z]/.test(value)) {
      throw new BadRequestException(
        "Password must contain at least one uppercase letter.",
      );
    }

    if (!/[a-z]/.test(value)) {
      throw new BadRequestException(
        "Password must contain at least one lowercase letter.",
      );
    }

    if (!/[0-9]/.test(value)) {
      throw new BadRequestException(
        "Password must contain at least one number.",
      );
    }

    if (
      !/[^A-Za-z0-9]/.test(
        value,
      )
    ) {
      throw new BadRequestException(
        "Password must contain at least one special character.",
      );
    }
  }

  // ============================================================
  // HTTP 429
  // ============================================================

  private tooManyRequests(
    message: string,
  ): HttpException {
    return new HttpException(
      {
        statusCode:
          HttpStatus.TOO_MANY_REQUESTS,

        message,

        error:
          "Too Many Requests",
      },

      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  // ============================================================
  // CLIENT IP
  // ============================================================

  private getRequestIp(
    request?: any,
  ): string | null {
    if (!request) {
      return null;
    }

    const forwardedFor =
      request.headers?.[
        "x-forwarded-for"
      ];

    if (
      typeof forwardedFor ===
        "string" &&
      forwardedFor.length > 0
    ) {
      return forwardedFor
        .split(",")[0]
        .trim();
    }

    return (
      request.ip ||
      request.socket?.remoteAddress ||
      null
    );
  }
}