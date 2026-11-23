import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";
import * as crypto from "crypto";

import {
  CLOSED_INCIDENT_STATUSES,
  CounterEvent,
  IncidentKind,
  IncidentStatus,
  LoginFailureCounter,
  LoginFailureCounterDocument,
  RISK_RANK,
  RiskLevel,
  SecurityIncident,
  SecurityIncidentDocument,
} from "./security-incident.schema";
import {
  MonitoringThresholds,
  REASON,
  RiskResult,
  evaluateAccountRisk,
  evaluateSourceRisk,
  levelToPriority,
  thresholdsFromPolicy,
} from "./risk-evaluation";
import { AuthRestrictionService } from "./auth-restriction.service";
import { PlatformSecurityPolicyService } from "../platform-security/platform-security-policy.service";
import { SecurityEventsService } from "../platform-security/security-events.service";
import { SecurityNotificationsService } from "../platform-security/security-notifications.service";
import {
  ADMIN_NOTIFICATION_EVENT,
  ADMIN_NOTIFICATION_RESOLVED_EVENT,
  AdminNotificationEvent,
} from "../../notifications/admin-notification.types";
import { SESSIONS_REVOKED_EVENT } from "../../notifications/admin-notification.types";

// ============================================================================
// FAILED-LOGIN MONITORING
//
// Called by the sign-in code for every failed or refused attempt. Counts are
// kept in sliding windows (per account, per unknown address, per source IP),
// risk is evaluated with reason codes, and incidents are opened/escalated
// once per level. Account-level escalation can require step-up verification
// and (critical) sign the account out. Source IPs are only monitored: they are
// never blocked automatically, because addresses are shared.
//
// Monitoring never makes a sign-in fail: errors are logged and swallowed.
// ============================================================================

const MAX_EVENTS = 600;
const SWEEP_INTERVAL_MS = 5 * 60_000;
const INCIDENT_IDLE_MS = 24 * 3_600_000;
const SECURITY_VIEW = "security.view";

export interface FailureInput {
  userId?: string | null;
  /** Hash of the normalized email for addresses with no account. */
  emailHash?: string | null;
  ip?: string | null;
  /** Refused because of lockout / retry delay (password not checked). */
  blocked?: boolean;
}

export interface CounterSignals {
  windowFailures: number;
  windowBlocked: number;
  distinctSources: number;
  distinctTargets: number;
}

/** Summarize the events inside the window (pure, unit-tested). */
export function summarizeEvents(events: CounterEvent[], since: number): CounterSignals {
  const inWindow = (events ?? []).filter((e) => new Date(e.t).getTime() >= since);

  return {
    windowFailures: inWindow.length,
    windowBlocked: inWindow.filter((e) => e.b).length,
    distinctSources: new Set(inWindow.map((e) => e.s).filter(Boolean)).size,
    distinctTargets: new Set(inWindow.map((e) => e.g).filter(Boolean)).size,
  };
}

/** Failures after a moment (e.g. since the owner last verified). */
export function failuresSince(events: CounterEvent[], since: number): number {
  return (events ?? []).filter((e) => new Date(e.t).getTime() > since).length;
}

export function networkOf(ip?: string | null): string | null {
  const value = String(ip ?? "").trim().replace(/^::ffff:/i, "");

  if (!value) return null;

  const v4 = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/);

  if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}`;

  if (value.includes(":")) return value.toLowerCase().split(":").slice(0, 4).join(":");

  return null;
}

function hashValue(value: string): string {
  return crypto.createHash("sha256").update(`fockis-monitor:${value}`).digest("hex").slice(0, 24);
}

function incidentNumber(): string {
  return `SI-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

function unwrap<T>(result: unknown): T | null {
  if (!result) return null;

  const maybe = result as { value?: T; ok?: number };

  if (typeof maybe === "object" && "value" in maybe && "ok" in maybe) {
    return (maybe.value ?? null) as T | null;
  }

  return result as T;
}

const STAFF_ROLES = new Set(["moderator", "admin", "super_admin"]);

export function isPrivilegedAccount(user: any): boolean {
  if (!user) return false;

  const role = String(user.role ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");

  return (
    STAFF_ROLES.has(role) ||
    user.isSuperAdmin === true ||
    Boolean(user.adminRoleId) ||
    (Array.isArray(user.permissions) && user.permissions.length > 0)
  );
}

@Injectable()
export class LoginMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LoginMonitorService.name);
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(LoginFailureCounter.name)
    private readonly counters: Model<LoginFailureCounterDocument>,
    @InjectModel(SecurityIncident.name)
    private readonly incidents: Model<SecurityIncidentDocument>,
    private readonly restrictions: AuthRestrictionService,
    private readonly policy: PlatformSecurityPolicyService,
    private readonly events: SecurityEventsService,
    private readonly userNotifications: SecurityNotificationsService,
    private readonly emitter: EventEmitter2,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === "test") return;

    this.sweepTimer = setInterval(() => {
      void this.sweep().catch((error) =>
        this.logger.warn(`Security incident sweep failed: ${String(error)}`),
      );
    }, SWEEP_INTERVAL_MS);

    this.sweepTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  // ==========================================================================
  // FAILURES
  // ==========================================================================

  async recordFailure(input: FailureInput): Promise<void> {
    try {
      const platform = await this.policy.getPlatform();
      const values = platform.accounts;

      if (!values.loginMonitoringEnabled) return;

      const thresholds = thresholdsFromPolicy(values);
      const now = new Date();
      const windowMs = thresholds.windowMinutes * 60_000;
      const since = now.getTime() - windowMs;
      const network = networkOf(input.ip);

      const userId =
        input.userId && Types.ObjectId.isValid(String(input.userId)) ? String(input.userId) : null;

      const subjectKey = userId
        ? `auth:user:${userId}`
        : input.emailHash
          ? `auth:unknown:${String(input.emailHash).slice(0, 32)}`
          : null;

      if (subjectKey) {
        const counter = await this.bump(subjectKey, now, windowMs, {
          s: network,
          g: null,
          b: Boolean(input.blocked),
        });

        if (counter) {
          await this.evaluateSubject({
            key: subjectKey,
            userId,
            counter,
            signals: summarizeEvents(counter.events, since),
            thresholds,
            values,
            now,
          });
        }
      }

      if (input.ip) {
        const sourceKey = `auth:source:${hashValue(String(input.ip))}`;
        const target = userId ? `u:${userId}` : input.emailHash ? `e:${String(input.emailHash).slice(0, 12)}` : null;

        const counter = await this.bump(sourceKey, now, windowMs, {
          s: null,
          g: target,
          b: Boolean(input.blocked),
        });

        if (counter) {
          const signals = summarizeEvents(counter.events, since);
          const risk = evaluateSourceRisk(signals, thresholds);

          if (risk.level !== "none") {
            await this.escalate({
              groupKey: sourceKey,
              kind: "source_abuse",
              risk,
              signals,
              now,
              subjectUserId: null,
              subjectLabel: `Source ${network ?? "unknown network"}`,
              privileged: false,
              sourceIp: String(input.ip),
              thresholds,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed-login monitoring error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Atomic sliding-window append. */
  private async bump(
    key: string,
    now: Date,
    windowMs: number,
    event: Omit<CounterEvent, "t">,
  ): Promise<{ events: CounterEvent[]; totalFailures: number } | null> {
    const limit = new Date(now.getTime() - windowMs);
    const expiresAt = new Date(now.getTime() + Math.max(windowMs, 86_400_000));

    const pipeline = [
      {
        $set: {
          key: { $literal: key },
          events: {
            $slice: [
              {
                $concatArrays: [
                  {
                    $filter: {
                      input: { $ifNull: ["$events", []] },
                      as: "e",
                      cond: { $gte: ["$$e.t", limit] },
                    },
                  },
                  [
                    {
                      t: now,
                      s: { $literal: event.s },
                      g: { $literal: event.g },
                      b: { $literal: event.b },
                    },
                  ],
                ],
              },
              -MAX_EVENTS,
            ],
          },
          totalFailures: { $add: [{ $ifNull: ["$totalFailures", 0] }, 1] },
          lastFailureAt: now,
          expiresAt,
        },
      },
    ];

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const doc = unwrap<any>(
          await this.counters.collection.findOneAndUpdate({ key }, pipeline, {
            upsert: true,
            returnDocument: "after",
            projection: { events: 1, totalFailures: 1 },
          }),
        );

        return doc ? { events: doc.events ?? [], totalFailures: Number(doc.totalFailures ?? 0) } : null;
      } catch (error: any) {
        if (error?.code !== 11000 || attempt === 1) throw error;
      }
    }

    return null;
  }

  private async evaluateSubject(input: {
    key: string;
    userId: string | null;
    counter: { events: CounterEvent[] };
    signals: ReturnType<typeof summarizeEvents>;
    thresholds: MonitoringThresholds;
    values: Record<string, boolean | number>;
    now: Date;
  }): Promise<void> {
    const { userId, signals, thresholds, values, now } = input;

    let user: any = null;

    if (userId) {
      user = await this.connection.collection("users").findOne(
        { _id: new Types.ObjectId(userId) },
        { projection: { username: 1, role: 1, isSuperAdmin: 1, adminRoleId: 1, permissions: 1 } },
      );
    }

    const privileged = isPrivilegedAccount(user);

    const risk = evaluateAccountRisk(
      {
        windowFailures: signals.windowFailures,
        windowBlocked: signals.windowBlocked,
        distinctSources: signals.distinctSources,
        privileged,
        unknownAccount: !userId,
      },
      thresholds,
    );

    if (risk.level === "none") return;

    const incident = await this.escalate({
      groupKey: input.key,
      kind: userId ? "account_failed_logins" : "unknown_account_failed_logins",
      risk,
      signals,
      now,
      subjectUserId: userId,
      subjectLabel: userId
        ? String(user?.username || "Account")
        : `Unknown address #${input.key.slice(-8)}`,
      privileged,
      sourceIp: null,
      thresholds,
    });

    if (!incident || !userId) return;

    // ------------------------------------------------------------------
    // ACCOUNT RESTRICTIONS
    //
    // Counted from the owner's last verification, so a verified owner is not
    // restricted again by the same burst.
    // ------------------------------------------------------------------

    const verifiedAt = incident.verifiedAt ? new Date(incident.verifiedAt).getTime() : 0;
    const recent = failuresSince(input.counter.events, Math.max(verifiedAt, now.getTime() - thresholds.windowMinutes * 60_000));

    const critical = recent >= thresholds.critical || (risk.level === "critical" && recent >= thresholds.high);
    const high = recent >= thresholds.high || (risk.level !== "warning" && recent >= thresholds.warning && privileged);

    if (!high && !critical) return;

    if (values.stepUpVerificationOnHighRisk) {
      const { restriction, created, raised } = await this.restrictions.ensure({
        userId,
        incidentId: String(incident._id),
        level: critical ? "critical" : "step_up",
        reasonCodes: risk.reasonCodes,
        durationHours: Number(values.loginRestrictionDurationHours || 24),
      });

      if (created || raised) {
        await this.incidents.updateOne(
          { _id: incident._id, open: true },
          {
            $set: {
              restrictionId: restriction?._id ?? null,
              ...(incident.status === "under_review" ? {} : { status: "verification_pending" as IncidentStatus }),
            },
            $push: {
              timeline: {
                at: now,
                action: created ? "restriction_created" : "restriction_raised",
                actorId: null,
                actorName: "System",
                note: critical
                  ? "Verification required at next sign-in (critical)."
                  : "Verification required at next sign-in.",
              },
            },
          },
        );

        await this.events.record({
          action: created ? "security.restriction.created" : "security.restriction.raised",
          outcome: "success",
          severity: critical ? "high" : "medium",
          targetId: userId,
          targetType: "user",
          metadata: {
            incident: incident.number,
            level: critical ? "critical" : "step_up",
            reasons: risk.reasonCodes.join(","),
          },
        });

        if (created) {
          await this.userNotifications.notifyUser(
            userId,
            "Extra sign-in check turned on",
            "We saw repeated failed sign-in attempts on your account. The next time you sign in, you'll be asked to confirm it's you. If you didn't try to sign in, consider changing your password.",
          );
        }
      }
    }

    if (critical && values.revokeSessionsOnCritical) {
      const lastRevoked = incident.sessionsRevokedAt ? new Date(incident.sessionsRevokedAt).getTime() : 0;

      if (failuresSince(input.counter.events, lastRevoked) < thresholds.critical && lastRevoked) return;

      // Only one request performs the revocation.
      const claimed = await this.incidents.updateOne(
        {
          _id: incident._id,
          $or: [
            { sessionsRevokedAt: null },
            { sessionsRevokedAt: { $lt: new Date(now.getTime() - thresholds.windowMinutes * 60_000) } },
          ],
        },
        {
          $set: { sessionsRevokedAt: now, ...(incident.status === "under_review" ? {} : { status: "restricted" }) },
          $push: {
            timeline: {
              at: now,
              action: "sessions_revoked",
              actorId: null,
              actorName: "System",
              note: "All sessions were signed out at the critical level.",
            },
          },
        },
      );

      if (!claimed.modifiedCount) return;

      await this.connection.collection("users").updateOne(
        { _id: new Types.ObjectId(userId) },
        { $set: { sessionsRevokedAt: now, sessionRevocationExemptIat: null } },
      );

      this.policy.invalidateUser(userId);
      this.emitter.emit(SESSIONS_REVOKED_EVENT, { userId });

      await this.events.record({
        action: "session.revoked",
        outcome: "success",
        severity: "high",
        targetId: userId,
        targetType: "user",
        metadata: { reason: "critical_failed_logins", incident: incident.number },
      });
    }
  }

  /**
   * Create or update the open incident for a group; escalate (notify)
   * exactly once per new level. Returns the incident after the update.
   */
  private async escalate(input: {
    groupKey: string;
    kind: IncidentKind;
    risk: RiskResult;
    signals: ReturnType<typeof summarizeEvents>;
    now: Date;
    subjectUserId: string | null;
    subjectLabel: string;
    privileged: boolean;
    sourceIp: string | null;
    thresholds: MonitoringThresholds;
  }): Promise<any | null> {
    const { risk, signals, now } = input;
    const rank = RISK_RANK[risk.level];

    let before: any = null;
    let created = false;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        before = unwrap<any>(
          await this.incidents.collection.findOneAndUpdate(
            { groupKey: input.groupKey, open: true },
            {
              $setOnInsert: {
                number: incidentNumber(),
                groupKey: input.groupKey,
                open: true,
                kind: input.kind,
                status: "detected",
                subjectUserId: input.subjectUserId ? new Types.ObjectId(input.subjectUserId) : null,
                subjectLabel: input.subjectLabel.slice(0, 120),
                privileged: input.privileged,
                sourceIp: input.sourceIp,
                firstSeenAt: now,
                restrictionId: null,
                verifiedAt: null,
                sessionsRevokedAt: null,
                successAfterFailuresAt: null,
                acknowledgedBy: null,
                acknowledgedAt: null,
                resolvedBy: null,
                resolvedAt: null,
                resolutionNote: "",
                timeline: [],
                createdAt: now,
              },
              $set: {
                windowFailures: signals.windowFailures,
                blockedAttempts: signals.windowBlocked,
                distinctSources: signals.distinctSources,
                distinctTargets: signals.distinctTargets,
                lastActivityAt: now,
                updatedAt: now,
              },
              $inc: { totalFailures: 1 },
              $max: { levelRank: rank, riskScore: risk.score },
              $addToSet: { reasonCodes: { $each: risk.reasonCodes } },
            },
            { upsert: true, returnDocument: "before" },
          ),
        );
        created = !before;
        break;
      } catch (error: any) {
        if (error?.code !== 11000 || attempt === 1) throw error;
      }
    }

    const previousRank = created ? 0 : Number(before?.levelRank ?? 0);
    const escalated = rank > previousRank;

    if (escalated) {
      const currentStatus: IncidentStatus | undefined = before?.status;
      const keepStatus =
        currentStatus &&
        ["under_review", "verification_pending", "restricted"].includes(currentStatus);
      const nextStatus: IncidentStatus = keepStatus
        ? (currentStatus as IncidentStatus)
        : risk.level === "warning"
          ? "detected"
          : "high_risk";

      await this.incidents.updateOne(
        { groupKey: input.groupKey, open: true, levelRank: rank },
        {
          $set: { level: risk.level, status: nextStatus },
          $push: {
            timeline: {
              at: now,
              action: created ? "detected" : "escalated",
              actorId: null,
              actorName: "System",
              note: `${signals.windowFailures} failed attempts in ${input.thresholds.windowMinutes} min (${risk.level}).`,
            },
          },
        },
      );
    }

    const incident = await this.incidents.findOne({ groupKey: input.groupKey, open: true }).lean().exec();

    if (incident && escalated) {
      await this.notifyAdmins(incident, risk.level, signals, input.thresholds);

      await this.events.record({
        action: created ? "security.incident.opened" : "security.incident.escalated",
        outcome: "success",
        severity: risk.level === "critical" ? "critical" : risk.level === "high" ? "high" : "medium",
        targetId: input.subjectUserId ?? String(incident._id),
        targetType: input.subjectUserId ? "user" : "security_incident",
        metadata: {
          incident: incident.number,
          kind: input.kind,
          level: risk.level,
          failures: signals.windowFailures,
          reasons: risk.reasonCodes.join(","),
        },
      });
    }

    return incident;
  }

  private async notifyAdmins(
    incident: any,
    level: RiskLevel,
    signals: ReturnType<typeof summarizeEvents>,
    thresholds: MonitoringThresholds,
  ): Promise<void> {
    const subject =
      incident.kind === "source_abuse"
        ? `${signals.distinctTargets} account${signals.distinctTargets === 1 ? "" : "s"} from one source`
        : incident.kind === "unknown_account_failed_logins"
          ? "an address with no Fockis account"
          : `${incident.subjectLabel}${incident.privileged ? " (administrator)" : ""}`;

    const title =
      level === "critical"
        ? "Critical: repeated failed sign-ins"
        : level === "high"
          ? "High-risk login pattern"
          : "Unusual login pattern";

    this.emit({
      type: "security.login_pattern",
      category: "security",
      priority: levelToPriority(level),
      title,
      message: `${signals.windowFailures} failed sign-in attempts in ${thresholds.windowMinutes} minutes on ${subject}. Incident ${incident.number}.`,
      groupKey: `security_incident:${incident._id}`,
      entityType: "security_incident",
      entityId: String(incident._id),
      link: `/admin/security/incidents/${incident._id}`,
      requiredPermissions: [SECURITY_VIEW],
      actionRequired: true,
      excludeUserIds: incident.subjectUserId ? [String(incident.subjectUserId)] : [],
      metadata: { incident: incident.number, level, failures: signals.windowFailures },
    });
  }

  private emit(event: AdminNotificationEvent): void {
    this.emitter.emit(ADMIN_NOTIFICATION_EVENT, event);
  }

  // ==========================================================================
  // SUCCESSFUL SIGN-IN SIGNALS
  // ==========================================================================

  /**
   * The correct password was entered. If the account has an open
   * failed-login incident this is the riskiest moment, so administrators
   * are told; a new browser + network on an administrator account opens a
   * suspicious sign-in incident.
   */
  async recordPasswordVerified(
    userId: string,
    signals: { previousFailures: number; newDevice: boolean; newNetwork: boolean },
  ): Promise<void> {
    try {
      const platform = await this.policy.getPlatform();

      if (!platform.accounts.loginMonitoringEnabled || !Types.ObjectId.isValid(userId)) return;

      const now = new Date();
      const open = await this.incidents
        .findOne({ groupKey: `auth:user:${userId}`, open: true })
        .lean()
        .exec();

      if (open) {
        await this.incidents.updateOne(
          { _id: open._id },
          {
            $set: { successAfterFailuresAt: now, lastActivityAt: now },
            $addToSet: { reasonCodes: REASON.SUCCESS_AFTER_FAILURES },
            $push: {
              timeline: {
                at: now,
                action: "password_verified",
                actorId: null,
                actorName: "System",
                note: "The correct password was entered after failed attempts.",
              },
            },
          },
        );

        this.emit({
          type: "security.login_pattern",
          category: "security",
          priority: open.level === "critical" ? "critical" : "high",
          title: "Correct password after failed attempts",
          message: `The correct password was entered for ${open.subjectLabel} while incident ${open.number} was open.`,
          groupKey: `security_incident:${open._id}`,
          entityType: "security_incident",
          entityId: String(open._id),
          link: `/admin/security/incidents/${open._id}`,
          requiredPermissions: [SECURITY_VIEW],
          actionRequired: true,
          excludeUserIds: [userId],
          metadata: { incident: open.number },
        });

        return;
      }

      if (!(signals.newDevice && signals.newNetwork)) return;

      const user = await this.connection.collection("users").findOne(
        { _id: new Types.ObjectId(userId) },
        { projection: { username: 1, role: 1, isSuperAdmin: 1, adminRoleId: 1, permissions: 1 } },
      );

      if (!isPrivilegedAccount(user)) return;

      const thresholds = thresholdsFromPolicy(platform.accounts);

      await this.escalate({
        groupKey: `auth:signin:${userId}`,
        kind: "suspicious_sign_in",
        risk: {
          level: "warning",
          score: 40,
          reasonCodes: [REASON.NEW_DEVICE_AND_NETWORK, REASON.PRIVILEGED],
        },
        signals: { windowFailures: signals.previousFailures, windowBlocked: 0, distinctSources: 1, distinctTargets: 1 },
        now,
        subjectUserId: userId,
        subjectLabel: String(user?.username || "Administrator"),
        privileged: true,
        sourceIp: null,
        thresholds,
      });
    } catch (error) {
      this.logger.error(`Sign-in monitoring error: ${String(error)}`);
    }
  }

  // ==========================================================================
  // OWNER VERIFIED / RECOVERY
  // ==========================================================================

  async onOwnerVerified(incidentId: string | null, method: string): Promise<void> {
    if (!incidentId || !Types.ObjectId.isValid(incidentId)) return;

    const now = new Date();

    await this.incidents.updateOne(
      { _id: new Types.ObjectId(incidentId), open: true },
      [
        {
          $set: {
            verifiedAt: now,
            lastActivityAt: now,
            status: {
              $cond: [{ $eq: ["$status", "under_review"] }, "$status", "verified"],
            },
            timeline: {
              $concatArrays: [
                { $ifNull: ["$timeline", []] },
                [
                  {
                    at: now,
                    action: "owner_verified",
                    actorId: null,
                    actorName: "Account owner",
                    note: { $literal: `Verified with ${method === "totp" ? "authenticator app" : "email code"}.` },
                  },
                ],
              ],
            },
          },
        },
      ],
    );
  }

  async markUnderReview(incidentId: string | null, note: string): Promise<void> {
    if (!incidentId || !Types.ObjectId.isValid(incidentId)) return;

    await this.incidents.updateOne(
      { _id: new Types.ObjectId(incidentId), open: true },
      {
        $set: { status: "under_review", lastActivityAt: new Date() },
        $push: {
          timeline: { at: new Date(), action: "under_review", actorId: null, actorName: "System", note: note.slice(0, 500) },
        },
      },
    );
  }

  // ==========================================================================
  // EXPIRY
  // ==========================================================================

  async sweep(): Promise<{ restrictions: number; incidents: number }> {
    const now = new Date();
    const expiredRestrictions = await this.restrictions.expireDue();

    for (const restriction of expiredRestrictions) {
      if (!restriction.incidentId) continue;

      await this.incidents.updateOne(
        { _id: restriction.incidentId, open: true },
        {
          $push: {
            timeline: {
              at: now,
              action: "restriction_expired",
              actorId: null,
              actorName: "System",
              note: "The verification requirement expired.",
            },
          },
        },
      );
    }

    const idle = await this.incidents
      .find({
        open: true,
        status: { $nin: ["under_review", ...CLOSED_INCIDENT_STATUSES] },
        lastActivityAt: { $lt: new Date(now.getTime() - INCIDENT_IDLE_MS) },
      })
      .limit(500)
      .lean()
      .exec();

    let closed = 0;

    for (const incident of idle) {
      if (incident.restrictionId) {
        const restriction = await this.restrictions.findById(String(incident.restrictionId));

        if (restriction?.active && restriction.expiresAt.getTime() > now.getTime()) continue;
      }

      const result = await this.incidents.updateOne(
        { _id: incident._id, open: true },
        {
          $set: { open: false, status: "expired" },
          $push: {
            timeline: {
              at: now,
              action: "expired",
              actorId: null,
              actorName: "System",
              note: "No activity for 24 hours.",
            },
          },
        },
      );

      if (result.modifiedCount) {
        closed += 1;
        this.emitter.emit(ADMIN_NOTIFICATION_RESOLVED_EVENT, {
          entityType: "security_incident",
          entityId: String(incident._id),
        });
      }
    }

    return { restrictions: expiredRestrictions.length, incidents: closed };
  }
}
