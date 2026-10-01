import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import type {
  ApiResult,
  TranscriptLine,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  FOCKIS_API_URL;

async function request<T>(
  path: string,
): Promise<ApiResult<T>> {
  try {
    const token =
      localStorage.getItem("token");

    const response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        headers: {
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
          : "Transcript request failed.",
    };
  }
}

export const meetingTranscriptApi = {
  async getFullTranscript(
    meetingId: string,
  ): Promise<ApiResult<TranscriptLine[]>> {
    return request<TranscriptLine[]>(
      `/meetings/${meetingId}/transcript`,
    );
  },

  async searchTranscript(
    meetingId: string,
    query: string,
  ): Promise<ApiResult<TranscriptLine[]>> {
    return request<TranscriptLine[]>(
      `/meetings/${meetingId}/transcript/search?q=${encodeURIComponent(
        query,
      )}`,
    );
  },

  async downloadTranscript(
    meetingId: string,
    format: "txt" | "pdf",
  ): Promise<
    ApiResult<{ url: string }>
  > {
    return request<{ url: string }>(
      `/meetings/${meetingId}/transcript/download?format=${format}`,
    );
  },
};