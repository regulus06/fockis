import { FOCKIS_API_URL } from "../../../config/fockisConfig";
import type {
  CreateEventInput,
  EventAttendeesResponse,
  EventDiscoverQuery,
  EventPage,
  EventPerson,
  EventRsvpStatus,
  EventSections,
  FockisEvent,
  RsvpResponse,
  UpdateEventInput,
  ViewerLocation,
} from "../types/event.types";
import { localDayStartIso, viewerTimeZone } from "../utils/eventTime";

/* ============================================================================
   EVENTS API
   Thin client for apps/api/src/events. Every request:
   - sends the Fockis JWT,
   - opts out of HTTP caching (the server also sends no-store), so an event
     that ended or was cancelled is never served from a stale cache,
   - accepts an AbortSignal so pages can drop superseded requests.
============================================================================ */

const API_BASE = String(import.meta.env.VITE_API_URL || FOCKIS_API_URL).replace(/\/+$/, "");
const EVENTS_URL = `${API_BASE}/events`;

const getToken = () => {
  if (typeof localStorage === "undefined") return null;

  try {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("access_token")
    );
  } catch {
    return null;
  }
};

export class EventsApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "EventsApiError";
    this.status = status;
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  const token = getToken();

  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const body = await response.json();
      const raw = body?.message ?? body?.error;

      message = Array.isArray(raw) ? raw.join(" ") : raw || message;
    } catch {
      // Keep the generic message.
    }

    throw new EventsApiError(String(message), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/* ============================================================================
   NORMALIZATION
============================================================================ */

function person(raw: any): EventPerson | null {
  if (!raw) return null;

  return {
    id: String(raw.id ?? raw._id ?? ""),
    username: String(raw.username ?? ""),
    name: String(raw.name ?? raw.username ?? ""),
    avatar: String(raw.avatar ?? raw.profilePicture ?? ""),
    verified: Boolean(raw.verified),
    ...(raw.isOrganizer !== undefined ? { isOrganizer: Boolean(raw.isOrganizer) } : {}),
    ...(raw.isFriend !== undefined ? { isFriend: Boolean(raw.isFriend) } : {}),
  };
}

export function normalizeEvent(raw: any): FockisEvent {
  const id = String(raw?.id ?? raw?._id ?? "");

  if (!id) throw new Error("Events API returned an event without an ID.");

  const attendeeCount = Number(raw?.attendeeCount ?? raw?.attendeeIds?.length ?? 0);
  const capacity = typeof raw?.capacity === "number" && raw.capacity > 0 ? raw.capacity : null;
  const isGoing = Boolean(raw?.isGoing);
  const isInterested = Boolean(raw?.isInterested);

  return {
    id,
    creatorId: String(raw?.creatorId?._id ?? raw?.creatorId?.id ?? raw?.creatorId ?? ""),
    organizer: person(raw?.organizer),
    title: String(raw?.title ?? ""),
    description: raw?.description ?? "",
    category: raw?.category ?? "general",
    visibility: raw?.visibility ?? "public",
    startDate: String(raw?.startDate ?? ""),
    endDate: String(raw?.endDate ?? ""),
    timeZone: String(raw?.timeZone ?? ""),
    locationName: raw?.locationName ?? "",
    address: raw?.address ?? "",
    latitude: typeof raw?.latitude === "number" ? raw.latitude : null,
    longitude: typeof raw?.longitude === "number" ? raw.longitude : null,
    isOnline: Boolean(raw?.isOnline),
    onlineUrl: raw?.onlineUrl ?? "",
    coverImageUrl: raw?.coverImageUrl ?? "",
    coverVideoUrl: raw?.coverVideoUrl ?? "",
    coverMediaType: raw?.coverMediaType ?? "image",
    attendeeCount,
    interestedCount: Number(raw?.interestedCount ?? 0),
    capacity,
    spotsLeft:
      typeof raw?.spotsLeft === "number"
        ? raw.spotsLeft
        : capacity === null
          ? null
          : Math.max(0, capacity - attendeeCount),
    isFull: Boolean(raw?.isFull),
    isGoing,
    isInterested,
    isInvited: Boolean(raw?.isInvited),
    viewerRsvp: raw?.viewerRsvp ?? (isGoing ? "going" : isInterested ? "interested" : null),
    isOwner: Boolean(raw?.isOwner),
    status: raw?.status ?? (raw?.isCancelled ? "cancelled" : "upcoming"),
    isCancelled: Boolean(raw?.isCancelled),
    cancelledAt: raw?.cancelledAt ?? null,
    cancellationReason: raw?.cancellationReason ?? "",
    canRsvp: raw?.canRsvp !== undefined ? Boolean(raw.canRsvp) : !raw?.isCancelled,
    ...(typeof raw?.distanceKm === "number" ? { distanceKm: raw.distanceKm } : {}),
    createdAt: String(raw?.createdAt ?? ""),
    updatedAt: String(raw?.updatedAt ?? ""),
  };
}

function list(payload: any): FockisEvent[] {
  const values = Array.isArray(payload) ? payload : payload?.items ?? payload?.events;

  if (!Array.isArray(values)) {
    throw new Error("Events API returned an unexpected list response.");
  }

  return values.map(normalizeEvent);
}

function rsvp(payload: any): RsvpResponse {
  const going = Boolean(payload?.going);
  const interested = Boolean(payload?.interested);

  return {
    success: payload?.success !== false,
    eventId: payload?.eventId,
    status: payload?.status ?? (going ? "going" : interested ? "interested" : null),
    going,
    interested,
    attendeeCount: Number(payload?.attendeeCount ?? 0),
    interestedCount: Number(payload?.interestedCount ?? 0),
  };
}

/* ============================================================================
   BODIES
============================================================================ */

function serialize(input: CreateEventInput | UpdateEventInput): BodyInit {
  const values = input as Record<string, unknown>;
  const image = values.coverImageFile;
  const video = values.eventVideoFile;
  const hasImage = typeof File !== "undefined" && image instanceof File;
  const hasVideo = typeof File !== "undefined" && video instanceof File;

  if (hasImage || hasVideo) {
    const data = new FormData();

    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined || key === "coverImageFile" || key === "eventVideoFile") return;
      if (typeof File !== "undefined" && value instanceof File) return;

      // The API reads the string "null" as an explicit clear.
      data.append(key, value === null ? "null" : String(value));
    });

    if (hasImage) data.append("coverImageFile", image as File);
    if (hasVideo) data.append("eventVideoFile", video as File);

    return data;
  }

  const json: Record<string, unknown> = {};

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined) return;
    if (key === "coverImageFile" || key === "eventVideoFile") return;
    if (typeof File !== "undefined" && value instanceof File) return;

    json[key] = value;
  });

  return JSON.stringify(json);
}

function query(params: Record<string, unknown>): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "any") return;
    search.set(key, String(value));
  });

  const text = search.toString();

  return text ? `?${text}` : "";
}

const path = (id: string) => `${EVENTS_URL}/${encodeURIComponent(id)}`;

/**
 * Fetch events associated with an organization.
 *
 * IMPORTANT:
 * Confirm that GET /events/organization/:organizationId
 * is implemented by your NestJS backend. If your controller
 * uses a different route, update this URL to match it.
 */
export async function getOrganizationEvents(
  organizationId: string,
): Promise<FockisEvent[]> {
  if (!organizationId?.trim()) {
    throw new Error("Organization ID is required.");
  }

  const url = `${EVENTS_URL}/organization/${encodeURIComponent(
    organizationId,
  )}`;

  return list(await request<unknown>(url));
}

/* ============================================================================
   API
============================================================================ */

export const eventsApi = {
  /** Active events (ended ones only with includeEnded). */
  async getAll(options: { includeEnded?: boolean; signal?: AbortSignal } = {}) {
    return list(
      await request<any>(
        `${EVENTS_URL}${options.includeEnded ? "?includeEnded=true" : ""}`,
        { signal: options.signal },
      ),
    );
  },

  async getUpcoming(signal?: AbortSignal) {
    return list(await request<any>(`${EVENTS_URL}/upcoming`, { signal }));
  },

  async discover(params: EventDiscoverQuery, signal?: AbortSignal): Promise<EventPage> {
    const payload = await request<any>(
      `${EVENTS_URL}/discover${query({
        ...params,
        dayStart: localDayStartIso(),
        tz: viewerTimeZone(),
      })}`,
      { signal },
    );

    return {
      items: list(payload?.items ?? []),
      page: Number(payload?.page ?? params.page ?? 1),
      limit: Number(payload?.limit ?? params.limit ?? 18),
      total: Number(payload?.total ?? 0),
      hasMore: Boolean(payload?.hasMore),
      serverTime: String(payload?.serverTime ?? new Date().toISOString()),
    };
  },

  async sections(
    params: { location?: ViewerLocation | null; radiusKm?: number; limit?: number } = {},
    signal?: AbortSignal,
  ): Promise<EventSections> {
    const payload = await request<any>(
      `${EVENTS_URL}/sections${query({
        lat: params.location?.latitude,
        lng: params.location?.longitude,
        radiusKm: params.radiusKm,
        limit: params.limit,
        dayStart: localDayStartIso(),
      })}`,
      { signal },
    );

    const section = (key: string) => (Array.isArray(payload?.[key]) ? list(payload[key]) : []);

    return {
      happeningNow: section("happeningNow"),
      today: section("today"),
      featured: section("featured"),
      recommended: section("recommended"),
      nearby: section("nearby"),
      online: section("online"),
      upcoming: section("upcoming"),
      serverTime: String(payload?.serverTime ?? new Date().toISOString()),
    };
  },

  async getById(id: string, signal?: AbortSignal) {
    return normalizeEvent(await request<any>(path(id), { signal }));
  },

  async related(id: string, signal?: AbortSignal) {
    return list(await request<any>(`${path(id)}/related`, { signal }));
  },

  async attendees(
    id: string,
    options: { status?: EventRsvpStatus; page?: number; limit?: number; signal?: AbortSignal } = {},
  ): Promise<EventAttendeesResponse> {
    const payload = await request<any>(
      `${path(id)}/attendees${query({
        status: options.status,
        page: options.page,
        limit: options.limit,
      })}`,
      { signal: options.signal },
    );

    return {
      eventId: String(payload?.eventId ?? id),
      status: payload?.status === "interested" ? "interested" : "going",
      attendeeCount: Number(payload?.attendeeCount ?? 0),
      interestedCount: Number(payload?.interestedCount ?? 0),
      attendees: (Array.isArray(payload?.attendees) ? payload.attendees : [])
        .map(person)
        .filter(Boolean) as EventPerson[],
      friendsGoingCount: Number(payload?.friendsGoingCount ?? 0),
      page: Number(payload?.page ?? 1),
      limit: Number(payload?.limit ?? 30),
      hasMore: Boolean(payload?.hasMore),
    };
  },

  async create(input: CreateEventInput) {
    return normalizeEvent(await request<any>(EVENTS_URL, { method: "POST", body: serialize(input) }));
  },

  async update(id: string, input: UpdateEventInput) {
    return normalizeEvent(await request<any>(path(id), { method: "PATCH", body: serialize(input) }));
  },

  async cancel(id: string, reason?: string) {
    const payload = await request<any>(`${path(id)}/cancel`, {
      method: "PATCH",
      body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {}),
    });

    return normalizeEvent(payload?.event ?? payload);
  },

  async delete(id: string) {
    return request<void>(path(id), { method: "DELETE" });
  },

  /** Going or Interested. Idempotent on the server. */
  async setRsvp(id: string, status: EventRsvpStatus) {
    return rsvp(
      await request<any>(`${path(id)}/rsvp`, {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
    );
  },

  /** Going (kept for existing callers). */
  async rsvp(id: string) {
    return this.setRsvp(id, "going");
  },

  /** Leaves Going and Interested. */
  async cancelRsvp(id: string) {
    return rsvp(await request<any>(`${path(id)}/rsvp`, { method: "DELETE" }));
  },

  async invite(id: string, userIds: string[]) {
    return request<{ success: boolean; invitedCount: number; invited: string[] }>(
      `${path(id)}/invite`,
      { method: "POST", body: JSON.stringify({ userIds }) },
    );
  },

  async getMyEvents(signal?: AbortSignal) {
    return list(await request<any>(`${EVENTS_URL}/my-events`, { signal }));
  },

  async getMyRsvps(signal?: AbortSignal) {
    return list(await request<any>(`${EVENTS_URL}/my-rsvps`, { signal }));
  },

  async getNearby(latitude: number, longitude: number, radiusKm = 50, signal?: AbortSignal) {
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error("Valid latitude and longitude are required.");
    }

    return list(
      await request<any>(
        `${EVENTS_URL}/nearby${query({ latitude, longitude, radiusKm })}`,
        { signal },
      ),
    );
  },
};

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : (error as { name?: string })?.name === "AbortError";
}
