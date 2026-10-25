/* Types for the admin moderation center (mirrors apps/api/src/reports). */

export type CaseStatus = "pending" | "under_review" | "action_required" | "escalated" | "resolved" | "dismissed";
export type CasePriority = "low" | "normal" | "high" | "urgent";
export type AlertLevel = "none" | "new" | "review" | "high" | "urgent";
export type TargetType = "post" | "account";
export type AppealStatus = "none" | "pending" | "upheld" | "overturned";
export type Consequence = "remove_post" | "warn" | "restrict_posting" | "suspend_temporary" | "suspend_permanent";
export type CaseActionName = "start_review" | "request_review" | "escalate" | "dismiss" | "confirm_violation" | "restore";

export interface StaffPerson {
  id: string;
  username: string;
  name: string;
  avatar: string;
  role: string;
}

export interface CaseSummary {
  id: string;
  targetType: TargetType;
  targetId: string;
  postId: string | null;
  reportedUser: StaffPerson;
  status: CaseStatus;
  priority: CasePriority;
  alertLevel: AlertLevel;
  topReason: string;
  topReasonLabel: string;
  reasonCounts: Record<string, number>;
  eligibleReporterCount: number;
  totalReportCount: number;
  firstReportAt: string | null;
  latestReportAt: string | null;
  assignedTo: StaffPerson | null;
  appealStatus: AppealStatus;
  preview: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CaseList {
  items: CaseSummary[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface CaseReport {
  id: string;
  reporter: StaffPerson | null;
  reason: string;
  reasonLabel: string;
  description: string;
  eligible: boolean;
  createdAt: string;
}

export interface CaseHistoryEntry {
  action: string;
  actorId: string | null;
  actor: StaffPerson | null;
  from?: string;
  to?: string | null;
  reason?: string | null;
  at: string;
}

export interface CaseDecision {
  outcome: "violation" | "no_violation";
  rule: string;
  ruleLabel: string;
  consequences: Consequence[];
  restrictionUntil: string | null;
  userMessage: string;
  reason: string;
  decidedBy: string;
  decidedByUser: StaffPerson | null;
  decidedAt: string;
  reversedAt?: string | null;
  reversalReason?: string | null;
}

export interface CaseDetails extends CaseSummary {
  targetSnapshot: Record<string, unknown>;
  currentTarget: Record<string, unknown> | null;
  alertHistory: Array<{ level: AlertLevel; reason: string; at: string }>;
  reports: CaseReport[];
  notes: Array<{ id: string; body: string; at: string; author: StaffPerson | null }>;
  history: CaseHistoryEntry[];
  decision: CaseDecision | null;
  appeal: { status: AppealStatus; message: string; submittedAt: string; reviewedAt?: string | null; outcomeNote?: string | null } | null;
  resolution: { reason: string; resolvedAt: string } | null;
  previousDecisions: Array<{
    id: string;
    targetType: TargetType;
    status: CaseStatus;
    outcome: string | null;
    ruleLabel: string;
    consequences: Consequence[];
    reversed: boolean;
    decidedAt: string | null;
  }>;
  activeRestrictions: Array<{ type: string; until: string | null; caseId: string | null }>;
}

export interface ModerationStats {
  totalReports: number;
  reportsLast24h: number;
  totalCases: number;
  pending: number;
  underReview: number;
  actionRequired: number;
  escalated: number;
  resolved: number;
  dismissed: number;
  highPriorityOpen: number;
  confirmedViolations: number;
  reversedDecisions: number;
  pendingAppeals: number;
  restrictedAccounts: number;
  recentActivity: Array<{
    caseId: string;
    targetType: TargetType;
    action: string;
    to: string | null;
    reason: string | null;
    at: string;
    actor: StaffPerson | null;
  }>;
}

export interface ModerationSettings {
  reviewThreshold: number;
  highPriorityThreshold: number;
  urgentReasons: string[];
  maxReportsPerDay: number;
  notifyOnNewCase: boolean;
}

export interface CaseFilters {
  status?: string;
  targetType?: string;
  reason?: string;
  priority?: string;
  assignedTo?: string;
  appealStatus?: string;
  minReports?: string;
  from?: string;
  to?: string;
  q?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export const STATUS_LABELS: Record<CaseStatus, string> = {
  pending: "Pending",
  under_review: "Under review",
  action_required: "Action required",
  escalated: "Escalated",
  resolved: "Violation confirmed",
  dismissed: "Dismissed",
};

export const PRIORITY_LABELS: Record<CasePriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const REASON_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "spam", label: "Spam or misleading" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate_speech", label: "Hate speech" },
  { value: "violence", label: "Violence or threats" },
  { value: "nudity", label: "Nudity or sexual content" },
  { value: "scam", label: "Scam or fraud" },
  { value: "misinformation", label: "False information" },
  { value: "intellectual_property", label: "Intellectual property" },
  { value: "self_harm", label: "Self-harm or dangerous" },
  { value: "impersonation", label: "Impersonation" },
  { value: "inappropriate_behavior", label: "Inappropriate behavior" },
  { value: "underage", label: "Suspected underage" },
  { value: "other", label: "Other" },
];

export const CONSEQUENCE_OPTIONS: Array<{ value: Consequence; label: string; description: string; postOnly?: boolean; needsDuration?: boolean }> = [
  { value: "warn", label: "Warn the user", description: "Send a warning with the rule that was broken." },
  { value: "remove_post", label: "Remove the post", description: "Hide the post everywhere. Reversible.", postOnly: true },
  { value: "restrict_posting", label: "Restrict posting", description: "Block new posts for a number of days.", needsDuration: true },
  { value: "suspend_temporary", label: "Temporary suspension", description: "Sign-in blocked for a number of days.", needsDuration: true },
  { value: "suspend_permanent", label: "Permanent suspension", description: "Deactivate the account until restored." },
];

export const ACTION_LABELS: Record<string, string> = {
  alert_raised: "Alert raised",
  auto_escalated: "Escalated automatically",
  assigned: "Assigned",
  unassigned: "Unassigned",
  note_added: "Note added",
  start_review: "Review started",
  request_review: "Marked action required",
  escalate: "Escalated",
  dismissed: "Dismissed",
  violation_confirmed: "Violation confirmed",
  action_failed: "Action failed",
  restored: "Decision reversed",
  report_invalidated: "Report marked invalid",
  report_restored: "Report counted again",
  appeal_submitted: "Appeal submitted",
  appeal_upheld: "Appeal upheld",
  appeal_overturned: "Appeal accepted",
};
