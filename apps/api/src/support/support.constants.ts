/* Shared values for Fockis Help & Support. */

/** Help topics a request can be filed under (kept in step with web/src/features/support/data/helpTopics.ts). */
export const SUPPORT_CATEGORIES = [
  "account",
  "marketplace",
  "profile",
  "messages",
  "waves",
  "technical",
  "shop",
  "privacy",
  "payments",
  "organizations",
  "other",
] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

/** question = Contact Support, problem = Report a Problem, chat = Live Chat. */
export const SUPPORT_KINDS = ["question", "problem", "chat"] as const;
export type SupportKind = (typeof SUPPORT_KINDS)[number];

export const SUPPORT_STATUSES = ["open", "in_progress", "awaiting_user", "escalated", "resolved", "closed"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

/** Statuses that still need someone to act. */
export const ACTIVE_STATUSES: SupportStatus[] = ["open", "in_progress", "awaiting_user", "escalated"];

export const SUPPORT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

/* ---------------- feedback ---------------- */

export const FEEDBACK_CATEGORIES = ["general", "feature_request", "bug_report", "design", "performance", "other"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_STATUSES = ["new", "under_review", "planned", "implemented", "rejected"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const OPEN_FEEDBACK_STATUSES: FeedbackStatus[] = ["new", "under_review", "planned"];

/* ---------------- help articles ---------------- */

export const HELP_TOPICS = SUPPORT_CATEGORIES.filter((c) => c !== "other");
export const ARTICLE_KINDS = ["article", "faq"] as const;
export type ArticleKind = (typeof ARTICLE_KINDS)[number];
export const ARTICLE_STATUSES = ["draft", "published", "archived"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

/* ---------------- limits ---------------- */

export const SUPPORT_NOTIFICATION_TYPE = "SUPPORT";

export const SUBJECT_MAX = 150;
export const MESSAGE_MAX = 5000;
export const NOTE_MAX = 2000;
/** Stops one account from flooding the support queue. */
export const MAX_ACTIVE_TICKETS_PER_USER = 10;
export const MAX_OPEN_FEEDBACK_PER_USER = 20;
export const MAX_MESSAGES_PER_TICKET = 200;
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;
/** A closed or resolved request can be reopened by its owner for this long. */
export const REOPEN_WINDOW_DAYS = 30;

/** Files users and staff may attach (images, short videos, PDFs, text logs). */
export const ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
export const ATTACHMENT_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
};
export const HELP_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
export const HELP_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
