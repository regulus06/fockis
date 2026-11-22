/* ============================================================================
   REQUESTS & INQUIRIES — API CLIENT
   /church/organizations/:orgId/requests (+ sub routes)
============================================================================ */

import { churchDelete, churchGet, churchPatch, churchPost, churchRequest, getAuthToken } from "../api/organizationApi";

export type RequestType =
  | "prayer"
  | "visit"
  | "counseling"
  | "general"
  | "volunteer"
  | "membership"
  | "baptism"
  | "marriage"
  | "event"
  | "ministry"
  | "pastoral_support"
  | "assistance"
  | "meeting"
  | "other";
export type RequestStatus = "new" | "in_progress" | "waiting" | "resolved" | "archived";
export type RequestPriority = "normal" | "high" | "urgent";
export type RequestTab = "all" | "member" | "public" | "mine" | "archived";
export type RequestSort = "newest" | "oldest" | "priority" | "updated";

export const REQUEST_TYPES: { value: RequestType; label: string }[] = [
  { value: "prayer", label: "Prayer Request" },
  { value: "visit", label: "Visit Request" },
  { value: "counseling", label: "Counseling" },
  { value: "general", label: "General Inquiry" },
  { value: "volunteer", label: "Volunteer Request" },
  { value: "membership", label: "Membership Inquiry" },
  { value: "baptism", label: "Baptism Request" },
  { value: "marriage", label: "Marriage Request" },
  { value: "event", label: "Event Inquiry" },
  { value: "ministry", label: "Ministry Inquiry" },
  { value: "pastoral_support", label: "Pastoral Support" },
  { value: "assistance", label: "Assistance Request" },
  { value: "meeting", label: "Meeting Request" },
  { value: "other", label: "Other" },
];
export const TYPE_LABEL = Object.fromEntries(REQUEST_TYPES.map((t) => [t.value, t.label])) as Record<RequestType, string>;

/** What the public "Contact Our Church" form offers. */
export const PUBLIC_TYPES: { value: RequestType; label: string }[] = [
  { value: "general", label: "General inquiry" },
  { value: "prayer", label: "Prayer request" },
  { value: "visit", label: "Visit request" },
  { value: "membership", label: "Membership inquiry" },
  { value: "baptism", label: "Baptism inquiry" },
  { value: "counseling", label: "Counseling request" },
  { value: "volunteer", label: "Volunteer inquiry" },
  { value: "assistance", label: "Assistance request" },
  { value: "meeting", label: "Meeting request" },
  { value: "other", label: "Other question" },
];

export const STATUS_OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting", label: "Waiting for Response" },
  { value: "resolved", label: "Resolved" },
  { value: "archived", label: "Archived" },
];
export const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s.label])) as Record<RequestStatus, string>;
export const STATUS_SHORT: Record<RequestStatus, string> = { new: "New", in_progress: "In Progress", waiting: "Waiting", resolved: "Resolved", archived: "Archived" };

export const PRIORITY_LABEL: Record<RequestPriority, string> = { normal: "Normal", high: "High", urgent: "Urgent" };

export interface RequestAccess {
  canAssign: boolean;
  canDelete: boolean;
  canReport: boolean;
  canCreate: boolean;
  canPastoralNotes: boolean;
}

export interface RequestSummary {
  id: string;
  requestNumber: string;
  requesterType: "member" | "public";
  requesterName: string;
  avatarUrl: string | null;
  email: string;
  requestType: RequestType;
  subject: string;
  preview: string;
  status: RequestStatus;
  priority: RequestPriority;
  assignedToName: string;
  assignedDepartmentName: string;
  dueAt: string | null;
  overdue: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RequestReply {
  id: string;
  channel: "email" | "fockis";
  body: string;
  to: string;
  sentByName: string;
  sentAt: string;
  delivery: "sent" | "failed";
  error: string;
}

export interface RequestNote {
  id: string;
  body: string;
  visibility: "staff" | "pastoral";
  authorName: string;
  createdAt: string;
  mine: boolean;
}

export interface RequestHistoryItem {
  at: string;
  action: string;
  actorName: string;
  from: string;
  to: string;
  note: string;
}

export interface RequestDetail extends RequestSummary {
  phone: string;
  message: string;
  requesterUserId: string | null;
  requesterMembershipId: string | null;
  assignedToMembershipId: string | null;
  assignedDepartmentId: string | null;
  source: string;
  resolvedAt: string | null;
  archivedAt: string | null;
  canFockisMessage: boolean;
  replies: RequestReply[];
  notes: RequestNote[];
  history: RequestHistoryItem[];
}

export interface RequestList {
  items: RequestSummary[];
  total: number;
  page: number;
  pageSize: number;
  stats: { total: number; new: number; inProgress: number; resolved: number; overdue: number };
  tabCounts: Record<RequestTab, number>;
  access: RequestAccess;
}

export interface StaffOption {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
}

export interface RequestStaff {
  people: StaffOption[];
  departments: { id: string; name: string }[];
  access: RequestAccess;
  me: string | null;
}

export interface RequestReports {
  total: number;
  open: number;
  overdue: number;
  byType: { type: RequestType; label: string; count: number }[];
  byStatus: { status: RequestStatus; label: string; count: number }[];
  byAssignee: { name: string; total: number; resolved: number }[];
  avgResponseHours: number | null;
  avgResolutionHours: number | null;
  monthly: { month: string; received: number; resolved: number }[];
}

export interface MyRequest {
  id: string;
  requestNumber: string;
  requestType: RequestType;
  subject: string;
  message: string;
  status: RequestStatus;
  createdAt: string;
  resolvedAt: string | null;
  replies: { id: string; body: string; sentByName: string; sentAt: string; channel: string }[];
}

export interface NewRequestInput {
  memberId?: string | null;
  requesterName: string;
  email?: string;
  phone?: string;
  requestType: RequestType;
  subject: string;
  message: string;
  priority: RequestPriority;
  assignedToMembershipId?: string | null;
  dueDate?: string | null;
  internalNote?: string;
}

export interface RequestUpdate {
  status?: Exclude<RequestStatus, "archived">;
  priority?: RequestPriority;
  assignedToMembershipId?: string | null;
  assignedDepartmentId?: string | null;
  dueDate?: string | null;
}

const base = (orgId: string) => `/organizations/${encodeURIComponent(orgId)}/requests`;
const one = (orgId: string, id: string) => `${base(orgId)}/${encodeURIComponent(id)}`;

export const requestsApi = {
  list: (
    orgId: string,
    q: { tab: RequestTab; q?: string; type?: string; status?: string; sort: RequestSort; page: number; pageSize: number },
    signal?: AbortSignal,
  ) => churchGet<RequestList>(base(orgId), { ...q, q: q.q || undefined, type: q.type || undefined, status: q.status || undefined }, signal),
  get: (orgId: string, id: string, signal?: AbortSignal) => churchGet<RequestDetail>(one(orgId, id), undefined, signal),
  staff: (orgId: string, signal?: AbortSignal) => churchGet<RequestStaff>(`${base(orgId)}/staff`, undefined, signal),
  searchMembers: (orgId: string, q: string, signal?: AbortSignal) =>
    churchGet<{ id: string; name: string; avatarUrl: string | null }[]>(`${base(orgId)}/members`, { q }, signal),
  reports: (orgId: string, signal?: AbortSignal) => churchGet<RequestReports>(`${base(orgId)}/reports`, undefined, signal),
  create: (orgId: string, body: NewRequestInput) => churchPost<RequestDetail>(base(orgId), body),
  update: (orgId: string, id: string, body: RequestUpdate) => churchPatch<RequestDetail>(one(orgId, id), body),
  reply: (orgId: string, id: string, body: { channel: "email" | "fockis"; body: string }) =>
    churchPost<{ delivered: boolean; error: string; request: RequestDetail }>(`${one(orgId, id)}/replies`, body),
  note: (orgId: string, id: string, body: { body: string; visibility: "staff" | "pastoral" }) => churchPost<RequestDetail>(`${one(orgId, id)}/notes`, body),
  archive: (orgId: string, id: string) => churchPost<RequestDetail>(`${one(orgId, id)}/archive`),
  restore: (orgId: string, id: string) => churchPost<RequestDetail>(`${one(orgId, id)}/restore`),
  remove: (orgId: string, id: string) => churchDelete<{ deleted: boolean; id: string }>(one(orgId, id)),

  /** Public form. Sends the sign-in token when there is one, so members are recognised. */
  submit: (
    orgId: string,
    body: { name: string; email: string; phone?: string; requestType: RequestType; subject: string; message: string; consent: boolean; website: string; startedAt: number },
  ) =>
    churchRequest<{ requestNumber: string; status: RequestStatus }>(`${base(orgId)}/submit`, {
      method: "POST",
      body,
      anonymous: !getAuthToken(),
    }),
  mine: (orgId: string, signal?: AbortSignal) => churchGet<MyRequest[]>(`${base(orgId)}/mine`, undefined, signal),
};

/* ---------------------------------------------------------------- formatting */

export function fmtDay(v?: string | null): string {
  if (!v) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(v));
}

export function fmtTime(v?: string | null): string {
  if (!v) return "";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(v));
}

export function fmtFull(v?: string | null): string {
  if (!v) return "—";
  return `${fmtDay(v)} at ${fmtTime(v)}`;
}

export const HISTORY_LABEL: Record<string, string> = {
  submitted: "Request submitted",
  created: "Request created",
  assigned: "Assigned",
  reassigned: "Assignment changed",
  unassigned: "Unassigned",
  ministry_assigned: "Shared with ministry",
  ministry_unassigned: "Removed from ministry",
  status_changed: "Status changed",
  priority_changed: "Priority changed",
  replied: "Reply sent",
  reply_failed: "Reply not delivered",
  note_added: "Internal note added",
  resolved: "Request resolved",
  archived: "Request archived",
  restored: "Request restored",
  due_changed: "Due date changed",
  overdue: "Became overdue",
};
