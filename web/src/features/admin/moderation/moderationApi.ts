import { api } from "../../../api/api";

import type {
  CaseActionName,
  CaseDetails,
  CaseFilters,
  CaseList,
  Consequence,
  ModerationSettings,
  ModerationStats,
  StaffPerson,
} from "./moderationTypes";

/* Admin moderation API. Every endpoint is permission-checked by the backend. */

function clean(filters: CaseFilters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== ""));
}

export const moderationApi = {
  async stats(): Promise<ModerationStats> {
    return (await api.get("/admin/moderation/stats")).data;
  },

  async cases(filters: CaseFilters): Promise<CaseList> {
    return (await api.get("/admin/moderation/cases", { params: clean(filters) })).data;
  },

  async appeals(filters: CaseFilters): Promise<CaseList> {
    return (await api.get("/admin/moderation/appeals", { params: clean(filters) })).data;
  },

  async details(caseId: string): Promise<CaseDetails> {
    return (await api.get(`/admin/moderation/cases/${encodeURIComponent(caseId)}`)).data;
  },

  async staff(): Promise<{ items: StaffPerson[] }> {
    return (await api.get("/admin/moderation/staff")).data;
  },

  async assign(caseId: string, assigneeId: string | null): Promise<CaseDetails> {
    return (await api.patch(`/admin/moderation/cases/${encodeURIComponent(caseId)}/assign`, { assigneeId })).data;
  },

  async addNote(caseId: string, body: string): Promise<CaseDetails> {
    return (await api.post(`/admin/moderation/cases/${encodeURIComponent(caseId)}/notes`, { body })).data;
  },

  async act(
    caseId: string,
    payload: {
      action: CaseActionName;
      reason?: string;
      consequences?: Consequence[];
      rule?: string;
      durationDays?: number;
      userMessage?: string;
      confirm?: boolean;
    },
  ): Promise<CaseDetails> {
    return (await api.post(`/admin/moderation/cases/${encodeURIComponent(caseId)}/actions`, payload)).data;
  },

  async decideAppeal(caseId: string, payload: { outcome: "upheld" | "overturned"; note: string; confirm?: boolean }): Promise<CaseDetails> {
    return (await api.post(`/admin/moderation/cases/${encodeURIComponent(caseId)}/appeal-decision`, payload)).data;
  },

  async setReportEligibility(reportId: string, eligible: boolean, reason?: string): Promise<CaseDetails> {
    return (await api.patch(`/admin/moderation/reports/${encodeURIComponent(reportId)}/eligibility`, { eligible, reason })).data;
  },

  async settings(): Promise<ModerationSettings> {
    return (await api.get("/admin/moderation/settings")).data;
  },

  async updateSettings(payload: Partial<ModerationSettings>): Promise<ModerationSettings> {
    return (await api.patch("/admin/moderation/settings", payload)).data;
  },
};

export function moderationError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const response = (error as { response?: { status?: number; data?: { message?: unknown } } })?.response;
  const message = response?.data?.message;
  const text = Array.isArray(message) ? String(message[0] ?? "") : typeof message === "string" ? message : "";

  if (response?.status === 403 && !text) return "You don't have permission to do that.";
  if (!response) return "Can't reach the server. Check your connection and try again.";

  return text || fallback;
}
