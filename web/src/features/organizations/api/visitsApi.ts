/**
 * visitsApi.ts
 * "Plan a visit" requests and the member's "My history".
 *
 *   POST  /organizations/:organizationId/visits
 *   GET   /organizations/:organizationId/visits          (admins)
 *   PATCH /organizations/:organizationId/visits/:visitId (admins)
 *   GET   /church/me/visits
 *   POST  /church/me/visits/:visitId/cancel
 *   GET   /organizations/:organizationId/members/me/history
 */

import { ChurchAuthError, churchGet, churchPatch, churchPost, churchRequest } from "./organizationApi";
import type { Branch, Organization } from "../types/organization.types";

/**
 * Pages anyone can open (join link, plan a visit): use the person's session
 * when there is one, otherwise call the server as a guest.
 */
async function guestOk<T>(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> {
  try {
    return await churchRequest<T>(path, { method, body });
  } catch (err) {
    if (err instanceof ChurchAuthError) {
      return churchRequest<T>(path, { method, body, anonymous: true });
    }
    throw err;
  }
}

export const publicOrganizationApi = {
  get: (organizationId: string) => guestOk<Organization>(`/organizations/${encodeURIComponent(organizationId)}`),
  branches: (organizationId: string) =>
    guestOk<Branch[]>(`/organizations/${encodeURIComponent(organizationId)}/branches`).catch(() => [] as Branch[]),
};

export type VisitStatus = "new" | "contacted" | "scheduled" | "visited" | "cancelled" | "no_show";

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  new: "New",
  contacted: "Contacted",
  scheduled: "Scheduled",
  visited: "Visited",
  cancelled: "Cancelled",
  no_show: "Didn't come",
};

export interface VisitRequestInput {
  branchId?: string;
  visitDate: string;
  visitTime?: string;
  adults: number;
  children: number;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  accessibility?: string;
  notes?: string;
}

export interface VisitRequest {
  id: string;
  organizationId: string;
  branchId: string | null;
  branchName: string;
  visitDate: string;
  visitTime: string;
  adults: number;
  children: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  accessibility: string;
  notes: string;
  status: VisitStatus;
  createdAt: string | null;
  updatedAt: string | null;
  /** Only in "my visits". */
  organizationName?: string;
  organizationLogoUrl?: string | null;
}

export interface AdminVisitRequest extends VisitRequest {
  userId: string | null;
  staffNote: string;
  history: { at: string; status: VisitStatus | null; note: string; byName: string }[];
}

const org = (id: string) => `/organizations/${encodeURIComponent(id)}`;

export const visitsApi = {
  submit: (organizationId: string, input: VisitRequestInput) =>
    guestOk<{ ok: true; visit: VisitRequest }>(`${org(organizationId)}/visits`, "POST", input),

  listForAdmin: (organizationId: string, query: { status?: VisitStatus | ""; q?: string } = {}) =>
    churchGet<{ items: AdminVisitRequest[]; counts: Record<VisitStatus, number> }>(`${org(organizationId)}/visits`, {
      status: query.status || undefined,
      q: query.q || undefined,
    }),

  update: (organizationId: string, visitId: string, body: { status?: VisitStatus; staffNote?: string; note?: string }) =>
    churchPatch<AdminVisitRequest>(`${org(organizationId)}/visits/${encodeURIComponent(visitId)}`, body),

  mine: (organizationId?: string) =>
    churchGet<VisitRequest[]>(`/me/visits`, { organizationId: organizationId || undefined }),

  cancelMine: (visitId: string) => churchPost<VisitRequest>(`/me/visits/${encodeURIComponent(visitId)}/cancel`),
};

/* ------------------------------------------------------------- my history */

export interface MemberHistory {
  organization: { id: string; name: string; organizationType: string | null };
  membership: null | {
    id: string;
    status: string;
    role: string;
    requestedAt: string | null;
    joinedAt: string | null;
    domain: string | null;
    history: { at: string; status: string | null; role: string | null; note: string | null }[];
  };
  groups: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  attendance: {
    id: string;
    kind: "check_in" | "absence_report";
    attendanceType: string | null;
    reasonCategory: string | null;
    note: string;
    occurredAt: string;
    eventId: string | null;
    eventTitle: string;
    eventStartsAt: string | null;
  }[];
  attendanceSummary: { checkIns: number; absences: number; lastCheckIn: string | null };
  visits: VisitRequest[];
}

export const memberHistoryApi = {
  mine: (organizationId: string) => churchGet<MemberHistory>(`${org(organizationId)}/members/me/history`),
};
