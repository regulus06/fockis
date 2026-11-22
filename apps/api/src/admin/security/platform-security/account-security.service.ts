import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";
import * as crypto from "crypto";

import {
  LoginThrottle,
  LoginThrottleDocument,
} from "./platform-security-policy.schema";
import { PolicyValues } from "./security-policy.definitions";
import { PlatformSecurityPolicyService } from "./platform-security-policy.service";
import { SecurityEventsService } from "./security-events.service";
import { SecurityNotificationsService } from "./security-notifications.service";
import { describeUserAgent } from "../../../users/services/login-history.service";

// ============================================================================
// ACCOUNT SECURITY
//
// Login protection, session revocation and reauthentication, driven by the
// platform security policy. All counters are updated with single atomic
// MongoDB operations, so concurrent requests and multiple API instances share
// one count.
// ============================================================================

export interface RequestContext {
  ip?: string | null;
  userAgent?: string | null;
}

export interface AttemptReservation {
  /** Failed attempts including this one (it counts until it succeeds). */
  attempt: number;
  /** Failed attempts before this one. */
  previousFailures: number;
}

const MAX_PROGRESSIVE_LOCKOUT_MS = 24 * 60 * 60 * 1000;
const RESET_EMAIL_COOLDOWN_MS = 2 * 60 * 1000;
const DEVICE_HISTORY_DAYS = 90;

/** Generic, account-agnostic message (no account enumeration). */
export function tooManyAttempts(retryAfterSeconds: number): HttpException {
  const seconds = Math.max(1, Math.ceil(retryAfterSeconds));

  const wait =
    seconds >= 120
      ? `${Math.ceil(seconds / 60)} minutes`
      : `${seconds} seconds`;

  return new HttpException(
    {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      error: "Too Many Requests",
      message: `Too many sign-in attempts. Try again in ${wait}.`,
      retryAfterSeconds: seconds,
    },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

/** Lockout duration in ms for the given lockout count. */
export function lockoutDurationMs(
  values: PolicyValues,
  previousLockouts: number,
): number {
  const base = Number(values.accountLockoutDurationMinutes || 15) * 60_000;

  if (!values.progressiveLockout) return base;

  const factor = Math.pow(2, Math.min(Math.max(0, previousLockouts), 10));

  return Math.min(base * factor, Math.max(base, MAX_PROGRESSIVE_LOCKOUT_MS));
}

/** Network prefix used for new-network detection (no geolocation). */
export function networkPrefix(ip?: string | null): string | null {
  const value = String(ip ?? "").trim().replace(/^::ffff:/i, "");

  if (!value) return null;

  const v4 = value.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);

  if (v4) return `${v4[1]}.${v4[2]}`;

  if (value.includes(":")) {
    return value.toLowerCase().split(":").slice(0, 3).join(":");
  }

  return null;
}

export function deviceFingerprint(userAgent?: string | null): string | null {
  if (!userAgent) return null;

  const info = describeUserAgent(userAgent);

  return `${info.browser}|${info.os}|${info.device}`;
}

function emailKey(email: string): string {
  return crypto
    .createHash("sha256")
    .update(`fockis-login:${email.trim().toLowerCase()}`)
    .digest("hex");
}

function firstDoc<T>(result: unknown): T | null {
  if (!result) return null;

  const maybe = result as { value?: T; ok?: number };

  if (
    typeof maybe === "object" &&
    "value" in maybe &&
    "ok" in maybe
  ) {
    return (maybe.value ?? null) as T | null;
  }

  return result as T;
}

@Injectable()
export class AccountSecurityService {
  private readonly logger = new Logger(AccountSecurityService.name);

  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    @InjectModel(LoginThrottle.name)
    private readonly throttleModel: Model<LoginThrottleDocument>,

    private readonly policy: PlatformSecurityPolicyService,
    private readonly events: SecurityEventsService,
    private readonly notifications: SecurityNotificationsService,
    private readonly jwt: JwtService,
  ) {}

  private get users() {
    return this.connection.collection("users");
  }

  // ==========================================================================
  // LOGIN — EXISTING ACCOUNTS
  // ==========================================================================

  /**
   * Atomically reserve a sign-in attempt before the password is checked.
   *
   * The attempt is counted as a failure until it succeeds. Reservations are
   * refused while the account is locked or inside the retry delay, and an
   * attempt beyond the limit locks the account without checking the
   * password, so parallel requests cannot test more passwords than allowed.
   */
  async reserveAttempt(
    userId: string,
    values: PolicyValues,
  ): Promise<AttemptReservation> {
    const id = new Types.ObjectId(userId);
    const now = new Date();
    const delayMs = Number(values.loginRetryDelaySeconds || 0) * 1000;
    const resetBefore = new Date(
      now.getTime() - Number(values.failedLoginResetMinutes || 30) * 60_000,
    );

    const conditions: Record<string, any>[] = [
      {
        $or: [
          { lockedUntil: null },
          { lockedUntil: { $exists: false } },
          { lockedUntil: { $lte: now } },
        ],
      },
    ];

    if (delayMs > 0) {
      conditions.push({
        $or: [
          { lastFailedLoginAt: null },
          { lastFailedLoginAt: { $exists: false } },
          { lastFailedLoginAt: { $lte: new Date(now.getTime() - delayMs) } },
        ],
      });
    }

    const restart = {
      $or: [
        { $eq: [{ $ifNull: ["$lastFailedLoginAt", null] }, null] },
        { $lt: ["$lastFailedLoginAt", resetBefore] },
        {
          $and: [
            { $ne: [{ $ifNull: ["$lockedUntil", null] }, null] },
            { $lte: ["$lockedUntil", now] },
          ],
        },
      ],
    };

    const updated = firstDoc<any>(
      await this.users.findOneAndUpdate(
        { _id: id, $and: conditions },
        [
          {
            $set: {
              failedLoginAttempts: {
                $cond: [
                  restart,
                  1,
                  { $add: [{ $ifNull: ["$failedLoginAttempts", 0] }, 1] },
                ],
              },
              lastFailedLoginAt: now,
              lockedUntil: null,
            },
          },
        ],
        {
          returnDocument: "after",
          projection: { failedLoginAttempts: 1, lockoutCount: 1 },
        },
      ),
    );

    if (!updated) {
      throw tooManyAttempts(await this.retryAfterForUser(id, values));
    }

    const attempt = Number(updated.failedLoginAttempts || 1);

    if (values.loginLockoutEnabled && attempt > Number(values.maxFailedLoginAttempts)) {
      // A parallel request already used the last allowed attempt.
      const lock = await this.lockUser(userId, values);
      throw tooManyAttempts(lock ? lock.durationMs / 1000 : 60);
    }

    return { attempt, previousFailures: attempt - 1 };
  }

  private async retryAfterForUser(
    id: Types.ObjectId,
    values: PolicyValues,
  ): Promise<number> {
    const doc = await this.users.findOne(
      { _id: id },
      { projection: { lockedUntil: 1, lastFailedLoginAt: 1 } },
    );

    const now = Date.now();
    const locked = doc?.lockedUntil ? new Date(doc.lockedUntil).getTime() - now : 0;

    if (locked > 0) return locked / 1000;

    const delayMs = Number(values.loginRetryDelaySeconds || 0) * 1000;
    const last = doc?.lastFailedLoginAt ? new Date(doc.lastFailedLoginAt).getTime() : 0;

    return Math.max(1, (last + delayMs - now) / 1000);
  }

  /**
   * Lock the account (only if it is not already locked). Returns the new
   * lockout count and duration, or null if another request locked it first.
   */
  async lockUser(
    userId: string,
    values: PolicyValues,
  ): Promise<{ lockoutCount: number; durationMs: number } | null> {
    const id = new Types.ObjectId(userId);
    const now = new Date();

    const current = await this.users.findOne(
      { _id: id },
      { projection: { lockoutCount: 1 } },
    );

    const durationMs = lockoutDurationMs(values, Number(current?.lockoutCount || 0));

    const updated = firstDoc<any>(
      await this.users.findOneAndUpdate(
        {
          _id: id,
          $or: [
            { lockedUntil: null },
            { lockedUntil: { $exists: false } },
            { lockedUntil: { $lte: now } },
          ],
        },
        {
          $set: { lockedUntil: new Date(now.getTime() + durationMs) },
          $inc: { lockoutCount: 1 },
        },
        { returnDocument: "after", projection: { lockoutCount: 1 } },
      ),
    );

    if (!updated) return null;

    return { lockoutCount: Number(updated.lockoutCount || 1), durationMs };
  }

  /**
   * Called after a wrong password (or wrong two-factor code) for an existing
   * account. Locks the account when the limit is reached and sends alerts.
   */
  async handleFailedAttempt(
    user: { _id: unknown; email?: string; username?: string },
    reservation: AttemptReservation,
    values: PolicyValues,
    context: RequestContext & { organizations?: string[]; reason?: string },
  ): Promise<void> {
    const userId = String(user._id);
    const max = Number(values.maxFailedLoginAttempts || 5);

    await this.events.record({
      action: "auth.login.failed",
      outcome: "failure",
      severity: "low",
      targetId: userId,
      targetType: "user",
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { attempt: reservation.attempt, reason: context.reason ?? "wrong_password" },
      retentionDays: Number(values.authEventRetentionDays || 180),
    });

    if (values.loginLockoutEnabled && reservation.attempt >= max) {
      const lock = await this.lockUser(userId, values);

      if (lock) {
        await this.onLocked(userId, lock, values, context);
        throw tooManyAttempts(lock.durationMs / 1000);
      }

      throw tooManyAttempts(await this.retryAfterForUser(new Types.ObjectId(userId), values));
    }

    if (
      values.failedLoginAlerts &&
      values.loginLockoutEnabled &&
      reservation.attempt === Math.max(2, Math.ceil(max / 2))
    ) {
      await this.notifications.notifyUser(
        userId,
        "Failed sign-in attempts",
        `There were ${reservation.attempt} failed attempts to sign in to your account. If this wasn't you, change your password and turn on two-factor authentication.`,
      );
    }
  }

  private async onLocked(
    userId: string,
    lock: { lockoutCount: number; durationMs: number },
    values: PolicyValues,
    context: RequestContext & { organizations?: string[] },
  ): Promise<void> {
    const minutes = Math.round(lock.durationMs / 60_000);

    let userNotified = false;

    if (values.notifyUserOnAccountLockout) {
      userNotified = await this.notifications.notifyUser(
        userId,
        "Your account was locked",
        `Your account was locked for ${minutes} minutes after too many failed sign-in attempts. If this wasn't you, reset your password.`,
      );
    }

    const threshold = Number(values.repeatedLockoutNotificationThreshold || 3);

    let adminsNotified = 0;

    if (
      values.notifyAdminOnRepeatedLockout &&
      lock.lockoutCount >= threshold &&
      (lock.lockoutCount - threshold) % threshold === 0
    ) {
      const recipients: string[] = [];

      if (context.organizations?.length) {
        for (const orgId of context.organizations) {
          recipients.push(...(await this.notifications.organizationAdminIds(orgId)));
        }
      } else {
        recipients.push(...(await this.notifications.platformSecurityAdminIds()));
      }

      adminsNotified = await this.notifications.notifyMany(
        recipients.filter((id) => id !== userId),
        "Repeated account lockouts",
        `An account has been locked ${lock.lockoutCount} times after failed sign-in attempts. Review it in Security & Identity.`,
        "/admin/security/audit?action=auth.login.locked",
      );
    }

    await this.events.record({
      action: "auth.login.locked",
      outcome: "denied",
      severity: lock.lockoutCount >= threshold ? "high" : "medium",
      targetId: userId,
      targetType: "user",
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {
        lockoutCount: lock.lockoutCount,
        durationMinutes: minutes,
        userNotified,
        adminsNotified,
      },
      retentionDays: Number(values.authEventRetentionDays || 180),
    });
  }

  /** Throws the generic 429 while the account is locked. */
  async assertNotLocked(userId: string): Promise<void> {
    const doc = await this.users.findOne(
      { _id: new Types.ObjectId(userId) },
      { projection: { lockedUntil: 1 } },
    );

    const remaining = doc?.lockedUntil
      ? new Date(doc.lockedUntil).getTime() - Date.now()
      : 0;

    if (remaining > 0) throw tooManyAttempts(remaining / 1000);
  }

  /**
   * A wrong two-factor or reauthentication code counts as a failed sign-in
   * attempt (atomic increment), so codes cannot be guessed without limit.
   */
  async recordCodeFailure(
    user: { _id: unknown },
    values: PolicyValues,
    context: RequestContext & { organizations?: string[]; reason: string },
  ): Promise<void> {
    const userId = String(user._id);
    const now = new Date();
    const resetBefore = new Date(
      now.getTime() - Number(values.failedLoginResetMinutes || 30) * 60_000,
    );

    const updated = firstDoc<any>(
      await this.users.findOneAndUpdate(
        { _id: new Types.ObjectId(userId) },
        [
          {
            $set: {
              failedLoginAttempts: {
                $cond: [
                  {
                    $or: [
                      { $eq: [{ $ifNull: ["$lastFailedLoginAt", null] }, null] },
                      { $lt: ["$lastFailedLoginAt", resetBefore] },
                    ],
                  },
                  1,
                  { $add: [{ $ifNull: ["$failedLoginAttempts", 0] }, 1] },
                ],
              },
              lastFailedLoginAt: now,
            },
          },
        ],
        { returnDocument: "after", projection: { failedLoginAttempts: 1 } },
      ),
    );

    const attempt = Number(updated?.failedLoginAttempts || 1);

    // Code failures never delay the next code entry; only the limit applies.
    await this.handleFailedAttempt(
      user,
      { attempt, previousFailures: attempt - 1 },
      { ...values, failedLoginAlerts: false },
      context,
    );
  }

  // ==========================================================================
  // LOGIN — UNKNOWN EMAIL ADDRESSES
  // ==========================================================================

  /**
   * Same limits for addresses that have no account, so responses do not
   * reveal whether an account exists.
   */
  async failUnknownAccount(
    email: string,
    values: PolicyValues,
    context: RequestContext,
  ): Promise<void> {
    const keyHash = emailKey(email);
    const now = new Date();
    const delayMs = Number(values.loginRetryDelaySeconds || 0) * 1000;
    const windowMs = Number(values.failedLoginResetMinutes || 30) * 60_000;
    const expiresAt = new Date(now.getTime() + Math.max(windowMs, 24 * 3_600_000));
    const resetBefore = new Date(now.getTime() - windowMs);

    const conditions: Record<string, any>[] = [
      { $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }] },
    ];

    if (delayMs > 0) {
      conditions.push({
        $or: [
          { lastFailedAt: null },
          { lastFailedAt: { $lte: new Date(now.getTime() - delayMs) } },
        ],
      });
    }

    let doc: any = null;

    try {
      doc = firstDoc<any>(
        await this.throttleModel.collection.findOneAndUpdate(
          { keyHash, $and: conditions },
          [
            {
              $set: {
                keyHash,
                failures: {
                  $cond: [
                    {
                      $or: [
                        { $eq: [{ $ifNull: ["$lastFailedAt", null] }, null] },
                        { $lt: ["$lastFailedAt", resetBefore] },
                        {
                          $and: [
                            { $ne: [{ $ifNull: ["$lockedUntil", null] }, null] },
                            { $lte: ["$lockedUntil", now] },
                          ],
                        },
                      ],
                    },
                    1,
                    { $add: [{ $ifNull: ["$failures", 0] }, 1] },
                  ],
                },
                lastFailedAt: now,
                lockedUntil: null,
                lockoutCount: { $ifNull: ["$lockoutCount", 0] },
                expiresAt,
              },
            },
          ],
          { upsert: true, returnDocument: "after" },
        ),
      );
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      doc = null;
    }

    if (!doc) {
      const existing = await this.throttleModel.findOne({ keyHash }).lean().exec();
      const lockedMs = existing?.lockedUntil
        ? new Date(existing.lockedUntil).getTime() - now.getTime()
        : 0;
      const delayLeft = existing?.lastFailedAt
        ? new Date(existing.lastFailedAt).getTime() + delayMs - now.getTime()
        : 1000;

      throw tooManyAttempts(Math.max(lockedMs, delayLeft, 1000) / 1000);
    }

    await this.events.record({
      action: "auth.login.failed",
      outcome: "failure",
      severity: "low",
      targetType: "unknown_account",
      targetId: keyHash.slice(0, 12),
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { attempt: doc.failures, reason: "unknown_account" },
      retentionDays: Number(values.authEventRetentionDays || 180),
    });

    if (
      values.loginLockoutEnabled &&
      Number(doc.failures) >= Number(values.maxFailedLoginAttempts)
    ) {
      const durationMs = lockoutDurationMs(values, Number(doc.lockoutCount || 0));

      await this.throttleModel
        .updateOne(
          { keyHash },
          {
            $set: { lockedUntil: new Date(now.getTime() + durationMs) },
            $inc: { lockoutCount: 1 },
          },
        )
        .exec();

      throw tooManyAttempts(durationMs / 1000);
    }
  }

  // ==========================================================================
  // LOGIN — SUCCESS
  // ==========================================================================

  /**
   * Alerts and audit for a successful password check. Must be called before
   * the sign-in is added to the login history so the current device is not
   * compared with itself.
   */
  async onPasswordVerified(
    user: { _id: unknown },
    reservation: AttemptReservation | null,
    values: PolicyValues,
    context: RequestContext & { mfaPending?: boolean },
  ): Promise<void> {
    const userId = String(user._id);

    try {
      await this.users.updateOne(
        { _id: new Types.ObjectId(userId) },
        { $set: { lockoutCount: 0 } },
      );
    } catch {
      // non-critical
    }

    let newDevice = false;
    let newNetwork = false;
    let hasHistory = false;

    try {
      const since = new Date(Date.now() - DEVICE_HISTORY_DAYS * 86_400_000);
      const history = await this.connection
        .collection("user_login_events")
        .find(
          { userId: new Types.ObjectId(userId), success: true, at: { $gte: since } },
          { projection: { ip: 1, userAgent: 1 } },
        )
        .sort({ at: -1 })
        .limit(200)
        .toArray();

      hasHistory = history.length > 0;

      const device = deviceFingerprint(context.userAgent);
      const network = networkPrefix(context.ip);

      if (hasHistory && device) {
        newDevice = !history.some((item) => deviceFingerprint(item.userAgent) === device);
      }

      if (hasHistory && network) {
        newNetwork = !history.some((item) => networkPrefix(item.ip) === network);
      }
    } catch {
      // History unavailable: no device/network alerts.
    }

    const previousFailures = reservation?.previousFailures ?? 0;
    const suspicious = previousFailures >= 3 || (newDevice && newNetwork);

    let alert: string | null = null;
    let delivered = false;

    const info = describeUserAgent(context.userAgent);
    const where = `${info.browser} on ${info.os}`;

    if (suspicious && values.suspiciousLoginAlerts) {
      alert = "suspicious";
      delivered = await this.notifications.notifyUser(
        userId,
        "Unusual sign-in to your account",
        previousFailures >= 3
          ? `Your account was signed in to from ${where} after ${previousFailures} failed attempts. If this wasn't you, change your password now.`
          : `Your account was signed in to from a new device and network (${where}). If this wasn't you, change your password now.`,
      );
    } else if (newDevice && values.newDeviceAlerts) {
      alert = "new_device";
      delivered = await this.notifications.notifyUser(
        userId,
        "New device signed in",
        `Your account was signed in to from ${where}. If this wasn't you, change your password.`,
      );
    } else if (newNetwork && values.newLocationAlerts) {
      alert = "new_network";
      delivered = await this.notifications.notifyUser(
        userId,
        "Sign-in from a new network",
        `Your account was signed in to from a network you haven't used recently (${where}). If this wasn't you, change your password.`,
      );
    } else if (values.loginAlerts) {
      alert = "login";
      delivered = await this.notifications.notifyUser(
        userId,
        "New sign-in",
        `Your account was signed in to from ${where}.`,
      );
    }

    await this.events.record({
      action: context.mfaPending ? "auth.login.password_verified" : "auth.login.success",
      outcome: "success",
      severity: suspicious ? "medium" : "info",
      actorId: userId,
      targetId: userId,
      targetType: "user",
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {
        newDevice,
        newNetwork,
        suspicious,
        previousFailures,
        alert,
        alertDelivered: alert ? delivered : null,
      },
      retentionDays: Number(values.authEventRetentionDays || 180),
    });
  }

  // ==========================================================================
  // SESSIONS
  // ==========================================================================

  /**
   * Reject every token issued before now, except the token with `exceptIat`
   * (the session that made the change).
   */
  async revokeSessions(
    userId: string,
    options: {
      reason: string;
      exceptIat?: number | null;
      actorId?: string | null;
      actorName?: string | null;
      notify?: boolean;
      context?: RequestContext;
    },
  ): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) return;

    await this.users.updateOne(
      { _id: new Types.ObjectId(userId) },
      {
        $set: {
          sessionsRevokedAt: new Date(),
          sessionRevocationExemptIat:
            typeof options.exceptIat === "number" ? options.exceptIat : null,
        },
      },
    );

    this.policy.invalidateUser(userId);

    await this.events.record({
      action: "session.revoked",
      outcome: "success",
      severity: "medium",
      actorId: options.actorId ?? userId,
      actorName: options.actorName ?? null,
      targetId: userId,
      targetType: "user",
      ip: options.context?.ip,
      userAgent: options.context?.userAgent,
      metadata: {
        reason: options.reason,
        keptCurrentSession: typeof options.exceptIat === "number",
      },
    });
  }

  /**
   * Run the configured follow-up for a security change on an account:
   * session revocation, user notification and audit.
   */
  async onSecurityChange(
    userId: string,
    change:
      | "password_changed"
      | "password_reset"
      | "admin_password_reset"
      | "mfa_enabled"
      | "mfa_disabled"
      | "recovery_codes_regenerated"
      | "email_changed"
      | "sessions_revoked",
    options: {
      exceptIat?: number | null;
      actorId?: string | null;
      actorName?: string | null;
      context?: RequestContext;
      user?: Record<string, unknown>;
    } = {},
  ): Promise<{ sessionsRevoked: boolean; notified: boolean }> {
    const effective = await this.policy.getEffectiveForUser(
      (options.user as any) ?? { _id: userId },
    );
    const values = effective.values;

    const passwordChange =
      change === "password_changed" ||
      change === "password_reset" ||
      change === "admin_password_reset";

    let revoke = false;

    if (passwordChange) {
      revoke = Boolean(values.revokeSessionsAfterPasswordChange);

      if (change === "password_reset" && values.passwordResetProtection) {
        revoke = true;
      }
    } else if (change === "email_changed") {
      revoke =
        Boolean(values.revokeSessionsAfterSecurityChange) ||
        Boolean(values.emailChangeProtection);
    } else if (change !== "mfa_enabled" && change !== "sessions_revoked") {
      revoke = Boolean(values.revokeSessionsAfterSecurityChange);
    }

    if (revoke) {
      await this.revokeSessions(userId, {
        reason: change,
        exceptIat: change === "password_reset" ? null : options.exceptIat,
        actorId: options.actorId,
        actorName: options.actorName,
        context: options.context,
      });
    }

    const messages: Record<string, [string, string]> = {
      password_changed: ["Password changed", "Your password was changed."],
      password_reset: ["Password reset", "Your password was reset using a reset link."],
      admin_password_reset: [
        "Password reset by an administrator",
        "An administrator reset your password.",
      ],
      mfa_enabled: ["Two-factor turned on", "Two-factor authentication was turned on for your account."],
      mfa_disabled: ["Two-factor turned off", "Two-factor authentication was turned off for your account."],
      recovery_codes_regenerated: [
        "Recovery codes replaced",
        "New two-factor recovery codes were created. Your old codes no longer work.",
      ],
      email_changed: ["Email address changed", "The email address on your account was changed."],
      sessions_revoked: ["Signed out of other sessions", "Your other sessions were signed out."],
    };

    let notified = false;

    const notify =
      values.securityChangeNotifications ||
      (change === "password_reset" && values.passwordResetProtection) ||
      (change === "email_changed" && values.emailChangeProtection);

    if (notify) {
      const [title, body] = messages[change];

      notified = await this.notifications.notifyUser(
        userId,
        title,
        `${body}${revoke ? " Other sessions were signed out." : ""} If this wasn't you, contact Fockis support.`,
      );
    }

    await this.events.record({
      action: `account.${change}`,
      outcome: "success",
      severity: change === "mfa_disabled" || change === "admin_password_reset" ? "high" : "medium",
      actorId: options.actorId ?? userId,
      actorName: options.actorName ?? null,
      targetId: userId,
      targetType: "user",
      ip: options.context?.ip,
      userAgent: options.context?.userAgent,
      metadata: { sessionsRevoked: revoke, userNotified: notified },
    });

    return { sessionsRevoked: revoke, notified };
  }

  // ==========================================================================
  // PASSWORD RESET PROTECTION
  // ==========================================================================

  /**
   * Atomically claim the right to send a reset email. Returns false while the
   * account is inside the cooldown (the caller still returns the generic
   * response, so nothing is revealed).
   */
  async claimPasswordResetEmail(userId: string, values: PolicyValues): Promise<boolean> {
    if (!values.passwordResetProtection) return true;

    const now = new Date();

    const result = await this.users.updateOne(
      {
        _id: new Types.ObjectId(userId),
        $or: [
          { passwordResetRequestedAt: null },
          { passwordResetRequestedAt: { $exists: false } },
          { passwordResetRequestedAt: { $lte: new Date(now.getTime() - RESET_EMAIL_COOLDOWN_MS) } },
        ],
      },
      { $set: { passwordResetRequestedAt: now } },
    );

    return result.modifiedCount === 1;
  }

  // ==========================================================================
  // REAUTHENTICATION
  // ==========================================================================

  async issueReauthToken(userId: string): Promise<{ token: string; expiresInSeconds: number }> {
    const platform = await this.policy.getPlatform();
    const minutes = Number(platform.accounts.reauthenticationWindowMinutes || 10);
    const expiresInSeconds = minutes * 60;

    const token = this.jwt.sign(
      { sub: String(userId), purpose: "reauth", tokenType: "reauth" },
      { expiresIn: expiresInSeconds },
    );

    return { token, expiresInSeconds };
  }

  isReauthenticated(request: any, userId: string): boolean {
    const header = request?.headers?.["x-fockis-reauth"];
    const token = Array.isArray(header) ? header[0] : header;

    if (typeof token !== "string" || !token) return false;

    try {
      const payload = this.jwt.verify(token);

      return (
        payload?.purpose === "reauth" &&
        payload?.tokenType === "reauth" &&
        String(payload?.sub) === String(userId)
      );
    } catch {
      return false;
    }
  }

  /** Throws 403 REAUTH_REQUIRED unless the request carries a valid token. */
  assertReauthenticated(request: any, userId: string, required = true): void {
    if (!required) return;

    if (!this.isReauthenticated(request, userId)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "REAUTH_REQUIRED",
        message: "Confirm your password to continue.",
      });
    }
  }

  // ==========================================================================
  // TOKEN LIFETIME
  // ==========================================================================

  /** Access-token lifetime for a new sign-in. */
  /** Access-token lifetime in seconds (7 days unless remember-me applies). */
  accessTokenExpiresIn(values: PolicyValues, rememberMe: boolean): number {
    const days = Number(values.rememberMeDays || 0);

    if (rememberMe && days > 0) return days * 86_400;

    return 7 * 86_400;
  }
}
