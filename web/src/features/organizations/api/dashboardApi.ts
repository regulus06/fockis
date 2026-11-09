/**
 * dashboardApi.ts
 * -----------------------------------------------------------------------------
 * Calls for the rebuilt Fockis Organizations screens. Mirrors
 * apps/api/src/org/dashboard/organization-dashboard.controller.ts.
 *
 *   GET  /organizations/domain-availability?domain=   (public)
 *   GET  /organizations/:id/dashboard?days=           (admins)
 *   GET  /organizations/:id/members-export            (CSV; ViewMembers)
 *   POST /organizations/:id/logo                      (multipart "file")
 * -----------------------------------------------------------------------------
 */

import {
  CHURCH_API_BASE,
  ChurchApiError,
  ChurchAuthError,
  buildQuery,
  churchGet,
  churchRequest,
  churchUpload,
  getAuthToken,
} from "./organizationApi";

const org = (id: string) => `/organizations/${encodeURIComponent(id)}`;

/* ------------------------------------------------------------ domain check */

export interface DomainAvailability {
  domain: string;
  available: boolean;
  valid: boolean;
  message?: string;
}

export function checkDomainAvailability(domain: string, signal?: AbortSignal): Promise<DomainAvailability> {
  return churchRequest<DomainAvailability>("/organizations/domain-availability", {
    query: { domain },
    signal,
    anonymous: true,
  });
}

/* --------------------------------------------------------------- dashboard */

export type DashboardRange = 7 | 30 | 90 | 365;

export interface OrganizationDashboard {
  organizationId: string;
  rangeDays: number;
  generatedAt: string;
  viewer: { isOwner: boolean; role: string; permissions: string[] };
  counts: {
    totalMembers: number | null;
    newMembers: number | null;
    pendingApplications: number | null;
    inactiveMembers: number | null;
    departments: number | null;
    groups: number | null;
    branches: number;
    upcomingEvents: number | null;
  };
  growth: { points: { date: string; total: number }[]; changePercent: number | null } | null;
  attendance: {
    checkIns: number;
    previousCheckIns: number;
    absences: number;
    membersPresent: number;
    participationRate: number | null;
    byWeek: { weekStart: string; checkIns: number }[];
  } | null;
  recentActivity:
    | {
        memberId: string;
        name: string;
        avatarUrl: string | null;
        at: string;
        status: string | null;
        role: string | null;
        note: string | null;
      }[]
    | null;
  upcomingEvents:
    | { id: string; title: string; startsAt: string | null; endsAt: string | null; location: string | null; eventType: string | null }[]
    | null;
}

export function getOrganizationDashboard(
  organizationId: string,
  days: DashboardRange,
  signal?: AbortSignal,
): Promise<OrganizationDashboard> {
  return churchGet<OrganizationDashboard>(`${org(organizationId)}/dashboard`, { days }, signal);
}

/* ------------------------------------------------------------------ export */

export interface MemberExportFilters {
  status?: string;
  role?: string;
  departmentId?: string;
  search?: string;
}

/** Downloads the CSV the server builds (the server decides which columns you may see). */
export async function downloadMembersCsv(organizationId: string, filters: MemberExportFilters = {}): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new ChurchAuthError("Your Fockis session is missing. Please sign in again.");

  const url = `${CHURCH_API_BASE}${org(organizationId)}/members-export${buildQuery({
    status: filters.status || undefined,
    role: filters.role || undefined,
    departmentId: filters.departmentId || undefined,
    search: filters.search || undefined,
  })}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "text/csv" },
    credentials: "include",
  });

  if (!response.ok) {
    let message = "The member list could not be exported.";
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (body?.message) message = Array.isArray(body.message) ? body.message.join(" ") : body.message;
    } catch {
      /* not JSON */
    }
    if (response.status === 401) throw new ChurchAuthError(message);
    throw new ChurchApiError(message, response.status);
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "members.csv";
  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

/* -------------------------------------------------------------------- logo */

export function uploadOrganizationLogo(organizationId: string, file: File): Promise<{ organizationId: string; logoUrl: string }> {
  const form = new FormData();
  form.append("file", file);
  return churchUpload(`${org(organizationId)}/logo`, form);
}

/* ------------------------------------------------------------------- media */

/**
 * Server-relative upload paths ("/uploads/…") are served by the API host.
 * In development the Vite proxy maps "/api" to it; in production the API base
 * is absolute. Anything else (https:, data:, blob:) is returned unchanged.
 */
export function mediaUrl(value?: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/uploads/")) return value;
  const apiRoot = CHURCH_API_BASE.replace(/\/church\/?$/, "");
  return `${apiRoot}${value}`;
}

/* ----------------------------------------------------------------- follow */

export interface FollowStatus {
  organizationId: string;
  followers: number;
  following: boolean;
}

/** Works signed out too (then "following" is always false). */
export function getFollowStatus(organizationId: string, signal?: AbortSignal): Promise<FollowStatus> {
  return churchRequest<FollowStatus>(`${org(organizationId)}/follow`, { signal, anonymous: !getAuthToken() });
}

export function followOrganization(organizationId: string): Promise<FollowStatus> {
  return churchRequest<FollowStatus>(`${org(organizationId)}/follow`, { method: "POST" });
}

export function unfollowOrganization(organizationId: string): Promise<FollowStatus> {
  return churchRequest<FollowStatus>(`${org(organizationId)}/follow`, { method: "DELETE" });
}

/* ---------------------------------------------------------- announcements */

export interface PublicAnnouncement {
  id: string;
  title: string;
  body: string;
  audience?: string;
  pinned?: boolean;
  publishedAt?: string;
  createdAt?: string;
}

/** The server returns only the announcements this viewer may read. */
export async function listVisibleAnnouncements(organizationId: string, pageSize = 3, signal?: AbortSignal): Promise<PublicAnnouncement[]> {
  const res = await churchRequest<{ items?: PublicAnnouncement[] } | PublicAnnouncement[]>(`${org(organizationId)}/announcements`, {
    query: { page: 1, pageSize },
    signal,
    anonymous: !getAuthToken(),
  });
  return Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
}
