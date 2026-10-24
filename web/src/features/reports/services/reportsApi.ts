import { api } from "../../../api/api";

import type {
  ModerationDecision,
  MyReport,
  ReportReason,
  ReportSubmitResult,
  ReportTargetType,
} from "../reportTypes";

/**
 * The reporter is always the signed-in user (taken from the auth token by
 * the API); no user ID is ever sent from here.
 */
export async function submitReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
}): Promise<ReportSubmitResult> {
  const { data } = await api.post<ReportSubmitResult>("/reports", {
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
  });

  return data;
}

export async function getMyReports(page = 1): Promise<{ items: MyReport[]; total: number; hasMore: boolean }> {
  const { data } = await api.get("/reports/mine", { params: { page } });
  return data;
}

export async function getMyDecisions(): Promise<{ items: ModerationDecision[] }> {
  const { data } = await api.get("/moderation/my-decisions");
  return data;
}

export async function submitAppeal(caseId: string, message: string): Promise<{ success: boolean; decision: ModerationDecision }> {
  const { data } = await api.post(`/moderation/decisions/${encodeURIComponent(caseId)}/appeal`, { message });
  return data;
}

/** Turns an API error into a sentence that is safe to show. */
export function reportErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const response = (error as { response?: { status?: number; data?: { message?: unknown } } })?.response;
  const message = response?.data?.message;
  const text = Array.isArray(message) ? String(message[0] ?? "") : typeof message === "string" ? message : "";

  if (response?.status === 429 && !text) return "You're sending reports too quickly. Please wait a moment.";
  if (!response) return "You appear to be offline. Check your connection and try again.";

  return text || fallback;
}

export function isAlreadyReported(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 409;
}
