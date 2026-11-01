import { api } from "../../../api/api";

import type { Paged } from "../../support/types";

/* ============================================================================
   TYPES (mirror apps/api/src/legal)
============================================================================ */

export interface LegalPerson {
  id: string;
  username: string;
  name: string;
  avatar: string;
}

export interface LegalDocument {
  key: string;
  name: string;
  mimeType: string;
  size: number;
  sha256: string;
  addedAt: string;
}

export interface HistoryItem {
  action: string;
  note: string;
  at: string;
  actor: LegalPerson | null;
}

export interface AccessLogEntry {
  id: string;
  seq: number;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  reason: string;
  caseReference: string;
  holdNumber: string;
  metadata: Record<string, unknown>;
  at: string;
  actor: LegalPerson | null;
}

export interface RetentionPolicy {
  id: string;
  recordType: string;
  jurisdiction: string;
  label: string;
  /** null = not set by compliance yet (nothing is deleted). */
  retentionDays: number | null;
  action: "delete" | "anonymize" | "review";
  enabled: boolean;
  automated: boolean;
  status: "needs_configuration" | "active" | "paused" | "under_review";
  description: string;
  purpose: string;
  legalBasis: string;
  responsibleRole: string;
  effectiveDate: string | null;
  nextReviewAt: string | null;
  reviewDue: boolean;
  updatedAt: string;
  updatedBy: LegalPerson | null;
  lastRunAt: string | null;
  lastRunAffected: number;
  lastRunNote: string;
  history: { at: string; changes: string; reason: string; by: LegalPerson | null }[];
}

export interface RetentionInput {
  retentionDays?: number | null;
  action?: string;
  enabled?: boolean;
  status?: string;
  purpose?: string;
  legalBasis?: string;
  responsibleRole?: string;
  effectiveDate?: string | null;
  nextReviewAt?: string | null;
  reason: string;
}

export interface LegalDashboard {
  preservedRecords: number;
  activeHolds: number;
  holdsDueForReview: number;
  openRequests: number;
  overdueRequests: number;
  deletionRecords: number;
  deletionsWithHold: number;
  audit: { intact: boolean; checked: number };
  retention: {
    active: boolean;
    configured?: number;
    total?: number;
    policies: Pick<RetentionPolicy, "recordType" | "label" | "retentionDays" | "action" | "enabled">[];
    nextReviewAt: string | null;
    lastRunAt: string | null;
  };
  recent: AccessLogEntry[];
}

export interface LegalHold {
  id: string;
  number: string;
  caseReference: string;
  title: string;
  legalBasis: string;
  basisDetails: string;
  scope: string;
  status: "active" | "released";
  subjects: (LegalPerson | null)[];
  records: { recordType: string; recordId: string }[];
  recordCount: number;
  request: { id: string; number: string } | null;
  reviewAt: string | null;
  expiresAt: string | null;
  reviewDue: boolean;
  documents: LegalDocument[];
  createdBy: LegalPerson | null;
  createdAt: string;
  releasedBy: LegalPerson | null;
  releasedAt: string | null;
  releaseReason: string;
  history?: HistoryItem[];
}

export interface HoldInput {
  caseReference: string;
  title: string;
  legalBasis: string;
  basisDetails?: string;
  scope?: string;
  subjects?: string[];
  records?: { recordType: string; recordId: string }[];
  reviewAt?: string;
  expiresAt?: string;
  requestId?: string;
}

export interface LegalRequest {
  id: string;
  number: string;
  authority: string;
  authorityContact: string;
  requestType: string;
  legalBasis: string;
  jurisdiction: string;
  requestedRecords: string;
  subjects: (LegalPerson | null)[];
  verificationStatus: "pending" | "verified" | "rejected";
  verificationNote: string;
  verifiedBy: LegalPerson | null;
  verifiedAt: string | null;
  preservationStatus: "not_requested" | "pending" | "preserved";
  approvalStatus: "pending" | "approved" | "partially_approved" | "denied";
  approvalNote: string;
  approvedBy: LegalPerson | null;
  approvedAt: string | null;
  completionStatus: "open" | "in_progress" | "completed" | "closed";
  completedAt: string | null;
  responseDeadline: string | null;
  overdue: boolean;
  receivedAt: string;
  assignedTo: LegalPerson | null;
  holdId: string | null;
  createdBy: LegalPerson | null;
  createdAt: string;
  notes?: string;
  documents?: LegalDocument[];
  history?: HistoryItem[];
}

export interface RequestInput {
  authority: string;
  authorityContact?: string;
  requestType: string;
  legalBasis?: string;
  jurisdiction?: string;
  requestedRecords: string;
  subjects?: string[];
  responseDeadline?: string;
  receivedAt?: string;
  preservationRequested?: boolean;
}

export interface EvidenceSummary {
  id: string;
  number: string;
  recordType: string;
  recordId: string;
  userId: string;
  username: string;
  originalCreatedAt: string | null;
  preservedAt: string;
  preservedBy: LegalPerson | null;
  caseReference: string;
  holdId: string | null;
  requestId: string | null;
  reason: string;
  snapshotHash: string;
  fileCount: number;
  reportIds: string[];
  status: "preserved" | "expired";
  expiredAt: string | null;
}

export interface EvidenceDetail extends EvidenceSummary {
  snapshot: Record<string, unknown> | null;
  integrity: boolean | null;
  files: { key: string; name: string; mimeType: string; size: number; sha256: string }[];
  holdNumber: string;
}

export interface EvidenceExport {
  id: string;
  number: string;
  caseReference: string;
  requestId: string | null;
  recordNumbers: string[];
  reason: string;
  packageSha256: string;
  packageBytes: number;
  available: boolean;
  exportedBy: LegalPerson | null;
  exportedAt: string;
  downloads: number;
  packageRemovedAt: string | null;
}

export interface DeletionRecord {
  id: string;
  number: string;
  userId: string | null;
  source: "user" | "admin";
  status: "requested" | "processing" | "completed" | "completed_with_hold" | "failed";
  requestedAt: string;
  completedAt: string | null;
  holdNumbers: string[];
  summary: Record<string, number>;
  anonymizedAt: string | null;
}

/* ============================================================================
   LABELS
============================================================================ */

export const HOLD_BASIS_LABELS: Record<string, string> = {
  preservation_request: "Preservation request",
  court_order: "Court order",
  subpoena: "Subpoena",
  law_enforcement: "Law enforcement request",
  fraud_investigation: "Fraud investigation",
  safety_investigation: "Safety investigation",
  litigation: "Litigation",
  other: "Other legal basis",
};

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  preservation: "Preservation request",
  subpoena: "Subpoena",
  court_order: "Court order",
  search_warrant: "Search warrant",
  law_enforcement: "Law enforcement request",
  emergency: "Emergency request",
  civil: "Civil request",
  other: "Other",
};

export const RECORD_TYPE_LABELS: Record<string, string> = {
  post: "Post",
  comment: "Comment",
  account: "Account record",
  report_case: "Report case",
  moderation_event: "Moderation record",
  support_ticket: "Support ticket",
  other: "Other",
};

/* ============================================================================
   API — every endpoint is permission-checked and logged by the backend
============================================================================ */

const clean = (filters: object) =>
  Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== "" && value !== null));
const enc = encodeURIComponent;
const B = "/admin/legal";

function upload(path: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return api.post(path, form, { headers: { "Content-Type": "multipart/form-data" } });
}

export const legalAdminApi = {
  dashboard: async () => (await api.get<LegalDashboard>(`${B}/dashboard`)).data,
  staff: async () => (await api.get<{ items: LegalPerson[] }>(`${B}/staff`)).data.items,

  holds: async (filters: { status?: "active" | "released" | "all"; search?: string; page?: number }) =>
    (await api.get<Paged<LegalHold>>(`${B}/holds`, { params: clean(filters) })).data,
  hold: async (id: string) => (await api.get<LegalHold>(`${B}/holds/${enc(id)}`)).data,
  createHold: async (input: HoldInput) => (await api.post<LegalHold>(`${B}/holds`, input)).data,
  updateHold: async (id: string, input: { scope?: string; addSubjects?: string[]; addRecords?: { recordType: string; recordId: string }[]; reviewAt?: string; expiresAt?: string; note?: string }) =>
    (await api.patch<LegalHold>(`${B}/holds/${enc(id)}`, input)).data,
  releaseHold: async (id: string, reason: string) => (await api.post<LegalHold>(`${B}/holds/${enc(id)}/release`, { reason })).data,
  holdDocument: async (id: string, file: File) => (await upload(`${B}/holds/${enc(id)}/documents`, file)).data as LegalHold,
  holdDocumentLink: async (id: string, key: string, reason: string) => (await api.post<{ url: string }>(`${B}/holds/${enc(id)}/documents/open`, { key, reason })).data,

  requests: async (filters: { view?: "open" | "overdue" | "completed" | "all"; search?: string; page?: number }) =>
    (await api.get<Paged<LegalRequest>>(`${B}/requests`, { params: clean(filters) })).data,
  request: async (id: string) => (await api.get<LegalRequest>(`${B}/requests/${enc(id)}`)).data,
  createRequest: async (input: RequestInput) => (await api.post<LegalRequest>(`${B}/requests`, input)).data,
  updateRequest: async (id: string, input: { completionStatus?: string; assignedTo?: string; responseDeadline?: string; notes?: string }) =>
    (await api.patch<LegalRequest>(`${B}/requests/${enc(id)}`, input)).data,
  verifyRequest: async (id: string, status: "verified" | "rejected", note: string) => (await api.post<LegalRequest>(`${B}/requests/${enc(id)}/verify`, { status, note })).data,
  decideRequest: async (id: string, status: "approved" | "partially_approved" | "denied", note: string) =>
    (await api.post<LegalRequest>(`${B}/requests/${enc(id)}/decision`, { status, note })).data,
  requestDocument: async (id: string, file: File) => (await upload(`${B}/requests/${enc(id)}/documents`, file)).data as LegalRequest,
  requestDocumentLink: async (id: string, key: string, reason: string) => (await api.post<{ url: string }>(`${B}/requests/${enc(id)}/documents/open`, { key, reason })).data,

  evidence: async (filters: { search?: string; recordType?: string; status?: string; from?: string; to?: string; page?: number }) =>
    (await api.get<Paged<EvidenceSummary>>(`${B}/evidence`, { params: clean(filters) })).data,
  preserve: async (input: { recordType: string; recordId: string; holdId?: string; requestId?: string; reason: string }) => (await api.post<EvidenceSummary>(`${B}/evidence`, input)).data,
  openEvidence: async (id: string, reason: string) => (await api.post<EvidenceDetail>(`${B}/evidence/${enc(id)}/open`, { reason })).data,
  evidenceFile: async (id: string, key: string, reason: string) => (await api.post<{ url: string }>(`${B}/evidence/${enc(id)}/file`, { key, reason })).data,

  exports: async (page = 1) => (await api.get<Paged<EvidenceExport>>(`${B}/exports`, { params: { page } })).data,
  createExport: async (input: { caseReference: string; recordIds: string[]; requestId?: string; reason: string }) => (await api.post<EvidenceExport>(`${B}/exports`, input)).data,
  downloadExport: async (id: string, reason: string) => (await api.post<{ url: string }>(`${B}/exports/${enc(id)}/download`, { reason })).data,

  audit: async (filters: { action?: string; caseReference?: string; page?: number }) => (await api.get<Paged<AccessLogEntry>>(`${B}/audit`, { params: clean(filters) })).data,
  verifyAudit: async () => (await api.get<{ intact: boolean; checked: number; brokenAt: number | null }>(`${B}/audit/verify`)).data,

  policies: async () => (await api.get<{ items: RetentionPolicy[] }>(`${B}/retention`)).data.items,
  updatePolicy: async (recordType: string, input: RetentionInput, jurisdiction = "global") =>
    (await api.patch<RetentionPolicy>(`${B}/retention/${enc(recordType)}`, input, { params: { jurisdiction } })).data,
  createRetentionRule: async (input: RetentionInput & { recordType: string; jurisdiction: string }) => (await api.post<RetentionPolicy>(`${B}/retention/rules`, input)).data,
  runRetention: async () => (await api.post<{ ranAt: string; affected: Record<string, number> }>(`${B}/retention/run`)).data,

  deletions: async (filters: { status?: string; search?: string; page?: number }) => (await api.get<Paged<DeletionRecord>>(`${B}/deletions`, { params: clean(filters) })).data,
};

/** Opens a signed link in a new tab (tab opened first so pop-up blockers allow it). */
export async function openSigned(get: () => Promise<{ url: string }>) {
  const tab = window.open("", "_blank");
  try {
    const { url } = await get();
    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else window.location.assign(url);
  } catch (error) {
    tab?.close();
    throw error;
  }
}
