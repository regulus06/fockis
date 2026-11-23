/**
 * community-access.service.ts
 * -----------------------------------------------------------------------------
 * Decides, on the server, what a signed-in person may do with Groups &
 * Communities. Used by every communities service and by ChurchGroupsService.
 *
 *  Church level (owner-controlled policy, per church role):
 *    full     create, edit, archive, delete/restore any group, review
 *             proposals, approve church funds, all reports
 *    create   create and manage any group, review proposals and finances
 *    propose  propose new groups, join groups
 *    none     nothing beyond viewing
 *  The owner is always "full". Administrators explicitly granted
 *  "manage_groups" keep at least "create".
 *
 *  Group level (church_group_members.role, plus legacy ChurchGroup.leaderIds):
 *    leader            manages the group (members, settings, finance…)
 *    assistant_leader  meetings, activities, attendance, posts, tasks
 *    coordinator       same as assistant
 *    secretary         posts, documents, attendance, meetings
 *    treasurer         group finance records
 *    member            participates
 *  Leaders never gain access to other groups or to church-wide finances.
 * -----------------------------------------------------------------------------
 */

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { ChurchGroup, ChurchGroupDocument } from '../groups/schemas/church-group.schema';
import { MembersService } from '../members/services/members.service';
import type { MembershipDocument } from '../members/schemas/membership.schema';
import { MembershipStatus } from '../enums/membership-status.enum';
import { ChurchPermission } from '../enums/permission.enum';
import { GroupType } from '../enums/group-type.enum';
import {
  DEFAULT_GROUP_SETTINGS,
  DEFAULT_POLICY_ROLES,
  GROUP_CATEGORIES,
  GROUP_SERVICES,
  GROUP_VISIBILITIES,
  GroupAuditLog,
  GroupAuditLogDocument,
  GroupMemberRecord,
  GroupMemberRecordDocument,
  GroupPolicy,
  GroupPolicyDocument,
  POLICY_LEVELS,
  POLICY_ROLES,
  type GroupCategory,
  type GroupPolicyLevel,
  type GroupPolicyRole,
  type GroupRole,
  type GroupService,
  type GroupSettings,
} from './community.schemas';

const RANK: Record<GroupPolicyLevel, number> = { none: 0, propose: 1, create: 2, full: 3 };
export const sameId = (a: unknown, b: unknown) => a != null && b != null && String(a) === String(b);
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

export interface GroupPolicyView {
  roles: Record<GroupPolicyRole, GroupPolicyLevel>;
  allowProposals: boolean;
  defaults: GroupSettings;
  updatedAt: string | null;
}

export interface GroupActor {
  userId: string;
  isOwner: boolean;
  membership: MembershipDocument | null;
  membershipId: string | null;
  displayName: string;
  role: string | null;
  active: boolean;
  level: GroupPolicyLevel;
  /** Create groups and manage every group. */
  canCreate: boolean;
  /** Review proposals and church-level fund requests. */
  canReview: boolean;
  /** Delete / restore deleted groups, change the policy. */
  isFull: boolean;
  canPropose: boolean;
  canConfigure: boolean;
}

export type LeanGroup = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  description?: string;
  groupType?: string;
  departmentId?: Types.ObjectId | null;
  photoUrl?: string | null;
  logoUrl?: string | null;
  leaderIds?: Types.ObjectId[];
  meetingSchedule?: string;
  location?: string;
  capacity?: number | null;
  isArchived?: boolean;
  category?: string;
  groupStatus?: string;
  featured?: boolean;
  mission?: string;
  objectives?: string;
  language?: string;
  groupSettings?: Partial<GroupSettings>;
  deletedAt?: Date | null;
  createdByUserId?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface GroupRights {
  actor: GroupActor;
  group: LeanGroup;
  settings: GroupSettings;
  record: { role: GroupRole; status: string; teamIds: string[]; title: string } | null;
  groupRole: GroupRole | null;
  isMember: boolean;
  isSuspended: boolean;
  governs: boolean;
  /** Manage the group: information, members, leadership, settings. */
  canManage: boolean;
  /** Meetings, activities, attendance, announcements, tasks, documents. */
  canCoordinate: boolean;
  canManageMembers: boolean;
  canApproveRequests: boolean;
  canInvite: boolean;
  canSeeMembers: boolean;
  /** Group finance records (leader, treasurer, church leadership). */
  canViewFinance: boolean;
  canManageFinance: boolean;
  /** Church-level approvals (fund requests). */
  canApproveChurchFunds: boolean;
  canView: boolean;
}

@Injectable()
export class CommunityAccessService {
  constructor(
    @InjectModel(GroupPolicy.name) private readonly policyModel: Model<GroupPolicyDocument>,
    @InjectModel(ChurchGroup.name) private readonly groupModel: Model<ChurchGroupDocument>,
    @InjectModel(GroupMemberRecord.name) private readonly recordModel: Model<GroupMemberRecordDocument>,
    @InjectModel(GroupAuditLog.name) private readonly auditModel: Model<GroupAuditLogDocument>,
    private readonly membersService: MembersService,
  ) {}

  /* ---------------------------------------------------------------- helpers */

  toId(value: string, label: string): Types.ObjectId {
    if (!value || !Types.ObjectId.isValid(String(value))) throw new NotFoundException(`${label} is invalid.`);
    return new Types.ObjectId(String(value));
  }

  static categoryOf(g: { category?: string; groupType?: string }): GroupCategory {
    const c = String(g.category ?? '');
    if ((GROUP_CATEGORIES as readonly string[]).includes(c)) return c as GroupCategory;
    const t = String(g.groupType ?? '');
    if (t === GroupType.BibleStudy) return 'bible_study';
    if (t === GroupType.PrayerGroup) return 'prayer';
    if (t === GroupType.SmallGroup) return 'fellowship';
    return 'custom';
  }

  static typeForCategory(category: string): GroupType {
    if (category === 'bible_study') return GroupType.BibleStudy;
    if (category === 'prayer') return GroupType.PrayerGroup;
    if (category === 'fellowship' || category === 'age' || category === 'family') return GroupType.SmallGroup;
    return GroupType.Custom;
  }

  static statusOf(g: { isArchived?: boolean; groupStatus?: string; deletedAt?: Date | null }): string {
    if (g.deletedAt) return 'deleted';
    if (g.isArchived) return 'archived';
    return g.groupStatus || 'active';
  }

  static cleanSettings(input: Partial<GroupSettings> | null | undefined, base: GroupSettings): GroupSettings {
    const s: GroupSettings = { ...base, services: { ...base.services }, meeting: { ...base.meeting } };
    if (!input || typeof input !== 'object') return s;
    if ((GROUP_VISIBILITIES as readonly string[]).includes(String(input.visibility))) s.visibility = input.visibility!;
    const bool = (k: keyof GroupSettings) => {
      if (input[k] !== undefined) (s as unknown as Record<string, unknown>)[k] = Boolean(input[k]);
    };
    (['requireApproval', 'membersCanInvite', 'allowExternalInvites', 'membersCanSeeMembers', 'assistantsManageMembers', 'notifyLeadersOnRequest', 'notifyMembersOnAnnouncement'] as const).forEach(bool);
    if (input.approver === 'leaders' || input.approver === 'church') s.approver = input.approver;
    if (input.requirements !== undefined) s.requirements = str(input.requirements, 1000);
    const age = (v: unknown) => {
      if (v === null || v === '' || v === undefined) return null;
      const n = Math.floor(Number(v));
      return Number.isFinite(n) && n >= 0 && n <= 120 ? n : null;
    };
    if (input.minAge !== undefined) s.minAge = age(input.minAge);
    if (input.maxAge !== undefined) s.maxAge = age(input.maxAge);
    if (s.minAge != null && s.maxAge != null && s.minAge > s.maxAge) [s.minAge, s.maxAge] = [s.maxAge, s.minAge];
    if (input.services && typeof input.services === 'object') {
      for (const k of GROUP_SERVICES) if (input.services[k] !== undefined) s.services[k] = Boolean(input.services[k]);
    }
    if (input.currency !== undefined && /^[A-Za-z]{3}$/.test(String(input.currency))) s.currency = String(input.currency).toUpperCase();
    if (input.annualBudget !== undefined) {
      const n = Number(input.annualBudget);
      s.annualBudget = input.annualBudget === null || !Number.isFinite(n) || n < 0 ? null : Math.round(n * 100) / 100;
    }
    if (input.meeting && typeof input.meeting === 'object') {
      const m = input.meeting;
      if (['weekly', 'biweekly', 'monthly', 'custom', ''].includes(String(m.frequency ?? s.meeting.frequency))) s.meeting.frequency = (m.frequency ?? s.meeting.frequency) as GroupSettings['meeting']['frequency'];
      if (m.day !== undefined) s.meeting.day = str(m.day, 40);
      if (m.startTime !== undefined) s.meeting.startTime = str(m.startTime, 10);
      if (m.endTime !== undefined) s.meeting.endTime = str(m.endTime, 10);
      if (m.location !== undefined) s.meeting.location = str(m.location, 300);
      if (['in_person', 'online', 'hybrid'].includes(String(m.mode))) s.meeting.mode = m.mode as GroupSettings['meeting']['mode'];
    }
    return s;
  }

  settingsOf(g: { groupSettings?: Partial<GroupSettings> | null }): GroupSettings {
    return CommunityAccessService.cleanSettings(g.groupSettings ?? {}, DEFAULT_GROUP_SETTINGS);
  }

  /* ----------------------------------------------------------------- policy */

  async policy(organizationId: string): Promise<GroupPolicyView> {
    const doc = (await this.policyModel.findOne({ organizationId: this.toId(organizationId, 'Organization ID') }).lean().exec()) as unknown as
      | { roles?: Partial<Record<GroupPolicyRole, GroupPolicyLevel>>; allowProposals?: boolean; defaults?: Partial<GroupSettings>; updatedAt?: Date }
      | null;
    const roles = { ...DEFAULT_POLICY_ROLES };
    for (const r of POLICY_ROLES) {
      const v = doc?.roles?.[r];
      if (v && (POLICY_LEVELS as readonly string[]).includes(v)) roles[r] = v;
    }
    return {
      roles,
      allowProposals: doc?.allowProposals !== false,
      defaults: CommunityAccessService.cleanSettings(doc?.defaults ?? {}, DEFAULT_GROUP_SETTINGS),
      updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    };
  }

  async savePolicy(organizationId: string, userId: string, input: { roles?: Record<string, string>; allowProposals?: boolean; defaults?: Partial<GroupSettings> }) {
    const actor = await this.actor(organizationId, userId);
    if (!actor.canConfigure) throw new ForbiddenException('Only the church owner can change group permissions.');
    const current = await this.policy(organizationId);
    const roles = { ...current.roles };
    for (const [r, l] of Object.entries(input.roles ?? {})) {
      if ((POLICY_ROLES as readonly string[]).includes(r) && (POLICY_LEVELS as readonly string[]).includes(String(l))) roles[r as GroupPolicyRole] = l as GroupPolicyLevel;
    }
    await this.policyModel.updateOne(
      { organizationId: this.toId(organizationId, 'Organization ID') },
      {
        $set: {
          roles,
          allowProposals: input.allowProposals === undefined ? current.allowProposals : Boolean(input.allowProposals),
          defaults: CommunityAccessService.cleanSettings(input.defaults ?? {}, current.defaults),
          updatedByUserId: this.toId(userId, 'User ID'),
        },
      },
      { upsert: true },
    );
    await this.audit(organizationId, null, actor, 'policy_updated', 'Group permissions updated');
    return this.policy(organizationId);
  }

  /* ------------------------------------------------------------------ actor */

  async actor(organizationId: string, userId: string): Promise<GroupActor> {
    const isOwner = await this.membersService.isOrganizationOwner(organizationId, userId);
    const membership = isOwner
      ? await this.membersService.getActorMembership(organizationId, userId).catch(() => null)
      : await this.membersService.getMembershipOrNull(organizationId, userId);
    const active = isOwner || membership?.status === MembershipStatus.Active;
    const role = membership ? String(membership.role ?? '') : null;
    const policy = await this.policy(organizationId);
    let level: GroupPolicyLevel = 'none';
    if (isOwner) level = 'full';
    else if (active && role) {
      level = policy.roles[role as GroupPolicyRole] ?? 'none';
      if (RANK[level] < RANK.create && (await this.membersService.hasPermission(organizationId, userId, ChurchPermission.ManageGroups))) level = 'create';
    }
    const canCreate = RANK[level] >= RANK.create;
    const profile = (membership as unknown as { profile?: { displayName?: string } } | null)?.profile;
    return {
      userId,
      isOwner,
      membership,
      membershipId: membership ? String(membership._id) : null,
      displayName: profile?.displayName ?? '',
      role: isOwner ? 'owner' : role,
      active,
      level,
      canCreate,
      canReview: canCreate,
      isFull: level === 'full',
      canPropose: active && (canCreate || (policy.allowProposals && RANK[level] >= RANK.propose)),
      canConfigure: isOwner,
    };
  }

  /* ------------------------------------------------------------ per-group */

  async loadGroup(organizationId: string, groupId: string, opts: { archived?: boolean; deleted?: boolean } = {}): Promise<LeanGroup> {
    const filter: Record<string, unknown> = { _id: this.toId(groupId, 'Group ID'), organizationId: this.toId(organizationId, 'Organization ID') };
    if (!opts.deleted) filter.deletedAt = null;
    if (!opts.archived) filter.isArchived = { $ne: true };
    const g = (await (this.groupModel as unknown as Model<any>).findOne(filter).lean().exec()) as LeanGroup | null;
    if (!g) throw new NotFoundException('This group could not be found.');
    return g;
  }

  async recordFor(groupId: Types.ObjectId, membershipId: string | null) {
    if (!membershipId) return null;
    return (await this.recordModel.findOne({ groupId, membershipId: new Types.ObjectId(membershipId) }).lean().exec()) as unknown as
      | { role: GroupRole; status: string; teamIds: Types.ObjectId[]; title: string }
      | null;
  }

  async rights(organizationId: string, userId: string, group: LeanGroup | string, actorIn?: GroupActor, opts: { archived?: boolean } = { archived: true }): Promise<GroupRights> {
    const actor = actorIn ?? (await this.actor(organizationId, userId));
    const g = typeof group === 'string' ? await this.loadGroup(organizationId, group, opts) : group;
    const settings = this.settingsOf(g);
    const mid = actor.membershipId;
    const rec = actor.active ? await this.recordFor(g._id, mid) : null;
    const inGroupIds = Boolean(
      actor.active && actor.membership && ((actor.membership as unknown as { groupIds?: Types.ObjectId[] }).groupIds ?? []).some((x) => sameId(x, g._id)),
    );
    const legacyLeader = Boolean(actor.active && mid && (g.leaderIds ?? []).some((x) => sameId(x, mid)));
    const suspended = rec?.status === 'suspended';
    const isMember = (inGroupIds || legacyLeader) && !suspended;
    let groupRole: GroupRole | null = isMember ? (rec?.role ?? 'member') : null;
    if (isMember && legacyLeader && (!rec || rec.role === 'member')) groupRole = 'leader';

    const governs = actor.canCreate;
    const isLeader = groupRole === 'leader';
    const helper = groupRole === 'assistant_leader' || groupRole === 'coordinator' || groupRole === 'secretary';
    const canManage = governs || isLeader;
    const canCoordinate = canManage || helper;
    const canManageMembers = canManage || (helper && settings.assistantsManageMembers);
    const canApproveRequests = governs || ((isLeader || (helper && settings.assistantsManageMembers)) && settings.approver === 'leaders');
    const canViewFinance = governs || isLeader || groupRole === 'treasurer';
    const status = CommunityAccessService.statusOf(g);
    const discoverable =
      actor.active &&
      (settings.visibility === 'public' || settings.visibility === 'members') &&
      !['draft', 'pending_approval', 'deleted'].includes(status);

    return {
      actor,
      group: g,
      settings,
      record: rec ? { role: rec.role, status: rec.status, teamIds: (rec.teamIds ?? []).map(String), title: rec.title ?? '' } : null,
      groupRole,
      isMember,
      isSuspended: suspended,
      governs,
      canManage,
      canCoordinate,
      canManageMembers,
      canApproveRequests,
      canInvite: canCoordinate || (isMember && settings.membersCanInvite),
      canSeeMembers: canCoordinate || (isMember && settings.membersCanSeeMembers),
      canViewFinance,
      canManageFinance: canViewFinance,
      canApproveChurchFunds: actor.canReview,
      canView: governs || isMember || discoverable || sameId(g.createdByUserId, actor.userId),
    };
  }

  /** Throws unless the viewer may see the group at all. */
  async requireView(organizationId: string, userId: string, groupId: string): Promise<GroupRights> {
    const r = await this.rights(organizationId, userId, groupId);
    if (!r.canView) throw new NotFoundException('This group could not be found.');
    return r;
  }

  async requireMember(organizationId: string, userId: string, groupId: string): Promise<GroupRights> {
    const r = await this.rights(organizationId, userId, groupId);
    if (!r.isMember && !r.canCoordinate) throw new ForbiddenException('This is available to members of the group.');
    return r;
  }

  async require(organizationId: string, userId: string, groupId: string, key: keyof GroupRights, message: string): Promise<GroupRights> {
    const r = await this.rights(organizationId, userId, groupId);
    if (!r[key]) throw new ForbiddenException(message);
    return r;
  }

  requireService(r: GroupRights, service: GroupService) {
    if (!r.settings.services[service]) throw new ForbiddenException('This feature is turned off for the group.');
  }

  /** Discoverable in lists for this viewer? */
  canList(actor: GroupActor, g: LeanGroup, memberGroupIds: Set<string>, ledGroupIds: Set<string>): boolean {
    const status = CommunityAccessService.statusOf(g);
    if (status === 'deleted') return false;
    if (actor.canCreate) return true;
    const id = String(g._id);
    const involved = memberGroupIds.has(id) || ledGroupIds.has(id);
    if (status === 'archived') return involved;
    if (status === 'draft' || status === 'pending_approval') return involved || sameId(g.createdByUserId, actor.userId);
    if (!actor.active) return false;
    const vis = this.settingsOf(g).visibility;
    return involved || vis === 'public' || vis === 'members';
  }

  /* --------------------------------------------------------------- audit */

  async audit(organizationId: string, groupId: string | Types.ObjectId | null, actor: GroupActor | null, action: string, detail = ''): Promise<void> {
    try {
      await this.auditModel.create({
        organizationId: new Types.ObjectId(organizationId),
        groupId: groupId ? new Types.ObjectId(String(groupId)) : null,
        actorUserId: actor?.userId && Types.ObjectId.isValid(actor.userId) ? new Types.ObjectId(actor.userId) : null,
        actorName: actor?.displayName || (actor?.isOwner ? 'Owner' : ''),
        action,
        detail: String(detail).slice(0, 500),
      });
    } catch {
      /* never block the action */
    }
  }
}
