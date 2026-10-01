import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import type {
  ApiResult,
  MeetingPdfReport,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  FOCKIS_API_URL;

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const token =
      localStorage.getItem("token");

    const response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,
        headers: {
          "Content-Type":
            "application/json",
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
        credentials: "include",
      },
    );

    const data =
      await response.json().catch(
        () => null,
      );

    if (!response.ok) {
      return {
        ok: false,
        error:
          data?.message ||
          `Request failed with status ${response.status}`,
      };
    }

    return {
      ok: true,
      data: data as T,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "PDF request failed.",
    };
  }
}

export const meetingPdfApi = {
  async getReportStatus(
    meetingId: string,
  ): Promise<ApiResult<MeetingPdfReport>> {
    return request<MeetingPdfReport>(
      `/meetings/${meetingId}/pdf`,
    );
  },

  async requestReport(
    meetingId: string,
  ): Promise<ApiResult<MeetingPdfReport>> {
    return request<MeetingPdfReport>(
      `/meetings/${meetingId}/pdf`,
      {
        method: "POST",
      },
    );
  },
};