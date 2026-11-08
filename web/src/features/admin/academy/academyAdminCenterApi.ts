import { api } from "../../../api/api";

/* ============================================================================
   ACADEMY — Fockis admin center API (apps/api/src/academy/admin-center).
   academy.view to read, academy.manage to act. Uses the main Fockis admin
   session, not an Academy login.
============================================================================ */

export type ClassKind = "course" | "seminar" | "live_class" | "workshop";
export type ClassStatus = "live" | "draft" | "unlisted" | "taken_down" | "school_blocked";
export type SchoolStatus = "pending" | "approved" | "rejected" | "blocked";

export interface Paged<T> {
  items: T[];
  page: number;
  total: number;
  hasMore: boolean;
}

export interface AcademyOverview {
  classes: { total: number; byKind: Record<ClassKind, number>; byStatus: Record<ClassStatus, number> };
  schools: Record<SchoolStatus, number>;
  accounts: { total: number; schoolLogins: number; suspended: number };
  enrollments: { total: number; last30Days: number };
  certificates: { valid: number; revoked: number };
  revenue: Record<string, number>;
  newestClasses: Array<{ _id: string; code: string; name: string; kind?: ClassKind; brandName?: string; instructor?: string; status: ClassStatus; createdAt?: string; isFree?: boolean; price?: number; currency?: string }>;
  pendingSchools: Array<{ _id: string; name: string; slug: string; type?: string; city?: string; country?: string; createdAt?: string }>;
  creators?: Partial<Record<CreatorStatus, number>>;
}

export type CreatorStatus = "pending" | "approved" | "rejected" | "suspended";
export type CreatorAction = "approve" | "reject" | "suspend" | "unsuspend";

export interface CreatorRow {
  id: string;
  name: string;
  email: string;
  status: CreatorStatus;
  kind: "person" | "business";
  displayName: string;
  businessName: string;
  topics: string;
  city: string;
  country: string;
  reason: string;
  appliedAt: string | null;
  reviewedAt: string | null;
  classes: number;
}

export interface CreatorDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  memberSince: string | null;
  status: CreatorStatus | "none";
  profile: {
    kind: "person" | "business";
    displayName: string;
    businessName?: string;
    phone?: string;
    country?: string;
    city?: string;
    website?: string;
    topics?: string;
    about: string;
    experience?: string;
    sampleUrl?: string;
  } | null;
  reason: string;
  appliedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string;
  history: Array<{ action: string; reason?: string; byName?: string; at: string }>;
  classes: Array<{ code: string; name: string; kind: ClassKind; school: boolean; status: ClassStatus | "creator_blocked"; isFree: boolean; price: number; currency: string }>;
}

export interface ClassRow {
  id: string;
  code: string;
  name: string;
  kind: ClassKind;
  brandName: string;
  instructor: string;
  category: string;
  isFree: boolean;
  price: number;
  currency: string;
  visibility: string;
  enrollmentOpen: boolean;
  status: ClassStatus;
  studio: boolean;
  school: { _id: string; name: string; slug: string; status: SchoolStatus } | null;
  learners: number;
  revenue: Record<string, number>;
  startsAt: string | null;
  updatedAt: string | null;
}

export interface ClassDetail extends Omit<ClassRow, "learners" | "revenue"> {
  summary: string;
  description: string;
  level?: string;
  language: string;
  capacity: number;
  certificateEnabled: boolean;
  takenDownReason: string;
  takenDownAt: string | null;
  takenDownBy: string;
  lessons: { key: string; order: number; title: string; type: string; preview: boolean; section: string }[];
  lessonTypes: Record<string, number>;
  owner: { _id: string; name: string; email: string; role: string; isActive?: boolean; createdAt?: string } | null;
  stats: { learners: number; completed: number; certificates: number; revenue: Record<string, number> };
  enrollments: { id: string; student: { _id: string; name: string; email: string } | null; progress: number; accessType: string; paidAmount: number; paidCurrency: string; completedAt: string | null; createdAt: string | null }[];
  createdAt: string | null;
}

export interface SchoolRow {
  _id: string;
  name: string;
  slug: string;
  domain: string;
  type: string;
  city?: string;
  country?: string;
  status: SchoolStatus;
  statusReason?: string;
  owner: { _id: string; name: string; email: string } | null;
  students: number;
  hasProof: boolean;
  createdAt?: string;
  updatedAt?: string;
  billing?: { state: DomainBillingState; active: boolean; paidUntil: string | null; graceEndsAt: string | null; price: number; currency: string };
}

export interface SchoolDetail extends SchoolRow {
  description?: string;
  address?: string;
  website?: string;
  phone?: string;
  contactEmail?: string;
  registrationNumber?: string;
  proofUrl?: string;
  proofFileName?: string;
  classes: number;
  history?: { action: string; reason?: string; byName?: string; at: string }[];
  teachers?: { key: string; name: string; title?: string; department?: string }[];
  domainBilling?: SchoolBilling;
}

/* ---------------------------------------------------------------- domain fees */

export type DomainBillingState = "free" | "exempt" | "paid" | "active" | "grace" | "unpaid" | "expired" | "not_approved";

export interface SchoolBilling {
  state: DomainBillingState;
  active: boolean;
  canPay: boolean;
  price: number;
  currency: string;
  periodMonths: number;
  graceDays: number;
  paidUntil: string | null;
  graceEndsAt: string | null;
  renewSoon: boolean;
  exempt: boolean;
  exemptReason: string;
  paidForever: boolean;
  entries: Array<{ method: "stripe" | "manual" | "exempt" | "unexempt"; amount?: number; currency?: string; from?: string; to?: string; paymentIntentId?: string; note?: string; byName?: string; at: string }>;
}

export type SchoolBillingAction = { action: "exempt" | "unexempt" | "set_paid_until" | "clear_paid"; until?: string; amount?: number; note?: string };

export interface CertificateRow {
  id: string;
  certificateNumber: string;
  verificationId: string;
  enrollmentNumber: string;
  recipientName: string;
  recipientEmail: string;
  activityType: string;
  activityRef: string;
  activityName: string;
  instructorName: string;
  institutionName: string;
  issuedAt: string;
  status: "valid" | "revoked";
  lastChange: { action: string; reason?: string; byName?: string; at: string } | null;
}

export interface AccountRow {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  suspendedReason: string;
  schoolLogin: boolean;
  school: { _id: string; name: string; slug: string } | null;
  classesCreated: number;
  enrollments: number;
  createdAt: string | null;
  lastLoginAt: string | null;
}

const clean = (params: Record<string, unknown>) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null));
const enc = encodeURIComponent;

export const academyAdminApi = {
  overview: async () => (await api.get<AcademyOverview>("/admin/academy/overview")).data,

  classes: async (p: { q?: string; kind?: string; status?: string; price?: string; school?: string; page?: number }) =>
    (await api.get<Paged<ClassRow>>("/admin/academy/classes", { params: clean({ ...p, page: p.page && p.page > 1 ? p.page : undefined }) })).data,
  classDetail: async (code: string) => (await api.get<ClassDetail>(`/admin/academy/classes/${enc(code)}`)).data,
  takeDown: async (code: string, reason: string) => (await api.post<ClassDetail>(`/admin/academy/classes/${enc(code)}/take-down`, { reason })).data,
  restore: async (code: string) => (await api.post<ClassDetail>(`/admin/academy/classes/${enc(code)}/restore`, {})).data,
  setEnrollment: async (code: string, open: boolean) => (await api.post<ClassDetail>(`/admin/academy/classes/${enc(code)}/enrollment`, { open })).data,

  schools: async (status?: string) => (await api.get<{ totals: Partial<Record<SchoolStatus, number>>; items: SchoolRow[] }>("/admin/academy/schools", { params: clean({ status }) })).data,
  school: async (id: string) => (await api.get<SchoolDetail>(`/admin/academy/schools/${enc(id)}`)).data,
  schoolStatus: async (id: string, action: "approve" | "reject" | "block" | "unblock", reason?: string) =>
    (await api.post<SchoolDetail>(`/admin/academy/schools/${enc(id)}/status`, { action, reason: reason || undefined })).data,

  creators: async (p: { q?: string; status?: string; page?: number }) =>
    (await api.get<Paged<CreatorRow> & { counts: Partial<Record<CreatorStatus, number>> }>("/admin/academy/creators", { params: clean({ ...p, page: p.page && p.page > 1 ? p.page : undefined }) })).data,
  creator: async (id: string) => (await api.get<CreatorDetail>(`/admin/academy/creators/${enc(id)}`)).data,
  creatorStatus: async (id: string, action: CreatorAction, reason?: string) =>
    (await api.post<CreatorDetail>(`/admin/academy/creators/${enc(id)}/status`, { action, reason: reason || undefined })).data,

  schoolBilling: async (id: string, body: SchoolBillingAction) => (await api.post<SchoolBilling>(`/admin/academy/schools/${enc(id)}/billing`, body)).data,

  certificates: async (p: { q?: string; status?: string; page?: number }) =>
    (await api.get<Paged<CertificateRow>>("/admin/academy/certificates", { params: clean({ ...p, page: p.page && p.page > 1 ? p.page : undefined }) })).data,
  revokeCertificate: async (id: string, reason: string) => (await api.post<{ id: string; status: string }>(`/admin/academy/certificates/${enc(id)}/revoke`, { reason })).data,
  restoreCertificate: async (id: string) => (await api.post<{ id: string; status: string }>(`/admin/academy/certificates/${enc(id)}/restore`, {})).data,

  accounts: async (p: { q?: string; role?: string; status?: string; page?: number }) =>
    (await api.get<Paged<AccountRow>>("/admin/academy/accounts", { params: clean({ ...p, page: p.page && p.page > 1 ? p.page : undefined }) })).data,
  suspendAccount: async (id: string, reason: string) => (await api.post<{ id: string; active: boolean }>(`/admin/academy/accounts/${enc(id)}/suspend`, { reason })).data,
  reactivateAccount: async (id: string) => (await api.post<{ id: string; active: boolean }>(`/admin/academy/accounts/${enc(id)}/reactivate`, {})).data,
};
