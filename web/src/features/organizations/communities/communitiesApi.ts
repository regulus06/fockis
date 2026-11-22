/**
 * communitiesApi.ts
 * -----------------------------------------------------------------------------
 * Groups & Communities. Mirrors apps/api/src/org/communities/communities.controller.ts
 * (…/organizations/:id/communities/*).
 * -----------------------------------------------------------------------------
 */

import { churchDelete, churchGet, churchPatch, churchPost, churchPut, churchRequest, churchUpload, getAuthToken } from "../api/organizationApi";

const base = (o: string) => `/organizations/${encodeURIComponent(o)}/communities`;
const grp = (o: string, g: string) => `${base(o)}/groups/${encodeURIComponent(g)}`;
const e = encodeURIComponent;

/* ============================================================================
 * Vocabularies
 * ========================================================================== */

export const GROUP_CATEGORIES = [
  ["fellowship", "Fellowship Groups"],
  ["bible_study", "Bible Study & Discipleship"],
  ["prayer", "Prayer Groups"],
  ["age", "Age Groups"],
  ["family", "Family & Marriage Groups"],
  ["outreach", "Outreach & Service"],
  ["custom", "Custom Groups"],
] as const;
export const categoryLabel = (c: string) => GROUP_CATEGORIES.find(([k]) => k === c)?.[1] ?? "Custom Groups";

export const GROUP_TYPES = [
  ["open", "Open Groups"],
  ["private", "Private Groups"],
  ["invitation", "Invitation Only"],
  ["ministry", "Ministry-Linked Groups"],
] as const;

export const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  pending_approval: "Pending Approval",
  draft: "Draft",
  archived: "Archived",
  deleted: "Deleted",
};

export const GROUP_ROLE_LABELS: Record<string, string> = {
  leader: "Group Leader",
  assistant_leader: "Assistant Leader",
  coordinator: "Coordinator",
  secretary: "Secretary",
  treasurer: "Treasurer",
  member: "Member",
};

export const SERVICE_LABELS: [keyof GroupSettings["services"], string, string][] = [
  ["discussions", "Group Discussions", "Members can start conversations."],
  ["bibleStudy", "Bible Study", "Lessons, passages and questions."],
  ["prayer", "Prayer Requests", "Private, privacy-controlled requests."],
  ["meetings", "Meetings", "In-person and Fockis online meetings."],
  ["attendance", "Attendance", "Present, absent, late, excused."],
  ["finance", "Finance", "Group records under church oversight."],
  ["fundraising", "Fundraising", "Campaigns with goals and progress."],
  ["documents", "Documents", "Shared files and resources."],
  ["activities", "Activities", "Events linked to the group."],
  ["tasks", "Tasks", "Assign work with due dates."],
  ["contributions", "Member Contributions", "Members give online."],
];

export type GroupPolicyLevel = "full" | "create" | "propose" | "none";

/* ============================================================================
 * Types
 * ========================================================================== */

export interface GroupSettings {
  visibility: "public" | "members" | "private" | "invitation";
  requireApproval: boolean;
  approver: "leaders" | "church";
  membersCanInvite: boolean;
  allowExternalInvites: boolean;
  membersCanSeeMembers: boolean;
  assistantsManageMembers: boolean;
  requirements: string;
  minAge: number | null;
  maxAge: number | null;
  services: {
    discussions: boolean;
    bibleStudy: boolean;
    prayer: boolean;
    meetings: boolean;
    attendance: boolean;
    finance: boolean;
    fundraising: boolean;
    documents: boolean;
    activities: boolean;
    tasks: boolean;
    contributions: boolean;
  };
  currency: string;
  annualBudget: number | null;
  meeting: { frequency: "weekly" | "biweekly" | "monthly" | "custom" | ""; day: string; startTime: string; endTime: string; location: string; mode: "in_person" | "online" | "hybrid" };
  notifyLeadersOnRequest: boolean;
  notifyMembersOnAnnouncement: boolean;
}

export interface GroupSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  visibility: GroupSettings["visibility"];
  requireApproval: boolean;
  ministryId: string | null;
  photoUrl: string | null;
  logoUrl: string | null;
  featured: boolean;
  location: string;
  capacity: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  memberCount: number;
  activityScore: number;
  leaders: string[];
  isMember: boolean;
  myRole: string | null;
  isLeading: boolean;
  canManage: boolean;
  hasPendingRequest: boolean;
  pendingRequests: number;
}

export interface Dashboard {
  viewer: {
    isOwner: boolean;
    role: string | null;
    level: GroupPolicyLevel;
    membershipId: string | null;
    canCreate: boolean;
    canPropose: boolean;
    canReview: boolean;
    isFull: boolean;
    canConfigure: boolean;
    canManageAny: boolean;
    leadsGroups: number;
  };
  stats: { totalGroups: number; totalMembers: number; activeGroups: number; featuredGroups: number };
  counts: { all: number; mine: number; featured: number; joined: number; archived: number; requests: number; invitations: number; deleted: number };
  categories: Record<string, number>;
  groups: GroupSummary[];
}

export interface Leader {
  membershipId: string;
  userId: string | null;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  roleLabel: string;
  title: string;
}

export interface GroupProfile extends Omit<GroupSummary, "activityScore" | "leaders" | "isMember" | "myRole" | "isLeading" | "canManage" | "hasPendingRequest" | "pendingRequests"> {
  mission: string;
  objectives: string;
  language: string;
  meetingSchedule: string;
  teamCount: number;
  settings: GroupSettings;
  leaders: Leader[];
  viewer: {
    isMember: boolean;
    isSuspended: boolean;
    groupRole: string | null;
    title: string;
    governs: boolean;
    canManage: boolean;
    canCoordinate: boolean;
    canManageMembers: boolean;
    canApproveRequests: boolean;
    canInvite: boolean;
    canSeeMembers: boolean;
    canViewFinance: boolean;
    canApproveChurchFunds: boolean;
    isFull: boolean;
    hasPendingRequest: boolean;
    pendingInvitationId: string | null;
    membershipId: string | null;
  };
}

export interface GroupInput {
  name?: string;
  category?: string;
  description?: string;
  photoUrl?: string | null;
  logoUrl?: string | null;
  mission?: string;
  objectives?: string;
  location?: string;
  language?: string;
  capacity?: number | null;
  departmentId?: string | null;
  featured?: boolean;
  status?: "active" | "inactive" | "draft";
  settings?: Partial<GroupSettings>;
  leadership?: { membershipId: string; role: string; title?: string }[];
}

export type ProposalStatus = "draft" | "submitted" | "under_review" | "more_info" | "approved" | "rejected" | "converted";
export const PROPOSAL_LABELS: Record<ProposalStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  more_info: "More Information Required",
  approved: "Approved",
  rejected: "Rejected",
  converted: "Converted to Group",
};

export interface Proposal {
  id: string;
  name: string;
  category: string;
  description: string;
  purpose: string;
  proposedLeaderMembershipId: string | null;
  expectedMembers: number | null;
  suggestedActivities: string;
  documentUrls: string[];
  status: ProposalStatus;
  reviewNote: string;
  proposedByName: string;
  isMine: boolean;
  canEdit: boolean;
  canReview: boolean;
  convertedGroupId: string | null;
  submittedAt: string | null;
  createdAt: string | null;
  history: { status: string; note: string; byName: string; at: string | null }[];
}

export interface JoinRequest {
  id: string;
  groupId: string;
  groupName: string;
  applicantName: string;
  message: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  reviewNote: string;
  createdAt: string | null;
  reviewedAt: string | null;
  canReview: boolean;
  isMine: boolean;
}

export interface Invitation {
  id: string;
  groupId: string;
  groupName: string;
  inviterName: string;
  recipientName: string;
  message: string;
  status: "pending" | "accepted" | "declined" | "expired" | "revoked";
  createdAt: string | null;
  expiresAt: string | null;
  canRevoke: boolean;
}

export interface MemberRow {
  membershipId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  roleLabel: string;
  status: string;
  joinedAt: string | null;
  teams: string[];
}

export interface Team {
  id: string;
  name: string;
  description: string;
  responsibilities: string;
  schedule: string;
  status: string;
  leaderMembershipId: string | null;
  leaderName: string;
  assistantMembershipId: string | null;
  assistantName: string;
  members: { membershipId: string; displayName: string }[];
  canEdit: boolean;
}

export interface Post {
  id: string;
  kind: "announcement" | "notice" | "discussion";
  audience: "all" | "team" | "leaders";
  teamId: string | null;
  title: string;
  body: string;
  attachmentUrls: string[];
  pinned: boolean;
  authorName: string;
  createdAt: string | null;
  canDelete: boolean;
  comments: { id: string; authorName: string; body: string; createdAt: string | null; canDelete: boolean }[];
}

export interface Lesson {
  id: string;
  program: string;
  title: string;
  passages: string[];
  body: string;
  questions: string[];
  reading: string;
  scheduledAt: string | null;
  documentUrls: string[];
  allowAnswers: boolean;
  status: "draft" | "published";
  authorName: string;
  createdAt: string | null;
  completedCount?: number;
  mine: { answers: string[]; privateNotes: string; completed: boolean } | null;
}

export interface Prayer {
  id: string;
  title: string;
  body: string;
  category: string;
  attachmentUrl: string;
  privacy: "leaders" | "team" | "members";
  anonymous: boolean;
  authorName: string;
  status: "open" | "praying" | "answered" | "archived";
  isMine: boolean;
  createdAt: string | null;
  responses: { id: string; authorName: string; body: string; createdAt: string | null }[];
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  meetingType: string;
  mode: "in_person" | "online" | "hybrid";
  startsAt: string | null;
  nextAt: string | null;
  endsAt: string | null;
  location: string;
  fockisMeetingId: string | null;
  meetingLink: string;
  recurrence: "none" | "weekly" | "biweekly" | "monthly";
  recurrenceUntil: string | null;
  audience: "all" | "team" | "selected";
  teamId: string | null;
  requiresRegistration: boolean;
  capacity: number | null;
  registered: number;
  isRegistered: boolean;
  registrations?: string[];
  organizerName: string;
  status: "scheduled" | "cancelled" | "completed";
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  eventType: string;
  startsAt: string | null;
  endsAt: string | null;
  location: string;
  isOnline: boolean;
  onlineUrl: string;
  coverImageUrl: string | null;
  capacity: number | null;
  requiresRsvp: boolean;
  going: number;
  myRsvp: string | null;
  status: "upcoming" | "completed";
}

export interface CalendarItem {
  id: string;
  kind: "meeting" | "activity" | "study" | "task";
  title: string;
  startsAt: string;
  location: string;
}

export interface AttendanceSummary {
  canRecord: boolean;
  mine?: { rate: number | null; records: { sessionTitle: string; sessionDate: string; sessionType: string; status: string }[] };
  totalMembers?: number;
  sessionsRecorded?: number;
  attendanceRate?: number | null;
  sessions?: { sessionType: string; sessionId: string; sessionDate: string; title: string; present: number; total: number; rate: number | null }[];
  monthly?: { month: string; rate: number | null; records: number }[];
  members?: { membershipId: string; name: string; sessions: number; present: number; rate: number | null }[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeMembershipId: string | null;
  assigneeName: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "completed" | "cancelled";
  attachmentUrls: string[];
  createdByName: string;
  isMine: boolean;
}

export interface GroupDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  access: "members" | "leaders";
  fileUrl: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  mediaType: string;
  uploadedBy: string;
  createdAt: string | null;
}

export interface FinanceSummary {
  currency: string;
  annualBudget: number | null;
  totalContributions: number;
  fundsFromChurch: number;
  totalExpenses: number;
  availableBalance: number;
  totalContributors: number;
  pendingRequests: number;
  fundraising: { campaigns: number; goal: number; collected: number; progress: number | null };
}

export interface Transaction {
  id: string;
  kind: "contribution" | "donation" | "offering" | "expense" | "fund_request";
  amount: number;
  currency: string;
  purpose: string;
  category: string;
  description: string;
  date: string;
  receiptUrl: string;
  receiptNumber: string;
  campaignId: string | null;
  campaignTitle: string;
  personName: string;
  source: "stripe" | "manual";
  status: string;
  paidAt: string | null;
  createdAt: string | null;
  isMine: boolean;
  steps: { action: string; note: string; byName: string; at: string | null }[];
  groupId?: string;
  groupName?: string;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  coverUrl: string | null;
  goalAmount: number;
  currency: string;
  deadline: string;
  status: "draft" | "active" | "closed";
  collected: number;
  progress: number;
  donors: number;
  supporters: string[];
  createdAt: string | null;
}

export interface GroupReport {
  group: { id: string; name: string; category: string; status: string };
  generatedAt: string;
  members: number;
  newMembers90Days: number;
  growth: { label: string; joined: number }[];
  meetings90Days: number;
  activities90Days: number;
  attendanceRate: number | null;
  engagedMembers: number;
  engagementRate: number | null;
  finance: FinanceSummary | null;
}

export interface ChurchReport {
  generatedAt: string;
  totals: { groups: number; activeGroups: number; members: number; newMembers90Days: number; meetings90Days: number; activities90Days: number };
  items: {
    id: string;
    name: string;
    category: string;
    status: string;
    members: number;
    newMembers90Days: number;
    meetings90Days: number;
    activities90Days: number;
    attendanceRate: number | null;
    engagementRate: number | null;
    currency: string;
    contributions: number | null;
    expenses: number | null;
    balance: number | null;
    fundraisingCollected: number | null;
    pendingFinanceRequests: number | null;
  }[];
}

export interface PolicyView {
  roles: Record<string, GroupPolicyLevel>;
  allowProposals: boolean;
  defaults: GroupSettings;
  updatedAt: string | null;
  canConfigure?: boolean;
}

export interface ContributionStart {
  transactionId: string;
  clientSecret: string;
  paymentIntentId: string | null;
  amount: number;
  currency: string;
}

/* ============================================================================
 * Calls
 * ========================================================================== */

type Sig = AbortSignal | undefined;

export const communitiesApi = {
  dashboard: (o: string, s?: Sig) => churchGet<Dashboard>(`${base(o)}/dashboard`, undefined, s),
  policy: (o: string, s?: Sig) => churchGet<PolicyView>(`${base(o)}/policy`, undefined, s),
  savePolicy: (o: string, input: { roles?: Record<string, GroupPolicyLevel>; allowProposals?: boolean; defaults?: Partial<GroupSettings> }) => churchPut<PolicyView>(`${base(o)}/policy`, input),
  churchReport: (o: string, s?: Sig) => churchGet<ChurchReport>(`${base(o)}/reports`, undefined, s),
  churchFinance: (o: string, s?: Sig) =>
    churchGet<{ canApprove: boolean; groups: (FinanceSummary & { groupId: string; groupName: string })[]; fundRequests: Transaction[] }>(`${base(o)}/finance`, undefined, s),
  myContributions: (o: string, s?: Sig) =>
    churchGet<{ items: { id: string; groupId: string; groupName: string; amount: number; currency: string; purpose: string; status: string; receiptNumber: string; date: string; paidAt: string | null }[] }>(
      `${base(o)}/my-contributions`,
      undefined,
      s,
    ),
  deleted: (o: string, s?: Sig) => churchGet<{ items: (GroupSummary & { deletedAt: string | null })[] }>(`${base(o)}/deleted`, undefined, s),
  uploadOrgFile: (o: string, file: File) => {
    const f = new FormData();
    f.append("file", file);
    return churchUpload<{ fileUrl: string; fileName: string }>(`${base(o)}/files`, f);
  },

  proposals: (o: string, q: { status?: string; scope?: string } = {}, s?: Sig) => churchGet<{ items: Proposal[] }>(`${base(o)}/proposals`, { status: q.status || undefined, scope: q.scope }, s),
  propose: (o: string, input: Record<string, unknown>) => churchPost<Proposal>(`${base(o)}/proposals`, input),
  updateProposal: (o: string, id: string, input: Record<string, unknown>) => churchPatch<Proposal>(`${base(o)}/proposals/${e(id)}`, input),
  reviewProposal: (o: string, id: string, status: string, note: string) => churchPost<Proposal>(`${base(o)}/proposals/${e(id)}/review`, { status, note }),
  convertProposal: (o: string, id: string, publish: boolean, leaderMembershipId?: string) =>
    churchPost<{ proposal: Proposal; group: GroupProfile }>(`${base(o)}/proposals/${e(id)}/convert`, { publish, leaderMembershipId }),
  withdrawProposal: (o: string, id: string) => churchDelete(`${base(o)}/proposals/${e(id)}`),

  requests: (o: string, q: { groupId?: string; status?: string; scope?: string } = {}, s?: Sig) =>
    churchGet<{ items: JoinRequest[]; canReview: boolean }>(`${base(o)}/requests`, { groupId: q.groupId, status: q.status || undefined, scope: q.scope }, s),
  reviewRequest: (o: string, id: string, decision: "approve" | "reject", note = "") => churchPost(`${base(o)}/requests/${e(id)}/review`, { decision, note }),
  withdrawRequest: (o: string, id: string) => churchPost(`${base(o)}/requests/${e(id)}/withdraw`, {}),

  invitations: (o: string, q: { groupId?: string } = {}, s?: Sig) => churchGet<{ received: Invitation[]; sent: Invitation[] }>(`${base(o)}/invitations`, { groupId: q.groupId }, s),
  respondInvitation: (o: string, id: string, accept: boolean) => churchPost<{ groupId: string; status: string }>(`${base(o)}/invitations/${e(id)}/respond`, { accept }),
  revokeInvitation: (o: string, id: string) => churchPost(`${base(o)}/invitations/${e(id)}/revoke`, {}),
  invitationLink: (o: string, token: string, s?: Sig) =>
    churchRequest<{ group: { id: string; name: string; description: string; photoUrl: string | null; category: string }; inviterName: string; message: string; status: string; expiresAt: string | null }>(
      `${base(o)}/invitation-links/${e(token)}`,
      { signal: s, anonymous: !getAuthToken() },
    ),
  respondLink: (o: string, token: string, accept: boolean) => churchPost<{ groupId: string; status: string }>(`${base(o)}/invitation-links/${e(token)}`, { accept }),

  create: (o: string, input: GroupInput) => churchPost<GroupProfile>(`${base(o)}/groups`, input),
  profile: (o: string, g: string, s?: Sig) => churchGet<GroupProfile>(grp(o, g), undefined, s),
  update: (o: string, g: string, input: GroupInput) => churchPatch<GroupProfile>(grp(o, g), input),
  archive: (o: string, g: string, restore = false) => churchPost(`${grp(o, g)}/archive`, { restore }),
  softDelete: (o: string, g: string, undo = false) => churchPost(`${grp(o, g)}/delete`, { undo }),
  join: (o: string, g: string, message = "") => churchPost<{ joined: boolean; requested: boolean }>(`${grp(o, g)}/join`, { message }),
  leave: (o: string, g: string) => churchPost(`${grp(o, g)}/leave`, {}),
  invite: (o: string, g: string, input: { membershipIds?: string[]; emails?: string[]; message?: string; expiresInDays?: number }) =>
    churchPost<{ results: { recipient: string; status: string }[] }>(`${grp(o, g)}/invitations`, input),
  members: (o: string, g: string, q: { search?: string; status?: string } = {}, s?: Sig) => churchGet<{ canManage: boolean; items: MemberRow[] }>(`${grp(o, g)}/members`, { search: q.search || undefined, status: q.status || undefined }, s),
  candidates: (o: string, g: string, search: string, s?: Sig) =>
    churchGet<{ items: { membershipId: string; displayName: string; avatarUrl: string | null; churchRole: string }[] }>(`${grp(o, g)}/candidates`, { search }, s),
  addMember: (o: string, g: string, membershipId: string) => churchPost(`${grp(o, g)}/members`, { membershipId }),
  updateMember: (o: string, g: string, mid: string, input: { role?: string; title?: string; status?: string }) => churchPatch(`${grp(o, g)}/members/${e(mid)}`, input),
  removeMember: (o: string, g: string, mid: string) => churchDelete(`${grp(o, g)}/members/${e(mid)}`),
  memberHistory: (o: string, g: string, mid: string, s?: Sig) => churchGet<{ history: { action: string; detail: string; byName: string; at: string | null }[] }>(`${grp(o, g)}/members/${e(mid)}/history`, undefined, s),
  message: (o: string, g: string, input: { audience: string; teamId?: string; membershipIds?: string[]; text: string }) => churchPost<{ sent: number; total: number }>(`${grp(o, g)}/message`, input),
  teams: (o: string, g: string, s?: Sig) => churchGet<{ canManage: boolean; items: Team[] }>(`${grp(o, g)}/teams`, undefined, s),
  saveTeam: (o: string, g: string, id: string | null, input: Record<string, unknown>) => (id ? churchPatch(`${grp(o, g)}/teams/${e(id)}`, input) : churchPost(`${grp(o, g)}/teams`, input)),
  deleteTeam: (o: string, g: string, id: string) => churchDelete(`${grp(o, g)}/teams/${e(id)}`),
  audit: (o: string, g: string, s?: Sig) => churchGet<{ items: { id: string; action: string; detail: string; actorName: string; createdAt: string | null }[] }>(`${grp(o, g)}/audit`, undefined, s),

  posts: (o: string, g: string, kind: "announcement" | "discussion", s?: Sig) => churchGet<{ canPost: boolean; items: Post[] }>(`${grp(o, g)}/posts`, { kind }, s),
  createPost: (o: string, g: string, input: Record<string, unknown>) => churchPost(`${grp(o, g)}/posts`, input),
  comment: (o: string, g: string, postId: string, body: string) => churchPost(`${grp(o, g)}/posts/${e(postId)}/comments`, { body }),
  deletePost: (o: string, g: string, postId: string, commentId?: string) => churchDelete(`${grp(o, g)}/posts/${e(postId)}${commentId ? `/comments/${e(commentId)}` : ""}`),

  lessons: (o: string, g: string, s?: Sig) => churchGet<{ canManage: boolean; programs: string[]; items: Lesson[] }>(`${grp(o, g)}/lessons`, undefined, s),
  saveLesson: (o: string, g: string, id: string | null, input: Record<string, unknown>) => (id ? churchPatch(`${grp(o, g)}/lessons/${e(id)}`, input) : churchPost(`${grp(o, g)}/lessons`, input)),
  deleteLesson: (o: string, g: string, id: string) => churchDelete(`${grp(o, g)}/lessons/${e(id)}`),
  saveNote: (o: string, g: string, id: string, input: { answers?: string[]; privateNotes?: string; completed?: boolean }) => churchPut(`${grp(o, g)}/lessons/${e(id)}/note`, input),
  answers: (o: string, g: string, id: string, s?: Sig) => churchGet<{ items: { memberName: string; answers: string[]; completed: boolean; updatedAt: string | null }[] }>(`${grp(o, g)}/lessons/${e(id)}/answers`, undefined, s),

  prayers: (o: string, g: string, status?: string, s?: Sig) => churchGet<{ canManage: boolean; items: Prayer[] }>(`${grp(o, g)}/prayers`, { status }, s),
  createPrayer: (o: string, g: string, input: Record<string, unknown>) => churchPost(`${grp(o, g)}/prayers`, input),
  updatePrayer: (o: string, g: string, id: string, input: { status?: string; response?: string }) => churchPatch(`${grp(o, g)}/prayers/${e(id)}`, input),

  meetings: (o: string, g: string, when: "upcoming" | "past", s?: Sig) => churchGet<{ canManage: boolean; items: Meeting[] }>(`${grp(o, g)}/meetings`, { when }, s),
  saveMeeting: (o: string, g: string, id: string | null, input: Record<string, unknown>) => (id ? churchPatch(`${grp(o, g)}/meetings/${e(id)}`, input) : churchPost<{ id: string }>(`${grp(o, g)}/meetings`, input)),
  deleteMeeting: (o: string, g: string, id: string) => churchDelete(`${grp(o, g)}/meetings/${e(id)}`),
  registerMeeting: (o: string, g: string, id: string, register: boolean) => churchPost(`${grp(o, g)}/meetings/${e(id)}/register`, { register }),

  activities: (o: string, g: string, when: "upcoming" | "past", s?: Sig) => churchGet<{ canManage: boolean; items: Activity[] }>(`${grp(o, g)}/activities`, { when }, s),
  saveActivity: (o: string, g: string, id: string | null, input: Record<string, unknown>) => (id ? churchPatch(`${grp(o, g)}/activities/${e(id)}`, input) : churchPost(`${grp(o, g)}/activities`, input)),
  deleteActivity: (o: string, g: string, id: string) => churchDelete(`${grp(o, g)}/activities/${e(id)}`),
  rsvp: (o: string, g: string, id: string, status: "going" | "maybe" | "not_going") => churchPost(`${grp(o, g)}/activities/${e(id)}/rsvp`, { status }),
  calendar: (o: string, g: string, from: string, to: string, s?: Sig) => churchGet<{ from: string; to: string; items: CalendarItem[] }>(`${grp(o, g)}/calendar`, { from, to }, s),

  attendance: (o: string, g: string, s?: Sig) => churchGet<AttendanceSummary>(`${grp(o, g)}/attendance`, undefined, s),
  attendanceSheet: (o: string, g: string, q: { sessionType: string; sessionId?: string; sessionDate: string }, s?: Sig) =>
    churchGet<{ sessionType: string; sessionId: string; sessionDate: string; rows: { membershipId: string; name: string; status: string | null }[] }>(`${grp(o, g)}/attendance/sheet`, q, s),
  recordAttendance: (o: string, g: string, input: { sessionType: string; sessionId?: string; sessionDate: string; sessionTitle?: string; entries: { membershipId: string; status: string }[] }) =>
    churchPost<{ saved: number }>(`${grp(o, g)}/attendance`, input),

  tasks: (o: string, g: string, mine = false, s?: Sig) => churchGet<{ canManage: boolean; items: Task[] }>(`${grp(o, g)}/tasks`, { mine: mine ? "1" : undefined }, s),
  saveTask: (o: string, g: string, id: string | null, input: Record<string, unknown>) => (id ? churchPatch(`${grp(o, g)}/tasks/${e(id)}`, input) : churchPost(`${grp(o, g)}/tasks`, input)),
  deleteTask: (o: string, g: string, id: string) => churchDelete(`${grp(o, g)}/tasks/${e(id)}`),

  documents: (o: string, g: string, s?: Sig) => churchGet<{ canUpload: boolean; items: GroupDocument[] }>(`${grp(o, g)}/documents`, undefined, s),
  uploadDocument: (o: string, g: string, file: File, title: string, category: string, access: string) => {
    const f = new FormData();
    f.append("title", title);
    f.append("category", category);
    f.append("access", access);
    f.append("file", file);
    return churchUpload<{ id: string; fileUrl: string }>(`${grp(o, g)}/documents`, f);
  },
  deleteDocument: (o: string, g: string, id: string) => churchDelete(`${grp(o, g)}/documents/${e(id)}`),
  uploadFile: (o: string, g: string, file: File) => {
    const f = new FormData();
    f.append("file", file);
    return churchUpload<{ fileUrl: string; fileName: string }>(`${grp(o, g)}/files`, f);
  },

  finance: (o: string, g: string, s?: Sig) => churchGet<FinanceSummary>(`${grp(o, g)}/finance`, undefined, s),
  transactions: (o: string, g: string, q: { kind?: string; status?: string; page?: number } = {}, s?: Sig) =>
    churchGet<{ page: number; total: number; canManage: boolean; canApproveChurchFunds: boolean; items: Transaction[] }>(`${grp(o, g)}/finance/transactions`, { kind: q.kind || undefined, status: q.status || undefined, page: q.page }, s),
  createRecord: (o: string, g: string, input: Record<string, unknown>) => churchPost<{ id: string }>(`${grp(o, g)}/finance/records`, input),
  decide: (o: string, g: string, txId: string, action: string, note = "") => churchPost<{ status: string }>(`${grp(o, g)}/finance/records/${e(txId)}/decide`, { action, note }),
  startContribution: (o: string, g: string, input: { amount: number; campaignId?: string; purpose?: string; kind?: string; showName?: boolean }) =>
    churchPost<ContributionStart>(`${grp(o, g)}/contributions`, input),
  confirmContribution: (o: string, g: string, txId: string, paymentIntentId: string) =>
    churchPost<{ status: string; receiptNumber: string; amount: number; currency: string }>(`${grp(o, g)}/contributions/${e(txId)}/confirm`, { paymentIntentId }),
  campaigns: (o: string, g: string, s?: Sig) => churchGet<{ canManage: boolean; canContribute: boolean; items: Campaign[] }>(`${grp(o, g)}/campaigns`, undefined, s),
  saveCampaign: (o: string, g: string, id: string | null, input: Record<string, unknown>) => (id ? churchPatch(`${grp(o, g)}/campaigns/${e(id)}`, input) : churchPost(`${grp(o, g)}/campaigns`, input)),
  report: (o: string, g: string, s?: Sig) => churchGet<GroupReport>(`${grp(o, g)}/report`, undefined, s),
};

/** "open" | "private" | "invitation" | "ministry" group-type filter. */
export function matchesType(g: Pick<GroupSummary, "visibility" | "ministryId" | "requireApproval">, type: string) {
  if (type === "open") return (g.visibility === "public" || g.visibility === "members") && !g.requireApproval;
  if (type === "private") return g.visibility === "private" || ((g.visibility === "public" || g.visibility === "members") && g.requireApproval);
  if (type === "invitation") return g.visibility === "invitation";
  if (type === "ministry") return Boolean(g.ministryId);
  return true;
}
