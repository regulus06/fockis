/* Fockis Legal & Evidence Management — shared constants. */

export const LEGAL_NOTIFICATION_TYPE = "LEGAL";

/** Record types that can be preserved and that retention rules apply to. */
export const EVIDENCE_RECORD_TYPES = ["post", "comment", "account", "report_case", "moderation_event", "support_ticket", "other"] as const;
export type EvidenceRecordType = (typeof EVIDENCE_RECORD_TYPES)[number];

export const HOLD_STATUSES = ["active", "released"] as const;
export type HoldStatus = (typeof HOLD_STATUSES)[number];

export const HOLD_BASES = ["preservation_request", "court_order", "subpoena", "law_enforcement", "fraud_investigation", "safety_investigation", "litigation", "other"] as const;
export type HoldBasis = (typeof HOLD_BASES)[number];

export const REQUEST_TYPES = ["preservation", "subpoena", "court_order", "search_warrant", "law_enforcement", "emergency", "civil", "other"] as const;
export const VERIFICATION_STATUSES = ["pending", "verified", "rejected"] as const;
export const APPROVAL_STATUSES = ["pending", "approved", "partially_approved", "denied"] as const;
export const PRESERVATION_STATUSES = ["not_requested", "pending", "preserved"] as const;
export const COMPLETION_STATUSES = ["open", "in_progress", "completed", "closed"] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export type PreservationStatus = (typeof PRESERVATION_STATUSES)[number];
export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];

export const DELETION_STATUSES = ["requested", "processing", "completed", "completed_with_hold", "failed"] as const;
export type DeletionStatus = (typeof DELETION_STATUSES)[number];

/**
 * Retention categories. "automated" ones are applied by the retention job;
 * the others are recorded configuration that the job flags for manual
 * review (Fockis can't enumerate those records generically yet).
 * No retention period is pre-filled: periods depend on jurisdiction and
 * must be set by qualified legal/compliance staff. Until a period is set,
 * nothing in that category is deleted automatically.
 */
export const RETENTION_CATEGORIES = [
  { recordType: "deleted_account_record", label: "Account deletion records", automated: true, action: "anonymize", description: "Minimal deletion register (DA-…). After the period only the date and outcome remain; the internal account ID is removed." },
  { recordType: "policy_acceptance", label: "Policy acceptance records", automated: true, action: "delete", description: "Acceptance records of deleted accounts are removed after the period." },
  { recordType: "evidence_record", label: "Preserved evidence (not under hold)", automated: true, action: "delete", description: "Preserved snapshots are deleted once no active legal hold covers them." },
  { recordType: "evidence_export", label: "Evidence export packages", automated: true, action: "delete", description: "Generated packages are removed from storage; the export log entry stays." },
  { recordType: "legal_request_closed", label: "Closed legal requests", automated: true, action: "anonymize", description: "Requester contact details and notes are cleared; the reference and decision stay." },
  { recordType: "financial_records", label: "Financial and transaction records", automated: false, action: "delete", description: "Orders, payments and payouts kept for tax and accounting." },
  { recordType: "refunds_chargebacks", label: "Refunds and chargebacks", automated: false, action: "delete", description: "Refund and dispute records." },
  { recordType: "security_logs", label: "Security and access logs", automated: false, action: "delete", description: "Sign-in, session and access logs." },
  { recordType: "fraud_investigation", label: "Fraud investigation records", automated: false, action: "delete", description: "Fraud-prevention evidence and investigation notes." },
  { recordType: "user_content", label: "User-generated content", automated: false, action: "delete", description: "Content of deleted accounts is removed during account deletion; held content follows its legal hold." },
  { recordType: "legal_holds", label: "Legal holds", automated: false, action: "delete", description: "Held records are kept until the hold is released, then follow their own category." },
  { recordType: "backup_expiration", label: "Backup expiration", automated: false, action: "delete", description: "How long backup copies exist before they expire. Restores must re-apply deletion tombstones." },
] as const;

export const RETENTION_RECORD_TYPES = RETENTION_CATEGORIES.map((c) => c.recordType) as unknown as readonly string[];
export type RetentionRecordType = (typeof RETENTION_CATEGORIES)[number]["recordType"];
export const AUTOMATED_RETENTION_TYPES = RETENTION_CATEGORIES.filter((c) => c.automated).map((c) => c.recordType as string);
export const RETENTION_STATUSES = ["needs_configuration", "active", "paused", "under_review"] as const;

/** Storage prefixes that hold restricted files. The public media gateway refuses them. */
export const PRIVATE_STORAGE_PREFIXES = ["evidence/", "legal/", "support/", "privacy/"];

export const LEGAL_DOC_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "text/plain": ".txt",
};
export const LEGAL_DOC_MAX_BYTES = 20 * 1024 * 1024;

/** Media larger than this is copied but not hashed in-process. */
export const HASH_MAX_BYTES = 200 * 1024 * 1024;

export const PAGE_SIZE = 25;
