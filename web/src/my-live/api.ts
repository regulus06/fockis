import { FOCKIS_API_URL } from "../config/fockisConfig";

import type {
  ChatMessage,
  StreamInfo,
  LiveGuestDTO,
  LiveGuestInvitationDTO,
} from "./types";

const BASE = (
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL
).replace(/\/+$/, "");

function getAuthToken(): string | null {
  const keys = [
    "access_token",
    "accessToken",
    "token",
    "jwt",
    "authToken",
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return null;
}

function buildHeaders(
  options: RequestInit = {},
): Headers {
  const headers = new Headers(options.headers);

  if (
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  const token = getAuthToken();

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  headers.set(
    "Accept",
    "application/json",
  );

  return headers;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE}${path}`;
  const token = getAuthToken();

  console.log(
    `[FOCKIS LIVE] ${
      options.method ?? "GET"
    } ${url}`,
  );

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers: buildHeaders(options),
    });
  } catch (error) {
    console.error(
      "[FOCKIS LIVE] Network error:",
      error,
    );

    throw new Error(
      `Unable to connect to Fockis API at ${BASE}. Make sure the NestJS API is running.`,
    );
  }

  const contentType =
    response.headers.get("content-type") || "";

  let body: unknown;

  if (
    contentType.includes(
      "application/json",
    )
  ) {
    body = await response
      .json()
      .catch(() => null);
  } else {
    body = await response
      .text()
      .catch(() => "");
  }

  if (!response.ok) {
    console.error(
      `[FOCKIS LIVE] API ERROR ${response.status}`,
      body,
    );

    let message =
      `LIVE API request failed: ${response.status}`;

    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body
    ) {
      const apiMessage = (
        body as {
          message?: unknown;
        }
      ).message;

      if (Array.isArray(apiMessage)) {
        message = apiMessage
          .map(String)
          .join(", ");
      } else if (
        typeof apiMessage === "string"
      ) {
        message = apiMessage;
      }
    } else if (
      typeof body === "string" &&
      body.trim()
    ) {
      message = body;
    }

    if (response.status === 401) {
      message = token
        ? "Your authentication token is invalid or expired. Please sign in again."
        : "You are not signed in. Please sign in before using Live Studio.";
    }

    throw new Error(message);
  }

  return body as T;
}

async function requestBlob(
  path: string,
): Promise<Response> {
  const url = `${BASE}${path}`;
  const token = getAuthToken();

  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        ...(token
          ? {
              Authorization:
                `Bearer ${token}`,
            }
          : {}),
        Accept: "*/*",
      },
    });
  } catch (error) {
    console.error(
      "[FOCKIS LIVE] Recording download network error:",
      error,
    );

    throw new Error(
      `Unable to connect to Fockis API at ${BASE}.`,
    );
  }

  if (!response.ok) {
    const contentType =
      response.headers.get(
        "content-type",
      ) || "";

    let message =
      `Unable to download recording (${response.status}).`;

    if (
      contentType.includes(
        "application/json",
      )
    ) {
      const body = await response
        .json()
        .catch(() => null);

      if (
        body &&
        typeof body === "object" &&
        "message" in body
      ) {
        const apiMessage = (
          body as {
            message?: unknown;
          }
        ).message;

        if (
          typeof apiMessage ===
          "string"
        ) {
          message = apiMessage;
        }
      }
    }

    throw new Error(message);
  }

  return response;
}

export interface LiveProductDTO {
  productId: string;
  name: string;
  imageUrl?: string;
  price: number;
  salePrice?: number;
}

export interface LiveHostDTO {
  _id?: string;
  id?: string;

  username?: string;

  firstName?: string;
  lastName?: string;

  displayName?: string;
  name?: string;

  profilePicture?: string;
  avatar?: string;
}

export interface LiveStreamDTO {
  _id: string;
  id?: string;

  hostId?: string;

  roomName?: string;

  title?: string;
  description?: string;
  category?: string;

  thumbnailUrl?: string | null;

  status?: string;

  visibility?:
    | "public"
    | "private"
    | "followers"
    | "friends"
    | "invite-only"
    | string;

  products?: LiveProductDTO[];

  viewerCount?: number;
  currentViewers?: number;

  peakViewerCount?: number;
  peakViewers?: number;

  likeCount?: number;
  commentCount?: number;
  shareCount?: number;

  newFollowers?: number;

  startedAt?: string | null;
  endedAt?: string | null;

  createdAt?: string;
  updatedAt?: string;

  host?: LiveHostDTO;

  user?: LiveHostDTO;
  creator?: LiveHostDTO;
  owner?: LiveHostDTO;

  hostUsername?: string;
  hostName?: string;
  hostAvatar?: string;

  likes?: number;
  comments?: number;
  shares?: number;

  recordingUrl?: string;
  replayUrl?: string;

  [key: string]: unknown;
}

export interface LiveJoinDTO {
  stream: LiveStreamDTO;

  token: string;
  serverUrl: string;

  role: "host" | "guest" | "viewer";

  viewerCount?: number;
  peakViewerCount?: number;
}

export interface LiveCommentDTO {
  id: string;
  _id?: string;

  streamId: string;
  userId: string;

  message: string;

  userName: string;
  userAvatar?: string;

  createdAt: string;
}

export interface UserProfileDTO {
  _id?: string;
  id?: string;

  username?: string;

  firstName?: string;
  lastName?: string;

  displayName?: string;

  profilePicture?: string;
  avatar?: string;

  [key: string]: unknown;
}

export interface UserByIdDTO {
  _id?: string;
  id?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  name?: string;
  profilePicture?: string;
  avatar?: string;
  [key: string]: unknown;
}

function normalizeLiveGuest(
  guest: LiveGuestDTO,
): LiveGuestDTO {
  return {
    ...guest,
    id: String(
      guest.id ??
        (guest as { _id?: unknown })._id ??
        "",
    ),
    streamId: String(
      guest.streamId ?? "",
    ),
    hostId: String(
      guest.hostId ?? "",
    ),
    guestUserId: String(
      guest.guestUserId ?? "",
    ),
    message:
      typeof guest.message === "string"
        ? guest.message
        : "",
  };
}

function normalizeLiveGuestList(
  value: unknown,
): LiveGuestDTO[] {
  const items = Array.isArray(value)
    ? value
    : (
        value &&
        typeof value === "object" &&
        Array.isArray(
          (value as { data?: unknown }).data,
        )
      )
      ? (value as { data: unknown[] }).data
      : [];

  return items
    .filter(
      (item): item is LiveGuestDTO =>
        !!item &&
        typeof item === "object",
    )
    .map((item) =>
      normalizeLiveGuest(
        item as LiveGuestDTO,
      ),
    );
}

function encodeId(
  id: string,
): string {
  return encodeURIComponent(id);
}

function requireId(
  id: string | null | undefined,
): string {
  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new Error(
      "LIVE session ID is missing.",
    );
  }

  return id.trim();
}

function firstString(
  ...values: unknown[]
): string | undefined {
  for (const value of values) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return undefined;
}

function getHost(
  stream: LiveStreamDTO,
): LiveHostDTO | undefined {
  const candidates = [
    stream.host,
    stream.user,
    stream.creator,
    stream.owner,
  ];

  for (const candidate of candidates) {
    if (
      candidate &&
      typeof candidate === "object"
    ) {
      return candidate;
    }
  }

  return undefined;
}

function getHostUsername(
  stream: LiveStreamDTO,
): string | undefined {
  const host = getHost(stream);

  return firstString(
    stream.hostUsername,

    host?.username,

    (
      stream as {
        username?: unknown;
      }
    ).username,
  );
}

function getHostName(
  stream: LiveStreamDTO,
): string | undefined {
  const host = getHost(stream);

  const firstName = firstString(
    host?.firstName,
  );

  const lastName = firstString(
    host?.lastName,
  );

  const fullName = [
    firstName,
    lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return firstString(
    stream.hostName,

    host?.displayName,
    host?.name,

    fullName,

    host?.username,

    getHostUsername(stream),
  );
}

function getHostAvatar(
  stream: LiveStreamDTO,
): string | undefined {
  const host = getHost(stream);

  return firstString(
    stream.hostAvatar,

    host?.profilePicture,
    host?.avatar,
  );
}

function getViewerCount(
  stream: LiveStreamDTO,
): number {
  const values = [
    stream.viewerCount,
    stream.currentViewers,

    (
      stream as {
        viewers?: unknown;
      }
    ).viewers,

    (
      stream as {
        viewersCount?: unknown;
      }
    ).viewersCount,

    (
      stream as {
        liveViewerCount?: unknown;
      }
    ).liveViewerCount,
  ];

  for (const value of values) {
    const number = Number(value);

    if (
      Number.isFinite(number) &&
      number >= 0
    ) {
      return Math.floor(number);
    }
  }

  return 0;
}

function getPeakViewerCount(
  stream: LiveStreamDTO,
): number {
  const values = [
    stream.peakViewerCount,
    stream.peakViewers,

    (
      stream as {
        maxViewers?: unknown;
      }
    ).maxViewers,
  ];

  for (const value of values) {
    const number = Number(value);

    if (
      Number.isFinite(number) &&
      number >= 0
    ) {
      return Math.floor(number);
    }
  }

  return 0;
}

function normalizeLiveStream(
  stream: LiveStreamDTO,
): LiveStreamDTO {
  const id =
    stream.id ||
    stream._id;

  const viewerCount =
    getViewerCount(stream);

  const peakViewerCount =
    getPeakViewerCount(stream);

  const likeCount = Number(
    stream.likeCount ??
      stream.likes ??
      0,
  );

  const commentCount = Number(
    stream.commentCount ??
      stream.comments ??
      0,
  );

  const shareCount = Number(
    stream.shareCount ??
      stream.shares ??
      0,
  );

  const hostUsername =
    getHostUsername(stream);

  const hostName =
    getHostName(stream);

  const hostAvatar =
    getHostAvatar(stream);

  const normalized: LiveStreamDTO = {
    ...stream,

    id,

    hostUsername,
    hostName,
    hostAvatar,

    viewerCount:
      Number.isFinite(viewerCount)
        ? Math.max(
            0,
            viewerCount,
          )
        : 0,

    currentViewers:
      Number.isFinite(viewerCount)
        ? Math.max(
            0,
            viewerCount,
          )
        : 0,

    peakViewerCount:
      Number.isFinite(
        peakViewerCount,
      )
        ? Math.max(
            0,
            peakViewerCount,
          )
        : 0,

    peakViewers:
      Number.isFinite(
        peakViewerCount,
      )
        ? Math.max(
            0,
            peakViewerCount,
          )
        : 0,

    likeCount:
      Number.isFinite(likeCount)
        ? Math.max(
            0,
            likeCount,
          )
        : 0,

    commentCount:
      Number.isFinite(
        commentCount,
      )
        ? Math.max(
            0,
            commentCount,
          )
        : 0,

    shareCount:
      Number.isFinite(shareCount)
        ? Math.max(
            0,
            shareCount,
          )
        : 0,
  };

  console.log(
    "[FOCKIS LIVE] Normalized stream:",
    {
      id: normalized.id,
      hostName:
        normalized.hostName,
      hostUsername:
        normalized.hostUsername,
      viewerCount:
        normalized.viewerCount,
      peakViewerCount:
        normalized.peakViewerCount,
    },
  );

  return normalized;
}

function normalizeLiveList(
  result: unknown,
): LiveStreamDTO[] {
  let streams: unknown[] = [];

  if (Array.isArray(result)) {
    streams = result;
  } else if (
    typeof result === "object" &&
    result !== null
  ) {
    const value = result as {
      streams?: unknown;
      data?: unknown;
      items?: unknown;
    };

    if (
      Array.isArray(
        value.streams,
      )
    ) {
      streams = value.streams;
    } else if (
      Array.isArray(
        value.data,
      )
    ) {
      streams = value.data;
    } else if (
      Array.isArray(
        value.items,
      )
    ) {
      streams = value.items;
    }
  }

  return streams
    .filter(
      (
        item,
      ): item is LiveStreamDTO =>
        typeof item === "object" &&
        item !== null &&
        (
          typeof (
            item as LiveStreamDTO
          )._id === "string" ||
          typeof (
            item as LiveStreamDTO
          ).id === "string"
        ),
    )
    .map(normalizeLiveStream);
}

function isPublicLive(
  stream: LiveStreamDTO,
): boolean {
  const status = String(
    stream.status || "",
  )
    .trim()
    .toLowerCase();

  const visibility = String(
    stream.visibility || "public",
  )
    .trim()
    .toLowerCase();

  const liveStatuses = [
    "live",
    "active",
    "broadcasting",
    "started",
    "ongoing",
  ];

  const privateVisibility = [
    "private",
    "followers",
    "friends",
    "invite-only",
    "invite_only",
    "inviteonly",
  ];

  if (
    !liveStatuses.includes(status)
  ) {
    return false;
  }

  if (
    privateVisibility.includes(
      visibility,
    )
  ) {
    return false;
  }

  return true;
}

export const api = {
  getMyProfile:
    async (): Promise<UserProfileDTO> =>
      request<UserProfileDTO>(
        "/users/me/profile",
      ),

  searchUsers:
    async (query: string): Promise<UserByIdDTO[]> => {
      const value = String(query || "").trim();

      if (!value) {
        return [];
      }

      const result = await request<unknown>(
        `/users/search?q=${encodeURIComponent(value)}`,
      );

      const items = Array.isArray(result)
        ? result
        : result && typeof result === "object"
          ? (result as { users?: unknown; data?: unknown; items?: unknown }).users ??
            (result as { data?: unknown }).data ??
            (result as { items?: unknown }).items ??
            []
          : [];

      return (Array.isArray(items) ? items : [])
        .filter(
          (item): item is UserByIdDTO =>
            !!item && typeof item === "object",
        )
        .map((item) => ({
          ...item,
          id: String(item.id ?? item._id ?? ""),
          _id: String(item._id ?? item.id ?? ""),
        }))
        .filter((item) => Boolean(item.id));
    },

  getFollowers:
    async (userId: string): Promise<UserByIdDTO[]> => {
      const id = requireId(userId);
      const result = await request<unknown>(
        `/follows/${encodeId(id)}/followers?limit=100`,
      );

      const rawItems =
        result && typeof result === "object"
          ? (result as { items?: unknown }).items ??
            (result as { data?: unknown }).data ??
            []
          : [];

      return (Array.isArray(rawItems) ? rawItems : [])
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as Record<string, unknown>;
          const user =
            record.followerId && typeof record.followerId === "object"
              ? record.followerId as Record<string, unknown>
              : record;
          const idValue = user._id ?? user.id;
          if (!idValue) return null;
          return {
            ...user,
            id: String(idValue),
            _id: String(user._id ?? idValue),
            profilePicture: String(
              user.profilePicture ?? user.profileImage ?? user.avatar ?? "",
            ),
            avatar: String(
              user.avatar ?? user.profileImage ?? user.profilePicture ?? "",
            ),
            displayName: String(
              user.displayName ??
                user.name ??
                [user.firstName, user.lastName].filter(Boolean).join(" ") ??
                user.username ??
                "Fockis User",
            ),
          } as UserByIdDTO;
        })
        .filter((item): item is UserByIdDTO => Boolean(item));
    },

  getUserById:
    async (userId: string): Promise<UserByIdDTO> => {
      const id = String(userId || "").trim();

      if (!id) {
        throw new Error("User ID is required.");
      }

      return request<UserByIdDTO>(
        `/users/${encodeURIComponent(id)}`,
      );
    },

  getPublicLiveStreams:
    async (): Promise<
      LiveStreamDTO[]
    > => {
      const result =
        await request<unknown>(
          "/live/public",
        );

      const streams =
        normalizeLiveList(result)
          .filter(isPublicLive)
          .slice(0, 20);

      console.log(
        `[FOCKIS LIVE] Public live streams: ${streams.length}`,
      );

      return streams;
    },

  startSession:
    async (
      streamInfo: StreamInfo,
    ): Promise<LiveStreamDTO> => {
      const title =
        typeof streamInfo.title ===
        "string"
          ? streamInfo.title.trim()
          : "";

      if (!title) {
        throw new Error(
          "Please enter a title for your LIVE stream.",
        );
      }

      const description =
        typeof streamInfo.description ===
        "string"
          ? streamInfo.description.trim()
          : "";

      const category =
        typeof streamInfo.category ===
        "string"
          ? streamInfo.category.trim()
          : "";

      const thumbnailUrl =
        typeof streamInfo.thumbnailUrl ===
        "string"
          ? streamInfo.thumbnailUrl.trim()
          : "";

      const payload = {
        title,

        ...(description
          ? { description }
          : {}),

        ...(category
          ? { category }
          : {}),

        ...(thumbnailUrl
          ? { thumbnailUrl }
          : {}),
      };

      const result =
        await request<LiveStreamDTO>(
          "/live",
          {
            method: "POST",
            body: JSON.stringify(
              payload,
            ),
          },
        );

      return normalizeLiveStream(
        result,
      );
    },

  joinSession:
    async (
      sessionId: string,
    ): Promise<LiveJoinDTO> => {
      const id =
        requireId(sessionId);

      const result =
        await request<LiveJoinDTO>(
          `/live/${encodeId(id)}/join`,
          {
            method: "POST",
          },
        );

      if (result?.stream) {
        result.stream =
          normalizeLiveStream(
            result.stream,
          );
      }

      if (
        result &&
        typeof result.viewerCount !==
          "number" &&
        result.stream
      ) {
        result.viewerCount =
          result.stream.viewerCount;
      }

      if (
        result &&
        typeof result.peakViewerCount !==
          "number" &&
        result.stream
      ) {
        result.peakViewerCount =
          result.stream.peakViewerCount;
      }

      console.log(
        "[FOCKIS LIVE] Joined stream:",
        {
          id,
          host:
            result.stream?.hostName,
          username:
            result.stream?.hostUsername,
          viewerCount:
            result.viewerCount ??
            result.stream?.viewerCount ??
            0,
        },
      );

      return result;
    },

  endSession:
    async (
      sessionId: string,
    ): Promise<LiveStreamDTO> => {
      const id =
        requireId(sessionId);

      const result =
        await request<LiveStreamDTO>(
          `/live/${encodeId(id)}/end`,
          {
            method: "POST",
          },
        );

      return normalizeLiveStream(
        result,
      );
    },

  deleteSession:
    async (
      sessionId: string,
    ): Promise<{
      deleted: boolean;
      id: string;
    }> => {
      const id =
        requireId(sessionId);

      const result =
        await request<{
          deleted: boolean;
          id?: string;
          _id?: string;
          message?: string;
        }>(
          `/live/${encodeId(id)}`,
          {
            method: "DELETE",
          },
        );

      const deleted =
        result?.deleted === true;

      const deletedId =
        result?.id ||
        result?._id ||
        id;

      if (!deleted) {
        throw new Error(
          result?.message ||
            "The LIVE stream was not deleted by the API.",
        );
      }

      return {
        deleted: true,
        id: deletedId,
      };
    },

  downloadRecording:
    async (
      sessionId: string,
    ): Promise<void> => {
      const id =
        requireId(sessionId);

      const response =
        await requestBlob(
          `/live/${encodeId(id)}/recording`,
        );

      const blob =
        await response.blob();

      const contentDisposition =
        response.headers.get(
          "content-disposition",
        );

      let filename =
        `fockis-live-${id}.webm`;

      if (contentDisposition) {
        const match =
          contentDisposition.match(
            /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i,
          );

        if (match?.[1]) {
          filename =
            decodeURIComponent(
              match[1],
            );
        }
      }

      const objectUrl =
        window.URL.createObjectURL(
          blob,
        );

      const anchor =
        document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = filename;

      document.body.appendChild(
        anchor,
      );

      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(
          objectUrl,
        );
      }, 1000);
    },

  // ==========================================================================
  // LIVE GUESTS
  // ==========================================================================

  inviteGuest:
    async (
      sessionId: string,
      guestUserId: string,
      message?: string,
    ): Promise<LiveGuestDTO> => {
      const id = requireId(sessionId);
      const guestId = requireId(guestUserId);

      const payload = {
        guestUserId: guestId,
        ...(message?.trim()
          ? { message: message.trim() }
          : {}),
      };

      const result =
        await request<LiveGuestDTO>(
          `/live/${encodeId(id)}/guests/invite`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );

      return normalizeLiveGuest(result);
    },

  getLiveGuests:
    async (
      sessionId: string,
    ): Promise<LiveGuestDTO[]> => {
      const id = requireId(sessionId);

      const result =
        await request<unknown>(
          `/live/${encodeId(id)}/guests`,
        );

      return normalizeLiveGuestList(result);
    },

  getGuestInvitations:
    async (): Promise<LiveGuestInvitationDTO[]> => {
      const result =
        await request<unknown>(
          "/live/guests/invitations",
        );

      return normalizeLiveGuestList(
        result,
      ) as LiveGuestInvitationDTO[];
    },

  respondToGuestInvitation:
    async (
      invitationId: string,
      status: "accepted" | "declined",
    ): Promise<LiveGuestDTO> => {
      const id = requireId(invitationId);

      if (
        status !== "accepted" &&
        status !== "declined"
      ) {
        throw new Error(
          "Guest invitation response is invalid.",
        );
      }

      const result =
        await request<LiveGuestDTO>(
          `/live/guests/${encodeId(id)}/respond`,
          {
            method: "POST",
            body: JSON.stringify({ status }),
          },
        );

      return normalizeLiveGuest(result);
    },

  removeGuest:
    async (
      sessionId: string,
      guestUserId: string,
    ): Promise<LiveGuestDTO> => {
      const id = requireId(sessionId);
      const guestId = requireId(guestUserId);

      const result =
        await request<LiveGuestDTO>(
          `/live/${encodeId(id)}/guests/${encodeId(
            guestId,
          )}`,
          {
            method: "DELETE",
          },
        );

      return normalizeLiveGuest(result);
    },

  connectGuest:
    async (
      sessionId: string,
    ): Promise<LiveGuestDTO> => {
      const id = requireId(sessionId);

      const result =
        await request<LiveGuestDTO>(
          `/live/${encodeId(id)}/guests/connect`,
          {
            method: "POST",
          },
        );

      return normalizeLiveGuest(result);
    },

  leaveGuest:
    async (
      sessionId: string,
    ): Promise<LiveGuestDTO> => {
      const id = requireId(sessionId);

      const result =
        await request<LiveGuestDTO>(
          `/live/${encodeId(id)}/guests/leave`,
          {
            method: "POST",
          },
        );

      return normalizeLiveGuest(result);
    },

  getSession:
    async (
      sessionId: string,
    ): Promise<LiveStreamDTO> => {
      const id =
        requireId(sessionId);

      const result =
        await request<LiveStreamDTO>(
          `/live/${encodeId(id)}`,
        );

      return normalizeLiveStream(
        result,
      );
    },

  getMyLiveStreams:
    async (): Promise<
      LiveStreamDTO[]
    > => {
      const result =
        await request<unknown>(
          "/live/mine",
        );

      return normalizeLiveList(
        result,
      );
    },

  getMyStreams:
    async (): Promise<
      LiveStreamDTO[]
    > =>
      api.getMyLiveStreams(),

  discover:
    async (
      category?: string,
    ): Promise<
      LiveStreamDTO[]
    > => {
      const normalized =
        category?.trim();

      const query = normalized
        ? `?category=${encodeURIComponent(
            normalized,
          )}`
        : "";

      const result =
        await request<unknown>(
          `/live${query}`,
        );

      return normalizeLiveList(
        result,
      );
    },

  trending:
    async (): Promise<
      LiveStreamDTO[]
    > => {
      const result =
        await request<unknown>(
          "/live/trending",
        );

      return normalizeLiveList(
        result,
      );
    },

  shareSession:
    async (
      sessionId: string,
    ): Promise<{
      shareCount: number;
    }> => {
      const id =
        requireId(sessionId);

      return request<{
        shareCount: number;
      }>(
        `/live/${encodeId(id)}/share`,
        {
          method: "POST",
        },
      );
    },

  likeSession:
    async (
      sessionId: string,
      amount = 1,
    ): Promise<{
      likeCount: number;
    }> => {
      const id =
        requireId(sessionId);

      const safeAmount =
        Math.max(
          1,
          Math.floor(
            Number(amount) || 1,
          ),
        );

      return request<{
        likeCount: number;
      }>(
        `/live/${encodeId(id)}/like`,
        {
          method: "POST",
          body: JSON.stringify({
            amount: safeAmount,
          }),
        },
      );
    },

  setViewerCount:
    async (
      sessionId: string,
      count: number,
    ): Promise<{
      viewerCount: number;
      peakViewerCount: number;
    }> => {
      const id =
        requireId(sessionId);

      const safeCount =
        Math.max(
          0,
          Math.floor(
            Number(count) || 0,
          ),
        );

      return request<{
        viewerCount: number;
        peakViewerCount: number;
      }>(
        `/live/${encodeId(id)}/viewers`,
        {
          method: "POST",
          body: JSON.stringify({
            count: safeCount,
          }),
        },
      );
    },

  incrementCommentCount:
    async (
      sessionId: string,
    ): Promise<{
      commentCount: number;
    }> => {
      const id =
        requireId(sessionId);

      return request<{
        commentCount: number;
      }>(
        `/live/${encodeId(id)}/comment-count`,
        {
          method: "POST",
        },
      );
    },

  getChatMessages:
    async (
      sessionId: string,
    ): Promise<ChatMessage[]> => {
      const id =
        requireId(sessionId);

      const result =
        await request<
          LiveCommentDTO[]
        >(
          `/live/${encodeId(id)}/comments`,
        );

      if (!Array.isArray(result)) {
        return [];
      }

      return result.map(
        (item) => ({
          id:
            item.id ||
            item._id ||
            crypto.randomUUID(),

          username:
            item.userName ||
            "Fockis User",

          message:
            item.message,

          timestamp:
            formatTimestamp(
              item.createdAt,
            ),

          avatarTone:
            "signal",
        }),
      );
    },

  postChatMessage:
    async (
      sessionId: string,
      message: ChatMessage,
    ): Promise<ChatMessage> => {
      const id =
        requireId(sessionId);

      const text =
        message.message.trim();

      if (!text) {
        throw new Error(
          "Chat message cannot be empty.",
        );
      }

      const result =
        await request<
          LiveCommentDTO
        >(
          `/live/${encodeId(id)}/comments`,
          {
            method: "POST",
            body: JSON.stringify({
              message: text,
            }),
          },
        );

      return {
        id:
          result.id ||
          result._id ||
          message.id,

        username:
          result.userName ||
          message.username ||
          "Fockis User",

        message:
          result.message,

        timestamp:
          formatTimestamp(
            result.createdAt,
          ),

        avatarTone:
          message.avatarTone ||
          "signal",

        isModerator:
          message.isModerator,
      };
    },

  addProduct:
    async (
      sessionId: string,
      product: LiveProductDTO,
    ): Promise<LiveStreamDTO> => {
      const id =
        requireId(sessionId);

      const result =
        await request<LiveStreamDTO>(
          `/live/${encodeId(id)}/products`,
          {
            method: "POST",
            body: JSON.stringify(
              product,
            ),
          },
        );

      return normalizeLiveStream(
        result,
      );
    },

  removeProduct:
    async (
      sessionId: string,
      productId: string,
    ): Promise<LiveStreamDTO> => {
      const id =
        requireId(sessionId);

      const product =
        requireId(productId);

      const result =
        await request<LiveStreamDTO>(
          `/live/${encodeId(
            id,
          )}/products/${encodeId(
            product,
          )}`,
          {
            method: "DELETE",
          },
        );

      return normalizeLiveStream(
        result,
      );
    },
};

export const liveApi = api;

function formatTimestamp(
  value?: string,
): string {
  if (!value) {
    return "now";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "now";
  }

  const seconds =
    Math.floor(
      (Date.now() -
        date.getTime()) /
        1000,
    );

  if (seconds < 10) {
    return "now";
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes =
    Math.floor(
      seconds / 60,
    );

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  if (hours < 24) {
    return `${hours}h`;
  }

  return `${Math.floor(
    hours / 24,
  )}d`;
}