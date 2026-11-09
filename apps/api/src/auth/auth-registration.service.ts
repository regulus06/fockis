
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

interface RegistrationConsent {
  termsAccepted: boolean;
  acceptedPolicies: string[];
  policyAcceptanceVersion: string;
  policyAcceptedAt?: Date;
}

// Every policy on the sign-up checkbox must be accepted. Must match the policies listed on the sign-up checkbox (web/src/pages/Register.tsx).
const REQUIRED_POLICIES = [
  "terms",
  "privacy",
  "community-guidelines",
  "child-safety",
  "payments",
  "shop-advertising",
  "copyright",
] as const;

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
    consent?: RegistrationConsent,
  ) {
    const normalizedEmail = String(email || "")
      .toLowerCase()
      .trim();

    const normalizedUsername = String(username || "")
      .trim()
      .toLowerCase();

    const normalizedFirstName = String(firstName || "").trim();
    const normalizedLastName = String(lastName || "").trim();

    const normalizedCountryCode = String(countryCode || "")
      .trim()
      .toUpperCase();

    if (!normalizedUsername) {
      throw new BadRequestException("Username is required.");
    }

    if (!/^[a-z0-9._]{3,30}$/.test(normalizedUsername)) {
      throw new BadRequestException(
        "Username can only use letters, numbers, dots and underscores (3-30 characters). Do not use your email address.",
      );
    }

    if (!normalizedEmail) {
      throw new BadRequestException("Email is required.");
    }

    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      throw new BadRequestException(
        "Please provide a valid email address.",
      );
    }

    if (!password) {
      throw new BadRequestException("Password is required.");
    }

    if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
      throw new BadRequestException(
        "A valid two-letter country code is required.",
      );
    }

    if (!consent || consent.termsAccepted !== true) {
      throw new BadRequestException(
        "You must accept the terms and policies to create an account.",
      );
    }

    if (
      !Array.isArray(consent.acceptedPolicies) ||
      !REQUIRED_POLICIES.every((policy) =>
        consent.acceptedPolicies.includes(policy),
      )
    ) {
      throw new BadRequestException(
        "You must accept all required policies to create an account.",
      );
    }

    if (
      typeof consent.policyAcceptanceVersion !== "string" ||
      !consent.policyAcceptanceVersion.trim() ||
      consent.policyAcceptanceVersion.trim().length > 50
    ) {
      throw new BadRequestException(
        "A valid policy acceptance version is required.",
      );
    }

    const existing = await this.usersService.findByEmail(
      normalizedEmail,
    );

    if (existing) {
      throw new BadRequestException("Email already exists.");
    }

    this.securityService.validatePassword(password);

    const hash = await bcrypt.hash(
      password,
      this.PASSWORD_BCRYPT_ROUNDS,
    );

    const user = await this.usersService.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hash,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      countryCode: normalizedCountryCode,

      termsAccepted: true,
      acceptedPolicies: [...REQUIRED_POLICIES],
      policyAcceptanceVersion:
        consent.policyAcceptanceVersion.trim(),
      policyAcceptedAt: new Date(),

      mustChangePassword: false,
      passwordHistory: [],
      passwordChangedAt: new Date(),
      passwordResetByAdmin: false,
      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
      lockedUntil: null,
      lockoutCount: 0,
      lastLoginAt: null,
      lastLoginIp: null,
      lastLoginUserAgent: null,
      lastActiveAt: null,
      online: false,
      lastSeen: null,
    } as any);

    if (!user) {
      throw new BadRequestException(
        "Unable to create account.",
      );
    }

    const publicFockisId =
      user.fockisId && user.callingCode
        ? formatPublicFockisId(
            user.fockisId,
            user.callingCode,
          )
        : null;

    return {
      message: "User created successfully.",
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        fockisId: user.fockisId,
        countryCode: user.countryCode,
        callingCode: user.callingCode,
        publicFockisId,
        role: user.role || "user",
        isActive: user.isActive,
        mustChangePassword: Boolean(
          user.mustChangePassword,
        ),
      },
    };
  }
}
