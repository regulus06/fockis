/**
 * ministry-attendance.service.ts
 * -----------------------------------------------------------------------------
 * Ministry attendance: sessions per meeting date, check-ins, manual records,
 * corrections with audit history, finalization, history, reports and export.
 *
 * Rules enforced here (never trusted from the client):
 *   - One session per occurrence (unique ministryId + occurrenceKey).
 *   - Status and late minutes come from actual arrival vs. the session's own
 *     scheduled start (attendance-time.ts). Entry time never affects lateness.
 *   - Existing records are not overwritten unless the request says so; every
 *     change is appended to the record's audit history with who/when/why.
 *   - Members without a record are "Not Checked In" until a manager finalizes.
 *   - Canceled occurrences never count as absences.
 *   - Sessions that have records or are finalized keep their own schedule copy;
 *     later schedule edits only move untouched future sessions.
 *
 * Permissions (all checked server-side):
 *   manage = organization owner, ChurchPermission.ManageAttendance, or a leader
 *            of THIS ministry (Department.leaderIds)
 *   view   = manage, or ChurchPermission.ViewAttendance
 *   member = active membership; may check in (QR / self) and see own history
 *            when the ministry allows it. Members can never set their status.
 * -----------------------------------------------------------------------------
 */

import { randomBytes } from "crypto";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { Department, DepartmentDocument } from "../departments/schemas/department.schema";
import { ChurchEvent, ChurchEventDocument } from "../events/schemas/church-event.schema";
import { Membership, MembershipDocument } from "../members/schemas/membership.schema";
import { MembersService } from "../members/services/members.service";
import { MembershipStatus } from "../enums/membership-status.enum";
import { ChurchPermission } from "../enums/permission.enum";
import { isSchedulable, occurrenceKey, occurrencesBetween, type RecurringMeeting } from "./attendance-recurrence";
import { addDays, isHhmm, isValidTimeZone, isYmd, localHhmm, localYmd, officialArrival, zonedLocalToUtc } from "./attendance-time";
import {
  AttendanceAuditEntry,
  AttendanceRecordingMethod,
  AttendanceSessionState,
  DEFAULT_ATTENDANCE_SETTINGS,
  MinistryAttendanceRecord,
  MinistryAttendanceRecordDocument,
  MinistryAttendanceSession,
  MinistryAttendanceSessionDocument,
  MinistryAttendanceSettings,
  MinistryAttendanceStatus,
} from "./ministry-attendance.schemas";

/* ============================================================================
 * Types
 * ========================================================================== */

export interface Ctx {
  orgId: Types.ObjectId;
  ministryId: Types.ObjectId;
  organizationId: string;
  ministryIdStr: string;
  ministry: { name: string; leaderIds: Types.ObjectId[]; meetingSchedule: RecurringMeeting[] };
  settings: MinistryAttendanceSettings;
  membership: MembershipDocument | null;
  canManage: boolean;
  canView: boolean;
}

export type DisplayStatus = "upcoming" | "open" | "in_progress" | "awaiting_review" | "finalized" | "canceled" | "archived";

export interface Counts {
  present: number;
  late: number;
  absent: number;
  excused: number;
  checkedIn: number;
  expected: number;
  notCheckedIn: number;
  rate: number | null;
}

export type LeanSession = MinistryAttendanceSession & { _id: Types.ObjectId };
export type LeanRecord = MinistryAttendanceRecord & { _id: Types.ObjectId };
export type LeanMember = { _id: Types.ObjectId; profile?: { displayName?: string; avatarUrl?: string | null }; departmentIds?: Types.ObjectId[]; status?: string };

export interface RecordInput {
  membershipIds: string[];
  status: MinistryAttendanceStatus;
  /** Actual arrival, local "HH:mm" in the session's time zone. */
  arrivalTime?: string;
  /** Local date of the arrival; defaults to the occurrence date. */
  arrivalDate?: string;
  reason?: string;
  /** Replace existing records (a correction). Without it, existing ones are skipped. */
  overwrite?: boolean;
}

const MS_MIN = 60_000;
const oid = (v: unknown) => new Types.ObjectId(String(v));
const sameId = (a: unknown, b: unknown) => String(a) === String(b);

function isDuplicateKey(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && (err as { code?: number }).code === 11000);
}

/* ============================================================================
 * Service
 * ========================================================================== */

@Injectable()
export class MinistryAttendanceService {
  constructor(
    @InjectModel(MinistryAttendanceSession.name)
    private readonly sessionModel: Model<MinistryAttendanceSessionDocument>,
    @InjectModel(MinistryAttendanceRecord.name)
    private readonly recordModel: Model<MinistryAttendanceRecordDocument>,
    @InjectModel(Department.name)
    private readonly departmentModel: Model<DepartmentDocument>,
    @InjectModel(Membership.name)
    private readonly membershipModel: Model<MembershipDocument>,
    @InjectModel(ChurchEvent.name)
    private readonly eventModel: Model<ChurchEventDocument>,
    private readonly membersService: MembersService,
  ) {}

  /* ==========================================================================
     CONTEXT & PERMISSIONS
     ========================================================================== */

  private toId(value: string, label: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) throw new BadRequestException(`Invalid ${label}.`);
    return new Types.ObjectId(value);
  }

  async context(organizationId: string, ministryId: string, userId: string | null): Promise<Ctx> {
    const orgId = this.toId(organizationId, "organization ID");
    const mId = this.toId(ministryId, "ministry ID");

    const dept = (await this.departmentModel
      .findOne({ _id: mId, organizationId: orgId, isArchived: { $ne: true } })
      .select("name leaderIds meetingSchedule attendanceSettings")
      .lean()
      .exec()) as unknown as {
      name: string;
      leaderIds?: Types.ObjectId[];
      meetingSchedule?: RecurringMeeting[];
      attendanceSettings?: Partial<MinistryAttendanceSettings>;
    } | null;
    if (!dept) throw new NotFoundException("This ministry could not be found.");

    const settings: MinistryAttendanceSettings = { ...DEFAULT_ATTENDANCE_SETTINGS, ...(dept.attendanceSettings ?? {}) };

    let membership: MembershipDocument | null = null;
    let canManage = false;
    let canView = false;
    if (userId) {
      membership = await this.membersService.getMembershipOrNull(organizationId, userId);
      const manageByPermission = await this.membersService.hasPermission(organizationId, userId, ChurchPermission.ManageAttendance);
      const isLeader =
        Boolean(membership) &&
        membership!.status === MembershipStatus.Active &&
        (dept.leaderIds ?? []).some((id) => sameId(id, membership!._id));
      canManage = manageByPermission || isLeader;
      canView = canManage || (await this.membersService.hasPermission(organizationId, userId, ChurchPermission.ViewAttendance));
      if (canManage && !membership) {
        // Organization owner without a membership row.
        membership = await this.membersService.requirePermission(organizationId, userId, ChurchPermission.ManageAttendance);
      }
    }

    return {
      orgId,
      ministryId: mId,
      organizationId,
      ministryIdStr: ministryId,
      ministry: { name: dept.name, leaderIds: dept.leaderIds ?? [], meetingSchedule: dept.meetingSchedule ?? [] },
      settings,
      membership,
      canManage,
      canView,
    };
  }

  private requireManage(ctx: Ctx) {
    if (!ctx.canManage) throw new ForbiddenException("You don't have permission to manage attendance for this ministry.");
  }

  private requireView(ctx: Ctx) {
    if (!ctx.canView) throw new ForbiddenException("You don't have permission to view attendance for this ministry.");
  }

  private actorName(ctx: Ctx): string {
    return (ctx.membership as unknown as { profile?: { displayName?: string } } | null)?.profile?.displayName ?? "";
  }

  async access(organizationId: string, ministryId: string, userId: string | null) {
    const ctx = await this.context(organizationId, ministryId, userId);
    const isActiveMember = ctx.membership?.status === MembershipStatus.Active;
    const inMinistry = Boolean(
      isActiveMember && ((ctx.membership as unknown as { departmentIds?: Types.ObjectId[] }).departmentIds ?? []).some((d) => sameId(d, ctx.ministryId)),
    );
    return {
      canManage: ctx.canManage,
      canView: ctx.canView,
      isMember: isActiveMember,
      inMinistry,
      membershipId: ctx.membership ? String(ctx.membership._id) : null,
      settings: ctx.settings,
    };
  }

  /* ==========================================================================
     SESSIONS FROM THE SCHEDULE (idempotent)
     ========================================================================== */

  private windowFor(start: Date, end: Date | null, s: MinistryAttendanceSettings) {
    const opens = new Date(start.getTime() - Math.max(0, s.opensMinutesBefore) * MS_MIN);
    const closes = new Date((end ?? start).getTime() + Math.max(0, s.closesMinutesAfter) * MS_MIN);
    return { opens, closes };
  }

  private meetingTimes(m: RecurringMeeting, ymd: string, ctx: Ctx) {
    const tz = m.timeZone && isValidTimeZone(m.timeZone) ? m.timeZone : ctx.settings.timeZone;
    const start = zonedLocalToUtc(ymd, m.startClock!, tz);
    let end: Date | null = null;
    if (m.endClock && isHhmm(m.endClock)) {
      end = zonedLocalToUtc(m.endClock > m.startClock! ? ymd : addDays(ymd, 1), m.endClock, tz);
    }
    return { tz, start, end };
  }

  /**
   * Create (or find) the session of each occurrence between two local dates.
   * Untouched future sessions follow schedule edits; anything with records,
   * finalized, canceled or already started keeps its own copy.
   */
  private async ensureSessions(ctx: Ctx, from: string, to: string): Promise<void> {
    const now = new Date();
    const wanted: {
      key: string;
      sourceType: "meeting" | "event";
      sourceId: string;
      ymd: string;
      title: string;
      location: string;
      start: Date;
      end: Date | null;
      tz: string;
    }[] = [];

    for (const m of ctx.ministry.meetingSchedule) {
      if (!isSchedulable(m)) continue;
      for (const ymd of occurrencesBetween(m, from, to)) {
        const { tz, start, end } = this.meetingTimes(m, ymd, ctx);
        wanted.push({ key: occurrenceKey(m.key!, ymd), sourceType: "meeting", sourceId: m.key!, ymd, title: m.name, location: m.location ?? "", start, end, tz });
      }
    }

    // Ministry events (church events linked to this ministry) are one-time sessions.
    const tz = ctx.settings.timeZone;
    const events = (await this.eventModel
      .find({
        organizationId: ctx.orgId,
        departmentId: ctx.ministryId,
        startsAt: { $gte: zonedLocalToUtc(addDays(from, -1), "00:00", tz), $lte: zonedLocalToUtc(addDays(to, 1), "23:59", tz) },
      })
      .select("title startsAt endsAt location isOnline")
      .lean()
      .exec()) as unknown as { _id: Types.ObjectId; title: string; startsAt: Date; endsAt?: Date | null; location?: string; isOnline?: boolean }[];
    for (const e of events) {
      const ymd = localYmd(new Date(e.startsAt), tz);
      if (ymd < from || ymd > to) continue;
      wanted.push({
        key: `e:${String(e._id)}`,
        sourceType: "event",
        sourceId: String(e._id),
        ymd,
        title: e.title,
        location: e.isOnline ? "Online" : (e.location ?? ""),
        start: new Date(e.startsAt),
        end: e.endsAt ? new Date(e.endsAt) : null,
        tz,
      });
    }
    if (wanted.length === 0) return;

    const existing = (await this.sessionModel
      .find({ ministryId: ctx.ministryId, occurrenceKey: { $in: wanted.map((w) => w.key) } })
      .lean()
      .exec()) as unknown as LeanSession[];
    const byKey = new Map(existing.map((s) => [s.occurrenceKey, s]));
    const withRecords = new Set(
      (await this.recordModel.distinct("sessionId", { sessionId: { $in: existing.map((s) => s._id) } })).map((id) => String(id)),
    );

    for (const w of wanted) {
      const { opens, closes } = this.windowFor(w.start, w.end, ctx.settings);
      const found = byKey.get(w.key);
      if (!found) {
        try {
          await this.sessionModel.create({
            organizationId: ctx.orgId,
            ministryId: ctx.ministryId,
            occurrenceKey: w.key,
            sourceType: w.sourceType,
            sourceId: w.sourceId,
            occurrenceDate: w.ymd,
            title: w.title,
            location: w.location,
            scheduledStartAt: w.start,
            scheduledEndAt: w.end,
            timeZone: w.tz,
            checkInOpensAt: opens,
            checkInClosesAt: closes,
            checkInToken: randomBytes(24).toString("base64url"),
            createdByMembershipId: ctx.membership?._id ?? null,
          });
        } catch (err) {
          if (!isDuplicateKey(err)) throw err; // created concurrently: fine
        }
        continue;
      }
      // Reschedule only untouched, not-yet-started, still-scheduled sessions.
      const untouched =
        found.state === AttendanceSessionState.Scheduled && !withRecords.has(String(found._id)) && new Date(found.scheduledStartAt) > now && w.start > now;
      const changed =
        found.title !== w.title ||
        found.location !== w.location ||
        new Date(found.scheduledStartAt).getTime() !== w.start.getTime() ||
        (found.scheduledEndAt ? new Date(found.scheduledEndAt).getTime() : null) !== (w.end ? w.end.getTime() : null);
      if (untouched && changed) {
        await this.sessionModel.updateOne(
          { _id: found._id },
          {
            $set: {
              title: w.title,
              location: w.location,
              scheduledStartAt: w.start,
              scheduledEndAt: w.end,
              timeZone: w.tz,
              occurrenceDate: w.ymd,
              checkInOpensAt: opens,
              checkInClosesAt: closes,
            },
          },
        );
      }
    }
  }

  /* ==========================================================================
     COUNTS & VIEWS
     ========================================================================== */

  private async expectedMembers(ctx: Ctx): Promise<LeanMember[]> {
    return (await this.membershipModel
      .find({ organizationId: ctx.orgId, departmentIds: ctx.ministryId, status: MembershipStatus.Active })
      .select("profile departmentIds status")
      .lean()
      .exec()) as unknown as LeanMember[];
  }

  displayStatus(s: Pick<LeanSession, "state" | "checkInOpensAt" | "checkInClosesAt" | "scheduledStartAt">, now = new Date()): DisplayStatus {
    if (s.state === AttendanceSessionState.Canceled) return "canceled";
    if (s.state === AttendanceSessionState.Finalized) return "finalized";
    if (s.state === AttendanceSessionState.Archived) return "archived";
    if (now < new Date(s.checkInOpensAt)) return "upcoming";
    if (now <= new Date(s.checkInClosesAt)) return now < new Date(s.scheduledStartAt) ? "open" : "in_progress";
    return "awaiting_review";
  }

  private async countsFor(sessions: LeanSession[], expected: LeanMember[]): Promise<Map<string, Counts>> {
    const ids = sessions.map((s) => s._id);
    const grouped = await this.recordModel.aggregate<{ _id: Types.ObjectId; items: { m: Types.ObjectId; s: string }[] }>([
      { $match: { sessionId: { $in: ids } } },
      { $group: { _id: "$sessionId", items: { $push: { m: "$membershipId", s: "$status" } } } },
    ]);
    const bySession = new Map(grouped.map((g) => [String(g._id), g.items]));
    const currentExpected = new Set(expected.map((e) => String(e._id)));
    const out = new Map<string, Counts>();

    for (const s of sessions) {
      const items = bySession.get(String(s._id)) ?? [];
      const expectedSet =
        s.state === AttendanceSessionState.Finalized && s.expectedSnapshot ? new Set(s.expectedSnapshot.map((x) => String(x))) : currentExpected;
      const c: Counts = { present: 0, late: 0, absent: 0, excused: 0, checkedIn: 0, expected: expectedSet.size, notCheckedIn: 0, rate: null };
      let recordedExpected = 0;
      for (const it of items) {
        if (it.s === MinistryAttendanceStatus.Present) c.present++;
        else if (it.s === MinistryAttendanceStatus.Late) c.late++;
        else if (it.s === MinistryAttendanceStatus.Absent) c.absent++;
        else if (it.s === MinistryAttendanceStatus.Excused) c.excused++;
        if (expectedSet.has(String(it.m))) recordedExpected++;
      }
      c.checkedIn = c.present + c.late;
      if (s.state === AttendanceSessionState.Canceled) {
        c.notCheckedIn = 0; // canceled occurrences never count against anyone
      } else {
        c.notCheckedIn = Math.max(0, c.expected - recordedExpected);
      }
      const eligible = c.expected - c.excused;
      c.rate = s.state !== AttendanceSessionState.Canceled && eligible > 0 ? Math.round((Math.min(c.checkedIn, eligible) / eligible) * 100) : null;
      out.set(String(s._id), c);
    }
    return out;
  }

  private sessionView(s: LeanSession, c: Counts | undefined, now = new Date()) {
    return {
      id: String(s._id),
      occurrenceKey: s.occurrenceKey,
      sourceType: s.sourceType,
      title: s.title,
      location: s.location,
      occurrenceDate: s.occurrenceDate,
      scheduledStartAt: new Date(s.scheduledStartAt).toISOString(),
      scheduledEndAt: s.scheduledEndAt ? new Date(s.scheduledEndAt).toISOString() : null,
      timeZone: s.timeZone,
      checkInOpensAt: new Date(s.checkInOpensAt).toISOString(),
      checkInClosesAt: new Date(s.checkInClosesAt).toISOString(),
      state: s.state,
      status: this.displayStatus(s, now),
      cancelReason: s.cancelReason ?? "",
      finalizedAt: s.finalizedAt ? new Date(s.finalizedAt).toISOString() : null,
      counts: c ?? { present: 0, late: 0, absent: 0, excused: 0, checkedIn: 0, expected: 0, notCheckedIn: 0, rate: null },
    };
  }

  private recordView(r: LeanRecord, names: Map<string, { name: string; avatarUrl: string | null }>, session?: LeanSession) {
    const m = names.get(String(r.membershipId));
    const by = r.recordedByMembershipId ? names.get(String(r.recordedByMembershipId)) : undefined;
    return {
      id: String(r._id),
      sessionId: String(r.sessionId),
      membershipId: String(r.membershipId),
      memberName: m?.name ?? "Member",
      memberAvatarUrl: m?.avatarUrl ?? null,
      status: r.status,
      actualArrivalAt: r.actualArrivalAt ? new Date(r.actualArrivalAt).toISOString() : null,
      arrivalLocal: r.actualArrivalAt && session ? localHhmm(new Date(r.actualArrivalAt), session.timeZone) : null,
      recordedAt: new Date(r.recordedAt).toISOString(),
      lateMinutes: r.lateMinutes,
      recordingMethod: r.recordingMethod,
      recordedByName: by?.name ?? "",
      correctionReason: r.correctionReason ?? "",
      audit: (r.audit ?? []).map((a) => ({
        at: new Date(a.at).toISOString(),
        byName: a.byName || (a.byMembershipId ? (names.get(String(a.byMembershipId))?.name ?? "") : ""),
        previousStatus: a.previousStatus,
        newStatus: a.newStatus,
        previousArrivalAt: a.previousArrivalAt ? new Date(a.previousArrivalAt).toISOString() : null,
        newArrivalAt: a.newArrivalAt ? new Date(a.newArrivalAt).toISOString() : null,
        previousLateMinutes: a.previousLateMinutes,
        newLateMinutes: a.newLateMinutes,
        method: a.method,
        reason: a.reason,
        afterFinalization: a.afterFinalization,
      })),
    };
  }

  private async names(ids: unknown[]): Promise<Map<string, { name: string; avatarUrl: string | null }>> {
    const unique = [...new Set(ids.filter(Boolean).map((x) => String(x)))].filter((x) => Types.ObjectId.isValid(x));
    if (unique.length === 0) return new Map();
    const docs = (await this.membershipModel
      .find({ _id: { $in: unique.map(oid) } })
      .select("profile")
      .lean()
      .exec()) as unknown as LeanMember[];
    return new Map(docs.map((d) => [String(d._id), { name: d.profile?.displayName ?? "Member", avatarUrl: d.profile?.avatarUrl ?? null }]));
  }

  private async loadSession(ctx: Ctx, sessionId: string, withToken = false): Promise<LeanSession> {
    const q = this.sessionModel.findOne({ _id: this.toId(sessionId, "session ID"), ministryId: ctx.ministryId, organizationId: ctx.orgId });
    if (withToken) q.select("+checkInToken");
    const s = (await q.lean().exec()) as unknown as LeanSession | null;
    if (!s) throw new NotFoundException("This attendance session could not be found.");
    return s;
  }

  /* ==========================================================================
     DASHBOARD
     ========================================================================== */

  async dashboard(organizationId: string, ministryId: string, userId: string, query: { date?: string; trend?: string }) {
    const ctx = await this.context(organizationId, ministryId, userId);
    this.requireView(ctx);
    const tz = ctx.settings.timeZone;
    const now = new Date();
    const today = localYmd(now, tz);
    const date = isYmd(query.date) ? query.date : today;

    // Materialize recent past, the selected date and the next two weeks.
    const from = date < addDays(today, -35) ? date : addDays(today, -35);
    const to = date > addDays(today, 14) ? date : addDays(today, 14);
    await this.ensureSessions(ctx, from, to);

    const expected = await this.expectedMembers(ctx);

    const daySessions = (await this.sessionModel
      .find({ ministryId: ctx.ministryId, occurrenceDate: date })
      .sort({ scheduledStartAt: 1 })
      .lean()
      .exec()) as unknown as LeanSession[];

    const trendFrom = query.trend === "year" ? addDays(today, -365) : query.trend === "quarter" ? addDays(today, -92) : addDays(today, -31);
    const pastSessions = (await this.sessionModel
      .find({ ministryId: ctx.ministryId, scheduledStartAt: { $lte: now }, state: { $ne: AttendanceSessionState.Canceled } })
      .sort({ scheduledStartAt: -1 })
      .limit(60)
      .lean()
      .exec()) as unknown as LeanSession[];

    const upcomingSessions = (await this.sessionModel
      .find({ ministryId: ctx.ministryId, scheduledStartAt: { $gt: now } })
      .sort({ scheduledStartAt: 1 })
      .limit(4)
      .lean()
      .exec()) as unknown as LeanSession[];

    const all = [...daySessions, ...pastSessions, ...upcomingSessions];
    const counts = await this.countsFor(all, expected);

    // Totals for the selected date (canceled sessions excluded).
    const totals = { present: 0, late: 0, absent: 0, excused: 0, notCheckedIn: 0, expected: 0, checkedIn: 0 };
    for (const s of daySessions) {
      if (s.state === AttendanceSessionState.Canceled) continue;
      const c = counts.get(String(s._id))!;
      totals.present += c.present;
      totals.late += c.late;
      totals.absent += c.absent;
      totals.excused += c.excused;
      totals.notCheckedIn += c.notCheckedIn;
      totals.expected += c.expected;
      totals.checkedIn += c.checkedIn;
    }
    const eligible = totals.expected - totals.excused;
    const rate = eligible > 0 ? Math.round((Math.min(totals.checkedIn, eligible) / eligible) * 100) : null;

    // Live check-ins for the selected date.
    const recent = (await this.recordModel
      .find({ sessionId: { $in: daySessions.map((s) => s._id) } })
      .sort({ recordedAt: -1 })
      .limit(8)
      .lean()
      .exec()) as unknown as LeanRecord[];
    const names = await this.names([...recent.map((r) => r.membershipId), ...recent.map((r) => r.recordedByMembershipId)]);
    const sessionById = new Map(all.map((s) => [String(s._id), s]));

    const trend = pastSessions
      .filter((s) => new Date(s.scheduledStartAt) >= zonedLocalToUtc(trendFrom, "00:00", tz))
      .slice(0, 12)
      .reverse()
      .map((s) => ({ ...this.sessionView(s, counts.get(String(s._id)), now) }));

    return {
      date,
      today,
      timeZone: tz,
      access: { canManage: ctx.canManage, canView: ctx.canView },
      settings: ctx.settings,
      totals: { ...totals, rate },
      sessions: daySessions.map((s) => this.sessionView(s, counts.get(String(s._id)), now)),
      recentCheckIns: recent.map((r) => ({ ...this.recordView(r, names, sessionById.get(String(r.sessionId))), sessionTitle: sessionById.get(String(r.sessionId))?.title ?? "" })),
      trend,
      history: pastSessions.slice(0, 5).map((s) => this.sessionView(s, counts.get(String(s._id)), now)),
      upcoming: upcomingSessions.map((s) => this.sessionView(s, counts.get(String(s._id)), now)),
      meetingsWithoutTimes: ctx.ministry.meetingSchedule.filter((m) => !isSchedulable(m)).map((m) => m.name),
    };
  }

  /* ==========================================================================
     HISTORY
     ========================================================================== */

  async listSessions(
    organizationId: string,
    ministryId: string,
    userId: string,
    q: { status?: string; from?: string; to?: string; search?: string; page?: number; pageSize?: number },
  ) {
    const ctx = await this.context(organizationId, ministryId, userId);
    this.requireView(ctx);
    const now = new Date();
    const filter: Record<string, unknown> = { ministryId: ctx.ministryId };
    const range: Record<string, Date> = {};
    if (isYmd(q.from)) range.$gte = zonedLocalToUtc(q.from, "00:00", ctx.settings.timeZone);
    if (isYmd(q.to)) range.$lte = zonedLocalToUtc(q.to, "23:59", ctx.settings.timeZone);
    if (Object.keys(range).length) filter.scheduledStartAt = range;
    if (q.search?.trim()) filter.title = { $regex: q.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

    switch (q.status) {
      case "finalized":
      case "canceled":
      case "archived":
        filter.state = q.status;
        break;
      case "upcoming":
        filter.state = AttendanceSessionState.Scheduled;
        filter.checkInOpensAt = { $gt: now };
        break;
      case "open":
        filter.state = AttendanceSessionState.Scheduled;
        filter.checkInOpensAt = { $lte: now };
        filter.checkInClosesAt = { $gte: now };
        break;
      case "awaiting_review":
        filter.state = AttendanceSessionState.Scheduled;
        filter.checkInClosesAt = { $lt: now };
        break;
      case "completed":
        filter.$or = [{ state: AttendanceSessionState.Finalized }, { state: AttendanceSessionState.Scheduled, checkInClosesAt: { $lt: now } }];
        break;
      default:
        break;
    }

    const page = Math.max(1, Math.floor(Number(q.page) || 1));
    const pageSize = Math.min(100, Math.max(1, Math.floor(Number(q.pageSize) || 20)));
    const [items, total] = await Promise.all([
      this.sessionModel
        .find(filter)
        .sort({ scheduledStartAt: q.status === "upcoming" ? 1 : -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
        .exec() as unknown as Promise<LeanSession[]>,
      this.sessionModel.countDocuments(filter),
    ]);
    const counts = await this.countsFor(items, await this.expectedMembers(ctx));
    return { items: items.map((s) => this.sessionView(s, counts.get(String(s._id)), now)), total, page, pageSize };
  }

  /* ==========================================================================
     SESSION DETAIL (also used by Take Attendance)
     ========================================================================== */

  async sessionDetail(organizationId: string, ministryId: string, userId: string, sessionId: string) {
    const ctx = await this.context(organizationId, ministryId, userId);
    this.requireView(ctx);
    const s = await this.loadSession(ctx, sessionId);
    const now = new Date();

    const records = (await this.recordModel.find({ sessionId: s._id }).lean().exec()) as unknown as LeanRecord[];
    const currentExpected = await this.expectedMembers(ctx);
    const expectedIds =
      s.state === AttendanceSessionState.Finalized && s.expectedSnapshot ? s.expectedSnapshot.map((x) => String(x)) : currentExpected.map((m) => String(m._id));
    const counts = await this.countsFor([s], currentExpected);

    const audits = records.flatMap((r) => (r.audit ?? []).map((a) => a.byMembershipId));
    const names = await this.names([
      ...expectedIds,
      ...records.map((r) => r.membershipId),
      ...records.map((r) => r.recordedByMembershipId),
      ...audits,
      ...(s.log ?? []).map((l) => l.byMembershipId),
    ]);
    const byMember = new Map(records.map((r) => [String(r.membershipId), r]));

    const rosterIds = [...new Set([...expectedIds, ...records.map((r) => String(r.membershipId))])];
    const roster = rosterIds
      .map((id) => {
        const r = byMember.get(id);
        const n = names.get(id);
        return {
          membershipId: id,
          name: n?.name ?? "Member",
          avatarUrl: n?.avatarUrl ?? null,
          expected: expectedIds.includes(id),
          record: r ? this.recordView(r, names, s) : null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const corrections = records
      .flatMap((r) =>
        (r.audit ?? [])
          .filter((a) => a.previousStatus !== null || a.method === AttendanceRecordingMethod.AdminCorrection)
          .map((a) => ({
            membershipId: String(r.membershipId),
            memberName: names.get(String(r.membershipId))?.name ?? "Member",
            at: new Date(a.at).toISOString(),
            byName: a.byName || names.get(String(a.byMembershipId))?.name || "",
            previousStatus: a.previousStatus,
            newStatus: a.newStatus,
            previousArrivalAt: a.previousArrivalAt ? new Date(a.previousArrivalAt).toISOString() : null,
            newArrivalAt: a.newArrivalAt ? new Date(a.newArrivalAt).toISOString() : null,
            previousLateMinutes: a.previousLateMinutes,
            newLateMinutes: a.newLateMinutes,
            reason: a.reason,
            afterFinalization: a.afterFinalization,
          })),
      )
      .sort((a, b) => b.at.localeCompare(a.at));

    return {
      session: this.sessionView(s, counts.get(String(s._id)), now),
      access: { canManage: ctx.canManage, canView: ctx.canView },
      settings: ctx.settings,
      roster,
      corrections,
      log: (s.log ?? []).map((l) => ({
        at: new Date(l.at).toISOString(),
        byName: l.byName || names.get(String(l.byMembershipId))?.name || "",
        action: l.action,
        note: l.note,
      })),
    };
  }

  /* ==========================================================================
     RECORDING (manual, bulk, corrections)
     ========================================================================== */

  async record(organizationId: string, ministryId: string, userId: string, sessionId: string, input: RecordInput) {
    const ctx = await this.context(organizationId, ministryId, userId);
    this.requireManage(ctx);
    const s = await this.loadSession(ctx, sessionId);

    if (s.state === AttendanceSessionState.Canceled) throw new BadRequestException("This meeting was canceled. Restore it before recording attendance.");
    if (s.state === AttendanceSessionState.Archived) throw new BadRequestException("Archived sessions can't be changed.");
    const afterFinalization = s.state === AttendanceSessionState.Finalized;
    if (afterFinalization && !ctx.settings.allowCorrectionsAfterFinalize) {
      throw new ForbiddenException("This session is finalized. Reopen it to make changes.");
    }
    if (!Object.values(MinistryAttendanceStatus).includes(input.status)) throw new BadRequestException("Choose Present, Late, Absent or Excused.");

    const ids = [...new Set((input.membershipIds ?? []).map(String))];
    if (ids.length === 0) throw new BadRequestException("Select at least one member.");
    if (ids.length > 500) throw new BadRequestException("Record at most 500 members at a time.");

    const reason = String(input.reason ?? "").trim().slice(0, 500);

    // Official arrival — computed here from the session's own start and time zone.
    let arrival: Date | null = null;
    if (input.arrivalTime) {
      if (!isHhmm(input.arrivalTime)) throw new BadRequestException("Arrival time must look like 13:05.");
      const day = isYmd(input.arrivalDate) ? input.arrivalDate : s.occurrenceDate;
      arrival = zonedLocalToUtc(day, input.arrivalTime, s.timeZone);
      if (arrival.getTime() > Date.now() + MS_MIN) throw new BadRequestException("The arrival time can't be in the future.");
    }

    let status = input.status;
    let lateMinutes: number | null = null;
    let actualArrivalAt: Date | null = null;
    if (status === MinistryAttendanceStatus.Present || status === MinistryAttendanceStatus.Late) {
      if (arrival) {
        const official = officialArrival(arrival, new Date(s.scheduledStartAt));
        status = official.status === "late" ? MinistryAttendanceStatus.Late : MinistryAttendanceStatus.Present;
        lateMinutes = official.lateMinutes;
        actualArrivalAt = arrival;
      } else {
        lateMinutes = status === MinistryAttendanceStatus.Present ? 0 : null; // late, time unknown
      }
    }

    // Who can be recorded: active members of the organization; non-ministry
    // members only when the ministry allows visitors.
    const members = (await this.membershipModel
      .find({ _id: { $in: ids.filter((x) => Types.ObjectId.isValid(x)).map(oid) }, organizationId: ctx.orgId })
      .select("profile departmentIds status")
      .lean()
      .exec()) as unknown as LeanMember[];
    const memberById = new Map(members.map((m) => [String(m._id), m]));

    const existing = (await this.recordModel.find({ sessionId: s._id, membershipId: { $in: ids.filter((x) => Types.ObjectId.isValid(x)).map(oid) } }).lean().exec()) as unknown as LeanRecord[];
    const existingBy = new Map(existing.map((r) => [String(r.membershipId), r]));

    const needsReason = existing.length > 0 && input.overwrite && (ctx.settings.requireCorrectionReason || afterFinalization);
    if (needsReason && !reason) throw new BadRequestException("Enter a reason for this correction.");
    if (afterFinalization && !reason) throw new BadRequestException("Enter a reason for changing a finalized session.");
    if (existing.length > 0 && input.overwrite && !ctx.settings.allowCorrections) throw new ForbiddenException("Corrections are turned off for this ministry.");
    if (existing.length < ids.length && !ctx.settings.manualAttendance) throw new ForbiddenException("Manual attendance is turned off for this ministry.");

    const now = new Date();
    const actorId = ctx.membership?._id ?? null;
    const actorName = this.actorName(ctx);
    const saved: string[] = [];
    const skipped: { membershipId: string; name: string; status: string }[] = [];
    const rejected: { membershipId: string; reason: string }[] = [];

    for (const id of ids) {
      const m = memberById.get(id);
      if (!m || m.status !== MembershipStatus.Active) {
        rejected.push({ membershipId: id, reason: "Not an active member of this organization." });
        continue;
      }
      const inMinistry = (m.departmentIds ?? []).some((d) => sameId(d, ctx.ministryId));
      if (!inMinistry && !ctx.settings.allowVisitors && !existingBy.has(id)) {
        rejected.push({ membershipId: id, reason: "Not a member of this ministry (visitors are turned off)." });
        continue;
      }

      const prev = existingBy.get(id);
      if (prev && !input.overwrite) {
        skipped.push({ membershipId: id, name: m.profile?.displayName ?? "Member", status: prev.status });
        continue;
      }

      const audit: AttendanceAuditEntry = {
        at: now,
        byMembershipId: actorId,
        byName: actorName,
        previousStatus: prev ? prev.status : null,
        newStatus: status,
        previousArrivalAt: prev?.actualArrivalAt ?? null,
        newArrivalAt: actualArrivalAt,
        previousLateMinutes: prev ? prev.lateMinutes : null,
        newLateMinutes: lateMinutes,
        method: prev ? AttendanceRecordingMethod.AdminCorrection : AttendanceRecordingMethod.Manual,
        reason,
        afterFinalization,
      };

      if (prev) {
        await this.recordModel.updateOne(
          { _id: prev._id },
          {
            $set: {
              status,
              actualArrivalAt,
              lateMinutes,
              recordedAt: now,
              recordingMethod: AttendanceRecordingMethod.AdminCorrection,
              recordedByMembershipId: actorId,
              correctionReason: reason,
            },
            $push: { audit },
          },
        );
        saved.push(id);
      } else {
        try {
          await this.recordModel.create({
            sessionId: s._id,
            organizationId: ctx.orgId,
            ministryId: ctx.ministryId,
            membershipId: m._id,
            scheduledStartAt: s.scheduledStartAt,
            status,
            actualArrivalAt,
            recordedAt: now,
            lateMinutes,
            recordingMethod: AttendanceRecordingMethod.Manual,
            recordedByMembershipId: actorId,
            correctionReason: reason,
            audit: [audit],
          });
          saved.push(id);
        } catch (err) {
          if (!isDuplicateKey(err)) throw err;
          skipped.push({ membershipId: id, name: m.profile?.displayName ?? "Member", status: "recorded" });
        }
      }
    }

    return { saved: saved.length, skipped, rejected, officialStatus: status, lateMinutes };
  }

  /* ==========================================================================
     SESSION ACTIONS
     ========================================================================== */

  private async logAction(ctx: Ctx, s: LeanSession, action: string, note = "", set: Record<string, unknown> = {}) {
    await this.sessionModel.updateOne(
      { _id: s._id },
      { $set: set, $push: { log: { at: new Date(), byMembershipId: ctx.membership?._id ?? null, byName: this.actorName(ctx), action, note } } },
    );
  }

  async finalize(organizationId: string, ministryId: string, userId: string, sessionId: string, unrecorded: "absent" | "excused" | "leave") {
    const ctx = await this.context(organizationId, ministryId, userId);
    this.requireManage(ctx);
    const s = await this.loadSession(ctx, sessionId);
    if (s.state !== AttendanceSessionState.Scheduled) throw new BadRequestException("Only open or pending sessions can be finalized.");

    const expected = await this.expectedMembers(ctx);
    const recorded = new Set((await this.recordModel.distinct("membershipId", { sessionId: s._id })).map((x) => String(x)));
    const missing = expected.filter((m) => !recorded.has(String(m._id)));
    const now = new Date();

    if (unrecorded !== "leave" && missing.length > 0) {
      const status = unrecorded === "excused" ? MinistryAttendanceStatus.Excused : MinistryAttendanceStatus.Absent;
      const docs = missing.map((m) => ({
        sessionId: s._id,
        organizationId: ctx.orgId,
        ministryId: ctx.ministryId,
        membershipId: m._id,
        scheduledStartAt: s.scheduledStartAt,
        status,
        actualArrivalAt: null,
        recordedAt: now,
        lateMinutes: null,
        recordingMethod: AttendanceRecordingMethod.Finalization,
        recordedByMembershipId: ctx.membership?._id ?? null,
        correctionReason: "",
        audit: [
          {
            at: now,
            byMembershipId: ctx.membership?._id ?? null,
            byName: this.actorName(ctx),
            previousStatus: null,
            newStatus: status,
            previousArrivalAt: null,
            newArrivalAt: null,
            previousLateMinutes: null,
            newLateMinutes: null,
            method: AttendanceRecordingMethod.Finalization,
            reason: "No check-in when the session was finalized.",
            afterFinalization: false,
          },
        ],
      }));
      try {
        await this.recordModel.insertMany(docs, { ordered: false });
      } catch (err) {
        if (!isDuplicateKey(err) && !(err as { writeErrors?: unknown[] }).writeErrors) throw err;
      }
    }

    await this.logAction(ctx, s, "finalized", unrecorded === "leave" ? "" : `${missing.length} without check-in marked ${unrecorded}`, {
      state: AttendanceSessionState.Finalized,
      finalizedAt: now,
      finalizedByMembershipId: ctx.membership?._id ?? null,
      expectedSnapshot: expected.map((m) => m._id),
    });
    return this.sessionDetail(organizationId, ministryId, userId, sessionId);
  }

  async reopen(organizationId: string, ministryId: string, userId: string, sessionId: string, reason: string) {
    const ctx = await this.context(organizationId, ministryId, userId);
    this.requireManage(ctx);
    if (!ctx.settings.allowReopen) throw new ForbiddenException("Reopening finalized sessions is turned off for this ministry.");
    const s = await this.loadSession(ctx, sessionId);
    if (s.state !== AttendanceSessionState.Finalized) throw new BadRequestException("Only finalized sessions can be reopened.");
    await this.logAction(ctx, s, "reopened", String(reason ?? "").slice(0, 500), { state: AttendanceSessionState.Scheduled, finalizedAt: null });
    return this.sessionDetail(organizationId, ministryId, userId, sessionId);
  }

  async cancel(organizationId: string, ministryId: string, userId: string, sessionId: string, reason: string) {
    const ctx = await this.context(organizationId, ministryId, userId);
    this.requireManage(ctx);
    const s = await this.loadSession(ctx, sessionId);
    if (s.state === AttendanceSessionState.Finalized) throw new BadRequestException("Reopen this session before canceling it.");
    const note = String(reason ?? "").slice(0, 500);
    await this.logAction(ctx, s, "canceled", note, { state: AttendanceSessionState.Canceled, cancelReason: note });
    return this.sessionDetail(organizationId, ministryId, userId, sessionId);
  }

  async restore(organizationId: string, ministryId: string, userId: string, sessionId: string) {
    const ctx = await this.context(organizationId, ministryId, userId);
    this.requireManage(ctx);
    const s = await this.loadSession(ctx, sessionId);
    if (s.state !== AttendanceSessionState.Canceled) throw new BadRequestException("This session isn't canceled.");
    await this.logAction(ctx, s, "restored", "", { state: AttendanceSessionState.Scheduled, cancelReason: "" });
    return this.sessionDetail(organizationId, ministryId, userId, sessionId);
  }

  async setWindow(organizationId: string, ministryId: string, userId: string, sessionId: string, action: "open" | "close") {
    const ctx = await this.context(organizationId, ministryId, userId);
    this.requireManage(ctx);
    const s = await this.loadSession(ctx, sessionId);
    if (s.state !== AttendanceSessionState.Scheduled) throw new BadRequestException("This session isn't open for check-in.");
    const now = new Date();
    const set =
      action === "open"
        ? { checkInOpensAt: now, ...(new Date(s.checkInClosesAt) <= now ? { checkInClosesAt: new Date(now.getTime() + 3 * 3_600_000) } : {}) }
        : { checkInClosesAt: now };
    await this.logAction(ctx, s, action === "open" ? "check-in opened" : "check-in closed", "", set);
    return this.sessionDetail(organizationId, ministryId, userId, sessionId);
  }

  /** One-time session for a meeting that isn't on the schedule. */
  async createManualSession(
    organizationId: string,
    ministryId: string,
    userId: string,
    input: { title: string; date: string; startTime: string; endTime?: string; location?: string },
  ) {
    const ctx = await this.context(organizationId, ministryId, userId);
    this.requireManage(ctx);
    const title = String(input.title ?? "").trim().slice(0, 160);
    if (!title) throw new BadRequestException("Enter a meeting name.");
    if (!isYmd(input.date) || !isHhmm(input.startTime)) throw new BadRequestException("Enter a date and start time.");
    if (input.endTime && !isHhmm(input.endTime)) throw new BadRequestException("End time must look like 15:00.");
    const tz = ctx.settings.timeZone;
    const start = zonedLocalToUtc(input.date, input.startTime, tz);
    const end = input.endTime ? zonedLocalToUtc(input.endTime > input.startTime ? input.date : addDays(input.date, 1), input.endTime, tz) : null;
    const { opens, closes } = this.windowFor(start, end, ctx.settings);
    const key = `x:${new Types.ObjectId().toHexString()}`;
    const doc = await this.sessionModel.create({
      organizationId: ctx.orgId,
      ministryId: ctx.ministryId,
      occurrenceKey: key,
      sourceType: "manual",
      sourceId: null,
      occurrenceDate: input.date,
      title,
      location: String(input.location ?? "").slice(0, 300),
      scheduledStartAt: start,
      scheduledEndAt: end,
      timeZone: tz,
      checkInOpensAt: opens,
      checkInClosesAt: closes,
      checkInToken: randomBytes(24).toString("base64url"),
      createdByMembershipId: ctx.membership?._id ?? null,
    });
    return this.sessionDetail(organizationId, ministryId, userId, String(doc._id));
  }

  /* ==========================================================================
     QR & MEMBER CHECK-IN
     ========================================================================== */

  async qr(organizationId: string, ministryId: string, userId: string, sessionId: string) {
    const ctx = await this.context(organizationId, ministryId, userId);
    this.requireManage(ctx);
    if (!ctx.settings.qrCheckIn) throw new ForbiddenException("QR check-in is turned off for this ministry.");
    const s = await this.loadSession(ctx, sessionId, true);
    return {
      sessionId: String(s._id),
      token: s.checkInToken,
      title: s.title,
      occurrenceDate: s.occurrenceDate,
      scheduledStartAt: new Date(s.scheduledStartAt).toISOString(),
      checkInOpensAt: new Date(s.checkInOpensAt).toISOString(),
      checkInClosesAt: new Date(s.checkInClosesAt).toISOString(),
      timeZone: s.timeZone,
      status: this.displayStatus(s),
    };
  }

  /** What a member sees before checking in (no secrets). */
  async checkInInfo(organizationId: string, ministryId: string, userId: string, sessionId: string) {
    const ctx = await this.context(organizationId, ministryId, userId);
    const s = await this.loadSession(ctx, sessionId);
    const mine = ctx.membership
      ? ((await this.recordModel.findOne({ sessionId: s._id, membershipId: ctx.membership._id }).lean().exec()) as unknown as LeanRecord | null)
      : null;
    return {
      ministryName: ctx.ministry.name,
      session: this.sessionView(s, undefined),
      selfCheckIn: ctx.settings.selfCheckIn,
      qrCheckIn: ctx.settings.qrCheckIn,
      isMember: ctx.membership?.status === MembershipStatus.Active,
      myRecord: mine ? this.recordView(mine, await this.names([mine.membershipId, mine.recordedByMembershipId]), s) : null,
    };
  }

  async checkIn(organizationId: string, ministryId: string, userId: string, sessionId: string, token?: string) {
    const ctx = await this.context(organizationId, ministryId, userId);
    const membership = await this.membersService.requireActiveMembership(organizationId, userId);
    const s = await this.loadSession(ctx, sessionId, true);

    const method = token ? AttendanceRecordingMethod.QrCode : AttendanceRecordingMethod.MemberSelfCheckIn;
    if (token) {
      if (!ctx.settings.qrCheckIn) throw new ForbiddenException("QR check-in is turned off for this ministry.");
      if (token !== s.checkInToken) throw new ForbiddenException("This QR code isn't valid for this meeting.");
    } else if (!ctx.settings.selfCheckIn) {
      throw new ForbiddenException("Self check-in is turned off. Scan the meeting's QR code or ask a leader.");
    }

    const existing = (await this.recordModel.findOne({ sessionId: s._id, membershipId: membership._id }).lean().exec()) as unknown as LeanRecord | null;
    const confirmation = async (r: LeanRecord, already: boolean) => ({
      already,
      meeting: s.title,
      occurrenceDate: s.occurrenceDate,
      timeZone: s.timeZone,
      scheduledStartAt: new Date(s.scheduledStartAt).toISOString(),
      record: this.recordView(r, await this.names([r.membershipId, r.recordedByMembershipId]), s),
    });
    if (existing) return confirmation(existing, true);

    if (s.state === AttendanceSessionState.Canceled) throw new BadRequestException("This meeting was canceled.");
    if (s.state !== AttendanceSessionState.Scheduled) throw new BadRequestException("Check-in for this meeting is closed.");
    const now = new Date();
    if (now < new Date(s.checkInOpensAt)) throw new BadRequestException("Check-in hasn't opened yet.");
    if (now > new Date(s.checkInClosesAt)) throw new BadRequestException("Check-in has closed. Ask a ministry leader to record your attendance.");

    const inMinistry = ((membership as unknown as { departmentIds?: Types.ObjectId[] }).departmentIds ?? []).some((d) => sameId(d, ctx.ministryId));
    if (!inMinistry && !ctx.settings.allowVisitors) throw new ForbiddenException("Only members of this ministry can check in.");

    const official = officialArrival(now, new Date(s.scheduledStartAt));
    const status = official.status === "late" ? MinistryAttendanceStatus.Late : MinistryAttendanceStatus.Present;
    try {
      const doc = await this.recordModel.create({
        sessionId: s._id,
        organizationId: ctx.orgId,
        ministryId: ctx.ministryId,
        membershipId: membership._id,
        scheduledStartAt: s.scheduledStartAt,
        status,
        actualArrivalAt: now,
        recordedAt: now,
        lateMinutes: official.lateMinutes,
        recordingMethod: method,
        recordedByMembershipId: membership._id,
        correctionReason: "",
        audit: [
          {
            at: now,
            byMembershipId: membership._id,
            byName: (membership as unknown as { profile?: { displayName?: string } }).profile?.displayName ?? "",
            previousStatus: null,
            newStatus: status,
            previousArrivalAt: null,
            newArrivalAt: now,
            previousLateMinutes: null,
            newLateMinutes: official.lateMinutes,
            method,
            reason: "",
            afterFinalization: false,
          },
        ],
      });
      return confirmation(doc.toObject() as unknown as LeanRecord, false);
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
      const again = (await this.recordModel.findOne({ sessionId: s._id, membershipId: membership._id }).lean().exec()) as unknown as LeanRecord;
      return confirmation(again, true);
    }
  }

  /* ==========================================================================
     MEMBER HISTORY
     ========================================================================== */

  async memberHistory(organizationId: string, ministryId: string, userId: string, membershipId: string | "me") {
    const ctx = await this.context(organizationId, ministryId, userId);
    const targetId = membershipId === "me" ? (ctx.membership ? String(ctx.membership._id) : "") : membershipId;
    if (!targetId) throw new ForbiddenException("You are not a member of this organization.");
    const isSelf = ctx.membership && sameId(ctx.membership._id, targetId);
    if (!ctx.canView && !(isSelf && ctx.settings.membersSeeOwnHistory)) throw new ForbiddenException("You can't view this attendance history.");

    const target = (await this.membershipModel
      .findOne({ _id: this.toId(targetId, "member ID"), organizationId: ctx.orgId })
      .select("profile departmentIds status")
      .lean()
      .exec()) as unknown as LeanMember | null;
    if (!target) throw new NotFoundException("Member not found.");
    const inMinistryNow = (target.departmentIds ?? []).some((d) => sameId(d, ctx.ministryId)) && target.status === MembershipStatus.Active;

    const now = new Date();
    const sessions = (await this.sessionModel
      .find({ ministryId: ctx.ministryId, scheduledStartAt: { $lte: new Date(now.getTime() + 14 * 86_400_000) } })
      .sort({ scheduledStartAt: -1 })
      .limit(200)
      .lean()
      .exec()) as unknown as LeanSession[];
    const records = (await this.recordModel.find({ membershipId: target._id, ministryId: ctx.ministryId }).lean().exec()) as unknown as LeanRecord[];
    const recBySession = new Map(records.map((r) => [String(r.sessionId), r]));
    const names = await this.names([target._id, ...records.map((r) => r.recordedByMembershipId)]);

    const rows = sessions
      .filter((s) => {
        if (recBySession.has(String(s._id))) return true;
        if (s.state === AttendanceSessionState.Finalized && s.expectedSnapshot) return s.expectedSnapshot.some((x) => sameId(x, target._id));
        return inMinistryNow;
      })
      .map((s) => {
        const r = recBySession.get(String(s._id));
        const future = new Date(s.scheduledStartAt) > now;
        return {
          session: this.sessionView(s, undefined, now),
          record: r ? this.recordView(r, names, s) : null,
          outcome: s.state === AttendanceSessionState.Canceled ? "canceled" : r ? r.status : future ? "pending" : "not_checked_in",
        };
      });

    // Eligible = past, not canceled, not excused. Not-checked-in on finalized sessions counts as absent.
    const summary = { expected: 0, attended: 0, present: 0, late: 0, absent: 0, excused: 0, notCheckedIn: 0, rate: null as number | null, averageLateMinutes: null as number | null };
    let lateTotal = 0;
    let lateWithMinutes = 0;
    for (const row of rows) {
      if (row.outcome === "canceled" || row.outcome === "pending") continue;
      if (row.outcome === "excused") {
        summary.excused++;
        continue;
      }
      summary.expected++;
      if (row.outcome === "present") summary.present++;
      else if (row.outcome === "late") {
        summary.late++;
        if (row.record?.lateMinutes != null) {
          lateTotal += row.record.lateMinutes;
          lateWithMinutes++;
        }
      } else if (row.outcome === "absent") summary.absent++;
      else summary.notCheckedIn++;
    }
    summary.attended = summary.present + summary.late;
    summary.rate = summary.expected > 0 ? Math.round((summary.attended / summary.expected) * 100) : null;
    summary.averageLateMinutes = lateWithMinutes > 0 ? Math.round((lateTotal / lateWithMinutes) * 10) / 10 : null;

    return {
      member: { membershipId: String(target._id), name: target.profile?.displayName ?? "Member", avatarUrl: target.profile?.avatarUrl ?? null },
      summary,
      rows,
      denominator: "Past sessions of this ministry you were expected at. Excused and canceled sessions are not counted.",
    };
  }

  /* ==========================================================================
     REPORTS & EXPORT
     ========================================================================== */

  async report(organizationId: string, ministryId: string, userId: string, q: { from?: string; to?: string }) {
    const ctx = await this.context(organizationId, ministryId, userId);
    this.requireView(ctx);
    const tz = ctx.settings.timeZone;
    const today = localYmd(new Date(), tz);
    const from = isYmd(q.from) ? q.from : addDays(today, -90);
    const to = isYmd(q.to) ? q.to : today;
    const sessions = (await this.sessionModel
      .find({
        ministryId: ctx.ministryId,
        scheduledStartAt: { $gte: zonedLocalToUtc(from, "00:00", tz), $lte: zonedLocalToUtc(to, "23:59", tz) },
      })
      .sort({ scheduledStartAt: 1 })
      .lean()
      .exec()) as unknown as LeanSession[];
    const expected = await this.expectedMembers(ctx);
    const counts = await this.countsFor(sessions, expected);
    const held = sessions.filter((s) => s.state !== AttendanceSessionState.Canceled && new Date(s.scheduledStartAt) <= new Date());

    const records = (await this.recordModel.find({ sessionId: { $in: held.map((s) => s._id) } }).lean().exec()) as unknown as LeanRecord[];
    const names = await this.names([...records.map((r) => r.membershipId), ...records.flatMap((r) => (r.audit ?? []).map((a) => a.byMembershipId))]);

    // Participation per member.
    const perMember = new Map<string, { present: number; late: number; absent: number; excused: number; lateMinutes: number; lateCount: number }>();
    for (const r of records) {
      const p = perMember.get(String(r.membershipId)) ?? { present: 0, late: 0, absent: 0, excused: 0, lateMinutes: 0, lateCount: 0 };
      p[r.status] += 1;
      if (r.status === MinistryAttendanceStatus.Late && r.lateMinutes != null) {
        p.lateMinutes += r.lateMinutes;
        p.lateCount++;
      }
      perMember.set(String(r.membershipId), p);
    }
    const participation = [...perMember.entries()]
      .map(([id, p]) => ({
        membershipId: id,
        name: names.get(id)?.name ?? "Member",
        attended: p.present + p.late,
        present: p.present,
        late: p.late,
        absent: p.absent,
        excused: p.excused,
        averageLateMinutes: p.lateCount ? Math.round((p.lateMinutes / p.lateCount) * 10) / 10 : null,
      }))
      .sort((a, b) => b.attended - a.attended);

    const corrections = records
      .flatMap((r) =>
        (r.audit ?? [])
          .filter((a) => a.previousStatus !== null)
          .map((a) => ({
            memberName: names.get(String(r.membershipId))?.name ?? "Member",
            sessionTitle: held.find((s) => sameId(s._id, r.sessionId))?.title ?? "",
            occurrenceDate: held.find((s) => sameId(s._id, r.sessionId))?.occurrenceDate ?? "",
            at: new Date(a.at).toISOString(),
            byName: a.byName || names.get(String(a.byMembershipId))?.name || "",
            previousStatus: a.previousStatus,
            newStatus: a.newStatus,
            reason: a.reason,
            afterFinalization: a.afterFinalization,
          })),
      )
      .sort((a, b) => b.at.localeCompare(a.at));

    const manualCount = records.filter((r) => r.recordingMethod === AttendanceRecordingMethod.Manual).length;
    const totals = held.reduce(
      (t, s) => {
        const c = counts.get(String(s._id))!;
        t.present += c.present;
        t.late += c.late;
        t.absent += c.absent;
        t.excused += c.excused;
        t.eligible += Math.max(0, c.expected - c.excused);
        return t;
      },
      { present: 0, late: 0, absent: 0, excused: 0, eligible: 0 },
    );

    return {
      from,
      to,
      sessionsHeld: held.length,
      sessionsCanceled: sessions.filter((s) => s.state === AttendanceSessionState.Canceled).length,
      totals: { ...totals, averageRate: totals.eligible > 0 ? Math.round(((totals.present + totals.late) / totals.eligible) * 100) : null },
      trend: held.map((s) => this.sessionView(s, counts.get(String(s._id)))),
      participation,
      corrections,
      manualCount,
      denominator: "Attendance rate = (present + late) ÷ (expected members − excused). Canceled sessions are excluded.",
    };
  }

  async exportCsv(organizationId: string, ministryId: string, userId: string, q: { sessionId?: string; from?: string; to?: string }): Promise<{ filename: string; csv: string }> {
    const ctx = await this.context(organizationId, ministryId, userId);
    this.requireView(ctx);
    const tz = ctx.settings.timeZone;
    let sessions: LeanSession[];
    if (q.sessionId) {
      sessions = [await this.loadSession(ctx, q.sessionId)];
    } else {
      const today = localYmd(new Date(), tz);
      const from = isYmd(q.from) ? q.from : addDays(today, -90);
      const to = isYmd(q.to) ? q.to : today;
      sessions = (await this.sessionModel
        .find({ ministryId: ctx.ministryId, scheduledStartAt: { $gte: zonedLocalToUtc(from, "00:00", tz), $lte: zonedLocalToUtc(to, "23:59", tz) } })
        .sort({ scheduledStartAt: 1 })
        .lean()
        .exec()) as unknown as LeanSession[];
    }
    const expected = await this.expectedMembers(ctx);
    const records = (await this.recordModel.find({ sessionId: { $in: sessions.map((s) => s._id) } }).lean().exec()) as unknown as LeanRecord[];
    const names = await this.names([...expected.map((m) => m._id), ...records.map((r) => r.membershipId), ...records.map((r) => r.recordedByMembershipId)]);

    const esc = (v: unknown) => {
      const t = v == null ? "" : String(v);
      return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const lines = [
      ["Date", "Meeting", "Scheduled start", "Session status", "Member", "Status", "Actual arrival", "Late (minutes)", "Method", "Recorded by", "Recorded at", "Reason"].join(","),
    ];
    for (const s of sessions) {
      const recs = records.filter((r) => sameId(r.sessionId, s._id));
      const ids = new Set(recs.map((r) => String(r.membershipId)));
      const exp = s.state === AttendanceSessionState.Finalized && s.expectedSnapshot ? s.expectedSnapshot.map(String) : expected.map((m) => String(m._id));
      const status = this.displayStatus(s);
      const start = localHhmm(new Date(s.scheduledStartAt), s.timeZone);
      for (const r of recs) {
        lines.push(
          [
            s.occurrenceDate,
            s.title,
            start,
            status,
            names.get(String(r.membershipId))?.name ?? "Member",
            r.status,
            r.actualArrivalAt ? localHhmm(new Date(r.actualArrivalAt), s.timeZone) : "",
            r.lateMinutes ?? "",
            r.recordingMethod,
            r.recordedByMembershipId ? (names.get(String(r.recordedByMembershipId))?.name ?? "") : "",
            new Date(r.recordedAt).toISOString(),
            r.correctionReason ?? "",
          ]
            .map(esc)
            .join(","),
        );
      }
      if (s.state !== AttendanceSessionState.Canceled) {
        for (const id of exp.filter((x) => !ids.has(x))) {
          lines.push([s.occurrenceDate, s.title, start, status, names.get(id)?.name ?? "Member", "not checked in", "", "", "", "", "", ""].map(esc).join(","));
        }
      }
    }
    const safe = ctx.ministry.name.replace(/[^\w-]+/g, "-").replace(/-+/g, "-").toLowerCase();
    const filename = q.sessionId && sessions[0] ? `${safe}-attendance-${sessions[0].occurrenceDate}.csv` : `${safe}-attendance.csv`;
    return { filename, csv: "﻿" + lines.join("\r\n") };
  }

  /* ==========================================================================
     SETTINGS
     ========================================================================== */

  async updateSettings(organizationId: string, ministryId: string, userId: string, input: Partial<MinistryAttendanceSettings>) {
    const ctx = await this.context(organizationId, ministryId, userId);
    this.requireManage(ctx);
    const next: MinistryAttendanceSettings = { ...ctx.settings };
    const bools: (keyof MinistryAttendanceSettings)[] = [
      "qrCheckIn",
      "selfCheckIn",
      "manualAttendance",
      "allowCorrections",
      "requireCorrectionReason",
      "allowCorrectionsAfterFinalize",
      "allowReopen",
      "allowVisitors",
      "membersSeeOwnHistory",
    ];
    for (const k of bools) if (typeof input[k] === "boolean") (next as unknown as Record<string, unknown>)[k] = input[k];
    for (const k of ["opensMinutesBefore", "closesMinutesAfter"] as const) {
      if (input[k] !== undefined) {
        const n = Math.floor(Number(input[k]));
        if (!Number.isFinite(n) || n < 0 || n > 24 * 60) throw new BadRequestException("Check-in window must be between 0 and 1440 minutes.");
        next[k] = n;
      }
    }
    if (input.timeZone !== undefined) {
      if (!isValidTimeZone(String(input.timeZone))) throw new BadRequestException("Unknown time zone.");
      next.timeZone = String(input.timeZone);
    }
    await this.departmentModel.updateOne({ _id: ctx.ministryId }, { $set: { attendanceSettings: next } });
    return next;
  }

  /** Used by the ministry overview's "Avg. Attendance" (finalized sessions). */
  async averageRate(organizationId: string, ministryId: string): Promise<number | null> {
    const ctx = await this.context(organizationId, ministryId, null);
    const sessions = (await this.sessionModel
      .find({ ministryId: ctx.ministryId, state: AttendanceSessionState.Finalized })
      .sort({ scheduledStartAt: -1 })
      .limit(12)
      .lean()
      .exec()) as unknown as LeanSession[];
    if (sessions.length === 0) return null;
    const counts = await this.countsFor(sessions, await this.expectedMembers(ctx));
    const rates = sessions.map((s) => counts.get(String(s._id))?.rate).filter((r): r is number => r != null);
    return rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null;
  }
}
