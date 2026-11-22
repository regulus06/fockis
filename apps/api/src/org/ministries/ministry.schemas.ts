/**
 * ministry.schemas.ts
 * -----------------------------------------------------------------------------
 * Collections that extend Church Departments ("ministries") into a full
 * ministries management system. Ministries themselves stay in
 * church_departments (Department schema); nothing here duplicates them.
 *
 *   church_ministry_policies       one per organization — who may create,
 *                                  propose, manage; owner-controlled defaults
 *   church_ministry_proposals      "Suggest a new ministry" workflow
 *   church_ministry_applications   member applications to join a ministry
 *   church_ministry_teams          teams inside a ministry
 *   church_ministry_finance_requests  budget / expense requests + approval
 *   church_ministry_audit_logs     who changed what, per ministry
 * -----------------------------------------------------------------------------
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/* ============================================================================
 * Shared vocabularies
 * ========================================================================== */

export const MINISTRY_CATEGORIES = [
  'worship',
  'youth',
  'children',
  'ushers',
  'media',
  'outreach',
  'prayer',
  'womens',
  'mens',
  'evangelism',
  'missions',
  'hospitality',
  'discipleship',
  'music',
  'education',
  'marriage_family',
  'pastoral_care',
  'benevolence',
  'other',
] as const;
export type MinistryCategory = (typeof MINISTRY_CATEGORIES)[number];

/** Stored on Department.ministryStatus. "archived" is Department.isArchived. */
export const MINISTRY_STATUSES = ['active', 'inactive', 'pending_approval', 'draft'] as const;
export type MinistryStatus = (typeof MINISTRY_STATUSES)[number];

/**
 * Access level a role receives for ministries.
 *   full             create, edit, archive every ministry; review proposals and finances
 *   create           create and manage every ministry; review proposals and finances
 *   manage_assigned  manage the ministries they lead (members, teams, activities)
 *   restricted       activities and attendance of ministries/teams they lead
 *   propose          apply to join ministries and submit proposals
 *   none             nothing beyond viewing
 */
export const POLICY_LEVELS = ['full', 'create', 'manage_assigned', 'restricted', 'propose', 'none'] as const;
export type PolicyLevel = (typeof POLICY_LEVELS)[number];

/** Configurable roles (the owner is always "full"). */
export const POLICY_ROLES = ['pastor_director', 'administrator', 'department_manager', 'leader', 'group_leader', 'member', 'guest'] as const;
export type PolicyRole = (typeof POLICY_ROLES)[number];

export const DEFAULT_POLICY_ROLES: Record<PolicyRole, PolicyLevel> = {
  pastor_director: 'full',
  administrator: 'create',
  department_manager: 'create',
  leader: 'manage_assigned',
  group_leader: 'restricted',
  member: 'propose',
  guest: 'none',
};

export const JOIN_MODES = ['open', 'application', 'invite'] as const;
export type JoinMode = (typeof JOIN_MODES)[number];

export const MINISTRY_VISIBILITIES = ['public', 'members', 'private'] as const;
export type MinistryVisibility = (typeof MINISTRY_VISIBILITIES)[number];

/** Per-ministry settings stored on Department.ministrySettings. */
export interface MinistrySettings {
  visibility: MinistryVisibility;
  joinMode: JoinMode;
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

export const DEFAULT_MINISTRY_SETTINGS: MinistrySettings = {
  visibility: 'public',
  joinMode: 'open',
  autoApprove: false,
  maxMembers: null,
  membersCanSeeMembers: true,
  allowFinanceRequests: true,
  annualBudget: null,
  currency: 'USD',
  mission: '',
  vision: '',
  contactEmail: '',
  contactPhone: '',
  iconKey: '',
  color: '',
  notifyLeadersOnApplication: true,
};

/* ============================================================================
 * Policy
 * ========================================================================== */

export type MinistryPolicyDocument = MinistryPolicy & Document;

@Schema({ timestamps: true, collection: 'church_ministry_policies' })
export class MinistryPolicy {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, unique: true })
  organizationId!: Types.ObjectId;

  /** Role → level. Missing roles fall back to DEFAULT_POLICY_ROLES. */
  @Prop({ type: Object, default: {} })
  roles!: Partial<Record<PolicyRole, PolicyLevel>>;

  /** Members may submit "Suggest a new ministry" proposals. */
  @Prop({ type: Boolean, default: true })
  allowProposals!: boolean;

  /** Settings new ministries start with (owner-controlled defaults). */
  @Prop({ type: Object, default: {} })
  defaults!: Partial<MinistrySettings>;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedByUserId?: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}
export const MinistryPolicySchema = SchemaFactory.createForClass(MinistryPolicy);

/* ============================================================================
 * Proposals
 * ========================================================================== */

export const PROPOSAL_STATUSES = ['draft', 'submitted', 'under_review', 'more_info', 'approved', 'rejected', 'converted'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

@Schema({ _id: false })
export class ProposalHistoryEntry {
  @Prop({ type: String, required: true }) status!: string;
  @Prop({ type: String, default: '' }) note!: string;
  @Prop({ type: Types.ObjectId, ref: 'User', default: null }) byUserId?: Types.ObjectId | null;
  @Prop({ type: String, default: '' }) byName!: string;
  @Prop({ type: Date, default: () => new Date() }) at!: Date;
}
const ProposalHistoryEntrySchema = SchemaFactory.createForClass(ProposalHistoryEntry);

export type MinistryProposalDocument = MinistryProposal & Document;

@Schema({ timestamps: true, collection: 'church_ministry_proposals' })
export class MinistryProposal {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  proposedByUserId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Membership', default: null })
  proposedByMembershipId?: Types.ObjectId | null;

  @Prop({ type: String, default: '' }) proposedByName!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 120 }) name!: string;
  @Prop({ type: String, enum: MINISTRY_CATEGORIES, default: 'other' }) category!: MinistryCategory;
  @Prop({ type: String, default: '', maxlength: 2000 }) description!: string;
  @Prop({ type: String, default: '', maxlength: 2000 }) purpose!: string;
  @Prop({ type: String, default: '', maxlength: 300 }) targetAudience!: string;
  @Prop({ type: String, default: '', maxlength: 500 }) meetingPlan!: string;
  @Prop({ type: String, default: '', maxlength: 1000 }) resourcesNeeded!: string;

  /** Suggested leader (membership in the same organization). */
  @Prop({ type: Types.ObjectId, ref: 'Membership', default: null })
  proposedLeaderMembershipId?: Types.ObjectId | null;

  @Prop({ type: String, enum: PROPOSAL_STATUSES, default: 'submitted', index: true })
  status!: ProposalStatus;

  @Prop({ type: String, default: '' }) reviewNote!: string;
  @Prop({ type: Types.ObjectId, ref: 'User', default: null }) reviewedByUserId?: Types.ObjectId | null;
  @Prop({ type: Date, default: null }) reviewedAt?: Date | null;
  @Prop({ type: Date, default: null }) submittedAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'Department', default: null })
  convertedMinistryId?: Types.ObjectId | null;

  @Prop({ type: [ProposalHistoryEntrySchema], default: [] })
  history!: ProposalHistoryEntry[];

  createdAt?: Date;
  updatedAt?: Date;
}
export const MinistryProposalSchema = SchemaFactory.createForClass(MinistryProposal);
MinistryProposalSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

/* ============================================================================
 * Applications to join a ministry
 * ========================================================================== */

export const APPLICATION_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type MinistryApplicationDocument = MinistryApplication & Document;

@Schema({ timestamps: true, collection: 'church_ministry_applications' })
export class MinistryApplication {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: true, index: true })
  ministryId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Membership', required: true })
  membershipId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, default: '' }) applicantName!: string;
  @Prop({ type: String, default: '', maxlength: 1000 }) message!: string;

  @Prop({ type: String, enum: APPLICATION_STATUSES, default: 'pending', index: true })
  status!: ApplicationStatus;

  @Prop({ type: Boolean, default: false }) autoApproved!: boolean;
  @Prop({ type: String, default: '' }) reviewNote!: string;
  @Prop({ type: Types.ObjectId, ref: 'User', default: null }) reviewedByUserId?: Types.ObjectId | null;
  @Prop({ type: Date, default: null }) reviewedAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}
export const MinistryApplicationSchema = SchemaFactory.createForClass(MinistryApplication);
// At most one pending application per member per ministry.
MinistryApplicationSchema.index(
  { ministryId: 1, membershipId: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);

/* ============================================================================
 * Teams
 * ========================================================================== */

export type MinistryTeamDocument = MinistryTeam & Document;

@Schema({ timestamps: true, collection: 'church_ministry_teams' })
export class MinistryTeam {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: true, index: true })
  ministryId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 }) name!: string;
  @Prop({ type: String, default: '', maxlength: 600 }) description!: string;

  @Prop({ type: Types.ObjectId, ref: 'Membership', default: null })
  leaderMembershipId?: Types.ObjectId | null;

  @Prop({ type: [Types.ObjectId], ref: 'Membership', default: [] })
  memberIds!: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', default: null }) createdByUserId?: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}
export const MinistryTeamSchema = SchemaFactory.createForClass(MinistryTeam);
MinistryTeamSchema.index({ ministryId: 1, name: 1 });

/* ============================================================================
 * Finance requests
 * ========================================================================== */

export const FINANCE_STATUSES = ['pending', 'approved', 'rejected', 'paid', 'cancelled'] as const;
export type FinanceStatus = (typeof FINANCE_STATUSES)[number];
export const FINANCE_CATEGORIES = ['supplies', 'event', 'equipment', 'travel', 'outreach', 'food', 'training', 'other'] as const;
export type FinanceCategory = (typeof FINANCE_CATEGORIES)[number];

export type MinistryFinanceRequestDocument = MinistryFinanceRequest & Document;

@Schema({ timestamps: true, collection: 'church_ministry_finance_requests' })
export class MinistryFinanceRequest {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: true, index: true })
  ministryId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true }) requestedByUserId!: Types.ObjectId;
  @Prop({ type: String, default: '' }) requestedByName!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 140 }) title!: string;
  @Prop({ type: String, enum: FINANCE_CATEGORIES, default: 'other' }) category!: FinanceCategory;
  /** Amount in the currency's major unit, two decimals. */
  @Prop({ type: Number, required: true, min: 0 }) amount!: number;
  @Prop({ type: String, default: 'USD', maxlength: 3 }) currency!: string;
  @Prop({ type: String, default: '' }) neededBy!: string;
  @Prop({ type: String, default: '', maxlength: 2000 }) description!: string;

  @Prop({ type: String, enum: FINANCE_STATUSES, default: 'pending', index: true })
  status!: FinanceStatus;

  @Prop({ type: String, default: '' }) reviewNote!: string;
  @Prop({ type: Types.ObjectId, ref: 'User', default: null }) reviewedByUserId?: Types.ObjectId | null;
  @Prop({ type: String, default: '' }) reviewedByName!: string;
  @Prop({ type: Date, default: null }) reviewedAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}
export const MinistryFinanceRequestSchema = SchemaFactory.createForClass(MinistryFinanceRequest);

/* ============================================================================
 * Audit log
 * ========================================================================== */

export type MinistryAuditLogDocument = MinistryAuditLog & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'church_ministry_audit_logs' })
export class MinistryAuditLog {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department', default: null, index: true })
  ministryId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null }) actorUserId?: Types.ObjectId | null;
  @Prop({ type: String, default: '' }) actorName!: string;
  @Prop({ type: String, required: true }) action!: string;
  @Prop({ type: String, default: '', maxlength: 500 }) detail!: string;

  createdAt?: Date;
}
export const MinistryAuditLogSchema = SchemaFactory.createForClass(MinistryAuditLog);
MinistryAuditLogSchema.index({ ministryId: 1, createdAt: -1 });
