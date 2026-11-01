import type { HelpTopic, TopicId } from "../types";

/** The ten help topics shown in "Browse Help Topics" (same ids as the API's support categories). */
export const HELP_TOPICS: HelpTopic[] = [
  { id: "account", title: "Account & Login", description: "Password, account recovery, and security." },
  { id: "marketplace", title: "Shop & Business", description: "Fockis Shop stores, businesses, and advertising." },
  { id: "profile", title: "Profile & Feed", description: "Posts, comments, privacy, and followers." },
  { id: "messages", title: "Messages", description: "Chat, notifications, and blocked users." },
  { id: "waves", title: "Waves & Live", description: "Upload videos, live streaming, and gifts." },
  { id: "technical", title: "Technical Issues", description: "Errors, bugs, and loading problems." },
  { id: "shop", title: "Fockis Shop", description: "Orders, returns, refunds, and sellers." },
  { id: "privacy", title: "Privacy & Security", description: "Data privacy, hacked accounts, and reporting." },
  { id: "payments", title: "Payments & Subscriptions", description: "Billing, Stripe, and account upgrades." },
  { id: "organizations", title: "Fockis Organizations", description: "Churches, groups, events, and member support." },
];

export const topicById = (id: string | undefined) => HELP_TOPICS.find((topic) => topic.id === id);

export const CATEGORY_LABELS: Record<TopicId | "other", string> = {
  ...(Object.fromEntries(HELP_TOPICS.map((t) => [t.id, t.title])) as Record<TopicId, string>),
  other: "Something else",
};
