import { api } from "../../../api/api";

/* ============================================================================
   CAREERS — Admin Center API (apps/api/src/careers/controllers/careers-admin.controller.ts)
   careers.view to read, careers.manage to act.
============================================================================ */

export type EmployerStatus = "not_submitted" | "pending" | "approved" | "rejected" | "blocked";
export type PlanState = "free" | "exempt" | "paid" | "active" | "grace" | "expired";
export type JobStatus = "live" | "waiting" | "closed" | "taken_down";

export interface CareersOverview {
  employers: Record<EmployerStatus, number>;
  jobs: { total: number; live: number; takenDown: number };
  applications: number;
  chargingOn: boolean;
}

export interface EmployerRow {
  id: string;
  companyName: string;
  logoUrl: string | null;
  industry: string;
  location: string;
  status: EmployerStatus;
  businessEmail: string;
  submittedAt: string | null;
  plan: string;
  planState: PlanState;
  jobs: number;
  liveJobs: number;
}

export interface EmployerDetail {
  id: string;
  companyName: string;
  logoUrl: string | null;
  industry: string;
  companySize: string;
  website: string;
  location: string;
  about: string;
  owner: { id: string; name: string; email: string };
  teamSize: number;
  status: EmployerStatus;
  blockedReason: string;
  verification: {
    status: string;
    legalName: string;
    businessEmail: string;
    website: string;
    registrationNumber: string;
    documents: { name: string; url: string }[];
    submittedAt: string | null;
    reviewedAt: string | null;
    reviewerNote: string;
  };
  plan: {
    planId: string;
    effectivePlanId: string;
    name: string;
    state: PlanState;
    paidUntil: string | null;
    graceEndsAt: string | null;
    maxActiveJobs: number;
    exempt: boolean;
    exemptReason: string;
  };
  plans: { id: string; name: string; price: number; periodMonths: number }[];
  currency: string;
  billingEntries: Array<{ method: string; plan?: string; amount?: number; currency?: string; from?: string; to?: string; note?: string; byName?: string; at: string }>;
  history: Array<{ action: string; reason?: string; byName?: string; at: string }>;
  jobs: Array<{ id: string; title: string; location: string; status: JobStatus; applications: number; createdAt: string | null }>;
}

export type EmployerAction = { action: "approve" | "reject" | "block" | "unblock" | "set_plan" | "exempt" | "unexempt" | "clear_paid"; reason?: string; plan?: string; until?: string; amount?: number };

export interface JobRow {
  id: string;
  title: string;
  company: string;
  employerId: string;
  location: string;
  status: JobStatus;
  takenDownReason: string;
  applications: number;
  createdAt: string | null;
}

export interface PlanConfig {
  id: string;
  name: string;
  description: string;
  features: string[];
  price: number;
  periodMonths: number;
  maxActiveJobs: number;
}

export interface PlanSettings {
  enabled: boolean;
  currency: string;
  graceDays: number;
  note: string;
  plans: PlanConfig[];
  updatedAt: string | null;
  history: Array<{ summary: string; byName?: string; at: string }>;
}

type Paged<T> = { items: T[]; page: number; total: number; hasMore: boolean };
const clean = (p: Record<string, unknown>) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== "" && v !== 1));
const enc = encodeURIComponent;
const BASE = "/admin/careers";

export type JobAdminAction = "take_down" | "restore" | "delete";

export const careersAdminApi = {
  overview: async () => (await api.get<CareersOverview>(`${BASE}/overview`)).data,
  employers: async (p: { status?: string; search?: string; page?: number }) => (await api.get<Paged<EmployerRow>>(`${BASE}/employers`, { params: clean(p) })).data,
  employer: async (id: string) => (await api.get<EmployerDetail>(`${BASE}/employers/${enc(id)}`)).data,
  employerAction: async (id: string, body: EmployerAction) => (await api.post<EmployerDetail>(`${BASE}/employers/${enc(id)}/action`, body)).data,
  jobs: async (p: { status?: string; search?: string; page?: number }) => (await api.get<Paged<JobRow>>(`${BASE}/jobs`, { params: clean(p) })).data,
  jobAction: async (id: string, body: { action: JobAdminAction; reason?: string }) => (await api.post<{ ok: true }>(`${BASE}/jobs/${enc(id)}/action`, body)).data,
  plans: async () => (await api.get<PlanSettings>(`${BASE}/plans`)).data,
  savePlans: async (body: Partial<Omit<PlanSettings, "history" | "updatedAt">>) => (await api.put<PlanSettings>(`${BASE}/plans`, body)).data,
};
