/* ============================================================================
   CHURCH MEMBER PROFILE — API CLIENT
   GET/PATCH /church/organizations/:orgId/members/:memberId/profile (+ sub
   routes). Name, contact, status, role and removal use the existing
   membersApi endpoints.
============================================================================ */

import { churchDelete, churchGet, churchPatch, churchPost, churchUpload } from "../api/organizationApi";

export type SacramentStatus = "not_recorded" | "scheduled" | "completed";

export interface ProfileAccess {
  isSelf: boolean;
  canViewPrivate: boolean;
  canEdit: boolean;
  canEditPersonal: boolean;
  canManageMinistries: boolean;
  canViewAdminNotes: boolean;
  canViewPastoral: boolean;
  canChangeStatus: boolean;
  canRemove: boolean;
  canManageDocuments: boolean;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface BaptismRecord {
  status: SacramentStatus;
  date: string | null;
  location: string;
  officiant: string;
  notes: string;
}

export interface ConfirmationRecord {
  status: SacramentStatus;
  date: string | null;
  details: string;
}

export interface FamilyPerson {
  id: string;
  name: string;
  relationship: string;
  membershipId: string | null;
  birthDate: string | null;
}

export interface FamilyConnections {
  spouse: FamilyPerson | null;
  children: FamilyPerson[];
  household: FamilyPerson[];
}

export interface ProfileMinistry {
  departmentId: string;
  name: string;
  photoUrl: string | null;
  role: string;
  isLeader: boolean;
  leaderNames: string[];
  startDate: string | null;
  responsibilities: string;
  active: boolean;
  endedAt: string | null;
}

export interface AttendanceItem {
  id: string;
  title: string;
  date: string | null;
  status: string;
  type: "ministry_meeting" | "church_service" | "event";
  mode: string | null;
}

export interface ProfileAttendance {
  meetingsAttended: number;
  meetingsRecorded: number;
  attendanceRate: number | null;
  servicesAttended: number;
  eventsAttended: number;
  volunteerActivities: number;
  absences: number;
  items: AttendanceItem[];
}

export interface ProfileEvent {
  id: string;
  title: string;
  startsAt: string | null;
  eventType: string;
  attended: boolean;
}

export interface TimelineItem {
  id: string;
  kind: "milestone" | "record";
  type: string;
  title: string;
  description: string;
  date: string | null;
  source: "membership" | "profile" | "attendance" | "ministry" | "document";
  removable: boolean;
}

export interface MemberDocument {
  id: string;
  category: string;
  title: string;
  fileUrl: string | null;
  mimeType: string | null;
  fileSize: number | null;
  issuedAt: string | null;
  expiresAt: string | null;
  generated: boolean;
  serial: string | null;
  uploadedByName: string;
  createdAt: string;
}

export interface MemberNote {
  id: string;
  category: string;
  visibility: "admin" | "pastoral";
  body: string;
  authorUserId: string;
  authorName: string;
  createdAt: string;
}

export interface MemberAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface MemberProfileView {
  access: ProfileAccess;
  organization: { id: string; name: string; logoUrl: string | null; bannerUrl: string | null; organizationType: string; mainLocation: string };
  member: {
    id: string;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    domain: string | null;
    status: string;
    role: string;
    isOwner: boolean;
    joinedAt: string | null;
    requestedAt: string | null;
    location: string;
    email: string | null;
    phone: string | null;
    address: MemberAddress | null;
    dateOfBirth: string | null;
    approvalHistory: { at: string | null; status: string | null; role: string | null; note: string | null }[];
    joinRequest: { message: string; source: string; submittedAt: string | null } | null;
  };
  details: {
    preferredName: string;
    gender: string;
    languages: string[];
    emergencyContact: EmergencyContact | null;
    membershipNumber: string;
    membershipType: string;
    churchRole: string;
    baptism: BaptismRecord | null;
    confirmation: ConfirmationRecord | null;
    faithJourney: string | null;
    family: FamilyConnections | null;
  };
  stats: { joinedAt: string | null; baptismLabel: string; baptismDate: string | null; milestones: number; historyRecords: number };
  ministries: ProfileMinistry[];
  attendance: ProfileAttendance | null;
  events: { upcoming: ProfileEvent[]; previous: ProfileEvent[]; volunteer: number; programs: number } | null;
  timeline: TimelineItem[];
  documents: MemberDocument[] | null;
  notes: MemberNote[] | null;
  account: { linked: boolean; status: string; username: string | null } | null;
}

export interface ProfileUpdate {
  preferredName?: string;
  gender?: string;
  languages?: string[];
  emergencyContact?: EmergencyContact | null;
  membershipNumber?: string;
  membershipType?: string;
  churchRole?: string;
  baptism?: BaptismRecord;
  confirmation?: ConfirmationRecord;
  faithJourney?: string;
  family?: { spouse: FamilyPerson | null; children: FamilyPerson[]; household: FamilyPerson[] };
}

const base = (orgId: string, memberId: string) =>
  `/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(memberId)}/profile`;

export const memberProfileApi = {
  get: (orgId: string, memberId: string, signal?: AbortSignal) => churchGet<MemberProfileView>(base(orgId, memberId), undefined, signal),

  update: (orgId: string, memberId: string, body: ProfileUpdate) => churchPatch<MemberProfileView>(base(orgId, memberId), body),

  assignMinistry: (
    orgId: string,
    memberId: string,
    body: { departmentId: string; role?: string; leaderMembershipId?: string | null; startDate?: string | null; responsibilities?: string },
  ) => churchPost<MemberProfileView>(`${base(orgId, memberId)}/ministries`, body),

  removeMinistry: (orgId: string, memberId: string, departmentId: string) =>
    churchDelete<MemberProfileView>(`${base(orgId, memberId)}/ministries/${encodeURIComponent(departmentId)}`),

  addHistory: (orgId: string, memberId: string, body: { kind: "milestone" | "record"; type: string; title: string; description?: string; date: string }) =>
    churchPost<MemberProfileView>(`${base(orgId, memberId)}/history`, body),

  removeHistory: (orgId: string, memberId: string, entryId: string) =>
    churchDelete<MemberProfileView>(`${base(orgId, memberId)}/history/${encodeURIComponent(entryId)}`),

  addNote: (orgId: string, memberId: string, body: { category: string; visibility: "admin" | "pastoral"; body: string }) =>
    churchPost<MemberProfileView>(`${base(orgId, memberId)}/notes`, body),

  removeNote: (orgId: string, memberId: string, noteId: string) =>
    churchDelete<MemberProfileView>(`${base(orgId, memberId)}/notes/${encodeURIComponent(noteId)}`),

  uploadDocument: (orgId: string, memberId: string, file: File, fields: { category: string; title: string; issuedAt?: string; expiresAt?: string }) => {
    const form = new FormData();
    form.append("category", fields.category);
    form.append("title", fields.title);
    if (fields.issuedAt) form.append("issuedAt", fields.issuedAt);
    if (fields.expiresAt) form.append("expiresAt", fields.expiresAt);
    form.append("file", file, file.name);
    return churchUpload<MemberProfileView>(`${base(orgId, memberId)}/documents`, form);
  },

  removeDocument: (orgId: string, memberId: string, documentId: string) =>
    churchDelete<MemberProfileView>(`${base(orgId, memberId)}/documents/${encodeURIComponent(documentId)}`),

  issueCertificate: (orgId: string, memberId: string, kind: "membership" | "baptism" | "confirmation", reissue = false) =>
    churchPost<MemberProfileView>(`${base(orgId, memberId)}/certificates`, { kind, reissue }),
};

/* ---------------------------------------------------------------- labels */

export const ROLE_LABEL: Record<string, string> = {
  administrator: "Administrator",
  pastor_director: "Pastor / Director",
  leader: "Leader",
  department_manager: "Ministry Manager",
  group_leader: "Group Leader",
  member: "Member",
  guest: "Guest",
};

export const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending",
  inactive: "Inactive",
  archived: "Archived",
};

export const DOC_CATEGORIES: { value: string; label: string }[] = [
  { value: "membership_certificate", label: "Membership Certificate" },
  { value: "baptism_certificate", label: "Baptism Certificate" },
  { value: "confirmation_certificate", label: "Confirmation Certificate" },
  { value: "identification", label: "Identification" },
  { value: "letter", label: "Letter / Transfer" },
  { value: "other", label: "Other Church Document" },
];

export const HISTORY_TYPES: { value: string; label: string }[] = [
  { value: "volunteer", label: "Volunteer participation" },
  { value: "marriage", label: "Marriage" },
  { value: "child_dedication", label: "Child dedication" },
  { value: "ordination", label: "Ordination" },
  { value: "training", label: "Training completed" },
  { value: "appointment", label: "Appointment" },
  { value: "transfer", label: "Membership transfer" },
  { value: "custom", label: "Other" },
];

export const NOTE_CATEGORIES = ["General", "Follow-up", "Pastoral care", "Prayer", "Counseling", "Administrative"];

export function addressLines(a: MemberAddress | null | undefined): string[] {
  if (!a) return [];
  const cityLine = [a.city, a.state].filter(Boolean).join(", ");
  return [a.line1, a.line2, [cityLine, a.postalCode].filter(Boolean).join(" "), a.country].filter((x): x is string => Boolean(x && x.trim()));
}

export function fmtDate(value?: string | null, long = true): string {
  if (!value) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", long ? { month: "long", day: "numeric", year: "numeric" } : { month: "short", day: "numeric", year: "numeric" }).format(d);
}
