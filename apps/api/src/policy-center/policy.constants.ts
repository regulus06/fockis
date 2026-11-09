/* Fockis Policy, Privacy & Safety + Policy & Compliance — shared constants. */

export const POLICY_CATEGORIES = [
  "legal",
  "privacy",
  "community",
  "compliance",
  "moderation",
  "payments",
  "fockis_shop",
  "security",
  "copyright",
  "data_retention",
] as const;
export type PolicyCategory = (typeof POLICY_CATEGORIES)[number];

/** Lifecycle of a policy version: Draft → Review → Approve → Schedule → Publish. */
export const VERSION_STATUSES = ["draft", "pending_review", "approved", "scheduled", "published", "superseded", "rejected", "archived"] as const;
export type VersionStatus = (typeof VERSION_STATUSES)[number];

/** Status shown for a policy as a whole. */
export const POLICY_STATUSES = ["draft", "pending_review", "approved", "scheduled", "published", "archived", "rejected"] as const;
export type PolicyStatus = (typeof POLICY_STATUSES)[number];

/** Versions an admin is still working on (at most one per policy). */
export const OPEN_VERSION_STATUSES: VersionStatus[] = ["draft", "pending_review", "approved", "scheduled", "rejected"];

export const POLICY_AUDIENCES = ["everyone", "users", "sellers", "advertisers", "organizations"] as const;

export const RULE_MODULES = ["community", "moderation", "accounts", "reporting", "fockis_shop", "payments", "security", "messaging", "other"] as const;
export const RULE_STATUSES = ["draft", "pending_review", "approved", "published", "archived", "rejected"] as const;
export const ENFORCEMENT_MODES = ["informational", "manual_review", "automated_existing"] as const;

/* ---------------- privacy & consent ---------------- */

export const MESSAGE_PERMISSIONS = ["everyone", "friends", "following", "nobody"] as const;
export const COMMENT_PERMISSIONS = ["everyone", "friends", "followers", "nobody"] as const;
export type MessagePermission = (typeof MESSAGE_PERMISSIONS)[number];
export type CommentPermission = (typeof COMMENT_PERMISSIONS)[number];

/** Optional consents. Essential processing is not a consent and is never stored here. */
export const OPTIONAL_CONSENTS = [
  "analytics_cookies",
  "personalization_cookies",
  "advertising_cookies",
  "marketing_emails",
  "product_announcements",
  "promotional_notifications",
  "personalized_recommendations",
  "optional_analytics",
] as const;
export type OptionalConsent = (typeof OPTIONAL_CONSENTS)[number];

/** Bump when the consent wording shown to users changes. */
export const CONSENT_VERSION = "2026-11-01";

/* ---------------- data requests ---------------- */

export const DATA_REQUEST_TYPES = ["export", "correction"] as const;
export const DATA_REQUEST_STATUSES = ["pending", "processing", "completed", "rejected", "expired"] as const;
export const EXPORT_LINK_DAYS = 7;
export const MAX_OPEN_DATA_REQUESTS = 3;
export const CORRECTION_FIELDS = ["name", "username", "email", "phone", "birth_date", "location", "content", "other"] as const;

/** Activity shown on the user's Policy Center. */
export const USER_ACTIVITY_TYPES = [
  "privacy_updated",
  "policy_accepted",
  "data_export_requested",
  "data_export_ready",
  "correction_requested",
  "consent_changed",
  "appeal_submitted",
  "security_check",
  "account_muted",
] as const;

export const POLICY_NOTIFICATION_TYPE = "POLICY";
export const PAGE_SIZE = 20;
/** Legacy registration consent version (web/src/pages/Register.tsx). */
export const LEGACY_REGISTRATION_VERSION = "2026-10-17";
