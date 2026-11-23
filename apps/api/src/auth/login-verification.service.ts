import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as crypto from "crypto";

import { User, UserDocument } from "../users/user.schema";
import { AuthService } from "./auth.service";
import { AuthLoginService, LOGIN_VERIFICATION_TOKEN_TYPE } from "./auth-login.service";
import { generateVerificationCode, hashVerificationCode, maskEmail } from "./login-verification.util";
import { AuthSecurityService } from "./auth-security.service";
import { MfaService } from "./mfa.service";
import {
  LoginVerificationChallenge,
  LoginVerificationChallengeDocument,
} from "../admin/security/incidents/security-incident.schema";
import {
  AuthRestrictionService,
  VerificationMethod,
  availableMethods,
} from "../admin/security/incidents/auth-restriction.service";
import { LoginMonitorService } from "../admin/security/incidents/login-monitor.service";
import { RecoveryCaseService } from "../admin/security/incidents/recovery-case.service";
import { PlatformSecurityPolicyService } from "../admin/security/platform-security/platform-security-policy.service";
import { AccountSecurityService } from "../admin/security/platform-security/account-security.service";
import { SecurityEventsService } from "../admin/security/platform-security/security-events.service";
import { SecurityNotificationsService } from "../admin/security/platform-security/security-notifications.service";
import { decryptMfaSecret } from "../admin/security/platform-security/mfa-secret-crypto";

// ============================================================================
// SIGN-IN VERIFICATION (step-up after high-risk failed-login activity)
//
// Email codes: 6 digits, 10-minute lifetime, single use, at most 5 guesses
// per code and 3 codes per 15 minutes. Only an HMAC of the code is stored;
// the code itself appears only in the email to the account owner, never in
// logs, audit records or the Admin Center.
// ============================================================================

const CODE_TTL_MS = 10 * 60_000;
const CODE_MAX_ATTEMPTS = 5;
const CODES_PER_WINDOW = 3;
const CODE_WINDOW_MS = 15 * 60_000;
const RESEND_AFTER_MS = 60_000;


function equalHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");

  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

const GENERIC_RECOVERY_RESPONSE = {
  submitted: true,
  message:
    "If an account exists for that email address, our team will review the request and contact the account owner.",
};

@Injectable()
export class LoginVerificationService {
  private readonly logger = new Logger(LoginVerificationService.name);
  private readonly codeKey: Buffer;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(LoginVerificationChallenge.name)
    private readonly challenges: Model<LoginVerificationChallengeDocument>,
    private readonly authService: AuthService,
    private readonly loginService: AuthLoginService,
    private readonly security: AuthSecurityService,
    private readonly mfa: MfaService,
    private readonly restrictions: AuthRestrictionService,
    private readonly monitor: LoginMonitorService,
    private readonly recovery: RecoveryCaseService,
    private readonly policy: PlatformSecurityPolicyService,
    private readonly accountSecurity: AccountSecurityService,
    private readonly events: SecurityEventsService,
    private readonly userNotifications: SecurityNotificationsService,
  ) {
    const secret = String(config.get<string>("JWT_SECRET") ?? "");

    this.codeKey = Buffer.from(
      crypto.hkdfSync("sha256", Buffer.from(secret), Buffer.from("fockis"), Buffer.from("login-verification-codes"), 32),
    );
  }

  private context(request: any) {
    return {
      ip: this.security.getRequestIp(request) ?? null,
      userAgent: typeof request?.headers?.["user-agent"] === "string" ? request.headers["user-agent"] : null,
    };
  }

  /** Validate the verification token and load the pending restriction. */
  private async load(token: string) {
    let payload: any;

    try {
      payload = await this.jwt.verifyAsync(String(token ?? ""));
    } catch {
      throw new UnauthorizedException("This verification step expired. Sign in again.");
    }

    if (
      payload?.purpose !== LOGIN_VERIFICATION_TOKEN_TYPE ||
      payload?.tokenType !== LOGIN_VERIFICATION_TOKEN_TYPE ||
      !Types.ObjectId.isValid(String(payload?.sub ?? "")) ||
      !Types.ObjectId.isValid(String(payload?.restrictionId ?? ""))
    ) {
      throw new UnauthorizedException("This verification step expired. Sign in again.");
    }

    const userId = String(payload.sub);
    const restriction = await this.restrictions.activeFor(userId);

    if (!restriction || String(restriction._id) !== String(payload.restrictionId)) {
      throw new ConflictException("This verification step is no longer needed or has expired. Sign in again.");
    }

    const user = await this.users.findById(userId).select("+mfaSecret +mfaRecoveryCodes").exec();

    if (!user || (user as any).isActive === false) {
      throw new UnauthorizedException("This verification step expired. Sign in again.");
    }

    const platform = await this.policy.getPlatform();
    const methods = availableMethods(user.toObject() as any, {
      emailCodesAllowed: Boolean(platform.accounts.loginVerificationEmailCodes),
    });

    return { payload, userId, restriction, user, methods };
  }

  // ==========================================================================
  // EMAIL CODE
  // ==========================================================================

  async sendEmailCode(token: string, request: any) {
    const { userId, restriction, user, methods } = await this.load(token);

    if (!methods.includes("email")) {
      throw new BadRequestException("Email verification isn't available for this account. Use another option.");
    }

    const now = Date.now();
    const recent = await this.challenges
      .find({ restrictionId: restriction._id, createdAt: { $gte: new Date(now - CODE_WINDOW_MS) } })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const last = recent[0];

    if (last?.createdAt && now - new Date(last.createdAt).getTime() < RESEND_AFTER_MS) {
      const wait = Math.ceil((RESEND_AFTER_MS - (now - new Date(last.createdAt).getTime())) / 1000);
      throw new HttpException(
        { statusCode: 429, message: `Wait ${wait} seconds before requesting another code.`, retryAfterSeconds: wait },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (recent.length >= CODES_PER_WINDOW) {
      throw new HttpException(
        { statusCode: 429, message: "Too many codes requested. Try again in 15 minutes, or use another option." },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Older codes stop working when a new one is sent.
    await this.challenges
      .updateMany({ restrictionId: restriction._id, usedAt: null }, { $set: { usedAt: new Date() } })
      .exec();

    const code = generateVerificationCode();
    const challenge = await this.challenges.create({
      userId: new Types.ObjectId(userId),
      restrictionId: restriction._id,
      codeHash: hashVerificationCode(this.codeKey, String(restriction._id), code),
      attempts: 0,
      usedAt: null,
      expiresAt: new Date(now + CODE_TTL_MS),
    });

    try {
      await this.authService.sendEmail({
        to: String(user.email),
        subject: "Your Fockis sign-in verification code",
        text: `Your Fockis verification code is ${code}. It expires in 10 minutes. If you didn't try to sign in, change your password.`,
        html: `<p>Your Fockis verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>It expires in 10 minutes. If you didn't try to sign in, change your password.</p>`,
      });
    } catch (error) {
      await this.challenges.deleteOne({ _id: challenge._id }).exec();
      this.logger.error(`Verification email could not be sent: ${error instanceof Error ? error.message : String(error)}`);
      throw new ServiceUnavailableException("We couldn't send the email right now. Try again or use another option.");
    }

    await this.events.record({
      action: "auth.verification.code_sent",
      outcome: "success",
      severity: "info",
      targetId: userId,
      targetType: "user",
      ...this.context(request),
      metadata: { restriction: String(restriction._id), method: "email" },
    });

    return {
      sent: true,
      maskedEmail: maskEmail(String(user.email ?? "")),
      expiresInSeconds: CODE_TTL_MS / 1000,
      resendAfterSeconds: RESEND_AFTER_MS / 1000,
    };
  }

  private async checkEmailCode(restrictionId: Types.ObjectId, code: string): Promise<boolean> {
    // Claim one guess atomically (attempt limit holds under parallel requests).
    const challenge = await this.challenges
      .findOneAndUpdate(
        {
          restrictionId,
          usedAt: null,
          expiresAt: { $gt: new Date() },
          attempts: { $lt: CODE_MAX_ATTEMPTS },
        },
        { $inc: { attempts: 1 } },
        { sort: { createdAt: -1 }, new: true },
      )
      .exec();

    if (!challenge) {
      throw new BadRequestException("This code expired or was used too many times. Request a new code.");
    }

    const expected = hashVerificationCode(this.codeKey, String(restrictionId), code);

    if (!/^\d{6}$/.test(code) || !equalHex(challenge.codeHash, expected)) return false;

    // Single use.
    const used = await this.challenges
      .updateOne({ _id: challenge._id, usedAt: null }, { $set: { usedAt: new Date() } })
      .exec();

    return used.modifiedCount === 1;
  }

  // ==========================================================================
  // VERIFY
  // ==========================================================================

  async verify(token: string, method: VerificationMethod, codeInput: string, request: any) {
    const { payload, userId, restriction, user, methods } = await this.load(token);
    const context = this.context(request);
    const code = String(codeInput ?? "").replace(/\s+/g, "");

    if (method !== "totp" && method !== "email") throw new BadRequestException("Choose a verification method.");

    if (!methods.includes(method)) {
      throw new BadRequestException("That verification method isn't available for this account.");
    }

    let valid = false;

    if (method === "totp") {
      await this.accountSecurity.assertNotLocked(userId);

      const secret = decryptMfaSecret((user as any).mfaSecret);

      valid = Boolean(secret) && (await this.mfa.verifyTotp(code, secret as string));

      if (!valid) {
        const effective = await this.policy.getEffectiveForUser(user as any);

        await this.accountSecurity.recordCodeFailure(user, effective.values, {
          ...context,
          organizations: effective.organizations.map((org) => org.organizationId),
          reason: "wrong_verification_code",
        });
      }
    } else {
      valid = await this.checkEmailCode(restriction._id, code);
    }

    if (!valid) {
      await this.events.record({
        action: "auth.verification.failed",
        outcome: "failure",
        severity: "low",
        targetId: userId,
        targetType: "user",
        ...context,
        metadata: { method, restriction: String(restriction._id) },
      });

      throw new UnauthorizedException("That code isn't correct.");
    }

    const completed = await this.restrictions.markVerified(String(restriction._id), method);

    if (!completed) {
      throw new ConflictException("This verification step was already completed or expired. Sign in again.");
    }

    await this.monitor.onOwnerVerified(restriction.incidentId ? String(restriction.incidentId) : null, method);

    await this.events.record({
      action: "auth.verification.completed",
      outcome: "success",
      severity: "medium",
      actorId: userId,
      targetId: userId,
      targetType: "user",
      ...context,
      metadata: { method, restriction: String(restriction._id) },
    });

    return this.loginService.completeSignIn(user, {
      context,
      rememberMe: payload?.rememberMe === true,
      mfaSatisfied: method === "totp",
    });
  }

  // ==========================================================================
  // RECOVERY
  // ==========================================================================

  /** From the verification step: the owner can't use any code. */
  async requestRecoveryFromVerification(token: string, message: string, request: any) {
    const { userId, restriction, user } = await this.load(token);
    const context = this.context(request);

    const { case: recoveryCase, created } = await this.recovery.open({
      userId,
      username: String(user.username ?? ""),
      source: "login_verification",
      message,
      restrictionId: String(restriction._id),
      incidentId: restriction.incidentId ? String(restriction.incidentId) : null,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    if (created) {
      await this.monitor.markUnderReview(
        restriction.incidentId ? String(restriction.incidentId) : null,
        `Owner opened recovery case ${recoveryCase.number}.`,
      );
    }

    await this.events.record({
      action: "auth.recovery.requested",
      outcome: "success",
      severity: "medium",
      actorId: userId,
      targetId: userId,
      targetType: "user",
      ...context,
      metadata: { case: recoveryCase.number, source: "login_verification", created },
    });

    return {
      submitted: true,
      caseNumber: recoveryCase.number,
      message: created
        ? "Your request was sent to the Fockis security team. You'll get a notification when it has been reviewed."
        : "You already have an open request. We added your message to it.",
    };
  }

  /** Public form: same response whether or not the account exists. */
  async requestRecovery(emailInput: string, message: string, request: any) {
    const email = String(emailInput ?? "").trim().toLowerCase();
    const context = this.context(request);

    if (!email || email.length > 254) return GENERIC_RECOVERY_RESPONSE;

    try {
      const user = await this.users.findOne({ email }).select("_id username").lean().exec();

      if (!user) return GENERIC_RECOVERY_RESPONSE;

      const userId = String(user._id);
      const restriction = await this.restrictions.activeFor(userId);

      const { case: recoveryCase, created } = await this.recovery.open({
        userId,
        username: String((user as any).username ?? ""),
        source: "public_form",
        message,
        restrictionId: restriction ? String(restriction._id) : null,
        incidentId: restriction?.incidentId ? String(restriction.incidentId) : null,
        ip: context.ip,
        userAgent: context.userAgent,
      });

      if (created) {
        // The real owner learns that someone asked to recover the account.
        await this.userNotifications.notifyUser(
          userId,
          "Account recovery requested",
          `A recovery request (${recoveryCase.number}) was submitted for your account. If this wasn't you, you can ignore it — nothing changes until our team reviews it.`,
        );
      }

      await this.events.record({
        action: "auth.recovery.requested",
        outcome: "success",
        severity: "medium",
        targetId: userId,
        targetType: "user",
        ...context,
        metadata: { case: recoveryCase.number, source: "public_form", created },
      });
    } catch (error) {
      this.logger.error(`Recovery request failed: ${String(error)}`);
    }

    return GENERIC_RECOVERY_RESPONSE;
  }
}
