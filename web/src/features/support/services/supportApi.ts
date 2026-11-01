import api from "../../../api/api";

import type {
  CreateFeedbackInput,
  CreateTicketInput,
  Feedback,
  HelpContentItem,
  Paged,
  SupportAttachment,
  SupportOverview,
  SupportTicket,
  SupportTicketSummary,
  SystemStatus,
} from "../types";

/**
 * HELP & SUPPORT API (apps/api/src/support)
 *
 * GET  /support/status                 live API + database check (public)
 * GET  /support/help/articles          published Help Center articles and FAQs (public)
 * GET  /support/overview               live-chat availability + my unread counts
 * POST /support/attachments            upload a screenshot / video / PDF (multipart "file")
 * POST /support/tickets                Contact Support / Report a Problem / Live Chat
 * GET  /support/tickets?filter=        my tickets
 * GET  /support/tickets/:id            one of my tickets (marks staff replies read)
 * GET  /support/tickets/:id/file?key=  15-minute link to an attachment on my ticket
 * POST /support/tickets/:id/messages   reply
 * POST /support/tickets/:id/reopen     reopen within 30 days
 * POST /support/tickets/:id/close      close
 * GET  /support/chat                   my open live-chat conversation
 * POST /support/feedback               send feedback
 * GET  /support/feedback               my feedback
 * GET  /support/feedback/:id           one item with staff responses
 * GET  /support/feedback/:id/file?key= 15-minute link to an attachment
 *
 * The owner is always the signed-in user from the auth token.
 */
export const supportApi = {
  status: async () => (await api.get<SystemStatus>("/support/status")).data,

  helpContent: async () => (await api.get<{ items: HelpContentItem[] }>("/support/help/articles")).data.items,

  overview: async () => (await api.get<SupportOverview>("/support/overview")).data,

  upload: async (file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<SupportAttachment>("/support/attachments", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return data;
  },

  createTicket: async (input: CreateTicketInput) => (await api.post<SupportTicket>("/support/tickets", input)).data,

  myTickets: async (filter: "active" | "closed" | "all" = "all", page = 1) =>
    (await api.get<Paged<SupportTicketSummary>>("/support/tickets", { params: { filter, page } })).data,

  ticket: async (id: string) => (await api.get<SupportTicket>(`/support/tickets/${encodeURIComponent(id)}`)).data,

  ticketFile: async (id: string, key: string) =>
    (await api.get<{ url: string; name: string }>(`/support/tickets/${encodeURIComponent(id)}/file`, { params: { key } })).data,

  reply: async (id: string, body: string, attachments: SupportAttachment[] = []) =>
    (await api.post<SupportTicket>(`/support/tickets/${encodeURIComponent(id)}/messages`, { body, attachments })).data,

  reopen: async (id: string) => (await api.post<SupportTicket>(`/support/tickets/${encodeURIComponent(id)}/reopen`)).data,

  close: async (id: string) => (await api.post<SupportTicket>(`/support/tickets/${encodeURIComponent(id)}/close`)).data,

  activeChat: async () => (await api.get<{ chat: SupportTicket | null }>("/support/chat")).data.chat,

  sendFeedback: async (input: CreateFeedbackInput) => (await api.post<Feedback>("/support/feedback", input)).data,

  myFeedback: async (page = 1) => (await api.get<Paged<Feedback>>("/support/feedback", { params: { page } })).data,

  feedback: async (id: string) => (await api.get<Feedback>(`/support/feedback/${encodeURIComponent(id)}`)).data,

  feedbackFile: async (id: string, key: string) =>
    (await api.get<{ url: string; name: string }>(`/support/feedback/${encodeURIComponent(id)}/file`, { params: { key } })).data,
};

/** Turns an API error into a sentence that is safe to show. */
export function supportErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const response = (error as { response?: { status?: number; data?: { message?: unknown } } })?.response;
  if (!response) return "You appear to be offline. Check your connection and try again.";
  if (response.status === 401) return "Please sign in to continue.";
  if (response.status === 413) return "That file is too large. Files can be up to 25 MB.";
  if (response.status === 429) return "You're sending requests too quickly. Please wait a moment and try again.";
  const message = response.data?.message;
  const text = Array.isArray(message) ? String(message[0] ?? "") : typeof message === "string" ? message : "";
  return text || fallback;
}

export function isUnauthorized(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 401;
}

/** Short browser + device summary attached to problem reports (no personal data). */
export function describeDevice(): string {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent;
  const browser =
    /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  const size = typeof window !== "undefined" ? `${window.innerWidth}×${window.innerHeight}` : "";
  return [browser, os, size].filter(Boolean).join(" · ").slice(0, 300);
}

export const ATTACHMENT_ACCEPT =
  "image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/quicktime,application/pdf,text/plain";
export const ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

export function checkAttachment(file: File): string | null {
  if (!ATTACHMENT_ACCEPT.split(",").includes(file.type)) return "Attach an image, a video (MP4, WebM, MOV), a PDF or a text file.";
  if (file.size > ATTACHMENT_MAX_BYTES) return "Files can be up to 25 MB.";
  return null;
}
