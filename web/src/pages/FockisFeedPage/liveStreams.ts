import { FOCKIS_API_URL } from "../../config/fockisConfig";

export interface PublicLiveStream {
  id: string;
  title: string;
  description?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  avatar?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  viewers?: number;
  likes?: number;
  status?: string;
  visibility?: string;
  isPublic?: boolean;
  userId?: string;
  creatorId?: string;
}

function getLiveAuthToken(): string {
  const keys = [
    "accessToken",
    "access_token",
    "token",
    "jwt",
    "authToken",
    "fockis_token",
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);

    if (value) {
      return value
        .replace(/^Bearer\s+/i, "")
        .trim();
    }
  }

  return "";
}

export async function getPublicLiveStreams(): Promise<
  PublicLiveStream[]
> {
  const apiUrl = FOCKIS_API_URL.replace(/\/+$/, "");
  const endpoint = `${apiUrl}/live/public`;
  const token = getLiveAuthToken();

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
    });

    if (!response.ok) {
      console.warn(
        `[FockisFeedPage] Live API returned ${response.status}`,
      );

      return [];
    }

    const payload = await response.json();

    const raw = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.streams)
        ? payload.streams
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.filter(
      (stream: PublicLiveStream) => {
        const status = String(
          stream.status || "",
        ).toLowerCase();

        const visibility = String(
          stream.visibility || "",
        ).toLowerCase();

        const publicStream =
          stream.isPublic !== false &&
          visibility !== "private" &&
          visibility !== "followers";

        const active =
          status === "live" ||
          status === "active" ||
          status === "started";

        return publicStream && active;
      },
    );
  } catch (error) {
    console.error(
      "[FockisFeedPage] Failed to load public live streams:",
      error,
    );

    return [];
  }
}