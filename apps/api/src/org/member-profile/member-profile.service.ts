/**
 * member-profile.service.ts
 * -----------------------------------------------------------------------------
 * The church member profile dashboard: one call that gathers everything the
 * profile shows, plus the edits that are not covered by the existing member
 * endpoints.
 *
 * Reads (no duplication — each fact comes from where it already lives):
 *   church_members                 name, contact, status, role, joined, history
 *   organizations / church_branches  header + main location
 *   departments                    ministries (membership.departmentIds,
 *                                  leaderIds, leaderTitles)
 *   ministry_attendance_records    ministry meeting attendance
 *   attendance entries             event / service check-ins
 *   church_events                  RSVPs (upcoming / previous events)
 *   church_member_profiles         the extra profile details (this module)
 *
 * Who sees what:
 *   - the member themself, and anyone with "view members"
 *   - private details (contact, family, documents, spiritual dates):
 *     the member, the owner, and "view private member info"
 *   - administrative notes: people who can update members
 *   - pastoral notes and the faith journey: the owner, administrators and
 *     pastors only — never the member or other staff
 * -----------------------------------------------------------------------------
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";
import { promises as fs } from "fs";
import { randomBytes } from "crypto";

import { MembersService } from "../members/services/members.service";
import { ChurchMediaService, MEDIA_PUBLIC_PREFIX, type UploadedMediaFile } from "../media/services/church-media.service";
import { ChurchPermission } from "../enums/permission.enum";
import { MemberRole } from "../enums/member-role.enum";
import { MembershipStatus } from "../enums/membership-status.enum";
import { Membership } from "../members/schemas/membership.schema";
import { Organization } from "../organizations/schemas/organization.schema";
import { Branch } from "../branches/schemas/branch.schema";
import { Department } from "../departments/schemas/department.schema";
import { AttendanceEntry } from "../attendance/schemas/attendance.schema";
import { ChurchEvent } from "../events/schemas/church-event.schema";
import { MinistryAttendanceRecord, MinistryAttendanceSession } from "../ministry-attendance/ministry-attendance.schemas";
import {
  MemberProfile,
  type BaptismRecord,
  type ConfirmationRecord,
  type EmergencyContact,
  type FamilyConnections,
  type FamilyPerson,
  type HistoryEntry,
  type MemberDocument,
  type MemberNote,
  type MemberProfileDocument,
  type MinistryAssignment,
} from "./member-profile.schema";
import type {
  AddHistoryDto,
  AddNoteDto,
  AssignMinistryDto,
  CertificateDto,
  DocumentFieldsDto,
  FamilyPersonDto,
  UpdateMemberProfileDto,
} from "./member-profile.dto";

export type {
  BaptismRecord,
  ConfirmationRecord,
  EmergencyContact,
  FamilyConnections,
  FamilyPerson,
  HistoryEntry,
  MemberDocument,
  MemberNote,
  MinistryAssignment,
} from "./member-profile.schema";

/* ============================================================================
   RESPONSE TYPES
============================================================================ */

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

export interface ProfileTimelineItem {
  id: string;
  kind: "milestone" | "record";
  type: string;
  title: string;
  description: string;
  date: string | null;
  source: "membership" | "profile" | "attendance" | "ministry" | "document";
  removable: boolean;
}

export interface MemberProfileView {
  access: ProfileAccess;
  organization: {
    id: string;
    name: string;
    logoUrl: string | null;
    bannerUrl: string | null;
    organizationType: string;
    mainLocation: string;
  };
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
    address: Record<string, string> | null;
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
  timeline: ProfileTimelineItem[];
  documents: MemberDocument[] | null;
  notes: MemberNote[] | null;
  account: { linked: boolean; status: string; username: string | null } | null;
}

/* ============================================================================
   HELPERS
============================================================================ */

const PASTORAL_ROLES = new Set<string>([MemberRole.Administrator, MemberRole.PastorDirector]);
const iso = (d: unknown): string | null => {
  if (!d) return null;
  const date = new Date(d as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const newId = (p: string) => `${p}_${randomBytes(6).toString("hex")}`;
const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max) : "";
const today = () => new Date().toISOString().slice(0, 10);
const ATTENDANCE_MILESTONES = [10, 25, 50, 100, 250, 500];
const DOC_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

@Injectable()
export class MemberProfileService {
  constructor(
    @InjectModel(MemberProfile.name) private readonly profileModel: Model<MemberProfileDocument>,
    @InjectModel(Membership.name) private readonly membershipModel: Model<any>,
    @InjectModel(Organization.name) private readonly organizationModel: Model<any>,
    @InjectModel(Branch.name) private readonly branchModel: Model<any>,
    @InjectModel(Department.name) private readonly departmentModel: Model<any>,
    @InjectModel(AttendanceEntry.name) private readonly attendanceModel: Model<any>,
    @InjectModel(ChurchEvent.name) private readonly eventModel: Model<any>,
    @InjectModel(MinistryAttendanceRecord.name) private readonly ministryRecordModel: Model<any>,
    @InjectModel(MinistryAttendanceSession.name) private readonly ministrySessionModel: Model<any>,
    @InjectConnection() private readonly connection: Connection,
    private readonly members: MembersService,
    private readonly media: ChurchMediaService,
  ) {}

  /* ==========================================================================
     ACCESS
  ========================================================================== */

  private oid(id: string, what: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(String(id))) throw new BadRequestException(`Invalid ${what}.`);
    return new Types.ObjectId(String(id));
  }

  private async resolve(organizationId: string, memberId: string, viewerId: string) {
    if (!viewerId) throw new ForbiddenException("Sign in to view member profiles.");
    const membership = await this.members.getMembershipByIdOrNull(organizationId, memberId);
    if (!membership) throw new NotFoundException("Member not found.");
    const isSelf = String(membership.userId) === viewerId;
    if (!isSelf) await this.members.requirePermission(organizationId, viewerId, ChurchPermission.ViewMembers);

    const [viewerIsOwner, targetIsOwner, viewer] = await Promise.all([
      this.members.isOrganizationOwner(organizationId, viewerId),
      this.members.isOrganizationOwner(organizationId, String(membership.userId)),
      this.members.getMembershipOrNull(organizationId, viewerId),
    ]);
    const can = (p: ChurchPermission) => this.members.hasPermission(organizationId, viewerId, p);
    const [privateInfo, update, departments, remove] = await Promise.all([
      can(ChurchPermission.ViewPrivateMemberInfo),
      can(ChurchPermission.UpdateMember),
      can(ChurchPermission.ManageDepartments),
      can(ChurchPermission.RemoveMember),
    ]);
    const viewerActive = viewer?.status === MembershipStatus.Active;
    const protectedOwner = targetIsOwner && !viewerIsOwner;
    const canEdit = update && !protectedOwner;
    const access: ProfileAccess = {
      isSelf,
      canViewPrivate: viewerIsOwner || isSelf || privateInfo,
      canEdit,
      canEditPersonal: canEdit || isSelf,
      canManageMinistries: departments,
      canViewAdminNotes: canEdit,
      canViewPastoral: viewerIsOwner || Boolean(viewerActive && PASTORAL_ROLES.has(String(viewer?.role))),
      canChangeStatus: canEdit && !targetIsOwner,
      canRemove: remove && !targetIsOwner && !isSelf,
      canManageDocuments: canEdit,
    };
    const viewerName = viewer?.profile?.displayName ?? "Administrator";
    return { membership: membership as any, access, targetIsOwner, viewerName };
  }

  private async profileDoc(organizationId: string, membershipId: Types.ObjectId): Promise<MemberProfileDocument> {
    return (await this.profileModel
      .findOneAndUpdate(
        { membershipId },
        { $setOnInsert: { organizationId: this.oid(organizationId, "organization ID"), membershipId } },
        { upsert: true, new: true },
      )
      .exec()) as MemberProfileDocument;
  }

  /* ==========================================================================
     READ
  ========================================================================== */

  async getProfile(organizationId: string, memberId: string, viewerId: string): Promise<MemberProfileView> {
    const { membership, access, targetIsOwner } = await this.resolve(organizationId, memberId, viewerId);
    const orgId = this.oid(organizationId, "organization ID");
    const mid = membership._id as Types.ObjectId;

    const [org, profile, branch, mainBranch] = await Promise.all([
      this.organizationModel.findById(orgId).select("name logoUrl bannerUrl organizationType").lean<any>().exec(),
      this.profileModel.findOne({ membershipId: mid }).lean<any>().exec(),
      membership.branchId ? this.branchModel.findById(membership.branchId).select("name address").lean<any>().exec() : Promise.resolve(null),
      this.branchModel.findOne({ organizationId: orgId, isMainLocation: true }).select("name address").lean<any>().exec(),
    ]);
    if (!org) throw new NotFoundException("Organization not found.");
    const p = profile ?? {};
    const placeOf = (b: any) => (b ? b.address?.city || b.name || "" : "");
    const location = placeOf(branch) || placeOf(mainBranch);

    const ministries = await this.ministries(organizationId, membership, p.ministryAssignments ?? []);
    const attendance = access.canViewPrivate ? await this.attendance(orgId, mid, p.history ?? []) : null;
    const events = access.canViewPrivate ? await this.events(orgId, mid, p.history ?? []) : null;
    const timeline = this.timeline(membership, p, ministries, attendance, access.canViewPrivate);
    const account = access.isSelf || access.canEdit ? await this.account(String(membership.userId)) : null;

    const priv = membership.privateProfile ?? {};
    const baptism: BaptismRecord | null = p.baptism ?? null;
    const confirmation: ConfirmationRecord | null = p.confirmation ?? null;
    const notes: MemberNote[] | null = access.canViewAdminNotes || access.canViewPastoral
      ? ((p.notes ?? []) as MemberNote[])
          .filter((n) => (n.visibility === "pastoral" ? access.canViewPastoral : access.canViewAdminNotes))
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      : null;

    return {
      access,
      organization: {
        id: String(org._id),
        name: org.name ?? "",
        logoUrl: org.logoUrl ?? null,
        bannerUrl: org.bannerUrl ?? null,
        organizationType: String(org.organizationType ?? ""),
        mainLocation: placeOf(mainBranch),
      },
      member: {
        id: String(mid),
        userId: String(membership.userId),
        displayName: membership.profile?.displayName ?? "",
        avatarUrl: membership.profile?.avatarUrl ?? null,
        domain: membership.domain ?? null,
        status: String(membership.status),
        role: String(membership.role),
        isOwner: targetIsOwner,
        joinedAt: membership.status === MembershipStatus.Pending ? null : iso(membership.joinedAt),
        requestedAt: iso(membership.joinRequest?.submittedAt ?? membership.createdAt),
        location,
        email: access.canViewPrivate ? (priv.email ?? null) : null,
        phone: access.canViewPrivate ? (priv.phone ?? membership.joinRequest?.phone ?? null) : null,
        address: access.canViewPrivate ? (priv.address ?? null) : null,
        dateOfBirth: access.canViewPrivate ? (priv.dateOfBirth ?? null) : null,
        approvalHistory: (membership.history ?? []).map((h: any) => ({
          at: iso(h.at),
          status: h.status ?? null,
          role: h.role ?? null,
          note: h.note ?? null,
        })),
        joinRequest: access.canViewPrivate && membership.joinRequest
          ? { message: membership.joinRequest.message ?? "", source: membership.joinRequest.source ?? "button", submittedAt: iso(membership.joinRequest.submittedAt) }
          : null,
      },
      details: {
        preferredName: p.preferredName ?? "",
        gender: p.gender ?? "",
        languages: p.languages ?? [],
        emergencyContact: access.canViewPrivate ? (p.emergencyContact ?? null) : null,
        membershipNumber: p.membershipNumber ?? "",
        membershipType: p.membershipType ?? "",
        churchRole: p.churchRole ?? "",
        baptism: access.canViewPrivate ? baptism : baptism ? { ...baptism, notes: "" } : null,
        confirmation,
        faithJourney: access.canViewPastoral ? (p.faithJourney ?? "") : null,
        family: access.canViewPrivate ? (p.family ?? null) : null,
      },
      stats: {
        joinedAt: membership.status === MembershipStatus.Pending ? null : iso(membership.joinedAt),
        baptismLabel: baptism?.status === "completed" ? "Baptized" : baptism?.status === "scheduled" ? "Scheduled" : "Not recorded",
        baptismDate: baptism?.date ?? null,
        milestones: timeline.filter((t) => t.kind === "milestone").length,
        historyRecords: timeline.filter((t) => t.kind === "record").length,
      },
      ministries,
      attendance,
      events,
      timeline,
      documents: access.canViewPrivate
        ? ((p.documents ?? []) as MemberDocument[]).slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        : null,
      notes,
      account,
    };
  }

  private async ministries(organizationId: string, membership: any, assignments: MinistryAssignment[]): Promise<ProfileMinistry[]> {
    const mid = membership._id as Types.ObjectId;
    const ids = new Set<string>([...(membership.departmentIds ?? []).map(String), ...assignments.map((a) => a.departmentId)]);
    const depts = (await this.departmentModel
      .find({
        organizationId: this.oid(organizationId, "organization ID"),
        $or: [{ _id: { $in: Array.from(ids).filter((x) => Types.ObjectId.isValid(x)).map((x) => new Types.ObjectId(x)) } }, { leaderIds: mid }],
      })
      .select("name photoUrl leaderIds leaderTitles isArchived")
      .lean<any[]>()
      .exec()) as any[];
    const leaderIds = Array.from(new Set(depts.flatMap((d) => (d.leaderIds ?? []).map(String))));
    const leaders = leaderIds.length
      ? await this.membershipModel.find({ _id: { $in: leaderIds.map((x) => new Types.ObjectId(x)) } }).select("profile.displayName").lean<any[]>().exec()
      : [];
    const leaderName = new Map(leaders.map((l: any) => [String(l._id), l.profile?.displayName ?? ""]));
    const current = new Set((membership.departmentIds ?? []).map(String));
    return depts
      .map((d) => {
        const id = String(d._id);
        const a = assignments.filter((x) => x.departmentId === id).sort((x, y) => +new Date(y.assignedAt) - +new Date(x.assignedAt))[0];
        const titles = d.leaderTitles instanceof Map ? Object.fromEntries(d.leaderTitles) : (d.leaderTitles ?? {});
        const isLeader = (d.leaderIds ?? []).some((l: Types.ObjectId) => String(l) === String(mid));
        const active = !d.isArchived && (current.has(id) || isLeader);
        return {
          departmentId: id,
          name: d.name ?? "",
          photoUrl: d.photoUrl ?? null,
          role: (isLeader ? titles[String(mid)] || "Leader" : "") || a?.role || "Member",
          isLeader,
          leaderNames: (d.leaderIds ?? []).map((l: Types.ObjectId) => leaderName.get(String(l)) ?? "").filter(Boolean),
          startDate: a?.startDate ?? null,
          responsibilities: a?.responsibilities ?? "",
          active,
          endedAt: active ? null : iso(a?.endedAt),
        };
      })
      .sort((x, y) => Number(y.active) - Number(x.active) || x.name.localeCompare(y.name));
  }

  private async attendance(orgId: Types.ObjectId, mid: Types.ObjectId, history: HistoryEntry[]): Promise<ProfileAttendance> {
    const [records, checkIns, absences] = await Promise.all([
      this.ministryRecordModel.find({ organizationId: orgId, membershipId: mid }).sort({ scheduledStartAt: -1 }).limit(500).lean<any[]>().exec(),
      this.attendanceModel.find({ organizationId: orgId, memberId: mid, kind: "check_in" }).sort({ occurredAt: -1 }).limit(500).lean<any[]>().exec(),
      this.attendanceModel.countDocuments({ organizationId: orgId, memberId: mid, kind: "absence_report" }).exec(),
    ]);
    const sessionIds = Array.from(new Set(records.map((r) => String(r.sessionId))));
    const eventIds = Array.from(new Set(checkIns.map((c) => String(c.eventId)).filter(Boolean)));
    const [sessions, events, depts] = await Promise.all([
      sessionIds.length ? this.ministrySessionModel.find({ _id: { $in: sessionIds.map((x) => new Types.ObjectId(x)) } }).select("title ministryId").lean<any[]>().exec() : [],
      eventIds.length ? this.eventModel.find({ _id: { $in: eventIds.map((x) => new Types.ObjectId(x)) } }).select("title eventType startsAt").lean<any[]>().exec() : [],
      this.departmentModel.find({ organizationId: orgId }).select("name").lean<any[]>().exec(),
    ]);
    const sessionById = new Map((sessions as any[]).map((s) => [String(s._id), s]));
    const eventById = new Map((events as any[]).map((e) => [String(e._id), e]));
    const deptName = new Map((depts as any[]).map((d) => [String(d._id), d.name]));

    const counted = records.filter((r) => r.status !== "excused");
    const attended = records.filter((r) => r.status === "present" || r.status === "late").length;
    const services = checkIns.filter((c) => eventById.get(String(c.eventId))?.eventType === "church_service").length;

    const items: AttendanceItem[] = [
      ...records.map((r) => {
        const s = sessionById.get(String(r.sessionId));
        const ministry = deptName.get(String(r.ministryId)) ?? "";
        return {
          id: `m_${String(r._id)}`,
          title: s?.title || (ministry ? `${ministry} meeting` : "Ministry meeting"),
          date: iso(r.scheduledStartAt),
          status: String(r.status),
          type: "ministry_meeting" as const,
          mode: r.recordingMethod === "QR_CODE" ? "QR check-in" : r.recordingMethod === "MEMBER_SELF_CHECKIN" ? "Self check-in" : "Recorded by leader",
        };
      }),
      ...checkIns.map((c) => {
        const e = eventById.get(String(c.eventId));
        return {
          id: `e_${String(c._id)}`,
          title: e?.title || "Event",
          date: iso(c.occurredAt),
          status: "present",
          type: e?.eventType === "church_service" ? ("church_service" as const) : ("event" as const),
          mode: c.attendanceType === "online" ? "Online" : "In person",
        };
      }),
    ].sort((a, b) => +new Date(b.date ?? 0) - +new Date(a.date ?? 0));

    return {
      meetingsAttended: attended,
      meetingsRecorded: counted.length,
      attendanceRate: counted.length ? Math.round((attended / counted.length) * 100) : null,
      servicesAttended: services,
      eventsAttended: checkIns.length - services,
      volunteerActivities: history.filter((h) => h.type === "volunteer").length,
      absences: absences + records.filter((r) => r.status === "absent").length,
      items: items.slice(0, 200),
    };
  }

  private async events(orgId: Types.ObjectId, mid: Types.ObjectId, history: HistoryEntry[]) {
    const now = new Date();
    const [rsvped, attendedIds] = await Promise.all([
      this.eventModel
        .find({ organizationId: orgId, rsvps: { $elemMatch: { memberId: mid, status: "going" } } })
        .select("title startsAt eventType")
        .sort({ startsAt: -1 })
        .limit(200)
        .lean<any[]>()
        .exec(),
      this.attendanceModel.distinct("eventId", { organizationId: orgId, memberId: mid, kind: "check_in" }).exec(),
    ]);
    const attendedSet = new Set((attendedIds as unknown[]).map(String));
    const attendedEvents = attendedSet.size
      ? await this.eventModel.find({ _id: { $in: Array.from(attendedSet).map((x) => new Types.ObjectId(x)) } }).select("title startsAt eventType").lean<any[]>().exec()
      : [];
    const all = new Map<string, any>();
    for (const e of [...rsvped, ...attendedEvents]) all.set(String(e._id), e);
    const toView = (e: any): ProfileEvent => ({
      id: String(e._id),
      title: e.title ?? "",
      startsAt: iso(e.startsAt),
      eventType: String(e.eventType ?? ""),
      attended: attendedSet.has(String(e._id)),
    });
    const list = Array.from(all.values());
    return {
      upcoming: list.filter((e) => e.startsAt && new Date(e.startsAt) >= now).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)).map(toView),
      previous: list.filter((e) => !e.startsAt || new Date(e.startsAt) < now).sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt)).map(toView),
      volunteer: history.filter((h) => h.type === "volunteer").length,
      programs: list.filter((e) => ["bible_study", "department_event"].includes(String(e.eventType))).length,
    };
  }

  private timeline(membership: any, p: any, ministries: ProfileMinistry[], attendance: ProfileAttendance | null, canViewPrivate: boolean): ProfileTimelineItem[] {
    const out: ProfileTimelineItem[] = [];
    const requested = membership.joinRequest?.submittedAt ?? membership.createdAt;
    if (requested) {
      out.push({ id: "registration", kind: "record", type: "registration", title: "Member registration", description: membership.joinRequest?.source === "admin" ? "Added by an administrator" : "Requested to join the organization", date: iso(requested), source: "membership", removable: false });
    }
    if (membership.status !== MembershipStatus.Pending && membership.joinedAt) {
      out.push({ id: "activation", kind: "milestone", type: "membership", title: "Membership activated", description: "Became an active member", date: iso(membership.joinedAt), source: "membership", removable: false });
    }
    (membership.history ?? []).forEach((h: any, i: number) => {
      out.push({
        id: `mh_${i}`,
        kind: "record",
        type: h.role ? "role_change" : "status_change",
        title: h.role ? `Role changed to ${String(h.role).replace(/_/g, " ")}` : `Status changed to ${String(h.status ?? "").replace(/_/g, " ")}`,
        description: h.note ?? "",
        date: iso(h.at),
        source: "membership",
        removable: false,
      });
    });
    if (canViewPrivate && p.baptism?.status === "completed") {
      out.push({ id: "baptism", kind: "milestone", type: "baptism", title: "Baptism", description: [p.baptism.location, p.baptism.officiant && `Officiated by ${p.baptism.officiant}`].filter(Boolean).join(" · "), date: p.baptism.date ?? null, source: "profile", removable: false });
    }
    if (p.confirmation?.status === "completed") {
      out.push({ id: "confirmation", kind: "milestone", type: "confirmation", title: "Confirmation", description: p.confirmation.details ?? "", date: p.confirmation.date ?? null, source: "profile", removable: false });
    }
    for (const a of (p.ministryAssignments ?? []) as MinistryAssignment[]) {
      const name = ministries.find((m) => m.departmentId === a.departmentId)?.name ?? "a ministry";
      out.push({ id: `ma_${a.id}`, kind: "record", type: "ministry", title: `Assigned to ${name}`, description: [a.role, a.responsibilities].filter(Boolean).join(" · "), date: a.startDate ?? iso(a.assignedAt), source: "ministry", removable: false });
      if (a.endedAt) out.push({ id: `me_${a.id}`, kind: "record", type: "ministry", title: `Left ${name}`, description: "", date: iso(a.endedAt), source: "ministry", removable: false });
    }
    if (attendance) {
      const present = attendance.items.filter((i) => i.status === "present" || i.status === "late").sort((a, b) => +new Date(a.date ?? 0) - +new Date(b.date ?? 0));
      for (const n of ATTENDANCE_MILESTONES) {
        if (present.length >= n) out.push({ id: `att_${n}`, kind: "milestone", type: "attendance", title: `${n} gatherings attended`, description: "Attendance milestone", date: present[n - 1].date, source: "attendance", removable: false });
      }
    }
    if (canViewPrivate) {
      for (const d of (p.documents ?? []) as MemberDocument[]) {
        if (d.generated) out.push({ id: `doc_${d.id}`, kind: "record", type: "certificate", title: `${d.title} issued`, description: d.serial ?? "", date: d.issuedAt ?? iso(d.createdAt), source: "document", removable: false });
      }
    }
    for (const h of (p.history ?? []) as HistoryEntry[]) {
      out.push({ id: h.id, kind: h.kind, type: h.type, title: h.title, description: h.description, date: h.date, source: "profile", removable: true });
    }
    return out.sort((a, b) => +new Date(b.date ?? 0) - +new Date(a.date ?? 0));
  }

  private async account(userId: string) {
    const userModel = this.connection.models["User"];
    if (!userModel || !Types.ObjectId.isValid(userId)) return { linked: false, status: "unknown", username: null };
    const u = (await userModel.findById(userId).select("username status isActive isBanned isSuspended deletedAt isDeleted").lean().exec()) as any;
    if (!u) return { linked: false, status: "not_found", username: null };
    const status = u.deletedAt || u.isDeleted ? "deleted" : u.isBanned ? "banned" : u.isSuspended ? "suspended" : u.isActive === false ? "inactive" : String(u.status || "active");
    return { linked: true, status, username: u.username ?? null };
  }

  /* ==========================================================================
     WRITE
  ========================================================================== */

  private person(raw: FamilyPersonDto | null | undefined, relationship: string): FamilyPerson | null {
    if (!raw) return null;
    const name = clean(raw.name, 120);
    if (!name) return null;
    return {
      id: raw.id && /^[A-Za-z0-9_-]{1,40}$/.test(raw.id) ? raw.id : newId("f"),
      name,
      relationship: clean(raw.relationship, 60) || relationship,
      membershipId: raw.membershipId && Types.ObjectId.isValid(raw.membershipId) ? raw.membershipId : null,
      birthDate: raw.birthDate || null,
    };
  }

  async update(organizationId: string, memberId: string, viewerId: string, dto: UpdateMemberProfileDto): Promise<MemberProfileView> {
    const { membership, access } = await this.resolve(organizationId, memberId, viewerId);
    const personal = ["preferredName", "gender", "languages", "emergencyContact"] as const;
    const touched = Object.keys(dto).filter((k) => (dto as Record<string, unknown>)[k] !== undefined);
    if (!touched.length) throw new BadRequestException("Nothing to update.");
    for (const key of touched) {
      const isPersonal = (personal as readonly string[]).includes(key);
      if (key === "faithJourney" && !access.canViewPastoral) throw new ForbiddenException("Only pastors and administrators can edit the faith journey.");
      if (isPersonal ? !access.canEditPersonal : !access.canEdit && key !== "faithJourney") {
        throw new ForbiddenException("You don't have permission to change this part of the profile.");
      }
    }

    const set: Record<string, unknown> = {};
    if (dto.preferredName !== undefined) set.preferredName = clean(dto.preferredName, 80);
    if (dto.gender !== undefined) set.gender = clean(dto.gender, 40);
    if (dto.languages !== undefined) set.languages = Array.from(new Set(dto.languages.map((l) => clean(l, 40)).filter(Boolean))).slice(0, 10);
    if (dto.emergencyContact !== undefined) {
      const e = dto.emergencyContact;
      set.emergencyContact = e && clean(e.name, 120) ? { name: clean(e.name, 120), relationship: clean(e.relationship, 60), phone: clean(e.phone, 40) } : null;
    }
    if (dto.membershipNumber !== undefined) set.membershipNumber = clean(dto.membershipNumber, 40);
    if (dto.membershipType !== undefined) set.membershipType = clean(dto.membershipType, 60);
    if (dto.churchRole !== undefined) set.churchRole = clean(dto.churchRole, 60);
    if (dto.baptism !== undefined) {
      const b = dto.baptism;
      if (b.status === "completed" && !b.date) throw new BadRequestException("Enter the baptism date.");
      set.baptism = { status: b.status, date: b.status === "not_recorded" ? null : (b.date ?? null), location: clean(b.location, 160), officiant: clean(b.officiant, 120), notes: clean(b.notes, 1000) };
    }
    if (dto.confirmation !== undefined) {
      const c = dto.confirmation;
      if (c.status === "completed" && !c.date) throw new BadRequestException("Enter the confirmation date.");
      set.confirmation = { status: c.status, date: c.status === "not_recorded" ? null : (c.date ?? null), details: clean(c.details, 1000) };
    }
    if (dto.faithJourney !== undefined) set.faithJourney = clean(dto.faithJourney, 5000);
    if (dto.family !== undefined) {
      const f = dto.family;
      set.family = {
        spouse: this.person(f.spouse ?? null, "Spouse"),
        children: (f.children ?? []).map((c) => this.person(c, "Child")).filter(Boolean),
        household: (f.household ?? []).map((h) => this.person(h, "Household")).filter(Boolean),
      };
    }

    await this.profileDoc(organizationId, membership._id);
    await this.profileModel.updateOne({ membershipId: membership._id }, { $set: set }).exec();
    return this.getProfile(organizationId, memberId, viewerId);
  }

  async assignMinistry(organizationId: string, memberId: string, viewerId: string, dto: AssignMinistryDto): Promise<MemberProfileView> {
    const { membership, access, viewerName } = await this.resolve(organizationId, memberId, viewerId);
    if (!access.canManageMinistries) throw new ForbiddenException("You don't have permission to manage ministries.");
    const dept = await this.departmentModel.findOne({ _id: this.oid(dto.departmentId, "ministry"), organizationId: this.oid(organizationId, "organization ID") }).select("name isArchived").lean<any>().exec();
    if (!dept) throw new NotFoundException("Ministry not found.");
    if (dept.isArchived) throw new BadRequestException("This ministry is archived.");
    if (dto.leaderMembershipId) {
      const leader = await this.members.getMembershipByIdOrNull(organizationId, dto.leaderMembershipId);
      if (!leader) throw new BadRequestException("The selected leader is not a member of this organization.");
    }
    // Existing membership logic (also keeps department member counts right).
    await this.members.adjustDepartmentMembership(organizationId, memberId, dto.departmentId, true, viewerId);

    const assignment: MinistryAssignment = {
      id: newId("ma"),
      departmentId: dto.departmentId,
      role: clean(dto.role, 60) || "Member",
      leaderMembershipId: dto.leaderMembershipId ?? null,
      startDate: dto.startDate || today(),
      responsibilities: clean(dto.responsibilities, 1000),
      assignedAt: new Date(),
      assignedByName: viewerName,
      endedAt: null,
    };
    await this.profileDoc(organizationId, membership._id);
    // One open assignment per ministry: close the previous one first.
    await this.profileModel
      .updateOne({ membershipId: membership._id }, { $set: { "ministryAssignments.$[a].endedAt": new Date() } }, { arrayFilters: [{ "a.departmentId": dto.departmentId, "a.endedAt": null }] })
      .exec();
    await this.profileModel.updateOne({ membershipId: membership._id }, { $push: { ministryAssignments: assignment } }).exec();
    return this.getProfile(organizationId, memberId, viewerId);
  }

  async removeMinistry(organizationId: string, memberId: string, viewerId: string, departmentId: string): Promise<MemberProfileView> {
    const { membership, access } = await this.resolve(organizationId, memberId, viewerId);
    if (!access.canManageMinistries) throw new ForbiddenException("You don't have permission to manage ministries.");
    this.oid(departmentId, "ministry");
    await this.members.adjustDepartmentMembership(organizationId, memberId, departmentId, false, viewerId);
    await this.profileModel
      .updateOne({ membershipId: membership._id }, { $set: { "ministryAssignments.$[a].endedAt": new Date() } }, { arrayFilters: [{ "a.departmentId": departmentId, "a.endedAt": null }] })
      .exec();
    return this.getProfile(organizationId, memberId, viewerId);
  }

  async addHistory(organizationId: string, memberId: string, viewerId: string, dto: AddHistoryDto): Promise<MemberProfileView> {
    const { membership, access, viewerName } = await this.resolve(organizationId, memberId, viewerId);
    if (!access.canEdit) throw new ForbiddenException("You don't have permission to add history records.");
    const title = clean(dto.title, 160);
    if (!title) throw new BadRequestException("Enter a title.");
    const entry: HistoryEntry = {
      id: newId("h"),
      kind: dto.kind,
      type: clean(dto.type, 40).toLowerCase().replace(/[^a-z_]/g, "_") || "custom",
      title,
      description: clean(dto.description, 1000),
      date: dto.date,
      createdAt: new Date(),
      createdByName: viewerName,
    };
    await this.profileDoc(organizationId, membership._id);
    await this.profileModel.updateOne({ membershipId: membership._id }, { $push: { history: entry } }).exec();
    return this.getProfile(organizationId, memberId, viewerId);
  }

  async removeHistory(organizationId: string, memberId: string, viewerId: string, entryId: string): Promise<MemberProfileView> {
    const { membership, access } = await this.resolve(organizationId, memberId, viewerId);
    if (!access.canEdit) throw new ForbiddenException("You don't have permission to remove history records.");
    await this.profileModel.updateOne({ membershipId: membership._id }, { $pull: { history: { id: entryId } } }).exec();
    return this.getProfile(organizationId, memberId, viewerId);
  }

  async addNote(organizationId: string, memberId: string, viewerId: string, dto: AddNoteDto): Promise<MemberProfileView> {
    const { membership, access, viewerName } = await this.resolve(organizationId, memberId, viewerId);
    if (dto.visibility === "pastoral" ? !access.canViewPastoral : !access.canViewAdminNotes) {
      throw new ForbiddenException(dto.visibility === "pastoral" ? "Only pastors and administrators can write pastoral notes." : "You don't have permission to write notes.");
    }
    const body = clean(dto.body, 5000);
    if (!body) throw new BadRequestException("Write the note first.");
    const note: MemberNote = {
      id: newId("n"),
      category: clean(dto.category, 40) || "General",
      visibility: dto.visibility,
      body,
      authorUserId: viewerId,
      authorName: viewerName,
      createdAt: new Date(),
    };
    await this.profileDoc(organizationId, membership._id);
    await this.profileModel.updateOne({ membershipId: membership._id }, { $push: { notes: note } }).exec();
    return this.getProfile(organizationId, memberId, viewerId);
  }

  async removeNote(organizationId: string, memberId: string, viewerId: string, noteId: string): Promise<MemberProfileView> {
    const { membership, access } = await this.resolve(organizationId, memberId, viewerId);
    const doc = await this.profileModel.findOne({ membershipId: membership._id }).select("notes").lean<any>().exec();
    const note = ((doc?.notes ?? []) as MemberNote[]).find((n) => n.id === noteId);
    if (!note) throw new NotFoundException("Note not found.");
    const owner = await this.members.isOrganizationOwner(organizationId, viewerId);
    const allowed = note.authorUserId === viewerId || owner;
    if (!allowed || (note.visibility === "pastoral" ? !access.canViewPastoral : !access.canViewAdminNotes)) {
      throw new ForbiddenException("Only the author or the owner can delete this note.");
    }
    await this.profileModel.updateOne({ membershipId: membership._id }, { $pull: { notes: { id: noteId } } }).exec();
    return this.getProfile(organizationId, memberId, viewerId);
  }

  async uploadDocument(organizationId: string, memberId: string, viewerId: string, dto: DocumentFieldsDto, file?: UploadedMediaFile): Promise<MemberProfileView> {
    let resolved: Awaited<ReturnType<MemberProfileService["resolve"]>>;
    try {
      resolved = await this.resolve(organizationId, memberId, viewerId);
      if (!resolved.access.canManageDocuments) throw new ForbiddenException("You don't have permission to upload member documents.");
      if (!file?.path) throw new BadRequestException("Choose a PDF or image to upload.");
      if (!DOC_TYPES.has(String(file.mimetype).toLowerCase())) throw new BadRequestException("Upload a PDF, JPG, PNG or WebP file.");
      if (dto.issuedAt && dto.expiresAt && dto.expiresAt < dto.issuedAt) throw new BadRequestException("The expiration date must be after the issue date.");
    } catch (error) {
      if (file?.path) await fs.unlink(file.path).catch(() => undefined);
      throw error;
    }
    const stored = await this.media.storeAuthorizedUpload(organizationId, file);
    const docEntry: MemberDocument = {
      id: newId("d"),
      category: clean(dto.category, 40) || "other",
      title: clean(dto.title, 160) || stored.fileName,
      fileUrl: stored.fileUrl,
      mimeType: stored.mimeType,
      fileSize: stored.fileSize,
      issuedAt: dto.issuedAt || null,
      expiresAt: dto.expiresAt || null,
      generated: false,
      serial: null,
      uploadedByName: resolved.viewerName,
      createdAt: new Date(),
    };
    await this.profileDoc(organizationId, resolved.membership._id);
    await this.profileModel.updateOne({ membershipId: resolved.membership._id }, { $push: { documents: docEntry } }).exec();
    return this.getProfile(organizationId, memberId, viewerId);
  }

  async removeDocument(organizationId: string, memberId: string, viewerId: string, documentId: string): Promise<MemberProfileView> {
    const { membership, access } = await this.resolve(organizationId, memberId, viewerId);
    if (!access.canManageDocuments) throw new ForbiddenException("You don't have permission to remove member documents.");
    const doc = await this.profileModel.findOne({ membershipId: membership._id }).select("documents").lean<any>().exec();
    const found = ((doc?.documents ?? []) as MemberDocument[]).find((d) => d.id === documentId);
    if (!found) throw new NotFoundException("Document not found.");
    await this.profileModel.updateOne({ membershipId: membership._id }, { $pull: { documents: { id: documentId } } }).exec();
    // Remove the stored file (only files in this organization's own folder).
    const prefix = `${MEDIA_PUBLIC_PREFIX}/${organizationId}/`;
    if (found.fileUrl?.startsWith(prefix)) await this.media.deleteAuthorizedUpload(organizationId, found.fileUrl).catch(() => undefined);
    return this.getProfile(organizationId, memberId, viewerId);
  }

  async issueCertificate(organizationId: string, memberId: string, viewerId: string, dto: CertificateDto): Promise<MemberProfileView> {
    const { membership, access, viewerName } = await this.resolve(organizationId, memberId, viewerId);
    if (!access.canEdit) throw new ForbiddenException("You don't have permission to issue certificates.");
    const current = await this.profileDoc(organizationId, membership._id);
    if (membership.status !== MembershipStatus.Active && dto.kind === "membership") throw new BadRequestException("Only active members can receive a membership certificate.");
    if (dto.kind === "baptism" && current.baptism?.status !== "completed") throw new BadRequestException("Record the baptism first.");
    if (dto.kind === "confirmation" && current.confirmation?.status !== "completed") throw new BadRequestException("Record the confirmation first.");
    const existing = (current.documents ?? []).find((d) => d.generated && d.category === `${dto.kind}_certificate`);
    if (existing && !dto.reissue) throw new BadRequestException("This certificate was already issued. Reissue it to replace it.");

    const counter = await this.profileModel
      .findOneAndUpdate({ _id: current._id }, { $inc: { certificateCounter: 1 } }, { new: true })
      .select("certificateCounter")
      .lean<any>()
      .exec();
    const year = new Date().getFullYear();
    const serial = `${dto.kind.slice(0, 3).toUpperCase()}-${year}-${String(membership._id).slice(-6).toUpperCase()}-${String(counter?.certificateCounter ?? 1).padStart(2, "0")}`;
    const title = `${dto.kind[0].toUpperCase()}${dto.kind.slice(1)} Certificate`;
    const docEntry: MemberDocument = {
      id: newId("c"),
      category: `${dto.kind}_certificate`,
      title,
      fileUrl: null,
      mimeType: null,
      fileSize: null,
      issuedAt: today(),
      expiresAt: null,
      generated: true,
      serial,
      uploadedByName: viewerName,
      createdAt: new Date(),
    };
    if (existing) await this.profileModel.updateOne({ _id: current._id }, { $pull: { documents: { id: existing.id } } }).exec();
    await this.profileModel.updateOne({ _id: current._id }, { $push: { documents: docEntry } }).exec();
    return this.getProfile(organizationId, memberId, viewerId);
  }
}
