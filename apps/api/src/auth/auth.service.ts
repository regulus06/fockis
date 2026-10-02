import {
  BadRequestException,
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

import { formatPublicFockisId } from "../users/constants/fockis-country.constants";

import { AuthRegistrationService } from "./auth-registration.service";
import { AuthLoginService } from "./auth-login.service";
import { AuthTokenService } from "./auth-token.service";
import { AuthSecurityService } from "./auth-security.service";
import { MfaService } from "./mfa.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly registrationService: AuthRegistrationService,
    private readonly loginService: AuthLoginService,

    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mfaService: MfaService,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly tokenService: AuthTokenService,
    private readonly securityService: AuthSecurityService,
  ) {}

  // ============================================================
  // REGISTRATION
  // ============================================================

  async register(
    username: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    countryCode?: string,
  ) {
    return this.registrationService.register(
      username,
      email,
      password,
      firstName,
      lastName,
      countryCode,
    );
  }

  // ============================================================
  // LOGIN
  // ============================================================

  async login(
    email: string,
    password: string,
    request?: any,
  ) {
    return this.loginService.login(
      email,
      password,
      request,
    );
  }

  // ============================================================
  // BEGIN MFA SETUP
  // ============================================================

  async beginMfaSetup(
    setupToken: string,
  ) {
    const payload =
      await this.verifyMfaToken(
        setupToken,
        "mfa_setup",
      );

    const userId = String(
      payload.sub,
    );

    const user =
      await this.userModel
        .findById(userId)
        .select(
          "+mfaSecret +mfaRecoveryCodes",
        )
        .exec();

    if (!user) {
      throw new UnauthorizedException(
        "User not found.",
      );
    }

    if (user.mfaEnabled) {
      throw new BadRequestException(
        "MFA is already enabled.",
      );
    }

    const secret =
      this.mfaService.generateSecret();

    const otpAuthUrl =
      this.mfaService.generateOtpAuthUrl(
        user.email,
        secret,
      );

    const qrCodeDataUrl =
      await this.mfaService.generateQrCodeDataUrl(
        otpAuthUrl,
      );

    await this.userModel.updateOne(
      {
        _id: userId,
      },
      {
        $set: {
          mfaSecret: secret,
        },
      },
    );

    return {
      setup_token: setupToken,
      secret,
      otpAuthUrl,
      qrCodeDataUrl,
      expiresIn: 300,
    };
  }

  // ============================================================
  // CONFIRM MFA SETUP
  // ============================================================

  async confirmMfaSetup(
    setupToken: string,
    code: string,
  ) {
    const payload =
      await this.verifyMfaToken(
        setupToken,
        "mfa_setup",
      );

    const userId = String(
      payload.sub,
    );

    const user =
      await this.userModel
        .findById(userId)
        .select(
          "+mfaSecret +mfaRecoveryCodes",
        )
        .exec();

    if (
      !user ||
      !user.mfaSecret
    ) {
      throw new BadRequestException(
        "MFA setup has expired or is invalid.",
      );
    }

    const valid =
      await this.mfaService.verifyTotp(
        code,
        user.mfaSecret,
      );

    if (!valid) {
      throw new UnauthorizedException(
        "Invalid MFA code.",
      );
    }

    const recoveryCodeResult =
      await this.mfaService.generateRecoveryCodes();

    const recoveryCodes =
      recoveryCodeResult.codes;

    const hashedRecoveryCodes =
      recoveryCodeResult.hashes;

    if (
      !Array.isArray(recoveryCodes) ||
      !Array.isArray(
        hashedRecoveryCodes,
      ) ||
      recoveryCodes.length === 0 ||
      recoveryCodes.length !==
        hashedRecoveryCodes.length
    ) {
      throw new BadRequestException(
        "Unable to generate MFA recovery codes.",
      );
    }

    await this.userModel.updateOne(
      {
        _id: userId,
      },
      {
        $set: {
          mfaEnabled: true,
          mfaVerifiedAt: new Date(),
          mfaRecoveryCodes:
            hashedRecoveryCodes,
          mfaRecoveryCodesGeneratedAt:
            new Date(),
        },
      },
    );

    return {
      message:
        "MFA enabled successfully.",
      mfaEnabled: true,
      recoveryCodes,
    };
  }

  // ============================================================
  // VERIFY MFA LOGIN
  // ============================================================

  async verifyMfaLogin(
    challengeToken: string,
    code: string,
    request?: any,
  ) {
    const payload =
      await this.verifyMfaToken(
        challengeToken,
        "mfa_challenge",
      );

    const userId = String(
      payload.sub,
    );

    const user =
      await this.userModel
        .findById(userId)
        .select(
          "+mfaSecret +mfaRecoveryCodes",
        )
        .exec();

    if (
      !user ||
      !user.mfaEnabled ||
      !user.mfaSecret
    ) {
      throw new UnauthorizedException(
        "MFA is not configured.",
      );
    }

    const valid =
      await this.mfaService.verifyTotp(
        code,
        user.mfaSecret,
      );

    if (!valid) {
      throw new UnauthorizedException(
        "Invalid MFA code.",
      );
    }

    const ip =
      this.securityService.getRequestIp(
        request,
      );

    const userAgent =
      typeof request?.headers?.[
        "user-agent"
      ] === "string"
        ? request.headers["user-agent"]
        : undefined;

    const updatedUser =
      await this.usersService.recordSuccessfulLogin(
        userId,
        ip || undefined,
        userAgent || undefined,
      );

    const loginUser =
      updatedUser || user;

    const token =
      this.tokenService.createAccessToken(
        loginUser,
        userId,
        true,
      );

    return {
      access_token: token,
      requiresMfa: false,
      mfaVerified: true,

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
  // VERIFY MFA RECOVERY CODE
  // ============================================================

  async verifyMfaRecoveryCode(
    challengeToken: string,
    recoveryCode: string,
    request?: any,
  ) {
    const payload =
      await this.verifyMfaToken(
        challengeToken,
        "mfa_challenge",
      );

    const userId = String(
      payload.sub,
    );

    const user =
      await this.userModel
        .findById(userId)
        .select(
          "+mfaSecret +mfaRecoveryCodes",
        )
        .exec();

    if (
      !user ||
      !user.mfaEnabled
    ) {
      throw new UnauthorizedException(
        "MFA is not configured.",
      );
    }

    const normalizedCode =
      String(
        recoveryCode || "",
      )
        .trim()
        .toUpperCase();

    if (!normalizedCode) {
      throw new UnauthorizedException(
        "Recovery code is required.",
      );
    }

    const recoveryCodes =
      Array.isArray(
        user.mfaRecoveryCodes,
      )
        ? user.mfaRecoveryCodes
        : [];

    let matchingIndex = -1;

    for (
      let index = 0;
      index < recoveryCodes.length;
      index += 1
    ) {
      const hash =
        recoveryCodes[index];

      if (
        !hash ||
        typeof hash !== "string"
      ) {
        continue;
      }

      const matches =
        await bcrypt.compare(
          normalizedCode,
          hash,
        );

      if (matches) {
        matchingIndex = index;
        break;
      }
    }

    if (matchingIndex === -1) {
      throw new UnauthorizedException(
        "Invalid or already used recovery code.",
      );
    }

    recoveryCodes.splice(
      matchingIndex,
      1,
    );

    await this.userModel.updateOne(
      {
        _id: userId,
      },
      {
        $set: {
          mfaRecoveryCodes:
            recoveryCodes,
        },
      },
    );

    const ip =
      this.securityService.getRequestIp(
        request,
      );

    const userAgent =
      typeof request?.headers?.[
        "user-agent"
      ] === "string"
        ? request.headers["user-agent"]
        : undefined;

    const updatedUser =
      await this.usersService.recordSuccessfulLogin(
        userId,
        ip || undefined,
        userAgent || undefined,
      );

    const loginUser =
      updatedUser || user;

    const token =
      this.tokenService.createAccessToken(
        loginUser,
        userId,
        true,
      );

    return {
      access_token: token,
      requiresMfa: false,
      mfaVerified: true,
      recoveryCodeUsed: true,
      remainingRecoveryCodes:
        recoveryCodes.length,

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
  // DISABLE MFA
  // ============================================================

  async disableMfa(
    userId: string,
    currentPassword: string,
    mfaCode: string,
  ) {
    const user =
      await this.userModel
        .findById(userId)
        .select(
          "+password +mfaSecret +mfaRecoveryCodes",
        )
        .exec();

    if (!user) {
      throw new UnauthorizedException(
        "User not found.",
      );
    }

    if (
      this.isMandatoryMfaRole(
        user.role,
      )
    ) {
      throw new BadRequestException(
        "MFA is mandatory for this account and cannot be disabled.",
      );
    }

    if (
      !currentPassword ||
      !user.password
    ) {
      throw new UnauthorizedException(
        "Current password is required.",
      );
    }

    const passwordMatches =
      await bcrypt.compare(
        currentPassword,
        user.password,
      );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        "Invalid current password.",
      );
    }

    if (user.mfaEnabled) {
      if (!user.mfaSecret) {
        throw new BadRequestException(
          "MFA configuration is invalid.",
        );
      }

      const valid =
        await this.mfaService.verifyTotp(
          mfaCode,
          user.mfaSecret,
        );

      if (!valid) {
        throw new UnauthorizedException(
          "Invalid MFA code.",
        );
      }
    }

    await this.userModel.updateOne(
      {
        _id: userId,
      },
      {
        $set: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaRecoveryCodes: [],
          mfaVerifiedAt: null,
          mfaRecoveryCodesGeneratedAt:
            null,
        },
      },
    );

    return {
      message:
        "MFA disabled successfully.",
      mfaEnabled: false,
    };
  }

  // ============================================================
  // MFA STATUS
  // ============================================================

  async getMfaStatus(
    userId: string,
  ) {
    const user =
      await this.userModel
        .findById(userId)
        .exec();

    if (!user) {
      throw new UnauthorizedException(
        "User not found.",
      );
    }

    return {
      mfaEnabled: Boolean(
        user.mfaEnabled,
      ),

      mfaRequired:
        this.isMfaRequired(user),

      role:
        user.role || "user",
    };
  }

  // ============================================================
  // VERIFY MFA TOKEN
  // ============================================================

  private async verifyMfaToken(
    token: string,
    purpose: string,
  ): Promise<any> {
    if (!token) {
      throw new UnauthorizedException(
        "MFA token is required.",
      );
    }

    try {
      const payload =
        await this.jwtService.verifyAsync(
          token,
        );

      if (
        payload?.purpose !== purpose ||
        payload?.tokenType !== purpose ||
        !payload?.sub
      ) {
        throw new UnauthorizedException(
          "Invalid MFA token.",
        );
      }

      return payload;
    } catch {
      throw new UnauthorizedException(
        "Invalid or expired MFA token.",
      );
    }
  }

  // ============================================================
  // MANDATORY MFA ROLE
  // ============================================================

  private isMandatoryMfaRole(
    role?: string,
  ): boolean {
    const normalized =
      String(role || "")
        .trim()
        .toLowerCase()
        .replace(
          /[\s-]+/g,
          "_",
        );

    return (
      normalized === "admin" ||
      normalized === "super_admin" ||
      normalized === "superadmin"
    );
  }

  // ============================================================
  // MFA REQUIRED
  // ============================================================

  private isMfaRequired(
    user: any,
  ): boolean {
    return (
      this.isMandatoryMfaRole(
        user?.role,
      ) ||
      Boolean(
        user?.mfaRequired,
      )
    );
  }
}