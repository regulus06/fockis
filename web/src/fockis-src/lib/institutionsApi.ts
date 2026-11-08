/**
 * Fockis Academy — schools (apps/api/src/academy/institutions).
 *   /academy/institutions/*        public directory, school pages, student applications,
 *                                  school registration and management by its staff
 *   /academy/admin/institutions/*  Fockis Academy administrators review schools
 * Uses the Academy token only.
 */
import { getAcademyApiBaseUrl } from "./academyApi";
import { academyToken } from "./academySession";

export type InstitutionStatus = "pending" | "approved" | "rejected" | "blocked";
export type InstitutionType = "school" | "university" | "college" | "training_center" | "business" | "church" | "nonprofit" | "other";

export const INSTITUTION_TYPE_LABEL: Record<InstitutionType, string> = {
  school: "School",
  university: "University",
  college: "College",
  training_center: "Training center",
  business: "Business",
  church: "Church / ministry",
  nonprofit: "Nonprofit",
  other: "Other",
};

export const STATUS_LABEL: Record<InstitutionStatus, string> = {
  pending: "Waiting for review",
  approved: "Approved",
  rejected: "Rejected",
  blocked: "Blocked",
};
export const STATUS_TONE: Record<InstitutionStatus, "amber" | "green" | "red" | "gray"> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
  blocked: "gray",
};

export interface InstitutionDetails {
  name: string;
  slug: string;
  type: InstitutionType;
  description?: string;
  country?: string;
  city?: string;
  address?: string;
  website?: string;
  phone?: string;
  contactEmail?: string;
  registrationNumber?: string;
  logoUrl?: string;
  proofStorageKey?: string;
  proofFileName?: string;
  allowApplications?: boolean;
}

export interface SchoolTeacher {
  key: string;
  name: string;
  title?: string;
  department?: string;
  bio?: string;
  photoUrl?: string;
  email?: string;
  /** Staff switch: enrolled students may see the contact details below. */
  contactEnabled?: boolean;
  contactEmail?: string;
  contactPhone?: string;
  officeHours?: string;
  /** Fockis Meetings link for virtual sessions or student presentations. */
  meetingUrl?: string;
  /** Classes (subjects) this teacher teaches. */
  classes: { code: string; name: string; visibility?: string }[];
}
export type TeacherInput = Omit<SchoolTeacher, "key" | "classes">;

export interface HistoryEntry {
  action: string;
  reason?: string;
  byName?: string;
  at: string;
}

/* ---------------------------------------------------------------- Fockis domain fee */

export type DomainBillingState = "free" | "exempt" | "paid" | "active" | "grace" | "unpaid" | "expired" | "not_approved";

export interface DomainBilling {
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
  note: string;
}

export interface DomainPricingPublic {
  enabled: boolean;
  currency: string;
  periodMonths: number;
  periodLabel: string;
  graceDays: number;
  note: string;
  prices: Partial<Record<InstitutionType, number>>;
}

export interface DomainCheckoutInfo {
  purpose: string;
  referenceId: string;
  amount: number;
  currency: string;
  periodMonths: number;
  periodLabel: string;
  title: string;
  organization: string;
  type: InstitutionType;
  renewal: boolean;
  note: string;
  metadata: Record<string, string>;
}

/** "per year", "per month", "one-time"… */
export function domainPeriodText(months: number) {
  if (months === 0) return "one-time";
  if (months === 1) return "per month";
  if (months === 12) return "per year";
  if (months % 12 === 0) return `every ${months / 12} years`;
  return `every ${months} months`;
}

export interface StaffInstitution extends InstitutionDetails {
  _id: string;
  domain: string;
  status: InstitutionStatus;
  statusReason?: string;
  reviewedAt?: string;
  createdAt?: string;
  hasProof: boolean;
  history: HistoryEntry[];
  owner: { _id: string; name: string; email: string } | null;
  staff: { userId: string; role: "admin" | "staff"; name?: string; email?: string; addedAt: string }[];
  myRole: "owner" | "admin" | "staff" | "fockis-admin";
  teachers: SchoolTeacher[];
  counts: { students: number; pendingApplications: number; classes: number };
  domainBilling?: DomainBilling;
  domainPayments?: { method: "stripe" | "manual"; amount?: number; currency?: string; from?: string; to?: string; at: string }[];
}

export interface Credentials {
  userId: string;
  name: string;
  loginId: string;
  temporaryPassword: string;
  personalEmail?: string;
  emailed: boolean;
}

export interface SchoolStudent {
  userId: string;
  name: string;
  loginId: string;
  personalEmail?: string;
  active: boolean;
  mustChangePassword: boolean;
  suspendedReason?: string;
  createdAt?: string;
  lastLogin?: string;
}

export interface StudentApplication {
  _id: string;
  name: string;
  personalEmail: string;
  phone?: string;
  program?: string;
  message?: string;
  status: "pending" | "approved" | "rejected";
  reason?: string;
  createdAt: string;
}

export interface PublicSchool {
  _id: string;
  name: string;
  slug: string;
  domain: string;
  type: InstitutionType;
  description?: string;
  country?: string;
  city?: string;
  address?: string;
  website?: string;
  phone?: string;
  contactEmail?: string;
  logoUrl?: string;
  allowApplications: boolean;
  verifiedAt?: string;
  students: number;
  teachers: SchoolTeacher[];
  classes: { code: string; name: string; kind: string; isFree: boolean; price: number; currency: string; coverUrl?: string; summary?: string; visibility: string; lessons?: unknown[] }[];
}

export interface AdminInstitution extends InstitutionDetails {
  _id: string;
  domain: string;
  status: InstitutionStatus;
  statusReason?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  history: HistoryEntry[];
  owner: { _id: string; name: string; email: string; createdAt?: string } | null;
  students: number;
  classes?: number;
  hasProof?: boolean;
  proofUrl?: string;
}

export class InstitutionsError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers);
  const token = academyToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else if (auth) throw new InstitutionsError("Please sign in to your Academy account.", 401);
  if (init.body) headers.set("Content-Type", "application/json");
  const res = await fetch(`${getAcademyApiBaseUrl()}${path}`, { ...init, headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const m = data?.message;
    throw new InstitutionsError(Array.isArray(m) ? m.join(", ") : m || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

const enc = encodeURIComponent;
const json = (b: unknown) => JSON.stringify(b);
const base = "/institutions";
const m = (id: string) => `${base}/manage/${enc(id)}`;

export const schoolsApi = {
  // public
  directory: () => call<(PublicSchool & { domain: string })[]>(base, {}, false),
  checkDomain: (slug: string) => call<{ slug: string; domain?: string; available: boolean; reason?: string }>(`${base}/check-domain?slug=${enc(slug)}`, {}, false),
  profile: (slug: string) => call<PublicSchool>(`${base}/${enc(slug)}`, {}, false),
  /** Signed-in student with a school login: their school and all its classes (null otherwise). */
  mySchool: () => call<PublicSchool | null>(`${base}/my-school`),
  apply: (slug: string, body: { name: string; personalEmail: string; phone?: string; program?: string; message?: string }) =>
    call<{ message: string }>(`${base}/${enc(slug)}/apply`, { method: "POST", body: json(body) }, false),

  // school owners / staff
  mine: () => call<StaffInstitution[]>(`${base}/mine`),
  domainPricing: () => call<DomainPricingPublic>(`${base}/domain-pricing`, {}, false),
  domainCheckout: (id: string) => call<DomainCheckoutInfo>(`${m(id)}/domain/checkout`, { method: "POST" }),
  domainClaim: (id: string, paymentIntentId: string) => call<DomainBilling>(`${m(id)}/domain/claim`, { method: "POST", body: json({ paymentIntentId }) }),
  register: (body: Partial<InstitutionDetails>) => call<StaffInstitution>(base, { method: "POST", body: json(body) }),
  get: (id: string) => call<StaffInstitution>(m(id)),
  update: (id: string, body: Partial<InstitutionDetails>) => call<StaffInstitution>(m(id), { method: "PATCH", body: json(body) }),
  resubmit: (id: string) => call<StaffInstitution>(`${m(id)}/resubmit`, { method: "POST" }),
  addStaff: (id: string, email: string, role: "admin" | "staff") => call<StaffInstitution>(`${m(id)}/staff`, { method: "POST", body: json({ email, role }) }),
  removeStaff: (id: string, userId: string) => call<StaffInstitution>(`${m(id)}/staff/${enc(userId)}`, { method: "DELETE" }),
  addTeacher: (id: string, body: TeacherInput) => call<StaffInstitution>(`${m(id)}/teachers`, { method: "POST", body: json(body) }),
  updateTeacher: (id: string, key: string, body: TeacherInput) => call<StaffInstitution>(`${m(id)}/teachers/${enc(key)}`, { method: "PATCH", body: json(body) }),
  removeTeacher: (id: string, key: string) => call<StaffInstitution>(`${m(id)}/teachers/${enc(key)}`, { method: "DELETE" }),
  applications: (id: string, status?: string) => call<StudentApplication[]>(`${m(id)}/applications${status ? `?status=${status}` : ""}`),
  approveApplication: (id: string, appId: string) => call<Credentials>(`${m(id)}/applications/${enc(appId)}/approve`, { method: "POST" }),
  rejectApplication: (id: string, appId: string, reason?: string) => call<StudentApplication>(`${m(id)}/applications/${enc(appId)}/reject`, { method: "POST", body: json({ reason }) }),
  students: (id: string) => call<SchoolStudent[]>(`${m(id)}/students`),
  addStudent: (id: string, body: { name: string; personalEmail?: string; username?: string }) => call<Credentials>(`${m(id)}/students`, { method: "POST", body: json(body) }),
  addStudents: (id: string, students: { name: string; personalEmail?: string }[]) =>
    call<{ created: Credentials[]; failed: { name: string; error: string }[] }>(`${m(id)}/students/bulk`, { method: "POST", body: json({ students }) }),
  resetPassword: (id: string, userId: string) => call<Credentials>(`${m(id)}/students/${enc(userId)}/reset-password`, { method: "POST" }),
  suspend: (id: string, userId: string, reason?: string) => call<{ active: boolean }>(`${m(id)}/students/${enc(userId)}/suspend`, { method: "POST", body: json({ reason }) }),
  restore: (id: string, userId: string) => call<{ active: boolean }>(`${m(id)}/students/${enc(userId)}/restore`, { method: "POST" }),
};

export const adminSchoolsApi = {
  list: (status?: string) => call<{ totals: Partial<Record<InstitutionStatus, number>>; items: AdminInstitution[] }>(`/admin/institutions${status ? `?status=${status}` : ""}`),
  get: (id: string) => call<AdminInstitution>(`/admin/institutions/${enc(id)}`),
  approve: (id: string) => call<AdminInstitution>(`/admin/institutions/${enc(id)}/approve`, { method: "POST" }),
  reject: (id: string, reason: string) => call<AdminInstitution>(`/admin/institutions/${enc(id)}/reject`, { method: "POST", body: json({ reason }) }),
  block: (id: string, reason: string) => call<AdminInstitution>(`/admin/institutions/${enc(id)}/block`, { method: "POST", body: json({ reason }) }),
  unblock: (id: string) => call<AdminInstitution>(`/admin/institutions/${enc(id)}/unblock`, { method: "POST" }),
};

/** Change the signed-in user's password (also completes a first sign-in with a temporary password). */
export function changeAcademyPassword(currentPassword: string, newPassword: string) {
  return call<{ message: string }>("/auth/change-password", { method: "POST", body: json({ currentPassword, newPassword }) });
}

/** "Amara Johnson, amara@mail.com" lines → student rows (name required, email optional). */
export function parseStudentList(text: string): { name: string; personalEmail?: string }[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const email = line.match(/[^\s,;<>]+@[^\s,;<>]+\.[a-z]{2,}/i)?.[0];
      const name = line
        .replace(email ?? "", "")
        .replace(/[<>,;\t]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return { name, personalEmail: email?.toLowerCase() };
    })
    .filter((r) => r.name.length >= 2);
}
