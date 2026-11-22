/**
 * ministry-access.service.ts
 * -----------------------------------------------------------------------------
 * One place that decides what a signed-in person may do with ministries.
 * Used by DepartmentsService (create / edit / archive / members) and by
 * MinistriesService (proposals, applications, teams, finances, reports).
 *
 * Rules
 *   - The organization owner is always "full".
 *   - Everyone else needs an ACTIVE membership; their role's level comes from
 *     the organization's ministry policy (owner-controlled), falling back to
 *     DEFAULT_POLICY_ROLES.
 *   - Administrators who were explicitly granted "manage_departments" keep at
 *     least "create" (how ministries were managed before the policy existed).
 *   - A person listed as a leader of a ministry manages that ministry, unless
 *     their role level is "restricted" or "none" (then activities/attendance
 *     only, or nothing).
 *   - Team leaders inside a ministry get "restricted" rights on it.
 * -----------------------------------------------------------------------------
 */

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Department, DepartmentDocument } from '../departments/schemas/department.schema';
import { MembersService } from '../members/services/members.service';
import type { MembershipDocument } from '../members/schemas/membership.schema';
import { MembershipStatus } from '../enums/membership-status.enum';
import { ChurchPermission } from '../enums/permission.enum';
import { DepartmentType } from '../enums/department-type.enum';
import {
  DEFAULT_MINISTRY_SETTINGS,
  DEFAULT_POLICY_ROLES,
  JOIN_MODES,
  MINISTRY_CATEGORIES,
  MINISTRY_VISIBILITIES,
  MinistryAuditLog,
  MinistryAuditLogDocument,
  MinistryPolicy,
  MinistryPolicyDocument,
  MinistryTeam,
  MinistryTeamDocument,
  POLICY_LEVELS,
  POLICY_ROLES,
  type MinistryCategory,
  type MinistrySettings,
  type PolicyLevel,
  type PolicyRole,
} from './ministry.schemas';

const RANK: Record<PolicyLevel, number> = { none: 0, propose: 1, restricted: 2, manage_assigned: 3, create: 4, full: 5 };

export interface PolicyView {
  roles: Record<PolicyRole, PolicyLevel>;
  allowProposals: boolean;
  defaults: MinistrySettings;
  updatedAt: string | null;
}

export interface MinistryActor {
  userId: string;
  isOwner: boolean;
  membership: MembershipDocument | null;
  membershipId: string | null;
  displayName: string;
  role: string | null;
  active: boolean;
  level: PolicyLevel;
  /** Create ministries directly and manage every ministry. */
  canCreate: boolean;
  /** Review proposals and finance requests. */
  canReview: boolean;
  canPropose: boolean;
  /** Change the ministry policy (owner only). */
  canConfigure: boolean;
}

export interface MinistryRights {
  actor: MinistryActor;
  isLeader: boolean;
  isTeamLeader: boolean;
  isMember: boolean;
  /** Edit details, members, teams, applications, settings of this ministry. */
  canManage: boolean;
  /** Activities, attendance and team rosters. */
  canCoordinate: boolean;
  /** Assign or remove ministry leaders; deactivate; archive. */
  canGovern: boolean;
  canViewMembers: boolean;
  canViewFinances: boolean;
  canRequestFunds: boolean;
  canApproveFunds: boolean;
}

type LeanDept = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  departmentType?: string;
  leaderIds?: Types.ObjectId[];
  isArchived?: boolean;
  category?: string;
  ministryStatus?: string;
  ministrySettings?: Partial<MinistrySettings>;
  createdByUserId?: Types.ObjectId | null;
};

const TYPE_TO_CATEGORY: Record<string, MinistryCategory> = {
  [DepartmentType.Men]: 'mens',
  [DepartmentType.Women]: 'womens',
  [DepartmentType.Youth]: 'youth',
  [DepartmentType.Children]: 'children',
  [DepartmentType.MusicChoir]: 'music',
  [DepartmentType.Prayer]: 'prayer',
  [DepartmentType.Custom]: 'other',
};

const CATEGORY_TO_TYPE: Partial<Record<MinistryCategory, DepartmentType>> = {
  mens: DepartmentType.Men,
  womens: DepartmentType.Women,
  youth: DepartmentType.Youth,
  children: DepartmentType.Children,
  music: DepartmentType.MusicChoir,
  worship: DepartmentType.MusicChoir,
  prayer: DepartmentType.Prayer,
};

export const sameId = (a: unknown, b: unknown) => a != null && b != null && String(a) === String(b);

@Injectable()
export class MinistryAccessService {
  constructor(
    @InjectModel(MinistryPolicy.name) private readonly policyModel: Model<MinistryPolicyDocument>,
    @InjectModel(Department.name) private readonly departmentModel: Model<DepartmentDocument>,
    @InjectModel(MinistryTeam.name) private readonly teamModel: Model<MinistryTeamDocument>,
    @InjectModel(MinistryAuditLog.name) private readonly auditModel: Model<MinistryAuditLogDocument>,
    private readonly membersService: MembersService,
  ) {}

  /* ---------------------------------------------------------------- helpers */

  toId(value: string, label: string): Types.ObjectId {
    if (!value || !Types.ObjectId.isValid(value)) throw new NotFoundException(`${label} is invalid.`);
    return new Types.ObjectId(value);
  }

  static categoryOf(doc: { category?: string; departmentType?: string }): MinistryCategory {
    const c = String(doc.category ?? '');
    if ((MINISTRY_CATEGORIES as readonly string[]).includes(c)) return c as MinistryCategory;
    return TYPE_TO_CATEGORY[String(doc.departmentType ?? '')] ?? 'other';
  }

  static typeForCategory(category: string): DepartmentType {
    return CATEGORY_TO_TYPE[category as MinistryCategory] ?? DepartmentType.Custom;
  }

  static statusOf(doc: { isArchived?: boolean; ministryStatus?: string }): string {
    if (doc.isArchived) return 'archived';
    return doc.ministryStatus || 'active';
  }

  /** Clean, validated settings (unknown keys dropped, values clamped). */
  static cleanSettings(input: Partial<MinistrySettings> | undefined | null, base: MinistrySettings): MinistrySettings {
    const s = { ...base };
    if (!input || typeof input !== 'object') return s;
    const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
    if ((MINISTRY_VISIBILITIES as readonly string[]).includes(String(input.visibility))) s.visibility = input.visibility!;
    if ((JOIN_MODES as readonly string[]).includes(String(input.joinMode))) s.joinMode = input.joinMode!;
    if (input.autoApprove !== undefined) s.autoApprove = Boolean(input.autoApprove);
    if (input.maxMembers !== undefined) {
      const n = Number(input.maxMembers);
      s.maxMembers = input.maxMembers === null || !Number.isFinite(n) || n <= 0 ? null : Math.min(Math.floor(n), 100000);
    }
    if (input.membersCanSeeMembers !== undefined) s.membersCanSeeMembers = Boolean(input.membersCanSeeMembers);
    if (input.allowFinanceRequests !== undefined) s.allowFinanceRequests = Boolean(input.allowFinanceRequests);
    if (input.annualBudget !== undefined) {
      const n = Number(input.annualBudget);
      s.annualBudget = input.annualBudget === null || !Number.isFinite(n) || n < 0 ? null : Math.round(n * 100) / 100;
    }
    if (input.currency !== undefined && /^[A-Za-z]{3}$/.test(String(input.currency))) s.currency = String(input.currency).toUpperCase();
    if (input.mission !== undefined) s.mission = str(input.mission, 1000);
    if (input.vision !== undefined) s.vision = str(input.vision, 1000);
    if (input.contactEmail !== undefined) {
      const e = str(input.contactEmail, 160);
      s.contactEmail = !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : s.contactEmail;
    }
    if (input.contactPhone !== undefined) s.contactPhone = str(input.contactPhone, 40);
    if (input.iconKey !== undefined) s.iconKey = str(input.iconKey, 40).replace(/[^a-z0-9_-]/gi, '');
    if (input.color !== undefined) {
      const c = str(input.color, 9);
      s.color = !c || /^#[0-9a-f]{3,8}$/i.test(c) ? c : s.color;
    }
    if (input.notifyLeadersOnApplication !== undefined) s.notifyLeadersOnApplication = Boolean(input.notifyLeadersOnApplication);
    return s;
  }

  settingsOf(doc: { ministrySettings?: Partial<MinistrySettings> | null }): MinistrySettings {
    return MinistryAccessService.cleanSettings(doc.ministrySettings ?? {}, DEFAULT_MINISTRY_SETTINGS);
  }

  /* ----------------------------------------------------------------- policy */

  async policy(organizationId: string): Promise<PolicyView> {
    const orgId = this.toId(organizationId, 'Organization ID');
    const doc = (await this.policyModel.findOne({ organizationId: orgId }).lean().exec()) as unknown as
      | { roles?: Partial<Record<PolicyRole, PolicyLevel>>; allowProposals?: boolean; defaults?: Partial<MinistrySettings>; updatedAt?: Date }
      | null;
    const roles = { ...DEFAULT_POLICY_ROLES };
    for (const r of POLICY_ROLES) {
      const v = doc?.roles?.[r];
      if (v && (POLICY_LEVELS as readonly string[]).includes(v)) roles[r] = v;
    }
    return {
      roles,
      allowProposals: doc?.allowProposals !== false,
      defaults: MinistryAccessService.cleanSettings(doc?.defaults ?? {}, DEFAULT_MINISTRY_SETTINGS),
      updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    };
  }

  async savePolicy(
    organizationId: string,
    userId: string,
    input: { roles?: Partial<Record<string, string>>; allowProposals?: boolean; defaults?: Partial<MinistrySettings> },
  ): Promise<PolicyView> {
    const actor = await this.actor(organizationId, userId);
    if (!actor.canConfigure) throw new ForbiddenException('Only the church owner can change who may create and manage ministries.');
    const current = await this.policy(organizationId);
    const roles = { ...current.roles };
    for (const [r, lvl] of Object.entries(input.roles ?? {})) {
      if ((POLICY_ROLES as readonly string[]).includes(r) && (POLICY_LEVELS as readonly string[]).includes(String(lvl))) {
        roles[r as PolicyRole] = lvl as PolicyLevel;
      }
    }
    const defaults = MinistryAccessService.cleanSettings(input.defaults ?? {}, current.defaults);
    await this.policyModel.updateOne(
      { organizationId: this.toId(organizationId, 'Organization ID') },
      {
        $set: {
          roles,
          allowProposals: input.allowProposals === undefined ? current.allowProposals : Boolean(input.allowProposals),
          defaults,
          updatedByUserId: this.toId(userId, 'User ID'),
        },
      },
      { upsert: true },
    );
    await this.audit(organizationId, null, actor, 'policy_updated', 'Ministry permissions updated');
    return this.policy(organizationId);
  }

  /* ------------------------------------------------------------------ actor */

  async actor(organizationId: string, userId: string): Promise<MinistryActor> {
    const isOwner = await this.membersService.isOrganizationOwner(organizationId, userId);
    const membership = isOwner
      ? await this.membersService.getActorMembership(organizationId, userId).catch(() => null)
      : await this.membersService.getMembershipOrNull(organizationId, userId);
    const active = isOwner || membership?.status === MembershipStatus.Active;
    const role = membership ? String(membership.role ?? '') : null;
    const policy = await this.policy(organizationId);

    let level: PolicyLevel = 'none';
    if (isOwner) level = 'full';
    else if (active && role) {
      level = policy.roles[role as PolicyRole] ?? 'none';
      // Administrators explicitly granted "manage_departments" keep create rights.
      if (RANK[level] < RANK.create && (await this.membersService.hasPermission(organizationId, userId, ChurchPermission.ManageDepartments))) {
        level = 'create';
      }
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
      canPropose: active && (canCreate || (policy.allowProposals && RANK[level] >= RANK.propose)),
      canConfigure: isOwner,
    };
  }

  /* -------------------------------------------------------- per-ministry */

  async loadMinistry(organizationId: string, ministryId: string, includeArchived = true): Promise<LeanDept> {
    const filter: Record<string, unknown> = {
      _id: this.toId(ministryId, 'Ministry ID'),
      organizationId: this.toId(organizationId, 'Organization ID'),
    };
    if (!includeArchived) filter.isArchived = { $ne: true };
    const doc = (await (this.departmentModel as unknown as Model<any>).findOne(filter).lean().exec()) as LeanDept | null;
    if (!doc) throw new NotFoundException('This ministry could not be found.');
    return doc;
  }

  async rights(organizationId: string, userId: string, ministry: LeanDept | string, actorIn?: MinistryActor): Promise<MinistryRights> {
    const actor = actorIn ?? (await this.actor(organizationId, userId));
    const dept = typeof ministry === 'string' ? await this.loadMinistry(organizationId, ministry) : ministry;
    const settings = this.settingsOf(dept);
    const mid = actor.membershipId;
    const isLeader = Boolean(actor.active && mid && (dept.leaderIds ?? []).some((id) => sameId(id, mid)));
    const isMember = Boolean(
      actor.active &&
        actor.membership &&
        ((actor.membership as unknown as { departmentIds?: Types.ObjectId[] }).departmentIds ?? []).some((d) => sameId(d, dept._id)),
    );
    const isTeamLeader = Boolean(
      actor.active && mid && (await this.teamModel.exists({ ministryId: dept._id, leaderMembershipId: new Types.ObjectId(mid) })),
    );

    const governs = actor.canCreate;
    const leaderManages = isLeader && RANK[actor.level] >= RANK.propose && actor.level !== 'restricted';
    const canManage = governs || leaderManages;
    const canCoordinate = canManage || ((isLeader || isTeamLeader) && actor.level !== 'none');

    return {
      actor,
      isLeader,
      isTeamLeader,
      isMember,
      canManage,
      canCoordinate,
      canGovern: governs,
      canViewMembers: canCoordinate || (isMember && settings.membersCanSeeMembers),
      canViewFinances: canManage,
      canRequestFunds: canManage && settings.allowFinanceRequests,
      canApproveFunds: actor.canReview,
    };
  }

  /** Can this person see a ministry in lists (drafts, private ministries…)? */
  canSee(actor: MinistryActor, dept: LeanDept): boolean {
    if (actor.canCreate) return true;
    const status = MinistryAccessService.statusOf(dept);
    const mid = actor.membershipId;
    const involved =
      Boolean(mid && (dept.leaderIds ?? []).some((id) => sameId(id, mid))) ||
      Boolean(
        actor.membership &&
          ((actor.membership as unknown as { departmentIds?: Types.ObjectId[] }).departmentIds ?? []).some((d) => sameId(d, dept._id)),
      );
    if (status === 'archived') return false;
    if (status === 'draft' || status === 'pending_approval') return involved || sameId(dept.createdByUserId, actor.userId);
    if (!actor.active) return false;
    if (this.settingsOf(dept).visibility === 'private') return involved;
    return true;
  }

  /* -------------------------------------------------------------- guards */

  async requireCreate(organizationId: string, userId: string): Promise<MinistryActor> {
    const actor = await this.actor(organizationId, userId);
    if (!actor.canCreate) {
      throw new ForbiddenException(
        actor.canPropose
          ? 'You cannot create ministries directly. Submit a ministry proposal for review instead.'
          : 'You do not have permission to create ministries.',
      );
    }
    return actor;
  }

  async requireManage(organizationId: string, userId: string, ministryId: string): Promise<MinistryRights> {
    const r = await this.rights(organizationId, userId, ministryId);
    if (!r.canManage) throw new ForbiddenException('You do not have permission to manage this ministry.');
    return r;
  }

  async requireCoordinate(organizationId: string, userId: string, ministryId: string): Promise<MinistryRights> {
    const r = await this.rights(organizationId, userId, ministryId);
    if (!r.canCoordinate) throw new ForbiddenException('You do not have permission to coordinate this ministry.');
    return r;
  }

  /* --------------------------------------------------------------- audit */

  async audit(organizationId: string, ministryId: string | Types.ObjectId | null, actor: MinistryActor | null, action: string, detail = ''): Promise<void> {
    try {
      await this.auditModel.create({
        organizationId: new Types.ObjectId(organizationId),
        ministryId: ministryId ? new Types.ObjectId(String(ministryId)) : null,
        actorUserId: actor?.userId && Types.ObjectId.isValid(actor.userId) ? new Types.ObjectId(actor.userId) : null,
        actorName: actor?.displayName || (actor?.isOwner ? 'Owner' : ''),
        action,
        detail: detail.slice(0, 500),
      });
    } catch {
      // Audit logging must never break the action itself.
    }
  }
}
