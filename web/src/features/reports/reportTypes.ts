/* Shared types for user-facing reporting and moderation. */

export type ReportTargetType = "post" | "account";

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "violence"
  | "nudity"
  | "scam"
  | "misinformation"
  | "intellectual_property"
  | "self_harm"
  | "impersonation"
  | "inappropriate_behavior"
  | "underage"
  | "other";

export interface ReasonOption {
  value: ReportReason;
  label: string;
  hint: string;
}

/* Kept in step with REASONS_BY_TARGET in apps/api/src/reports/reports.constants.ts. */
export const POST_REASONS: ReasonOption[] = [
  { value: "spam", label: "Spam or misleading content", hint: "Repetitive, deceptive or unwanted promotion" },
  { value: "harassment", label: "Harassment or bullying", hint: "Targeting, insulting or intimidating someone" },
  { value: "hate_speech", label: "Hate speech", hint: "Attacks people for who they are" },
  { value: "violence", label: "Violence or threats", hint: "Threatens or encourages harm" },
  { value: "nudity", label: "Nudity or sexual content", hint: "Sexual or explicit material" },
  { value: "scam", label: "Scam or fraud", hint: "Tries to trick people out of money or data" },
  { value: "misinformation", label: "False or misleading information", hint: "Could mislead people in a harmful way" },
  { value: "intellectual_property", label: "Intellectual property or copyright violation", hint: "Uses someone else's work without permission" },
  { value: "self_harm", label: "Self-harm or dangerous content", hint: "Promotes self-harm or dangerous acts" },
  { value: "other", label: "Other", hint: "Something else — tell us what's wrong" },
];

export const ACCOUNT_REASONS: ReasonOption[] = [
  { value: "impersonation", label: "Fake account or impersonation", hint: "Pretends to be someone else" },
  { value: "harassment", label: "Harassment or bullying", hint: "Targets or intimidates people" },
  { value: "hate_speech", label: "Hate speech", hint: "Attacks people for who they are" },
  { value: "violence", label: "Violence or threats", hint: "Threatens or encourages harm" },
  { value: "scam", label: "Scam or fraud", hint: "Tries to trick people out of money or data" },
  { value: "spam", label: "Spam", hint: "Posts or messages unwanted content" },
  { value: "inappropriate_behavior", label: "Inappropriate behavior", hint: "Breaks the Community Guidelines in another way" },
  { value: "underage", label: "Suspected underage account", hint: "May belong to someone under the minimum age" },
  { value: "other", label: "Other", hint: "Something else — tell us what's wrong" },
];

export const DESCRIPTION_MAX = 1000;

export interface ReportSubmitResult {
  success: boolean;
  reportId: string;
  message: string;
}

export interface MyReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  reasonLabel: string;
  status: "received" | "reviewed";
  targetLabel: string;
  createdAt: string;
}

export type ModerationConsequence =
  | "remove_post"
  | "warn"
  | "restrict_posting"
  | "suspend_temporary"
  | "suspend_permanent";

export type AppealStatus = "none" | "pending" | "upheld" | "overturned";

export interface ModerationDecision {
  caseId: string;
  targetType: ReportTargetType;
  rule: string;
  ruleLabel: string;
  consequences: ModerationConsequence[];
  restrictionUntil: string | null;
  message: string;
  decidedAt: string | null;
  reversed: boolean;
  reversedAt: string | null;
  contentPreview: string;
  appeal: {
    status: AppealStatus;
    message: string;
    submittedAt: string | null;
    reviewedAt: string | null;
    outcomeNote: string | null;
  };
  canAppeal: boolean;
}

export const CONSEQUENCE_LABELS: Record<ModerationConsequence, string> = {
  remove_post: "Post removed",
  warn: "Warning",
  restrict_posting: "Posting restricted",
  suspend_temporary: "Temporary suspension",
  suspend_permanent: "Account suspended",
};
