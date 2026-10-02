import type {
  ApiResult,
  AttendanceRecord,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

function getHeaders(): HeadersInit {
  const token =
    localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,
        headers: {
          ...getHeaders(),
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
          : "Attendance request failed.",
    };
  }
}

export const meetingAttendanceApi = {
  async getAttendance(
    meetingId: string,
  ): Promise<ApiResult<AttendanceRecord[]>> {
    return request<AttendanceRecord[]>(
      `/meetings/${meetingId}/attendance`,
    );
  },

  async markJoined(
    meetingId: string,
  ): Promise<ApiResult<unknown>> {
    return request(
      `/meetings/${meetingId}/attendance/join`,
      {
        method: "POST",
      },
    );
  },

  async markLeft(
    meetingId: string,
  ): Promise<ApiResult<unknown>> {
    return request(
      `/meetings/${meetingId}/attendance/leave`,
      {
        method: "POST",
      },
    );
  },

  async submitLateNotice(
    meetingId: string,
    minutes: number,
    message: string,
  ): Promise<ApiResult<void>> {
    return request<void>(
      `/meetings/${meetingId}/attendance/late`,
      {
        method: "POST",
        body: JSON.stringify({
          minutes,
          message,
        }),
      },
    );
  },
};