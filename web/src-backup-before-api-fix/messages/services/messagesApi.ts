const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");

function getToken(): string | null {
  const keys = [
    "access_token",
    "accessToken",
    "token",
    "jwt",
    "authToken",
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);

    if (value) {
      return value;
    }
  }

  return null;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers,
    },
  );

  const contentType =
    response.headers.get("content-type") || "";

  const body = contentType.includes(
    "application/json",
  )
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body
        ? String(
            (body as { message?: unknown })
              .message ?? "Request failed",
          )
        : typeof body === "string" && body
          ? body
          : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return body as T;
}

function unwrapMessage<T>(
  response: T | { data?: T } | { message?: T },
): T {
  if (
    response &&
    typeof response === "object"
  ) {
    const value = response as {
      data?: T;
      message?: T;
    };

    if (value.data !== undefined) {
      return value.data;
    }

    if (value.message !== undefined) {
      return value.message;
    }
  }

  return response as T;
}

function normalizeMessage(message: any): any {
  if (!message) {
    return message;
  }

  return {
    ...message,

    id: String(
      message.id ??
        message._id ??
        "",
    ),

    conversationId: String(
      message.conversationId,
    ),

    senderId: String(
      message.senderId,
    ),

    createdAt:
      message.createdAt ??
      new Date().toISOString(),

    status:
      message.status ??
      "sent",

    attachments:
      message.attachments ?? [],

    reactions:
      message.reactions ?? [],

    deletedForEveryone:
      Boolean(
        message.deletedForEveryone,
      ),

    deletedForMe:
      Boolean(
        message.deletedForMe,
      ),

    starred:
      Boolean(message.starred),
  };
}

function normalizeMessages(
  response: any,
): any[] {
  let messages: any[] = [];

  if (Array.isArray(response)) {
    messages = response;
  } else if (
    response &&
    Array.isArray(response.messages)
  ) {
    messages = response.messages;
  } else if (
    response?.data &&
    Array.isArray(response.data)
  ) {
    messages = response.data;
  } else if (
    response?.data &&
    Array.isArray(
      response.data.messages,
    )
  ) {
    messages = response.data.messages;
  }

  return messages.map(
    normalizeMessage,
  );
}

export const messagesApi = {
  /* ============================================================
     LIST
  ============================================================ */

  async list(
    conversationId: string,
    options?: {
      limit?: number;
      before?: string;
    },
  ) {
    const params =
      new URLSearchParams();

    if (options?.limit) {
      params.set(
        "limit",
        String(options.limit),
      );
    }

    if (options?.before) {
      params.set(
        "before",
        options.before,
      );
    }

    const query =
      params.toString();

    const response =
      await request<any>(
        `/messages/conversations/${encodeURIComponent(
          conversationId,
        )}/messages${
          query ? `?${query}` : ""
        }`,
      );

    return normalizeMessages(
      response,
    );
  },

  /* ============================================================
     SEND
  ============================================================ */

  async send(message: {
    conversationId: string;
    type: string;
    text?: string;
    attachments?: unknown[];
    replyTo?: unknown;
    systemLabel?: string;
  }) {
    const response =
      await request<any>(
        "/messages",
        {
          method: "POST",
          body: JSON.stringify(
            message,
          ),
        },
      );

    return normalizeMessage(
      unwrapMessage(response),
    );
  },

  /* ============================================================
     EDIT
  ============================================================ */

  async edit(
    conversationId: string,
    messageId: string,
    text: string,
  ) {
    const response =
      await request<any>(
        `/messages/${encodeURIComponent(
          messageId,
        )}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            conversationId,
            text,
          }),
        },
      );

    return normalizeMessage(
      unwrapMessage(response),
    );
  },

  /* ============================================================
     DELETE FOR ME
     
     Backend:
       DELETE /messages/:id
  ============================================================ */

  async deleteForMe(
    conversationId: string,
    messageId: string,
  ) {
    const response =
      await request<any>(
        `/messages/${encodeURIComponent(
          messageId,
        )}`,
        {
          method: "DELETE",
          body: JSON.stringify({
            conversationId,
          }),
        },
      );

    return response;
  },

  /* ============================================================
     DELETE FOR EVERYONE
  ============================================================ */

  async deleteForEveryone(
    conversationId: string,
    messageId: string,
  ) {
    const response =
      await request<any>(
        `/messages/${encodeURIComponent(
          messageId,
        )}/everyone`,
        {
          method: "DELETE",
          body: JSON.stringify({
            conversationId,
          }),
        },
      );

    return normalizeMessage(
      unwrapMessage(response),
    );
  },

  /* ============================================================
     STAR
  ============================================================ */

  async toggleStar(
    conversationId: string,
    messageId: string,
  ) {
    const response =
      await request<any>(
        `/messages/${encodeURIComponent(
          messageId,
        )}/star`,
        {
          method: "POST",
          body: JSON.stringify({
            conversationId,
          }),
        },
      );

    return normalizeMessage(
      unwrapMessage(response),
    );
  },

  /* ============================================================
     REACTION
  ============================================================ */

  async react(
    conversationId: string,
    messageId: string,
    emoji: string,
  ) {
    const response =
      await request<any>(
        `/messages/${encodeURIComponent(
          messageId,
        )}/reactions`,
        {
          method: "POST",
          body: JSON.stringify({
            conversationId,
            emoji,
          }),
        },
      );

    return normalizeMessage(
      unwrapMessage(response),
    );
  },

  /* ============================================================
     DELIVERED
  ============================================================ */

  async markDelivered(
    messageId: string,
  ) {
    return request<any>(
      `/messages/${encodeURIComponent(
        messageId,
      )}/delivered`,
      {
        method: "PATCH",
      },
    );
  },

  /* ============================================================
     READ
  ============================================================ */

  async markRead(
    conversationId: string,
  ) {
    return request<any>(
      `/messages/conversations/${encodeURIComponent(
        conversationId,
      )}/read`,
      {
        method: "PATCH",
      },
    );
  },

  /* ============================================================
     SEARCH
  ============================================================ */

  async search(
    query: string,
    conversationId?: string,
  ) {
    const response =
      await request<any>(
        "/messages/search",
        {
          method: "POST",
          body: JSON.stringify({
            query,
            conversationId,
          }),
        },
      );

    return normalizeMessages(
      response,
    );
  },
};