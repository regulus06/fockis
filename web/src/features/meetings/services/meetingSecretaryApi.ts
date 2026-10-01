import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import type {
  ApiResult,
  AiSecretaryConfig,
  MeetingSummary,
  SecretaryStatus,
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
          ...(options.headers || {}),
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
          : "Secretary request failed.",
    };
  }
}

export const meetingSecretaryApi = {
  async getConfig(
    meetingId: string,
  ): Promise<ApiResult<AiSecretaryConfig>> {
    return request<AiSecretaryConfig>(
      `/meetings/${meetingId}/secretary`,
    );
  },

  async updateConfig(
    meetingId: string,
    config: AiSecretaryConfig,
  ): Promise<ApiResult<AiSecretaryConfig>> {
    return request<AiSecretaryConfig>(
      `/meetings/${meetingId}/secretary`,
      {
        method: "PATCH",
        body: JSON.stringify(config),
      },
    );
  },

  async getStatus(
    meetingId: string,
  ): Promise<ApiResult<SecretaryStatus>> {
    return request<SecretaryStatus>(
      `/meetings/${meetingId}/secretary/status`,
    );
  },

  async requestSummary(
    meetingId: string,
  ): Promise<ApiResult<MeetingSummary>> {
    return request<MeetingSummary>(
      `/meetings/${meetingId}/secretary/summary`,
      {
        method: "POST",
      },
    );
  },
};