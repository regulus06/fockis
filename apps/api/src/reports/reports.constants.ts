/* ============================================================================
   REPORTS & MODERATION — CONSTANTS
   apps/api/src/reports/reports.constants.ts

   Lower-case string values, matching the existing message_reports and
   admin conventions in this codebase.
============================================================================ */

export enum ReportTargetType {
  POST = "post",
  ACCOUNT = "account",
}

export enum ReportReason {
  SPAM = "spam",
  HARASSMENT = "harassment",
  HATE_SPEECH = "hate_speech",
  VIOLENCE = "violence",
  NUDITY = "nudity",
  SCAM = "scam",
  MISINFORMATION = "misinformation",
  INTELLECTUAL_PROPERTY = "intellectual_property",
  SELF_HARM = "self_harm",
  IMPERSONATION = "impersonation",
  INAPPROPRIATE_BEHAVIOR = "inappropriate_behavior",
  UNDERAGE = "underage",
  OTHER = "other",
}

/** Which reasons a reporter may pick for each target type. */
export const REASONS_BY_TARGET: Record<ReportTargetType, ReportReason[]> = {
  [ReportTargetType.POST]: [
    ReportReason.SPAM,
    ReportReason.HARASSMENT,
    ReportReason.HATE_SPEECH,
    ReportReason.VIOLENCE,
    ReportReason.NUDITY,
    ReportReason.SCAM,
    ReportReason.MISINFORMATION,
    ReportReason.INTELLECTUAL_PROPERTY,
    ReportReason.SELF_HARM,
    ReportReason.OTHER,
  ],
  [ReportTargetType.ACCOUNT]: [
    ReportReason.IMPERSONATION,
    ReportReason.HARASSMENT,
    ReportReason.HATE_SPEECH,
    ReportReason.VIOLENCE,
    ReportReason.SCAM,
    ReportReason.SPAM,
    ReportReason.INAPPROPRIATE_BEHAVIOR,
    ReportReason.UNDERAGE,
    ReportReason.OTHER,
  ],
};

/** Human labels, also used as the "rule" in user-facing decisions. */
export const REASON_LABELS: Record<ReportReason, string> = {
  [ReportReason.SPAM]: "Spam or misleading content",
  [ReportReason.HARASSMENT]: "Harassment or bullying",
  [ReportReason.HATE_SPEECH]: "Hate speech",
  [ReportReason.VIOLENCE]: "Violence or threats",
  [ReportReason.NUDITY]: "Nudity or sexual content",
  [ReportReason.SCAM]: "Scam or fraud",
  [ReportReason.MISINFORMATION]: "False or misleading information",
  [ReportReason.INTELLECTUAL_PROPERTY]: "Intellectual property or copyright violation",
  [ReportReason.SELF_HARM]: "Self-harm or dangerous content",
  [ReportReason.IMPERSONATION]: "Fake account or impersonation",
  [ReportReason.INAPPROPRIATE_BEHAVIOR]: "Inappropriate behavior",
  [ReportReason.UNDERAGE]: "Suspected underage account",
  [ReportReason.OTHER]: "Other",
};

export enum CaseStatus {
  PENDING = "pending",
  UNDER_REVIEW = "under_review",
  ACTION_REQUIRED = "action_required",
  ESCALATED = "escalated",
  RESOLVED = "resolved",
  DISMISSED = "dismissed",
}

export const OPEN_CASE_STATUSES: CaseStatus[] = [
  CaseStatus.PENDING,
  CaseStatus.UNDER_REVIEW,
  CaseStatus.ACTION_REQUIRED,
  CaseStatus.ESCALATED,
];

export enum CasePriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent",
}

export const PRIORITY_RANK: Record<CasePriority, number> = {
  [CasePriority.LOW]: 0,
  [CasePriority.NORMAL]: 1,
  [CasePriority.HIGH]: 2,
  [CasePriority.URGENT]: 3,
};

/**
 * Alert levels a case passes through. Each level notifies moderators once.
 * "new" = first report on a target.
 */
export enum AlertLevel {
  NONE = "none",
  NEW = "new",
  REVIEW = "review",
  HIGH = "high",
  URGENT = "urgent",
}

export const ALERT_RANK: Record<AlertLevel, number> = {
  [AlertLevel.NONE]: 0,
  [AlertLevel.NEW]: 1,
  [AlertLevel.REVIEW]: 2,
  [AlertLevel.HIGH]: 3,
  [AlertLevel.URGENT]: 4,
};

/** Consequences a moderator can apply after confirming a violation. */
export enum ModerationConsequence {
  REMOVE_POST = "remove_post",
  WARN = "warn",
  RESTRICT_POSTING = "restrict_posting",
  SUSPEND_TEMPORARY = "suspend_temporary",
  SUSPEND_PERMANENT = "suspend_permanent",
}

export enum CaseAction {
  START_REVIEW = "start_review",
  REQUEST_REVIEW = "request_review",
  ESCALATE = "escalate",
  DISMISS = "dismiss",
  CONFIRM_VIOLATION = "confirm_violation",
  RESTORE = "restore",
}

export enum AppealStatus {
  NONE = "none",
  PENDING = "pending",
  UPHELD = "upheld",
  OVERTURNED = "overturned",
}

export enum RestrictionType {
  POSTING = "posting",
  SUSPENSION = "suspension",
}

/** Notification type used for every moderation notification. */
export const MODERATION_NOTIFICATION_TYPE = "MODERATION";

export const DESCRIPTION_MAX = 1000;
export const NOTE_MAX = 2000;
export const APPEAL_MAX = 2000;
