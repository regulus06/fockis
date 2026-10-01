import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import type {
  AiCredits,
  AiJob,
  CreateAiJobInput,
} from "../types/aiTypes";

/**
 * ============================================================================
 * FOCKIS AI API
 * ============================================================================
 */

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  FOCKIS_API_URL
).replace(/\/+$/, "");

function getAccessToken(): string | null {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt")
  );
}

function authHeaders(): HeadersInit {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Convert backend error responses into useful frontend errors.
 */
async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();

    console.error("[FOCKIS AI] Backend error:", body);

    if (typeof body?.message === "string") {
      return body.message;
    }

    if (Array.isArray(body?.message)) {
      return body.message.join(", ");
    }

    if (typeof body?.error === "string") {
      return body.error;
    }
  } catch {
    // Response was not JSON.
  }

  switch (response.status) {
    case 401:
      return "You are not authenticated. Please sign in again.";

    case 403:
      return "You do not have permission to use Fockis AI.";

    case 404:
      return "The requested AI resource was not found.";

    case 409:
      return "This AI request conflicts with another request.";

    case 422:
      return "The AI request contains invalid information.";

    case 429:
      return "AI usage is temporarily limited. Please try again later.";

    case 500:
      return "The Fockis AI server encountered an error.";

    default:
      return `AI request failed (${response.status}).`;
  }
}

/**
 * Generic authenticated API request.
 */
async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * ============================================================================
 * AI API
 * ============================================================================
 */

export const aiApi = {
  /**
   * Current user's AI credits.
   */
  getCredits(): Promise<AiCredits> {
    return request<AiCredits>("/ai/credits");
  },

  /**
   * Create an AI generation job.
   */
  createJob(input: CreateAiJobInput): Promise<AiJob> {
    console.log("[FOCKIS AI] CREATE JOB PAYLOAD:", {
      type: input.type,
      prompt: input.prompt,
      promptLength:
        typeof input.prompt === "string"
          ? input.prompt.length
          : "NOT_A_STRING",
      model: input.model,
      options: input.options,
    });

    return request<AiJob>("/ai/jobs", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /**
   * Get a single AI job.
   */
  getJob(id: string): Promise<AiJob> {
    if (!id) {
      throw new Error("AI job ID is required.");
    }

    return request<AiJob>(
      `/ai/jobs/${encodeURIComponent(id)}`,
    );
  },

  /**
   * Get the current user's AI generation history.
   */
  getHistory(): Promise<AiJob[]> {
    return request<AiJob[]>("/ai/jobs");
  },

  /**
   * Cancel an active AI job.
   */
  cancelJob(id: string): Promise<AiJob> {
    if (!id) {
      throw new Error("AI job ID is required.");
    }

    return request<AiJob>(
      `/ai/jobs/${encodeURIComponent(id)}/cancel`,
      {
        method: "POST",
      },
    );
  },
};

export default aiApi;