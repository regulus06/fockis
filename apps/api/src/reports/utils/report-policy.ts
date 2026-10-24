/* ============================================================================
   REPORT POLICY (pure)
   apps/api/src/reports/utils/report-policy.ts

   Thresholds turn report volume into REVIEW signals only. Nothing here
   decides that a violation happened or applies any penalty: those are
   moderator decisions (see services/moderation.service.ts).
============================================================================ */

import {
  ALERT_RANK,
  AlertLevel,
  CasePriority,
  PRIORITY_RANK,
  ReportReason,
} from "../reports.constants";

export interface ModerationThresholds {
  /** Unique eligible reporters that put a case in front of moderators. */
  reviewThreshold: number;
  /** Unique eligible reporters that raise the case to high priority. */
  highPriorityThreshold: number;
  /** Reasons that escalate on the first credible report. */
  urgentReasons: ReportReason[];
  /** Per-reporter cap on submissions in a rolling 24 hours. */
  maxReportsPerDay: number;
  /** Notify moderators when a target receives its first report. */
  notifyOnNewCase: boolean;
}

export const DEFAULT_THRESHOLDS: ModerationThresholds = {
  reviewThreshold: 3,
  highPriorityThreshold: 5,
  urgentReasons: [ReportReason.VIOLENCE, ReportReason.SELF_HARM, ReportReason.UNDERAGE],
  maxReportsPerDay: 30,
  notifyOnNewCase: true,
};

function positiveInt(value: unknown, fallback: number, max = 1000): number {
  const number = Number(value);

  return Number.isInteger(number) && number >= 1 && number <= max ? number : fallback;
}

/**
 * Validated settings: env defaults (MODERATION_REVIEW_THRESHOLD,
 * MODERATION_HIGH_PRIORITY_THRESHOLD, MODERATION_MAX_REPORTS_PER_DAY),
 * overridden by stored admin settings. High is never below review.
 */
export function resolveThresholds(
  stored: Partial<ModerationThresholds> | null | undefined,
  env: Record<string, string | undefined> = process.env,
): ModerationThresholds {
  const base: ModerationThresholds = {
    ...DEFAULT_THRESHOLDS,
    reviewThreshold: positiveInt(env.MODERATION_REVIEW_THRESHOLD, DEFAULT_THRESHOLDS.reviewThreshold),
    highPriorityThreshold: positiveInt(
      env.MODERATION_HIGH_PRIORITY_THRESHOLD,
      DEFAULT_THRESHOLDS.highPriorityThreshold,
    ),
    maxReportsPerDay: positiveInt(env.MODERATION_MAX_REPORTS_PER_DAY, DEFAULT_THRESHOLDS.maxReportsPerDay),
  };

  const reviewThreshold = positiveInt(stored?.reviewThreshold, base.reviewThreshold);
  const highPriorityThreshold = Math.max(
    reviewThreshold,
    positiveInt(stored?.highPriorityThreshold, base.highPriorityThreshold),
  );
  const validReasons = new Set(Object.values(ReportReason));
  const urgentReasons = Array.isArray(stored?.urgentReasons)
    ? stored!.urgentReasons.filter((reason) => validReasons.has(reason))
    : base.urgentReasons;

  return {
    reviewThreshold,
    highPriorityThreshold,
    urgentReasons,
    maxReportsPerDay: positiveInt(stored?.maxReportsPerDay, base.maxReportsPerDay),
    notifyOnNewCase:
      typeof stored?.notifyOnNewCase === "boolean" ? stored.notifyOnNewCase : base.notifyOnNewCase,
  };
}

export interface AlertDecision {
  level: AlertLevel;
  rank: number;
  priority: CasePriority;
  reason: string;
}

/**
 * The alert level a case should be at, given its unique eligible
 * reporter count and whether any eligible report has an urgent reason.
 */
export function evaluateAlert(
  eligibleReporters: number,
  hasUrgentReason: boolean,
  thresholds: ModerationThresholds,
): AlertDecision {
  if (hasUrgentReason) {
    return {
      level: AlertLevel.URGENT,
      rank: ALERT_RANK[AlertLevel.URGENT],
      priority: CasePriority.URGENT,
      reason: "Urgent safety reason reported",
    };
  }

  if (eligibleReporters >= thresholds.highPriorityThreshold) {
    return {
      level: AlertLevel.HIGH,
      rank: ALERT_RANK[AlertLevel.HIGH],
      priority: CasePriority.HIGH,
      reason: `${eligibleReporters} unique reporters (high-priority threshold ${thresholds.highPriorityThreshold})`,
    };
  }

  if (eligibleReporters >= thresholds.reviewThreshold) {
    return {
      level: AlertLevel.REVIEW,
      rank: ALERT_RANK[AlertLevel.REVIEW],
      priority: CasePriority.NORMAL,
      reason: `${eligibleReporters} unique reporters (review threshold ${thresholds.reviewThreshold})`,
    };
  }

  if (eligibleReporters >= 1) {
    return {
      level: AlertLevel.NEW,
      rank: ALERT_RANK[AlertLevel.NEW],
      priority: CasePriority.LOW,
      reason: "First report on this target",
    };
  }

  return { level: AlertLevel.NONE, rank: 0, priority: CasePriority.LOW, reason: "" };
}

export function priorityRank(priority: CasePriority): number {
  return PRIORITY_RANK[priority] ?? 0;
}

/** Key that keeps one OPEN record per (owner, target); closed ones get their own id. */
export const OPEN_KEY = "open";
