/**
 * ministriesApi.ts
 * -----------------------------------------------------------------------------
 * Ministries management. Mirrors apps/api/src/org/ministries/ministries.controller.ts
 * (…/ministries/*) and reuses the departments API for creating, editing,
 * archiving and staffing ministries (…/departments/*).
 * -----------------------------------------------------------------------------
 */

import { churchDelete, churchGet, churchPatch, churchPost, churchPut, churchUpload } from "../api/organizationApi";

const org = (id: string) => `/organizations/${encodeURIComponent(id)}`;
const min = (o: string) => `${org(o)}/ministries`;
const one = (o: string, m: string) => `${min(o)}/${encodeURIComponent(m)}`;

/* ============================================================================
 * Vocabularies
 * ========================================================================== */

export const MINISTRY_CATEGORIES = [
  ["worship", "Worship"],
  ["youth", "Youth"],
  ["children", "Children"],
  ["ushers", "Ushers"],
  ["media", "Media"],
  ["outreach", "Outreach"],
  ["prayer", "Prayer"],
  ["womens", "Women's"],
  ["mens", "Men's"],
  ["evangelism", "Evangelism"],
  ["missions", "Missions"],
  ["hospitality", "Hospitality"],
  ["discipleship", "Discipleship"],
  ["music", "Music"],
  ["education", "Education"],
  ["marriage_family", "Marriage & Family"],
  ["pastoral_care", "Pastoral Care"],
  ["benevolence", "Benevolence"],
  ["other", "Other"],
] as const;
export type MinistryCategory = (typeof MINISTRY_CATEGORIES)[number][0];
export const categoryLabel = (c: string) => MINISTRY_CATEGORIES.find(([k]) => k === c)?.[1] ?? "Other";

/** departmentType the existing departments API still requires. */
export function departmentTypeFor(category: string): string {
  const map: Record<string, string> = { mens: "men", womens: "women", youth: "youth", children: "children", music: "music_choir", worship: "music_choir", prayer: "prayer" };
  return map[category] ?? "custom";
}

export const MINISTRY_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  pending_approval: "Pending Approval",
  draft: "Draft",
  archived: "Archived",
};

export type PolicyLevel = "full" | "create" | "manage_assigned" | "restricted" | "propose" | "none";
export const POLICY_LEVEL_LABELS: Record<PolicyLevel, { label: string; text: string }> = {
  full: { label: "Full access", text: "Create, edit, archive & manage all ministries" },
  create: { label: "Allowed", text: "Create and manage ministries" },
  manage_assigned: { label: "Manage only", text: "Manage assigned ministry, teams & members" },
  restricted: { label: "Restricted", text: "Manage team activities and attendance" },
  propose: { label: "Member", text: "Apply to join ministries and submit proposals" },
  none: { label: "No access", text: "View ministries only" },
};

export const POLICY_ROLES: { key: string; label: string }[] = [
  { key: "pastor_director", label: "Senior Pastor" },
  { key: "administrator", label: "Church Administrator" },
  { key: "department_manager", label: "Ministry Coordinator" },
  { key: "leader", label: "Ministry Leader" },
  { key: "group_leader", label: "Assistant Leader" },
  { key: "member", label: "Church Member" },
  { key: "guest", label: "Guest" },
];

export const FINANCE_CATEGORIES = [
  ["supplies", "Supplies"],
  ["event", "Event"],
  ["equipment", "Equipment"],
  ["travel", "Travel"],
  ["outreach", "Outreach"],
  ["food", "Food & Hospitality"],
  ["training", "Training"],
  ["other", "Other"],
] as const;

/* ============================================================================
 * Types
 * ========================================================================== */

export interface MinistrySettings {
  visibility: "public" | "members" | "private";
  joinMode: "open" | "application" | "invite";
  autoApprove: boolean;
  maxMembers: number | null;
  membersCanSeeMembers: boolean;
  allowFinanceRequests: boolean;
  annualBudget: number | null;
  currency: string;
  mission: string;
  vision: string;
  contactEmail: string;
  contactPhone: string;
  iconKey: string;
  color: string;
  notifyLeadersOnApplication: boolean;
}

export interface PolicyView {
  roles: Record<string, PolicyLevel>;
  allowProposals: boolean;
  defaults: MinistrySettings;
  updatedAt: string | null;
  canConfigure?: boolean;
}

export interface MinistrySummary {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  photoUrl: string | null;
  iconKey: string;
  color: string;
  visibility: string;
  joinMode: string;
  memberCount: number;
  leaders: { membershipId: string; displayName: string; avatarUrl: string | null }[];
  upcomingActivities: number;
  recentActivities: number;
  pendingApplications: number;
  isMember: boolean;
  isLeader: boolean;
  canManage: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MinistriesDashboard {
  viewer: {
    isOwner: boolean;
    role: string | null;
    level: PolicyLevel;
    membershipId: string | null;
    canCreate: boolean;
    canPropose: boolean;
    canReview: boolean;
    canConfigure: boolean;
  };
  policy: PolicyView;
  stats: {
    totalMinistries: number;
    activeMinistries: number;
    ministryMembers: number;
    ministryLeaders: number;
    upcomingActivities: number;
    pendingApplications: number;
  };
  counts: { all: number; mine: number; applications: number };
  ministries: MinistrySummary[];
}

export interface ActivityItem {
  id: string;
  title: string;
  eventType: string;
  startsAt: string | null;
  endsAt: string | null;
  location: string;
  isOnline: boolean;
  coverImageUrl: string | null;
  ministryId: string;
  ministryName: string;
  requiresRsvp: boolean;
  capacity: number | null;
  going: number;
}

export type ProposalStatus = "draft" | "submitted" | "under_review" | "more_info" | "approved" | "rejected" | "converted";
export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  more_info: "More Info Needed",
  approved: "Approved",
  rejected: "Rejected",
  converted: "Ministry Created",
};

export interface Proposal {
  id: string;
  name: string;
  category: string;
  description: string;
  purpose: string;
  targetAudience: string;
  meetingPlan: string;
  resourcesNeeded: string;
  proposedLeaderMembershipId: string | null;
  status: ProposalStatus;
  reviewNote: string;
  proposedByName: string;
  isMine: boolean;
  canEdit: boolean;
  canReview: boolean;
  convertedMinistryId: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  history: { status: string; note: string; byName: string; at: string | null }[];
}

export interface ProposalInput {
  name: string;
  category: string;
  description: string;
  purpose?: string;
  targetAudience?: string;
  meetingPlan?: string;
  resourcesNeeded?: string;
  proposedLeaderMembershipId?: string | null;
  submit?: boolean;
}

export interface Application {
  id: string;
  ministryId: string;
  ministryName: string;
  membershipId: string;
  applicantName: string;
  message: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  autoApproved: boolean;
  reviewNote: string;
  reviewedAt: string | null;
  createdAt: string | null;
  canReview?: boolean;
  isMine?: boolean;
}

export interface MinistryAccess {
  ministryId: string;
  status: string;
  category: string;
  settings: MinistrySettings;
  isMember: boolean;
  isLeader: boolean;
  isTeamLeader: boolean;
  canManage: boolean;
  canCoordinate: boolean;
  canGovern: boolean;
  canViewMembers: boolean;
  canViewFinances: boolean;
  canRequestFunds: boolean;
  canApproveFunds: boolean;
  hasPendingApplication: boolean;
  pendingApplicationId: string | null;
}

export interface MinistryMemberRow {
  membershipId: string;
  displayName: string;
  avatarUrl: string | null;
  churchRole: string;
  isLeader: boolean;
  leaderTitle: string;
  teams: string[];
  joinedChurchAt: string | null;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  leaderMembershipId: string | null;
  leaderName: string;
  members: { membershipId: string; displayName: string }[];
  createdAt: string | null;
}

export interface FinanceRequest {
  id: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  neededBy: string;
  description: string;
  status: "pending" | "approved" | "rejected" | "paid" | "cancelled";
  requestedByName: string;
  reviewNote: string;
  reviewedByName: string;
  reviewedAt: string | null;
  createdAt: string | null;
  canReview: boolean;
  canCancel: boolean;
}

export interface FinanceView {
  canRequest: boolean;
  canApprove: boolean;
  summary: { currency: string; annualBudget: number | null; pending: number; approved: number; paid: number; committedThisYear: number; remaining: number | null };
  items: FinanceRequest[];
}

export interface MinistryDocument {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  visibility: string;
  createdAt: string | null;
}

export interface MinistryReport {
  ministry: { id: string; name: string; category: string; status: string };
  generatedAt: string;
  members: number;
  leaders: number;
  teams: number;
  upcomingActivities: number;
  activitiesByMonth: { label: string; activities: number }[];
  averageAttendance: number | null;
  applications: Record<string, { count: number; total: number }>;
  finances: { currency: string; annualBudget: number | null; byStatus: Record<string, { count: number; total: number }> };
}

export interface ChurchReportRow {
  id: string;
  name: string;
  category: string;
  status: string;
  members: number;
  leaders: number;
  teams: number;
  upcomingActivities: number;
  activitiesLast90Days: number;
  averageAttendance: number | null;
  currency: string;
  annualBudget: number | null;
  approvedSpending: number;
}

export interface AuditEntry {
  id: string;
  action: string;
  detail: string;
  actorName: string;
  createdAt: string | null;
}

export interface MinistryDetail {
  id: string;
  name: string;
  description: string;
  departmentType: string;
  photoUrl: string | null;
  leaderIds: string[];
  leaderTitles: Record<string, string>;
  category: string;
  ministryStatus: string;
  status: string;
  ministrySettings: MinistrySettings;
  memberCount: number;
}

export interface MinistryInput {
  name: string;
  category: string;
  description?: string;
  photoUrl?: string;
  leaderIds?: string[];
  leaderTitles?: Record<string, string>;
  meetingSchedule?: { name: string; day?: string; startTime?: string; endTime?: string; location?: string }[];
  ministryStatus?: "active" | "draft" | "inactive";
  ministrySettings?: Partial<MinistrySettings>;
}

/* ============================================================================
 * Calls
 * ========================================================================== */

export const ministriesApi = {
  dashboard: (o: string, signal?: AbortSignal) => churchGet<MinistriesDashboard>(`${min(o)}/dashboard`, undefined, signal),
  activities: (o: string, when: "upcoming" | "past", signal?: AbortSignal) => churchGet<{ items: ActivityItem[] }>(`${min(o)}/activities`, { when }, signal),
  churchReport: (o: string, signal?: AbortSignal) => churchGet<{ generatedAt: string; items: ChurchReportRow[] }>(`${min(o)}/reports`, undefined, signal),

  policy: (o: string, signal?: AbortSignal) => churchGet<PolicyView>(`${min(o)}/policy`, undefined, signal),
  savePolicy: (o: string, input: { roles?: Record<string, PolicyLevel>; allowProposals?: boolean; defaults?: Partial<MinistrySettings> }) =>
    churchPut<PolicyView>(`${min(o)}/policy`, input),

  proposals: (o: string, q: { status?: string; scope?: "mine" | "all" } = {}, signal?: AbortSignal) =>
    churchGet<{ items: Proposal[] }>(`${min(o)}/proposals`, { status: q.status || undefined, scope: q.scope }, signal),
  propose: (o: string, input: ProposalInput) => churchPost<Proposal>(`${min(o)}/proposals`, input),
  updateProposal: (o: string, id: string, input: Partial<ProposalInput> & { note?: string }) => churchPatch<Proposal>(`${min(o)}/proposals/${encodeURIComponent(id)}`, input),
  reviewProposal: (o: string, id: string, status: "under_review" | "more_info" | "approved" | "rejected", note: string) =>
    churchPost<Proposal>(`${min(o)}/proposals/${encodeURIComponent(id)}/review`, { status, note }),
  convertProposal: (o: string, id: string, publish: boolean) =>
    churchPost<{ proposal: Proposal; ministry: { id: string } }>(`${min(o)}/proposals/${encodeURIComponent(id)}/convert`, { publish }),
  withdrawProposal: (o: string, id: string) => churchDelete(`${min(o)}/proposals/${encodeURIComponent(id)}`),

  applications: (o: string, q: { ministryId?: string; status?: string; scope?: "mine" | "managed" } = {}, signal?: AbortSignal) =>
    churchGet<{ items: Application[]; canReview: boolean }>(`${min(o)}/applications`, { ministryId: q.ministryId, status: q.status || undefined, scope: q.scope }, signal),
  reviewApplication: (o: string, id: string, decision: "approve" | "reject", note = "") =>
    churchPost<Application>(`${min(o)}/applications/${encodeURIComponent(id)}/review`, { decision, note }),
  withdrawApplication: (o: string, id: string) => churchPost<Application>(`${min(o)}/applications/${encodeURIComponent(id)}/withdraw`, {}),

  access: (o: string, m: string, signal?: AbortSignal) => churchGet<MinistryAccess>(`${one(o, m)}/access`, undefined, signal),
  apply: (o: string, m: string, message: string) => churchPost<Application>(`${one(o, m)}/apply`, { message }),
  members: (o: string, m: string, signal?: AbortSignal) => churchGet<{ items: MinistryMemberRow[] }>(`${one(o, m)}/members`, undefined, signal),
  candidates: (o: string, m: string, search: string, signal?: AbortSignal) =>
    churchGet<{ items: { membershipId: string; displayName: string; avatarUrl: string | null; churchRole: string }[] }>(`${one(o, m)}/candidates`, { search }, signal),
  addMember: (o: string, m: string, memberId: string) => churchPost(`${org(o)}/departments/${encodeURIComponent(m)}/members`, { memberId }),
  removeMember: (o: string, m: string, memberId: string) => churchDelete(`${org(o)}/departments/${encodeURIComponent(m)}/members/${encodeURIComponent(memberId)}`),

  teams: (o: string, m: string, signal?: AbortSignal) => churchGet<{ canManage: boolean; items: Team[] }>(`${one(o, m)}/teams`, undefined, signal),
  createTeam: (o: string, m: string, input: Partial<{ name: string; description: string; leaderMembershipId: string | null; memberIds: string[] }>) =>
    churchPost<Team>(`${one(o, m)}/teams`, input),
  updateTeam: (o: string, m: string, id: string, input: Partial<{ name: string; description: string; leaderMembershipId: string | null; memberIds: string[] }>) =>
    churchPatch<Team>(`${one(o, m)}/teams/${encodeURIComponent(id)}`, input),
  deleteTeam: (o: string, m: string, id: string) => churchDelete(`${one(o, m)}/teams/${encodeURIComponent(id)}`),

  finances: (o: string, m: string, signal?: AbortSignal) => churchGet<FinanceView>(`${one(o, m)}/finances`, undefined, signal),
  requestFunds: (o: string, m: string, input: { title: string; category: string; amount: number; neededBy?: string; description?: string }) =>
    churchPost<FinanceRequest>(`${one(o, m)}/finances`, input),
  financeStatus: (o: string, m: string, id: string, status: string, note = "") =>
    churchPost<FinanceRequest>(`${one(o, m)}/finances/${encodeURIComponent(id)}/status`, { status, note }),

  documents: (o: string, m: string, signal?: AbortSignal) => churchGet<{ canUpload: boolean; items: MinistryDocument[] }>(`${one(o, m)}/documents`, undefined, signal),
  uploadDocument: (o: string, m: string, file: File, title: string, description = "") => {
    const form = new FormData();
    form.append("title", title);
    form.append("description", description);
    form.append("file", file);
    return churchUpload<{ id: string; title: string; fileUrl: string }>(`${one(o, m)}/documents`, form);
  },
  deleteDocument: (o: string, m: string, id: string) => churchDelete(`${one(o, m)}/documents/${encodeURIComponent(id)}`),

  report: (o: string, m: string, signal?: AbortSignal) => churchGet<MinistryReport>(`${one(o, m)}/report`, undefined, signal),
  audit: (o: string, m: string, signal?: AbortSignal) => churchGet<{ items: AuditEntry[] }>(`${one(o, m)}/audit`, undefined, signal),

  /* Departments API (existing) */
  get: (o: string, m: string, signal?: AbortSignal) => churchGet<MinistryDetail>(`${org(o)}/departments/${encodeURIComponent(m)}`, undefined, signal),
  create: (o: string, input: MinistryInput) =>
    churchPost<MinistryDetail>(`${org(o)}/departments`, { ...input, departmentType: departmentTypeFor(input.category) }),
  update: (o: string, m: string, input: Partial<MinistryInput>) =>
    churchPatch<MinistryDetail>(`${org(o)}/departments/${encodeURIComponent(m)}`, input.category ? { ...input, departmentType: departmentTypeFor(input.category) } : input),
  archive: (o: string, m: string) => churchDelete(`${org(o)}/departments/${encodeURIComponent(m)}`),
  restore: (o: string, m: string) => churchPost<MinistryDetail>(`${org(o)}/departments/${encodeURIComponent(m)}/restore`, {}),
};
