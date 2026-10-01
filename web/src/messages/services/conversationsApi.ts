import { FOCKIS_API_URL } from "../../config/fockisConfig";

/**
 * ============================================================================
 * FOCKIS MESSAGES - REAL CONVERSATIONS API
 * ============================================================================
 *
 * Public identity:
 *
 *   Fockis ID
 *       ↓
 *   Find user
 *       ↓
 *   Internal user ID
 *       ↓
 *   Create/open conversation
 *       ↓
 *   Conversation ID
 *       ↓
 *   ChatBox
 *
 * The backend gets the current authenticated user from the JWT.
 *
 * Therefore createWithParticipant() receives ONLY the OTHER user's
 * internal database ID.
 *
 * ============================================================================
 */

import type {
  Conversation,
  ConversationOtherUser,
} from "../types";


/* ============================================================================
   API BASE
============================================================================ */

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL
).replace(/\/+$/, "");


/* ============================================================================
   AUTH TOKEN
============================================================================ */

function getToken(): string | null {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("authToken")
  );
}


/* ============================================================================
   GENERIC REQUEST
============================================================================ */

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {

  const token =
    getToken();

  const headers =
    new Headers(
      options.headers,
    );

  headers.set(
    "Accept",
    "application/json",
  );

  if (
    options.body &&
    !headers.has("Content-Type")
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

  const url =
    `${API_BASE}${path}`;

  console.log(
    "[MESSAGES API]",
    options.method || "GET",
    url,
  );

  const response =
    await fetch(
      url,
      {
        ...options,
        headers,
      },
    );

  const text =
    await response.text();

  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {

    let message =
      `Request failed with status ${response.status}`;

    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data
    ) {
      const apiMessage =
        (
          data as {
            message?: unknown;
          }
        ).message;

      if (Array.isArray(apiMessage)) {
        message =
          apiMessage
            .map(String)
            .join(", ");
      } else if (
        apiMessage !== undefined
      ) {
        message =
          String(apiMessage);
      }
    }

    console.error(
      "[MESSAGES API ERROR]",
      {
        status: response.status,
        url,
        data,
      },
    );

    throw new Error(
      message,
    );
  }

  return data as T;
}


/* ============================================================================
   RESPONSE HELPERS
============================================================================ */

/**
 * The backend may return a conversation in several common forms:
 *
 * 1. Conversation
 *
 * 2. { data: Conversation }
 *
 * 3. { conversation: Conversation }
 *
 * 4. { data: { conversation: Conversation } }
 *
 * This helper accepts all of them.
 */

function unwrapConversation(
  response: unknown,
): Conversation {

  let current =
    response;

  /*
   * Protect against accidental null/undefined.
   */
  if (
    !current ||
    typeof current !== "object"
  ) {
    throw new Error(
      "Conversation API returned an invalid response.",
    );
  }

  /*
   * Maximum of several unwrap levels.
   *
   * This prevents an unexpected backend wrapper from breaking
   * the conversation UI.
   */
  for (
    let depth = 0;
    depth < 5;
    depth += 1
  ) {

    if (
      !current ||
      typeof current !== "object"
    ) {
      break;
    }

    const object =
      current as Record<
        string,
        unknown
      >;

    /*
     * Already looks like a conversation.
     */
    if (
      typeof object.id === "string" &&
      (
        "participantIds" in object ||
        "isGroup" in object ||
        "otherUser" in object
      )
    ) {
      return current as Conversation;
    }

    /*
     * { data: ... }
     */
    if (
      "data" in object &&
      object.data
    ) {
      current =
        object.data;

      continue;
    }

    /*
     * { conversation: ... }
     */
    if (
      "conversation" in object &&
      object.conversation
    ) {
      current =
        object.conversation;

      continue;
    }

    /*
     * { result: ... }
     */
    if (
      "result" in object &&
      object.result
    ) {
      current =
        object.result;

      continue;
    }

    break;
  }

  /*
   * Final fallback.
   */
  if (
    current &&
    typeof current === "object" &&
    "id" in current
  ) {
    return current as Conversation;
  }

  console.error(
    "[MESSAGES API] Could not unwrap conversation:",
    response,
  );

  throw new Error(
    "The server returned an invalid conversation.",
  );
}


/**
 * Unwrap a conversation collection.
 */
function unwrapConversationList(
  response: unknown,
): Conversation[] {

  if (
    Array.isArray(response)
  ) {
    return response as Conversation[];
  }

  let current =
    response;

  for (
    let depth = 0;
    depth < 5;
    depth += 1
  ) {

    if (
      !current ||
      typeof current !== "object"
    ) {
      return [];
    }

    const object =
      current as Record<
        string,
        unknown
      >;

    if (
      Array.isArray(object.conversations)
    ) {
      return object.conversations as Conversation[];
    }

    if (
      Array.isArray(object.data)
    ) {
      return object.data as Conversation[];
    }

    if (
      object.data &&
      typeof object.data === "object"
    ) {
      current =
        object.data;

      continue;
    }

    if (
      object.result &&
      typeof object.result === "object"
    ) {
      current =
        object.result;

      continue;
    }

    if (
      object.conversations &&
      typeof object.conversations === "object"
    ) {
      current =
        object.conversations;

      continue;
    }

    break;
  }

  return [];
}


/* ============================================================================
   CONVERSATION NORMALIZATION
============================================================================ */

function normalizeConversation(
  conversation: Conversation,
): Conversation {

  if (
    !conversation
  ) {
    throw new Error(
      "Conversation is missing.",
    );
  }

  const raw =
    conversation as Conversation & {
      _id?: string;
    };

  /*
   * MongoDB sometimes returns _id instead of id.
   */
  const conversationId =
    String(
      raw.id ||
      raw._id ||
      "",
    ).trim();

  if (!conversationId) {
    throw new Error(
      "Conversation is missing its ID.",
    );
  }

  /*
   * Direct conversation.
   */
  if (
    !conversation.otherUser
  ) {
    return {
      ...conversation,

      id:
        conversationId,

      participantIds:
        Array.isArray(
          conversation.participantIds,
        )
          ? conversation.participantIds.map(
              String,
            )
          : [],

      isGroup:
        Boolean(
          conversation.isGroup,
        ),

      unreadCount:
        Number(
          conversation.unreadCount || 0,
        ),

      updatedAt:
        conversation.updatedAt ||
        new Date().toISOString(),
    };
  }

  const user =
    conversation.otherUser as ConversationOtherUser & {
      _id?: string;
    };

  const userId =
    String(
      user.id ||
      user._id ||
      "",
    ).trim();

  const normalizedUser:
    ConversationOtherUser = {

    ...user,

    /*
     * Internal user ID.
     */
    id:
      userId,

    /*
     * Public Fockis ID.
     *
     * NEVER use user.id as a fallback.
     */
    fockisId:
      typeof user.fockisId === "string"
        ? user.fockisId
            .trim()
            .toUpperCase()
        : "",

    name:
      user.name ||
      user.username ||
      "User",

    username:
      user.username ||
      "",

    avatar:
      user.avatar ||
      user.profilePicture ||
      "",

    profilePicture:
      user.profilePicture,

    presence:
      user.presence ||
      "offline",

    lastSeen:
      user.lastSeen ||
      "",

    bio:
      user.bio,

    verified:
      user.verified,
  };

  return {

    ...conversation,

    id:
      conversationId,

    participantIds:
      Array.isArray(
        conversation.participantIds,
      )
        ? conversation.participantIds.map(
            String,
          )
        : [],

    isGroup:
      Boolean(
        conversation.isGroup,
      ),

    unreadCount:
      Number(
        conversation.unreadCount || 0,
      ),

    updatedAt:
      conversation.updatedAt ||
      new Date().toISOString(),

    otherUser:
      normalizedUser,
  };
}


/* ============================================================================
   NORMALIZE COLLECTION
============================================================================ */

function normalizeConversations(
  conversations: Conversation[],
): Conversation[] {

  return conversations
    .filter(Boolean)
    .map(
      normalizeConversation,
    );
}


/* ============================================================================
   CONVERSATIONS API
============================================================================ */

export const conversationsApi = {

  /* ==========================================================================
     GET /messages/conversations
  ========================================================================== */

  async list(): Promise<
    Conversation[]
  > {

    const response =
      await request<unknown>(
        "/messages/conversations",
      );

    console.log(
      "[MESSAGES API] Conversations response:",
      response,
    );

    const conversations =
      unwrapConversationList(
        response,
      );

    const normalized =
      normalizeConversations(
        conversations,
      );

    console.log(
      "[MESSAGES API] Normalized conversations:",
      normalized,
    );

    return normalized;
  },


  /* ==========================================================================
     GET /messages/conversations/:id
  ========================================================================== */

  async getById(
    id: string,
  ): Promise<
    Conversation | undefined
  > {

    const conversationId =
      String(
        id || "",
      ).trim();

    if (!conversationId) {
      return undefined;
    }

    try {

      const response =
        await request<unknown>(
          `/messages/conversations/${encodeURIComponent(
            conversationId,
          )}`,
        );

      const conversation =
        unwrapConversation(
          response,
        );

      return normalizeConversation(
        conversation,
      );

    } catch (error) {

      if (
        error instanceof Error &&
        error.message
          .toLowerCase()
          .includes("not found")
      ) {
        return undefined;
      }

      throw error;
    }
  },


  /* ==========================================================================
     PATCH /messages/conversations/:id/read
  ========================================================================== */

  async markRead(
    id: string,
  ): Promise<void> {

    const conversationId =
      String(
        id || "",
      ).trim();

    if (!conversationId) {
      return;
    }

    await request(
      `/messages/conversations/${encodeURIComponent(
        conversationId,
      )}/read`,
      {
        method: "PATCH",
      },
    );
  },


  /* ==========================================================================
     OPTIONAL CONVERSATION TOUCH
  ========================================================================== */

  async touch(
    id: string,
    lastMessageId: string,
    updatedAt: string,
  ): Promise<void> {

    const conversationId =
      String(
        id || "",
      ).trim();

    if (!conversationId) {
      return;
    }

    try {

      await request(
        `/messages/conversations/${encodeURIComponent(
          conversationId,
        )}`,
        {
          method: "PATCH",

          body:
            JSON.stringify({
              lastMessageId,
              updatedAt,
            }),
        },
      );

    } catch {
      /*
       * Optional endpoint.
       *
       * Do not make message sending fail if this endpoint
       * is not implemented by the backend.
       */
    }
  },


  /* ==========================================================================
     PATCH /messages/conversations/:id/mute
  ========================================================================== */

  async setMuted(
    id: string,
    muted: boolean,
  ): Promise<void> {

    const conversationId =
      String(
        id || "",
      ).trim();

    if (!conversationId) {
      return;
    }

    await request(
      `/messages/conversations/${encodeURIComponent(
        conversationId,
      )}/mute`,
      {
        method: "PATCH",

        body:
          JSON.stringify({
            muted,
          }),
      },
    );
  },


  /* ==========================================================================
     POST /messages/conversations

     CREATE OR OPEN DIRECT CONVERSATION
  ========================================================================== */

  async createWithParticipant(
    participantId: string,
  ): Promise<Conversation> {

    const normalizedParticipantId =
      String(
        participantId || "",
      ).trim();

    if (!normalizedParticipantId) {
      throw new Error(
        "Participant ID is required.",
      );
    }

    console.log(
      "[MESSAGES API] Creating/opening conversation with internal user ID:",
      normalizedParticipantId,
    );


    /*
     * IMPORTANT:
     *
     * This is NOT the Fockis ID.
     *
     * Example:
     *
     * Public:
     *     FK3FUK3L
     *
     * Resolved user:
     *     6a78bacc07331692fce83793
     *
     * This function receives:
     *
     *     6a78bacc07331692fce83793
     *
     * The backend determines the current user from JWT.
     */

    const response =
      await request<unknown>(
        "/messages/conversations",
        {
          method: "POST",

          body:
            JSON.stringify({
              participantIds: [
                normalizedParticipantId,
              ],

              isGroup:
                false,
            }),
        },
      );


    console.log(
      "[MESSAGES API] Create conversation raw response:",
      response,
    );


    const conversation =
      unwrapConversation(
        response,
      );


    const normalized =
      normalizeConversation(
        conversation,
      );


    console.log(
      "[MESSAGES API] Create conversation normalized:",
      normalized,
    );


    if (!normalized.id) {
      throw new Error(
        "The server did not return a valid conversation ID.",
      );
    }


    /*
     * A direct conversation should have the other user.
     *
     * If the backend does not include otherUser in the POST response,
     * try to retrieve the complete conversation immediately.
     */
    if (
      !normalized.otherUser
    ) {

      console.log(
        "[MESSAGES API] Conversation has no otherUser. Fetching complete conversation:",
        normalized.id,
      );

      const complete =
        await this.getById(
          normalized.id,
        );

      if (complete) {

        console.log(
          "[MESSAGES API] Complete conversation loaded:",
          complete,
        );

        return complete;
      }
    }


    return normalized;
  },
};