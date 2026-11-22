/**
 * attendanceApi.ts — ministry attendance API client.
 * Base: /organizations/:organizationId/ministries/:ministryId/attendance
 * (see apps/api/src/org/ministry-attendance/ministry-attendance.controller.ts)
 */

import { CHURCH_API_BASE, churchGet, churchPatch, churchPost, getAuthToken } from "../../api/organizationApi";

export type AttendanceStatus = "present" | "late" | "absent" | "excused";
export type SessionStatus = "upcoming" | "open" | "in_progress" | "awaiting_review" | "finalized" | "canceled" | "archived";
export type RecordingMethod = "QR_CODE" | "MEMBER_SELF_CHECKIN" | "MANUAL" | "IMPORT" | "ADMIN_CORRECTION" | "FINALIZATION";

export interface AttendanceSettings {
  qrCheckIn: boolean;
  selfCheckIn: boolean;
  manualAttendance: boolean;
  opensMinutesBefore: number;
  closesMinutesAfter: number;
  allowCorrections: boolean;
  requireCorrectionReason: boolean;
  allowCorrectionsAfterFinalize: boolean;
  allowReopen: boolean;
  allowVisitors: boolean;
  membersSeeOwnHistory: boolean;
  timeZone: string;
}

export interface SessionCounts {
  present: number;
  late: number;
  absent: number;
  excused: number;
  checkedIn: number;
  expected: number;
  notCheckedIn: number;
  rate: number | null;
}

export interface AttendanceSession {
  id: string;
  occurrenceKey: string;
  sourceType: "meeting" | "event" | "manual";
  title: string;
  location: string;
  occurrenceDate: string;
  scheduledStartAt: string;
  scheduledEndAt: string | null;
  timeZone: string;
  checkInOpensAt: string;
  checkInClosesAt: string;
  state: "scheduled" | "finalized" | "canceled" | "archived";
  status: SessionStatus;
  cancelReason: string;
  finalizedAt: string | null;
  counts: SessionCounts;
}

export interface AuditEntry {
  at: string;
  byName: string;
  previousStatus: string | null;
  newStatus: string;
  previousArrivalAt: string | null;
  newArrivalAt: string | null;
  previousLateMinutes: number | null;
  newLateMinutes: number | null;
  method: string;
  reason: string;
  afterFinalization: boolean;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  membershipId: string;
  memberName: string;
  memberAvatarUrl: string | null;
  status: AttendanceStatus;
  actualArrivalAt: string | null;
  arrivalLocal: string | null;
  recordedAt: string;
  lateMinutes: number | null;
  recordingMethod: RecordingMethod;
  recordedByName: string;
  correctionReason: string;
  audit: AuditEntry[];
  sessionTitle?: string;
}

export interface AttendanceAccess {
  canManage: boolean;
  canView: boolean;
  isMember: boolean;
  inMinistry: boolean;
  membershipId: string | null;
  settings: AttendanceSettings;
}

export interface AttendanceDashboard {
  date: string;
  today: string;
  timeZone: string;
  access: { canManage: boolean; canView: boolean };
  settings: AttendanceSettings;
  totals: { present: number; late: number; absent: number; excused: number; notCheckedIn: number; expected: number; checkedIn: number; rate: number | null };
  sessions: AttendanceSession[];
  recentCheckIns: AttendanceRecord[];
  trend: AttendanceSession[];
  history: AttendanceSession[];
  upcoming: AttendanceSession[];
  meetingsWithoutTimes: string[];
}

export interface RosterRow {
  membershipId: string;
  name: string;
  avatarUrl: string | null;
  expected: boolean;
  record: AttendanceRecord | null;
}

export interface SessionDetail {
  session: AttendanceSession;
  access: { canManage: boolean; canView: boolean };
  settings: AttendanceSettings;
  roster: RosterRow[];
  corrections: (AuditEntry & { membershipId: string; memberName: string })[];
  log: { at: string; byName: string; action: string; note: string }[];
}

export interface MemberHistory {
  member: { membershipId: string; name: string; avatarUrl: string | null };
  summary: {
    expected: number;
    attended: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    notCheckedIn: number;
    rate: number | null;
    averageLateMinutes: number | null;
  };
  rows: { session: AttendanceSession; record: AttendanceRecord | null; outcome: string }[];
  denominator: string;
}

export interface AttendanceReport {
  from: string;
  to: string;
  sessionsHeld: number;
  sessionsCanceled: number;
  totals: { present: number; late: number; absent: number; excused: number; eligible: number; averageRate: number | null };
  trend: AttendanceSession[];
  participation: { membershipId: string; name: string; attended: number; present: number; late: number; absent: number; excused: number; averageLateMinutes: number | null }[];
  corrections: { memberName: string; sessionTitle: string; occurrenceDate: string; at: string; byName: string; previousStatus: string | null; newStatus: string; reason: string; afterFinalization: boolean }[];
  manualCount: number;
  denominator: string;
}

export interface CheckInResult {
  already: boolean;
  meeting: string;
  occurrenceDate: string;
  timeZone: string;
  scheduledStartAt: string;
  record: AttendanceRecord;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const base = (o: string, m: string) => `/organizations/${encodeURIComponent(o)}/ministries/${encodeURIComponent(m)}/attendance`;

export const attendanceApi = {
  access: (o: string, m: string, signal?: AbortSignal) => churchGet<AttendanceAccess>(`${base(o, m)}/access`, undefined, signal),
  dashboard: (o: string, m: string, q: { date?: string; trend?: string }, signal?: AbortSignal) =>
    churchGet<AttendanceDashboard>(`${base(o, m)}/dashboard`, q, signal),
  sessions: (o: string, m: string, q: { status?: string; from?: string; to?: string; search?: string; page?: number; pageSize?: number }, signal?: AbortSignal) =>
    churchGet<Paged<AttendanceSession>>(`${base(o, m)}/sessions`, q, signal),
  createSession: (o: string, m: string, body: { title: string; date: string; startTime: string; endTime?: string; location?: string }) =>
    churchPost<SessionDetail>(`${base(o, m)}/sessions`, body),
  session: (o: string, m: string, id: string, signal?: AbortSignal) => churchGet<SessionDetail>(`${base(o, m)}/sessions/${encodeURIComponent(id)}`, undefined, signal),
  record: (
    o: string,
    m: string,
    id: string,
    body: { membershipIds: string[]; status: AttendanceStatus; arrivalTime?: string; arrivalDate?: string; reason?: string; overwrite?: boolean },
  ) =>
    churchPost<{ saved: number; skipped: { membershipId: string; name: string; status: string }[]; rejected: { membershipId: string; reason: string }[]; officialStatus: AttendanceStatus; lateMinutes: number | null }>(
      `${base(o, m)}/sessions/${encodeURIComponent(id)}/records`,
      body,
    ),
  finalize: (o: string, m: string, id: string, unrecorded: "absent" | "excused" | "leave") =>
    churchPost<SessionDetail>(`${base(o, m)}/sessions/${encodeURIComponent(id)}/finalize`, { unrecorded }),
  reopen: (o: string, m: string, id: string, reason: string) => churchPost<SessionDetail>(`${base(o, m)}/sessions/${encodeURIComponent(id)}/reopen`, { reason }),
  cancel: (o: string, m: string, id: string, reason: string) => churchPost<SessionDetail>(`${base(o, m)}/sessions/${encodeURIComponent(id)}/cancel`, { reason }),
  restore: (o: string, m: string, id: string) => churchPost<SessionDetail>(`${base(o, m)}/sessions/${encodeURIComponent(id)}/restore`, {}),
  window: (o: string, m: string, id: string, action: "open" | "close") =>
    churchPost<SessionDetail>(`${base(o, m)}/sessions/${encodeURIComponent(id)}/window`, { action }),
  qr: (o: string, m: string, id: string) =>
    churchGet<{ sessionId: string; token: string; title: string; occurrenceDate: string; scheduledStartAt: string; checkInOpensAt: string; checkInClosesAt: string; timeZone: string; status: SessionStatus }>(
      `${base(o, m)}/sessions/${encodeURIComponent(id)}/qr`,
    ),
  checkInInfo: (o: string, m: string, id: string, signal?: AbortSignal) =>
    churchGet<{ ministryName: string; session: AttendanceSession; selfCheckIn: boolean; qrCheckIn: boolean; isMember: boolean; myRecord: AttendanceRecord | null }>(
      `${base(o, m)}/sessions/${encodeURIComponent(id)}/check-in`,
      undefined,
      signal,
    ),
  checkIn: (o: string, m: string, id: string, token?: string) => churchPost<CheckInResult>(`${base(o, m)}/sessions/${encodeURIComponent(id)}/check-in`, token ? { token } : {}),
  member: (o: string, m: string, membershipId: string, signal?: AbortSignal) =>
    churchGet<MemberHistory>(`${base(o, m)}/members/${encodeURIComponent(membershipId)}`, undefined, signal),
  report: (o: string, m: string, q: { from?: string; to?: string }, signal?: AbortSignal) => churchGet<AttendanceReport>(`${base(o, m)}/report`, q, signal),
  settings: (o: string, m: string, body: Partial<AttendanceSettings>) => churchPatch<AttendanceSettings>(`${base(o, m)}/settings`, body),

  /** Downloads the CSV (opens in Excel). */
  async exportCsv(o: string, m: string, q: { sessionId?: string; from?: string; to?: string }) {
    const params = new URLSearchParams(Object.entries(q).filter(([, v]) => Boolean(v)) as [string, string][]);
    const res = await fetch(`${CHURCH_API_BASE}${base(o, m)}/export.csv?${params}`, {
      headers: { Authorization: `Bearer ${getAuthToken() ?? ""}` },
      credentials: "include",
    });
    if (!res.ok) throw new Error(res.status === 403 ? "You don't have permission to export attendance." : "The export could not be created.");
    const blob = await res.blob();
    const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "attendance.csv";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
};

/* ------------------------------------------------------------- formatting */

export function fmtTime(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone });
}

/** "2026-11-15" → "Sun, Nov 15, 2026" (calendar date, no time zone shift). */
export function fmtYmd(ymd: string, style: "long" | "short" | "full" = "long"): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const opts: Intl.DateTimeFormatOptions =
    style === "short"
      ? { month: "short", day: "numeric", timeZone: "UTC" }
      : style === "full"
        ? { weekday: "long", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }
        : { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" };
  return date.toLocaleDateString(undefined, opts);
}

export function fmtDateTime(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone });
}

export function localYmdNow(timeZone?: string): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return p; // en-CA formats as YYYY-MM-DD
}

export function lateText(minutes: number | null | undefined): string {
  if (minutes == null) return "Late (time unknown)";
  if (minutes <= 0) return "On time";
  return `Late by ${minutes} min${minutes === 1 ? "" : "s"}`;
}

export const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  excused: "Excused",
  not_checked_in: "Not Checked In",
  pending: "Pending",
  canceled: "Canceled",
};

export const SESSION_LABEL: Record<SessionStatus, string> = {
  upcoming: "Upcoming",
  open: "Check-in Open",
  in_progress: "In Progress",
  awaiting_review: "Awaiting Review",
  finalized: "Finalized",
  canceled: "Canceled",
  archived: "Archived",
};

export const METHOD_LABEL: Record<string, string> = {
  QR_CODE: "QR code",
  MEMBER_SELF_CHECKIN: "Self check-in",
  MANUAL: "Manual",
  IMPORT: "Import",
  ADMIN_CORRECTION: "Correction",
  FINALIZATION: "At finalization",
};

export function checkInUrl(o: string, m: string, sessionId: string, token: string): string {
  return `${window.location.origin}/organizations/${encodeURIComponent(o)}/ministries/${encodeURIComponent(m)}/check-in/${encodeURIComponent(sessionId)}?t=${encodeURIComponent(token)}`;
}
