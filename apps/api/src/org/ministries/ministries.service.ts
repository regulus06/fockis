/**
 * ministries.service.ts
 * -----------------------------------------------------------------------------
 * Ministries management on top of Church Departments:
 *
 *   dashboard        stats + every ministry the viewer may see, with counts
 *   activities       ministry events (the existing church events, departmentId)
 *   policy           owner-controlled "who can create ministries"
 *   proposals        draft → submitted → under review / more info →
 *                    approved / rejected → converted (creates the ministry)
 *   applications     member applications to join (optional auto-approve)
 *   members          ministry roster with leader titles and teams
 *   teams            teams inside a ministry
 *   finances         budget requests with an approval workflow
 *   documents        files kept in the church media library, tagged per ministry
 *   reports          per-ministry and church-wide figures
 *   audit            per-ministry activity log
 *
 * Reuses: DepartmentsService (create), MembersService (department membership),
 * church events, church media + its upload storage, ministry attendance,
 * Fockis notifications. Every permission is checked here, on the server,
 * through MinistryAccessService.
 * -----------------------------------------------------------------------------
 */

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Department, DepartmentDocument } from '../departments/schemas/department.schema';
import { DepartmentsService, ministryMediaTag } from '../departments/services/departments.service';
import { Membership, MembershipDocument } from '../members/schemas/membership.schema';
import { MembersService } from '../members/services/members.service';
import { ChurchEvent, ChurchEventDocument } from '../events/schemas/church-event.schema';
import { ChurchMedia, ChurchMediaDocument, ChurchMediaType, ChurchMediaVisibility } from '../media/schemas/church-media.schema';
import { ChurchMediaService, MEDIA_UPLOAD_TYPES } from '../media/services/church-media.service';
import { MinistryAttendanceService } from '../ministry-attendance/ministry-attendance.service';
import { MembershipStatus } from '../enums/membership-status.enum';
import { NotificationsService } from '../../notifications/notifications.service';
import { MinistryAccessService, sameId, type MinistryActor, type MinistryRights } from './ministry-access.service';
import {
  FINANCE_CATEGORIES,
  MINISTRY_CATEGORIES,
  MinistryApplication,
  MinistryApplicationDocument,
  MinistryAuditLog,
  MinistryAuditLogDocument,
  MinistryFinanceRequest,
  MinistryFinanceRequestDocument,
  MinistryProposal,
  MinistryProposalDocument,
  MinistryTeam,
  MinistryTeamDocument,
  POLICY_ROLES,
  type MinistrySettings,
  type PolicyRole,
  type ProposalStatus,
} from './ministry.schemas';

type AnyModel = Model<any>;
type LeanMinistry = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  description?: string;
  departmentType?: string;
  photoUrl?: string | null;
  leaderIds?: Types.ObjectId[];
  leaderTitles?: Record<string, string>;
  isArchived?: boolean;
  category?: string;
  ministryStatus?: string;
  ministrySettings?: Partial<MinistrySettings>;
  createdByUserId?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
};
type LeanMember = { _id: Types.ObjectId; userId: Types.ObjectId; role?: string; status?: string; joinedAt?: Date; departmentIds?: Types.ObjectId[]; profile?: { displayName?: string; avatarUrl?: string | null; email?: string } };

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d ? new Date(String(d)).toISOString() : null);
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const nameOf = (m?: { profile?: { displayName?: string } } | null) => m?.profile?.displayName?.trim() || 'Member';

@Injectable()
export class MinistriesService {
  constructor(
    @InjectModel(Department.name) private readonly departmentModel: Model<DepartmentDocument>,
    @InjectModel(Membership.name) private readonly membershipModel: Model<MembershipDocument>,
    @InjectModel(ChurchEvent.name) private readonly eventModel: Model<ChurchEventDocument>,
    @InjectModel(ChurchMedia.name) private readonly mediaModel: Model<ChurchMediaDocument>,
    @InjectModel(MinistryProposal.name) private readonly proposalModel: Model<MinistryProposalDocument>,
    @InjectModel(MinistryApplication.name) private readonly applicationModel: Model<MinistryApplicationDocument>,
    @InjectModel(MinistryTeam.name) private readonly teamModel: Model<MinistryTeamDocument>,
    @InjectModel(MinistryFinanceRequest.name) private readonly financeModel: Model<MinistryFinanceRequestDocument>,
    @InjectModel(MinistryAuditLog.name) private readonly auditModel: Model<MinistryAuditLogDocument>,
    private readonly access: MinistryAccessService,
    private readonly departments: DepartmentsService,
    private readonly membersService: MembersService,
    private readonly mediaService: ChurchMediaService,
    private readonly attendance: MinistryAttendanceService,
    private readonly notifications: NotificationsService,
  ) {}

  private get loose() {
    return {
      dept: this.departmentModel as unknown as AnyModel,
      member: this.membershipModel as unknown as AnyModel,
      event: this.eventModel as unknown as AnyModel,
      media: this.mediaModel as unknown as AnyModel,
      proposal: this.proposalModel as unknown as AnyModel,
      app: this.applicationModel as unknown as AnyModel,
      team: this.teamModel as unknown as AnyModel,
      finance: this.financeModel as unknown as AnyModel,
      audit: this.auditModel as unknown as AnyModel,
    };
  }

  private oid(v: string, label: string) {
    return this.access.toId(v, label);
  }

  private ministryLink(organizationId: string, ministryId: string, tab?: string) {
    return `/organizations/${organizationId}/ministries/${ministryId}${tab ? `?tab=${tab}` : ''}`;
  }

  private dashboardLink(organizationId: string, tab?: string) {
    return `/organizations/${organizationId}/ministries${tab ? `?tab=${tab}` : ''}`;
  }

  /** Fockis bell notifications. Failures never break the action. */
  private async notify(userIds: Array<string | Types.ObjectId | null | undefined>, title: string, message: string, link: string, entityId?: string) {
    const unique = [...new Set(userIds.filter(Boolean).map(String))];
    await Promise.all(
      unique.map((recipientId) =>
        this.notifications
          .create({ recipientId, type: 'SYSTEM', title, message: message.slice(0, 300), entityId, entityType: 'church_ministry', link } as any)
          .catch(() => undefined),
      ),
    );
  }

  /** User IDs of the ministry's leaders. */
  private async leaderUserIds(m: LeanMinistry): Promise<string[]> {
    if (!m.leaderIds?.length) return [];
    const rows = (await this.loose.member.find({ _id: { $in: m.leaderIds }, status: MembershipStatus.Active }).select('userId').lean().exec()) as LeanMember[];
    return rows.map((r) => String(r.userId));
  }

  /** Owner + everyone whose role may review proposals and finances. */
  private async reviewerUserIds(organizationId: string): Promise<string[]> {
    const policy = await this.access.policy(organizationId);
    const roles = POLICY_ROLES.filter((r) => ['full', 'create'].includes(policy.roles[r as PolicyRole]));
    const [ownerId, rows] = await Promise.all([
      this.membersService.getOrganizationCreatorId(organizationId).catch(() => null),
      roles.length
        ? this.loose.member
            .find({ organizationId: this.oid(organizationId, 'Organization ID'), status: MembershipStatus.Active, role: { $in: roles } })
            .select('userId')
            .limit(30)
            .lean()
            .exec()
        : Promise.resolve([]),
    ]);
    return [ownerId ? String(ownerId) : null, ...(rows as LeanMember[]).map((r) => String(r.userId))].filter((x): x is string => Boolean(x));
  }

  /* ==========================================================================
     DASHBOARD
     ========================================================================== */

  async dashboard(organizationId: string, userId: string) {
    const actor = await this.access.actor(organizationId, userId);
    if (!actor.active) throw new ForbiddenException('Ministries are available to active members of this church.');
    const orgId = this.oid(organizationId, 'Organization ID');
    const now = new Date();
    const since = new Date(now.getTime() - 90 * 86400000);

    const all = (await this.loose.dept.find({ organizationId: orgId }).lean().exec()) as LeanMinistry[];
    const visible = all.filter((d) => this.access.canSee(actor, d) || (actor.canCreate && d.isArchived));
    const ids = visible.map((d) => d._id);

    const [memberCounts, upcoming, recent, leaderDocs, pendingApps, distinctMembers] = await Promise.all([
      this.loose.member.aggregate([
        { $match: { organizationId: orgId, status: MembershipStatus.Active, departmentIds: { $in: ids } } },
        { $unwind: '$departmentIds' },
        { $match: { departmentIds: { $in: ids } } },
        { $group: { _id: '$departmentIds', n: { $sum: 1 } } },
      ]),
      this.loose.event.aggregate([
        { $match: { organizationId: orgId, departmentId: { $in: ids }, startsAt: { $gte: now } } },
        { $group: { _id: '$departmentId', n: { $sum: 1 } } },
      ]),
      this.loose.event.aggregate([
        { $match: { organizationId: orgId, departmentId: { $in: ids }, startsAt: { $gte: since, $lt: now } } },
        { $group: { _id: '$departmentId', n: { $sum: 1 } } },
      ]),
      this.loose.member
        .find({ _id: { $in: [...new Set(visible.flatMap((d) => (d.leaderIds ?? []).map(String)))].map((x) => new Types.ObjectId(x)) } })
        .select('profile userId status')
        .lean()
        .exec(),
      this.loose.app.aggregate([{ $match: { organizationId: orgId, ministryId: { $in: ids }, status: 'pending' } }, { $group: { _id: '$ministryId', n: { $sum: 1 } } }]),
      this.loose.member.countDocuments({
        organizationId: orgId,
        status: MembershipStatus.Active,
        departmentIds: { $in: visible.filter((d) => !d.isArchived).map((d) => d._id) },
      }),
    ]);

    const countMap = (rows: Array<{ _id: unknown; n: number }>) => new Map(rows.map((r) => [String(r._id), r.n]));
    const members = countMap(memberCounts);
    const up = countMap(upcoming);
    const rec = countMap(recent);
    const apps = countMap(pendingApps);
    const leaders = new Map((leaderDocs as LeanMember[]).map((l) => [String(l._id), l]));
    const myDepts = new Set(((actor.membership as unknown as { departmentIds?: Types.ObjectId[] } | null)?.departmentIds ?? []).map(String));

    const ministries = visible.map((d) => {
      const id = String(d._id);
      const settings = this.access.settingsOf(d);
      const isLeader = Boolean(actor.membershipId && (d.leaderIds ?? []).some((x) => sameId(x, actor.membershipId)));
      const leaderList = (d.leaderIds ?? [])
        .map((l) => leaders.get(String(l)))
        .filter((l): l is LeanMember => Boolean(l))
        .map((l) => ({ membershipId: String(l._id), displayName: nameOf(l), avatarUrl: l.profile?.avatarUrl ?? null }));
      const canManage = actor.canCreate || (isLeader && actor.level !== 'restricted' && actor.level !== 'none');
      return {
        id,
        name: d.name,
        description: d.description ?? '',
        category: MinistryAccessService.categoryOf(d),
        status: MinistryAccessService.statusOf(d),
        photoUrl: d.photoUrl ?? null,
        iconKey: settings.iconKey,
        color: settings.color,
        visibility: settings.visibility,
        joinMode: settings.joinMode,
        memberCount: members.get(id) ?? 0,
        leaders: leaderList,
        upcomingActivities: up.get(id) ?? 0,
        recentActivities: rec.get(id) ?? 0,
        pendingApplications: canManage ? (apps.get(id) ?? 0) : 0,
        isMember: myDepts.has(id),
        isLeader,
        canManage,
        createdAt: iso(d.createdAt),
        updatedAt: iso(d.updatedAt),
      };
    });

    const live = ministries.filter((m) => m.status !== 'archived');
    const leaderIds = new Set(visible.filter((d) => !d.isArchived).flatMap((d) => (d.leaderIds ?? []).map(String)));

    const [proposalCount, myAppCount] = await Promise.all([
      actor.canReview
        ? this.loose.proposal.countDocuments({ organizationId: orgId, status: { $in: ['submitted', 'under_review'] } })
        : this.loose.proposal.countDocuments({ organizationId: orgId, proposedByUserId: this.oid(userId, 'User ID'), status: { $in: ['submitted', 'under_review', 'more_info'] } }),
      actor.membershipId ? this.loose.app.countDocuments({ organizationId: orgId, membershipId: new Types.ObjectId(actor.membershipId), status: 'pending' }) : 0,
    ]);
    const managedPending = ministries.reduce((sum, m) => sum + m.pendingApplications, 0);

    return {
      viewer: {
        isOwner: actor.isOwner,
        role: actor.role,
        level: actor.level,
        membershipId: actor.membershipId,
        canCreate: actor.canCreate,
        canPropose: actor.canPropose,
        canReview: actor.canReview,
        canConfigure: actor.canConfigure,
      },
      policy: await this.access.policy(organizationId),
      stats: {
        totalMinistries: live.length,
        activeMinistries: live.filter((m) => m.status === 'active').length,
        ministryMembers: distinctMembers,
        ministryLeaders: leaderIds.size,
        upcomingActivities: live.reduce((sum, m) => sum + m.upcomingActivities, 0),
        pendingApplications: managedPending + proposalCount + (actor.canCreate ? 0 : myAppCount),
      },
      counts: {
        all: live.length,
        mine: live.filter((m) => m.isMember || m.isLeader).length,
        applications: managedPending + proposalCount + myAppCount,
      },
      ministries,
    };
  }

  /* ==========================================================================
     ACTIVITIES (existing church events linked to a ministry)
     ========================================================================== */

  async activities(organizationId: string, userId: string, q: { when?: string; ministryId?: string }) {
    const actor = await this.access.actor(organizationId, userId);
    if (!actor.active) throw new ForbiddenException('Ministries are available to active members of this church.');
    const orgId = this.oid(organizationId, 'Organization ID');
    const all = (await this.loose.dept.find({ organizationId: orgId, isArchived: { $ne: true } }).select('name leaderIds departmentIds createdByUserId ministryStatus ministrySettings organizationId').lean().exec()) as LeanMinistry[];
    let visible = all.filter((d) => this.access.canSee(actor, d));
    if (q.ministryId) visible = visible.filter((d) => sameId(d._id, q.ministryId));
    const names = new Map(visible.map((d) => [String(d._id), d.name]));
    const now = new Date();
    const past = q.when === 'past';
    const rows = (await this.loose.event
      .find({ organizationId: orgId, departmentId: { $in: visible.map((d) => d._id) }, startsAt: past ? { $lt: now } : { $gte: now } })
      .select('title eventType startsAt endsAt location isOnline coverImageUrl departmentId requiresRsvp capacity rsvps')
      .sort({ startsAt: past ? -1 : 1 })
      .limit(100)
      .lean()
      .exec()) as Array<Record<string, any>>;
    return {
      items: rows.map((e) => ({
        id: String(e._id),
        title: String(e.title ?? ''),
        eventType: String(e.eventType ?? ''),
        startsAt: iso(e.startsAt),
        endsAt: iso(e.endsAt),
        location: e.location ?? '',
        isOnline: Boolean(e.isOnline),
        coverImageUrl: e.coverImageUrl ?? null,
        ministryId: String(e.departmentId),
        ministryName: names.get(String(e.departmentId)) ?? '',
        requiresRsvp: Boolean(e.requiresRsvp),
        capacity: e.capacity ?? null,
        going: Array.isArray(e.rsvps) ? e.rsvps.filter((r: { status?: string }) => r.status === 'going').length : 0,
      })),
    };
  }

  /* ==========================================================================
     PROPOSALS
     ========================================================================== */

  private proposalView(p: Record<string, any>, actor: MinistryActor) {
    const mine = sameId(p.proposedByUserId, actor.userId);
    return {
      id: String(p._id),
      name: p.name,
      category: p.category,
      description: p.description ?? '',
      purpose: p.purpose ?? '',
      targetAudience: p.targetAudience ?? '',
      meetingPlan: p.meetingPlan ?? '',
      resourcesNeeded: p.resourcesNeeded ?? '',
      proposedLeaderMembershipId: p.proposedLeaderMembershipId ? String(p.proposedLeaderMembershipId) : null,
      status: p.status as ProposalStatus,
      reviewNote: p.reviewNote ?? '',
      proposedByName: p.proposedByName ?? '',
      isMine: mine,
      canEdit: mine && ['draft', 'more_info'].includes(p.status),
      canReview: actor.canReview && !['draft', 'converted'].includes(p.status),
      convertedMinistryId: p.convertedMinistryId ? String(p.convertedMinistryId) : null,
      submittedAt: iso(p.submittedAt),
      reviewedAt: iso(p.reviewedAt),
      createdAt: iso(p.createdAt),
      updatedAt: iso(p.updatedAt),
      history: (p.history ?? []).map((h: Record<string, any>) => ({ status: h.status, note: h.note ?? '', byName: h.byName ?? '', at: iso(h.at) })),
    };
  }

  async listProposals(organizationId: string, userId: string, q: { status?: string; scope?: string }) {
    const actor = await this.access.actor(organizationId, userId);
    if (!actor.active) throw new ForbiddenException('Ministries are available to active members of this church.');
    const filter: Record<string, unknown> = { organizationId: this.oid(organizationId, 'Organization ID') };
    if (!actor.canReview || q.scope === 'mine') filter.proposedByUserId = this.oid(userId, 'User ID');
    else filter.$or = [{ status: { $ne: 'draft' } }, { proposedByUserId: this.oid(userId, 'User ID') }];
    if (q.status) filter.status = q.status;
    const rows = (await this.loose.proposal.find(filter).sort({ updatedAt: -1 }).limit(200).lean().exec()) as Array<Record<string, any>>;
    return { items: rows.map((p) => this.proposalView(p, actor)) };
  }

  private cleanProposal(input: Record<string, unknown>) {
    const category = String(input.category ?? 'other');
    const out: Record<string, unknown> = {
      name: str(input.name, 120),
      category: (MINISTRY_CATEGORIES as readonly string[]).includes(category) ? category : 'other',
      description: str(input.description, 2000),
      purpose: str(input.purpose, 2000),
      targetAudience: str(input.targetAudience, 300),
      meetingPlan: str(input.meetingPlan, 500),
      resourcesNeeded: str(input.resourcesNeeded, 1000),
    };
    const leader = String(input.proposedLeaderMembershipId ?? '');
    out.proposedLeaderMembershipId = Types.ObjectId.isValid(leader) ? new Types.ObjectId(leader) : null;
    return out;
  }

  async createProposal(organizationId: string, userId: string, input: Record<string, unknown>) {
    const actor = await this.access.actor(organizationId, userId);
    if (!actor.canPropose) throw new ForbiddenException('Ministry proposals are not open for your role.');
    const data = this.cleanProposal(input);
    if (!data.name) throw new BadRequestException('Give the ministry a name.');
    if (String(data.description).length < 10) throw new BadRequestException('Describe the ministry in a sentence or two.');
    const submit = input.submit !== false;
    const status: ProposalStatus = submit ? 'submitted' : 'draft';
    const doc = await this.loose.proposal.create({
      ...data,
      organizationId: this.oid(organizationId, 'Organization ID'),
      proposedByUserId: this.oid(userId, 'User ID'),
      proposedByMembershipId: actor.membershipId ? new Types.ObjectId(actor.membershipId) : null,
      proposedByName: actor.displayName,
      status,
      submittedAt: submit ? new Date() : null,
      history: [{ status, note: '', byUserId: this.oid(userId, 'User ID'), byName: actor.displayName, at: new Date() }],
    });
    if (submit) await this.announceProposal(organizationId, doc, actor);
    await this.access.audit(organizationId, null, actor, submit ? 'proposal_submitted' : 'proposal_drafted', String(data.name));
    return this.proposalView(doc.toObject(), actor);
  }

  private async announceProposal(organizationId: string, doc: Record<string, any>, actor: MinistryActor) {
    const reviewers = (await this.reviewerUserIds(organizationId)).filter((id) => id !== actor.userId);
    await this.notify(reviewers, 'New ministry proposal', `${actor.displayName || 'A member'} proposed "${doc.name}".`, this.dashboardLink(organizationId, 'applications'), String(doc._id));
  }

  async updateProposal(organizationId: string, userId: string, proposalId: string, input: Record<string, unknown>) {
    const actor = await this.access.actor(organizationId, userId);
    const doc = await this.proposalModel.findOne({ _id: this.oid(proposalId, 'Proposal ID'), organizationId: this.oid(organizationId, 'Organization ID') });
    if (!doc) throw new NotFoundException('Proposal not found.');
    if (!sameId(doc.proposedByUserId, userId) || !['draft', 'more_info'].includes(doc.status)) {
      throw new ForbiddenException('Only the person who proposed it can edit a draft or answer a request for more information.');
    }
    const data = this.cleanProposal({ ...doc.toObject(), ...input });
    if (!data.name) throw new BadRequestException('Give the ministry a name.');
    doc.set(data);
    if (input.submit === true) {
      doc.status = 'submitted';
      doc.submittedAt = new Date();
      doc.history.push({ status: 'submitted', note: str(input.note, 500), byUserId: new Types.ObjectId(userId), byName: actor.displayName, at: new Date() } as any);
      await doc.save();
      await this.announceProposal(organizationId, doc.toObject(), actor);
    } else {
      await doc.save();
    }
    return this.proposalView(doc.toObject(), actor);
  }

  async withdrawProposal(organizationId: string, userId: string, proposalId: string) {
    const doc = await this.proposalModel.findOne({ _id: this.oid(proposalId, 'Proposal ID'), organizationId: this.oid(organizationId, 'Organization ID') });
    if (!doc) throw new NotFoundException('Proposal not found.');
    if (!sameId(doc.proposedByUserId, userId)) throw new ForbiddenException('Only the person who proposed it can withdraw it.');
    if (['approved', 'converted'].includes(doc.status)) throw new ConflictException('Approved proposals cannot be withdrawn.');
    await doc.deleteOne();
    return { ok: true };
  }

  async reviewProposal(organizationId: string, userId: string, proposalId: string, input: { status?: string; note?: string }) {
    const actor = await this.access.actor(organizationId, userId);
    if (!actor.canReview) throw new ForbiddenException('You do not have permission to review ministry proposals.');
    const next = String(input.status ?? '');
    if (!['under_review', 'more_info', 'approved', 'rejected'].includes(next)) throw new BadRequestException('Choose a valid review decision.');
    const note = str(input.note, 1000);
    if ((next === 'more_info' || next === 'rejected') && !note) throw new BadRequestException('Add a note so the member knows what to do next.');
    const doc = await this.proposalModel.findOne({ _id: this.oid(proposalId, 'Proposal ID'), organizationId: this.oid(organizationId, 'Organization ID') });
    if (!doc) throw new NotFoundException('Proposal not found.');
    if (['draft', 'converted'].includes(doc.status)) throw new ConflictException('This proposal cannot be reviewed.');
    doc.status = next as ProposalStatus;
    doc.reviewNote = note;
    doc.reviewedByUserId = new Types.ObjectId(userId);
    doc.reviewedAt = new Date();
    doc.history.push({ status: next, note, byUserId: new Types.ObjectId(userId), byName: actor.displayName, at: new Date() } as any);
    await doc.save();
    const label: Record<string, string> = {
      under_review: 'is under review',
      more_info: 'needs more information',
      approved: 'was approved',
      rejected: 'was not approved',
    };
    await this.notify([String(doc.proposedByUserId)], 'Ministry proposal update', `Your proposal "${doc.name}" ${label[next]}.${note ? ` ${note}` : ''}`, this.dashboardLink(organizationId, 'applications'), String(doc._id));
    await this.access.audit(organizationId, null, actor, `proposal_${next}`, doc.name);
    return this.proposalView(doc.toObject(), actor);
  }

  /** Approved proposal → a real ministry (created as a draft or published). */
  async convertProposal(organizationId: string, userId: string, proposalId: string, input: { publish?: boolean }) {
    const actor = await this.access.requireCreate(organizationId, userId);
    const doc = await this.proposalModel.findOne({ _id: this.oid(proposalId, 'Proposal ID'), organizationId: this.oid(organizationId, 'Organization ID') });
    if (!doc) throw new NotFoundException('Proposal not found.');
    if (doc.status !== 'approved') throw new ConflictException('Approve the proposal before creating the ministry.');

    let leaderIds: string[] = [];
    if (doc.proposedLeaderMembershipId) {
      const leader = await this.membersService.getMembershipByIdOrNull(organizationId, String(doc.proposedLeaderMembershipId));
      if (leader?.status === MembershipStatus.Active) leaderIds = [String(leader._id)];
    }
    const created = await this.departments.create(
      organizationId,
      {
        name: doc.name,
        departmentType: MinistryAccessService.typeForCategory(doc.category),
        description: doc.description || doc.purpose,
        category: doc.category,
        ministryStatus: input.publish === false ? 'draft' : 'active',
        leaderIds,
        ministrySettings: { mission: doc.purpose },
      } as any,
      userId,
    );
    // Proposer and suggested leader join the new ministry.
    for (const mid of [doc.proposedByMembershipId ? String(doc.proposedByMembershipId) : null, ...leaderIds]) {
      if (mid) await this.membersService.adjustDepartmentMembership(mid, created.id, true).catch(() => undefined);
    }
    doc.status = 'converted';
    doc.convertedMinistryId = new Types.ObjectId(created.id);
    doc.history.push({ status: 'converted', note: '', byUserId: new Types.ObjectId(userId), byName: actor.displayName, at: new Date() } as any);
    await doc.save();
    await this.notify([String(doc.proposedByUserId)], 'Your ministry was created', `"${doc.name}" is now a ministry of your church.`, this.ministryLink(organizationId, created.id), created.id);
    return { proposal: this.proposalView(doc.toObject(), actor), ministry: created };
  }

  /* ==========================================================================
     APPLICATIONS
     ========================================================================== */

  private appView(a: Record<string, any>, ministryName = '') {
    return {
      id: String(a._id),
      ministryId: String(a.ministryId),
      ministryName,
      membershipId: String(a.membershipId),
      applicantName: a.applicantName ?? '',
      message: a.message ?? '',
      status: a.status,
      autoApproved: Boolean(a.autoApproved),
      reviewNote: a.reviewNote ?? '',
      reviewedAt: iso(a.reviewedAt),
      createdAt: iso(a.createdAt),
    };
  }

  async apply(organizationId: string, userId: string, ministryId: string, input: { message?: string }) {
    const actor = await this.access.actor(organizationId, userId);
    if (!actor.active || !actor.membership) throw new ForbiddenException('Only active members can join ministries.');
    const m = (await this.access.loadMinistry(organizationId, ministryId, false)) as LeanMinistry;
    if (MinistryAccessService.statusOf(m) !== 'active') throw new ForbiddenException('This ministry is not accepting members right now.');
    if (!this.access.canSee(actor, m)) throw new NotFoundException('This ministry could not be found.');
    const settings = this.access.settingsOf(m);
    if (settings.joinMode === 'invite') throw new ForbiddenException('Members are added to this ministry by its leaders.');
    const already = ((actor.membership as unknown as { departmentIds?: Types.ObjectId[] }).departmentIds ?? []).some((d) => sameId(d, m._id));
    if (already) throw new ConflictException('You are already a member of this ministry.');
    const pending = await this.loose.app.findOne({ ministryId: m._id, membershipId: new Types.ObjectId(actor.membershipId!), status: 'pending' }).lean().exec();
    if (pending) throw new ConflictException('Your application is already waiting for review.');
    await this.departments.assertCapacity(m, settings);

    const auto = settings.joinMode === 'open' || settings.autoApprove;
    let app;
    try {
      app = await this.loose.app.create({
        organizationId: m.organizationId,
        ministryId: m._id,
        membershipId: new Types.ObjectId(actor.membershipId!),
        userId: new Types.ObjectId(userId),
        applicantName: actor.displayName,
        message: str(input.message, 1000),
        status: auto ? 'approved' : 'pending',
        autoApproved: auto,
        reviewedAt: auto ? new Date() : null,
      });
    } catch (err) {
      if ((err as { code?: number })?.code === 11000) throw new ConflictException('Your application is already waiting for review.');
      throw err;
    }
    if (auto) {
      await this.membersService.adjustDepartmentMembership(actor.membershipId!, String(m._id), true);
      await this.access.audit(organizationId, m._id, actor, 'member_joined', actor.displayName);
    } else if (settings.notifyLeadersOnApplication) {
      const managers = [...(await this.leaderUserIds(m))];
      if (!managers.length) managers.push(...(await this.reviewerUserIds(organizationId)));
      await this.notify(managers, 'New ministry application', `${actor.displayName || 'A member'} applied to join ${m.name}.`, this.ministryLink(organizationId, String(m._id), 'members'), String(app._id));
    }
    return this.appView(app.toObject(), m.name);
  }

  async withdrawApplication(organizationId: string, userId: string, applicationId: string) {
    const app = await this.applicationModel.findOne({ _id: this.oid(applicationId, 'Application ID'), organizationId: this.oid(organizationId, 'Organization ID') });
    if (!app) throw new NotFoundException('Application not found.');
    if (!sameId(app.userId, userId)) throw new ForbiddenException('You can only withdraw your own application.');
    if (app.status !== 'pending') throw new ConflictException('Only pending applications can be withdrawn.');
    app.status = 'withdrawn';
    await app.save();
    return this.appView(app.toObject());
  }

  /** Applications the viewer reviews (managed ministries) plus their own. */
  async listApplications(organizationId: string, userId: string, q: { ministryId?: string; status?: string; scope?: string }) {
    const actor = await this.access.actor(organizationId, userId);
    if (!actor.active) throw new ForbiddenException('Ministries are available to active members of this church.');
    const orgId = this.oid(organizationId, 'Organization ID');
    const depts = (await this.loose.dept.find({ organizationId: orgId }).select('name leaderIds organizationId').lean().exec()) as LeanMinistry[];
    const names = new Map(depts.map((d) => [String(d._id), d.name]));

    let managed: Types.ObjectId[] = [];
    if (q.scope !== 'mine') {
      for (const d of depts) {
        if (q.ministryId && !sameId(d._id, q.ministryId)) continue;
        const r = await this.access.rights(organizationId, userId, d, actor);
        if (r.canManage) managed.push(d._id);
      }
    }
    const or: Record<string, unknown>[] = [];
    if (managed.length) or.push({ ministryId: { $in: managed } });
    if (actor.membershipId && q.scope !== 'managed') or.push({ membershipId: new Types.ObjectId(actor.membershipId) });
    if (!or.length) return { items: [], canReview: false };
    const filter: Record<string, unknown> = { organizationId: orgId, $or: or };
    if (q.ministryId) filter.ministryId = this.oid(q.ministryId, 'Ministry ID');
    filter.status = q.status ? q.status : { $ne: 'withdrawn' };
    const rows = (await this.loose.app.find(filter).sort({ status: 1, createdAt: -1 }).limit(300).lean().exec()) as Array<Record<string, any>>;
    const managedSet = new Set(managed.map(String));
    return {
      canReview: managed.length > 0,
      items: rows.map((a) => ({ ...this.appView(a, names.get(String(a.ministryId)) ?? ''), canReview: managedSet.has(String(a.ministryId)) && a.status === 'pending', isMine: sameId(a.userId, userId) })),
    };
  }

  async reviewApplication(organizationId: string, userId: string, applicationId: string, input: { decision?: string; note?: string }) {
    const app = await this.applicationModel.findOne({ _id: this.oid(applicationId, 'Application ID'), organizationId: this.oid(organizationId, 'Organization ID') });
    if (!app) throw new NotFoundException('Application not found.');
    const rights = await this.access.requireManage(organizationId, userId, String(app.ministryId));
    if (app.status !== 'pending') throw new ConflictException('This application was already handled.');
    const approve = input.decision === 'approve';
    if (!approve && input.decision !== 'reject') throw new BadRequestException('Choose approve or reject.');
    const m = (await this.access.loadMinistry(organizationId, String(app.ministryId), false)) as LeanMinistry;
    if (approve) {
      const member = await this.membersService.getMembershipByIdOrNull(organizationId, String(app.membershipId));
      if (!member || member.status !== MembershipStatus.Active) throw new ConflictException('This person is no longer an active member.');
      await this.departments.assertCapacity(m, this.access.settingsOf(m));
      await this.membersService.adjustDepartmentMembership(String(app.membershipId), String(app.ministryId), true);
    }
    app.status = approve ? 'approved' : 'rejected';
    app.reviewNote = str(input.note, 500);
    app.reviewedByUserId = new Types.ObjectId(userId);
    app.reviewedAt = new Date();
    await app.save();
    await this.notify(
      [String(app.userId)],
      approve ? `Welcome to ${m.name}` : `${m.name} application`,
      approve ? `Your application to join ${m.name} was approved.` : `Your application to join ${m.name} was not approved.${app.reviewNote ? ` ${app.reviewNote}` : ''}`,
      this.ministryLink(organizationId, String(m._id)),
      String(app._id),
    );
    await this.access.audit(organizationId, m._id, rights.actor, approve ? 'application_approved' : 'application_rejected', app.applicantName);
    return this.appView(app.toObject(), m.name);
  }

  /* ==========================================================================
     ACCESS SUMMARY FOR ONE MINISTRY (drives the ministry page tabs)
     ========================================================================== */

  async myAccess(organizationId: string, userId: string, ministryId: string) {
    const m = (await this.access.loadMinistry(organizationId, ministryId)) as LeanMinistry;
    const r = await this.access.rights(organizationId, userId, m);
    const pending = r.actor.membershipId
      ? await this.loose.app.findOne({ ministryId: m._id, membershipId: new Types.ObjectId(r.actor.membershipId), status: 'pending' }).select('_id').lean().exec()
      : null;
    const settings = this.access.settingsOf(m);
    return {
      ministryId,
      status: MinistryAccessService.statusOf(m),
      category: MinistryAccessService.categoryOf(m),
      settings,
      isMember: r.isMember,
      isLeader: r.isLeader,
      isTeamLeader: r.isTeamLeader,
      canManage: r.canManage,
      canCoordinate: r.canCoordinate,
      canGovern: r.canGovern,
      canViewMembers: r.canViewMembers,
      canViewFinances: r.canViewFinances,
      canRequestFunds: r.canRequestFunds,
      canApproveFunds: r.canApproveFunds,
      hasPendingApplication: Boolean(pending),
      pendingApplicationId: pending ? String((pending as { _id: unknown })._id) : null,
    };
  }

  private async requireViewMembers(organizationId: string, userId: string, ministryId: string): Promise<MinistryRights> {
    const r = await this.access.rights(organizationId, userId, ministryId);
    if (!r.canViewMembers) throw new ForbiddenException('The member list of this ministry is visible to its members and leaders.');
    return r;
  }

  /* ==========================================================================
     MEMBERS
     ========================================================================== */

  async members(organizationId: string, userId: string, ministryId: string) {
    await this.requireViewMembers(organizationId, userId, ministryId);
    const m = (await this.access.loadMinistry(organizationId, ministryId)) as LeanMinistry;
    const [rows, teams] = await Promise.all([
      this.loose.member
        .find({ organizationId: m.organizationId, departmentIds: m._id, status: MembershipStatus.Active })
        .select('profile.displayName profile.avatarUrl role joinedAt userId')
        .sort({ 'profile.displayName': 1 })
        .limit(1000)
        .lean()
        .exec(),
      this.loose.team.find({ ministryId: m._id }).select('name memberIds leaderMembershipId').lean().exec(),
    ]);
    const titles = (m.leaderTitles ?? {}) as Record<string, string>;
    const leaderSet = new Set((m.leaderIds ?? []).map(String));
    const teamRows = teams as Array<{ _id: Types.ObjectId; name: string; memberIds?: Types.ObjectId[]; leaderMembershipId?: Types.ObjectId | null }>;
    return {
      items: (rows as LeanMember[]).map((r) => {
        const id = String(r._id);
        return {
          membershipId: id,
          displayName: nameOf(r),
          avatarUrl: r.profile?.avatarUrl ?? null,
          churchRole: r.role ?? 'member',
          isLeader: leaderSet.has(id),
          leaderTitle: titles[id] ?? '',
          teams: teamRows.filter((t) => (t.memberIds ?? []).some((x) => sameId(x, id)) || sameId(t.leaderMembershipId, id)).map((t) => t.name),
          joinedChurchAt: iso(r.joinedAt),
        };
      }),
    };
  }

  /** Active church members not yet in the ministry (for "Add member"). */
  async candidates(organizationId: string, userId: string, ministryId: string, search = '') {
    await this.access.requireManage(organizationId, userId, ministryId);
    const m = (await this.access.loadMinistry(organizationId, ministryId)) as LeanMinistry;
    const filter: Record<string, unknown> = { organizationId: m.organizationId, status: MembershipStatus.Active, departmentIds: { $ne: m._id } };
    const s = str(search, 60);
    if (s) filter['profile.displayName'] = { $regex: s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const rows = (await this.loose.member.find(filter).select('profile.displayName profile.avatarUrl role').sort({ 'profile.displayName': 1 }).limit(30).lean().exec()) as LeanMember[];
    return { items: rows.map((r) => ({ membershipId: String(r._id), displayName: nameOf(r), avatarUrl: r.profile?.avatarUrl ?? null, churchRole: r.role ?? 'member' })) };
  }

  /* ==========================================================================
     TEAMS
     ========================================================================== */

  private teamView(t: Record<string, any>, names: Map<string, string>) {
    return {
      id: String(t._id),
      name: t.name,
      description: t.description ?? '',
      leaderMembershipId: t.leaderMembershipId ? String(t.leaderMembershipId) : null,
      leaderName: t.leaderMembershipId ? (names.get(String(t.leaderMembershipId)) ?? '') : '',
      members: (t.memberIds ?? []).map((id: Types.ObjectId) => ({ membershipId: String(id), displayName: names.get(String(id)) ?? 'Member' })),
      createdAt: iso(t.createdAt),
    };
  }

  async listTeams(organizationId: string, userId: string, ministryId: string) {
    const r = await this.access.rights(organizationId, userId, ministryId);
    if (!r.isMember && !r.canCoordinate) throw new ForbiddenException('Teams are visible to members of this ministry.');
    const m = (await this.access.loadMinistry(organizationId, ministryId)) as LeanMinistry;
    const teams = (await this.loose.team.find({ ministryId: m._id }).sort({ name: 1 }).lean().exec()) as Array<Record<string, any>>;
    const ids = [...new Set(teams.flatMap((t) => [...(t.memberIds ?? []), t.leaderMembershipId].filter(Boolean).map(String)))];
    const people = (await this.loose.member.find({ _id: { $in: ids.map((i) => new Types.ObjectId(i)) } }).select('profile.displayName').lean().exec()) as LeanMember[];
    const names = new Map(people.map((p) => [String(p._id), nameOf(p)]));
    return { canManage: r.canManage, items: teams.map((t) => this.teamView(t, names)) };
  }

  private async ministryMemberIds(m: LeanMinistry, ids: unknown[]): Promise<Types.ObjectId[]> {
    const clean = [...new Set((ids ?? []).map(String).filter((x) => Types.ObjectId.isValid(x)))].slice(0, 500);
    if (!clean.length) return [];
    const rows = (await this.loose.member
      .find({ _id: { $in: clean.map((x) => new Types.ObjectId(x)) }, organizationId: m.organizationId, departmentIds: m._id, status: MembershipStatus.Active })
      .select('_id')
      .lean()
      .exec()) as LeanMember[];
    return rows.map((r) => r._id);
  }

  async saveTeam(organizationId: string, userId: string, ministryId: string, teamId: string | null, input: Record<string, unknown>) {
    const m = (await this.access.loadMinistry(organizationId, ministryId, false)) as LeanMinistry;
    const r = await this.access.rights(organizationId, userId, m);
    const team = teamId ? await this.teamModel.findOne({ _id: this.oid(teamId, 'Team ID'), ministryId: m._id }) : null;
    if (teamId && !team) throw new NotFoundException('Team not found.');
    // Managers edit everything; a team's own leader may update its roster.
    const ownTeamLeader = Boolean(team && r.actor.membershipId && sameId(team.leaderMembershipId, r.actor.membershipId));
    if (!r.canManage && !ownTeamLeader) throw new ForbiddenException('You do not have permission to manage teams in this ministry.');

    const name = input.name !== undefined ? str(input.name, 80) : team?.name;
    if (!name) throw new BadRequestException('Give the team a name.');
    const data: Record<string, unknown> = { name };
    if (input.description !== undefined) data.description = str(input.description, 600);
    if (input.memberIds !== undefined) data.memberIds = await this.ministryMemberIds(m, input.memberIds as unknown[]);
    if (input.leaderMembershipId !== undefined && r.canManage) {
      const [leader] = input.leaderMembershipId ? await this.ministryMemberIds(m, [input.leaderMembershipId]) : [];
      if (input.leaderMembershipId && !leader) throw new BadRequestException('The team leader must be a member of this ministry.');
      data.leaderMembershipId = leader ?? null;
    }
    const dup = await this.loose.team.findOne({ ministryId: m._id, name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }, ...(team ? { _id: { $ne: team._id } } : {}) }).lean().exec();
    if (dup) throw new ConflictException(`A team named "${name}" already exists in this ministry.`);

    let saved;
    if (team) {
      team.set(data);
      saved = await team.save();
    } else {
      saved = await this.loose.team.create({ ...data, organizationId: m.organizationId, ministryId: m._id, createdByUserId: new Types.ObjectId(userId) });
    }
    await this.access.audit(organizationId, m._id, r.actor, team ? 'team_updated' : 'team_created', name);
    return (await this.listTeams(organizationId, userId, ministryId)).items.find((t) => t.id === String(saved._id));
  }

  async deleteTeam(organizationId: string, userId: string, ministryId: string, teamId: string) {
    const r = await this.access.requireManage(organizationId, userId, ministryId);
    const team = await this.teamModel.findOne({ _id: this.oid(teamId, 'Team ID'), ministryId: this.oid(ministryId, 'Ministry ID') });
    if (!team) throw new NotFoundException('Team not found.');
    await team.deleteOne();
    await this.access.audit(organizationId, ministryId, r.actor, 'team_deleted', team.name);
    return { ok: true };
  }

  /* ==========================================================================
     FINANCES
     ========================================================================== */

  private financeView(f: Record<string, any>, canApprove: boolean, userId: string) {
    return {
      id: String(f._id),
      title: f.title,
      category: f.category,
      amount: f.amount,
      currency: f.currency,
      neededBy: f.neededBy ?? '',
      description: f.description ?? '',
      status: f.status,
      requestedByName: f.requestedByName ?? '',
      reviewNote: f.reviewNote ?? '',
      reviewedByName: f.reviewedByName ?? '',
      reviewedAt: iso(f.reviewedAt),
      createdAt: iso(f.createdAt),
      canReview: canApprove && ['pending', 'approved'].includes(f.status),
      canCancel: sameId(f.requestedByUserId, userId) && f.status === 'pending',
    };
  }

  async finances(organizationId: string, userId: string, ministryId: string) {
    const m = (await this.access.loadMinistry(organizationId, ministryId)) as LeanMinistry;
    const r = await this.access.rights(organizationId, userId, m);
    if (!r.canViewFinances) throw new ForbiddenException('Ministry finances are visible to ministry leaders and church leadership.');
    const rows = (await this.loose.finance.find({ ministryId: m._id }).sort({ createdAt: -1 }).limit(300).lean().exec()) as Array<Record<string, any>>;
    const settings = this.access.settingsOf(m);
    const sum = (st: string[]) => Math.round(rows.filter((x) => st.includes(x.status)).reduce((a, x) => a + Number(x.amount || 0), 0) * 100) / 100;
    const year = new Date().getFullYear();
    const thisYear = rows.filter((x) => new Date(x.createdAt).getFullYear() === year);
    const committed = Math.round(thisYear.filter((x) => ['approved', 'paid'].includes(x.status)).reduce((a, x) => a + Number(x.amount || 0), 0) * 100) / 100;
    return {
      canRequest: r.canRequestFunds,
      canApprove: r.canApproveFunds,
      summary: {
        currency: settings.currency,
        annualBudget: settings.annualBudget,
        pending: sum(['pending']),
        approved: sum(['approved']),
        paid: sum(['paid']),
        committedThisYear: committed,
        remaining: settings.annualBudget == null ? null : Math.round((settings.annualBudget - committed) * 100) / 100,
      },
      items: rows.map((f) => this.financeView(f, r.canApproveFunds, userId)),
    };
  }

  async createFinanceRequest(organizationId: string, userId: string, ministryId: string, input: Record<string, unknown>) {
    const m = (await this.access.loadMinistry(organizationId, ministryId, false)) as LeanMinistry;
    const r = await this.access.rights(organizationId, userId, m);
    if (!r.canRequestFunds) throw new ForbiddenException('You cannot submit finance requests for this ministry.');
    const amount = Math.round(Number(input.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) throw new BadRequestException('Enter an amount greater than zero.');
    const title = str(input.title, 140);
    if (!title) throw new BadRequestException('Describe what the money is for.');
    const category = (FINANCE_CATEGORIES as readonly string[]).includes(String(input.category)) ? String(input.category) : 'other';
    const neededBy = /^\d{4}-\d{2}-\d{2}$/.test(String(input.neededBy ?? '')) ? String(input.neededBy) : '';
    const settings = this.access.settingsOf(m);
    const doc = await this.loose.finance.create({
      organizationId: m.organizationId,
      ministryId: m._id,
      requestedByUserId: new Types.ObjectId(userId),
      requestedByName: r.actor.displayName,
      title,
      category,
      amount,
      currency: settings.currency,
      neededBy,
      description: str(input.description, 2000),
    });
    const reviewers = (await this.reviewerUserIds(organizationId)).filter((id) => id !== userId);
    await this.notify(reviewers, 'Ministry finance request', `${m.name}: ${title} (${amount.toFixed(2)} ${settings.currency}).`, this.ministryLink(organizationId, ministryId, 'finances'), String(doc._id));
    await this.access.audit(organizationId, m._id, r.actor, 'finance_requested', `${title} — ${amount.toFixed(2)} ${settings.currency}`);
    return this.financeView(doc.toObject(), r.canApproveFunds, userId);
  }

  async reviewFinanceRequest(organizationId: string, userId: string, ministryId: string, requestId: string, input: { status?: string; note?: string }) {
    const m = (await this.access.loadMinistry(organizationId, ministryId)) as LeanMinistry;
    const r = await this.access.rights(organizationId, userId, m);
    const doc = await this.financeModel.findOne({ _id: this.oid(requestId, 'Request ID'), ministryId: m._id });
    if (!doc) throw new NotFoundException('Finance request not found.');
    const next = String(input.status ?? '');
    if (next === 'cancelled') {
      if (!sameId(doc.requestedByUserId, userId) || doc.status !== 'pending') throw new ForbiddenException('Only the requester can cancel a pending request.');
    } else {
      if (!r.canApproveFunds) throw new ForbiddenException('Only church leadership can approve ministry spending.');
      const allowed: Record<string, string[]> = { pending: ['approved', 'rejected'], approved: ['paid', 'rejected'] };
      if (!(allowed[doc.status] ?? []).includes(next)) throw new ConflictException('This change is not possible for the request.');
      if (next === 'rejected' && !str(input.note, 10)) throw new BadRequestException('Add a note explaining the decision.');
    }
    doc.status = next as any;
    doc.reviewNote = str(input.note, 1000) || doc.reviewNote;
    if (next !== 'cancelled') {
      doc.reviewedByUserId = new Types.ObjectId(userId);
      doc.reviewedByName = r.actor.displayName;
      doc.reviewedAt = new Date();
      await this.notify([String(doc.requestedByUserId)], 'Finance request update', `${m.name}: "${doc.title}" was marked ${next}.`, this.ministryLink(organizationId, ministryId, 'finances'), String(doc._id));
    }
    await doc.save();
    await this.access.audit(organizationId, m._id, r.actor, `finance_${next}`, doc.title);
    return this.financeView(doc.toObject(), r.canApproveFunds, userId);
  }

  /* ==========================================================================
     DOCUMENTS (church media library, tagged per ministry)
     ========================================================================== */

  async documents(organizationId: string, userId: string, ministryId: string) {
    const m = (await this.access.loadMinistry(organizationId, ministryId)) as LeanMinistry;
    const r = await this.access.rights(organizationId, userId, m);
    if (!r.isMember && !r.canCoordinate) throw new ForbiddenException('Ministry documents are available to its members.');
    const rows = (await this.loose.media
      .find({ organizationId: m.organizationId, tags: ministryMediaTag(ministryId), mediaType: ChurchMediaType.Document })
      .select('title description fileUrl fileName mimeType fileSize createdAt visibility')
      .sort({ createdAt: -1 })
      .limit(300)
      .lean()
      .exec()) as Array<Record<string, any>>;
    return {
      canUpload: r.canCoordinate,
      items: rows.map((d) => ({
        id: String(d._id),
        title: d.title,
        description: d.description ?? '',
        fileUrl: d.fileUrl,
        fileName: d.fileName ?? null,
        mimeType: d.mimeType ?? null,
        fileSize: d.fileSize ?? null,
        visibility: d.visibility,
        createdAt: iso(d.createdAt),
      })),
    };
  }

  async uploadDocument(organizationId: string, userId: string, ministryId: string, file: any, input: { title?: string; description?: string }) {
    let r: MinistryRights;
    try {
      r = await this.access.requireCoordinate(organizationId, userId, ministryId);
    } catch (err) {
      if (file?.path) await import('fs').then((fs) => fs.promises.unlink(file.path)).catch(() => undefined);
      throw err;
    }
    const kind = MEDIA_UPLOAD_TYPES[String(file?.mimetype ?? '').toLowerCase()];
    if (!kind || kind.type !== ChurchMediaType.Document) {
      if (file?.path) await import('fs').then((fs) => fs.promises.unlink(file.path)).catch(() => undefined);
      throw new BadRequestException('Upload a document (PDF, Word, PowerPoint, Excel, TXT or CSV).');
    }
    const stored = (await this.mediaService.storeAuthorizedUpload(organizationId, file, ChurchMediaType.Document)) as {
      fileUrl: string;
      fileName?: string;
      mimeType?: string;
      fileSize?: number;
    };
    const doc = await this.loose.media.create({
      organizationId: this.oid(organizationId, 'Organization ID'),
      title: str(input.title, 160) || String(file.originalname ?? 'Document').replace(/\.[^.]+$/, ''),
      description: str(input.description, 1000),
      mediaType: ChurchMediaType.Document,
      visibility: ChurchMediaVisibility.Members,
      fileUrl: stored.fileUrl,
      fileName: stored.fileName ?? file.originalname ?? null,
      mimeType: stored.mimeType ?? file.mimetype ?? null,
      fileSize: stored.fileSize ?? file.size ?? null,
      category: 'resource',
      tags: [ministryMediaTag(ministryId)],
      publishedAt: new Date(),
      uploadedByUserId: new Types.ObjectId(userId),
      uploadedByMembershipId: r.actor.membershipId ? new Types.ObjectId(r.actor.membershipId) : null,
    });
    await this.access.audit(organizationId, ministryId, r.actor, 'document_uploaded', String(doc.title));
    return { id: String(doc._id), title: doc.title, fileUrl: doc.fileUrl };
  }

  async deleteDocument(organizationId: string, userId: string, ministryId: string, documentId: string) {
    const r = await this.access.requireManage(organizationId, userId, ministryId);
    const doc = (await this.loose.media.findOne({ _id: this.oid(documentId, 'Document ID'), organizationId: this.oid(organizationId, 'Organization ID'), tags: ministryMediaTag(ministryId) }).exec()) as any;
    if (!doc) throw new NotFoundException('Document not found.');
    // Shared library items (tagged for several ministries) only lose this ministry's tag.
    if ((doc.tags ?? []).length > 1) {
      doc.tags = (doc.tags as string[]).filter((t) => t !== ministryMediaTag(ministryId));
      await doc.save();
    } else {
      await doc.deleteOne();
    }
    await this.access.audit(organizationId, ministryId, r.actor, 'document_removed', String(doc.title));
    return { ok: true };
  }

  /* ==========================================================================
     REPORTS
     ========================================================================== */

  async ministryReport(organizationId: string, userId: string, ministryId: string) {
    const m = (await this.access.loadMinistry(organizationId, ministryId)) as LeanMinistry;
    const r = await this.access.rights(organizationId, userId, m);
    if (!r.canManage) throw new ForbiddenException('Reports are available to ministry leaders and church leadership.');
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const [members, teams, upcoming, monthly, apps, finance, avg] = await Promise.all([
      this.loose.member.countDocuments({ organizationId: m.organizationId, departmentIds: m._id, status: MembershipStatus.Active }),
      this.loose.team.countDocuments({ ministryId: m._id }),
      this.loose.event.countDocuments({ organizationId: m.organizationId, departmentId: m._id, startsAt: { $gte: now } }),
      this.loose.event.aggregate([
        { $match: { organizationId: m.organizationId, departmentId: m._id, startsAt: { $gte: start, $lt: now } } },
        { $group: { _id: { y: { $year: '$startsAt' }, m: { $month: '$startsAt' } }, n: { $sum: 1 } } },
      ]),
      this.loose.app.aggregate([{ $match: { ministryId: m._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      this.loose.finance.aggregate([{ $match: { ministryId: m._id } }, { $group: { _id: '$status', total: { $sum: '$amount' }, n: { $sum: 1 } } }]),
      this.attendance.averageRate(organizationId, ministryId).catch(() => null),
    ]);
    const months: { label: string; activities: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const row = (monthly as Array<{ _id: { y: number; m: number }; n: number }>).find((x) => x._id.y === d.getFullYear() && x._id.m === d.getMonth() + 1);
      months.push({ label: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), activities: row?.n ?? 0 });
    }
    const byStatus = (rows: Array<{ _id: string; n: number; total?: number }>) => Object.fromEntries(rows.map((x) => [x._id, { count: x.n, total: Math.round((x.total ?? 0) * 100) / 100 }]));
    const settings = this.access.settingsOf(m);
    return {
      ministry: { id: String(m._id), name: m.name, category: MinistryAccessService.categoryOf(m), status: MinistryAccessService.statusOf(m) },
      generatedAt: now.toISOString(),
      members,
      leaders: (m.leaderIds ?? []).length,
      teams,
      upcomingActivities: upcoming,
      activitiesByMonth: months,
      averageAttendance: avg,
      applications: byStatus(apps as Array<{ _id: string; n: number }>),
      finances: { currency: settings.currency, annualBudget: settings.annualBudget, byStatus: byStatus(finance as Array<{ _id: string; n: number; total: number }>) },
    };
  }

  async churchReport(organizationId: string, userId: string) {
    const actor = await this.access.actor(organizationId, userId);
    const orgId = this.oid(organizationId, 'Organization ID');
    const all = (await this.loose.dept.find({ organizationId: orgId }).lean().exec()) as LeanMinistry[];
    const rows: Array<Record<string, unknown>> = [];
    const now = new Date();
    const since = new Date(now.getTime() - 90 * 86400000);
    for (const m of all) {
      if (!actor.canCreate) {
        const r = await this.access.rights(organizationId, userId, m, actor);
        if (!r.canManage) continue;
      }
      const [members, teams, upcoming, recent, finance, avg] = await Promise.all([
        this.loose.member.countDocuments({ organizationId: orgId, departmentIds: m._id, status: MembershipStatus.Active }),
        this.loose.team.countDocuments({ ministryId: m._id }),
        this.loose.event.countDocuments({ organizationId: orgId, departmentId: m._id, startsAt: { $gte: now } }),
        this.loose.event.countDocuments({ organizationId: orgId, departmentId: m._id, startsAt: { $gte: since, $lt: now } }),
        this.loose.finance.aggregate([{ $match: { ministryId: m._id, status: { $in: ['approved', 'paid'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        m.isArchived ? Promise.resolve(null) : this.attendance.averageRate(organizationId, String(m._id)).catch(() => null),
      ]);
      const settings = this.access.settingsOf(m);
      rows.push({
        id: String(m._id),
        name: m.name,
        category: MinistryAccessService.categoryOf(m),
        status: MinistryAccessService.statusOf(m),
        members,
        leaders: (m.leaderIds ?? []).length,
        teams,
        upcomingActivities: upcoming,
        activitiesLast90Days: recent,
        averageAttendance: avg,
        currency: settings.currency,
        annualBudget: settings.annualBudget,
        approvedSpending: Math.round(((finance as Array<{ total: number }>)[0]?.total ?? 0) * 100) / 100,
      });
    }
    if (!actor.canCreate && rows.length === 0) throw new ForbiddenException('Reports are available to ministry leaders and church leadership.');
    return { generatedAt: now.toISOString(), items: rows };
  }

  /* ==========================================================================
     AUDIT
     ========================================================================== */

  async auditLog(organizationId: string, userId: string, ministryId: string) {
    await this.access.requireManage(organizationId, userId, ministryId);
    const rows = (await this.loose.audit.find({ ministryId: this.oid(ministryId, 'Ministry ID') }).sort({ createdAt: -1 }).limit(200).lean().exec()) as Array<Record<string, any>>;
    return { items: rows.map((a) => ({ id: String(a._id), action: a.action, detail: a.detail ?? '', actorName: a.actorName ?? '', createdAt: iso(a.createdAt) })) };
  }
}
