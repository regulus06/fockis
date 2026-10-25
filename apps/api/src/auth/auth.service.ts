import {

  BadRequestException,

  Injectable,

  UnauthorizedException,

  ServiceUnavailableException,

} from "@nestjs/common";

import { ConfigService } from "@nestjs/config";

import { JwtService } from "@nestjs/jwt";

import { InjectModel } from "@nestjs/mongoose";

import { Model } from "mongoose";

import * as bcrypt from "bcryptjs";

import * as crypto from "crypto";

import * as nodemailer from "nodemailer";

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

    private readonly configService: ConfigService,

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

    consent?: {

      termsAccepted: boolean;

      acceptedPolicies: string[];

      policyAcceptanceVersion: string;

      policyAcceptedAt?: Date;

    },

  ) {

    return this.registrationService.register(

      username,

      email,

      password,

      firstName,

      lastName,

      countryCode,

      consent,

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

  // REQUEST PASSWORD RESET

  // ============================================================

  async forgotPassword(emailInput: string) {

    const email = String(emailInput || "").trim().toLowerCase();

    const response = {

      message:

        "If an account exists for that email, password reset instructions will be sent.",

    };

    if (

      !email ||

      email.length > 254 ||

       !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

    ) {

      return response;

    }

    const user = await this.userModel

      .findOne({ email })

      .select("+resetPasswordToken +resetPasswordExpires")

      .exec();

    // Return the same response when no account exists.

    if (!user) {

      return response;

    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto

      .createHash("sha256")

      .update(rawToken)

      .digest("hex");

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.userModel.updateOne(

      { _id: user._id },

      {

        $set: {

          resetPasswordToken: tokenHash,

          resetPasswordExpires: expiresAt,

        },

      },

    );

    try {

      const host = this.configService.get<string>("SMTP_HOST");

      const port = Number(this.configService.get("SMTP_PORT") || 465);

      const smtpUser = this.configService.get<string>("SMTP_USER");

      const smtpPass = this.configService.get<string>("SMTP_PASS");

      const from = this.configService.get<string>("MAIL_FROM");

      const frontendUrl = this.configService

        .get<string>("FRONTEND_URL")

        ?.trim()

        .replace(/\/+$/, "");

      if (

        !host ||

        !smtpUser ||

        !smtpPass ||

        !from ||

        !frontendUrl ||

        !Number.isInteger(port) ||

        port < 1 ||

        port > 65535

      ) {

        throw new Error("SMTP or frontend URL configuration is incomplete.");

      }

      const secureSetting = String(

        this.configService.get("SMTP_SECURE") ?? (port === 465 ? "true" : "false"),

      ).toLowerCase();

      const transporter = nodemailer.createTransport({

        host,

        port,

        secure: secureSetting === "true",

        auth: {

          user: smtpUser,

          pass: smtpPass,

        },

      });

      const resetUrl =

        `${frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

      await transporter.sendMail({

        from,

        to: user.email,

        subject: "Reset your Fockis password",

        text:

          "We received a request to reset your Fockis password.\n\n" +

          `Open this link to choose a new password:\n${resetUrl}\n\n` +

          "This link expires in 15 minutes. If you did not request a reset, " +

          "you can ignore this email.",

        html: `

          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">

            <h2>Reset your Fockis password</h2>

            <p>We received a request to reset your password.</p>

            <p>

              <a href="${resetUrl}"

                 style="display:inline-block;padding:12px 20px;background:#1877f2;color:#fff;text-decoration:none;border-radius:6px">

                Reset Password

              </a>

            </p>

            <p>This link expires in 15 minutes.</p>

            <p>If you did not request a reset, you can ignore this email.</p>

          </div>

        `,

      });

    } catch (error) {

      const mailError = error as Error & {

        code?: string;

        command?: string;

        responseCode?: number;

      };

      console.error("[PasswordReset] Email delivery failed:", {

        message: mailError.message,

        code: mailError.code,

        command: mailError.command,

        responseCode: mailError.responseCode,

      });

      try {

        await this.userModel.updateOne(

          { _id: user._id, resetPasswordToken: tokenHash },

          {

            $set: {

              resetPasswordToken: null,

              resetPasswordExpires: null,

            },

          },

        );

      } catch (cleanupError) {

        console.error(

          "[PasswordReset] Failed to clear reset token after email failure:",

          cleanupError instanceof Error

            ? cleanupError.message

            : "Unknown cleanup error",

        );

      }

      throw new ServiceUnavailableException(

        "Password reset email could not be sent. Check the server email configuration and try again.",

      );

    }

    return response;

  }

  // ============================================================

  // RESET PASSWORD

  // ============================================================

  async resetPassword(tokenInput: string, passwordInput: string) {

    const token = String(tokenInput || "").trim();

    const password = String(passwordInput || "");

    if (!/^[a-f0-9]{64}$/i.test(token)) {

      throw new BadRequestException(

        "This password reset link is invalid or has expired.",

      );

    }

    if (password.length < 8 || password.length > 128) {

      throw new BadRequestException(

        "Your new password must be between 8 and 128 characters.",

      );

    }

    const tokenHash = crypto

      .createHash("sha256")

      .update(token)

      .digest("hex");

    const passwordHash = await bcrypt.hash(password, 12);

    // Load the account while the reset token is still valid so the confirmation

    // email can address the user by their saved name.

    const user = await this.userModel

      .findOne({

        resetPasswordToken: tokenHash,

        resetPasswordExpires: { $gt: new Date() },

      })

      .exec();

    if (!user) {

      throw new BadRequestException(

        "This password reset link is invalid or has expired. Request a new one.",

      );

    }

    // Keep the update atomic so an expired or already-used token cannot reset

    // the password a second time.

    const result = await this.userModel.updateOne(

      {

        _id: user._id,

        resetPasswordToken: tokenHash,

        resetPasswordExpires: { $gt: new Date() },

      },

      {

        $set: {

          password: passwordHash,

          resetPasswordToken: null,

          resetPasswordExpires: null,

        },

      },

    );

    if (result.modifiedCount !== 1) {

      throw new BadRequestException(

        "This password reset link is invalid or has expired. Request a new one.",

      );

    }

    // Email delivery is best-effort: a mail server problem must not undo or

    // misreport the password change after the database update has succeeded.

    try {

      const host = this.configService.get<string>("SMTP_HOST");

      const port = Number(this.configService.get("SMTP_PORT") || 465);

      const smtpUser = this.configService.get<string>("SMTP_USER");

      const smtpPass = this.configService.get<string>("SMTP_PASS");

      const from = this.configService.get<string>("MAIL_FROM");

      if (!host || !smtpUser || !smtpPass || !from ||

          !Number.isInteger(port) || port < 1 || port > 65535) {

        throw new Error("SMTP configuration is incomplete.");

      }

      const secureSetting = String(

        this.configService.get("SMTP_SECURE") ?? (port === 465 ? "true" : "false"),

      ).toLowerCase();

      const transporter = nodemailer.createTransport({

        host,

        port,

        secure: secureSetting === "true",

        auth: {

          user: smtpUser,

          pass: smtpPass,

        },

      });

      const nameParts = [

        (user as any).firstName,

        (user as any).lastName,

      ]

        .map((part) => String(part || "").trim())

        .filter(Boolean);

      const savedName =

        nameParts.join(" ") ||

        String((user as any).displayName || "").trim() ||

        String((user as any).fullName || "").trim() ||

        String((user as any).username || "").trim();

      const greetingName = savedName || "there";

      const safeGreetingName = greetingName

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#39;");

      await transporter.sendMail({

        from,

        to: user.email,

        subject: "Your Fockis password has been changed",

        text:

          `Hi ${greetingName},\n\n` +

          "Your Fockis account password has been changed successfully.\n\n" +

          "If you made this change, no further action is required. If you did not " +

          "change your password, please secure your account and contact Fockis support.\n\n" +

          "For your security, this email will never contain your password.\n\n" +

          "The Fockis Security Team",

        html: `

          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033;line-height:1.6">

            <h2 style="color:#1877f2">Your Fockis password has been changed</h2>

            <p>Hi ${safeGreetingName},</p>

            <p>Your Fockis account password has been changed successfully.</p>

            <p>If you made this change, no further action is required.</p>

            <p><strong>If you did not change your password</strong>, please secure your account immediately and contact Fockis support.</p>

            <p>For your security, this email will never contain your password.</p>

            <p>The Fockis Security Team</p>

          </div>

        `,

      });

    } catch (emailError) {

      const mailError = emailError as Error & {

        code?: string;

        command?: string;

        responseCode?: number;

      };

      console.error("[PasswordReset] Password changed, but confirmation email failed:", {

        message: mailError.message,

        code: mailError.code,

        command: mailError.command,

        responseCode: mailError.responseCode,

      });

    }

    return {

      message:

        "Your password has been changed successfully. You can now sign in.",

    };

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
