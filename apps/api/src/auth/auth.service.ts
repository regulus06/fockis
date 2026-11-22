import {
  BadRequestException,
  ForbiddenException,
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
import { User, UserDocument } from "../users/user.schema";
import { formatPublicFockisId } from "../users/constants/fockis-country.constants";
import { AuthRegistrationService } from "./auth-registration.service";
import { AuthLoginService } from "./auth-login.service";
import { AuthTokenService } from "./auth-token.service";
import { AuthSecurityService } from "./auth-security.service";
import { MfaService } from "./mfa.service";
import { PlatformSecurityPolicyService } from "../admin/security/platform-security/platform-security-policy.service";
import { AccountSecurityService } from "../admin/security/platform-security/account-security.service";
import { SecurityEventsService } from "../admin/security/platform-security/security-events.service";
import {
  decryptMfaSecret,
  encryptMfaSecret,
  isEncryptedMfaSecret,
} from "../admin/security/platform-security/mfa-secret-crypto";
import {
  isPasswordReused,
  nextPasswordHistory,
} from "../admin/security/platform-security/password-policy";

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
    private readonly securityPolicy: PlatformSecurityPolicyService,
    private readonly accountSecurity: AccountSecurityService,
    private readonly securityEvents: SecurityEventsService,
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
    options: { rememberMe?: boolean } = {},
  ) {
    return this.loginService.login(email, password, request, options);
  }

  // ============================================================
  // SEND EMAIL (Resend HTTP API, falls back to SMTP)
  // ============================================================
  // Render's free tier blocks outbound SMTP ports (25/465/587).
  // When RESEND_API_KEY is set, mail goes over HTTPS (port 443) instead.

  private async sendEmail(options: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    const from = this.configService.get<string>("MAIL_FROM");

    if (!from) {
      throw new Error("MAIL_FROM is not set.");
    }

    const resendKey = this.configService.get<string>("RESEND_API_KEY");

    if (resendKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [options.to],
          subject: options.subject,
          text: options.text,
          html: options.html,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw Object.assign(
          new Error(`Resend API error ${res.status}: ${body}`),
          { responseCode: res.status },
        );
      }

      return;
    }

    // Fallback: SMTP (works locally or on a paid Render instance).
    const host = this.configService.get<string>("SMTP_HOST");
    const port = Number(this.configService.get("SMTP_PORT") || 465);
    const smtpUser = this.configService.get<string>("SMTP_USER");
    const smtpPass = this.configService.get<string>("SMTP_PASS");

    if (
      !host ||
      !smtpUser ||
      !smtpPass ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      throw new Error(
        "No RESEND_API_KEY set and SMTP configuration is incomplete.",
      );
    }

    const secureSetting = String(
      this.configService.get("SMTP_SECURE") ??
        (port === 465 ? "true" : "false"),
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

    await transporter.sendMail({ from, ...options });
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

    // Password reset protection: one reset email per account per cooldown.
    // The response is identical, so the cooldown reveals nothing.
    const effective = await this.securityPolicy.getEffectiveForUser(user as any);

    const allowed = await this.accountSecurity.claimPasswordResetEmail(
      String(user._id),
      effective.values,
    );

    if (!allowed) {
      await this.securityEvents.record({
        action: "auth.password_reset.throttled",
        outcome: "denied",
        severity: "low",
        targetId: String(user._id),
        targetType: "user",
        retentionDays: Number(effective.values.authEventRetentionDays || 180),
      });

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
      const frontendUrl = this.configService
        .get<string>("FRONTEND_URL")
        ?.trim()
        .replace(/\/+$/, "");

      if (!frontendUrl) {
        throw new Error("FRONTEND_URL is not set.");
      }

      const resetUrl =
        `${frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

      await this.sendEmail({
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
              passwordResetRequestedAt: null,
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
        "Password reset email could not be sent. Please try again later.",
      );
    }

    await this.securityEvents.record({
      action: "auth.password_reset.requested",
      outcome: "success",
      severity: "low",
      targetId: String(user._id),
      targetType: "user",
      retentionDays: Number(effective.values.authEventRetentionDays || 180),
    });

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

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Load the account while the reset token is still valid so the policy
    // for this account can be applied and the confirmation email can address
    // the user by their saved name.
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

    const effective = await this.securityPolicy.getEffectiveForUser(user as any);

    // Same rules as every other password change.
    await this.securityService.validateNewPassword(password, effective.values);

    if (
      await isPasswordReused(
        password,
        user.password,
        (user as any).passwordHistory,
        effective.values,
      )
    ) {
      throw new BadRequestException(
        "Choose a password you have not used before.",
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

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
          passwordHistory: nextPasswordHistory(
            user.password,
            (user as any).passwordHistory,
          ),
          passwordChangedAt: new Date(),
          mustChangePassword: false,
          passwordResetByAdmin: false,
          resetPasswordToken: null,
          resetPasswordExpires: null,
          failedLoginAttempts: 0,
          lastFailedLoginAt: null,
          lockedUntil: null,
        },
      },
    );

    if (result.modifiedCount !== 1) {
      throw new BadRequestException(
        "This password reset link is invalid or has expired. Request a new one.",
      );
    }

    // Revoke sessions / notify / audit as the policy requires.
    await this.accountSecurity.onSecurityChange(
      String(user._id),
      "password_reset",
      { user: user.toObject() as any },
    );

    // Email delivery is best-effort: a mail server problem must not undo or
    // misreport the password change after the database update has succeeded.
    try {
      const nameParts = [(user as any).firstName, (user as any).lastName]
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

      await this.sendEmail({
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

      console.error(
        "[PasswordReset] Password changed, but confirmation email failed:",
        {
          message: mailError.message,
          code: mailError.code,
          command: mailError.command,
          responseCode: mailError.responseCode,
        },
      );
    }

    return {
      message:
        "Your password has been changed successfully. You can now sign in.",
    };
  }

  // ============================================================
  // BEGIN MFA SETUP (during sign-in)
  // ============================================================

  async beginMfaSetup(setupToken: string) {
    const payload = await this.verifyMfaToken(setupToken, "mfa_setup");

    const userId = String(payload.sub);

    const user = await this.userModel
      .findById(userId)
      .select("+mfaSecret +mfaRecoveryCodes")
      .exec();

    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    if (user.mfaEnabled) {
      throw new BadRequestException("MFA is already enabled.");
    }

    return this.startEnrollment(user, { setup_token: setupToken });
  }

  // ============================================================
  // CONFIRM MFA SETUP (during sign-in)
  // ============================================================

  async confirmMfaSetup(setupToken: string, code: string) {
    const payload = await this.verifyMfaToken(setupToken, "mfa_setup");

    const userId = String(payload.sub);

    const user = await this.userModel
      .findById(userId)
      .select("+mfaSecret +mfaRecoveryCodes")
      .exec();

    if (!user || !user.mfaSecret) {
      throw new BadRequestException("MFA setup has expired or is invalid.");
    }

    return this.finishEnrollment(user, code, null);
  }

  // ============================================================
  // VERIFY MFA LOGIN
  // ============================================================

  async verifyMfaLogin(challengeToken: string, code: string, request?: any) {
    const payload = await this.verifyMfaToken(challengeToken, "mfa_challenge");

    const userId = String(payload.sub);

    const user = await this.userModel
      .findById(userId)
      .select("+mfaSecret +mfaRecoveryCodes")
      .exec();

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException("MFA is not configured.");
    }

    const effective = await this.securityPolicy.getEffectiveForUser(user as any);
    const context = this.requestContext(request);

    await this.accountSecurity.assertNotLocked(userId);

    const secret = decryptMfaSecret(user.mfaSecret);

    const valid =
      Boolean(secret) && (await this.mfaService.verifyTotp(code, secret as string));

    if (!valid) {
      await this.accountSecurity.recordCodeFailure(user, effective.values, {
        ...context,
        organizations: effective.organizations.map((org) => org.organizationId),
        reason: "wrong_mfa_code",
      });

      throw new UnauthorizedException("Invalid MFA code.");
    }

    await this.upgradeLegacySecret(userId, user.mfaSecret, secret);

    const updatedUser = await this.usersService.recordSuccessfulLogin(
      userId,
      context.ip || undefined,
      context.userAgent || undefined,
    );

    const loginUser = updatedUser || user;

    await this.securityEvents.record({
      action: "auth.login.success",
      outcome: "success",
      severity: "info",
      actorId: userId,
      targetId: userId,
      targetType: "user",
      ...context,
      metadata: { method: "totp" },
      retentionDays: Number(effective.values.authEventRetentionDays || 180),
    });

    const token = this.tokenService.createAccessToken(
      loginUser,
      userId,
      true,
      this.accountSecurity.accessTokenExpiresIn(
        effective.values,
        payload?.rememberMe === true,
      ),
    );

    return {
      access_token: token,
      requiresMfa: false,
      mfaVerified: true,
      mustChangePassword: Boolean((loginUser as any).mustChangePassword),
      user: await this.tokenService.buildUserForTokenResponse(
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
    const payload = await this.verifyMfaToken(challengeToken, "mfa_challenge");

    const userId = String(payload.sub);

    const user = await this.userModel
      .findById(userId)
      .select("+mfaSecret +mfaRecoveryCodes")
      .exec();

    if (!user || !user.mfaEnabled) {
      throw new UnauthorizedException("MFA is not configured.");
    }

    const platform = await this.securityPolicy.getPlatform();

    if (!platform.accounts.allowRecoveryCodes) {
      throw new UnauthorizedException(
        "Recovery codes are not accepted. Contact Fockis support to recover your account.",
      );
    }

    const effective = await this.securityPolicy.getEffectiveForUser(user as any);
    const context = this.requestContext(request);

    await this.accountSecurity.assertNotLocked(userId);

    const normalizedCode = String(recoveryCode || "")
      .replace(/[\s-]/g, "")
      .trim()
      .toUpperCase();

    if (!normalizedCode) {
      throw new UnauthorizedException("Recovery code is required.");
    }

    const recoveryCodes = Array.isArray(user.mfaRecoveryCodes)
      ? user.mfaRecoveryCodes
      : [];

    const matchingIndex = await this.mfaService.verifyRecoveryCode(
      normalizedCode,
      recoveryCodes,
    );

    // Consume the code atomically: if two requests use the same code at
    // the same time, only one of them removes it and succeeds.
    const consumed =
      matchingIndex >= 0
        ? await this.userModel.updateOne(
            { _id: userId, mfaRecoveryCodes: recoveryCodes[matchingIndex] },
            { $pull: { mfaRecoveryCodes: recoveryCodes[matchingIndex] } },
          )
        : null;

    if (!consumed || consumed.modifiedCount !== 1) {
      await this.accountSecurity.recordCodeFailure(user, effective.values, {
        ...context,
        organizations: effective.organizations.map((org) => org.organizationId),
        reason: "wrong_recovery_code",
      });

      throw new UnauthorizedException("Invalid or already used recovery code.");
    }

    const remaining = recoveryCodes.length - 1;

    const updatedUser = await this.usersService.recordSuccessfulLogin(
      userId,
      context.ip || undefined,
      context.userAgent || undefined,
    );

    const loginUser = updatedUser || user;

    await this.securityEvents.record({
      action: "auth.mfa.recovery_code_used",
      outcome: "success",
      severity: "medium",
      actorId: userId,
      targetId: userId,
      targetType: "user",
      ...context,
      metadata: { remainingRecoveryCodes: remaining },
    });

    const token = this.tokenService.createAccessToken(
      loginUser,
      userId,
      true,
      this.accountSecurity.accessTokenExpiresIn(
        effective.values,
        payload?.rememberMe === true,
      ),
    );

    return {
      access_token: token,
      requiresMfa: false,
      mfaVerified: true,
      recoveryCodeUsed: true,
      remainingRecoveryCodes: remaining,
      mustChangePassword: Boolean((loginUser as any).mustChangePassword),
      user: await this.tokenService.buildUserForTokenResponse(
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
    options: { tokenIat?: number | null; request?: any } = {},
  ) {
    const user = await this.userModel
      .findById(userId)
      .select("+password +mfaSecret +mfaRecoveryCodes")
      .exec();

    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    const effective = await this.securityPolicy.getEffectiveForUser(user as any);

    if (effective.requiresTwoFactor) {
      throw new BadRequestException(
        "Two-factor authentication is required for this account and cannot be turned off.",
      );
    }

    if (!currentPassword || !user.password) {
      throw new UnauthorizedException("Current password is required.");
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid current password.");
    }

    if (user.mfaEnabled) {
      const secret = decryptMfaSecret(user.mfaSecret);

      if (!secret) {
        throw new BadRequestException("MFA configuration is invalid.");
      }

      const valid = await this.mfaService.verifyTotp(mfaCode, secret);

      if (!valid) {
        await this.accountSecurity.recordCodeFailure(user, effective.values, {
          ...this.requestContext(options.request),
          reason: "wrong_mfa_code",
        });

        throw new UnauthorizedException("Invalid MFA code.");
      }
    }

    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaRecoveryCodes: [],
          mfaVerifiedAt: null,
          mfaRecoveryCodesGeneratedAt: null,
        },
      },
    );

    await this.accountSecurity.onSecurityChange(userId, "mfa_disabled", {
      exceptIat: options.tokenIat ?? null,
      context: this.requestContext(options.request),
      user: user.toObject() as any,
    });

    return {
      message: "MFA disabled successfully.",
      mfaEnabled: false,
    };
  }

  // ============================================================
  // MFA STATUS
  // ============================================================

  async getMfaStatus(userId: string) {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    const effective = await this.securityPolicy.getEffectiveForUser(user as any);
    const platform = await this.securityPolicy.getPlatform();

    return {
      mfaEnabled: Boolean(user.mfaEnabled),
      mfaRequired: effective.requiresTwoFactor,
      role: user.role || "user",
      selfServiceAllowed:
        Boolean(platform.accounts.allowUserTwoFactor) || effective.requiresTwoFactor,
      recoveryCodesAllowed: Boolean(platform.accounts.allowRecoveryCodes),
      remainingRecoveryCodes: Array.isArray((user as any).mfaRecoveryCodes)
        ? (user as any).mfaRecoveryCodes.length
        : undefined,
    };
  }

  // ============================================================
  // SELF-SERVICE TWO-FACTOR (signed-in users)
  // ============================================================

  async startSelfServiceEnrollment(userId: string, request: any) {
    const user = await this.userModel
      .findById(userId)
      .select("+mfaSecret +mfaRecoveryCodes")
      .exec();

    if (!user) throw new UnauthorizedException("User not found.");

    if (user.mfaEnabled) {
      throw new BadRequestException("Two-factor authentication is already on.");
    }

    const platform = await this.securityPolicy.getPlatform();
    const effective = await this.securityPolicy.getEffectiveForUser(user as any);

    if (!platform.accounts.allowUserTwoFactor && !effective.requiresTwoFactor) {
      throw new ForbiddenException(
        "Two-factor enrollment from account settings is turned off by Fockis.",
      );
    }

    this.accountSecurity.assertReauthenticated(
      request,
      userId,
      Boolean(platform.accounts.requireReauthenticationForSecurityChanges),
    );

    return this.startEnrollment(user, {});
  }

  async confirmSelfServiceEnrollment(
    userId: string,
    code: string,
    request: any,
  ) {
    const user = await this.userModel
      .findById(userId)
      .select("+mfaSecret +mfaRecoveryCodes")
      .exec();

    if (!user || !user.mfaSecret || user.mfaEnabled) {
      throw new BadRequestException("Start two-factor setup again.");
    }

    return this.finishEnrollment(user, code, {
      tokenIat: Number(request?.user?.tokenIssuedAt) || null,
      request,
    });
  }

  async regenerateRecoveryCodes(userId: string, code: string, request: any) {
    const user = await this.userModel
      .findById(userId)
      .select("+mfaSecret +mfaRecoveryCodes")
      .exec();

    if (!user || !user.mfaEnabled) {
      throw new BadRequestException("Two-factor authentication is not on.");
    }

    const platform = await this.securityPolicy.getPlatform();

    if (!platform.accounts.allowRecoveryCodes) {
      throw new ForbiddenException("Recovery codes are turned off by Fockis.");
    }

    this.accountSecurity.assertReauthenticated(
      request,
      userId,
      Boolean(platform.accounts.requireReauthenticationForSecurityChanges),
    );

    const secret = decryptMfaSecret(user.mfaSecret);
    const effective = await this.securityPolicy.getEffectiveForUser(user as any);

    if (!secret || !(await this.mfaService.verifyTotp(code, secret))) {
      await this.accountSecurity.recordCodeFailure(user, effective.values, {
        ...this.requestContext(request),
        reason: "wrong_mfa_code",
      });

      throw new UnauthorizedException("Invalid MFA code.");
    }

    const result = await this.mfaService.generateRecoveryCodes();

    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          mfaRecoveryCodes: result.hashes,
          mfaRecoveryCodesGeneratedAt: new Date(),
        },
      },
    );

    await this.accountSecurity.onSecurityChange(userId, "recovery_codes_regenerated", {
      exceptIat: Number(request?.user?.tokenIssuedAt) || null,
      context: this.requestContext(request),
      user: user.toObject() as any,
    });

    return { recoveryCodes: result.codes };
  }

  // ============================================================
  // REAUTHENTICATION
  // ============================================================

  /**
   * Confirm the current password (and two-factor code when two-factor is on)
   * and return a short-lived reauthentication token for sensitive actions.
   */
  async reauthenticate(
    userId: string,
    password: string,
    code: string | undefined,
    request: any,
  ) {
    const user = await this.userModel
      .findById(userId)
      .select("+password +mfaSecret")
      .exec();

    if (!user) throw new UnauthorizedException("User not found.");

    const effective = await this.securityPolicy.getEffectiveForUser(user as any);
    const context = this.requestContext(request);

    await this.accountSecurity.assertNotLocked(userId);

    const passwordOk =
      Boolean(password) &&
      Boolean(user.password) &&
      (await bcrypt.compare(String(password), user.password));

    let codeOk = true;

    if (passwordOk && user.mfaEnabled) {
      const secret = decryptMfaSecret(user.mfaSecret);
      codeOk = Boolean(secret) && (await this.mfaService.verifyTotp(String(code ?? ""), secret as string));
    }

    if (!passwordOk || !codeOk) {
      await this.accountSecurity.recordCodeFailure(user, effective.values, {
        ...context,
        organizations: effective.organizations.map((org) => org.organizationId),
        reason: passwordOk ? "reauth_wrong_mfa_code" : "reauth_wrong_password",
      });

      throw new UnauthorizedException(
        user.mfaEnabled
          ? "The password or two-factor code is incorrect."
          : "The password is incorrect.",
      );
    }

    const issued = await this.accountSecurity.issueReauthToken(userId);

    await this.securityEvents.record({
      action: "auth.reauthenticated",
      outcome: "success",
      severity: "info",
      actorId: userId,
      targetId: userId,
      targetType: "user",
      ...context,
      retentionDays: Number(effective.values.authEventRetentionDays || 180),
    });

    return {
      reauthToken: issued.token,
      expiresInSeconds: issued.expiresInSeconds,
      mfaRequired: Boolean(user.mfaEnabled),
    };
  }

  /** Sign out every other session of the current user. */
  async revokeOtherSessions(userId: string, request: any) {
    const platform = await this.securityPolicy.getPlatform();

    this.accountSecurity.assertReauthenticated(
      request,
      userId,
      Boolean(platform.accounts.requireReauthenticationForSecurityChanges),
    );

    await this.accountSecurity.revokeSessions(userId, {
      reason: "user_signed_out_other_sessions",
      exceptIat: Number(request?.user?.tokenIssuedAt) || null,
      context: this.requestContext(request),
    });

    await this.accountSecurity.onSecurityChange(userId, "sessions_revoked", {
      exceptIat: Number(request?.user?.tokenIssuedAt) || null,
      context: this.requestContext(request),
    });

    return { success: true };
  }

  // ============================================================
  // ENROLLMENT HELPERS
  // ============================================================

  private async startEnrollment(
    user: UserDocument,
    extra: Record<string, unknown>,
  ) {
    const secret = this.mfaService.generateSecret();

    const otpAuthUrl = this.mfaService.generateOtpAuthUrl(user.email, secret);

    const qrCodeDataUrl =
      await this.mfaService.generateQrCodeDataUrl(otpAuthUrl);

    // Stored encrypted; the plaintext secret is only shown to the user once
    // so they can add it to an authenticator app.
    await this.userModel.updateOne(
      { _id: user._id },
      { $set: { mfaSecret: encryptMfaSecret(secret) } },
    );

    return {
      ...extra,
      secret,
      otpAuthUrl,
      qrCodeDataUrl,
      expiresIn: 300,
    };
  }

  private async finishEnrollment(
    user: UserDocument,
    code: string,
    options: { tokenIat: number | null; request?: any } | null,
  ) {
    const secret = decryptMfaSecret(user.mfaSecret);

    const valid = Boolean(secret) && (await this.mfaService.verifyTotp(code, secret as string));

    if (!valid) {
      throw new UnauthorizedException("Invalid MFA code.");
    }

    const platform = await this.securityPolicy.getPlatform();

    let recoveryCodes: string[] = [];
    let hashedRecoveryCodes: string[] = [];

    if (platform.accounts.allowRecoveryCodes) {
      const recoveryCodeResult = await this.mfaService.generateRecoveryCodes();

      recoveryCodes = recoveryCodeResult.codes;
      hashedRecoveryCodes = recoveryCodeResult.hashes;

      if (
        !Array.isArray(recoveryCodes) ||
        !Array.isArray(hashedRecoveryCodes) ||
        recoveryCodes.length === 0 ||
        recoveryCodes.length !== hashedRecoveryCodes.length
      ) {
        throw new BadRequestException("Unable to generate MFA recovery codes.");
      }
    }

    await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          mfaEnabled: true,
          mfaSecret: isEncryptedMfaSecret(user.mfaSecret)
            ? user.mfaSecret
            : encryptMfaSecret(secret as string),
          mfaVerifiedAt: new Date(),
          mfaRecoveryCodes: hashedRecoveryCodes,
          mfaRecoveryCodesGeneratedAt: hashedRecoveryCodes.length ? new Date() : null,
        },
      },
    );

    await this.accountSecurity.onSecurityChange(String(user._id), "mfa_enabled", {
      exceptIat: options?.tokenIat ?? null,
      context: this.requestContext(options?.request),
      user: user.toObject() as any,
    });

    return {
      message: "MFA enabled successfully.",
      mfaEnabled: true,
      recoveryCodes,
    };
  }

  /** Re-encrypt a legacy plaintext secret after it was used successfully. */
  private async upgradeLegacySecret(
    userId: string,
    stored: unknown,
    plain: string | null,
  ): Promise<void> {
    if (!plain || isEncryptedMfaSecret(stored)) return;

    try {
      await this.userModel.updateOne(
        { _id: userId, mfaSecret: String(stored) },
        { $set: { mfaSecret: encryptMfaSecret(plain) } },
      );
    } catch {
      // Retried on the next sign-in.
    }
  }

  private requestContext(request?: any) {
    return {
      ip: this.securityService.getRequestIp(request) ?? null,
      userAgent:
        typeof request?.headers?.["user-agent"] === "string"
          ? request.headers["user-agent"]
          : null,
    };
  }

  // ============================================================
  // VERIFY MFA TOKEN
  // ============================================================

  private async verifyMfaToken(token: string, purpose: string): Promise<any> {
    if (!token) {
      throw new UnauthorizedException("MFA token is required.");
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);

      if (
        payload?.purpose !== purpose ||
        payload?.tokenType !== purpose ||
        !payload?.sub
      ) {
        throw new UnauthorizedException("Invalid MFA token.");
      }

      return payload;
    } catch {
      throw new UnauthorizedException("Invalid or expired MFA token.");
    }
  }
}
