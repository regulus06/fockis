import api from "../../../api/api";

/* ---------------- types ---------------- */

export interface PublicPolicy {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  version: string;
  versionId: string;
  effectiveDate: string | null;
  updatedAt: string | null;
  requiredAcceptance: boolean;
}

export interface PolicySection {
  heading: string;
  body: string;
}

export interface PublicPolicyDetail extends PublicPolicy {
  changeSummary: string;
  sections: PolicySection[];
}

export interface PublicPolicyVersion {
  version: string;
  changeSummary: string;
  publishedAt: string | null;
  effectiveDate: string | null;
  current: boolean;
}

export type AcceptanceStatus = "accepted" | "action_needed" | "not_required";

export interface MyPolicy extends PublicPolicy {
  acceptedAt: string | null;
  previouslyAccepted: { version: string; acceptedAt: string } | null;
  status: AcceptanceStatus;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  at: string;
}

export interface Overview {
  policies: { required: number; accepted: number; actionNeeded: { slug: string; title: string; version: string }[]; published: number };
  privacy: { configured: boolean; profileVisibility: "public" | "private"; optionalConsents: number };
  dataRequests: { exports: number; corrections: number; active: number };
  appeals: { open: number; resolved: number; appealable: number };
  recent: Activity[];
}

export interface PrivacySettings {
  configured: boolean;
  profileVisibility: "public" | "private";
  messaging: "everyone" | "friends" | "following" | "nobody";
  comments: "everyone" | "friends" | "followers" | "nobody";
  searchable: boolean;
  mutedCount: number;
  updatedAt: string | null;
}

export interface Person {
  id: string;
  username: string;
  name: string;
  avatar: string;
}

export interface ConsentState {
  consentVersion: string;
  recordedVersion: string | null;
  updatedAt: string | null;
  choices: Record<string, boolean>;
  history: { changes: Record<string, boolean>; consentVersion: string; at: string }[];
}

export interface SecurityState {
  mfaEnabled: boolean;
  mfaRequired: boolean;
  lastLoginAt: string | null;
  lastLoginDevice: string;
  passwordChangedAt: string | null;
  failedLoginAttempts: number;
  lastFailedLoginAt: string | null;
  issues: number;
  recommendations: { id: string; level: "good" | "warn"; text: string }[];
}

export interface MyInformation {
  account: Record<string, string | null>;
  privacy: PrivacySettings;
  consents: Record<string, boolean>;
}

export interface DataRequest {
  id: string;
  number: string;
  type: "export" | "correction";
  status: "pending" | "processing" | "completed" | "rejected" | "expired";
  field: string;
  details: string;
  response: string;
  fileBytes: number;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
}

export interface HistoryRow {
  id: string;
  slug: string;
  title: string;
  version: string;
  publishedAt: string | null;
  effectiveDate: string | null;
  acceptedAt: string;
  source: string;
  current: boolean;
}

export interface Decision {
  caseId: string;
  targetType: string;
  rule: string;
  ruleLabel: string;
  consequences: string[];
  restrictionUntil: string | null;
  message: string;
  decidedAt: string | null;
  reversed: boolean;
  reversedAt: string | null;
  contentPreview: string;
  appeal: { status: "none" | "pending" | "upheld" | "overturned"; message: string; submittedAt: string | null; reviewedAt: string | null; outcomeNote: string | null };
  canAppeal: boolean;
}

export interface BlockedUser {
  _id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  profilePicture?: string;
}

/* ---------------- calls ---------------- */

const get = async <T>(url: string, params?: Record<string, unknown>) => (await api.get<T>(url, { params })).data;

export const policyCenterApi = {
  // Public
  publicPolicies: () => get<{ items: PublicPolicy[] }>("/policies").then((r) => r.items),
  publicPolicy: (slug: string) => get<PublicPolicyDetail>(`/policies/${encodeURIComponent(slug)}`),
  publicVersions: (slug: string) => get<{ items: PublicPolicyVersion[] }>(`/policies/${encodeURIComponent(slug)}/versions`).then((r) => r.items),

  // Signed in (own data only)
  overview: () => get<Overview>("/policy-center/overview"),
  myPolicies: () => get<{ items: MyPolicy[] }>("/policy-center/policies").then((r) => r.items),
  accept: async (slug: string, versionId: string) => (await api.post<MyPolicy>(`/policy-center/policies/${encodeURIComponent(slug)}/accept`, { versionId })).data,
  history: () => get<{ items: HistoryRow[] }>("/policy-center/history").then((r) => r.items),
  activity: () => get<{ items: Activity[] }>("/policy-center/activity").then((r) => r.items),

  privacy: () => get<PrivacySettings>("/policy-center/privacy"),
  updatePrivacy: async (patch: Partial<Pick<PrivacySettings, "profileVisibility" | "messaging" | "comments" | "searchable">>) => (await api.patch<PrivacySettings>("/policy-center/privacy", patch)).data,
  muted: () => get<{ items: Person[] }>("/policy-center/muted").then((r) => r.items),
  mute: async (user: string) => (await api.post<{ items: Person[] }>("/policy-center/muted", { user })).data.items,
  unmute: async (userId: string) => (await api.delete<{ items: Person[] }>(`/policy-center/muted/${encodeURIComponent(userId)}`)).data.items,

  consent: () => get<ConsentState>("/policy-center/consent"),
  updateConsent: async (key: string, value: boolean) => (await api.patch<ConsentState>("/policy-center/consent", { key, value })).data,

  security: () => get<SecurityState>("/policy-center/security"),
  securityCheck: async () => (await api.post<SecurityState>("/policy-center/security/check")).data,

  myInformation: () => get<MyInformation>("/policy-center/my-information"),
  dataRequests: () => get<{ items: DataRequest[] }>("/policy-center/data-requests").then((r) => r.items),
  requestExport: async () => (await api.post<DataRequest>("/policy-center/data-requests/export")).data,
  requestCorrection: async (field: string, details: string) => (await api.post<DataRequest>("/policy-center/data-requests/correction", { field, details })).data,
  downloadLink: (id: string) => get<{ url: string }>(`/policy-center/data-requests/${encodeURIComponent(id)}/download`),

  // Existing Fockis endpoints reused here
  decisions: () => get<{ items: Decision[] }>("/moderation/my-decisions").then((r) => r.items ?? []),
  appeal: async (caseId: string, message: string) => (await api.post<{ success: boolean; decision: Decision }>(`/moderation/decisions/${encodeURIComponent(caseId)}/appeal`, { message })).data.decision,
  blocked: async () => {
    const data = await get<BlockedUser[] | { items?: BlockedUser[] }>("/friends/blocked");
    return Array.isArray(data) ? data : data?.items ?? [];
  },
  unblock: async (userId: string) => (await api.delete(`/friends/${encodeURIComponent(userId)}/block`)).data,
};

/** Turns an API error into a sentence that is safe to show. */
export function apiMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  const response = (error as { response?: { status?: number; data?: { message?: unknown } } })?.response;
  const message = response?.data?.message;
  const text = Array.isArray(message) ? String(message[0] ?? "") : typeof message === "string" ? message : "";
  if (!response) return "You appear to be offline. Check your connection and try again.";
  if (response.status === 429) return text || "Too many requests. Please wait a little and try again.";
  return text || fallback;
}
