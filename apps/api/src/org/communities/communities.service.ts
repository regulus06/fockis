/**
 * communities.service.ts
 * -----------------------------------------------------------------------------
 * Groups & Communities — groups, membership, requests, invitations,
 * proposals, teams, leadership, member messaging and the dashboard.
 *
 * Groups are ChurchGroup documents; "is a member" is Membership.groupIds
 * (changed only through MembersService.adjustGroupMembership). Roles,
 * suspensions and history live in church_group_members. Every action is
 * authorised here through CommunityAccessService.
 * -----------------------------------------------------------------------------
 */

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';

import { ChurchGroup, ChurchGroupDocument } from '../groups/schemas/church-group.schema';
import { Membership, MembershipDocument } from '../members/schemas/membership.schema';
import { MembersService } from '../members/services/members.service';
import { MembershipStatus } from '../enums/membership-status.enum';
import { NotificationsService } from '../../notifications/notifications.service';
import { ConversationsService } from '../../messages/conversations.service';
import { MessagesService } from '../../messages/messages.service';
import { RegistrationMailer } from '../../events/registrations/registration-mailer';
import { CommunityAccessService, sameId, type GroupActor, type GroupRights, type LeanGroup } from './community-access.service';
import {
  GROUP_CATEGORIES,
  GROUP_ROLES,
  GroupAuditLog,
  GroupAuditLogDocument,
  GroupInvitation,
  GroupInvitationDocument,
  GroupJoinRequest,
  GroupJoinRequestDocument,
  GroupMemberRecord,
  GroupMemberRecordDocument,
  GroupProposal,
  GroupProposalDocument,
  GroupTeam,
  GroupTeamDocument,
  type GroupRole,
  type GroupSettings,
  type ProposalStatus,
} from './community.schemas';

type AnyModel = Model<any>;
type LeanMember = { _id: Types.ObjectId; userId: Types.ObjectId; role?: string; status?: string; joinedAt?: Date; groupIds?: Types.ObjectId[]; profile?: { displayName?: string; avatarUrl?: string | null; email?: string } };

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d ? new Date(String(d)).toISOString() : null);
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const nameOf = (m?: { profile?: { displayName?: string } } | null) => m?.profile?.displayName?.trim() || 'Member';
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
const ROLE_LABEL: Record<string, string> = {
  leader: 'Group Leader',
  assistant_leader: 'Assistant Leader',
  coordinator: 'Coordinator',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  member: 'Member',
};

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
  status?: 'active' | 'inactive' | 'draft';
  settings?: Partial<GroupSettings>;
  /** [{ membershipId, role, title }] */
  leadership?: { membershipId: string; role: string; title?: string }[];
}

@Injectable()
export class CommunitiesService {
  constructor(
    @InjectModel(ChurchGroup.name) private readonly groupModel: Model<ChurchGroupDocument>,
    @InjectModel(Membership.name) private readonly membershipModel: Model<MembershipDocument>,
    @InjectModel(GroupMemberRecord.name) private readonly recordModel: Model<GroupMemberRecordDocument>,
    @InjectModel(GroupJoinRequest.name) private readonly requestModel: Model<GroupJoinRequestDocument>,
    @InjectModel(GroupInvitation.name) private readonly inviteModel: Model<GroupInvitationDocument>,
    @InjectModel(GroupProposal.name) private readonly proposalModel: Model<GroupProposalDocument>,
    @InjectModel(GroupTeam.name) private readonly teamModel: Model<GroupTeamDocument>,
    @InjectModel(GroupAuditLog.name) private readonly auditModel: Model<GroupAuditLogDocument>,
    private readonly access: CommunityAccessService,
    private readonly membersService: MembersService,
    private readonly notifications: NotificationsService,
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
    private readonly mailer: RegistrationMailer,
  ) {}

  private get m() {
    return {
      group: this.groupModel as unknown as AnyModel,
      member: this.membershipModel as unknown as AnyModel,
      record: this.recordModel as unknown as AnyModel,
      request: this.requestModel as unknown as AnyModel,
      invite: this.inviteModel as unknown as AnyModel,
      proposal: this.proposalModel as unknown as AnyModel,
      team: this.teamModel as unknown as AnyModel,
      audit: this.auditModel as unknown as AnyModel,
    };
  }

  private oid(v: string, label: string) {
    return this.access.toId(v, label);
  }

  groupLink(organizationId: string, groupId: string, tab?: string) {
    return `/organizations/${organizationId}/groups/${groupId}${tab ? `?tab=${tab}` : ''}`;
  }

  dashboardLink(organizationId: string, view?: string) {
    return `/organizations/${organizationId}/groups${view ? `?view=${view}` : ''}`;
  }

  /** Fockis bell notifications; failures never break the action. */
  async notify(userIds: Array<string | Types.ObjectId | null | undefined>, title: string, message: string, link: string, entityId?: string) {
    const unique = [...new Set(userIds.filter(Boolean).map(String))];
    await Promise.all(
      unique.slice(0, 500).map((recipientId) =>
        this.notifications
          .create({ recipientId, type: 'SYSTEM', title, message: message.slice(0, 300), entityId, entityType: 'church_group', link } as any)
          .catch(() => undefined),
      ),
    );
  }

  /** Users who manage the group (leaders), falling back to church reviewers. */
  async leaderUserIds(g: LeanGroup, roles: GroupRole[] = ['leader']): Promise<string[]> {
    const recs = (await this.m.record.find({ groupId: g._id, status: 'active', role: { $in: roles } }).select('userId').lean().exec()) as { userId: Types.ObjectId }[];
    const legacy = g.leaderIds?.length ? ((await this.m.member.find({ _id: { $in: g.leaderIds } }).select('userId').lean().exec()) as LeanMember[]) : [];
    return [...new Set([...recs.map((r) => String(r.userId)), ...legacy.map((l) => String(l.userId))])];
  }

  async reviewerUserIds(organizationId: string): Promise<string[]> {
    const policy = await this.access.policy(organizationId);
    const roles = Object.entries(policy.roles)
      .filter(([, l]) => l === 'full' || l === 'create')
      .map(([r]) => r);
    const [ownerId, rows] = await Promise.all([
      this.membersService.getOrganizationCreatorId(organizationId).catch(() => null),
      roles.length
        ? this.m.member.find({ organizationId: this.oid(organizationId, 'Organization ID'), status: MembershipStatus.Active, role: { $in: roles } }).select('userId').limit(30).lean().exec()
        : [],
    ]);
    return [ownerId ? String(ownerId) : '', ...(rows as LeanMember[]).map((r) => String(r.userId))].filter(Boolean);
  }

  /** Active member user IDs of a group (optionally a team only). */
  async memberUserIds(g: LeanGroup, teamId?: string | null): Promise<string[]> {
    let ids: Types.ObjectId[] | null = null;
    if (teamId) {
      const team = (await this.m.team.findOne({ _id: this.oid(teamId, 'Team ID'), groupId: g._id }).lean().exec()) as { memberIds?: Types.ObjectId[]; leaderMembershipId?: Types.ObjectId | null } | null;
      ids = [...(team?.memberIds ?? []), ...(team?.leaderMembershipId ? [team.leaderMembershipId] : [])];
    }
    const filter: Record<string, unknown> = { organizationId: g.organizationId, groupIds: g._id, status: MembershipStatus.Active };
    if (ids) filter._id = { $in: ids };
    const rows = (await this.m.member.find(filter).select('userId').limit(2000).lean().exec()) as LeanMember[];
    return rows.map((r) => String(r.userId));
  }

  /* ==========================================================================
     SHAPES
     ========================================================================== */

  private summary<T extends Record<string, unknown>>(g: LeanGroup, extra: T) {
    const settings = this.access.settingsOf(g);
    return {
      id: String(g._id),
      name: g.name,
      description: g.description ?? '',
      category: CommunityAccessService.categoryOf(g),
      status: CommunityAccessService.statusOf(g),
      visibility: settings.visibility,
      requireApproval: settings.requireApproval,
      ministryId: g.departmentId ? String(g.departmentId) : null,
      photoUrl: g.photoUrl ?? null,
      logoUrl: g.logoUrl ?? null,
      featured: Boolean(g.featured),
      location: g.location ?? settings.meeting.location ?? '',
      capacity: g.capacity ?? null,
      createdAt: iso(g.createdAt),
      updatedAt: iso(g.updatedAt),
      ...extra,
    };
  }

  /* ==========================================================================
     DASHBOARD
     ========================================================================== */

  async dashboard(organizationId: string, userId: string) {
    const actor = await this.access.actor(organizationId, userId);
    if (!actor.active) throw new ForbiddenException('Groups are available to active members of this church.');
    const orgId = this.oid(organizationId, 'Organization ID');
    const all = (await this.m.group.find({ organizationId: orgId, deletedAt: null }).lean().exec()) as LeanGroup[];

    const myGroupIds = new Set(((actor.membership as unknown as { groupIds?: Types.ObjectId[] } | null)?.groupIds ?? []).map(String));
    const myRecs = actor.membershipId
      ? ((await this.m.record.find({ organizationId: orgId, membershipId: new Types.ObjectId(actor.membershipId) }).lean().exec()) as { groupId: Types.ObjectId; role: GroupRole; status: string }[])
      : [];
    const suspended = new Set(myRecs.filter((r) => r.status === 'suspended').map((r) => String(r.groupId)));
    const roleOf = new Map(myRecs.filter((r) => r.status === 'active').map((r) => [String(r.groupId), r.role]));
    const ledIds = new Set<string>();
    for (const g of all) {
      const id = String(g._id);
      const legacy = actor.membershipId && (g.leaderIds ?? []).some((x) => sameId(x, actor.membershipId));
      if (roleOf.get(id) && roleOf.get(id) !== 'member') ledIds.add(id);
      else if (legacy) ledIds.add(id);
    }
    for (const id of suspended) myGroupIds.delete(id);

    const visible = all.filter((g) => this.access.canList(actor, g, myGroupIds, ledIds));
    const ids = visible.map((g) => g._id);

    const [memberCounts, pendingReqs, myPending, myInvites, distinctMembers, recentActivity] = await Promise.all([
      this.m.member.aggregate([
        { $match: { organizationId: orgId, status: MembershipStatus.Active, groupIds: { $in: ids } } },
        { $unwind: '$groupIds' },
        { $match: { groupIds: { $in: ids } } },
        { $group: { _id: '$groupIds', n: { $sum: 1 } } },
      ]),
      this.m.request.aggregate([{ $match: { organizationId: orgId, groupId: { $in: ids }, status: 'pending' } }, { $group: { _id: '$groupId', n: { $sum: 1 } } }]),
      actor.membershipId ? this.m.request.find({ organizationId: orgId, membershipId: new Types.ObjectId(actor.membershipId), status: 'pending' }).select('groupId').lean().exec() : [],
      this.myInvitationFilter(organizationId, actor).then((f) => (f ? this.m.invite.countDocuments({ ...f, status: 'pending', expiresAt: { $gt: new Date() } }) : 0)),
      this.m.member.countDocuments({
        organizationId: orgId,
        status: MembershipStatus.Active,
        groupIds: { $in: visible.filter((g) => !g.isArchived).map((g) => g._id) },
      }),
      this.m.audit.aggregate([
        { $match: { organizationId: orgId, groupId: { $in: ids }, createdAt: { $gte: new Date(Date.now() - 90 * 86400000) } } },
        { $group: { _id: '$groupId', n: { $sum: 1 } } },
      ]),
    ]);
    const cm = (rows: { _id: unknown; n: number }[]) => new Map(rows.map((r) => [String(r._id), r.n]));
    const counts = cm(memberCounts);
    const pend = cm(pendingReqs);
    const activity = cm(recentActivity);
    const pendingMine = new Set((myPending as { groupId: Types.ObjectId }[]).map((r) => String(r.groupId)));

    const leaderRecs = (await this.m.record.find({ groupId: { $in: ids }, status: 'active', role: 'leader' }).select('groupId membershipId').lean().exec()) as { groupId: Types.ObjectId; membershipId: Types.ObjectId }[];
    const leaderMemberIds = [...new Set([...leaderRecs.map((r) => String(r.membershipId)), ...visible.flatMap((g) => (g.leaderIds ?? []).map(String))])];
    const leaderDocs = (await this.m.member.find({ _id: { $in: leaderMemberIds.map((x) => new Types.ObjectId(x)) } }).select('profile').lean().exec()) as LeanMember[];
    const leaderName = new Map(leaderDocs.map((l) => [String(l._id), nameOf(l)]));

    const groups = visible.map((g) => {
      const id = String(g._id);
      const isMember = myGroupIds.has(id);
      const role = roleOf.get(id) ?? (ledIds.has(id) ? 'leader' : isMember ? 'member' : null);
      const canManage = actor.canCreate || role === 'leader';
      const leaderIds = [...leaderRecs.filter((r) => sameId(r.groupId, g._id)).map((r) => String(r.membershipId)), ...(g.leaderIds ?? []).map(String)];
      const leaders = [...new Set(leaderIds)].map((x) => leaderName.get(x)).filter(Boolean) as string[];
      return this.summary(g, {
        memberCount: counts.get(id) ?? 0,
        activityScore: activity.get(id) ?? 0,
        leaders,
        isMember,
        myRole: role,
        isLeading: ledIds.has(id),
        canManage,
        hasPendingRequest: pendingMine.has(id),
        pendingRequests: canManage || (ledIds.has(id) && this.access.settingsOf(g).approver === 'leaders') ? (pend.get(id) ?? 0) : 0,
      });
    });

    const live = groups.filter((g) => g.status !== 'archived');
    const canManageAny = actor.canCreate || ledIds.size > 0;
    const requestCount = groups.reduce((a, g) => a + (g.pendingRequests as number), 0);
    const proposalCount = actor.canReview
      ? await this.m.proposal.countDocuments({ organizationId: orgId, status: { $in: ['submitted', 'under_review'] } })
      : 0;
    const deletedCount = actor.isFull ? await this.m.group.countDocuments({ organizationId: orgId, deletedAt: { $ne: null } }) : 0;

    const categories = Object.fromEntries(GROUP_CATEGORIES.map((c) => [c, live.filter((g) => g.category === c).length]));

    return {
      viewer: {
        isOwner: actor.isOwner,
        role: actor.role,
        level: actor.level,
        membershipId: actor.membershipId,
        canCreate: actor.canCreate,
        canPropose: actor.canPropose,
        canReview: actor.canReview,
        isFull: actor.isFull,
        canConfigure: actor.canConfigure,
        canManageAny,
        leadsGroups: ledIds.size,
      },
      stats: {
        totalGroups: live.length,
        totalMembers: distinctMembers,
        activeGroups: live.filter((g) => g.status === 'active').length,
        featuredGroups: live.filter((g) => g.featured).length,
      },
      counts: {
        all: live.length,
        mine: live.filter((g) => g.isLeading).length,
        featured: live.filter((g) => g.featured).length,
        joined: live.filter((g) => g.isMember).length,
        archived: groups.filter((g) => g.status === 'archived').length,
        requests: requestCount + proposalCount,
        invitations: myInvites,
        deleted: deletedCount,
      },
      categories,
      groups,
    };
  }

  /* ==========================================================================
     GROUP PROFILE
     ========================================================================== */

  async profile(organizationId: string, userId: string, groupId: string) {
    const r = await this.access.requireView(organizationId, userId, groupId);
    const g = r.group;
    const [memberCount, leaders, pendingReq, invite, teams] = await Promise.all([
      this.m.member.countDocuments({ organizationId: g.organizationId, groupIds: g._id, status: MembershipStatus.Active }),
      this.leadership(g),
      r.actor.membershipId ? this.m.request.findOne({ groupId: g._id, membershipId: new Types.ObjectId(r.actor.membershipId), status: 'pending' }).select('_id').lean().exec() : null,
      this.myInvitationFilter(organizationId, r.actor).then((f) =>
        f ? this.m.invite.findOne({ ...f, groupId: g._id, status: 'pending', expiresAt: { $gt: new Date() } }).select('_id').lean().exec() : null,
      ),
      this.m.team.countDocuments({ groupId: g._id }),
    ]);
    return {
      ...this.summary(g, {
        memberCount,
        mission: g.mission ?? '',
        objectives: g.objectives ?? '',
        language: g.language ?? '',
        meetingSchedule: g.meetingSchedule ?? '',
        teamCount: teams,
      }),
      settings: r.settings,
      leaders,
      viewer: {
        isMember: r.isMember,
        isSuspended: r.isSuspended,
        groupRole: r.groupRole,
        title: r.record?.title ?? '',
        governs: r.governs,
        canManage: r.canManage,
        canCoordinate: r.canCoordinate,
        canManageMembers: r.canManageMembers,
        canApproveRequests: r.canApproveRequests,
        canInvite: r.canInvite,
        canSeeMembers: r.canSeeMembers,
        canViewFinance: r.canViewFinance,
        canApproveChurchFunds: r.canApproveChurchFunds,
        isFull: r.actor.isFull,
        hasPendingRequest: Boolean(pendingReq),
        pendingInvitationId: invite ? String((invite as { _id: unknown })._id) : null,
        membershipId: r.actor.membershipId,
      },
    };
  }

  private async leadership(g: LeanGroup) {
    const recs = (await this.m.record.find({ groupId: g._id, status: 'active', role: { $ne: 'member' } }).lean().exec()) as { membershipId: Types.ObjectId; role: GroupRole; title: string }[];
    const ids = [...new Set([...recs.map((r) => String(r.membershipId)), ...(g.leaderIds ?? []).map(String)])];
    const people = (await this.m.member.find({ _id: { $in: ids.map((x) => new Types.ObjectId(x)) } }).select('profile userId').lean().exec()) as LeanMember[];
    const byId = new Map(people.map((p) => [String(p._id), p]));
    const order = ['leader', 'assistant_leader', 'coordinator', 'secretary', 'treasurer'];
    return ids
      .map((id) => {
        const rec = recs.find((r) => sameId(r.membershipId, id));
        const p = byId.get(id);
        const role = rec?.role ?? 'leader';
        return { membershipId: id, userId: p ? String(p.userId) : null, displayName: nameOf(p), avatarUrl: p?.profile?.avatarUrl ?? null, role, roleLabel: rec?.title || ROLE_LABEL[role], title: rec?.title ?? '' };
      })
      .sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
  }

  /* ==========================================================================
     CREATE / UPDATE / ARCHIVE / DELETE
     ========================================================================== */

  private async cleanLeadership(organizationId: string, list: GroupInput['leadership']) {
    const out: { membershipId: Types.ObjectId; role: GroupRole; title: string; userId: Types.ObjectId }[] = [];
    for (const l of (list ?? []).slice(0, 30)) {
      if (!Types.ObjectId.isValid(String(l.membershipId))) continue;
      const role = (GROUP_ROLES as readonly string[]).includes(String(l.role)) ? (l.role as GroupRole) : 'member';
      const mem = await this.membersService.getMembershipByIdOrNull(organizationId, String(l.membershipId));
      if (!mem || mem.status !== MembershipStatus.Active) throw new BadRequestException('Group leaders must be active church members.');
      if (out.some((o) => sameId(o.membershipId, mem._id))) continue;
      out.push({ membershipId: mem._id as Types.ObjectId, role, title: str(l.title, 60), userId: mem.userId as unknown as Types.ObjectId });
    }
    return out;
  }

  private groupFields(input: GroupInput, base: GroupSettings, existing?: LeanGroup) {
    const set: Record<string, unknown> = {};
    if (input.name !== undefined) {
      const name = str(input.name, 120);
      if (name.length < 2) throw new BadRequestException('Give the group a name.');
      set.name = name;
    }
    if (input.category !== undefined) {
      const c = (GROUP_CATEGORIES as readonly string[]).includes(String(input.category)) ? String(input.category) : 'custom';
      set.category = c;
      set.groupType = CommunityAccessService.typeForCategory(c);
    }
    if (input.description !== undefined) set.description = str(input.description, 2000);
    if (input.photoUrl !== undefined) set.photoUrl = input.photoUrl ? str(input.photoUrl, 600) : null;
    if (input.logoUrl !== undefined) set.logoUrl = input.logoUrl ? str(input.logoUrl, 600) : null;
    if (input.mission !== undefined) set.mission = str(input.mission, 1000);
    if (input.objectives !== undefined) set.objectives = str(input.objectives, 2000);
    if (input.language !== undefined) set.language = str(input.language, 40);
    if (input.location !== undefined) set.location = str(input.location, 300);
    if (input.capacity !== undefined) {
      const n = Number(input.capacity);
      set.capacity = input.capacity === null || !Number.isFinite(n) || n < 1 ? null : Math.min(Math.floor(n), 100000);
    }
    if (input.settings !== undefined) {
      const s = CommunityAccessService.cleanSettings(input.settings, existing ? this.access.settingsOf(existing) : base);
      set.groupSettings = s;
      const mt = s.meeting;
      if (mt.day || mt.startTime) set.meetingSchedule = [mt.frequency ? mt.frequency[0].toUpperCase() + mt.frequency.slice(1) : '', mt.day, mt.startTime && `${mt.startTime}${mt.endTime ? `–${mt.endTime}` : ''}`].filter(Boolean).join(' · ');
      if (input.location === undefined && mt.location) set.location = mt.location;
    }
    return set;
  }

  private async applyLeadership(organizationId: string, g: LeanGroup, list: Awaited<ReturnType<CommunitiesService['cleanLeadership']>>, actor: GroupActor) {
    const leaders = list.filter((l) => l.role === 'leader').map((l) => l.membershipId);
    // Leadership replaces existing roles; people leave leadership as members.
    await this.m.record.updateMany({ groupId: g._id, role: { $ne: 'member' }, membershipId: { $nin: list.map((l) => l.membershipId) } }, { $set: { role: 'member', title: '' } });
    for (const l of list) {
      await this.ensureMember(organizationId, g, String(l.membershipId), actor, 'added as leader');
      await this.m.record.updateOne({ groupId: g._id, membershipId: l.membershipId }, { $set: { role: l.role, title: l.title } });
    }
    await this.m.group.updateOne({ _id: g._id }, { $set: { leaderIds: leaders } });
  }

  async create(organizationId: string, userId: string, input: GroupInput, fromProposal = false) {
    const actor = await this.access.actor(organizationId, userId);
    if (!actor.canCreate) throw new ForbiddenException(actor.canPropose ? 'You cannot create groups directly. Propose a group for review instead.' : 'You do not have permission to create groups.');
    if (!input.name) throw new BadRequestException('Give the group a name.');
    const policy = await this.access.policy(organizationId);
    const fields = this.groupFields({ category: 'custom', settings: {}, ...input }, policy.defaults);
    let departmentId: Types.ObjectId | null = null;
    if (input.departmentId && Types.ObjectId.isValid(input.departmentId)) departmentId = new Types.ObjectId(input.departmentId);
    const leadership = await this.cleanLeadership(organizationId, input.leadership);
    const doc = await this.m.group.create({
      organizationId: this.oid(organizationId, 'Organization ID'),
      createdByUserId: this.oid(userId, 'User ID'),
      departmentId,
      leaderIds: [],
      isArchived: false,
      featured: Boolean(input.featured),
      groupStatus: input.status === 'draft' ? 'draft' : input.status === 'inactive' ? 'inactive' : 'active',
      ...fields,
    });
    const g = doc.toObject() as LeanGroup;
    if (leadership.length) await this.applyLeadership(organizationId, g, leadership, actor);
    await this.access.audit(organizationId, g._id, actor, input.status === 'draft' ? 'draft_saved' : 'created', g.name);
    if (input.status !== 'draft' && !fromProposal) {
      await this.notify(
        leadership.map((l) => String(l.userId)).filter((u) => u !== userId),
        'You lead a new group',
        `You were added to the leadership of ${g.name}.`,
        this.groupLink(organizationId, String(g._id)),
        String(g._id),
      );
    }
    return this.profile(organizationId, userId, String(g._id));
  }

  async update(organizationId: string, userId: string, groupId: string, input: GroupInput) {
    const r = await this.access.rights(organizationId, userId, groupId);
    if (!r.canManage) throw new ForbiddenException('You do not have permission to edit this group.');
    if (CommunityAccessService.statusOf(r.group) === 'archived' && input.status === undefined) throw new ConflictException('Restore the group before editing it.');
    const set = this.groupFields(input, this.access.settingsOf(r.group), r.group);
    // Church leadership decides featuring, status, ministry links and group leaders.
    if (input.featured !== undefined) {
      if (!r.governs) throw new ForbiddenException('Only church leadership can feature groups.');
      set.featured = Boolean(input.featured);
    }
    if (input.departmentId !== undefined) {
      if (!r.governs) throw new ForbiddenException('Only church leadership can link groups to ministries.');
      set.departmentId = input.departmentId && Types.ObjectId.isValid(input.departmentId) ? new Types.ObjectId(input.departmentId) : null;
    }
    if (input.status !== undefined) {
      if (!r.governs) throw new ForbiddenException('Only church leadership can change a group’s status.');
      if (!['active', 'inactive', 'draft'].includes(input.status)) throw new BadRequestException('Unknown status.');
      set.groupStatus = input.status;
    }
    await this.m.group.updateOne({ _id: r.group._id }, { $set: set });
    if (input.leadership !== undefined) {
      // A group leader may assign assistants/secretary/treasurer but not replace the leader.
      const list = await this.cleanLeadership(organizationId, input.leadership);
      if (!r.governs) {
        const current = (await this.leadership(r.group)).filter((l) => l.role === 'leader').map((l) => l.membershipId).sort();
        const next = list.filter((l) => l.role === 'leader').map((l) => String(l.membershipId)).sort();
        if (current.join() !== next.join()) throw new ForbiddenException('Only church leadership can appoint or remove group leaders.');
      }
      await this.applyLeadership(organizationId, r.group, list, r.actor);
    }
    await this.access.audit(organizationId, r.group._id, r.actor, 'updated', Object.keys(input).join(', '));
    return this.profile(organizationId, userId, groupId);
  }

  async archive(organizationId: string, userId: string, groupId: string, restore: boolean) {
    const actor = await this.access.actor(organizationId, userId);
    if (!actor.canCreate) throw new ForbiddenException('Only church leadership can archive groups.');
    const g = await this.access.loadGroup(organizationId, groupId, { archived: true });
    await this.m.group.updateOne(
      { _id: g._id },
      { $set: restore ? { isArchived: false, archivedAt: null, archivedByUserId: null } : { isArchived: true, archivedAt: new Date(), archivedByUserId: new Types.ObjectId(userId) } },
    );
    await this.access.audit(organizationId, g._id, actor, restore ? 'restored' : 'archived', g.name);
    return { ok: true };
  }

  /** Soft delete (owner/full); restorable from "Deleted Groups". */
  async softDelete(organizationId: string, userId: string, groupId: string, undo: boolean) {
    const actor = await this.access.actor(organizationId, userId);
    if (!actor.isFull) throw new ForbiddenException('Only the church owner or senior pastor can delete or restore deleted groups.');
    const g = await this.access.loadGroup(organizationId, groupId, { archived: true, deleted: true });
    await this.m.group.updateOne({ _id: g._id }, { $set: undo ? { deletedAt: null, deletedByUserId: null } : { deletedAt: new Date(), deletedByUserId: new Types.ObjectId(userId) } });
    await this.access.audit(organizationId, g._id, actor, undo ? 'undeleted' : 'deleted', g.name);
    return { ok: true };
  }

  async deletedGroups(organizationId: string, userId: string) {
    const actor = await this.access.actor(organizationId, userId);
    if (!actor.isFull) throw new ForbiddenException('Only the church owner or senior pastor can see deleted groups.');
    const rows = (await this.m.group.find({ organizationId: this.oid(organizationId, 'Organization ID'), deletedAt: { $ne: null } }).sort({ deletedAt: -1 }).lean().exec()) as LeanGroup[];
    return { items: rows.map((g) => this.summary(g, { deletedAt: iso(g.deletedAt), memberCount: 0 })) };
  }

  /* ==========================================================================
     MEMBERSHIP: join, request, leave
     ========================================================================== */

  private async capacityCheck(g: LeanGroup) {
    if (!g.capacity) return;
    const n = await this.m.member.countDocuments({ organizationId: g.organizationId, groupIds: g._id, status: MembershipStatus.Active });
    if (n >= g.capacity) throw new ConflictException('This group has reached its capacity.');
  }

  /** Adds the membership to the group (Membership.groupIds) and keeps a record. */
  async ensureMember(organizationId: string, g: LeanGroup, membershipId: string, actor: GroupActor | null, how: string) {
    const mem = await this.membersService.getMembershipByIdOrNull(organizationId, membershipId);
    if (!mem || mem.status !== MembershipStatus.Active) throw new BadRequestException('Only active church members can join groups.');
    const already = ((mem as unknown as { groupIds?: Types.ObjectId[] }).groupIds ?? []).some((x) => sameId(x, g._id));
    if (!already) {
      await this.capacityCheck(g);
      await this.membersService.adjustGroupMembership(membershipId, String(g._id), true);
    }
    const entry = { action: 'joined', detail: how, byName: actor?.displayName ?? '', at: new Date() };
    await this.m.record.updateOne(
      { groupId: g._id, membershipId: mem._id },
      {
        $setOnInsert: { organizationId: g.organizationId, userId: mem.userId, role: 'member', title: '', teamIds: [], joinedAt: new Date(), approvedByUserId: actor ? new Types.ObjectId(actor.userId) : null },
        $set: { status: 'active' },
        ...(already ? {} : { $push: { history: entry } }),
      },
      { upsert: true },
    );
    return mem;
  }

  async join(organizationId: string, userId: string, groupId: string, input: { message?: string }) {
    const r = await this.access.rights(organizationId, userId, groupId, undefined, { archived: false });
    const g = r.group;
    if (!r.actor.active || !r.actor.membershipId) throw new ForbiddenException('Only active church members can join groups.');
    if (r.isMember) throw new ConflictException('You are already a member of this group.');
    if (r.isSuspended) throw new ForbiddenException('Your membership in this group is suspended. Contact the group leader.');
    if (CommunityAccessService.statusOf(g) !== 'active') throw new ForbiddenException('This group is not accepting members right now.');
    const s = r.settings;
    if (s.visibility === 'private' || s.visibility === 'invitation') {
      const inv = await this.myInvitationFilter(organizationId, r.actor);
      const has = inv ? await this.m.invite.findOne({ ...inv, groupId: g._id, status: 'pending', expiresAt: { $gt: new Date() } }).lean().exec() : null;
      if (!has) throw new ForbiddenException('This group is by invitation only.');
    }
    if (s.requireApproval) {
      const pending = await this.m.request.findOne({ groupId: g._id, membershipId: new Types.ObjectId(r.actor.membershipId), status: 'pending' }).lean().exec();
      if (pending) throw new ConflictException('Your request is already waiting for review.');
      try {
        await this.m.request.create({
          organizationId: g.organizationId,
          groupId: g._id,
          membershipId: new Types.ObjectId(r.actor.membershipId),
          userId: new Types.ObjectId(userId),
          applicantName: r.actor.displayName,
          message: str(input.message, 1000),
        });
      } catch (e) {
        if ((e as { code?: number }).code === 11000) throw new ConflictException('Your request is already waiting for review.');
        throw e;
      }
      if (s.notifyLeadersOnRequest) {
        const to = s.approver === 'leaders' ? await this.leaderUserIds(g) : [];
        await this.notify(to.length ? to : await this.reviewerUserIds(organizationId), 'New group request', `${r.actor.displayName || 'A member'} asked to join ${g.name}.`, this.groupLink(organizationId, String(g._id), 'members'), String(g._id));
      }
      await this.access.audit(organizationId, g._id, r.actor, 'join_requested', r.actor.displayName);
      return { joined: false, requested: true };
    }
    await this.ensureMember(organizationId, g, r.actor.membershipId, r.actor, 'joined');
    await this.access.audit(organizationId, g._id, r.actor, 'member_joined', r.actor.displayName);
    return { joined: true, requested: false };
  }

  async leave(organizationId: string, userId: string, groupId: string) {
    const r = await this.access.rights(organizationId, userId, groupId);
    if (!r.isMember || !r.actor.membershipId) throw new ConflictException('You are not a member of this group.');
    if (r.groupRole === 'leader') {
      const others = (await this.leadership(r.group)).filter((l) => l.role === 'leader' && l.membershipId !== r.actor.membershipId);
      if (!others.length && !r.governs) throw new ConflictException('A group needs a leader. Ask church leadership to appoint a new leader before leaving.');
    }
    await this.membersService.adjustGroupMembership(r.actor.membershipId, groupId, false);
    await this.m.group.updateOne({ _id: r.group._id }, { $pull: { leaderIds: new Types.ObjectId(r.actor.membershipId) } });
    await this.m.record.updateOne(
      { groupId: r.group._id, membershipId: new Types.ObjectId(r.actor.membershipId) },
      { $set: { status: 'left', role: 'member', title: '', teamIds: [] }, $push: { history: { action: 'left', detail: '', byName: r.actor.displayName, at: new Date() } } },
    );
    await this.m.team.updateMany({ groupId: r.group._id }, { $pull: { memberIds: new Types.ObjectId(r.actor.membershipId) } });
    await this.access.audit(organizationId, r.group._id, r.actor, 'member_left', r.actor.displayName);
    return { ok: true };
  }

  /* ==========================================================================
     JOIN REQUESTS
     ========================================================================== */

  async listRequests(organizationId: string, userId: string, q: { groupId?: string; status?: string; scope?: string }) {
    const actor = await this.access.actor(organizationId, userId);
    const orgId = this.oid(organizationId, 'Organization ID');
    const groups = (await this.m.group.find({ organizationId: orgId, deletedAt: null }).select('name leaderIds organizationId groupSettings createdByUserId isArchived groupStatus').lean().exec()) as LeanGroup[];
    const names = new Map(groups.map((g) => [String(g._id), g.name]));
    const reviewable: Types.ObjectId[] = [];
    if (q.scope !== 'mine') {
      for (const g of groups) {
        if (q.groupId && !sameId(g._id, q.groupId)) continue;
        const r = await this.access.rights(organizationId, userId, g, actor);
        if (r.canApproveRequests) reviewable.push(g._id);
      }
    }
    const or: Record<string, unknown>[] = [];
    if (reviewable.length) or.push({ groupId: { $in: reviewable } });
    if (actor.membershipId && q.scope !== 'managed') or.push({ membershipId: new Types.ObjectId(actor.membershipId) });
    if (!or.length) return { items: [], canReview: false };
    const filter: Record<string, unknown> = { organizationId: orgId, $or: or, status: q.status || { $ne: 'withdrawn' } };
    if (q.groupId) filter.groupId = this.oid(q.groupId, 'Group ID');
    const rows = (await this.m.request.find(filter).sort({ status: 1, createdAt: -1 }).limit(300).lean().exec()) as Array<Record<string, any>>;
    const set = new Set(reviewable.map(String));
    return {
      canReview: reviewable.length > 0,
      items: rows.map((a) => ({
        id: String(a._id),
        groupId: String(a.groupId),
        groupName: names.get(String(a.groupId)) ?? '',
        applicantName: a.applicantName,
        message: a.message ?? '',
        status: a.status,
        reviewNote: a.reviewNote ?? '',
        createdAt: iso(a.createdAt),
        reviewedAt: iso(a.reviewedAt),
        canReview: set.has(String(a.groupId)) && a.status === 'pending',
        isMine: sameId(a.userId, userId),
      })),
    };
  }

  async reviewRequest(organizationId: string, userId: string, requestId: string, input: { decision?: string; note?: string }) {
    const req = await this.requestModel.findOne({ _id: this.oid(requestId, 'Request ID'), organizationId: this.oid(organizationId, 'Organization ID') });
    if (!req) throw new NotFoundException('Request not found.');
    const r = await this.access.rights(organizationId, userId, String(req.groupId));
    if (!r.canApproveRequests) throw new ForbiddenException('You cannot review requests for this group.');
    if (req.status !== 'pending') throw new ConflictException('This request was already handled.');
    const approve = input.decision === 'approve';
    if (!approve && input.decision !== 'reject') throw new BadRequestException('Choose approve or reject.');
    if (approve) await this.ensureMember(organizationId, r.group, String(req.membershipId), r.actor, 'request approved');
    req.status = approve ? 'approved' : 'rejected';
    req.reviewNote = str(input.note, 500);
    req.reviewedByUserId = new Types.ObjectId(userId);
    req.reviewedAt = new Date();
    await req.save();
    await this.notify(
      [String(req.userId)],
      approve ? `Welcome to ${r.group.name}` : `${r.group.name} request`,
      approve ? `Your request to join ${r.group.name} was approved.` : `Your request to join ${r.group.name} was not approved.${req.reviewNote ? ` ${req.reviewNote}` : ''}`,
      this.groupLink(organizationId, String(r.group._id)),
      String(r.group._id),
    );
    await this.access.audit(organizationId, r.group._id, r.actor, approve ? 'request_approved' : 'request_rejected', req.applicantName);
    return { ok: true, status: req.status };
  }

  async withdrawRequest(organizationId: string, userId: string, requestId: string) {
    const req = await this.requestModel.findOne({ _id: this.oid(requestId, 'Request ID'), organizationId: this.oid(organizationId, 'Organization ID') });
    if (!req || !sameId(req.userId, userId)) throw new NotFoundException('Request not found.');
    if (req.status !== 'pending') throw new ConflictException('Only pending requests can be withdrawn.');
    req.status = 'withdrawn';
    await req.save();
    return { ok: true };
  }

  /* ==========================================================================
     INVITATIONS
     ========================================================================== */

  private async myInvitationFilter(organizationId: string, actor: GroupActor): Promise<Record<string, unknown> | null> {
    const or: Record<string, unknown>[] = [{ recipientUserId: new Types.ObjectId(actor.userId) }];
    if (actor.membershipId) or.push({ recipientMembershipId: new Types.ObjectId(actor.membershipId) });
    const email = (actor.membership as unknown as { profile?: { email?: string } } | null)?.profile?.email;
    if (email) or.push({ recipientEmail: email.toLowerCase() });
    return { organizationId: this.oid(organizationId, 'Organization ID'), $or: or };
  }

  async invite(
    organizationId: string,
    userId: string,
    groupId: string,
    input: { membershipIds?: string[]; userIds?: string[]; emails?: string[]; message?: string; expiresInDays?: number },
  ) {
    const r = await this.access.rights(organizationId, userId, groupId, undefined, { archived: false });
    if (!r.canInvite) throw new ForbiddenException('You cannot invite people to this group.');
    const g = r.group;
    const days = Math.min(60, Math.max(1, Math.floor(Number(input.expiresInDays) || 14)));
    const expiresAt = new Date(Date.now() + days * 86400000);
    const message = str(input.message, 600);
    const created: { recipient: string; status: string }[] = [];
    const targets: { membershipId?: Types.ObjectId; userId?: Types.ObjectId; email?: string; name: string }[] = [];

    for (const mid of (input.membershipIds ?? []).slice(0, 100)) {
      const mem = Types.ObjectId.isValid(String(mid)) ? await this.membersService.getMembershipByIdOrNull(organizationId, String(mid)) : null;
      if (!mem || mem.status !== MembershipStatus.Active) continue;
      if (((mem as unknown as { groupIds?: Types.ObjectId[] }).groupIds ?? []).some((x) => sameId(x, g._id))) {
        created.push({ recipient: nameOf(mem as unknown as LeanMember), status: 'already a member' });
        continue;
      }
      targets.push({ membershipId: mem._id as Types.ObjectId, userId: mem.userId as unknown as Types.ObjectId, name: nameOf(mem as unknown as LeanMember) });
    }
    for (const uid of (input.userIds ?? []).slice(0, 50)) {
      if (!Types.ObjectId.isValid(String(uid))) continue;
      const mem = await this.membersService.getMembershipOrNull(organizationId, String(uid));
      targets.push({ userId: new Types.ObjectId(String(uid)), membershipId: mem?._id as Types.ObjectId | undefined, name: mem ? nameOf(mem as unknown as LeanMember) : 'Fockis user' });
    }
    const emails = [...new Set((input.emails ?? []).map((e) => String(e).trim().toLowerCase()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))].slice(0, 50);
    if (emails.length && !r.settings.allowExternalInvites && !r.governs) throw new ForbiddenException('Email invitations to people outside the church are turned off for this group.');
    for (const email of emails) targets.push({ email, name: email });
    if (!targets.length && !created.length) throw new BadRequestException('Choose at least one person to invite.');

    for (const t of targets) {
      const dupFilter: Record<string, unknown> = { groupId: g._id, status: 'pending', expiresAt: { $gt: new Date() } };
      if (t.membershipId) dupFilter.recipientMembershipId = t.membershipId;
      else if (t.userId) dupFilter.recipientUserId = t.userId;
      else dupFilter.recipientEmail = t.email;
      if (await this.m.invite.findOne(dupFilter).lean().exec()) {
        created.push({ recipient: t.name, status: 'already invited' });
        continue;
      }
      const token = randomBytes(24).toString('base64url');
      const inv = await this.m.invite.create({
        organizationId: g.organizationId,
        groupId: g._id,
        inviterUserId: new Types.ObjectId(userId),
        inviterName: r.actor.displayName,
        recipientMembershipId: t.membershipId ?? null,
        recipientUserId: t.userId ?? null,
        recipientEmail: t.email ?? '',
        recipientName: t.name,
        tokenHash: hashToken(token),
        message,
        expiresAt,
      });
      const link = `/organizations/${organizationId}/group-invite/${token}`;
      if (t.userId) {
        await this.notify([String(t.userId)], `Invitation to ${g.name}`, `${r.actor.displayName || 'A leader'} invited you to join ${g.name}.`, link, String(inv._id));
      }
      if (t.email) {
        const base = (process.env.WEB_APP_URL || process.env.FRONTEND_URL || process.env.CLIENT_URL || '').replace(/\/$/, '');
        const url = `${base}${link}`;
        const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
        await this.mailer
          .send({
            to: t.email,
            subject: `You're invited to ${g.name}`,
            text: `${r.actor.displayName || 'A group leader'} invited you to join ${g.name}.\n\n${message ? `${message}\n\n` : ''}Accept the invitation: ${url}\n\nThe link expires on ${expiresAt.toDateString()}.`,
            html: `<p>${esc(r.actor.displayName || 'A group leader')} invited you to join <strong>${esc(g.name)}</strong>.</p>${message ? `<p>${esc(message)}</p>` : ''}<p><a href="${esc(url)}">Accept the invitation</a></p><p style="color:#667">The link expires on ${expiresAt.toDateString()}.</p>`,
          })
          .catch(() => false);
      }
      created.push({ recipient: t.name, status: 'invited' });
    }
    await this.access.audit(organizationId, g._id, r.actor, 'invited', created.filter((c) => c.status === 'invited').map((c) => c.recipient).join(', '));
    return { results: created };
  }

  private invitationView(inv: Record<string, any>, groupName: string, viewerId: string) {
    const expired = inv.status === 'pending' && new Date(inv.expiresAt).getTime() < Date.now();
    return {
      id: String(inv._id),
      groupId: String(inv.groupId),
      groupName,
      inviterName: inv.inviterName ?? '',
      recipientName: inv.recipientName ?? '',
      message: inv.message ?? '',
      status: expired ? 'expired' : inv.status,
      createdAt: iso(inv.createdAt),
      expiresAt: iso(inv.expiresAt),
      isMine: !sameId(inv.inviterUserId, viewerId),
      canRevoke: sameId(inv.inviterUserId, viewerId) && inv.status === 'pending' && !expired,
    };
  }

  /** Invitations I received plus those I can manage (sent for groups I coordinate). */
  async listInvitations(organizationId: string, userId: string, q: { groupId?: string }) {
    const actor = await this.access.actor(organizationId, userId);
    const orgId = this.oid(organizationId, 'Organization ID');
    const groups = (await this.m.group.find({ organizationId: orgId, deletedAt: null }).select('name').lean().exec()) as LeanGroup[];
    const names = new Map(groups.map((g) => [String(g._id), g.name]));
    const mine = await this.myInvitationFilter(organizationId, actor);
    const received = mine ? ((await this.m.invite.find({ ...mine, ...(q.groupId ? { groupId: this.oid(q.groupId, 'Group ID') } : {}) }).sort({ createdAt: -1 }).limit(100).lean().exec()) as Array<Record<string, any>>) : [];
    let sent: Array<Record<string, any>> = [];
    if (q.groupId) {
      const r = await this.access.rights(organizationId, userId, q.groupId, actor);
      if (r.canInvite) sent = (await this.m.invite.find({ groupId: r.group._id }).sort({ createdAt: -1 }).limit(200).lean().exec()) as Array<Record<string, any>>;
    } else {
      sent = (await this.m.invite.find({ organizationId: orgId, inviterUserId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).limit(200).lean().exec()) as Array<Record<string, any>>;
    }
    return {
      received: received.map((i) => this.invitationView(i, names.get(String(i.groupId)) ?? '', userId)),
      sent: sent.map((i) => ({ ...this.invitationView(i, names.get(String(i.groupId)) ?? '', userId), canRevoke: i.status === 'pending' && new Date(i.expiresAt).getTime() > Date.now() })),
    };
  }

  private async respondTo(organizationId: string, userId: string, inv: GroupInvitationDocument, accept: boolean) {
    const actor = await this.access.actor(organizationId, userId);
    if (inv.status !== 'pending') throw new ConflictException(`This invitation was already ${inv.status}.`);
    if (inv.expiresAt.getTime() < Date.now()) {
      inv.status = 'expired';
      await inv.save();
      throw new ConflictException('This invitation has expired. Ask the group leader for a new one.');
    }
    const g = await this.access.loadGroup(organizationId, String(inv.groupId));
    if (accept) {
      if (!actor.active || !actor.membershipId) {
        throw new ForbiddenException('Become an active member of this church first, then open the invitation again.');
      }
      await this.ensureMember(organizationId, g, actor.membershipId, actor, `invitation from ${inv.inviterName}`);
      await this.access.audit(organizationId, g._id, actor, 'invitation_accepted', actor.displayName);
    }
    inv.status = accept ? 'accepted' : 'declined';
    inv.respondedAt = new Date();
    if (!inv.recipientUserId) inv.recipientUserId = new Types.ObjectId(userId);
    await inv.save();
    await this.notify([String(inv.inviterUserId)], `Invitation ${accept ? 'accepted' : 'declined'}`, `${actor.displayName || 'Someone'} ${accept ? 'joined' : 'declined to join'} ${g.name}.`, this.groupLink(organizationId, String(g._id), 'members'), String(g._id));
    return { ok: true, groupId: String(g._id), status: inv.status };
  }

  async respondInvitation(organizationId: string, userId: string, invitationId: string, accept: boolean) {
    const actor = await this.access.actor(organizationId, userId);
    const f = await this.myInvitationFilter(organizationId, actor);
    const inv = await this.inviteModel.findOne({ ...(f ?? {}), _id: this.oid(invitationId, 'Invitation ID') } as Record<string, unknown>);
    if (!inv) throw new NotFoundException('Invitation not found.');
    return this.respondTo(organizationId, userId, inv, accept);
  }

  async invitationByToken(organizationId: string, token: string) {
    const inv = (await this.m.invite.findOne({ organizationId: this.oid(organizationId, 'Organization ID'), tokenHash: hashToken(String(token)) }).lean().exec()) as Record<string, any> | null;
    if (!inv) throw new NotFoundException('This invitation link is not valid.');
    const g = (await this.m.group.findOne({ _id: inv.groupId, deletedAt: null }).lean().exec()) as LeanGroup | null;
    if (!g) throw new NotFoundException('This group is no longer available.');
    const status = inv.status === 'pending' && new Date(inv.expiresAt).getTime() < Date.now() ? 'expired' : inv.status;
    return {
      group: { id: String(g._id), name: g.name, description: g.description ?? '', photoUrl: g.photoUrl ?? null, category: CommunityAccessService.categoryOf(g) },
      inviterName: inv.inviterName,
      message: inv.message ?? '',
      status,
      expiresAt: iso(inv.expiresAt),
    };
  }

  async acceptByToken(organizationId: string, userId: string, token: string, accept: boolean) {
    const inv = await this.inviteModel.findOne({ organizationId: this.oid(organizationId, 'Organization ID'), tokenHash: hashToken(String(token)) });
    if (!inv) throw new NotFoundException('This invitation link is not valid.');
    // Member/user-specific invitations can only be used by that person.
    const actor = await this.access.actor(organizationId, userId);
    if ((inv.recipientUserId && !sameId(inv.recipientUserId, userId)) || (inv.recipientMembershipId && !sameId(inv.recipientMembershipId, actor.membershipId))) {
      throw new ForbiddenException('This invitation was sent to someone else.');
    }
    return this.respondTo(organizationId, userId, inv, accept);
  }

  async revokeInvitation(organizationId: string, userId: string, invitationId: string) {
    const inv = await this.inviteModel.findOne({ _id: this.oid(invitationId, 'Invitation ID'), organizationId: this.oid(organizationId, 'Organization ID') });
    if (!inv) throw new NotFoundException('Invitation not found.');
    if (!sameId(inv.inviterUserId, userId)) {
      const r = await this.access.rights(organizationId, userId, String(inv.groupId));
      if (!r.canManage) throw new ForbiddenException('You cannot revoke this invitation.');
    }
    if (inv.status !== 'pending') throw new ConflictException('Only pending invitations can be revoked.');
    inv.status = 'revoked';
    await inv.save();
    return { ok: true };
  }

  /* ==========================================================================
     MEMBERS
     ========================================================================== */

  async members(organizationId: string, userId: string, groupId: string, q: { search?: string; status?: string }) {
    const r = await this.access.rights(organizationId, userId, groupId);
    if (!r.canSeeMembers) throw new ForbiddenException('The member list is visible to members of this group.');
    const g = r.group;
    const showInactive = r.canManageMembers && q.status && q.status !== 'active';
    const filter: Record<string, unknown> = { organizationId: g.organizationId, status: MembershipStatus.Active };
    if (!showInactive) filter.groupIds = g._id;
    else {
      const ids = (await this.m.record.find({ groupId: g._id, status: q.status }).select('membershipId').lean().exec()) as { membershipId: Types.ObjectId }[];
      filter._id = { $in: ids.map((x) => x.membershipId) };
    }
    const s = str(q.search, 60);
    if (s) filter['profile.displayName'] = { $regex: escapeRe(s), $options: 'i' };
    const [rows, recs, teams] = await Promise.all([
      this.m.member.find(filter).select('profile.displayName profile.avatarUrl userId role').sort({ 'profile.displayName': 1 }).limit(1000).lean().exec(),
      this.m.record.find({ groupId: g._id }).lean().exec(),
      this.m.team.find({ groupId: g._id }).select('name memberIds leaderMembershipId assistantMembershipId').lean().exec(),
    ]);
    const recBy = new Map((recs as Array<Record<string, any>>).map((x) => [String(x.membershipId), x]));
    const legacy = new Set((g.leaderIds ?? []).map(String));
    const teamRows = teams as Array<{ _id: Types.ObjectId; name: string; memberIds?: Types.ObjectId[]; leaderMembershipId?: Types.ObjectId | null; assistantMembershipId?: Types.ObjectId | null }>;
    return {
      canManage: r.canManageMembers,
      items: (rows as LeanMember[]).map((p) => {
        const id = String(p._id);
        const rec = recBy.get(id);
        const role: string = rec?.role && rec.role !== 'member' ? rec.role : legacy.has(id) ? 'leader' : 'member';
        return {
          membershipId: id,
          userId: String(p.userId),
          displayName: nameOf(p),
          avatarUrl: p.profile?.avatarUrl ?? null,
          role,
          roleLabel: rec?.title || ROLE_LABEL[role],
          status: rec?.status ?? 'active',
          joinedAt: iso(rec?.joinedAt ?? null),
          teams: teamRows.filter((t) => [...(t.memberIds ?? []), t.leaderMembershipId, t.assistantMembershipId].some((x) => sameId(x, id))).map((t) => t.name),
        };
      }),
    };
  }

  async memberHistory(organizationId: string, userId: string, groupId: string, membershipId: string) {
    const r = await this.access.rights(organizationId, userId, groupId);
    const own = sameId(membershipId, r.actor.membershipId);
    if (!r.canManageMembers && !own) throw new ForbiddenException('You cannot view this history.');
    const rec = (await this.m.record.findOne({ groupId: r.group._id, membershipId: this.oid(membershipId, 'Member ID') }).lean().exec()) as Record<string, any> | null;
    return { history: (rec?.history ?? []).map((h: Record<string, any>) => ({ action: h.action, detail: h.detail ?? '', byName: h.byName ?? '', at: iso(h.at) })).reverse() };
  }

  async candidates(organizationId: string, userId: string, groupId: string, search = '') {
    const r = await this.access.rights(organizationId, userId, groupId);
    if (!r.canInvite && !r.canManageMembers) throw new ForbiddenException('You cannot add members to this group.');
    const filter: Record<string, unknown> = { organizationId: r.group.organizationId, status: MembershipStatus.Active, groupIds: { $ne: r.group._id } };
    const s = str(search, 60);
    if (s) filter['profile.displayName'] = { $regex: escapeRe(s), $options: 'i' };
    const rows = (await this.m.member.find(filter).select('profile.displayName profile.avatarUrl role').sort({ 'profile.displayName': 1 }).limit(30).lean().exec()) as LeanMember[];
    return { items: rows.map((p) => ({ membershipId: String(p._id), displayName: nameOf(p), avatarUrl: p.profile?.avatarUrl ?? null, churchRole: p.role ?? 'member' })) };
  }

  async addMember(organizationId: string, userId: string, groupId: string, membershipId: string) {
    const r = await this.access.rights(organizationId, userId, groupId, undefined, { archived: false });
    if (!r.canManageMembers) throw new ForbiddenException('You cannot add members to this group.');
    const mem = await this.ensureMember(organizationId, r.group, membershipId, r.actor, `added by ${r.actor.displayName}`);
    await this.notify([String(mem.userId)], `Added to ${r.group.name}`, `${r.actor.displayName || 'A leader'} added you to ${r.group.name}.`, this.groupLink(organizationId, groupId), groupId);
    await this.access.audit(organizationId, r.group._id, r.actor, 'member_added', nameOf(mem as unknown as LeanMember));
    return { ok: true };
  }

  async updateMember(organizationId: string, userId: string, groupId: string, membershipId: string, input: { role?: string; title?: string; status?: string }) {
    const r = await this.access.rights(organizationId, userId, groupId);
    if (!r.canManageMembers) throw new ForbiddenException('You cannot manage members of this group.');
    const mid = this.oid(membershipId, 'Member ID');
    const rec = await this.recordModel.findOne({ groupId: r.group._id, membershipId: mid });
    const mem = await this.membersService.getMembershipByIdOrNull(organizationId, membershipId);
    if (!mem) throw new NotFoundException('Member not found.');
    const inGroup = ((mem as unknown as { groupIds?: Types.ObjectId[] }).groupIds ?? []).some((x) => sameId(x, r.group._id));
    if (!rec && !inGroup) throw new NotFoundException('This person is not in the group.');
    const record = rec ?? (await this.ensureMember(organizationId, r.group, membershipId, r.actor, 'record created'), await this.recordModel.findOne({ groupId: r.group._id, membershipId: mid }));
    if (!record) throw new NotFoundException('Member not found.');
    const log: string[] = [];
    if (input.role !== undefined) {
      if (!(GROUP_ROLES as readonly string[]).includes(input.role)) throw new BadRequestException('Unknown role.');
      if ((input.role === 'leader' || record.role === 'leader') && !r.governs) throw new ForbiddenException('Only church leadership can appoint or remove group leaders.');
      if (!r.canManage && input.role !== 'member') throw new ForbiddenException('Only group leaders can assign roles.');
      record.role = input.role as GroupRole;
      await this.m.group.updateOne({ _id: r.group._id }, input.role === 'leader' ? { $addToSet: { leaderIds: mid } } : { $pull: { leaderIds: mid } });
      log.push(`role: ${ROLE_LABEL[input.role]}`);
    }
    if (input.title !== undefined) {
      record.title = str(input.title, 60);
      log.push(`title: ${record.title || '—'}`);
    }
    if (input.status !== undefined) {
      if (!['active', 'suspended'].includes(input.status)) throw new BadRequestException('Unknown status.');
      if (record.role === 'leader' && !r.governs) throw new ForbiddenException('Only church leadership can suspend a group leader.');
      if (input.status === 'suspended' && record.status !== 'suspended') {
        await this.membersService.adjustGroupMembership(membershipId, groupId, false);
        log.push('suspended');
      }
      if (input.status === 'active' && record.status === 'suspended') {
        await this.capacityCheck(r.group);
        await this.membersService.adjustGroupMembership(membershipId, groupId, true);
        log.push('reinstated');
      }
      record.status = input.status;
    }
    record.history.push({ action: 'updated', detail: log.join(', '), byName: r.actor.displayName, at: new Date() } as any);
    await record.save();
    await this.access.audit(organizationId, r.group._id, r.actor, 'member_updated', `${nameOf(mem as unknown as LeanMember)} — ${log.join(', ')}`);
    return { ok: true };
  }

  async removeMember(organizationId: string, userId: string, groupId: string, membershipId: string) {
    const r = await this.access.rights(organizationId, userId, groupId);
    if (!r.canManageMembers) throw new ForbiddenException('You cannot remove members from this group.');
    const mid = this.oid(membershipId, 'Member ID');
    const rec = (await this.m.record.findOne({ groupId: r.group._id, membershipId: mid }).lean().exec()) as { role?: string } | null;
    if ((rec?.role === 'leader' || (r.group.leaderIds ?? []).some((x) => sameId(x, mid))) && !r.governs) throw new ForbiddenException('Only church leadership can remove a group leader.');
    await this.membersService.adjustGroupMembership(membershipId, groupId, false);
    await this.m.group.updateOne({ _id: r.group._id }, { $pull: { leaderIds: mid } });
    await this.m.team.updateMany({ groupId: r.group._id }, { $pull: { memberIds: mid } });
    await this.m.record.updateOne(
      { groupId: r.group._id, membershipId: mid },
      { $set: { status: 'removed', role: 'member', title: '', teamIds: [] }, $push: { history: { action: 'removed', detail: '', byName: r.actor.displayName, at: new Date() } } },
    );
    await this.access.audit(organizationId, r.group._id, r.actor, 'member_removed', membershipId);
    return { ok: true };
  }

  /** Fockis Messages to all members, a team, selected members or the leadership. */
  async messageMembers(organizationId: string, userId: string, groupId: string, input: { audience?: string; teamId?: string; membershipIds?: string[]; text?: string }) {
    const r = await this.access.rights(organizationId, userId, groupId);
    const text = str(input.text, 4000);
    if (!text) throw new BadRequestException('Write a message.');
    const audience = String(input.audience ?? 'all');
    if (audience !== 'leaders' && !r.canCoordinate) throw new ForbiddenException('Only group leaders can message members.');
    if (audience === 'leaders' && !r.isMember && !r.governs) throw new ForbiddenException('Only members can message the group leadership.');
    let recipients: string[] = [];
    if (audience === 'leaders') recipients = await this.leaderUserIds(r.group, ['leader', 'assistant_leader', 'coordinator', 'secretary', 'treasurer']);
    else if (audience === 'team') recipients = await this.memberUserIds(r.group, input.teamId ?? null);
    else if (audience === 'selected') {
      const ids = (input.membershipIds ?? []).filter((x) => Types.ObjectId.isValid(String(x))).map((x) => new Types.ObjectId(String(x)));
      const rows = (await this.m.member.find({ _id: { $in: ids }, groupIds: r.group._id, status: MembershipStatus.Active }).select('userId').lean().exec()) as LeanMember[];
      recipients = rows.map((x) => String(x.userId));
    } else recipients = await this.memberUserIds(r.group);
    recipients = [...new Set(recipients)].filter((u) => u !== userId).slice(0, 300);
    if (!recipients.length) throw new BadRequestException('No one to message.');
    let sent = 0;
    for (const to of recipients) {
      try {
        const conv = await this.conversations.createWithParticipant(userId, to);
        await this.messages.create(userId, { conversationId: String((conv as any).id ?? (conv as any)._id), type: 'text', text: `${r.group.name}\n\n${text}` } as any);
        sent += 1;
      } catch {
        /* skip people who cannot be messaged */
      }
    }
    await this.access.audit(organizationId, r.group._id, r.actor, 'messaged', `${audience}: ${sent} people`);
    return { sent, total: recipients.length };
  }

  /* ==========================================================================
     TEAMS
     ========================================================================== */

  private async groupMemberIds(g: LeanGroup, ids: unknown[]): Promise<Types.ObjectId[]> {
    const clean = [...new Set((ids ?? []).map(String).filter((x) => Types.ObjectId.isValid(x)))].slice(0, 500);
    if (!clean.length) return [];
    const rows = (await this.m.member.find({ _id: { $in: clean.map((x) => new Types.ObjectId(x)) }, groupIds: g._id, status: MembershipStatus.Active }).select('_id').lean().exec()) as LeanMember[];
    return rows.map((x) => x._id);
  }

  async teams(organizationId: string, userId: string, groupId: string) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    const rows = (await this.m.team.find({ groupId: r.group._id }).sort({ name: 1 }).lean().exec()) as Array<Record<string, any>>;
    const ids = [...new Set(rows.flatMap((t) => [...(t.memberIds ?? []), t.leaderMembershipId, t.assistantMembershipId].filter(Boolean).map(String)))];
    const people = (await this.m.member.find({ _id: { $in: ids.map((x) => new Types.ObjectId(x)) } }).select('profile.displayName').lean().exec()) as LeanMember[];
    const names = new Map(people.map((p) => [String(p._id), nameOf(p)]));
    const mid = r.actor.membershipId;
    return {
      canManage: r.canCoordinate,
      items: rows.map((t) => ({
        id: String(t._id),
        name: t.name,
        description: t.description ?? '',
        responsibilities: t.responsibilities ?? '',
        schedule: t.schedule ?? '',
        status: t.status,
        leaderMembershipId: t.leaderMembershipId ? String(t.leaderMembershipId) : null,
        leaderName: t.leaderMembershipId ? (names.get(String(t.leaderMembershipId)) ?? '') : '',
        assistantMembershipId: t.assistantMembershipId ? String(t.assistantMembershipId) : null,
        assistantName: t.assistantMembershipId ? (names.get(String(t.assistantMembershipId)) ?? '') : '',
        members: (t.memberIds ?? []).map((x: Types.ObjectId) => ({ membershipId: String(x), displayName: names.get(String(x)) ?? 'Member' })),
        canEdit: r.canCoordinate || (mid != null && (sameId(t.leaderMembershipId, mid) || sameId(t.assistantMembershipId, mid))),
      })),
    };
  }

  async saveTeam(organizationId: string, userId: string, groupId: string, teamId: string | null, input: Record<string, unknown>) {
    const r = await this.access.rights(organizationId, userId, groupId, undefined, { archived: false });
    const team = teamId ? await this.teamModel.findOne({ _id: this.oid(teamId, 'Team ID'), groupId: r.group._id }) : null;
    if (teamId && !team) throw new NotFoundException('Team not found.');
    const mid = r.actor.membershipId;
    const ownTeam = Boolean(team && mid && (sameId(team.leaderMembershipId, mid) || sameId(team.assistantMembershipId, mid)));
    if (!r.canCoordinate && !ownTeam) throw new ForbiddenException('You cannot manage teams in this group.');
    const name = input.name !== undefined ? str(input.name, 80) : team?.name;
    if (!name) throw new BadRequestException('Give the team a name.');
    const data: Record<string, unknown> = { name };
    for (const [k, max] of [['description', 600], ['responsibilities', 600], ['schedule', 200]] as const) if (input[k] !== undefined) data[k] = str(input[k], max);
    if (input.status !== undefined) data.status = input.status === 'inactive' ? 'inactive' : 'active';
    if (input.memberIds !== undefined) data.memberIds = await this.groupMemberIds(r.group, input.memberIds as unknown[]);
    // Team leaders manage rosters; only group coordinators choose team leaders.
    if (r.canCoordinate) {
      for (const k of ['leaderMembershipId', 'assistantMembershipId'] as const) {
        if (input[k] === undefined) continue;
        const [one] = input[k] ? await this.groupMemberIds(r.group, [input[k]]) : [];
        if (input[k] && !one) throw new BadRequestException('Team leaders must be members of the group.');
        data[k] = one ?? null;
      }
    }
    const dup = await this.m.team.findOne({ groupId: r.group._id, name: { $regex: `^${escapeRe(name)}$`, $options: 'i' }, ...(team ? { _id: { $ne: team._id } } : {}) }).lean().exec();
    if (dup) throw new ConflictException(`A team named "${name}" already exists.`);
    let id: string;
    if (team) {
      team.set(data);
      await team.save();
      id = String(team._id);
    } else {
      const t = await this.m.team.create({ ...data, organizationId: r.group.organizationId, groupId: r.group._id });
      id = String(t._id);
    }
    // Keep member records' teamIds in step.
    const t = (await this.m.team.findById(id).lean().exec()) as { memberIds: Types.ObjectId[] };
    await this.m.record.updateMany({ groupId: r.group._id }, { $pull: { teamIds: new Types.ObjectId(id) } });
    await this.m.record.updateMany({ groupId: r.group._id, membershipId: { $in: t.memberIds } }, { $addToSet: { teamIds: new Types.ObjectId(id) } });
    await this.access.audit(organizationId, r.group._id, r.actor, team ? 'team_updated' : 'team_created', name);
    return { id };
  }

  async deleteTeam(organizationId: string, userId: string, groupId: string, teamId: string) {
    const r = await this.access.rights(organizationId, userId, groupId);
    if (!r.canCoordinate) throw new ForbiddenException('You cannot delete teams in this group.');
    const team = await this.teamModel.findOne({ _id: this.oid(teamId, 'Team ID'), groupId: r.group._id });
    if (!team) throw new NotFoundException('Team not found.');
    await team.deleteOne();
    await this.m.record.updateMany({ groupId: r.group._id }, { $pull: { teamIds: team._id } });
    await this.access.audit(organizationId, r.group._id, r.actor, 'team_deleted', team.name);
    return { ok: true };
  }

  /* ==========================================================================
     PROPOSALS
     ========================================================================== */

  private proposalView(p: Record<string, any>, actor: GroupActor) {
    const mine = sameId(p.proposedByUserId, actor.userId);
    return {
      id: String(p._id),
      name: p.name,
      category: p.category,
      description: p.description ?? '',
      purpose: p.purpose ?? '',
      proposedLeaderMembershipId: p.proposedLeaderMembershipId ? String(p.proposedLeaderMembershipId) : null,
      expectedMembers: p.expectedMembers ?? null,
      suggestedActivities: p.suggestedActivities ?? '',
      documentUrls: p.documentUrls ?? [],
      status: p.status,
      reviewNote: p.reviewNote ?? '',
      proposedByName: p.proposedByName ?? '',
      isMine: mine,
      canEdit: mine && ['draft', 'more_info'].includes(p.status),
      canReview: actor.canReview && !['draft', 'converted'].includes(p.status),
      convertedGroupId: p.convertedGroupId ? String(p.convertedGroupId) : null,
      submittedAt: iso(p.submittedAt),
      createdAt: iso(p.createdAt),
      history: (p.history ?? []).map((h: Record<string, any>) => ({ status: h.status, note: h.note ?? '', byName: h.byName ?? '', at: iso(h.at) })),
    };
  }

  async listProposals(organizationId: string, userId: string, q: { status?: string; scope?: string }) {
    const actor = await this.access.actor(organizationId, userId);
    if (!actor.active) throw new ForbiddenException('Groups are available to active members of this church.');
    const filter: Record<string, unknown> = { organizationId: this.oid(organizationId, 'Organization ID') };
    if (!actor.canReview || q.scope === 'mine') filter.proposedByUserId = this.oid(userId, 'User ID');
    else filter.$or = [{ status: { $ne: 'draft' } }, { proposedByUserId: this.oid(userId, 'User ID') }];
    if (q.status) filter.status = q.status;
    const rows = (await this.m.proposal.find(filter).sort({ updatedAt: -1 }).limit(200).lean().exec()) as Array<Record<string, any>>;
    return { items: rows.map((p) => this.proposalView(p, actor)) };
  }

  private cleanProposal(input: Record<string, unknown>) {
    const c = String(input.category ?? 'custom');
    const lead = String(input.proposedLeaderMembershipId ?? '');
    const n = Number(input.expectedMembers);
    return {
      name: str(input.name, 120),
      category: (GROUP_CATEGORIES as readonly string[]).includes(c) ? c : 'custom',
      description: str(input.description, 2000),
      purpose: str(input.purpose, 2000),
      proposedLeaderMembershipId: Types.ObjectId.isValid(lead) ? new Types.ObjectId(lead) : null,
      expectedMembers: Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 100000) : null,
      suggestedActivities: str(input.suggestedActivities, 1000),
      documentUrls: (Array.isArray(input.documentUrls) ? input.documentUrls : []).map((u) => str(u, 600)).filter((u) => /^(\/|https?:\/\/)/.test(u)).slice(0, 10),
    };
  }

  async createProposal(organizationId: string, userId: string, input: Record<string, unknown>) {
    const actor = await this.access.actor(organizationId, userId);
    if (!actor.canPropose) throw new ForbiddenException('Group proposals are not open for your role.');
    const data = this.cleanProposal(input);
    if (data.name.length < 2) throw new BadRequestException('Give the group a name.');
    if (data.description.length < 10) throw new BadRequestException('Describe the group in a sentence or two.');
    const submit = input.submit !== false;
    const status: ProposalStatus = submit ? 'submitted' : 'draft';
    const doc = await this.m.proposal.create({
      ...data,
      organizationId: this.oid(organizationId, 'Organization ID'),
      proposedByUserId: this.oid(userId, 'User ID'),
      proposedByMembershipId: actor.membershipId ? new Types.ObjectId(actor.membershipId) : null,
      proposedByName: actor.displayName,
      status,
      submittedAt: submit ? new Date() : null,
      history: [{ status, note: '', byName: actor.displayName, at: new Date() }],
    });
    if (submit) await this.notify((await this.reviewerUserIds(organizationId)).filter((u) => u !== userId), 'New group proposal', `${actor.displayName || 'A member'} proposed "${data.name}".`, this.dashboardLink(organizationId, 'requests'), String(doc._id));
    await this.access.audit(organizationId, null, actor, submit ? 'proposal_submitted' : 'proposal_drafted', data.name);
    return this.proposalView(doc.toObject(), actor);
  }

  async updateProposal(organizationId: string, userId: string, id: string, input: Record<string, unknown>) {
    const actor = await this.access.actor(organizationId, userId);
    const doc = await this.proposalModel.findOne({ _id: this.oid(id, 'Proposal ID'), organizationId: this.oid(organizationId, 'Organization ID') });
    if (!doc) throw new NotFoundException('Proposal not found.');
    if (!sameId(doc.proposedByUserId, userId) || !['draft', 'more_info'].includes(doc.status)) throw new ForbiddenException('Only the person who proposed it can edit a draft or answer a request for more information.');
    doc.set(this.cleanProposal({ ...doc.toObject(), ...input }));
    if (input.submit === true) {
      doc.status = 'submitted';
      doc.submittedAt = new Date();
      doc.history.push({ status: 'submitted', note: str(input.note, 500), byName: actor.displayName, at: new Date() } as any);
      await this.notify((await this.reviewerUserIds(organizationId)).filter((u) => u !== userId), 'Group proposal updated', `"${doc.name}" was submitted for review.`, this.dashboardLink(organizationId, 'requests'), String(doc._id));
    }
    await doc.save();
    return this.proposalView(doc.toObject(), actor);
  }

  async withdrawProposal(organizationId: string, userId: string, id: string) {
    const doc = await this.proposalModel.findOne({ _id: this.oid(id, 'Proposal ID'), organizationId: this.oid(organizationId, 'Organization ID') });
    if (!doc || !sameId(doc.proposedByUserId, userId)) throw new NotFoundException('Proposal not found.');
    if (['approved', 'converted'].includes(doc.status)) throw new ConflictException('Approved proposals cannot be withdrawn.');
    await doc.deleteOne();
    return { ok: true };
  }

  async reviewProposal(organizationId: string, userId: string, id: string, input: { status?: string; note?: string }) {
    const actor = await this.access.actor(organizationId, userId);
    if (!actor.canReview) throw new ForbiddenException('You cannot review group proposals.');
    const next = String(input.status ?? '');
    if (!['under_review', 'more_info', 'approved', 'rejected'].includes(next)) throw new BadRequestException('Choose a valid decision.');
    const note = str(input.note, 1000);
    if ((next === 'more_info' || next === 'rejected') && !note) throw new BadRequestException('Add a note so the member knows what to do next.');
    const doc = await this.proposalModel.findOne({ _id: this.oid(id, 'Proposal ID'), organizationId: this.oid(organizationId, 'Organization ID') });
    if (!doc) throw new NotFoundException('Proposal not found.');
    if (['draft', 'converted'].includes(doc.status)) throw new ConflictException('This proposal cannot be reviewed.');
    doc.status = next as ProposalStatus;
    doc.reviewNote = note;
    doc.history.push({ status: next, note, byName: actor.displayName, at: new Date() } as any);
    await doc.save();
    const label: Record<string, string> = { under_review: 'is under review', more_info: 'needs more information', approved: 'was approved', rejected: 'was not approved' };
    await this.notify([String(doc.proposedByUserId)], 'Group proposal update', `Your proposal "${doc.name}" ${label[next]}.${note ? ` ${note}` : ''}`, this.dashboardLink(organizationId, 'requests'), String(doc._id));
    await this.access.audit(organizationId, null, actor, `proposal_${next}`, doc.name);
    return this.proposalView(doc.toObject(), actor);
  }

  async convertProposal(organizationId: string, userId: string, id: string, input: { publish?: boolean; leaderMembershipId?: string }) {
    const actor = await this.access.actor(organizationId, userId);
    if (!actor.canCreate) throw new ForbiddenException('You cannot create groups.');
    const doc = await this.proposalModel.findOne({ _id: this.oid(id, 'Proposal ID'), organizationId: this.oid(organizationId, 'Organization ID') });
    if (!doc) throw new NotFoundException('Proposal not found.');
    if (doc.status !== 'approved') throw new ConflictException('Approve the proposal before creating the group.');
    const leaderId = input.leaderMembershipId || (doc.proposedLeaderMembershipId ? String(doc.proposedLeaderMembershipId) : '');
    const group = await this.create(
      organizationId,
      userId,
      {
        name: doc.name,
        category: doc.category,
        description: doc.description || doc.purpose,
        mission: doc.purpose,
        status: input.publish === false ? 'draft' : 'active',
        leadership: leaderId ? [{ membershipId: leaderId, role: 'leader' }] : [],
      },
      true,
    );
    if (doc.proposedByMembershipId) {
      const g = await this.access.loadGroup(organizationId, group.id);
      await this.ensureMember(organizationId, g, String(doc.proposedByMembershipId), actor, 'proposed the group').catch(() => undefined);
    }
    doc.status = 'converted';
    doc.convertedGroupId = new Types.ObjectId(group.id);
    doc.history.push({ status: 'converted', note: '', byName: actor.displayName, at: new Date() } as any);
    await doc.save();
    await this.notify([String(doc.proposedByUserId)], 'Your group was created', `"${doc.name}" is now a group of your church.`, this.groupLink(organizationId, group.id), group.id);
    return { proposal: this.proposalView(doc.toObject(), actor), group };
  }

  /* ==========================================================================
     AUDIT
     ========================================================================== */

  async auditLog(organizationId: string, userId: string, groupId: string) {
    const r = await this.access.rights(organizationId, userId, groupId);
    if (!r.canManage) throw new ForbiddenException('The activity log is available to group leaders.');
    const rows = (await this.m.audit.find({ groupId: r.group._id }).sort({ createdAt: -1 }).limit(200).lean().exec()) as Array<Record<string, any>>;
    return { items: rows.map((a) => ({ id: String(a._id), action: a.action, detail: a.detail ?? '', actorName: a.actorName ?? '', createdAt: iso(a.createdAt) })) };
  }

  /** Used by ChurchGroupsService.join (legacy endpoint) to respect join rules. */
  async assertLegacyJoinAllowed(organizationId: string, userId: string, groupId: string) {
    const r = await this.access.rights(organizationId, userId, groupId, undefined, { archived: false });
    if (r.isMember) return;
    if (CommunityAccessService.statusOf(r.group) !== 'active') throw new ForbiddenException('This group is not accepting members right now.');
    if (r.settings.visibility === 'private' || r.settings.visibility === 'invitation') throw new ForbiddenException('This group is by invitation only.');
    if (r.settings.requireApproval) throw new ForbiddenException('This group reviews new members. Please send a request to join.');
  }

  rightsFor(organizationId: string, userId: string, groupId: string): Promise<GroupRights> {
    return this.access.rights(organizationId, userId, groupId);
  }
}
