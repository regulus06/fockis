/* Types for Fockis Help & Support (kept in step with apps/api/src/support). */

export type SupportCategory =
  | "account"
  | "marketplace"
  | "profile"
  | "messages"
  | "waves"
  | "technical"
  | "shop"
  | "privacy"
  | "payments"
  | "organizations"
  | "other";

/** question = Contact Support, problem = Report a Problem, chat = Live Chat. */
export type SupportKind = "question" | "problem" | "chat";

export type SupportStatus = "open" | "in_progress" | "awaiting_user" | "escalated" | "resolved" | "closed";

export type SupportPriority = "low" | "normal" | "high" | "urgent";

export interface SupportAttachment {
  key: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface SupportTicketSummary {
  id: string;
  number: string;
  kind: SupportKind;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  priority: SupportPriority;
  createdAt: string;
  lastMessageAt: string;
  unread: boolean;
  messageCount: number;
  lastMessage: { author: "user" | "agent"; preview: string } | null;
}

export interface SupportMessage {
  id: string;
  author: "user" | "agent";
  body: string;
  attachments: SupportAttachment[];
  createdAt: string;
}

export interface SupportTicket extends SupportTicketSummary {
  pageUrl: string;
  affectedFeature: string;
  deviceInfo: string;
  resolvedAt: string | null;
  closedAt: string | null;
  canReopen: boolean;
  messages: SupportMessage[];
}

export interface CreateTicketInput {
  kind: SupportKind;
  category: SupportCategory;
  subject: string;
  message: string;
  pageUrl?: string;
  affectedFeature?: string;
  deviceInfo?: string;
  attachments?: SupportAttachment[];
}

export interface SupportOverview {
  liveChatOnline: boolean;
  activeTickets: number;
  unreadTickets: number;
  unreadFeedback: number;
}

/* ---------------- feedback ---------------- */

export type FeedbackCategory = "general" | "feature_request" | "bug_report" | "design" | "performance" | "other";
export type FeedbackStatus = "new" | "under_review" | "planned" | "implemented" | "rejected";

export interface Feedback {
  id: string;
  number: string;
  category: FeedbackCategory;
  subject: string;
  description: string;
  attachments: SupportAttachment[];
  status: FeedbackStatus;
  statusHistory: { status: FeedbackStatus; at: string }[];
  responses: { id: string; body: string; createdAt: string }[];
  unread: boolean;
  createdAt: string;
  updatedAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
}

export interface CreateFeedbackInput {
  category: FeedbackCategory;
  subject: string;
  description: string;
  attachments?: SupportAttachment[];
}

export type HealthState = "operational" | "degraded" | "outage";

export interface SystemStatus {
  status: HealthState;
  checkedAt: string;
  components: { id: string; name: string; status: HealthState; latencyMs: number | null }[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  hasMore: boolean;
}

/* ---------------- editorial help content ---------------- */

export type TopicId = Exclude<SupportCategory, "other">;

export interface HelpTopic {
  id: TopicId;
  title: string;
  description: string;
}

/** Help Center item from GET /support/help/articles (kind article = guide, faq = question). */
export interface HelpContentItem {
  id: string;
  slug: string;
  kind: "article" | "faq";
  topic: TopicId;
  title: string;
  summary: string;
  body: { heading: string; text: string; steps: string[]; imageUrl: string }[];
  links: { label: string; to: string }[];
  keywords: string[];
  featured: boolean;
  order: number;
  updatedAt: string;
  publishedAt: string | null;
}

export interface HelpArticle {
  id: string;
  topic: TopicId;
  title: string;
  summary: string;
  body: { heading?: string; text?: string; steps?: string[]; imageUrl?: string }[];
  links?: { label: string; to: string }[];
  keywords?: string[];
  featured?: boolean;
}

export interface FaqItem {
  id: string;
  topic: TopicId;
  question: string;
  answer: string;
  link?: { label: string; to: string };
}
