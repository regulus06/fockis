import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import type {
  CreateEventInput,
  FockisEvent,
  OrganizationEventQuery,
  RsvpResponse,
  UpdateEventInput,
} from "../types/event.types";

/* ============================================================================
   API CONFIG
============================================================================ */

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL
).replace(/\/+$/, "");

const EVENTS_URL = `${API_BASE}/events`;

/* ============================================================================
   AUTH
============================================================================ */

function getToken(): string | null {
  return (
    localStorage.getItem("token") ??
    localStorage.getItem("accessToken")
  );
}

/* ============================================================================
   TYPES
============================================================================ */

type EventPayload = Record<string, unknown>;

/* ============================================================================
   DATE NORMALIZATION
============================================================================ */

function normalizeDate(
  value: unknown,
): string | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return undefined;
    }

    return value.toISOString();
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return undefined;
    }

    const parsed = new Date(trimmed);

    if (Number.isNaN(parsed.getTime())) {
      return trimmed;
    }

    return parsed.toISOString();
  }

  return String(value);
}

/* ============================================================================
   STRING HELPER
============================================================================ */

function cleanString(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed || undefined;
}

/* ============================================================================
   FILE HELPER
============================================================================ */

function isFile(
  value: unknown,
): value is File {
  return (
    typeof File !== "undefined" &&
    value instanceof File
  );
}

/* ============================================================================
   CREATE EVENT PAYLOAD
============================================================================ */

function normalizeCreateEventInput(
  input: CreateEventInput,
): EventPayload {
  const source =
    input as unknown as Record<string, unknown>;

  const payload: EventPayload = {};

  /* --------------------------------------------------------------------------
     ORGANIZATION
  -------------------------------------------------------------------------- */

  const organizationId =
    cleanString(source.organizationId);

  if (organizationId !== undefined) {
    payload.organizationId =
      organizationId;
  }

  /* --------------------------------------------------------------------------
     BASIC
  -------------------------------------------------------------------------- */

  const title =
    cleanString(source.title);

  if (title !== undefined) {
    payload.title = title;
  }

  const description =
    cleanString(source.description);

  if (description !== undefined) {
    payload.description =
      description;
  }

  if (source.category !== undefined) {
    payload.category =
      source.category;
  }

  if (source.visibility !== undefined) {
    payload.visibility =
      source.visibility;
  }

  /* --------------------------------------------------------------------------
     DATES
  -------------------------------------------------------------------------- */

  const startDate =
    normalizeDate(source.startDate);

  const endDate =
    normalizeDate(source.endDate);

  if (startDate !== undefined) {
    payload.startDate =
      startDate;
  }

  if (endDate !== undefined) {
    payload.endDate =
      endDate;
  }

  /* --------------------------------------------------------------------------
     LOCATION
  -------------------------------------------------------------------------- */

  const locationName =
    cleanString(source.locationName);

  if (locationName !== undefined) {
    payload.locationName =
      locationName;
  }

  const address =
    cleanString(source.address);

  if (address !== undefined) {
    payload.address =
      address;
  }

  /* --------------------------------------------------------------------------
     COORDINATES
  -------------------------------------------------------------------------- */

  if (source.latitude !== undefined) {
    payload.latitude =
      source.latitude;
  }

  if (source.longitude !== undefined) {
    payload.longitude =
      source.longitude;
  }

  /* --------------------------------------------------------------------------
     ONLINE EVENT
  -------------------------------------------------------------------------- */

  payload.isOnline =
    source.isOnline === true;

  const onlineUrl =
    cleanString(source.onlineUrl);

  if (onlineUrl !== undefined) {
    payload.onlineUrl =
      onlineUrl;
  }

  /* --------------------------------------------------------------------------
     COVER IMAGE
  -------------------------------------------------------------------------- */

  const coverImageUrl =
    cleanString(source.coverImageUrl);

  if (coverImageUrl !== undefined) {
    payload.coverImageUrl =
      coverImageUrl;
  }

  /* --------------------------------------------------------------------------
     EVENT VIDEO
  -------------------------------------------------------------------------- */

  const eventVideoUrl =
    cleanString(
      source.eventVideoUrl ??
      source.videoUrl,
    );

  if (eventVideoUrl !== undefined) {
    payload.eventVideoUrl =
      eventVideoUrl;
  }

  return payload;
}

/* ============================================================================
   UPDATE EVENT PAYLOAD
============================================================================ */

function normalizeUpdateEventInput(
  input: UpdateEventInput,
): EventPayload {
  const source =
    input as unknown as Record<string, unknown>;

  const payload: EventPayload = {};

  /* --------------------------------------------------------------------------
     ORGANIZATION
  -------------------------------------------------------------------------- */

  if (source.organizationId !== undefined) {
    const organizationId =
      cleanString(
        source.organizationId,
      );

    if (organizationId !== undefined) {
      payload.organizationId =
        organizationId;
    }
  }

  /* --------------------------------------------------------------------------
     BASIC
  -------------------------------------------------------------------------- */

  if (source.title !== undefined) {
    payload.title =
      typeof source.title === "string"
        ? source.title.trim()
        : source.title;
  }

  if (source.description !== undefined) {
    payload.description =
      typeof source.description === "string"
        ? source.description.trim()
        : source.description;
  }

  if (source.category !== undefined) {
    payload.category =
      source.category;
  }

  if (source.visibility !== undefined) {
    payload.visibility =
      source.visibility;
  }

  /* --------------------------------------------------------------------------
     DATES
  -------------------------------------------------------------------------- */

  if (source.startDate !== undefined) {
    payload.startDate =
      normalizeDate(
        source.startDate,
      );
  }

  if (source.endDate !== undefined) {
    payload.endDate =
      normalizeDate(
        source.endDate,
      );
  }

  /* --------------------------------------------------------------------------
     LOCATION
  -------------------------------------------------------------------------- */

  if (source.locationName !== undefined) {
    payload.locationName =
      typeof source.locationName === "string"
        ? source.locationName.trim()
        : source.locationName;
  }

  if (source.address !== undefined) {
    payload.address =
      typeof source.address === "string"
        ? source.address.trim()
        : source.address;
  }

  /* --------------------------------------------------------------------------
     COORDINATES
  -------------------------------------------------------------------------- */

  if (source.latitude !== undefined) {
    payload.latitude =
      source.latitude;
  }

  if (source.longitude !== undefined) {
    payload.longitude =
      source.longitude;
  }

  /* --------------------------------------------------------------------------
     ONLINE EVENT
  -------------------------------------------------------------------------- */

  if (source.isOnline !== undefined) {
    payload.isOnline =
      source.isOnline === true;
  }

  if (source.onlineUrl !== undefined) {
    payload.onlineUrl =
      typeof source.onlineUrl === "string"
        ? source.onlineUrl.trim()
        : source.onlineUrl;
  }

  /* --------------------------------------------------------------------------
     COVER IMAGE
  -------------------------------------------------------------------------- */

  if (source.coverImageUrl !== undefined) {
    payload.coverImageUrl =
      typeof source.coverImageUrl === "string"
        ? source.coverImageUrl.trim()
        : source.coverImageUrl;
  }

  /* --------------------------------------------------------------------------
     EVENT VIDEO
  -------------------------------------------------------------------------- */

  const eventVideoUrl =
    source.eventVideoUrl ??
    source.videoUrl;

  if (eventVideoUrl !== undefined) {
    payload.eventVideoUrl =
      typeof eventVideoUrl === "string"
        ? eventVideoUrl.trim()
        : eventVideoUrl;
  }

  return payload;
}

/* ============================================================================
   FORM DATA HELPER
============================================================================ */

function appendFormValue(
  formData: FormData,
  key: string,
  value: unknown,
): void {
  if (
    value === undefined ||
    value === null
  ) {
    return;
  }

  if (typeof value === "boolean") {
    formData.append(
      key,
      value ? "true" : "false",
    );

    return;
  }

  formData.append(
    key,
    String(value),
  );
}

/* ============================================================================
   CREATE FORM DATA
============================================================================ */

function buildCreateEventFormData(
  input: CreateEventInput,
): FormData {
  const source =
    input as unknown as Record<string, unknown>;

  const payload =
    normalizeCreateEventInput(input);

  const formData =
    new FormData();

  Object.entries(payload).forEach(
    ([key, value]) => {
      appendFormValue(
        formData,
        key,
        value,
      );
    },
  );

  /* --------------------------------------------------------------------------
     COVER IMAGE
  -------------------------------------------------------------------------- */

  if (
    isFile(
      source.coverImageFile,
    )
  ) {
    formData.append(
      "coverImageFile",
      source.coverImageFile,
      source.coverImageFile.name,
    );
  }

  /* --------------------------------------------------------------------------
     EVENT VIDEO
  -------------------------------------------------------------------------- */

  const eventVideoFile =
    source.eventVideoFile ??
    source.videoFile;

  if (isFile(eventVideoFile)) {
    formData.append(
      "eventVideoFile",
      eventVideoFile,
      eventVideoFile.name,
    );
  }

  return formData;
}

/* ============================================================================
   UPDATE FORM DATA
============================================================================ */

function buildUpdateEventFormData(
  input: UpdateEventInput,
): FormData {
  const source =
    input as unknown as Record<string, unknown>;

  const payload =
    normalizeUpdateEventInput(input);

  const formData =
    new FormData();

  Object.entries(payload).forEach(
    ([key, value]) => {
      appendFormValue(
        formData,
        key,
        value,
      );
    },
  );

  /* --------------------------------------------------------------------------
     COVER IMAGE
  -------------------------------------------------------------------------- */

  if (
    isFile(
      source.coverImageFile,
    )
  ) {
    formData.append(
      "coverImageFile",
      source.coverImageFile,
      source.coverImageFile.name,
    );
  }

  /* --------------------------------------------------------------------------
     EVENT VIDEO
  -------------------------------------------------------------------------- */

  const eventVideoFile =
    source.eventVideoFile ??
    source.videoFile;

  if (isFile(eventVideoFile)) {
    formData.append(
      "eventVideoFile",
      eventVideoFile,
      eventVideoFile.name,
    );
  }

  return formData;
}

/* ============================================================================
   API REQUEST
============================================================================ */

async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    getToken();

  const headers =
    new Headers(options.headers);

  if (
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

  console.log(
    "[eventsApi] REQUEST",
    {
      method:
        options.method ?? "GET",
      url,
      hasToken:
        Boolean(token),
      isFormData:
        options.body instanceof FormData,
    },
  );

  let response: Response;

  try {
    response =
      await fetch(
        url,
        {
          ...options,
          headers,
        },
      );
  } catch (error) {
    console.error(
      "[eventsApi] NETWORK ERROR",
      error,
    );

    throw new Error(
      `Failed to connect to the Fockis server. Make sure the NestJS backend is running at ${API_BASE}.`,
    );
  }

  const contentType =
    response.headers.get(
      "content-type",
    ) ?? "";

  let data: unknown = null;

  try {
    if (
      contentType.includes(
        "application/json",
      )
    ) {
      data =
        await response.json();
    } else {
      data =
        await response.text();
    }
  } catch {
    data = null;
  }

  if (!response.ok) {
    console.error(
      "[eventsApi] HTTP ERROR",
      {
        status:
          response.status,
        statusText:
          response.statusText,
        url,
        response:
          data,
      },
    );

    let message =
      `Event request failed (${response.status}).`;

    if (
      typeof data === "object" &&
      data !== null
    ) {
      const objectData =
        data as Record<string, unknown>;

      const serverMessage =
        objectData.message;

      if (
        Array.isArray(
          serverMessage,
        )
      ) {
        message =
          serverMessage
            .map(String)
            .join(", ");
      } else if (
        typeof serverMessage === "string"
      ) {
        message =
          serverMessage;
      }
    } else if (
      typeof data === "string"
    ) {
      const text =
        data.trim();

      if (text) {
        message = text;
      }
    }

    throw new Error(message);
  }

  return data as T;
}

/* ============================================================================
   BUILD QUERY
============================================================================ */

function buildQuery(
  params: Record<
    string,
    string | undefined
  >,
): string {
  const searchParams =
    new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== ""
      ) {
        searchParams.set(
          key,
          value,
        );
      }
    },
  );

  const query =
    searchParams.toString();

  return query
    ? `?${query}`
    : "";
}

/* ============================================================================
   GET ALL EVENTS
============================================================================ */

export async function getEvents(
  organizationId?: string,
): Promise<FockisEvent[]> {
  const query =
    buildQuery({
      organizationId:
        cleanString(
          organizationId,
        ),
    });

  return apiRequest<FockisEvent[]>(
    `${EVENTS_URL}${query}`,
  );
}

/* ============================================================================
   GET ORGANIZATION EVENTS
============================================================================ */

export async function getOrganizationEvents(
  organizationId: string,
): Promise<FockisEvent[]> {
  if (!organizationId.trim()) {
    throw new Error(
      "Organization ID is required.",
    );
  }

  return getEvents(
    organizationId,
  );
}

/* ============================================================================
   GET UPCOMING EVENTS
============================================================================ */

export async function getUpcomingEvents(
  organizationId?: string,
): Promise<FockisEvent[]> {
  const query =
    buildQuery({
      organizationId:
        cleanString(
          organizationId,
        ),
    });

  return apiRequest<FockisEvent[]>(
    `${EVENTS_URL}/upcoming${query}`,
  );
}

/* ============================================================================
   GET EVENT BY ID
============================================================================ */

export async function getEventById(
  id: string,
): Promise<FockisEvent> {
  return apiRequest<FockisEvent>(
    `${EVENTS_URL}/${encodeURIComponent(id)}`,
  );
}

/* ============================================================================
   CREATE EVENT
============================================================================ */

export async function createEvent(
  input: CreateEventInput,
): Promise<FockisEvent> {
  const source =
    input as unknown as Record<string, unknown>;

  const hasCoverImageFile =
    isFile(
      source.coverImageFile,
    );

  const hasEventVideoFile =
    isFile(
      source.eventVideoFile ??
      source.videoFile,
    );

  const hasFile =
    hasCoverImageFile ||
    hasEventVideoFile;

  if (hasFile) {
    const formData =
      buildCreateEventFormData(
        input,
      );

    console.log(
      "[EVENT CREATE] MULTIPART",
      {
        url:
          EVENTS_URL,
        organizationId:
          input.organizationId,
        fields:
          Array.from(
            formData.entries(),
          ).map(
            ([key, value]) => [
              key,
              value instanceof File
                ? value.name
                : value,
            ],
          ),
      },
    );

    return apiRequest<FockisEvent>(
      EVENTS_URL,
      {
        method: "POST",
        body: formData,
      },
    );
  }

  const payload =
    normalizeCreateEventInput(
      input,
    );

  console.log(
    "[EVENT CREATE] JSON",
    {
      url:
        EVENTS_URL,
      organizationId:
        input.organizationId,
      payload,
    },
  );

  return apiRequest<FockisEvent>(
    EVENTS_URL,
    {
      method: "POST",
      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}

/* ============================================================================
   UPDATE EVENT
============================================================================ */

export async function updateEvent(
  id: string,
  input: UpdateEventInput,
): Promise<FockisEvent> {
  const source =
    input as unknown as Record<string, unknown>;

  const hasCoverImageFile =
    isFile(
      source.coverImageFile,
    );

  const hasEventVideoFile =
    isFile(
      source.eventVideoFile ??
      source.videoFile,
    );

  const hasFile =
    hasCoverImageFile ||
    hasEventVideoFile;

  const url =
    `${EVENTS_URL}/${encodeURIComponent(id)}`;

  if (hasFile) {
    const formData =
      buildUpdateEventFormData(
        input,
      );

    return apiRequest<FockisEvent>(
      url,
      {
        method: "PATCH",
        body: formData,
      },
    );
  }

  const payload =
    normalizeUpdateEventInput(
      input,
    );

  return apiRequest<FockisEvent>(
    url,
    {
      method: "PATCH",
      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}

/* ============================================================================
   CANCEL EVENT
============================================================================ */

export async function cancelEvent(
  id: string,
  reason?: string,
): Promise<FockisEvent> {
  const cancellationReason =
    cleanString(reason) ??
    "This event has been cancelled by the organizer.";

  return apiRequest<FockisEvent>(
    `${EVENTS_URL}/${encodeURIComponent(id)}/cancel`,
    {
      method: "PATCH",
      body:
        JSON.stringify({
          isCancelled: true,
          status: "cancelled",
          cancellationReason,
        }),
    },
  );
}

/* ============================================================================
   UNCANCEL / REOPEN EVENT
============================================================================ */

export async function uncancelEvent(
  id: string,
): Promise<FockisEvent> {
  return apiRequest<FockisEvent>(
    `${EVENTS_URL}/${encodeURIComponent(id)}/uncancel`,
    {
      method: "PATCH",
      body:
        JSON.stringify({
          isCancelled: false,
          status: "upcoming",
          cancellationReason: null,
        }),
    },
  );
}

/* ============================================================================
   DELETE EVENT
============================================================================ */

export async function deleteEvent(
  id: string,
): Promise<{
  success: boolean;
  message: string;
}> {
  return apiRequest<{
    success: boolean;
    message: string;
  }>(
    `${EVENTS_URL}/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
}

/* ============================================================================
   RSVP
============================================================================ */

export async function rsvpEvent(
  id: string,
): Promise<RsvpResponse> {
  return apiRequest<RsvpResponse>(
    `${EVENTS_URL}/${encodeURIComponent(id)}/rsvp`,
    {
      method: "POST",
      body:
        JSON.stringify({}),
    },
  );
}

/* ============================================================================
   CANCEL RSVP
============================================================================ */

export async function cancelEventRsvp(
  id: string,
): Promise<RsvpResponse> {
  return apiRequest<RsvpResponse>(
    `${EVENTS_URL}/${encodeURIComponent(id)}/rsvp`,
    {
      method: "DELETE",
    },
  );
}

/* ============================================================================
   GET ATTENDEES
============================================================================ */

export async function getEventAttendees(
  id: string,
): Promise<{
  eventId: string;
  attendeeIds: string[];
  attendeeCount: number;
}> {
  return apiRequest<{
    eventId: string;
    attendeeIds: string[];
    attendeeCount: number;
  }>(
    `${EVENTS_URL}/${encodeURIComponent(id)}/attendees`,
  );
}

/* ============================================================================
   MY EVENTS
============================================================================ */

export async function getMyEvents(): Promise<FockisEvent[]> {
  return apiRequest<FockisEvent[]>(
    `${EVENTS_URL}/my-events`,
  );
}

/* ============================================================================
   MY RSVPS
============================================================================ */

export async function getMyRsvps(): Promise<FockisEvent[]> {
  return apiRequest<FockisEvent[]>(
    `${EVENTS_URL}/my-rsvps`,
  );
}

/* ============================================================================
   NEARBY EVENTS
============================================================================ */

export async function getNearbyEvents(
  latitude: number,
  longitude: number,
  radiusKm = 50,
  organizationId?: string,
): Promise<FockisEvent[]> {
  const params =
    new URLSearchParams({
      latitude:
        String(latitude),
      longitude:
        String(longitude),
      radiusKm:
        String(radiusKm),
    });

  if (
    organizationId &&
    organizationId.trim()
  ) {
    params.set(
      "organizationId",
      organizationId.trim(),
    );
  }

  return apiRequest<FockisEvent[]>(
    `${EVENTS_URL}/nearby?${params.toString()}`,
  );
}

/* ============================================================================
   FILTER ORGANIZATION EVENTS
============================================================================ */

export function filterOrganizationEvents(
  events: FockisEvent[],
  query: OrganizationEventQuery,
): FockisEvent[] {
  const search =
    query.search
      ?.trim()
      .toLowerCase() ?? "";

  return events.filter(
    (event) => {
      if (
        String(
          event.organizationId ?? "",
        ) !==
        String(
          query.organizationId,
        )
      ) {
        return false;
      }

      if (
        query.category &&
        query.category !== "all" &&
        event.category !==
          query.category
      ) {
        return false;
      }

      if (
        query.status &&
        query.status !== "all" &&
        event.status !==
          query.status
      ) {
        return false;
      }

      if (search) {
        const searchable = [
          event.title,
          event.description,
          event.locationName,
          event.address,
          event.organization
            ?.name,
          event.organization
            ?.displayName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (
          !searchable.includes(
            search,
          )
        ) {
          return false;
        }
      }

      return true;
    },
  );
}

/* ============================================================================
   EVENTS API OBJECT
============================================================================ */

export const eventsApi = {
  getAll:
    getEvents,

  getUpcoming:
    getUpcomingEvents,

  getById:
    getEventById,

  create:
    createEvent,

  update:
    updateEvent,

  cancel:
    cancelEvent,

  uncancel:
    uncancelEvent,

  remove:
    deleteEvent,

  delete:
    deleteEvent,

  rsvp:
    rsvpEvent,

  cancelRsvp:
    cancelEventRsvp,

  getAttendees:
    getEventAttendees,

  getMyEvents,

  getMyRsvps,

  getNearby:
    getNearbyEvents,

  getOrganizationEvents,

  filterOrganizationEvents,
};