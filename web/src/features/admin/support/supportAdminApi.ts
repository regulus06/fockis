import { api } from "../../../api/api";

import type {
  Feedback,
  FeedbackCategory,
  FeedbackStatus,
  Paged,
  SupportAttachment,
  SupportKind,
  SupportPriority,
  SupportStatus,
  SupportTicket,
  SupportTicketSummary,
} from "../../support/types";

/* ============================================================================
   TYPES (staff views)
============================================================================ */

export interface StaffPerson {
  id: string;
  username: string;
  name: string;
  avatar: string;
}

export interface AgentTicketSummary extends SupportTicketSummary {
  user: StaffPerson;
  assignedTo: StaffPerson | null;
  firstResponseAt: string | null;
}

export interface AgentTicket extends Omit<SupportTicket, "messages">, Omit<AgentTicketSummary, keyof SupportTicketSummary> {
  messages: (SupportTicket["messages"][number] & { authorName?: string })[];
  notes: { id: string; body: string; createdAt: string; author: StaffPerson | null }[];
  userEmail: string;
  userSince: string | null;
}

export interface AgentFeedback extends Feedback {
  archived: boolean;
  user: StaffPerson;
  assignedTo: StaffPerson | null;
  notes: { id: string; body: string; createdAt: string; author: StaffPerson | null }[];
  responses: (Feedback["responses"][number] & { author?: StaffPerson | null })[];
}

export interface SupportDashboard {
  newFeedback: number;
  openFeedback: number;
  openTickets: number;
  reportedPosts: number;
  hiddenPosts: number;
  resolved: number;
  highPriority: number;
  unreadTickets: number;
  liveChats: number;
  liveChatOnline: boolean;
  avgFirstResponseMinutes: number | null;
}

export interface RecentItem {
  type: "report" | "ticket" | "feedback";
  id: string;
  subject: string;
  reference: string;
  user: StaffPerson | null;
  status: string;
  priority: string | null;
  at: string | null;
  link: string;
}

export interface ModeratedPost {
  id: string;
  type: string;
  content: string;
  media: string[];
  audience: string;
  createdAt: string | null;
  author: StaffPerson;
  status: "visible" | "hidden";
  hiddenAt: string | null;
  hiddenBy: StaffPerson | null;
  hiddenThroughCase: string | null;
  reason: string | null;
  escalatedAt: string | null;
  reports: number;
  openCaseId: string | null;
  topReason: string | null;
  history?: ModerationEvent[];
}

export interface ModerationEvent {
  id: string;
  seq: number;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  previousState: string | null;
  newState: string | null;
  metadata: Record<string, unknown>;
  at: string;
  actor: StaffPerson;
}

export interface AdminArticle {
  id: string;
  slug: string;
  kind: "article" | "faq";
  topic: string;
  title: string;
  summary: string;
  body: { heading: string; text: string; steps: string[]; imageUrl: string }[];
  links: { label: string; to: string }[];
  keywords: string[];
  featured: boolean;
  order: number;
  status: "draft" | "published" | "archived";
  updatedAt: string;
  publishedAt: string | null;
  createdAt: string;
}

export type ArticleInput = Pick<AdminArticle, "slug" | "kind" | "topic" | "title" | "summary" | "body" | "links" | "keywords" | "featured" | "order">;

const clean = (filters: object) =>
  Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== "" && value !== null));

const enc = encodeURIComponent;

/* ============================================================================
   API — every endpoint is permission-checked by the backend
============================================================================ */

export const supportAdminApi = {
  /* dashboard */
  dashboard: async () => (await api.get<SupportDashboard>("/admin/support/dashboard")).data,
  recent: async () => (await api.get<{ items: RecentItem[] }>("/admin/support/recent")).data.items,
  staff: async () => (await api.get<{ items: StaffPerson[] }>("/admin/support/staff")).data.items,

  upload: async (file: File, onProgress?: (p: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<SupportAttachment>("/admin/support/attachments", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => onProgress && e.total && onProgress(Math.round((e.loaded / e.total) * 100)),
    });
    return data;
  },

  /* tickets & chats */
  tickets: async (filters: { status?: SupportStatus | "active" | "all"; kind?: SupportKind | ""; priority?: SupportPriority | ""; assigned?: "me" | "unassigned" | ""; search?: string; page?: number }) =>
    (await api.get<Paged<AgentTicketSummary>>("/admin/support/tickets", { params: { limit: 20, ...clean(filters) } })).data,
  ticket: async (id: string) => (await api.get<AgentTicket>(`/admin/support/tickets/${enc(id)}`)).data,
  ticketFile: async (id: string, key: string) => (await api.get<{ url: string }>(`/admin/support/tickets/${enc(id)}/file`, { params: { key } })).data,
  reply: async (id: string, body: string, attachments: SupportAttachment[], status?: SupportStatus) =>
    (await api.post<AgentTicket>(`/admin/support/tickets/${enc(id)}/messages`, { body, attachments, ...(status ? { status } : {}) })).data,
  ticketNote: async (id: string, body: string) => (await api.post<AgentTicket>(`/admin/support/tickets/${enc(id)}/notes`, { body })).data,
  setStatus: async (id: string, status: SupportStatus) => (await api.patch<AgentTicket>(`/admin/support/tickets/${enc(id)}/status`, { status })).data,
  setPriority: async (id: string, priority: SupportPriority) => (await api.patch<AgentTicket>(`/admin/support/tickets/${enc(id)}/priority`, { priority })).data,
  assign: async (id: string, assigneeId: string | null) => (await api.patch<AgentTicket>(`/admin/support/tickets/${enc(id)}/assign`, { assigneeId })).data,
  escalate: async (id: string, reason: string) => (await api.post<AgentTicket>(`/admin/support/tickets/${enc(id)}/escalate`, { body: reason })).data,
  settings: async () => (await api.get<{ liveChatOnline: boolean; updatedAt: string | null }>("/admin/support/settings")).data,
  setLiveChat: async (liveChatOnline: boolean) =>
    (await api.patch<{ liveChatOnline: boolean; updatedAt: string | null }>("/admin/support/settings", { liveChatOnline })).data,

  /* feedback */
  feedbackList: async (filters: { status?: FeedbackStatus | "open" | "all"; category?: FeedbackCategory | ""; archived?: boolean; assigned?: "me" | "unassigned" | ""; search?: string; page?: number }) =>
    (await api.get<Paged<AgentFeedback>>("/admin/support/feedback", { params: clean(filters) })).data,
  feedback: async (id: string) => (await api.get<AgentFeedback>(`/admin/support/feedback/${enc(id)}`)).data,
  feedbackFile: async (id: string, key: string) => (await api.get<{ url: string }>(`/admin/support/feedback/${enc(id)}/file`, { params: { key } })).data,
  feedbackRespond: async (id: string, body: string, status?: FeedbackStatus) =>
    (await api.post<AgentFeedback>(`/admin/support/feedback/${enc(id)}/responses`, { body, ...(status ? { status } : {}) })).data,
  feedbackNote: async (id: string, body: string) => (await api.post<AgentFeedback>(`/admin/support/feedback/${enc(id)}/notes`, { body })).data,
  feedbackStatus: async (id: string, status: FeedbackStatus) => (await api.patch<AgentFeedback>(`/admin/support/feedback/${enc(id)}/status`, { status })).data,
  feedbackAssign: async (id: string, assigneeId: string | null) => (await api.patch<AgentFeedback>(`/admin/support/feedback/${enc(id)}/assign`, { assigneeId })).data,
  feedbackArchive: async (id: string, archived: boolean) => (await api.patch<AgentFeedback>(`/admin/support/feedback/${enc(id)}/archive`, { archived })).data,

  /* help articles */
  articles: async (filters: { status?: string; kind?: string; topic?: string; search?: string }) =>
    (await api.get<{ items: AdminArticle[]; counts: Record<string, number> }>("/admin/support/articles", { params: clean(filters) })).data,
  article: async (id: string) => (await api.get<AdminArticle>(`/admin/support/articles/${enc(id)}`)).data,
  createArticle: async (input: ArticleInput) => (await api.post<AdminArticle>("/admin/support/articles", input)).data,
  updateArticle: async (id: string, input: ArticleInput) => (await api.put<AdminArticle>(`/admin/support/articles/${enc(id)}`, input)).data,
  articleStatus: async (id: string, status: AdminArticle["status"]) => (await api.patch<AdminArticle>(`/admin/support/articles/${enc(id)}/status`, { status })).data,
  deleteArticle: async (id: string) => (await api.delete<{ deleted: boolean }>(`/admin/support/articles/${enc(id)}`)).data,
  articleImage: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return (await api.post<{ url: string }>("/admin/support/articles/images", form, { headers: { "Content-Type": "multipart/form-data" } })).data;
  },

  /* posts & moderation history */
  posts: async (filters: { status?: "visible" | "hidden" | "all"; type?: string; search?: string; escalated?: boolean; page?: number }) =>
    (await api.get<Paged<ModeratedPost>>("/admin/moderation/posts", { params: clean(filters) })).data,
  post: async (id: string) => (await api.get<ModeratedPost>(`/admin/moderation/posts/${enc(id)}`)).data,
  hidePost: async (id: string, reason: string) => (await api.post<ModeratedPost>(`/admin/moderation/posts/${enc(id)}/hide`, { reason })).data,
  restorePost: async (id: string, reason: string) => (await api.post<ModeratedPost>(`/admin/moderation/posts/${enc(id)}/restore`, { reason })).data,
  warnAuthor: async (id: string, reason: string) => (await api.post<ModeratedPost>(`/admin/moderation/posts/${enc(id)}/warn`, { reason })).data,
  escalatePost: async (id: string, reason: string) => (await api.post<ModeratedPost>(`/admin/moderation/posts/${enc(id)}/escalate`, { reason })).data,
  purgePost: async (id: string, reason: string, confirm: string) =>
    (await api.post<{ deleted: boolean }>(`/admin/moderation/posts/${enc(id)}/purge`, { reason, confirm })).data,
  history: async (filters: { action?: string; targetType?: string; targetId?: string; page?: number }) =>
    (await api.get<Paged<ModerationEvent>>("/admin/moderation/history", { params: clean(filters) })).data,
  verifyHistory: async () => (await api.get<{ intact: boolean; checked: number; brokenAt: number | null }>("/admin/moderation/history/verify")).data,
};

/** Turns an API error into a sentence that is safe to show. */
export function adminError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const response = (error as { response?: { status?: number; data?: { message?: unknown } } })?.response;
  const message = response?.data?.message;
  const text = Array.isArray(message) ? String(message[0] ?? "") : typeof message === "string" ? message : "";
  if (response?.status === 403 && !text) return "You don't have permission to do that.";
  if (!response) return "Can't reach the server. Check your connection and try again.";
  return text || fallback;
}
