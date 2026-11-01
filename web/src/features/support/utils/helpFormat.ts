import type { FeedbackCategory, FeedbackStatus, SupportKind, SupportPriority, SupportStatus } from "../types";

export const STATUS_LABELS: Record<SupportStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  awaiting_user: "Waiting for you",
  escalated: "Escalated",
  resolved: "Resolved",
  closed: "Closed",
};

export const STATUS_TONES: Record<SupportStatus, "blue" | "purple" | "amber" | "green" | "gray" | "red"> = {
  open: "blue",
  in_progress: "purple",
  awaiting_user: "amber",
  escalated: "red",
  resolved: "green",
  closed: "gray",
};

export const PRIORITY_LABELS: Record<SupportPriority, string> = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };
export const PRIORITY_TONES: Record<SupportPriority, "gray" | "blue" | "amber" | "red"> = { low: "gray", normal: "blue", high: "amber", urgent: "red" };

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  general: "General feedback",
  feature_request: "Feature request",
  bug_report: "Bug report",
  design: "Design suggestion",
  performance: "Performance",
  other: "Other suggestion",
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "New",
  under_review: "Under Review",
  planned: "Planned",
  implemented: "Implemented",
  rejected: "Not planned",
};

export const FEEDBACK_STATUS_TONES: Record<FeedbackStatus, "blue" | "amber" | "purple" | "green" | "gray"> = {
  new: "blue",
  under_review: "amber",
  planned: "purple",
  implemented: "green",
  rejected: "gray",
};

export const KIND_LABELS: Record<SupportKind, string> = {
  question: "Contact Support",
  problem: "Problem report",
  chat: "Live chat",
};

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "";
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDateTime(iso);
}
