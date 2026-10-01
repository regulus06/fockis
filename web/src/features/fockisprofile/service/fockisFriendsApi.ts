import { FOCKIS_API_URL } from "../../../config/fockisConfig";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL;

/**
 * ============================================================================
 * FOCKIS FRIENDS API
 * ============================================================================
 *
 * Single frontend API layer for the Fockis friend system.
 *
 * BACKEND ROUTES
 *
 * POST   /friends/request
 * POST   /friends/:id/respond
 *
 * DELETE /friends/:id/cancel
 * DELETE /friends/:id/unfriend
 *
 * POST   /friends/:userId/block
 * DELETE /friends/:userId/block
 *
 * GET    /friends
 * GET    /friends/:userId
 *
 * GET    /friends/requests
 * GET    /friends/requests/pending
 * GET    /friends/requests/incoming
 *
 * GET    /friends/requests/outgoing
 * GET    /friends/requests/sent
 *
 * GET    /friends/search/:query
 * GET    /friends/status/:userId
 * GET    /friends/suggestions
 * ============================================================================
 */


/* ============================================================================
   AUTH
============================================================================ */

function getToken(): string | null {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("authToken")
  );
}


/* ============================================================================
   TYPES
============================================================================ */

export interface FockisFriendRequestResponse {
  status?: string;
  direction?: string | null;

  id?: string;
  _id?: string;

  requestId?: string;
  friendshipId?: string;

  message?: string;

  requester?: any;
  receiver?: any;

  requesterId?: any;
  receiverId?: any;

  friendship?: any;
  request?: any;

  data?: any;

  [key: string]: any;
}


export interface FockisFriendSuggestion {
  id?: string;
  _id?: string;
  userId?: string;

  username?: string;

  displayName?: string;
  name?: string;
  fullName?: string;

  firstName?: string;
  lastName?: string;

  avatar?: string;
  avatarUrl?: string;

  profilePicture?: string;
  profileImage?: string;

  bio?: string;

  mutualFriends?: number;
  mutualFriendCount?: number;

  followers?: number;
  following?: number;

  [key: string]: any;
}


/* ============================================================================
   GENERIC API REQUEST
============================================================================ */

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(
    options.headers,
  );

  const token = getToken();

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers,
      credentials: "include",
    },
  );

  const text = await response.text();

  let data: any = null;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    let message =
      `Friends request failed ${response.status}`;

    if (
      Array.isArray(data?.message)
    ) {
      message =
        data.message.join(", ");
    } else if (
      data?.message
    ) {
      message =
        String(data.message);
    } else if (
      data?.error
    ) {
      message =
        String(data.error);
    }

    throw new Error(message);
  }

  return data as T;
}


/* ============================================================================
   REQUEST ID
============================================================================ */

export function extractFriendRequestId(
  data: any,
): string | null {
  const id =
    data?.requestId ??
    data?.friendshipId ??
    data?.request?.id ??
    data?.request?._id ??
    data?.friendship?.id ??
    data?.friendship?._id ??
    data?.data?.requestId ??
    data?.data?.friendshipId ??
    data?.data?.request?.id ??
    data?.data?.request?._id ??
    data?.data?.friendship?.id ??
    data?.data?.friendship?._id ??
    data?.id ??
    data?._id;

  return id
    ? String(id)
    : null;
}


/* ============================================================================
   FRIEND STATUS
============================================================================ */

export function normalizeFriendStatus(
  data: any,
): string {
  const status = String(
    data?.status ??
      data?.friendship?.status ??
      data?.request?.status ??
      data?.data?.status ??
      data?.data?.friendship?.status ??
      data?.data?.request?.status ??
      "none",
  )
    .trim()
    .toLowerCase();

  switch (status) {
    case "pending":
    case "requested":
    case "sent":
      return "request_sent";

    case "accepted":
    case "accept":
    case "friend":
    case "friends":
      return "friends";

    case "rejected":
    case "declined":
    case "denied":
      return "rejected";

    case "blocked":
    case "block":
      return "blocked";

    default:
      return "none";
  }
}


/* ============================================================================
   NESTED ID HELPER
============================================================================ */

function getNestedId(
  value: any,
): string | null {
  if (!value) {
    return null;
  }

  if (
    typeof value === "string"
  ) {
    return value;
  }

  if (
    typeof value === "object"
  ) {
    const id =
      value._id ??
      value.id ??
      value.userId;

    return id
      ? String(id)
      : null;
  }

  return null;
}


/* ============================================================================
   FRIEND REQUEST DIRECTION
============================================================================ */

export function normalizeFriendDirection(
  data: any,
): "incoming" | "outgoing" | null {
  const explicit =
    String(
      data?.direction ??
        data?.data?.direction ??
        "",
    )
      .trim()
      .toLowerCase();

  if (
    explicit === "incoming" ||
    explicit === "outgoing"
  ) {
    return explicit;
  }

  const currentUserId =
    localStorage.getItem(
      "userId",
    ) ||
    localStorage.getItem(
      "user_id",
    ) ||
    localStorage.getItem(
      "currentUserId",
    );

  const requesterId =
    getNestedId(
      data?.requesterId ??
        data?.requester ??
        data?.request?.requesterId ??
        data?.request?.requester ??
        data?.friendship?.requesterId ??
        data?.friendship?.requester ??
        data?.data?.requesterId ??
        data?.data?.requester ??
        data?.data?.request?.requesterId ??
        data?.data?.request?.requester,
    );

  const receiverId =
    getNestedId(
      data?.receiverId ??
        data?.receiver ??
        data?.request?.receiverId ??
        data?.request?.receiver ??
        data?.friendship?.receiverId ??
        data?.friendship?.receiver ??
        data?.data?.receiverId ??
        data?.data?.receiver ??
        data?.data?.request?.receiverId ??
        data?.data?.request?.receiver,
    );

  if (
    currentUserId &&
    requesterId &&
    String(requesterId) ===
      String(currentUserId)
  ) {
    return "outgoing";
  }

  if (
    currentUserId &&
    receiverId &&
    String(receiverId) ===
      String(currentUserId)
  ) {
    return "incoming";
  }

  return null;
}


/* ============================================================================
   LIST NORMALIZATION
============================================================================ */

function normalizeList(
  payload: any,
): any[] {
  if (
    Array.isArray(payload)
  ) {
    return payload;
  }

  if (
    Array.isArray(payload?.items)
  ) {
    return payload.items;
  }

  if (
    Array.isArray(payload?.friends)
  ) {
    return payload.friends;
  }

  if (
    Array.isArray(payload?.requests)
  ) {
    return payload.requests;
  }

  if (
    Array.isArray(payload?.data)
  ) {
    return payload.data;
  }

  if (
    Array.isArray(payload?.results)
  ) {
    return payload.results;
  }

  return [];
}


/* ============================================================================
   SUGGESTION NORMALIZATION
============================================================================ */

function normalizeSuggestions(
  payload: any,
): FockisFriendSuggestion[] {
  if (
    Array.isArray(payload)
  ) {
    return payload;
  }

  if (
    Array.isArray(payload?.suggestions)
  ) {
    return payload.suggestions;
  }

  if (
    Array.isArray(payload?.users)
  ) {
    return payload.users;
  }

  if (
    Array.isArray(payload?.data)
  ) {
    return payload.data;
  }

  if (
    Array.isArray(payload?.results)
  ) {
    return payload.results;
  }

  if (
    Array.isArray(payload?.items)
  ) {
    return payload.items;
  }

  return [];
}


/* ============================================================================
   FOCKIS FRIENDS API
============================================================================ */

export const fockisFriendsApi = {

  /* ==========================================================================
     SEND FRIEND REQUEST

     POST /friends/request
  ========================================================================== */

  async sendRequest(
    userId: string,
  ): Promise<FockisFriendRequestResponse> {
    if (!userId) {
      throw new Error(
        "A user ID is required to send a friend request.",
      );
    }

    const response =
      await request<FockisFriendRequestResponse>(
        "/friends/request",
        {
          method: "POST",

          body: JSON.stringify({
            friendId: userId,
          }),
        },
      );

    console.log(
      "[FOCKIS FRIENDS API] SEND REQUEST:",
      response,
    );

    return response;
  },


  /* ==========================================================================
     ACCEPT FRIEND REQUEST

     POST /friends/:requestId/respond
  ========================================================================== */

  async acceptRequest(
    requestId: string,
  ): Promise<FockisFriendRequestResponse> {
    if (!requestId) {
      throw new Error(
        "A friend request ID is required.",
      );
    }

    const response =
      await request<FockisFriendRequestResponse>(
        `/friends/${encodeURIComponent(
          requestId,
        )}/respond`,
        {
          method: "POST",

          body: JSON.stringify({
            accept: true,
          }),
        },
      );

    console.log(
      "[FOCKIS FRIENDS API] ACCEPT REQUEST:",
      response,
    );

    return response;
  },


  /* ==========================================================================
     REJECT FRIEND REQUEST

     POST /friends/:requestId/respond
  ========================================================================== */

  async rejectRequest(
    requestId: string,
  ): Promise<FockisFriendRequestResponse> {
    if (!requestId) {
      throw new Error(
        "A friend request ID is required.",
      );
    }

    const response =
      await request<FockisFriendRequestResponse>(
        `/friends/${encodeURIComponent(
          requestId,
        )}/respond`,
        {
          method: "POST",

          body: JSON.stringify({
            accept: false,
          }),
        },
      );

    console.log(
      "[FOCKIS FRIENDS API] REJECT REQUEST:",
      response,
    );

    return response;
  },


  /* ==========================================================================
     RESPOND TO REQUEST

     Compatibility helper
  ========================================================================== */

  async respondRequest(
    requestId: string,
    accept: boolean,
  ): Promise<FockisFriendRequestResponse> {
    return accept
      ? this.acceptRequest(
          requestId,
        )
      : this.rejectRequest(
          requestId,
        );
  },


  /* ==========================================================================
     CANCEL OUTGOING REQUEST

     DELETE /friends/:requestId/cancel
  ========================================================================== */

  async cancelRequest(
    requestId: string,
  ): Promise<FockisFriendRequestResponse> {
    if (!requestId) {
      throw new Error(
        "A friend request ID is required to cancel the request.",
      );
    }

    const response =
      await request<FockisFriendRequestResponse>(
        `/friends/${encodeURIComponent(
          requestId,
        )}/cancel`,
        {
          method: "DELETE",
        },
      );

    console.log(
      "[FOCKIS FRIENDS API] CANCEL REQUEST:",
      response,
    );

    return response;
  },


  /* ==========================================================================
     REMOVE FRIEND / UNFRIEND

     PRIMARY COMPATIBILITY ROUTE

     DELETE /friends/:userId

     The backend controller currently exposes both:

       DELETE /friends/:id/unfriend
       DELETE /friends/:userId

     The compatibility route is used here because it is the simplest
     route already present in the running FriendsController and avoids
     the /unfriend 404 that was occurring in the browser.
  ========================================================================== */

  async removeFriend(
    userId: string,
  ): Promise<FockisFriendRequestResponse> {
    if (!userId) {
      throw new Error(
        "A user ID is required to remove a friend.",
      );
    }

    const path =
      `/friends/${encodeURIComponent(
        userId,
      )}`;

    console.log(
      "[FOCKIS FRIENDS API] UNFRIEND:",
      {
        userId,
        path,
        url: `${API_BASE}${path}`,
      },
    );

    const response =
      await request<FockisFriendRequestResponse>(
        path,
        {
          method: "DELETE",
        },
      );

    console.log(
      "[FOCKIS FRIENDS API] UNFRIEND RESPONSE:",
      response,
    );

    return response;
  },


  /* ==========================================================================
     UNFRIEND ALIAS
  ========================================================================== */

  async unfriend(
    userId: string,
  ): Promise<FockisFriendRequestResponse> {
    return this.removeFriend(
      userId,
    );
  },


  /* ==========================================================================
     BLOCK USER

     POST /friends/:userId/block
  ========================================================================== */

  async blockUser(
    userId: string,
  ): Promise<FockisFriendRequestResponse> {
    if (!userId) {
      throw new Error(
        "A user ID is required to block a user.",
      );
    }

    const response =
      await request<FockisFriendRequestResponse>(
        `/friends/${encodeURIComponent(
          userId,
        )}/block`,
        {
          method: "POST",
        },
      );

    console.log(
      "[FOCKIS FRIENDS API] BLOCK:",
      response,
    );

    return response;
  },


  /* ==========================================================================
     BLOCK ALIAS
  ========================================================================== */

  async block(
    userId: string,
  ): Promise<FockisFriendRequestResponse> {
    return this.blockUser(
      userId,
    );
  },


  /* ==========================================================================
     UNBLOCK USER

     DELETE /friends/:userId/block
  ========================================================================== */

  async unblockUser(
    userId: string,
  ): Promise<FockisFriendRequestResponse> {
    if (!userId) {
      throw new Error(
        "A user ID is required to unblock a user.",
      );
    }

    const response =
      await request<FockisFriendRequestResponse>(
        `/friends/${encodeURIComponent(
          userId,
        )}/block`,
        {
          method: "DELETE",
        },
      );

    console.log(
      "[FOCKIS FRIENDS API] UNBLOCK:",
      response,
    );

    return response;
  },


  /* ==========================================================================
     UNBLOCK ALIAS
  ========================================================================== */

  async unblock(
    userId: string,
  ): Promise<FockisFriendRequestResponse> {
    return this.unblockUser(
      userId,
    );
  },


  /* ==========================================================================
     FRIENDSHIP STATUS

     GET /friends/status/:userId
  ========================================================================== */

  async getStatus(
    userId: string,
  ): Promise<FockisFriendRequestResponse> {
    if (!userId) {
      throw new Error(
        "A user ID is required to get friendship status.",
      );
    }

    const response =
      await request<FockisFriendRequestResponse>(
        `/friends/status/${encodeURIComponent(
          userId,
        )}`,
        {
          method: "GET",
        },
      );

    console.log(
      "[FOCKIS FRIENDS API] STATUS:",
      {
        userId,
        response,
      },
    );

    return response;
  },


  /* ==========================================================================
     MY FRIENDS

     GET /friends
  ========================================================================== */

  async getMyFriends(): Promise<any[]> {
    const payload =
      await request<any>(
        "/friends",
        {
          method: "GET",
        },
      );

    const friends =
      normalizeList(payload);

    console.log(
      "[FOCKIS FRIENDS API] MY FRIENDS RAW:",
      payload,
    );

    console.log(
      "[FOCKIS FRIENDS API] MY FRIENDS:",
      friends,
    );

    return friends;
  },


  /* ==========================================================================
     USER FRIENDS

     GET /friends/:userId
  ========================================================================== */

  async getFriends(
    userId: string,
  ): Promise<any[]> {
    if (!userId) {
      throw new Error(
        "A user ID is required to get friends.",
      );
    }

    const payload =
      await request<any>(
        `/friends/${encodeURIComponent(
          userId,
        )}`,
        {
          method: "GET",
        },
      );

    return normalizeList(
      payload,
    );
  },


  /* ==========================================================================
     INCOMING FRIEND REQUESTS

     GET /friends/requests
  ========================================================================== */

  async getIncomingRequests(): Promise<any[]> {
    const payload =
      await request<any>(
        "/friends/requests",
        {
          method: "GET",
        },
      );

    const requests =
      normalizeList(payload);

    console.log(
      "[FOCKIS FRIENDS API] INCOMING REQUESTS RAW:",
      payload,
    );

    console.log(
      "[FOCKIS FRIENDS API] INCOMING REQUESTS NORMALIZED:",
      requests,
    );

    return requests;
  },


  /* ==========================================================================
     REQUESTS ALIAS
  ========================================================================== */

  async getRequests(): Promise<any[]> {
    return this.getIncomingRequests();
  },


  /* ==========================================================================
     PENDING REQUESTS ALIAS
  ========================================================================== */

  async getPendingRequests(): Promise<any[]> {
    return this.getIncomingRequests();
  },


  /* ==========================================================================
     OUTGOING FRIEND REQUESTS

     GET /friends/requests/outgoing
  ========================================================================== */

  async getOutgoingRequests(): Promise<any[]> {
    const payload =
      await request<any>(
        "/friends/requests/outgoing",
        {
          method: "GET",
        },
      );

    const requests =
      normalizeList(payload);

    console.log(
      "[FOCKIS FRIENDS API] OUTGOING REQUESTS RAW:",
      payload,
    );

    console.log(
      "[FOCKIS FRIENDS API] OUTGOING REQUESTS NORMALIZED:",
      requests,
    );

    return requests;
  },


  /* ==========================================================================
     SENT REQUESTS ALIAS
  ========================================================================== */

  async getSentRequests(): Promise<any[]> {
    return this.getOutgoingRequests();
  },


  /* ==========================================================================
     SEARCH USERS

     GET /friends/search/:query
  ========================================================================== */

  async searchUsers(
    query: string,
  ): Promise<any[]> {
    const trimmed =
      query.trim();

    if (!trimmed) {
      return [];
    }

    const payload =
      await request<any>(
        `/friends/search/${encodeURIComponent(
          trimmed,
        )}`,
        {
          method: "GET",
        },
      );

    return normalizeList(
      payload,
    );
  },


  /* ==========================================================================
     BLOCKED USERS

     GET /friends/blocked
  ========================================================================== */

  async getBlockedUsers(): Promise<any[]> {
    const payload =
      await request<any>(
        "/friends/blocked",
        {
          method: "GET",
        },
      );

    const blockedUsers =
      normalizeList(payload);

    console.log(
      "[FOCKIS FRIENDS API] BLOCKED USERS RAW:",
      payload,
    );

    console.log(
      "[FOCKIS FRIENDS API] BLOCKED USERS NORMALIZED:",
      blockedUsers,
    );

    return blockedUsers;
  },


  /* ==========================================================================
     FRIEND SUGGESTIONS

     GET /friends/suggestions
  ========================================================================== */

  async getSuggestions(
    limit?: number,
  ): Promise<FockisFriendSuggestion[]> {
    const query =
      typeof limit === "number" &&
      Number.isFinite(limit)
        ? `?limit=${Math.max(
            1,
            Math.floor(limit),
          )}`
        : "";

    const payload =
      await request<any>(
        `/friends/suggestions${query}`,
        {
          method: "GET",
        },
      );

    const suggestions =
      normalizeSuggestions(
        payload,
      );

    console.log(
      "[FOCKIS FRIENDS API] SUGGESTIONS:",
      suggestions,
    );

    return suggestions;
  },
};


/* ============================================================================
   DEFAULT EXPORT
============================================================================ */

export default fockisFriendsApi;