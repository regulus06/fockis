import { api } from "../../../api/api";
import { create } from "zustand";

import type { Paged } from "../../support/types";

/* ============================================================================
   TYPES (mirror apps/api/src/policy-center)
============================================================================ */

export interface Person {
  id: string;
  username: string;
  name: string;
  avatar: string;
}

export interface Section {
  heading: string;
  body: string;
}

export interface PolicySummary {
  id: string;
  slug: string;
  legacySlugs: string[];
  title: string;
  category: string;
  description: string;
  audience: string;
  requiredAcceptance: boolean;
  status: string;
  publishedVersion: string | null;
  publishedAt: string | null;
  effectiveDate: string | null;
  reviewDate: string | null;
  documents: { label: string; url: string }[];
  updatedAt: string;
  updatedBy: Person | null;
  working: { id: string; version: string; status: string; scheduledFor: string | null } | null;
}

export interface ReviewEntry {
  action: string;
  note: string;
  at: string;
  actor: Person | null;
}

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: string;
  title: string;
  description: string;
  sections: Section[];
  changeSummary: string;
  status: string;
  requiredAcceptance: boolean;
  effectiveDate: string | null;
  scheduledFor: string | null;
  approvalDeadline: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  supersededAt: string | null;
  restoredFrom: string;
  createdBy: Person | null;
  submittedBy: Person | null;
  submittedAt: string | null;
  approvedBy: Person | null;
  approvedAt: string | null;
  rejectedBy: Person | null;
  rejectedAt: string | null;
  publishedBy: Person | null;
  review?: ReviewEntry[];
  policyTitle?: string;
  policySlug?: string;
  category?: string;
}

export interface PolicyDetail extends PolicySummary {
  workingVersion: PolicyVersion | null;
  publishedVersionDetail: PolicyVersion | null;
  versions: { id: string; version: string; status: string; changeSummary: string; publishedAt: string | null; effectiveDate: string | null; createdAt: string; createdBy: Person | null; approvedBy: Person | null }[];
  acceptanceCount: number;
}

export interface PolicyStats {
  activePolicies: number;
  publishedThisMonth: number;
  pendingApproval: number;
  scheduledUpdates: number;
  nextScheduled: string | null;
  policyVersions: number;
  userAcceptances: number;
  acceptancesThisWeek: number;
}

export interface AuditEvent {
  id: string;
  seq: number;
  action: string;
  actorRole: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  summary: string;
  sensitive: boolean;
  at: string;
  actor: Person | null;
}

export interface AcceptanceRow {
  id: string;
  user: { id: string; username: string } | null;
  policyTitle: string;
  slug: string;
  version: string;
  current: boolean;
  acceptedAt: string;
  source: string;
  consentType: string;
  jurisdiction: string;
}

export interface PolicySettings {
  defaultReviewDays: number;
  requireIndependentApproval: boolean;
  approvalDeadlineDays: number;
  notifyUsersOnRequiredUpdate: boolean;
  notifyApprovers: boolean;
  acceptanceGraceDays: number;
  updatedAt?: string;
}

export interface OperationalRule {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  module: string;
  content: string;
  changeSummary: string;
  status: string;
  version: number;
  effectiveDate: string | null;
  enforcement: string;
  enforcementNotes: string;
  publishedContent: string;
  revisions: { version: number; changeSummary: string; publishedAt: string; publishedBy: Person | null }[];
  review: ReviewEntry[];
  submittedBy: Person | null;
  createdBy: Person | null;
  updatedAt: string;
}

export interface AdminDataRequest {
  id: string;
  number: string;
  type: "export" | "correction";
  status: string;
  field: string;
  details: string;
  response: string;
  createdAt: string;
  completedAt: string | null;
  user: Person | null;
  handledBy: Person | null;
}

export interface PolicyDraftInput {
  title?: string;
  slug?: string;
  category?: string;
  description?: string;
  audience?: string;
  requiredAcceptance?: boolean;
  version?: string;
  sections?: Section[];
  changeSummary?: string;
  effectiveDate?: string;
  reviewDate?: string;
  documents?: { label: string; url: string }[];
}

/* ============================================================================
   CONSTANTS
============================================================================ */

export const CATEGORIES: { value: string; label: string; tone: string }[] = [
  { value: "legal", label: "Legal", tone: "blue" },
  { value: "privacy", label: "Privacy", tone: "sky" },
  { value: "community", label: "Community", tone: "purple" },
  { value: "compliance", label: "Compliance", tone: "amber" },
  { value: "moderation", label: "Moderation", tone: "red" },
  { value: "payments", label: "Payments", tone: "green" },
  { value: "fockis_shop", label: "Fockis Shop", tone: "violet" },
  { value: "security", label: "Security", tone: "navy" },
  { value: "copyright", label: "Copyright", tone: "blue" },
  { value: "data_retention", label: "Data Retention", tone: "amber" },
];

export const STATUSES: { value: string; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
  { value: "rejected", label: "Rejected" },
];

export const AUDIENCES = [
  { value: "everyone", label: "Everyone" },
  { value: "users", label: "Fockis members" },
  { value: "sellers", label: "Fockis Shop sellers" },
  { value: "advertisers", label: "Advertisers" },
  { value: "organizations", label: "Organizations" },
];

export const RULE_MODULES = [
  { value: "community", label: "Community" },
  { value: "moderation", label: "Moderation" },
  { value: "accounts", label: "Accounts" },
  { value: "reporting", label: "Reporting" },
  { value: "fockis_shop", label: "Fockis Shop" },
  { value: "payments", label: "Payments" },
  { value: "security", label: "Security" },
  { value: "messaging", label: "Messaging" },
  { value: "other", label: "Other" },
];

export const ENFORCEMENT = [
  { value: "informational", label: "Informational (shown to staff)" },
  { value: "manual_review", label: "Manual review by staff" },
  { value: "automated_existing", label: "Already enforced by existing system" },
];

export const categoryLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;
export const categoryTone = (v: string) => CATEGORIES.find((c) => c.value === v)?.tone ?? "gray";
export const statusLabel = (v: string) => (v === "superseded" ? "Superseded" : STATUSES.find((s) => s.value === v)?.label ?? v);

/** Pending-approval count shared with the admin sidebar quick links. */
export const usePolicyBadge = create<{ pending: number; set: (n: number) => void }>((set) => ({ pending: 0, set: (pending) => set({ pending }) }));

/* ============================================================================
   CALLS
============================================================================ */

const BASE = "/admin/policy-compliance";
const get = async <T>(url: string, params?: Record<string, unknown>) => (await api.get<T>(url, { params })).data;
const post = async <T>(url: string, body?: unknown) => (await api.post<T>(url, body ?? {})).data;
const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && v !== null && v !== "all"));

export const policyAdminApi = {
  stats: () => get<PolicyStats>(`${BASE}/stats`),
  activity: () => get<Paged<AuditEvent>>(`${BASE}/activity`),

  list: (q: { search?: string; category?: string; status?: string; page?: number }) => get<Paged<PolicySummary> & { all: number }>("/admin/policies", clean(q)),
  get: (id: string) => get<PolicyDetail>(`/admin/policies/${id}`),
  create: (body: PolicyDraftInput) => post<PolicyDetail>("/admin/policies", body),
  saveDraft: async (id: string, body: PolicyDraftInput) => (await api.patch<PolicyDetail>(`/admin/policies/${id}/draft`, body)).data,
  submit: (id: string, note = "") => post<PolicyDetail>(`/admin/policies/${id}/submit`, { note }),
  withdraw: (id: string) => post<PolicyDetail>(`/admin/policies/${id}/withdraw`),
  approve: (id: string, note = "") => post<PolicyDetail>(`/admin/policies/${id}/approve`, { note }),
  reject: (id: string, note: string) => post<PolicyDetail>(`/admin/policies/${id}/reject`, { note }),
  requestChanges: (id: string, note: string) => post<PolicyDetail>(`/admin/policies/${id}/request-changes`, { note }),
  schedule: (id: string, publishAt: string) => post<PolicyDetail>(`/admin/policies/${id}/schedule`, { publishAt }),
  publish: (id: string) => post<PolicyDetail>(`/admin/policies/${id}/publish`),
  archive: (id: string, note: string) => post<PolicyDetail>(`/admin/policies/${id}/archive`, { note }),
  unarchive: (id: string) => post<PolicyDetail>(`/admin/policies/${id}/unarchive`),

  versions: (q: { policyId?: string; status?: string; page?: number }) => get<Paged<PolicyVersion>>(`${BASE}/versions`, clean(q)),
  version: (id: string) => get<PolicyVersion>(`${BASE}/versions/${id}`),
  restore: (id: string, newVersion: string, changeSummary: string) => post<PolicyDetail>(`${BASE}/versions/${id}/restore`, { newVersion, changeSummary }),
  approvals: (view: "pending" | "decided" | "all", page = 1) => get<Paged<PolicyVersion>>(`${BASE}/approvals`, { view, page }),

  acceptances: (q: { policyId?: string; version?: string; user?: string; from?: string; to?: string; page?: number }) => get<Paged<AcceptanceRow>>(`${BASE}/acceptances`, clean(q)),
  exportAcceptances: (q: { policyId?: string; version?: string; user?: string; from?: string; to?: string }) => get<{ filename: string; csv: string }>(`${BASE}/acceptances/export`, clean(q)),

  audit: (q: { action?: string; search?: string; page?: number }) => get<Paged<AuditEvent>>(`${BASE}/audit`, clean(q)),
  verifyAudit: () => get<{ intact: boolean; checked: number; brokenAt: number | null }>(`${BASE}/audit/verify`),

  settings: () => get<PolicySettings>(`${BASE}/settings`),
  updateSettings: async (body: Partial<PolicySettings>) => (await api.patch<PolicySettings>(`${BASE}/settings`, body)).data,

  rules: (q: { module?: string; status?: string; search?: string }) => get<{ items: OperationalRule[] }>(`${BASE}/rules`, clean(q)),
  createRule: (body: Partial<OperationalRule>) => post<OperationalRule>(`${BASE}/rules`, body),
  updateRule: async (id: string, body: Partial<OperationalRule>) => (await api.patch<OperationalRule>(`${BASE}/rules/${id}`, body)).data,
  transitionRule: (id: string, action: string, note = "") => post<OperationalRule>(`${BASE}/rules/${id}/transition`, { action, note }),

  dataRequests: (q: { type?: string; view?: string; page?: number }) => get<Paged<AdminDataRequest>>(`${BASE}/data-requests`, clean(q)),
  resolveRequest: (id: string, status: "completed" | "rejected", response: string) => post<AdminDataRequest>(`${BASE}/data-requests/${id}/resolve`, { status, response }),
};
