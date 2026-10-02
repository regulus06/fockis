const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

function getToken(): string | null {
  return (
    localStorage.getItem(
      "access_token",
    ) ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("authToken")
  );
}

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

  if (
    !headers.has(
      "Content-Type",
    ) &&
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

  const response =
    await fetch(
      `${API_BASE}${path}`,
      {
        ...options,
        headers,
      },
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      text ||
        `Request failed with ${response.status}`,
    );
  }

  if (
    response.status === 204
  ) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const messagesStoriesApi =
  {
    async getStories() {
      return request(
        "/messages/stories",
      );
    },

    async getMyProfile() {
      return request(
        "/messages/profile",
      );
    },

    async createStory(
      formData: FormData,
    ) {
      return request(
        "/messages/stories",
        {
          method: "POST",
          body: formData,
        },
      );
    },

    async markSeen(
      storyId: string,
    ) {
      return request(
        `/messages/stories/${storyId}/seen`,
        {
          method: "POST",
        },
      );
    },

    async deleteStory(
      storyId: string,
    ) {
      return request(
        `/messages/stories/${storyId}`,
        {
          method: "DELETE",
        },
      );
    },
  };