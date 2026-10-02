const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

/* ============================================================================
   TYPES
============================================================================ */

export interface FollowResponse {
  success?: boolean;
  message?: string;
  isFollowing: boolean;
  isFollowedBy: boolean;
  followers?: number;
  following?: number;
  [key: string]: unknown;
}

export interface FollowStatus {
  isFollowing: boolean;
  isFollowedBy: boolean;
}

export interface FollowCounts {
  followers: number;
  following: number;
}

/* ============================================================================
   HELPERS
============================================================================ */

function getToken(): string | null {
  return localStorage.getItem("token");
}

function getUserId(): string | null {
  return (
    localStorage.getItem("userId") ||
    localStorage.getItem("user_id")
  );
}

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(String(value).trim());
}

function normalizeUserId(userId: string): string {
  return String(userId || "").trim();
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();

  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      Array.isArray(data?.message)
        ? data.message.join(", ")
        : data?.message ||
          data?.error ||
          `Follow request failed (${response.status})`;

    throw new Error(message);
  }

  return data as T;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

function normalizeCounts(data: any): FollowCounts {
  const source =
    data?.data &&
    typeof data.data === "object"
      ? data.data
      : data;

  return {
    followers: Number(
      source?.followers ??
        source?.followersCount ??
        0,
    ) || 0,

    following: Number(
      source?.following ??
        source?.followingCount ??
        0,
    ) || 0,
  };
}

/* ============================================================================
   API
============================================================================ */

export const fockisFollowApi = {
  /* ==========================================================================
     FOLLOW

     POST /follows/:userId

     IMPORTANT:
     The backend follow relationship is directional.

     A -> B and B -> A are two separate valid follow records.
     Do not use a pair-based uniqueness check here.
  ========================================================================== */

  async follow(
    userId: string,
  ): Promise<FollowResponse> {
    const normalizedUserId =
      normalizeUserId(userId);

    if (!isValidObjectId(normalizedUserId)) {
      throw new Error("Invalid user ID.");
    }

    const data =
      await request<any>(
        `/follows/${encodeURIComponent(
          normalizedUserId,
        )}`,
        {
          method: "POST",
        },
      );

    return {
      ...data,
      success:
        data?.success !== false,
      isFollowing:
        data?.isFollowing !== undefined
          ? normalizeBoolean(data.isFollowing)
          : true,
      isFollowedBy:
        data?.isFollowedBy !== undefined
          ? normalizeBoolean(data.isFollowedBy)
          : false,
    };
  },

  /* ==========================================================================
     UNFOLLOW

     DELETE /follows/:userId
  ========================================================================== */

  async unfollow(
    userId: string,
  ): Promise<FollowResponse> {
    const normalizedUserId =
      normalizeUserId(userId);

    if (!isValidObjectId(normalizedUserId)) {
      throw new Error("Invalid user ID.");
    }

    const data =
      await request<any>(
        `/follows/${encodeURIComponent(
          normalizedUserId,
        )}`,
        {
          method: "DELETE",
        },
      );

    return {
      ...data,
      success:
        data?.success !== false,
      isFollowing: false,
      isFollowedBy:
        data?.isFollowedBy !== undefined
          ? normalizeBoolean(data.isFollowedBy)
          : false,
    };
  },

  /* ==========================================================================
     STATUS

     GET /follows/:userId/status

     Returns BOTH directions:

       isFollowing = current user -> target
       isFollowedBy = target -> current user
  ========================================================================== */

  async getStatus(
    userId: string,
  ): Promise<FollowStatus> {
    const normalizedUserId =
      normalizeUserId(userId);

    if (!isValidObjectId(normalizedUserId)) {
      return {
        isFollowing: false,
        isFollowedBy: false,
      };
    }

    try {
      const data =
        await request<any>(
          `/follows/${encodeURIComponent(
            normalizedUserId,
          )}/status`,
        );

      return {
        isFollowing:
          data?.isFollowing !== undefined
            ? normalizeBoolean(data.isFollowing)
            : false,

        isFollowedBy:
          data?.isFollowedBy !== undefined
            ? normalizeBoolean(data.isFollowedBy)
            : false,
      };
    } catch (error) {
      console.error(
        "[FOCKIS FOLLOW] Failed to load status:",
        error,
      );

      return {
        isFollowing: false,
        isFollowedBy: false,
      };
    }
  },

  /* ==========================================================================
     COUNTS

     GET /follows/:userId/counts

     This is used by useFockisProfile so the profile card always displays
     the real follower/following totals from the follows collection.

     IMPORTANT:
     Do not calculate follower/following counts from the loaded friend list.
  ========================================================================== */

  async getCounts(
    userId: string,
  ): Promise<FollowCounts> {
    const normalizedUserId =
      normalizeUserId(userId);

    if (!isValidObjectId(normalizedUserId)) {
      return {
        followers: 0,
        following: 0,
      };
    }

    try {
      const data =
        await request<any>(
          `/follows/${encodeURIComponent(
            normalizedUserId,
          )}/counts`,
        );

      return normalizeCounts(data);
    } catch (error) {
      console.error(
        "[FOCKIS FOLLOW] Failed to load counts:",
        error,
      );

      return {
        followers: 0,
        following: 0,
      };
    }
  },

  /* ==========================================================================
     FOLLOWERS

     GET /follows/:userId/followers
  ========================================================================== */

  async getFollowers(
    userId: string,
  ): Promise<any[]> {
    const normalizedUserId =
      normalizeUserId(userId);

    if (!isValidObjectId(normalizedUserId)) {
      return [];
    }

    try {
      const data =
        await request<any>(
          `/follows/${encodeURIComponent(
            normalizedUserId,
          )}/followers`,
        );

      if (Array.isArray(data)) {
        return data;
      }

      if (Array.isArray(data?.items)) {
        return data.items;
      }

      if (Array.isArray(data?.followers)) {
        return data.followers;
      }

      if (Array.isArray(data?.data)) {
        return data.data;
      }

      return [];
    } catch (error) {
      console.error(
        "[FOCKIS FOLLOW] Failed to load followers:",
        error,
      );

      return [];
    }
  },

  /* ==========================================================================
     FOLLOWING

     GET /follows/:userId/following
  ========================================================================== */

  async getFollowing(
    userId: string,
  ): Promise<any[]> {
    const normalizedUserId =
      normalizeUserId(userId);

    if (!isValidObjectId(normalizedUserId)) {
      return [];
    }

    try {
      const data =
        await request<any>(
          `/follows/${encodeURIComponent(
            normalizedUserId,
          )}/following`,
        );

      if (Array.isArray(data)) {
        return data;
      }

      if (Array.isArray(data?.items)) {
        return data.items;
      }

      if (Array.isArray(data?.following)) {
        return data.following;
      }

      if (Array.isArray(data?.data)) {
        return data.data;
      }

      return [];
    } catch (error) {
      console.error(
        "[FOCKIS FOLLOW] Failed to load following:",
        error,
      );

      return [];
    }
  },
};

export default fockisFollowApi;
