// ============================================================================
// AGENCY & BUSINESS SERVICES
// Mock implementations run when no backend URL is configured. Every function
// maps 1:1 to an endpoint in PLATFORM_ENDPOINTS for the NestJS backend.
// ============================================================================

import type {
  AgencyActivity,
  AgencySettings,
  AgencyTask,
  Approval,
  ApprovalComment,
  ApprovalStatus,
  Business,
  BusinessSummary,
  BusinessType,
  ServiceKey,
  ServiceStatus,
  TeamMember,
  MarketingViewer,
  TeamRole,
} from "../types/platform.types";
import { PLATFORM_ENDPOINTS as EP } from "./endpoints";
import { call } from "./httpClient";
import { findOrThrow, storeFor, upsert, removeById } from "./mockDb";
import { platformDb } from "./platformDb";
import { notifyWorkspaceChange } from "./workspaceStore";
import { pushNotification } from "./notificationsApi";
import { defaultHours, servicesRecord } from "../data/agencyMockData";
import { rate, uid } from "../utils/format";

export interface NewBusinessInput {
  name: string;
  type: BusinessType;
  description: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  serviceArea: string;
  accent: string;
  logo: string;
  brandFonts: string[];
  goals: Business["profile"]["goals"];
  services: ServiceKey[];
  planId: string;
  sizeHint: number;
  ownerName: string;
  ownerEmail: string;
  sourceApplicationId?: string;
}

export interface AgencyDashboard {
  totals: {
    clients: number;
    activeClients: number;
    applications: number;
    activeCampaigns: number;
    contacts: number;
    emailsSent: number;
    leads: number;
    conversions: number;
    revenue: number;
  };
  summaries: BusinessSummary[];
}

export interface AgencyReportFilters {
  businessId?: string;
  businessType?: BusinessType | "all";
  campaignType?: string;
  days: number;
}

/** Computes a business's rollup from its own (isolated) store. */
export function summarize(b: Business): BusinessSummary {
  const s = storeFor(b.id);
  const sent = s.campaigns.filter((c) => c.stats.delivered > 0);
  const delivered = sent.reduce((n, c) => n + c.stats.delivered, 0);
  return {
    businessId: b.id,
    contacts: s.audiences[0]?.contactCount ?? 0,
    campaigns: s.campaigns.length,
    activeCampaigns: s.campaigns.filter((c) => c.status === "scheduled" || c.status === "sending").length,
    openRate: rate(sent.reduce((n, c) => n + c.stats.uniqueOpens, 0), delivered),
    clickRate: rate(sent.reduce((n, c) => n + c.stats.uniqueClicks, 0), delivered),
    revenue: sent.reduce((n, c) => n + c.stats.revenue, 0),
    emailsSent: sent.reduce((n, c) => n + c.stats.recipients, 0),
    leads: s.forms.reduce((n, f) => n + f.submissions, 0),
    conversions: sent.reduce((n, c) => n + c.stats.conversions, 0),
  };
}

function createBusinessMock(input: NewBusinessInput): Business {
  const id = uid("biz");
  const plan = platformDb.plans.find((p) => p.planId === input.planId) ?? platformDb.plans[0];
  const now = new Date().toISOString();
  const domain = input.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "") || `${id}.example`;
  const business: Business = {
    id,
    workspaceId: `ws_${id}`,
    name: input.name,
    type: input.type,
    status: "onboarding",
    logo: input.logo,
    accent: input.accent,
    isAgencyOwner: false,
    sizeHint: Math.max(50, input.sizeHint),
    planId: plan.planId,
    services: servicesRecord(input.services),
    profile: {
      description: input.description,
      website: input.website,
      phone: input.phone,
      email: input.email,
      address: input.address,
      serviceArea: input.serviceArea,
      hours: defaultHours(),
      timezone: "America/New_York",
      currency: "USD",
      brandColors: [input.accent],
      brandFonts: input.brandFonts,
      social: { website: input.website },
      goals: input.goals,
      defaultSenderName: input.name,
      defaultSenderEmail: `news@${domain}`,
      replyToEmail: input.email || `hello@${domain}`,
    },
    sourceApplicationId: input.sourceApplicationId,
    createdAt: now,
    lastActivityAt: now,
  };
  platformDb.businesses.push(business);
  platformDb.balances.push({
    businessId: id, workspaceId: business.workspaceId, planId: plan.planId,
    emailCreditsIncluded: plan.emailCreditsIncluded, emailCreditsRemaining: plan.emailCreditsIncluded, emailCreditsUsed: 0,
    smsCreditsIncluded: plan.smsCreditsIncluded, smsCreditsRemaining: plan.smsCreditsIncluded, smsCreditsUsed: 0,
    emailCreditsBonus: 0, smsCreditsBonus: 0, billingCycle: plan.billingCycle,
    renewalDate: new Date(Date.now() + 30 * 86400000).toISOString(), status: "active", billingStatus: "trialing",
  });
  platformDb.billingSettings.push({
    businessId: id, billingEmail: input.email, companyName: input.name, taxId: "", address: input.address,
    autoRecharge: { enabled: false, channel: "email", threshold: 500, packageId: "pkg_email_5k" }, lowCreditAlerts: true,
  });
  platformDb.team.push(
    { id: uid("tm"), businessId: id, name: input.ownerName || "Business owner", email: input.ownerEmail || input.email, role: "owner", status: "invited", invitedAt: now },
    { id: uid("tm"), businessId: id, name: platformDb.viewer.name, email: "elince@fockis.com", role: "admin", status: "active", invitedAt: now, lastActiveAt: now },
  );
  platformDb.activity.unshift({ id: uid("aa"), businessId: id, text: `${input.name} workspace created`, at: now });
  if (platformDb.agencySettings.autoCreateTasksOnConversion) {
    ["Import contacts", "Set up welcome automation", "Plan first campaign"].forEach((title, i) =>
      platformDb.tasks.unshift({ id: uid("task"), title, businessId: id, assignee: platformDb.viewer.name, priority: i === 0 ? "high" : "medium", status: "todo", dueDate: new Date(Date.now() + (i + 2) * 86400000).toISOString(), createdAt: now }),
    );
  }
  pushNotification({ type: "WORKSPACE_CREATED", businessId: id, title: "Workspace created", body: `${input.name}'s marketing workspace is ready.`, link: `/marketing/agency/clients/${id}` });
  notifyWorkspaceChange();
  return business;
}

export const agencyApi = {
  /** Replace with your auth user + permissions from the backend. */
  getViewer: () => call<MarketingViewer>(() => platformDb.viewer, "/marketing/me"),

  // Businesses ----------------------------------------------------------------
  getBusinesses: () => call<Business[]>(() => platformDb.businesses, EP.businesses),

  getBusiness: (id: string) => call<Business>(() => findOrThrow(platformDb.businesses, id, "Business"), EP.business(id)),

  getBusinessSummary: (id: string) =>
    call<BusinessSummary>(() => summarize(findOrThrow(platformDb.businesses, id, "Business")), EP.businessSummary(id)),

  createBusiness: (input: NewBusinessInput) =>
    call<Business>(() => createBusinessMock(input), EP.businesses, { method: "POST", body: input }),

  updateBusiness: (id: string, patch: Partial<Business>) =>
    call<Business>(() => {
      const next = upsert(platformDb.businesses, { ...findOrThrow(platformDb.businesses, id, "Business"), ...patch, id });
      notifyWorkspaceChange();
      return next;
    }, EP.business(id), { method: "PATCH", body: patch }),

  setService: (id: string, service: ServiceKey, status: ServiceStatus) =>
    call<Business>(() => {
      const b = findOrThrow(platformDb.businesses, id, "Business");
      return upsert(platformDb.businesses, { ...b, services: { ...b.services, [service]: status } });
    }, EP.businessServices(id), { method: "PATCH", body: { service, status } }),

  archiveBusiness: (id: string) =>
    call<Business>(() => {
      const next = upsert<Business>(platformDb.businesses, { ...findOrThrow(platformDb.businesses, id, "Business"), status: "archived" });
      notifyWorkspaceChange();
      return next;
    }, EP.business(id), { method: "PATCH", body: { status: "archived" } }),

  // Team ----------------------------------------------------------------------
  getTeam: (businessId: string) => call<TeamMember[]>(() => platformDb.team.filter((m) => m.businessId === businessId), EP.team(businessId)),

  inviteMember: (businessId: string, name: string, email: string, role: TeamRole) =>
    call<TeamMember>(() => {
      if (platformDb.team.some((m) => m.businessId === businessId && m.email.toLowerCase() === email.toLowerCase())) {
        throw new Error(`${email} is already on this team.`);
      }
      return upsert(platformDb.team, { id: uid("tm"), businessId, name, email, role, status: "invited", invitedAt: new Date().toISOString() });
    }, EP.team(businessId), { method: "POST", body: { name, email, role } }),

  changeRole: (businessId: string, memberId: string, role: TeamRole) =>
    call<TeamMember>(() => upsert(platformDb.team, { ...findOrThrow(platformDb.team, memberId, "Member"), role }), EP.teamMember(businessId, memberId), { method: "PATCH", body: { role } }),

  removeMember: (businessId: string, memberId: string) =>
    call<void>(() => {
      const m = findOrThrow(platformDb.team, memberId, "Member");
      if (m.role === "owner" && platformDb.team.filter((x) => x.businessId === businessId && x.role === "owner").length === 1) {
        throw new Error("Every workspace needs at least one owner. Make someone else the owner first.");
      }
      removeById(platformDb.team, memberId);
    }, EP.teamMember(businessId, memberId), { method: "DELETE" }),

  resendInvite: (businessId: string, memberId: string) =>
    call<TeamMember>(() => upsert(platformDb.team, { ...findOrThrow(platformDb.team, memberId, "Member"), invitedAt: new Date().toISOString() }), EP.teamResend(businessId, memberId), { method: "POST" }),

  // Dashboard & reports --------------------------------------------------------
  getDashboard: () =>
    call<AgencyDashboard>(() => {
      const clients = platformDb.businesses.filter((b) => !b.isAgencyOwner && b.status !== "archived");
      const summaries = clients.map(summarize);
      const sum = (k: keyof BusinessSummary) => summaries.reduce((n, s) => n + (s[k] as number), 0);
      return {
        totals: {
          clients: clients.length,
          activeClients: clients.filter((b) => b.status === "active").length,
          applications: platformDb.applications.filter((a) => ["NEW", "UNDER_REVIEW", "MORE_INFORMATION_NEEDED", "APPROVED"].includes(a.status)).length,
          activeCampaigns: sum("activeCampaigns"),
          contacts: sum("contacts"),
          emailsSent: sum("emailsSent"),
          leads: sum("leads"),
          conversions: sum("conversions"),
          revenue: sum("revenue"),
        },
        summaries,
      };
    }, EP.agencyDashboard),

  getReport: (filters: AgencyReportFilters) =>
    call<BusinessSummary[]>(() =>
      platformDb.businesses
        .filter((b) => !b.isAgencyOwner && b.status !== "archived")
        .filter((b) => !filters.businessId || filters.businessId === "all" || b.id === filters.businessId)
        .filter((b) => !filters.businessType || filters.businessType === "all" || b.type === filters.businessType)
        .map((b) => {
          const s = summarize(b);
          // Demo: shorter ranges show a proportional slice of activity.
          const f = Math.min(1, filters.days / 90);
          return { ...s, emailsSent: Math.round(s.emailsSent * f), revenue: Math.round(s.revenue * f), leads: Math.round(s.leads * f), conversions: Math.round(s.conversions * f) };
        }),
    EP.agencyReports, { query: { ...filters } }),

  getActivity: () => call<AgencyActivity[]>(() => platformDb.activity.slice(0, 12), EP.agencyActivity),

  getSettings: () => call<AgencySettings>(() => platformDb.agencySettings, EP.agencySettings),

  saveSettings: (patch: Partial<AgencySettings>) =>
    call<AgencySettings>(() => {
      platformDb.agencySettings = { ...platformDb.agencySettings, ...patch };
      return platformDb.agencySettings;
    }, EP.agencySettings, { method: "PATCH", body: patch }),

  // Tasks ---------------------------------------------------------------------
  getTasks: () => call<AgencyTask[]>(() => platformDb.tasks, EP.tasks),

  saveTask: (task: Omit<AgencyTask, "id" | "createdAt"> & { id?: string }) =>
    call<AgencyTask>(() => {
      const existing = task.id ? platformDb.tasks.find((t) => t.id === task.id) : undefined;
      return upsert(platformDb.tasks, { ...task, id: existing?.id ?? uid("task"), createdAt: existing?.createdAt ?? new Date().toISOString() });
    }, task.id ? EP.task(task.id) : EP.tasks, { method: task.id ? "PUT" : "POST", body: task }),

  deleteTask: (id: string) => call<void>(() => removeById(platformDb.tasks, id), EP.task(id), { method: "DELETE" }),

  // Approvals -----------------------------------------------------------------
  getApprovals: () => call<Approval[]>(() => platformDb.approvals, EP.approvals),

  setApprovalStatus: (id: string, status: ApprovalStatus, comment?: Omit<ApprovalComment, "id" | "at">) =>
    call<Approval>(() => {
      const a = findOrThrow(platformDb.approvals, id, "Approval");
      const comments = comment?.body ? [...a.comments, { ...comment, id: uid("c"), at: new Date().toISOString() }] : a.comments;
      const next = upsert(platformDb.approvals, { ...a, status, comments });
      if (status === "pending_approval") {
        pushNotification({ type: "APPROVAL_REQUESTED", businessId: a.businessId, title: "Approval requested", body: `“${a.campaignName}” is waiting for approval.`, link: "/marketing/agency/approvals" });
      }
      return next;
    }, EP.approval(id), { method: "PATCH", body: { status, comment } }),

  addApprovalComment: (id: string, comment: Omit<ApprovalComment, "id" | "at">) =>
    call<Approval>(() => {
      const a = findOrThrow(platformDb.approvals, id, "Approval");
      return upsert(platformDb.approvals, { ...a, comments: [...a.comments, { ...comment, id: uid("c"), at: new Date().toISOString() }] });
    }, EP.approvalComments(id), { method: "POST", body: comment }),
};
