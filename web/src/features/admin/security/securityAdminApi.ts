import { api } from "../../../api/api";

/* ============================================================================
   SECURITY & IDENTITY — ADMIN API

   Every value, label, range and default shown in the Security & Identity
   pages comes from the backend (GET /admin/security/policy). Nothing about
   the policy itself is hard-coded in the web app.
============================================================================ */

export type PolicyProfile = "accounts" | "managed";

export type PolicySectionKey =
  | "password"
  | "login"
  | "sessions"
  | "twoFactor"
  | "alerts"
  | "protection"
  | "auditing";

export type PolicyValue = boolean | number;
export type PolicyValues = Record<string, PolicyValue>;

export interface PolicyField {
  key: string;
  section: PolicySectionKey;
  alsoShownIn?: PolicySectionKey[];
  label: string;
  description: string;
  type: "boolean" | "number";
  unit?: string;
  min?: number;
  max?: number;
  profiles: PolicyProfile[];
  defaults: Partial<Record<PolicyProfile, PolicyValue>>;
  strictness: string;
  delegable: boolean;
  enforcement: "enforced" | "locked" | "unavailable";
  enforcementNote: string;
  dependsOn?: string;
  highRisk?: string;
  riskNote?: string;
}

export interface PlatformPolicy {
  accounts: PolicyValues;
  managed: PolicyValues;
  delegatedFields: string[];
  version: number;
  updatedAt: string | null;
  updatedByName: string;
  fallback: boolean;
}

export interface PolicyPermissions {
  password: boolean;
  login: boolean;
  alerts: boolean;
  protection: boolean;
  auditing: boolean;
  sessions: boolean;
  twoFactor: boolean;
  organizationDefaults: boolean;
  accountRecovery: boolean;
  auditView: boolean;
}

export interface PolicyView {
  policy: PlatformPolicy;
  fields: PolicyField[];
  permissions: PolicyPermissions;
  reauthRequired: boolean;
}

export interface PolicyChange {
  profile: PolicyProfile | "delegation";
  field: string;
  from: unknown;
  to: unknown;
}

export interface PolicyRisk {
  profile: PolicyProfile;
  field: string;
  label: string;
  note: string;
}

export interface PolicyImpact {
  field: string;
  profile: string;
  label: string;
  affectedAccounts: number | null;
  note: string;
}

export interface PolicyPreview {
  currentVersion: number;
  changes: PolicyChange[];
  risks: PolicyRisk[];
  impact: PolicyImpact[];
  errors: string[];
  forbidden: string[];
}

export interface PolicyUpdate {
  expectedVersion?: number;
  accounts?: PolicyValues;
  managed?: PolicyValues;
  delegatedFields?: string[];
  reason?: string;
  confirmHighRisk?: boolean;
}

export interface PolicyRevision {
  id: string;
  scope: "platform" | "organization";
  organizationId: string | null;
  version: number;
  changes: PolicyChange[];
  actorId: string | null;
  actorName: string;
  reason: string;
  highRisk: boolean;
  createdAt: string | null;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SecurityEvent {
  id: string;
  createdAt: string | null;
  module: string;
  action: string;
  outcome: string | null;
  severity: string | null;
  actorId: string | null;
  actorName: string | null;
  targetId: string | null;
  targetType: string | null;
  organizationId: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
}

export interface LockedAccount {
  id: string;
  username: string;
  email?: string;
  role?: string;
  lockedUntil: string | null;
  lockoutCount: number;
  failedLoginAttempts?: number;
  lastFailedLoginAt?: string | null;
}

export interface SecurityOverview {
  generatedAt: string;
  policy: {
    version: number;
    updatedAt: string | null;
    updatedByName: string;
    fallback: boolean;
    accounts: PolicyValues;
    managed: PolicyValues;
    delegatedCount: number;
  };
  mfa: {
    activeAccounts: number | null;
    enrolledAccounts: number | null;
    administrators: number | null;
    administratorsWithoutMfa: number | null;
    requiredForAdministrators: boolean;
    requiredForEveryone: boolean;
  };
  authentication: {
    failedLast24h: number | null;
    failedLast7d: number | null;
    successfulLast24h: number | null;
    lockoutsLast7d: number | null;
    suspiciousLast7d: number | null;
  };
  accounts: {
    lockedNow: number | null;
    activeLast15Minutes: number | null;
    locked: LockedAccount[];
  };
  organizations: {
    organizationsWithPolicy: number | null;
    organizationsRequiringMfa: number | null;
    managedIdentities: number | null;
  };
  recentEvents: SecurityEvent[] | null;
  recentPolicyChanges: PolicyRevision[] | null;
  alerts: Array<{ level: "danger" | "warning" | "info"; title: string; detail: string; link?: string }>;
}

export interface OrganizationSecurityRow {
  id: string;
  name: string;
  managedUsers: number;
  customized: boolean;
  overriddenFields: string[];
  requireTwoFactor: boolean;
  requireTwoFactorForAdministrators: boolean;
  minimumPasswordLength: number;
  inactivityTimeoutMinutes: number;
}

export interface UserLookup {
  id: string;
  username: string;
  email: string;
  role: string;
  mfaEnabled: boolean;
  lockedUntil: string | null;
}

/* ============================================================================
   REAUTHENTICATION TOKEN (memory only — never written to storage)
============================================================================ */

let reauth: { token: string; expiresAt: number } | null = null;

export function hasReauth(): boolean {
  return Boolean(reauth && reauth.expiresAt > Date.now() + 5_000);
}

function reauthHeaders(): Record<string, string> {
  return hasReauth() ? { "X-Fockis-Reauth": reauth!.token } : {};
}

export function clearReauth(): void {
  reauth = null;
}

/** True when the API refused because reauthentication is needed. */
export function needsReauth(error: unknown): boolean {
  const data = (error as { response?: { status?: number; data?: { code?: string } } })?.response;
  return data?.data?.code === "REAUTH_REQUIRED";
}

/** True when a policy save needs the high-risk confirmation step. */
export function needsRiskConfirmation(error: unknown): PolicyRisk[] | null {
  const data = (error as { response?: { data?: { code?: string; risks?: PolicyRisk[] } } })?.response?.data;
  return data?.code === "HIGH_RISK_CONFIRMATION_REQUIRED" ? data.risks ?? [] : null;
}

/** Human-readable error, including validation lists from the API. */
export function securityError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const response = (error as {
    response?: { status?: number; data?: { message?: unknown; errors?: unknown; forbidden?: unknown } };
  })?.response;

  if (!response) return "Can't reach the server. Check your connection and try again.";

  const data = response.data ?? {};
  const list = Array.isArray(data.errors) ? data.errors : Array.isArray(data.forbidden) ? data.forbidden : null;
  const message = Array.isArray(data.message) ? String(data.message[0] ?? "") : typeof data.message === "string" ? data.message : "";

  if (list?.length) return `${message || fallback} ${list.map(String).join(" ")}`.trim();
  if (response.status === 403 && !message) return "You don't have permission to do that.";

  return message || fallback;
}

/* ============================================================================
   CALLS
============================================================================ */

const BASE = "/admin/security";

export const securityAdminApi = {
  async reauthenticate(password: string, code?: string) {
    const res = await api.post("/auth/reauthenticate", { password, ...(code ? { code } : {}) });
    const data = res.data as { reauthToken: string; expiresInSeconds: number };

    reauth = {
      token: data.reauthToken,
      expiresAt: Date.now() + Number(data.expiresInSeconds || 600) * 1000,
    };

    return data;
  },

  async overview(): Promise<SecurityOverview> {
    return (await api.get(`${BASE}/overview`)).data;
  },

  async policy(): Promise<PolicyView> {
    return (await api.get(`${BASE}/policy`)).data;
  },

  async preview(body: PolicyUpdate): Promise<PolicyPreview> {
    return (await api.post(`${BASE}/policy/preview`, body)).data;
  },

  async update(body: PolicyUpdate): Promise<{ policy: PlatformPolicy; changes: PolicyChange[]; version: number }> {
    return (await api.patch(`${BASE}/policy`, body, { headers: reauthHeaders() })).data;
  },

  async history(params: { scope?: string; page?: number; pageSize?: number } = {}): Promise<Paged<PolicyRevision>> {
    return (await api.get(`${BASE}/policy/history`, { params })).data;
  },

  async events(params: Record<string, string | number | undefined>): Promise<Paged<SecurityEvent>> {
    return (await api.get(`${BASE}/events`, { params })).data;
  },

  async exportEvents(params: Record<string, string | number | undefined>): Promise<Blob> {
    const res = await api.get(`${BASE}/events/export`, { params, responseType: "blob" });
    return res.data as Blob;
  },

  async lockedAccounts(page = 1): Promise<Paged<LockedAccount>> {
    return (await api.get(`${BASE}/accounts/locked`, { params: { page } })).data;
  },

  async lookupUser(q: string): Promise<{ items: UserLookup[] }> {
    return (await api.get(`${BASE}/accounts/lookup`, { params: { q } })).data;
  },

  async unlock(userId: string, reason: string) {
    return (await api.post(`${BASE}/accounts/${encodeURIComponent(userId)}/unlock`, { reason }, { headers: reauthHeaders() })).data;
  },

  async revokeSessions(userId: string, reason: string) {
    return (await api.post(`${BASE}/accounts/${encodeURIComponent(userId)}/revoke-sessions`, { reason }, { headers: reauthHeaders() })).data;
  },

  async resetMfa(userId: string, reason: string) {
    return (await api.post(`${BASE}/accounts/${encodeURIComponent(userId)}/reset-mfa`, { reason }, { headers: reauthHeaders() })).data;
  },

  async requirePasswordChange(userId: string, reason: string) {
    return (await api.post(`${BASE}/accounts/${encodeURIComponent(userId)}/require-password-change`, { reason }, { headers: reauthHeaders() })).data;
  },

  async organizations(params: { search?: string; page?: number } = {}): Promise<Paged<OrganizationSecurityRow> & { platformVersion: number }> {
    return (await api.get(`${BASE}/organizations`, { params })).data;
  },

  // ---------------------------------------------------------------- incidents

  async incidents(params: Record<string, string | number> = {}): Promise<IncidentPage> {
    return (await api.get(`${BASE}/incidents`, { params })).data;
  },

  async incident(id: string): Promise<SecurityIncident> {
    return (await api.get(`${BASE}/incidents/${encodeURIComponent(id)}`)).data;
  },

  async acknowledgeIncident(id: string, note: string): Promise<SecurityIncident> {
    return (await api.patch(`${BASE}/incidents/${encodeURIComponent(id)}/acknowledge`, note ? { note } : {})).data;
  },

  async resolveIncident(id: string, note: string, liftRestriction: boolean) {
    return (await api.patch(`${BASE}/incidents/${encodeURIComponent(id)}/resolve`, { note, liftRestriction }, { headers: reauthHeaders() })).data as {
      incident: SecurityIncident;
      restrictionLifted: boolean;
    };
  },

  // ------------------------------------------------------------- restrictions

  async restrictions(params: Record<string, string | number> = {}): Promise<Paged<AuthRestrictionRow>> {
    return (await api.get(`${BASE}/restrictions`, { params })).data;
  },

  async reviewRestriction(id: string, action: "lift" | "keep", note: string, extendHours = 0): Promise<AuthRestrictionRow> {
    return (
      await api.post(
        `${BASE}/restrictions/${encodeURIComponent(id)}/review`,
        { action, note, ...(action === "keep" && extendHours ? { extendHours } : {}) },
        { headers: reauthHeaders() },
      )
    ).data;
  },

  // ----------------------------------------------------------------- recovery

  async recoveryCases(params: Record<string, string | number> = {}): Promise<Paged<RecoveryCaseRow>> {
    return (await api.get(`${BASE}/recovery`, { params })).data;
  },

  async recoveryCase(id: string): Promise<RecoveryCaseDetail> {
    return (await api.get(`${BASE}/recovery/${encodeURIComponent(id)}`)).data;
  },

  async reviewRecovery(
    id: string,
    input: { action: "start_review" | "approve" | "reject" | "close"; note?: string; revokeSessions?: boolean; requirePasswordChange?: boolean },
  ) {
    return (await api.post(`${BASE}/recovery/${encodeURIComponent(id)}/review`, input, { headers: reauthHeaders() })).data as {
      case: RecoveryCaseRow;
      effects: string[];
    };
  },
};

/* ============================================================================
   INCIDENTS, RESTRICTIONS, RECOVERY
============================================================================ */

export type IncidentStatus =
  | "detected"
  | "monitoring"
  | "high_risk"
  | "verification_pending"
  | "restricted"
  | "verified"
  | "under_review"
  | "resolved"
  | "expired";

export type IncidentLevel = "warning" | "high" | "critical";

export interface TimelineEntry {
  at: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  note: string;
}

export interface AuthRestrictionRow {
  id: string;
  userId: string;
  username?: string | null;
  incidentId: string | null;
  level: "step_up" | "critical";
  status: "verification_pending" | "verified" | "lifted" | "expired";
  active: boolean;
  reasonCodes: string[];
  expiresAt: string;
  verifiedMethod: string | null;
  verifiedAt: string | null;
  liftedBy: string | null;
  liftedAt: string | null;
  reviewNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityIncident {
  id: string;
  number: string;
  kind: "account_failed_logins" | "unknown_account_failed_logins" | "source_abuse" | "suspicious_sign_in";
  status: IncidentStatus;
  open: boolean;
  level: IncidentLevel;
  riskScore: number;
  reasonCodes: string[];
  reasons: Array<{ code: string; label: string }>;
  subjectUserId: string | null;
  subjectLabel: string;
  username: string | null;
  privileged: boolean;
  sourceIp: string | null;
  windowFailures: number;
  totalFailures: number;
  blockedAttempts: number;
  distinctSources: number;
  distinctTargets: number;
  firstSeenAt: string;
  lastActivityAt: string;
  restrictionId: string | null;
  restriction: AuthRestrictionRow | null;
  verifiedAt: string | null;
  sessionsRevokedAt: string | null;
  successAfterFailuresAt: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNote: string;
  timeline: TimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface IncidentPage extends Paged<SecurityIncident> {
  openByLevel: Partial<Record<IncidentLevel, number>>;
}

export interface RecoveryCaseRow {
  id: string;
  number: string;
  userId: string;
  username: string | null;
  source: "public_form" | "login_verification";
  status: "open" | "in_review" | "approved" | "rejected" | "closed";
  message: string;
  restrictionId: string | null;
  incidentId: string | null;
  requestIp: string | null;
  requestDevice: string | null;
  assignedTo: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  timeline: TimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryCaseDetail extends RecoveryCaseRow {
  account: {
    id: string;
    username: string;
    role: string;
    mfaEnabled: boolean;
    isActive: boolean;
    lockedUntil: string | null;
  } | null;
  activeRestriction: AuthRestrictionRow | null;
}

/* ============================================================================
   FORMATTING
============================================================================ */

const UNIT_LABEL: Record<string, [string, string]> = {
  sec: ["second", "seconds"],
  min: ["minute", "minutes"],
  hrs: ["hour", "hours"],
  days: ["day", "days"],
  chars: ["character", "characters"],
  passwords: ["password", "passwords"],
  attempts: ["attempt", "attempts"],
  lockouts: ["lockout", "lockouts"],
};

export function formatPolicyValue(field: PolicyField | undefined, value: unknown): string {
  if (value === undefined || value === null) return "—";

  if (!field || field.type === "boolean") return value === true ? "On" : value === false ? "Off" : String(value);

  const n = Number(value);

  if (n === 0 && ["inactivityTimeoutMinutes", "maximumSessionHours"].includes(field.key)) return "No limit";
  if (n === 0 && field.key === "rememberMeDays") return "Disabled";

  const unit = field.unit ? UNIT_LABEL[field.unit] : null;

  return unit ? `${n.toLocaleString()} ${n === 1 ? unit[0] : unit[1]}` : n.toLocaleString();
}

export const SECTION_ROUTES: Record<PolicySectionKey, string> = {
  password: "/admin/security/password",
  login: "/admin/security/login-protection",
  sessions: "/admin/security/sessions",
  twoFactor: "/admin/security/two-factor",
  alerts: "/admin/security/alerts",
  protection: "/admin/security/account-protection",
  auditing: "/admin/security/audit",
};

export const SECTION_TITLES: Record<PolicySectionKey, string> = {
  password: "Password Security",
  login: "Login Protection",
  sessions: "Session Management",
  twoFactor: "Two-Factor Authentication",
  alerts: "Login Alerts",
  protection: "Account Protection",
  auditing: "Security Auditing",
};
