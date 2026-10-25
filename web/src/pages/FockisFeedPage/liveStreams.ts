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

const ACTIVE_STATUSES = new Set(["live", "active", "started"]);

export function getLiveAuthToken(): string {
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

/**
 * Only active, public streams belong in the feed's Live Now section.
 * Ended, private and followers-only streams are excluded.
 */
export function isActivePublicLiveStream(
  stream: PublicLiveStream,
): boolean {
  const status = String(stream.status || "").toLowerCase();
  const visibility = String(stream.visibility || "").toLowerCase();

  const publicStream =
    stream.isPublic !== false &&
    visibility !== "private" &&
    visibility !== "followers";

  return publicStream && ACTIVE_STATUSES.has(status);
}

/**
 * Accepts a stream from the REST API or a socket event. Returns null when
 * it has no usable ID.
 */
export function normalizePublicLiveStream(
  value: unknown,
): PublicLiveStream | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const id = String(raw.id ?? raw._id ?? "").trim();

  if (!id) {
    return null;
  }

  return {
    ...(raw as unknown as PublicLiveStream),
    id,
    title: String(raw.title ?? ""),
  };
}

/**
 * Loads the active public streams. Throws on network or HTTP errors so
 * callers can keep what they already show instead of clearing it.
 */
export async function fetchPublicLiveStreams(
  signal?: AbortSignal,
): Promise<PublicLiveStream[]> {
  const apiUrl = FOCKIS_API_URL.replace(/\/+$/, "");
  const endpoint = `${apiUrl}/live/public`;
  const token = getLiveAuthToken();

  const response = await fetch(endpoint, {
    method: "GET",
    credentials: "include",
    signal,
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
    throw new Error(`Live API returned ${response.status}`);
  }

  const payload = await response.json();

  const raw: unknown[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.streams)
      ? payload.streams
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  const seen = new Set<string>();
  const streams: PublicLiveStream[] = [];

  for (const item of raw) {
    const stream = normalizePublicLiveStream(item);

    if (
      stream &&
      !seen.has(stream.id) &&
      isActivePublicLiveStream(stream)
    ) {
      seen.add(stream.id);
      streams.push(stream);
    }
  }

  return streams;
}

/** Same as fetchPublicLiveStreams, but resolves to [] on any error. */
export async function getPublicLiveStreams(): Promise<
  PublicLiveStream[]
> {
  try {
    return await fetchPublicLiveStreams();
  } catch (error) {
    console.error(
      "[FockisFeedPage] Failed to load public live streams:",
      error,
    );

    return [];
  }
}