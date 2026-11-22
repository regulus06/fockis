/* ============================================================================
   ORGANIZATION LIVESTREAMS — API
   web/src/features/organizations/live-center/liveApi.ts

   /church/organizations/:organizationId/live (apps/api/src/org/live).
   The server checks access and the Manage live permission on every call; it
   never returns meeting links or Fockis Live stream ids to people who may
   not watch.
============================================================================ */

import { churchDelete, churchGet, churchPatch, churchPost, churchRequest, churchUpload, getAuthToken } from "../api/organizationApi";

type Query = Record<string, string | number | boolean | undefined | null>;

/** Endpoints that also work for visitors: send the login when there is one. */
function open<T>(path: string, method: "GET" | "POST", payload?: { query?: Query; body?: unknown; signal?: AbortSignal }): Promise<T> {
  return churchRequest<T>(path, {
    method,
    query: payload?.query,
    body: payload?.body,
    signal: payload?.signal,
    anonymous: !getAuthToken(),
  });
}

export type LiveVisibility = "public" | "members" | "private" | "groups";
export type LiveState = "draft" | "scheduled" | "live" | "ended" | "cancelled" | "failed";
export type LiveStatus = "draft" | "scheduled" | "waiting" | "live" | "completed" | "cancelled" | "failed";
export type LiveSource = "fockis_live" | "meeting";
export type LiveDenyReason = "sign_in" | "members_only" | "groups_only" | "invitation_required" | "not_available";

export interface LiveSettings {
  showOnPublicPage: boolean;
  showLockedPreview: boolean;
  enableChat: boolean;
  enableComments: boolean;
  enableRecording: boolean;
  allowReplay: boolean;
  allowSharing: boolean;
  notifyMembers: boolean;
  requireRegistration: boolean;
  waitingRoom: boolean;
  requireApproval: boolean;
  allowGuests: boolean;
  attendanceEnabled: boolean;
  allowAccessRequests: boolean;
  bearerLinks: boolean;
  earlyJoinMinutes: number;
}

export interface LinkedMeetingInfo {
  meetingId: string | null;
  title: string;
  startsAt: string | null;
  visibility: string;
  requireApproval: boolean;
  waitingRoom: boolean;
  allowGuests: boolean;
  validatedAt: string | null;
}

export interface Livestream {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  visibility: LiveVisibility;
  state: LiveState;
  status: LiveStatus;
  scheduledStart: string;
  scheduledEnd: string | null;
  timeZone: string;
  location: string;
  actualStart: string | null;
  endedAt: string | null;
  posterUrl: string | null;
  thumbnailUrl: string | null;
  coverUrl: string | null;
  sourceType: LiveSource;
  eventId: string | null;
  settings: LiveSettings;
  viewerCount: number;
  peakViewers: number;
  totalViews?: number;
  uniqueViewers?: number;
  currentUserHasAccess: boolean;
  accessReason: LiveDenyReason | null;
  canManage: boolean;
  isArchived: boolean;
  /* Managers only */
  meetingUrl?: string;
  meeting?: LinkedMeetingInfo;
  liveStreamId?: string | null;
  allowedGroupIds?: string[];
  allowedDepartmentIds?: string[];
  /* GET one */
  accessRequest?: { status: string } | null;
  signedIn?: boolean;
  isMember?: boolean;
}

export interface LivePage {
  items: Livestream[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface LiveStats {
  currentlyLive: number;
  scheduled: number;
  currentViewers: number;
  previousStreams: number;
  drafts: number;
  at: string;
}

export interface LiveAnalytics {
  from: string;
  to: string;
  totals: {
    livestreams: number;
    completed: number;
    totalViews: number;
    uniqueViewers: number;
    peakConcurrent: number;
    averageViewMinutes: number | null;
    memberAttendees: number;
    memberViews: number;
    publicViews: number;
    replayViews: number;
    likes: number;
    comments: number;
    shares: number;
  };
  streams: {
    id: string;
    title: string;
    status: LiveStatus;
    visibility: LiveVisibility;
    scheduledStart: string;
    durationMinutes: number | null;
    views: number;
    uniqueViewers: number;
    memberAttendees: number;
    peakViewers: number;
    replayViews: number;
  }[];
}

export interface LiveInput {
  title?: string;
  description?: string;
  visibility?: LiveVisibility;
  scheduledStart?: string;
  scheduledEnd?: string | null;
  timeZone?: string;
  location?: string;
  posterUrl?: string | null;
  coverUrl?: string | null;
  sourceType?: LiveSource;
  meetingUrl?: string;
  allowedGroupIds?: string[];
  allowedDepartmentIds?: string[];
  settings?: Partial<LiveSettings>;
  eventId?: string | null;
  isDraft?: boolean;
}

export interface MeetingCheck {
  meetingId: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  timeZone: string;
  hostName: string;
  status: string;
  visibility: string;
  requireApproval: boolean;
  waitingRoom: boolean;
  allowGuests: boolean;
  url: string;
  protected: boolean;
  warnings: string[];
}

export interface LiveInvitation {
  id: string;
  kind: "invite" | "request";
  status: "pending" | "accepted" | "expired" | "revoked" | "declined";
  isLink: boolean;
  userId: string | null;
  name: string;
  username: string;
  email: string;
  message: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  lastSentAt: string | null;
  createdAt: string | null;
}

export interface JoinResult {
  kind: "fockis_live" | "meeting" | "replay";
  url?: string;
  liveStreamId?: string;
  watchUrl?: string;
  waitingRoom?: boolean;
  viewId: string | null;
  state: LiveState;
}

export interface MyLivestreams {
  isMember: boolean;
  live: Livestream[];
  upcoming: Livestream[];
  past: Livestream[];
  invitations: { id: string; status: LiveInvitation["status"]; expiresAt: string | null; livestream: Livestream }[];
}

export interface AttendanceReport {
  livestream: { id: string; title: string; scheduledStart: string; attendanceEnabled: boolean };
  attendees: { name: string; isMember: boolean; firstJoin: string; lastLeave: string; minutes: number; sessions: number }[];
}

const enc = encodeURIComponent;
const base = (orgId: string) => `/organizations/${enc(orgId)}/live`;
const one = (orgId: string, id: string) => `${base(orgId)}/${enc(id)}`;

/** Random id for public visitors (their viewing sessions), kept in this browser. */
export function visitorKey(): string {
  try {
    let key = localStorage.getItem("fockis.liveVisitor");
    if (!key) {
      key = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem("fockis.liveVisitor", key);
    }
    return key;
  } catch {
    return "";
  }
}

export const liveApi = {
  list(orgId: string, q: { tab?: string; search?: string; visibility?: string; status?: string; page?: number; pageSize?: number }, signal?: AbortSignal) {
    return open<LivePage>(base(orgId), "GET", { query: q, signal });
  },
  stats(orgId: string, signal?: AbortSignal) {
    return churchGet<LiveStats>(`${base(orgId)}/stats`, undefined, signal);
  },
  analytics(orgId: string, from: string, to: string, signal?: AbortSignal) {
    return churchGet<LiveAnalytics>(`${base(orgId)}/analytics`, { from, to }, signal);
  },
  publicListing(orgId: string, past = false, signal?: AbortSignal) {
    return open<{ live: Livestream[]; upcoming: Livestream[]; past: Livestream[] }>(`${base(orgId)}/public`, "GET", { query: past ? { past: 1 } : undefined, signal });
  },
  mine(orgId: string, signal?: AbortSignal) {
    return churchGet<MyLivestreams>(`${base(orgId)}/mine`, undefined, signal);
  },
  get(orgId: string, id: string, signal?: AbortSignal) {
    return open<Livestream>(one(orgId, id), "GET", { signal });
  },
  create(orgId: string, input: LiveInput) {
    return churchPost<Livestream>(base(orgId), input);
  },
  update(orgId: string, id: string, input: LiveInput) {
    return churchPatch<Livestream>(one(orgId, id), input);
  },
  setState(orgId: string, id: string, state: LiveState) {
    return churchPatch<Livestream & { watch: { kind: "fockis_live"; liveStreamId: string; studioUrl: string } | null }>(`${one(orgId, id)}/state`, { state });
  },
  remove(orgId: string, id: string) {
    return churchDelete<void>(one(orgId, id));
  },
  archive(orgId: string, id: string, archived: boolean) {
    return churchPost<Livestream>(`${one(orgId, id)}/${archived ? "archive" : "restore"}`);
  },
  upload(orgId: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    return churchUpload<{ fileUrl: string }>(`${base(orgId)}/upload`, form);
  },
  validateMeeting(orgId: string, url: string, visibility: LiveVisibility) {
    return churchPost<MeetingCheck>(`${base(orgId)}/validate-meeting`, { url, visibility });
  },
  attendance(orgId: string, id: string, signal?: AbortSignal) {
    return churchGet<AttendanceReport>(`${one(orgId, id)}/attendance`, undefined, signal);
  },
  invitations(orgId: string, id: string, signal?: AbortSignal) {
    return churchGet<{ bearerLinks: boolean; items: LiveInvitation[] }>(`${one(orgId, id)}/invitations`, undefined, signal);
  },
  invite(orgId: string, id: string, body: { userIds?: string[]; emails?: string[]; link?: boolean; expiresAt?: string; message?: string }) {
    return churchPost<{ created: { id: string; link?: string; email?: string; userId?: string }[]; note?: string }>(`${one(orgId, id)}/invitations`, body);
  },
  resend(orgId: string, invitationId: string) {
    return churchPost<{ id: string; link: string }>(`${base(orgId)}/invitations/${enc(invitationId)}/resend`);
  },
  revoke(orgId: string, invitationId: string) {
    return churchPost<{ id: string; status: string }>(`${base(orgId)}/invitations/${enc(invitationId)}/revoke`);
  },
  respond(orgId: string, invitationId: string, approve: boolean) {
    return churchPost<{ id: string; status: string }>(`${base(orgId)}/invitations/${enc(invitationId)}/${approve ? "approve" : "deny"}`);
  },
  accept(orgId: string, id: string, token: string) {
    return churchPost<{ status: string }>(`${one(orgId, id)}/invitations/accept`, { token });
  },
  acceptMine(orgId: string, invitationId: string) {
    return churchPost<{ status: string }>(`${base(orgId)}/invitations/${enc(invitationId)}/accept`);
  },
  decline(orgId: string, invitationId: string) {
    return churchPost<{ status: string }>(`${base(orgId)}/invitations/${enc(invitationId)}/decline`);
  },
  requestAccess(orgId: string, id: string, message?: string) {
    return churchPost<{ status: string }>(`${one(orgId, id)}/request-access`, { message });
  },
  join(orgId: string, id: string, replay = false) {
    return open<JoinResult>(`${one(orgId, id)}/join`, "POST", { body: { visitorKey: visitorKey(), replay } });
  },
  heartbeat(orgId: string, id: string, viewId: string) {
    return open<{ ok: boolean }>(`${one(orgId, id)}/heartbeat`, "POST", { body: { viewId, visitorKey: visitorKey() } });
  },
  leave(orgId: string, id: string, viewId: string) {
    return open<{ ok: boolean }>(`${one(orgId, id)}/leave`, "POST", { body: { viewId, visitorKey: visitorKey() } });
  },
};

/* ------------------------------------------------------------------ labels */

export const VISIBILITY_LABEL: Record<LiveVisibility, string> = {
  public: "Public",
  members: "Members Only",
  private: "Private",
  groups: "Selected Groups",
};

export const STATUS_LABEL: Record<LiveStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  waiting: "Waiting for Host",
  live: "Live Now",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
};

export const DENY_LABEL: Record<LiveDenyReason, string> = {
  sign_in: "Sign in to watch",
  members_only: "Members Only",
  groups_only: "Selected groups only",
  invitation_required: "Invitation Required",
  not_available: "Not available",
};

/** Absolute link to the watch page (for sharing and for event meeting links). */
export function watchUrl(orgId: string, id: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/organizations/${enc(orgId)}/live/${enc(id)}`;
}
