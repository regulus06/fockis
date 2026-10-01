import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import type {
  ApiResult,
  Meeting,
  MeetingAgendaItem,
  MeetingSecuritySettings,
  AiSecretaryConfig,
} from "../types";

/* ============================================================================
 * API CONFIG
 * ========================================================================== */

const API_BASE_URL = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    FOCKIS_API_URL,
).replace(/\/+$/, "");

/* ============================================================================
 * MEETING OWNERSHIP
 * ========================================================================== */

export type MeetingOwnerType =
  | "user"
  | "organization";

export type ChurchMeetingType =
  | "general"
  | "leadership"
  | "department"
  | "group"
  | "prayer"
  | "bible-study"
  | "pastoral"
  | "counseling"
  | "volunteer"
  | "event";

export type MeetingVisibility =
  | "private"
  | "invite_only"
  | "members"
  | "organization"
  | "public";

/* ============================================================================
 * INVITATIONS
 * ========================================================================== */

export interface MeetingInvitation {
  id: string;
  meetingId?: string;
  userId?: string;
  inviteeId?: string;

  displayName?: string;
  userName?: string;
  email?: string;
  avatarUrl?: string | null;

  status?:
    | "pending"
    | "accepted"
    | "declined"
    | "cancelled"
    | "expired"
    | string;

  invitedBy?: string;
  invitedAt?: string;
  respondedAt?: string;

  meeting?: Meeting;

  [key: string]: unknown;
}

export interface InviteUsersPayload {
  userIds: string[];
  message?: string;
}

export interface InviteUserPayload {
  userId: string;
  message?: string;
}

export interface InvitationResponse {
  invitations?: MeetingInvitation[];
  invited?: MeetingInvitation[];
  data?: MeetingInvitation[];

  [key: string]: unknown;
}

/* ============================================================================
 * PAYLOAD TYPES
 * ========================================================================== */

export interface CreateMeetingAgendaPayload {
  title: string;
  order: number;
}

export type CreateMeetingAgendaItem =
  CreateMeetingAgendaPayload;

export interface CreateMeetingPayload {
  topic: string;
  description?: string;

  ownerType?: MeetingOwnerType;
  ownerId?: string;

  organizationId?: string;
  departmentId?: string;
  groupId?: string;
  eventId?: string;

  churchMeetingType?: ChurchMeetingType;
  visibility?: MeetingVisibility;

  requireApproval?: boolean;
  allowGuests?: boolean;
  maxParticipants?: number;

  date?: string;

  startTime: string;
  endTime?: string;

  durationMinutes: number;

  timezone?: string;

  passcode?: string;

  agenda?: CreateMeetingAgendaPayload[];

  inviteeIds?: string[];

  security?: MeetingSecuritySettings;

  secretary?: AiSecretaryConfig;

  recordingEnabled?: boolean;
}

export interface UpdateMeetingPayload
  extends Partial<CreateMeetingPayload> {
  status?: string;
}

/* ============================================================================
 * ORGANIZATION MEETING FILTERS
 * ========================================================================== */

export interface OrganizationMeetingFilters {
  organizationId: string;
  departmentId?: string;
  groupId?: string;
  eventId?: string;
  churchMeetingType?: ChurchMeetingType;
  visibility?: MeetingVisibility;
  status?: string;
  from?: string;
  to?: string;
}

/* ============================================================================
 * BACKEND CREATE PAYLOAD
 *
 * ownerType is intentionally excluded because the backend currently
 * rejects it.
 * ========================================================================== */

interface BackendCreateMeetingPayload {
  topic: string;
  description?: string;

  ownerId?: string;

  organizationId?: string;
  departmentId?: string;
  groupId?: string;
  eventId?: string;

  churchMeetingType?: ChurchMeetingType;
  visibility?: MeetingVisibility;

  requireApproval?: boolean;
  allowGuests?: boolean;
  maxParticipants?: number;

  startTime: string;
  endTime: string;
  durationMinutes: number;
  timezone: string;

  passcode?: string;

  inviteeIds?: string[];

  agenda?: CreateMeetingAgendaPayload[];

  security?: MeetingSecuritySettings;

  secretary?: AiSecretaryConfig;

  recordingEnabled?: boolean;
}

/* ============================================================================
 * JOIN
 * ========================================================================== */

export interface JoinMeetingResponse {
  admitted: boolean;
  meetingId?: string;
  roomToken?: string;
  token?: string;
  serverUrl?: string;
  role?: string;

  [key: string]: unknown;
}

/* ============================================================================
 * START
 * ========================================================================== */

export interface StartMeetingResponse {
  meetingId?: string;
  roomToken?: string;
  token?: string;
  serverUrl?: string;
  role?: string;

  [key: string]: unknown;
}

/* ============================================================================
 * PARTICIPANTS
 * ========================================================================== */

export interface MeetingParticipant {
  id: string;

  userId?: string;

  displayName: string;

  email?: string;

  avatarUrl?: string | null;

  role?: string;

  micOn?: boolean;

  cameraOn?: boolean;

  handRaised?: boolean;

  screenSharing?: boolean;

  admitted?: boolean;

  waiting?: boolean;

  isSpeaking?: boolean;

  connectionQuality?:
    | "good"
    | "weak"
    | "poor"
    | "reconnecting"
    | string;

  joinedAt?: string;

  leftAt?: string | null;

  createdAt?: string;

  updatedAt?: string;

  [key: string]: unknown;
}

/* ============================================================================
 * ATTENDANCE
 * ========================================================================== */

export interface MeetingAttendanceRecord {
  id: string;

  meetingId?: string;

  userId: string;

  participantId?: string;

  displayName?: string;

  userName?: string;

  avatarUrl?: string | null;

  role?: string;

  joinedAt?: string;

  leftAt?: string | null;

  durationSeconds?: number;

  durationMinutes?: number;

  attended?: boolean;

  status?: string;

  [key: string]: unknown;
}

/* ============================================================================
 * CHAT
 * ========================================================================== */

export interface MeetingMessage {
  id: string;

  meetingId?: string;

  senderId?: string;

  senderName?: string;

  senderAvatarUrl?: string | null;

  body: string;

  createdAt?: string;

  [key: string]: unknown;
}

/* ============================================================================
 * REACTIONS
 * ========================================================================== */

export interface MeetingReaction {
  id?: string;

  meetingId?: string;

  userId?: string;

  userName?: string;

  emoji: string;

  createdAt?: string;

  [key: string]: unknown;
}

/* ============================================================================
 * AI SECRETARY — SUMMARY
 * ========================================================================== */

export interface MeetingSummaryDecision {
  id: string;
  text: string;
}

export interface MeetingSummaryActionItem {
  id: string;

  title?: string;

  text?: string;

  description?: string;

  assigneeId?: string;

  assigneeName?: string;

  dueDate?: string;

  completed?: boolean;

  [key: string]: unknown;
}

export interface MeetingSummaryQuestion {
  id: string;
  text: string;
}

export interface MeetingSummary {
  id?: string;

  meetingId?: string;

  overview?: string;

  mainPoints?: string[];

  decisions?: MeetingSummaryDecision[];

  actionItems?: MeetingSummaryActionItem[];

  questions?: MeetingSummaryQuestion[];

  nextSteps?: string[];

  generatedAt?: string;

  generatedBy?: string;

  [key: string]: unknown;
}

/* ============================================================================
 * AI SECRETARY — TRANSCRIPT
 * ========================================================================== */

export interface MeetingTranscriptLine {
  id: string;

  speakerId?: string;

  speakerName?: string;

  text: string;

  startTime?: string;

  endTime?: string;

  timestamp?: string;

  [key: string]: unknown;
}

export interface MeetingTranscriptResponse {
  meetingId?: string;

  status:
    | "pending"
    | "processing"
    | "complete"
    | "failed";

  lines: MeetingTranscriptLine[];

  generatedAt?: string;

  [key: string]: unknown;
}

/* ============================================================================
 * AUTHENTICATION
 *
 * IMPORTANT:
 * The helpers below deliberately avoid TypeScript type-predicate chains
 * that can incorrectly narrow values to `never`.
 * ========================================================================== */

function isJwt(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const token = value.trim();

  if (!token) {
    return false;
  }

  const parts = token.split(".");

  return (
    parts.length === 3 &&
    parts[0].length > 0 &&
    parts[1].length > 0 &&
    parts[2].length > 0
  );
}

function extractJwtFromValue(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const clean: string = value.trim();

  if (clean.length === 0) {
    return null;
  }

  if (isJwt(clean)) {
    return clean;
  }

  /*
   * Explicitly create a string copy here.
   * This prevents TS from incorrectly narrowing the value to `never`.
   */
  const normalized: string =
    String(clean);

  const lower: string =
    normalized.toLowerCase();

  if (lower.indexOf("bearer ") === 0) {
    const token: string =
      normalized.slice(7).trim();

    if (isJwt(token)) {
      return token;
    }
  }

  return null;
}

function extractTokenFromObject(
  value: unknown,
): string | null {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return null;
  }

  const object =
    value as Record<string, unknown>;

  const directKeys: string[] = [
    "access_token",
    "accessToken",
    "token",
    "jwt",
    "idToken",
    "id_token",
    "authorization",
    "access",
  ];

  for (const key of directKeys) {
    const candidate: unknown =
      object[key];

    const token: string | null =
      extractJwtFromValue(candidate);

    if (token !== null) {
      return token;
    }
  }

  const nestedKeys: string[] = [
    "user",
    "auth",
    "session",
    "data",
    "state",
    "credentials",
  ];

  for (const key of nestedKeys) {
    const nested: unknown =
      object[key];

    const token: string | null =
      extractTokenFromObject(nested);

    if (token !== null) {
      return token;
    }
  }

  return null;
}

function normalizeStoredToken(
  value: unknown,
): string | null {
  return extractJwtFromValue(value);
}

function getToken(): string | null {
  if (
    typeof window === "undefined" ||
    !window.localStorage
  ) {
    return null;
  }

  const directKeys: string[] = [
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
   * First pass:
   * Check known authentication keys.
   */
  for (const key of directKeys) {
    try {
      const value: string | null =
        window.localStorage.getItem(key);

      const directToken: string | null =
        normalizeStoredToken(value);

      if (directToken !== null) {
        return directToken;
      }

      if (
        typeof value === "string" &&
        value.length > 0
      ) {
        try {
          const parsed: unknown =
            JSON.parse(value);

          const token: string | null =
            extractTokenFromObject(parsed);

          if (token !== null) {
            return token;
          }
        } catch {
          // Value is not JSON.
        }
      }
    } catch {
      // Ignore inaccessible localStorage entries.
    }
  }

  /*
   * Second pass:
   * Search every localStorage entry.
   */
  try {
    const storageLength: number =
      window.localStorage.length;

    for (
      let index = 0;
      index < storageLength;
      index += 1
    ) {
      const key: string | null =
        window.localStorage.key(index);

      if (typeof key !== "string") {
        continue;
      }

      const value: string | null =
        window.localStorage.getItem(key);

      const directToken: string | null =
        normalizeStoredToken(value);

      if (directToken !== null) {
        return directToken;
      }

      if (
        typeof value === "string" &&
        value.length > 0
      ) {
        try {
          const parsed: unknown =
            JSON.parse(value);

          const token: string | null =
            extractTokenFromObject(parsed);

          if (token !== null) {
            return token;
          }
        } catch {
          // Ignore invalid JSON.
        }
      }
    }
  } catch {
    // Ignore localStorage access errors.
  }

  return null;
}

/* ============================================================================
 * AUTH DEBUG
 * ========================================================================== */

function getAuthDebugInfo(): {
  authenticated: boolean;
  tokenLength: number;
} {
  const token: string | null =
    getToken();

  return {
    authenticated: token !== null,
    tokenLength:
      token?.length ?? 0,
  };
}

/* ============================================================================
 * HEADERS
 * ========================================================================== */

function getHeaders(): HeadersInit {
  const token: string | null =
    getToken();

  const headers: Record<string, string> = {
    "Content-Type":
      "application/json",
    Accept:
      "application/json",
  };

  if (token !== null) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  return headers;
}

/* ============================================================================
 * DATE HELPERS
 * ========================================================================== */

function containsDate(
  value: string,
): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(
    value.trim(),
  );
}

function normalizeTime(
  time: string,
): string {
  const value: string =
    time.trim();

  if (/^\d{2}:\d{2}$/.test(value)) {
    return `${value}:00`;
  }

  return value;
}

function extractDateFromDateTime(
  value: string,
): string | null {
  const match: RegExpMatchArray | null =
    value
      .trim()
      .match(
        /^(\d{4}-\d{2}-\d{2})T/,
      );

  return match?.[1] ?? null;
}

/* ============================================================================
 * BUILD LOCAL DATE/TIME
 * ========================================================================== */

function buildLocalDateTime(
  date: string | null | undefined,
  time: string,
): string {
  const cleanTime: string =
    time.trim();

  if (!cleanTime) {
    throw new Error(
      "Meeting start time is required.",
    );
  }

  if (containsDate(cleanTime)) {
    const parsed: Date =
      new Date(cleanTime);

    if (Number.isNaN(parsed.getTime())) {
      throw new Error(
        `Invalid meeting start time: ${cleanTime}`,
      );
    }

    return cleanTime;
  }

  const cleanDate: string =
    date?.trim() ?? "";

  if (!cleanDate) {
    throw new Error(
      "Meeting date is required when startTime does not contain a date.",
    );
  }

  const normalizedTime: string =
    normalizeTime(cleanTime);

  const localDateTime: string =
    `${cleanDate}T${normalizedTime}`;

  const parsed: Date =
    new Date(localDateTime);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      `Invalid meeting date/time: ${localDateTime}`,
    );
  }

  return localDateTime;
}

/* ============================================================================
 * EXPLICIT END TIME
 * ========================================================================== */

function buildExplicitEndTime(
  date: string | null | undefined,
  endTime: string,
): string {
  const cleanEndTime: string =
    endTime.trim();

  if (!cleanEndTime) {
    throw new Error(
      "Meeting end time is required.",
    );
  }

  if (containsDate(cleanEndTime)) {
    const parsed: Date =
      new Date(cleanEndTime);

    if (Number.isNaN(parsed.getTime())) {
      throw new Error(
        `Invalid meeting end time: ${cleanEndTime}`,
      );
    }

    return cleanEndTime;
  }

  const cleanDate: string =
    date?.trim() ?? "";

  if (!cleanDate) {
    throw new Error(
      "Meeting date is required when endTime does not contain a date.",
    );
  }

  const normalizedTime: string =
    normalizeTime(cleanEndTime);

  const localDateTime: string =
    `${cleanDate}T${normalizedTime}`;

  const parsed: Date =
    new Date(localDateTime);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      `Invalid meeting date/time: ${localDateTime}`,
    );
  }

  return localDateTime;
}

/* ============================================================================
 * CALCULATE END TIME
 * ========================================================================== */

function buildMeetingEndTime(
  startTime: string,
  durationMinutes: number,
): string {
  const start: Date =
    new Date(startTime);

  if (Number.isNaN(start.getTime())) {
    throw new Error(
      `Meeting start time is invalid: ${startTime}`,
    );
  }

  if (
    !Number.isFinite(durationMinutes) ||
    durationMinutes < 1
  ) {
    throw new Error(
      "Meeting duration must be at least 1 minute.",
    );
  }

  const end: Date =
    new Date(
      start.getTime() +
        durationMinutes *
          60 *
          1000,
    );

  return end.toISOString();
}

/* ============================================================================
 * END TIME RESOLUTION
 * ========================================================================== */

function resolveEndTime(
  date: string | null | undefined,
  startTime: string,
  endTime: string | undefined,
  durationMinutes: number,
): string {
  if (
    typeof endTime === "string" &&
    endTime.trim().length > 0
  ) {
    return buildExplicitEndTime(
      date,
      endTime,
    );
  }

  return buildMeetingEndTime(
    startTime,
    durationMinutes,
  );
}

/* ============================================================================
 * AGENDA NORMALIZATION
 * ========================================================================== */

function normalizeAgenda(
  agenda?: Array<
    MeetingAgendaItem |
      CreateMeetingAgendaPayload
  >,
):
  | CreateMeetingAgendaPayload[]
  | undefined {
  if (!Array.isArray(agenda)) {
    return undefined;
  }

  const normalized: CreateMeetingAgendaPayload[] =
    agenda
      .map(
        (
          item:
            | MeetingAgendaItem
            | CreateMeetingAgendaPayload,
          index: number,
        ) => ({
          title:
            typeof item.title === "string"
              ? item.title.trim()
              : "",

          order:
            typeof item.order === "number"
              ? item.order
              : index + 1,
        }),
      )
      .filter(
        (
          item: CreateMeetingAgendaPayload,
        ) => item.title.length > 0,
      )
      .map(
        (
          item: CreateMeetingAgendaPayload,
          index: number,
        ) => ({
          title: item.title,
          order: index + 1,
        }),
      );

  return normalized.length > 0
    ? normalized
    : undefined;
}

/* ============================================================================
 * INVITEE NORMALIZATION
 * ========================================================================== */

function normalizeInviteeIds(
  inviteeIds?: string[],
):
  | string[]
  | undefined {
  if (!Array.isArray(inviteeIds)) {
    return undefined;
  }

  const cleaned: string[] =
    inviteeIds
      .filter(
        (id: unknown): id is string =>
          typeof id === "string",
      )
      .map(
        (id: string) =>
          id.trim(),
      )
      .filter(
        (id: string) =>
          id.length > 0,
      );

  const unique: string[] =
    Array.from(
      new Set(cleaned),
    );

  return unique.length > 0
    ? unique
    : undefined;
}

/* ============================================================================
 * STRING ID NORMALIZATION
 * ========================================================================== */

function normalizeOptionalId(
  value?: string,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const clean: string =
    value.trim();

  return clean || undefined;
}

/* ============================================================================
 * MEETING ID EXTRACTION
 * ========================================================================== */

function extractMeetingId(
  meeting: unknown,
): string | null {
  if (
    meeting === null ||
    typeof meeting !== "object"
  ) {
    return null;
  }

  const record =
    meeting as Record<string, unknown>;

  const candidates: unknown[] = [
    record.id,
    record._id,
    record.meetingId,
  ];

  for (const value of candidates) {
    if (
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return value.trim();
    }

    if (
      value !== null &&
      typeof value === "object"
    ) {
      const objectValue =
        value as Record<string, unknown>;

      const oid: unknown =
        objectValue.$oid;

      if (
        typeof oid === "string" &&
        oid.trim().length > 0
      ) {
        return oid.trim();
      }
    }
  }

  return null;
}

/* ============================================================================
 * RESPONSE NORMALIZATION
 * ========================================================================== */

/**
 * The Meetings backend may return either:
 *
 *   Meeting[]
 *
 * or a wrapped response such as:
 *
 *   { data: Meeting[] }
 *   { meetings: Meeting[] }
 *   { items: Meeting[] }
 *   { results: Meeting[] }
 *
 * Normalize all supported shapes here so the dashboard always receives
 * an actual Meeting[] and can build real /meetings/:id links.
 */
function normalizeMeetingList(
  value: unknown,
): Meeting[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Meeting =>
        item !== null &&
        typeof item === "object" &&
        extractMeetingId(item) !== null,
    ).map((item) => {
      const record =
        item as unknown as Record<string, unknown>;

      const id =
        extractMeetingId(item);

      return {
        ...(record as unknown as Meeting),
        id: id as string,
      };
    });
  }

  if (
    value === null ||
    typeof value !== "object"
  ) {
    return [];
  }

  const record =
    value as Record<string, unknown>;

  const candidates: unknown[] = [
    record.meetings,
    record.data,
    record.items,
    record.results,
    record.upcoming,
    record.today,
    record.recent,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return normalizeMeetingList(candidate);
    }

    if (
      candidate !== null &&
      typeof candidate === "object"
    ) {
      const nested =
        normalizeMeetingList(candidate);

      if (nested.length > 0) {
        return nested;
      }
    }
  }

  return [];
}

/**
 * Normalize one Meeting response.
 */
function normalizeMeeting(
  value: unknown,
): Meeting | null {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return null;
  }

  const record =
    value as Record<string, unknown>;

  const nestedCandidates: unknown[] = [
    record.meeting,
    record.data,
    record.result,
  ];

  for (const candidate of nestedCandidates) {
    if (
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate)
    ) {
      const nested =
        normalizeMeeting(candidate);

      if (nested) {
        return nested;
      }
    }
  }

  const id =
    extractMeetingId(value);

  if (!id) {
    return null;
  }

  return {
    ...(record as unknown as Meeting),
    id,
  };
}

/* ============================================================================
 * SERVER ERROR
 * ========================================================================== */

function getServerErrorMessage(
  data: unknown,
  status: number,
): string {
  if (
    data !== null &&
    typeof data === "object" &&
    "message" in data
  ) {
    const message: unknown =
      (
        data as {
          message?: unknown;
        }
      ).message;

    if (Array.isArray(message)) {
      return message
        .map(
          (item: unknown) =>
            typeof item === "string"
              ? item
              : JSON.stringify(item),
        )
        .join("\n");
    }

    if (typeof message === "string") {
      return message;
    }
  }

  if (
    typeof data === "string" &&
    data.trim().length > 0
  ) {
    return data;
  }

  return `Request failed with status ${status}`;
}

/* ============================================================================
 * HTTP REQUEST
 * ========================================================================== */

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const token: string | null =
      getToken();

    const headers: HeadersInit =
      getHeaders();

    const debug:
      {
        authenticated: boolean;
        tokenLength: number;
      } =
      getAuthDebugInfo();

    console.log(
      `[Meetings API] ${
        options.method || "GET"
      } ${path}`,
      {
        baseUrl:
          API_BASE_URL,
        authenticated:
          debug.authenticated,
        tokenLength:
          debug.tokenLength,
      },
    );

    if (token === null) {
      console.warn(
        "[Meetings API] No JWT token was found in localStorage.",
      );
    }

    const response: Response =
      await fetch(
        `${API_BASE_URL}${path}`,
        {
          ...options,

          headers: {
            ...headers,
            ...(options.headers || {}),
          },

          credentials: "include",
        },
      );

    const contentType: string =
      response.headers.get(
        "content-type",
      ) || "";

    let data: unknown;

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

    if (!response.ok) {
      const message: string =
        getServerErrorMessage(
          data,
          response.status,
        );

      console.error(
        `[Meetings API] ${response.status} ${path}`,
      );

      console.error(
        "[Meetings API] Server response:",
        data,
      );

      if (response.status === 401) {
        console.error(
          "[Meetings API] AUTHENTICATION FAILED.",
          {
            apiBaseUrl:
              API_BASE_URL,

            hasToken:
              token !== null,

            tokenLength:
              token?.length ?? 0,

            hint:
              "The backend received the request but rejected the authentication credentials.",
          },
        );

        return {
          ok: false,
          error:
            "You are not authenticated. Please sign in again and retry the meeting request.",
        };
      }

      if (response.status === 400) {
        console.error(
          "[Meetings API] Validation error:",
          message,
        );
      }

      if (options.body) {
        try {
          console.error(
            "[Meetings API] Request payload:",
            JSON.stringify(
              JSON.parse(
                String(
                  options.body,
                ),
              ),
              null,
              2,
            ),
          );
        } catch {
          console.error(
            "[Meetings API] Request body:",
            options.body,
          );
        }
      }

      return {
        ok: false,
        error: message,
      };
    }

    return {
      ok: true,
      data: data as T,
    };
  } catch (error: unknown) {
    console.error(
      "[Meetings API] Network error:",
      error,
    );

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to connect to Fockis Meetings backend.",
    };
  }
}

/* ============================================================================
 * MEETINGS API
 * ========================================================================== */

export const meetingsApi = {
  /* ==========================================================================
   * UPCOMING
   * ======================================================================== */

  async listUpcoming(): Promise<
    ApiResult<Meeting[]>
  > {
    const result =
      await request<unknown>(
        "/meetings/upcoming",
      );

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      data: normalizeMeetingList(
        result.data,
      ),
    };
  },

  /* ==========================================================================
   * TODAY
   * ======================================================================== */

  async listToday(): Promise<
    ApiResult<Meeting[]>
  > {
    const result =
      await request<unknown>(
        "/meetings/today",
      );

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      data: normalizeMeetingList(
        result.data,
      ),
    };
  },

  /* ==========================================================================
   * RECENT
   * ======================================================================== */

  async listRecent(): Promise<
    ApiResult<Meeting[]>
  > {
    const result =
      await request<unknown>(
        "/meetings/recent",
      );

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      data: normalizeMeetingList(
        result.data,
      ),
    };
  },

  /* ==========================================================================
   * INVITATIONS — CURRENT USER
   * ======================================================================== */

  async getInvitations(): Promise<
    ApiResult<Meeting[]>
  > {
    const result =
      await request<unknown>(
        "/meetings/invitations",
      );

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      data: normalizeMeetingList(
        result.data,
      ),
    };
  },

  /* ==========================================================================
   * INVITATIONS — DETAILED
   * ======================================================================== */

  async getMyInvitations(): Promise<
    ApiResult<MeetingInvitation[]>
  > {
    const result =
      await request<
        | MeetingInvitation[]
        | InvitationResponse
      >(
        "/meetings/invitations",
      );

    if (!result.ok) {
      return result;
    }

    if (Array.isArray(result.data)) {
      return {
        ok: true,
        data: result.data,
      };
    }

    return {
      ok: true,
      data:
        result.data.invitations ??
        result.data.invited ??
        result.data.data ??
        [],
    };
  },

  /* ==========================================================================
   * ORGANIZATION MEETINGS
   * ======================================================================== */

  async listOrganizationMeetings(
    organizationId: string,
    filters?: Omit<
      OrganizationMeetingFilters,
      "organizationId"
    >,
  ): Promise<
    ApiResult<Meeting[]>
  > {
    const cleanOrganizationId: string =
      String(
        organizationId ?? "",
      ).trim();

    if (!cleanOrganizationId) {
      return {
        ok: false,
        error:
          "Organization ID is required.",
      };
    }

    const params =
      new URLSearchParams();

    if (filters?.departmentId) {
      params.set(
        "departmentId",
        filters.departmentId,
      );
    }

    if (filters?.groupId) {
      params.set(
        "groupId",
        filters.groupId,
      );
    }

    if (filters?.eventId) {
      params.set(
        "eventId",
        filters.eventId,
      );
    }

    if (filters?.churchMeetingType) {
      params.set(
        "churchMeetingType",
        filters.churchMeetingType,
      );
    }

    if (filters?.visibility) {
      params.set(
        "visibility",
        filters.visibility,
      );
    }

    if (filters?.status) {
      params.set(
        "status",
        filters.status,
      );
    }

    if (filters?.from) {
      params.set(
        "from",
        filters.from,
      );
    }

    if (filters?.to) {
      params.set(
        "to",
        filters.to,
      );
    }

    const query: string =
      params.toString();

    const path: string =
      `/meetings/organization/${encodeURIComponent(
        cleanOrganizationId,
      )}${
        query
          ? `?${query}`
          : ""
      }`;

    return request<Meeting[]>(path);
  },

  /* ==========================================================================
   * CHURCH MEETINGS
   * ======================================================================== */

  async listChurchMeetings(
    organizationId: string,
    filters?: Omit<
      OrganizationMeetingFilters,
      "organizationId"
    >,
  ): Promise<
    ApiResult<Meeting[]>
  > {
    return this.listOrganizationMeetings(
      organizationId,
      filters,
    );
  },

  /* ==========================================================================
   * ORGANIZATION UPCOMING
   * ======================================================================== */

  async listOrganizationUpcoming(
    organizationId: string,
  ): Promise<
    ApiResult<Meeting[]>
  > {
    return this.listOrganizationMeetings(
      organizationId,
      {
        status: "scheduled",
      },
    );
  },

  /* ==========================================================================
   * ORGANIZATION TODAY
   * ======================================================================== */

  async listOrganizationToday(
    organizationId: string,
  ): Promise<
    ApiResult<Meeting[]>
  > {
    const cleanOrganizationId: string =
      String(
        organizationId ?? "",
      ).trim();

    if (!cleanOrganizationId) {
      return {
        ok: false,
        error:
          "Organization ID is required.",
      };
    }

    return request<Meeting[]>(
      `/meetings/organization/${encodeURIComponent(
        cleanOrganizationId,
      )}/today`,
    );
  },

  /* ==========================================================================
   * ORGANIZATION DEPARTMENT
   * ======================================================================== */

  async listDepartmentMeetings(
    organizationId: string,
    departmentId: string,
  ): Promise<
    ApiResult<Meeting[]>
  > {
    const cleanOrganizationId: string =
      String(
        organizationId ?? "",
      ).trim();

    const cleanDepartmentId: string =
      String(
        departmentId ?? "",
      ).trim();

    if (!cleanOrganizationId) {
      return {
        ok: false,
        error:
          "Organization ID is required.",
      };
    }

    if (!cleanDepartmentId) {
      return {
        ok: false,
        error:
          "Department ID is required.",
      };
    }

    return this.listOrganizationMeetings(
      cleanOrganizationId,
      {
        departmentId:
          cleanDepartmentId,
      },
    );
  },

  /* ==========================================================================
   * ORGANIZATION GROUP
   * ======================================================================== */

  async listGroupMeetings(
    organizationId: string,
    groupId: string,
  ): Promise<
    ApiResult<Meeting[]>
  > {
    const cleanOrganizationId: string =
      String(
        organizationId ?? "",
      ).trim();

    const cleanGroupId: string =
      String(
        groupId ?? "",
      ).trim();

    if (!cleanOrganizationId) {
      return {
        ok: false,
        error:
          "Organization ID is required.",
      };
    }

    if (!cleanGroupId) {
      return {
        ok: false,
        error:
          "Group ID is required.",
      };
    }

    return this.listOrganizationMeetings(
      cleanOrganizationId,
      {
        groupId: cleanGroupId,
      },
    );
  },

  /* ==========================================================================
   * SECURE JOIN LINK
   * ======================================================================== */

  async resolveJoinToken(
    joinToken: string,
  ): Promise<ApiResult<{
    success: boolean;
    meetingId: string;
    meetingCode?: string;
    topic?: string;
    description?: string;
    hostName?: string;
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
    timezone?: string;
    visibility?: MeetingVisibility;
    requireApproval?: boolean;
    allowGuests?: boolean;
    maxParticipants?: number;
    status?: string;
    hasPasscode?: boolean;
    security?: MeetingSecuritySettings;
    joinLink?: string;
  }>> {
    const token = String(joinToken ?? "").trim();

    if (!token) {
      return {
        ok: false,
        error: "Meeting join token is required.",
      };
    }

    return request(
      `/meetings/join-link/${encodeURIComponent(token)}`,
    );
  },

  /* ==========================================================================
   * GET SINGLE
   * ======================================================================== */

  async getById(
    meetingId: string,
  ): Promise<
    ApiResult<Meeting>
  > {
    const cleanId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    const result =
      await request<unknown>(
        `/meetings/${encodeURIComponent(
          cleanId,
        )}`,
      );

    if (!result.ok) {
      return result;
    }

    const meeting =
      normalizeMeeting(
        result.data,
      );

    if (!meeting) {
      return {
        ok: false,
        error:
          "The server returned an invalid meeting.",
      };
    }

    return {
      ok: true,
      data: meeting,
    };
  },

  /* ==========================================================================
   * CREATE
   * ======================================================================== */

  async create(
    payload: CreateMeetingPayload,
  ): Promise<
    ApiResult<Meeting>
  > {
    const topic: string =
      String(
        payload.topic ?? "",
      ).trim();

    if (!topic) {
      return {
        ok: false,
        error:
          "Meeting topic is required.",
      };
    }

    const durationMinutes: number =
      Number(
        payload.durationMinutes,
      );

    if (
      !Number.isFinite(
        durationMinutes,
      ) ||
      durationMinutes < 1 ||
      durationMinutes > 1440
    ) {
      return {
        ok: false,
        error:
          "Meeting duration must be between 1 and 1440 minutes.",
      };
    }

    const ownerType:
      MeetingOwnerType =
      payload.ownerType || "user";

    const ownerId:
      string | undefined =
      normalizeOptionalId(
        payload.ownerId,
      );

    const organizationId:
      string | undefined =
      normalizeOptionalId(
        payload.organizationId,
      );

    const departmentId:
      string | undefined =
      normalizeOptionalId(
        payload.departmentId,
      );

    const groupId:
      string | undefined =
      normalizeOptionalId(
        payload.groupId,
      );

    const eventId:
      string | undefined =
      normalizeOptionalId(
        payload.eventId,
      );

    if (
      ownerType ===
      "organization"
    ) {
      if (!organizationId) {
        return {
          ok: false,
          error:
            "Organization ID is required for an organization-owned meeting.",
        };
      }

      if (!ownerId) {
        return {
          ok: false,
          error:
            "Organization owner ID is required for an organization-owned meeting.",
        };
      }
    }

    const resolvedDate:
      string | null =
      payload.date?.trim() ||
      extractDateFromDateTime(
        payload.startTime,
      );

    let startTime: string;

    try {
      startTime =
        buildLocalDateTime(
          resolvedDate,
          payload.startTime,
        );
    } catch (error: unknown) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Invalid meeting date/time.",
      };
    }

    let endTime: string;

    try {
      endTime =
        resolveEndTime(
          resolvedDate,
          startTime,
          payload.endTime,
          durationMinutes,
        );
    } catch (error: unknown) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Invalid meeting end time.",
      };
    }

    const startDate: Date =
      new Date(startTime);

    const endDate: Date =
      new Date(endTime);

    if (
      Number.isNaN(
        startDate.getTime(),
      ) ||
      Number.isNaN(
        endDate.getTime(),
      )
    ) {
      return {
        ok: false,
        error:
          "Meeting start or end time is invalid.",
      };
    }

    if (
      endDate.getTime() <=
      startDate.getTime()
    ) {
      return {
        ok: false,
        error:
          "Meeting end time must be after the start time.",
      };
    }

    const agenda =
      normalizeAgenda(
        payload.agenda,
      );

    const inviteeIds =
      normalizeInviteeIds(
        payload.inviteeIds,
      );

    const backendPayload:
      BackendCreateMeetingPayload =
      {
        topic,

        ...(payload.description !==
        undefined
          ? {
              description:
                String(
                  payload.description,
                ).trim(),
            }
          : {}),

        ...(ownerId
          ? {
              ownerId,
            }
          : {}),

        ...(organizationId
          ? {
              organizationId,
            }
          : {}),

        ...(departmentId
          ? {
              departmentId,
            }
          : {}),

        ...(groupId
          ? {
              groupId,
            }
          : {}),

        ...(eventId
          ? {
              eventId,
            }
          : {}),

        ...(payload.churchMeetingType
          ? {
              churchMeetingType:
                payload.churchMeetingType,
            }
          : {}),

        ...(payload.visibility
          ? {
              visibility:
                payload.visibility,
            }
          : {}),

        ...(typeof payload.requireApproval ===
        "boolean"
          ? {
              requireApproval:
                payload.requireApproval,
            }
          : {}),

        ...(typeof payload.allowGuests ===
        "boolean"
          ? {
              allowGuests:
                payload.allowGuests,
            }
          : {}),

        ...(typeof payload.maxParticipants ===
          "number" &&
        Number.isFinite(
          payload.maxParticipants,
        ) &&
        payload.maxParticipants > 0
          ? {
              maxParticipants:
                Math.floor(
                  payload.maxParticipants,
                ),
            }
          : {}),

        startTime,

        endTime,

        durationMinutes,

        timezone:
          payload.timezone?.trim() ||
          "UTC",

        ...(payload.passcode !==
          undefined &&
        payload.passcode.trim()
          ? {
              passcode:
                payload.passcode.trim(),
            }
          : {}),

        ...(agenda
          ? {
              agenda,
            }
          : {}),

        ...(inviteeIds
          ? {
              inviteeIds,
            }
          : {}),

        ...(payload.security
          ? {
              security:
                payload.security,
            }
          : {}),

        ...(payload.secretary
          ? {
              secretary:
                payload.secretary,
            }
          : {}),

        ...(typeof payload.recordingEnabled ===
        "boolean"
          ? {
              recordingEnabled:
                payload.recordingEnabled,
            }
          : {}),
      };

    console.log(
      "[Meetings API] Creating meeting:",
      JSON.stringify(
        backendPayload,
        null,
        2,
      ),
    );

    const result =
      await request<Meeting>(
        "/meetings",
        {
          method: "POST",
          body:
            JSON.stringify(
              backendPayload,
            ),
        },
      );

    if (!result.ok) {
      return result;
    }

    const meetingId:
      string | null =
      extractMeetingId(
        result.data,
      );

    if (!meetingId) {
      console.error(
        "[Meetings API] Meeting was created but no ID was returned.",
        result.data,
      );

      return {
        ok: false,
        error:
          "Meeting was created, but the server did not return a meeting ID.",
      };
    }

    console.log(
      "[Meetings API] Created meeting ID:",
      meetingId,
    );

    return {
      ok: true,
      data: {
        ...(result.data as Meeting),
        id: meetingId,
      },
    };
  },

  /* ==========================================================================
   * CREATE CHURCH MEETING
   * ======================================================================== */

  async createChurchMeeting(
    organizationId: string,
    payload: Omit<
      CreateMeetingPayload,
      | "ownerType"
      | "ownerId"
      | "organizationId"
    >,
  ): Promise<
    ApiResult<Meeting>
  > {
    const cleanOrganizationId: string =
      String(
        organizationId ?? "",
      ).trim();

    if (!cleanOrganizationId) {
      return {
        ok: false,
        error:
          "Organization ID is required.",
      };
    }

    return this.create({
      ...payload,

      ownerType:
        "organization",

      ownerId:
        cleanOrganizationId,

      organizationId:
        cleanOrganizationId,

      visibility:
        payload.visibility ||
        "organization",
    });
  },

  /* ==========================================================================
   * UPDATE
   * ======================================================================== */

  async update(
    meetingId: string,
    payload: UpdateMeetingPayload,
  ): Promise<
    ApiResult<Meeting>
  > {
    const cleanId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    const backendPayload:
      Record<string, unknown> = {};

    if (
      payload.topic !==
      undefined
    ) {
      const topic: string =
        String(
          payload.topic,
        ).trim();

      if (!topic) {
        return {
          ok: false,
          error:
            "Meeting topic cannot be empty.",
        };
      }

      backendPayload.topic =
        topic;
    }

    if (
      payload.description !==
      undefined
    ) {
      backendPayload.description =
        String(
          payload.description,
        ).trim();
    }

    if (
      payload.ownerId !==
      undefined
    ) {
      const ownerId =
        normalizeOptionalId(
          payload.ownerId,
        );

      if (ownerId) {
        backendPayload.ownerId =
          ownerId;
      }
    }

    if (
      payload.organizationId !==
      undefined
    ) {
      const organizationId =
        normalizeOptionalId(
          payload.organizationId,
        );

      if (organizationId) {
        backendPayload.organizationId =
          organizationId;
      }
    }

    if (
      payload.departmentId !==
      undefined
    ) {
      const departmentId =
        normalizeOptionalId(
          payload.departmentId,
        );

      if (departmentId) {
        backendPayload.departmentId =
          departmentId;
      }
    }

    if (
      payload.groupId !==
      undefined
    ) {
      const groupId =
        normalizeOptionalId(
          payload.groupId,
        );

      if (groupId) {
        backendPayload.groupId =
          groupId;
      }
    }

    if (
      payload.eventId !==
      undefined
    ) {
      const eventId =
        normalizeOptionalId(
          payload.eventId,
        );

      if (eventId) {
        backendPayload.eventId =
          eventId;
      }
    }

    if (
      payload.churchMeetingType !==
      undefined
    ) {
      backendPayload.churchMeetingType =
        payload.churchMeetingType;
    }

    if (
      payload.visibility !==
      undefined
    ) {
      backendPayload.visibility =
        payload.visibility;
    }

    if (
      payload.requireApproval !==
      undefined
    ) {
      backendPayload.requireApproval =
        payload.requireApproval;
    }

    if (
      payload.allowGuests !==
      undefined
    ) {
      backendPayload.allowGuests =
        payload.allowGuests;
    }

    if (
      payload.maxParticipants !==
      undefined
    ) {
      const maxParticipants: number =
        Number(
          payload.maxParticipants,
        );

      if (
        !Number.isFinite(
          maxParticipants,
        ) ||
        maxParticipants < 1
      ) {
        return {
          ok: false,
          error:
            "Maximum participants must be at least 1.",
        };
      }

      backendPayload.maxParticipants =
        Math.floor(
          maxParticipants,
        );
    }

    /* ------------------------------------------------------------------------
     * DATE / TIME
     * ---------------------------------------------------------------------- */

    if (
      payload.date !==
        undefined ||
      payload.startTime !==
        undefined ||
      payload.endTime !==
        undefined
    ) {
      const existing =
        await this.getById(
          cleanId,
        );

      if (!existing.ok) {
        return {
          ok: false,
          error:
            existing.error,
        };
      }

      const existingStart:
        string =
        existing.data.startTime;

      const existingEnd:
        string | undefined =
        existing.data.endTime;

      const resolvedDate:
        string =
        payload.date ??
        extractDateFromDateTime(
          existingStart,
        ) ??
        new Date()
          .toISOString()
          .slice(0, 10);

      let startTime: string;

      try {
        if (
          payload.startTime !==
          undefined
        ) {
          startTime =
            buildLocalDateTime(
              resolvedDate,
              payload.startTime,
            );
        } else {
          startTime =
            existingStart;
        }
      } catch (error: unknown) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Invalid meeting start time.",
        };
      }

      let endTime: string;

      try {
        if (
          payload.endTime !==
          undefined
        ) {
          endTime =
            buildExplicitEndTime(
              resolvedDate,
              payload.endTime,
            );
        } else if (
          payload.durationMinutes !==
          undefined
        ) {
          endTime =
            buildMeetingEndTime(
              startTime,
              Number(
                payload.durationMinutes,
              ),
            );
        } else if (
          existingEnd
        ) {
          endTime =
            existingEnd;
        } else {
          endTime =
            buildMeetingEndTime(
              startTime,
              30,
            );
        }
      } catch (error: unknown) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Invalid meeting end time.",
        };
      }

      const parsedStart: Date =
        new Date(startTime);

      const parsedEnd: Date =
        new Date(endTime);

      if (
        Number.isNaN(
          parsedStart.getTime(),
        ) ||
        Number.isNaN(
          parsedEnd.getTime(),
        )
      ) {
        return {
          ok: false,
          error:
            "Meeting start or end time is invalid.",
        };
      }

      if (
        parsedEnd.getTime() <=
        parsedStart.getTime()
      ) {
        return {
          ok: false,
          error:
            "Meeting end time must be after the start time.",
        };
      }

      backendPayload.startTime =
        startTime;

      backendPayload.endTime =
        endTime;
    }

    /* ------------------------------------------------------------------------
     * DURATION
     * ---------------------------------------------------------------------- */

    if (
      payload.durationMinutes !==
      undefined
    ) {
      const duration: number =
        Number(
          payload.durationMinutes,
        );

      if (
        !Number.isFinite(
          duration,
        ) ||
        duration < 1 ||
        duration > 1440
      ) {
        return {
          ok: false,
          error:
            "Meeting duration must be between 1 and 1440 minutes.",
        };
      }

      backendPayload.durationMinutes =
        duration;

      if (
        payload.date ===
          undefined &&
        payload.startTime ===
          undefined &&
        payload.endTime ===
          undefined
      ) {
        const existing =
          await this.getById(
            cleanId,
          );

        if (!existing.ok) {
          return {
            ok: false,
            error:
              existing.error,
          };
        }

        try {
          backendPayload.endTime =
            buildMeetingEndTime(
              existing.data
                .startTime,
              duration,
            );
        } catch (error: unknown) {
          return {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to calculate meeting end time.",
          };
        }
      }
    }

    /* ------------------------------------------------------------------------
     * OTHER FIELDS
     * ---------------------------------------------------------------------- */

    if (
      payload.timezone !==
      undefined
    ) {
      backendPayload.timezone =
        payload.timezone.trim();
    }

    if (
      payload.passcode !==
      undefined
    ) {
      backendPayload.passcode =
        payload.passcode.trim();
    }

    if (
      payload.security !==
      undefined
    ) {
      backendPayload.security =
        payload.security;
    }

    if (
      payload.secretary !==
      undefined
    ) {
      backendPayload.secretary =
        payload.secretary;
    }

    if (
      payload.recordingEnabled !==
      undefined
    ) {
      backendPayload.recordingEnabled =
        payload.recordingEnabled;
    }

    if (
      payload.status !==
      undefined
    ) {
      backendPayload.status =
        payload.status;
    }

    if (
      payload.agenda !==
      undefined
    ) {
      backendPayload.agenda =
        normalizeAgenda(
          payload.agenda,
        );
    }

    if (
      payload.inviteeIds !==
      undefined
    ) {
      backendPayload.inviteeIds =
        normalizeInviteeIds(
          payload.inviteeIds,
        ) || [];
    }

    /*
     * Never send ownerType to NestJS.
     */
    delete backendPayload.ownerType;

    console.log(
      "[Meetings API] Updating meeting:",
      cleanId,
    );

    console.log(
      "[Meetings API] PATCH payload:",
      JSON.stringify(
        backendPayload,
        null,
        2,
      ),
    );

    return request<Meeting>(
      `/meetings/${encodeURIComponent(
        cleanId,
      )}`,
      {
        method: "PATCH",

        body:
          JSON.stringify(
            backendPayload,
          ),
      },
    );
  },

  /* ==========================================================================
   * UPDATE CHURCH MEETING
   * ======================================================================== */

  async updateChurchMeeting(
    meetingId: string,
    payload: UpdateMeetingPayload,
  ): Promise<
    ApiResult<Meeting>
  > {
    return this.update(
      meetingId,
      payload,
    );
  },

  /* ==========================================================================
   * INVITE USER
   * ======================================================================== */

  async inviteUser(
    meetingId: string,
    userId: string,
    message?: string,
  ): Promise<
    ApiResult<MeetingInvitation>
  > {
    const cleanMeetingId: string =
      String(
        meetingId ?? "",
      ).trim();

    const cleanUserId: string =
      String(
        userId ?? "",
      ).trim();

    if (!cleanMeetingId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    if (!cleanUserId) {
      return {
        ok: false,
        error:
          "User ID is required.",
      };
    }

    const payload:
      InviteUserPayload = {
      userId:
        cleanUserId,

      ...(message?.trim()
        ? {
            message:
              message.trim(),
          }
        : {}),
    };

    return request<MeetingInvitation>(
      `/meetings/${encodeURIComponent(
        cleanMeetingId,
      )}/invitations`,
      {
        method: "POST",

        body:
          JSON.stringify(
            payload,
          ),
      },
    );
  },

  /* ==========================================================================
   * INVITE USERS
   * ======================================================================== */

  async inviteUsers(
    meetingId: string,
    userIds: string[],
    message?: string,
  ): Promise<
    ApiResult<MeetingInvitation[]>
  > {
    const cleanMeetingId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanMeetingId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    const normalizedUserIds =
      normalizeInviteeIds(
        userIds,
      );

    if (
      !normalizedUserIds ||
      normalizedUserIds.length ===
        0
    ) {
      return {
        ok: false,
        error:
          "At least one user must be selected.",
      };
    }

    const payload:
      InviteUsersPayload = {
      userIds:
        normalizedUserIds,

      ...(message?.trim()
        ? {
            message:
              message.trim(),
          }
        : {}),
    };

    const result =
      await request<
        | MeetingInvitation[]
        | InvitationResponse
      >(
        `/meetings/${encodeURIComponent(
          cleanMeetingId,
        )}/invitations`,
        {
          method: "POST",

          body:
            JSON.stringify(
              payload,
            ),
        },
      );

    if (!result.ok) {
      return result;
    }

    if (Array.isArray(result.data)) {
      return {
        ok: true,
        data: result.data,
      };
    }

    return {
      ok: true,
      data:
        result.data.invitations ??
        result.data.invited ??
        result.data.data ??
        [],
    };
  },

  /* ==========================================================================
   * INVITE USERS BY IDS
   * ======================================================================== */

  async inviteUsersByIds(
    meetingId: string,
    inviteeIds: string[],
  ): Promise<
    ApiResult<MeetingInvitation[]>
  > {
    return this.inviteUsers(
      meetingId,
      inviteeIds,
    );
  },

  /* ==========================================================================
   * GET MEETING INVITATIONS
   * ======================================================================== */

  async getMeetingInvitations(
    meetingId: string,
  ): Promise<
    ApiResult<MeetingInvitation[]>
  > {
    const cleanId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    const result =
      await request<
        | MeetingInvitation[]
        | InvitationResponse
      >(
        `/meetings/${encodeURIComponent(
          cleanId,
        )}/invitations`,
      );

    if (!result.ok) {
      return result;
    }

    if (Array.isArray(result.data)) {
      return {
        ok: true,
        data: result.data,
      };
    }

    return {
      ok: true,
      data:
        result.data.invitations ??
        result.data.invited ??
        result.data.data ??
        [],
    };
  },

  /* ==========================================================================
   * CANCEL INVITATION
   * ======================================================================== */

  async cancelInvitation(
    meetingId: string,
    userId: string,
  ): Promise<
    ApiResult<void>
  > {
    const cleanMeetingId: string =
      String(
        meetingId ?? "",
      ).trim();

    const cleanUserId: string =
      String(
        userId ?? "",
      ).trim();

    if (!cleanMeetingId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    if (!cleanUserId) {
      return {
        ok: false,
        error:
          "User ID is required.",
      };
    }

    return request<void>(
      `/meetings/${encodeURIComponent(
        cleanMeetingId,
      )}/invitations/${encodeURIComponent(
        cleanUserId,
      )}`,
      {
        method: "DELETE",
      },
    );
  },

  /* ==========================================================================
   * ACCEPT INVITATION
   * ======================================================================== */

  async acceptInvitation(
    meetingId: string,
  ): Promise<
    ApiResult<MeetingInvitation>
  > {
    const cleanId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    return request<MeetingInvitation>(
      `/meetings/${encodeURIComponent(
        cleanId,
      )}/invitations/accept`,
      {
        method: "POST",
      },
    );
  },

  /* ==========================================================================
   * DECLINE INVITATION
   * ======================================================================== */

  async declineInvitation(
    meetingId: string,
  ): Promise<
    ApiResult<MeetingInvitation>
  > {
    const cleanId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    return request<MeetingInvitation>(
      `/meetings/${encodeURIComponent(
        cleanId,
      )}/invitations/decline`,
      {
        method: "POST",
      },
    );
  },

  /* ==========================================================================
   * CANCEL MEETING
   * ======================================================================== */

  async cancel(
    meetingId: string,
  ): Promise<
    ApiResult<void>
  > {
    const cleanId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    return request<void>(
      `/meetings/${encodeURIComponent(
        cleanId,
      )}`,
      {
        method: "DELETE",
      },
    );
  },

  /* ==========================================================================
   * START
   * ======================================================================== */

  async startMeeting(
    meetingId: string,
  ): Promise<
    ApiResult<StartMeetingResponse>
  > {
    const cleanId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    return request<StartMeetingResponse>(
      `/meetings/${encodeURIComponent(
        cleanId,
      )}/start`,
      {
        method: "POST",
      },
    );
  },

  /* ==========================================================================
   * END
   * ======================================================================== */

  async endMeeting(
    meetingId: string,
  ): Promise<
    ApiResult<unknown>
  > {
    const cleanId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    return request<unknown>(
      `/meetings/${encodeURIComponent(
        cleanId,
      )}/end`,
      {
        method: "POST",
      },
    );
  },

  /* ==========================================================================
   * JOIN
   * ======================================================================== */

  async requestToJoin(
    meetingId: string,
    passcode?: string,
  ): Promise<
    ApiResult<JoinMeetingResponse>
  > {
    const cleanId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    return request<JoinMeetingResponse>(
      `/meetings/${encodeURIComponent(
        cleanId,
      )}/join`,
      {
        method: "POST",

        body:
          JSON.stringify(
            passcode?.trim()
              ? {
                  passcode:
                    passcode.trim(),
                }
              : {},
          ),
      },
    );
  },

  /* ==========================================================================
   * PARTICIPANTS
   * ======================================================================== */

  async getParticipants(
    meetingId: string,
  ): Promise<
    ApiResult<MeetingParticipant[]>
  > {
    const cleanId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    return request<MeetingParticipant[]>(
      `/meetings/${encodeURIComponent(
        cleanId,
      )}/participants`,
    );
  },

  /* ==========================================================================
   * ATTENDANCE
   * ======================================================================== */

  async getAttendance(
    meetingId: string,
  ): Promise<
    ApiResult<MeetingAttendanceRecord[]>
  > {
    const cleanId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    const result =
      await request<
        | MeetingAttendanceRecord[]
        | {
            records?: MeetingAttendanceRecord[];

            attendance?: MeetingAttendanceRecord[];

            data?: MeetingAttendanceRecord[];
          }
      >(
        `/meetings/${encodeURIComponent(
          cleanId,
        )}/attendance`,
      );

    if (!result.ok) {
      return result;
    }

    if (Array.isArray(result.data)) {
      return {
        ok: true,
        data: result.data,
      };
    }

    return {
      ok: true,
      data:
        result.data.records ??
        result.data.attendance ??
        result.data.data ??
        [],
    };
  },

  /* ==========================================================================
   * CHAT — GET
   * ======================================================================== */

  async getMessages(
    meetingId: string,
  ): Promise<
    ApiResult<MeetingMessage[]>
  > {
    const cleanId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    return request<MeetingMessage[]>(
      `/meetings/${encodeURIComponent(
        cleanId,
      )}/messages`,
    );
  },

  /* ==========================================================================
   * CHAT — SEND
   * ======================================================================== */

  async sendMessage(
    meetingId: string,
    body: string,
  ): Promise<
    ApiResult<MeetingMessage>
  > {
    const cleanId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    const cleanBody: string =
      String(
        body ?? "",
      ).trim();

    if (!cleanBody) {
      return {
        ok: false,
        error:
          "Message cannot be empty.",
      };
    }

    return request<MeetingMessage>(
      `/meetings/${encodeURIComponent(
        cleanId,
      )}/messages`,
      {
        method: "POST",

        body:
          JSON.stringify({
            body: cleanBody,
          }),
      },
    );
  },

  /* ==========================================================================
   * REACTIONS
   * ======================================================================== */

  async addReaction(
    meetingId: string,
    emoji: string,
  ): Promise<
    ApiResult<MeetingReaction>
  > {
    const cleanId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    const cleanEmoji: string =
      String(
        emoji ?? "",
      ).trim();

    if (!cleanEmoji) {
      return {
        ok: false,
        error:
          "Reaction emoji is required.",
      };
    }

    return request<MeetingReaction>(
      `/meetings/${encodeURIComponent(
        cleanId,
      )}/reactions`,
      {
        method: "POST",

        body:
          JSON.stringify({
            emoji:
              cleanEmoji,
          }),
      },
    );
  },

  /* ==========================================================================
   * SETTINGS
   * ======================================================================== */

  async updateSettings(
    meetingId: string,
    settings: Partial<{
      waitingRoomEnabled: boolean;

      allowJoinBeforeHost: boolean;

      muteParticipantsOnEntry: boolean;

      screenShareWhoCanShare:
        | "host_only"
        | "everyone";

      locked: boolean;
    }>,
  ): Promise<
    ApiResult<Meeting>
  > {
    const cleanId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    return request<Meeting>(
      `/meetings/${encodeURIComponent(
        cleanId,
      )}/settings`,
      {
        method: "PATCH",

        body:
          JSON.stringify(
            settings,
          ),
      },
    );
  },

  /* ==========================================================================
   * AI SECRETARY — SUMMARY
   * ======================================================================== */

  async getSummary(
    meetingId: string,
  ): Promise<
    ApiResult<MeetingSummary>
  > {
    const cleanId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    return request<MeetingSummary>(
      `/meetings/${encodeURIComponent(
        cleanId,
      )}/summary`,
    );
  },

  /* ==========================================================================
   * AI SECRETARY — TRANSCRIPT
   * ======================================================================== */

  async getTranscript(
    meetingId: string,
  ): Promise<
    ApiResult<MeetingTranscriptLine[]>
  > {
    const cleanId: string =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanId) {
      return {
        ok: false,
        error:
          "Meeting ID is required.",
      };
    }

    const result =
      await request<
        | MeetingTranscriptResponse
        | MeetingTranscriptLine[]
      >(
        `/meetings/${encodeURIComponent(
          cleanId,
        )}/transcript`,
      );

    if (!result.ok) {
      return result;
    }

    if (Array.isArray(result.data)) {
      return {
        ok: true,
        data: result.data,
      };
    }

    return {
      ok: true,
      data:
        Array.isArray(
          result.data.lines,
        )
          ? result.data.lines
          : [],
    };
  },
};

export default meetingsApi;