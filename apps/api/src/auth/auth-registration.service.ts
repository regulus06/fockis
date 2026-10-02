import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import * as bcrypt from "bcryptjs";

import { UsersService } from "../users/users.service";

import {
  formatPublicFockisId,
} from "../users/constants/fockis-country.constants";

import { AuthSecurityService } from "./auth-security.service";

@Injectable()
export class AuthRegistrationService {
  private readonly PASSWORD_BCRYPT_ROUNDS = 12;

  constructor(
    private readonly usersService: UsersService,
    private readonly securityService: AuthSecurityService,
  ) {}

  async register(
    username: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    countryCode?: string,
  ) {
    // ============================================================
    // NORMALIZE
    // ============================================================

    const normalizedEmail = String(
      email || "",
    )
      .toLowerCase()
      .trim();

    const normalizedUsername = String(
      username || "",
    )
      .trim()
      .toLowerCase();

    const normalizedFirstName = String(
      firstName || "",
    ).trim();

    const normalizedLastName = String(
      lastName || "",
    ).trim();

    const normalizedCountryCode =
      String(countryCode || "")
        .trim()
        .toUpperCase();

    // ============================================================
    // BASIC VALIDATION
    // ============================================================

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

    // ============================================================
    // COUNTRY VALIDATION
    // ============================================================

    if (!normalizedCountryCode) {
      throw new BadRequestException(
        "Country is required.",
      );
    }

    if (
      !/^[A-Z]{2}$/.test(
        normalizedCountryCode,
      )
    ) {
      throw new BadRequestException(
        "Invalid country code.",
      );
    }

    // ============================================================
    // CHECK EMAIL
    // ============================================================

    const existing =
      await this.usersService.findByEmail(
        normalizedEmail,
      );

    if (existing) {
      throw new BadRequestException(
        "Email already exists.",
      );
    }

    // ============================================================
    // PASSWORD SECURITY
    // ============================================================

    this.securityService.validatePassword(
      password,
    );

    // ============================================================
    // HASH PASSWORD
    // ============================================================

    const hash =
      await bcrypt.hash(
        password,
        this.PASSWORD_BCRYPT_ROUNDS,
      );

    // ============================================================
    // CREATE USER
    //
    // UsersService is responsible for generating:
    // - callingCode
    // - fockisId
    //
    // We only provide countryCode.
    // ============================================================

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
      } as any);

    if (!user) {
      throw new BadRequestException(
        "Unable to create account.",
      );
    }

    // ============================================================
    // PUBLIC FOCKIS ID
    // ============================================================

    const publicFockisId =
      user.fockisId &&
      user.callingCode
        ? formatPublicFockisId(
            user.fockisId,
            user.callingCode,
          )
        : null;

    // ============================================================
    // RESPONSE
    // ============================================================

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

        // Internal Fockis identity.
        fockisId:
          user.fockisId,

        // Country selected by user.
        countryCode:
          user.countryCode,

        // Generated by UsersService.
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
}