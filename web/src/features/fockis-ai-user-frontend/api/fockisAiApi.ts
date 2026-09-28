const API = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

const KEY = "fockis-ai-conversations-v1";

export interface AiConversationRecord {
  id: string;
  title: string;
  updatedAt: string;
  messageCount?: number;
}

export interface FockisAiChatResponse {
  success?: boolean;
  chatId?: string | null;
  assistantId?: string;
  sessionId?: string | null;
  message?: string;
  content?: string;
  response?: string;
  text?: string;
  raw?: unknown;
  [key: string]: unknown;
}

/*
 * ============================================================================
 * LOCAL CONVERSATIONS
 * ============================================================================
 */

const read = (): AiConversationRecord[] => {
  try {
    return JSON.parse(
      localStorage.getItem(KEY) || "[]",
    ) as AiConversationRecord[];
  } catch {
    return [];
  }
};

const write = (
  value: AiConversationRecord[],
) => {
  localStorage.setItem(
    KEY,
    JSON.stringify(value),
  );
};

/*
 * ============================================================================
 * AUTHENTICATION
 * ============================================================================
 *
 * Fockis currently uses JWT authentication.
 *
 * We check the same common token names used by
 * the other Fockis API clients.
 */

function normalizeToken(
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const token = value.trim();

  if (!token) {
    return null;
  }

  /*
   * If something was accidentally stored as:
   *
   * Bearer eyJ...
   *
   * strip the Bearer prefix before rebuilding
   * the Authorization header.
   */
  if (
    token
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return token.slice(7).trim();
  }

  return token;
}

function extractTokenFromObject(
  value: unknown,
): string | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const record =
    value as Record<string, unknown>;

  const directKeys = [
    "access_token",
    "accessToken",
    "token",
    "jwt",
    "idToken",
    "id_token",
    "authToken",
    "authorization",
    "fockis_token",
    "fockis_access_token",
  ];

  for (const key of directKeys) {
    const candidate = record[key];

    if (typeof candidate === "string") {
      const token =
        normalizeToken(candidate);

      if (token) {
        return token;
      }
    }
  }

  /*
   * Some auth objects nest the token.
   */
  const nestedKeys = [
    "data",
    "user",
    "session",
    "auth",
    "authentication",
  ];

  for (const key of nestedKeys) {
    const nested = record[key];

    const token =
      extractTokenFromObject(nested);

    if (token) {
      return token;
    }
  }

  return null;
}

function getToken(): string | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  const directKeys = [
    "access_token",
    "accessToken",
    "token",
    "jwt",
    "idToken",
    "id_token",
    "authToken",
    "authorization",
    "fockis_token",
    "fockis_access_token",
  ];

  /*
   * First check the known authentication keys.
   */
  for (const key of directKeys) {
    try {
      const value =
        window.localStorage.getItem(key);

      const directToken =
        normalizeToken(value);

      if (directToken) {
        return directToken;
      }

      /*
       * Some applications store an object
       * instead of the raw token.
       */
      if (value) {
        try {
          const parsed: unknown =
            JSON.parse(value);

          const nestedToken =
            extractTokenFromObject(parsed);

          if (nestedToken) {
            return nestedToken;
          }
        } catch {
          // Not JSON; continue.
        }
      }
    } catch {
      // Ignore localStorage errors.
    }
  }

  /*
   * Second pass: inspect localStorage objects.
   *
   * This helps when the authentication store
   * uses a custom key.
   */
  try {
    for (
      let index = 0;
      index < window.localStorage.length;
      index += 1
    ) {
      const key =
        window.localStorage.key(index);

      if (!key) {
        continue;
      }

      const value =
        window.localStorage.getItem(key);

      if (!value) {
        continue;
      }

      /*
       * First see if this is directly a JWT.
       */
      const directToken =
        normalizeToken(value);

      if (directToken) {
        /*
         * JWTs normally have three sections.
         */
        if (
          directToken.split(".").length === 3
        ) {
          return directToken;
        }
      }

      /*
       * Then inspect JSON objects.
       */
      try {
        const parsed: unknown =
          JSON.parse(value);

        const nestedToken =
          extractTokenFromObject(parsed);

        if (nestedToken) {
          return nestedToken;
        }
      } catch {
        // Ignore non-JSON values.
      }
    }
  } catch {
    // Ignore localStorage access errors.
  }

  return null;
}

/*
 * ============================================================================
 * HTTP REQUEST
 * ============================================================================
 */

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const headers = new Headers(
    init.headers,
  );

  /*
   * JSON requests.
   */
  if (
    init.body &&
    !(init.body instanceof FormData)
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  headers.set(
    "Accept",
    "application/json",
  );

  /*
   * IMPORTANT:
   *
   * Send the Fockis JWT to NestJS.
   */
  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  console.debug(
    "[FOCKIS AI API]",
    {
      method: init.method || "GET",
      url: `${API}${path}`,
      authenticated: Boolean(token),
      tokenLength: token?.length || 0,
    },
  );

  const response = await fetch(
    `${API}${path}`,
    {
      ...init,
      credentials: "include",
      headers,
    },
  );

  if (!response.ok) {
    let message =
      `AI API ${response.status}`;

    let body: unknown = null;

    try {
      const text =
        await response.text();

      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }

      if (
        body &&
        typeof body === "object" &&
        "message" in body
      ) {
        const serverMessage =
          (
            body as {
              message?: unknown;
            }
          ).message;

        if (Array.isArray(serverMessage)) {
          message =
            serverMessage
              .map((item) =>
                String(item),
              )
              .join(", ");
        } else if (
          typeof serverMessage ===
          "string"
        ) {
          message = serverMessage;
        }
      } else if (
        typeof body === "string" &&
        body.trim()
      ) {
        message = body;
      }
    } catch {
      // Keep the default status message.
    }

    if (response.status === 401) {
      console.error(
        "[FOCKIS AI API] Authentication failed.",
        {
          url: `${API}${path}`,
          hasToken: Boolean(token),
          tokenLength:
            token?.length || 0,
        },
      );

      throw new Error(
        "Unauthorized. Your Fockis login session may have expired. Please sign in again.",
      );
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/*
 * ============================================================================
 * BACKEND MODE
 * ============================================================================
 */

const backend =
  String(
    import.meta.env
      .VITE_FOCKIS_AI_USE_BACKEND,
  ).toLowerCase() === "true";

/*
 * ============================================================================
 * FOCKIS AI API
 * ============================================================================
 */

export const fockisAiApi = {
  /*
   * --------------------------------------------------------------------------
   * LIST CONVERSATIONS
   * --------------------------------------------------------------------------
   */

  async list(): Promise<
    AiConversationRecord[]
  > {
    if (backend) {
      try {
        return await request<
          AiConversationRecord[]
        >("/ai/conversations");
      } catch (error) {
        console.warn(
          "[FOCKIS AI API] Backend conversation list failed. Falling back to local storage.",
          error,
        );
      }
    }

    return read();
  },

  /*
   * --------------------------------------------------------------------------
   * CREATE CONVERSATION
   * --------------------------------------------------------------------------
   */

  async create(
    title = "New conversation",
  ): Promise<AiConversationRecord> {
    if (backend) {
      try {
        return await request<
          AiConversationRecord
        >(
          "/ai/conversations",
          {
            method: "POST",
            body: JSON.stringify({
              title,
            }),
          },
        );
      } catch (error) {
        console.warn(
          "[FOCKIS AI API] Backend conversation creation failed. Falling back to local storage.",
          error,
        );
      }
    }

    const item: AiConversationRecord = {
      id: crypto.randomUUID(),
      title,
      updatedAt:
        new Date().toISOString(),
      messageCount: 0,
    };

    write([
      item,
      ...read(),
    ]);

    return item;
  },

  /*
   * --------------------------------------------------------------------------
   * RENAME
   * --------------------------------------------------------------------------
   */

  async rename(
    id: string,
    title: string,
  ): Promise<void> {
    if (backend) {
      try {
        await request(
          `/ai/conversations/${encodeURIComponent(
            id,
          )}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              title,
            }),
          },
        );

        return;
      } catch (error) {
        console.warn(
          "[FOCKIS AI API] Backend rename failed. Falling back to local storage.",
          error,
        );
      }
    }

    const value =
      read().map((item) =>
        item.id === id
          ? {
              ...item,
              title,
              updatedAt:
                new Date().toISOString(),
            }
          : item,
      );

    write(value);
  },

  /*
   * --------------------------------------------------------------------------
   * DELETE
   * --------------------------------------------------------------------------
   */

  async remove(
    id: string,
  ): Promise<void> {
    if (backend) {
      try {
        await request(
          `/ai/conversations/${encodeURIComponent(
            id,
          )}`,
          {
            method: "DELETE",
          },
        );

        return;
      } catch (error) {
        console.warn(
          "[FOCKIS AI API] Backend conversation deletion failed. Falling back to local storage.",
          error,
        );
      }
    }

    write(
      read().filter(
        (item) => item.id !== id,
      ),
    );
  },

  /*
   * --------------------------------------------------------------------------
   * TOUCH CONVERSATION
   * --------------------------------------------------------------------------
   */

  async touch(
    id: string,
    count: number,
  ): Promise<void> {
    const value =
      read().map((item) =>
        item.id === id
          ? {
              ...item,
              messageCount: count,
              updatedAt:
                new Date().toISOString(),
            }
          : item,
      );

    if (!backend) {
      write(value);
      return;
    }

    try {
      await request(
        `/ai/conversations/${encodeURIComponent(
          id,
        )}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            messageCount: count,
          }),
        },
      );
    } catch (error) {
      console.warn(
        "[FOCKIS AI API] Backend conversation update failed. Falling back to local storage.",
        error,
      );

      write(value);
    }
  },

  /*
   * --------------------------------------------------------------------------
   * TEXT CHAT
   * --------------------------------------------------------------------------
   *
   * Browser
   *   ↓
   * Fockis JWT
   *   ↓
   * NestJS /admin/ai/vapi/chat
   *   ↓
   * Vapi private API
   *
   * The Vapi private key NEVER reaches this file.
   */

  async chat(
    message: string,
    conversationId?: string,
  ): Promise<FockisAiChatResponse> {
    const trimmed =
      message.trim();

    if (!trimmed) {
      throw new Error(
        "Message cannot be empty.",
      );
    }

    return request<FockisAiChatResponse>(
      "/admin/ai/vapi/chat",
      {
        method: "POST",
        body: JSON.stringify({
          message: trimmed,
          conversationId,
        }),
      },
    );
  },
};

export default fockisAiApi;