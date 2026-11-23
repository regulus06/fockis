/**
 * community.schemas.ts
 * -----------------------------------------------------------------------------
 * Groups & Communities. Groups themselves stay in church_groups (ChurchGroup)
 * and "is a member" stays Membership.groupIds — nothing here duplicates them
 * or creates member accounts. These collections add what groups lacked:
 *
 *   church_group_policies        owner-controlled roles + defaults (one per org)
 *   church_group_members         role / status / history per member per group
 *   church_group_requests        requests to join
 *   church_group_invitations     invitations (members, Fockis users, email)
 *   church_group_proposals       "propose a new group" workflow
 *   church_group_teams           teams inside a group
 *   church_group_posts           announcements, discussions, notices
 *   church_group_lessons         Bible study lessons
 *   church_group_lesson_notes    a member's answers / private notes
 *   church_group_prayers         prayer requests (privacy-controlled)
 *   church_group_meetings        group meetings (online ones use Fockis Meetings)
 *   church_group_attendance      one record per member per session
 *   church_group_tasks           tasks
 *   church_group_transactions    contributions, expenses, fund requests
 *   church_group_campaigns       fundraising campaigns
 *   church_group_audit_logs      who did what
 *
 * Activities are church events (ChurchEvent.groupId); documents are church
 * media tagged "group:<id>"; payments are the universal Fockis payments.
 * -----------------------------------------------------------------------------
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

const OID = Types.ObjectId;

/* ============================================================================
 * Vocabularies
 * ========================================================================== */

export const GROUP_CATEGORIES = ['fellowship', 'bible_study', 'prayer', 'age', 'family', 'outreach', 'custom'] as const;
export type GroupCategory = (typeof GROUP_CATEGORIES)[number];

/** Stored on ChurchGroup.groupStatus. Archived = isArchived; deleted = deletedAt. */
export const GROUP_STATUSES = ['active', 'inactive', 'pending_approval', 'draft'] as const;

export const GROUP_VISIBILITIES = ['public', 'members', 'private', 'invitation'] as const;
export type GroupVisibility = (typeof GROUP_VISIBILITIES)[number];

export const GROUP_ROLES = ['leader', 'assistant_leader', 'coordinator', 'secretary', 'treasurer', 'member'] as const;
export type GroupRole = (typeof GROUP_ROLES)[number];

export const POLICY_LEVELS = ['full', 'create', 'propose', 'none'] as const;
export type GroupPolicyLevel = (typeof POLICY_LEVELS)[number];
export const POLICY_ROLES = ['pastor_director', 'administrator', 'department_manager', 'leader', 'group_leader', 'member', 'guest'] as const;
export type GroupPolicyRole = (typeof POLICY_ROLES)[number];
export const DEFAULT_POLICY_ROLES: Record<GroupPolicyRole, GroupPolicyLevel> = {
  pastor_director: 'full',
  administrator: 'create',
  department_manager: 'create',
  leader: 'propose',
  group_leader: 'propose',
  member: 'propose',
  guest: 'none',
};

export const GROUP_SERVICES = [
  'discussions',
  'bibleStudy',
  'prayer',
  'meetings',
  'attendance',
  'finance',
  'fundraising',
  'documents',
  'activities',
  'tasks',
  'contributions',
] as const;
export type GroupService = (typeof GROUP_SERVICES)[number];

/** Per-group settings stored on ChurchGroup.groupSettings. */
export interface GroupSettings {
  visibility: GroupVisibility;
  requireApproval: boolean;
  /** Who reviews join requests: leaders (and church leadership) or church leadership only. */
  approver: 'leaders' | 'church';
  membersCanInvite: boolean;
  allowExternalInvites: boolean;
  membersCanSeeMembers: boolean;
  assistantsManageMembers: boolean;
  requirements: string;
  minAge: number | null;
  maxAge: number | null;
  services: Record<GroupService, boolean>;
  currency: string;
  annualBudget: number | null;
  meeting: {
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'custom' | '';
    day: string;
    startTime: string;
    endTime: string;
    location: string;
    mode: 'in_person' | 'online' | 'hybrid';
  };
  notifyLeadersOnRequest: boolean;
  notifyMembersOnAnnouncement: boolean;
}

export const DEFAULT_GROUP_SETTINGS: GroupSettings = {
  visibility: 'members',
  requireApproval: false,
  approver: 'leaders',
  membersCanInvite: false,
  allowExternalInvites: false,
  membersCanSeeMembers: true,
  assistantsManageMembers: false,
  requirements: '',
  minAge: null,
  maxAge: null,
  services: {
    discussions: true,
    bibleStudy: true,
    prayer: true,
    meetings: true,
    attendance: true,
    finance: true,
    fundraising: true,
    documents: true,
    activities: true,
    tasks: true,
    contributions: true,
  },
  currency: 'USD',
  annualBudget: null,
  meeting: { frequency: '', day: '', startTime: '', endTime: '', location: '', mode: 'in_person' },
  notifyLeadersOnRequest: true,
  notifyMembersOnAnnouncement: true,
};

/* ============================================================================
 * Policy
 * ========================================================================== */

export type GroupPolicyDocument = GroupPolicy & Document;
@Schema({ timestamps: true, collection: 'church_group_policies' })
export class GroupPolicy {
  @Prop({ type: OID, ref: 'Organization', required: true, unique: true }) organizationId!: Types.ObjectId;
  @Prop({ type: Object, default: {} }) roles!: Partial<Record<GroupPolicyRole, GroupPolicyLevel>>;
  @Prop({ type: Boolean, default: true }) allowProposals!: boolean;
  /** Settings new groups start with. */
  @Prop({ type: Object, default: {} }) defaults!: Partial<GroupSettings>;
  @Prop({ type: OID, ref: 'User', default: null }) updatedByUserId?: Types.ObjectId | null;
  updatedAt?: Date;
}
export const GroupPolicySchema = SchemaFactory.createForClass(GroupPolicy);

/* ============================================================================
 * Member records (role/status per group; Membership.groupIds stays the truth
 * for "is an active member")
 * ========================================================================== */

export const MEMBER_STATUSES = ['active', 'suspended', 'removed', 'left'] as const;

@Schema({ _id: false })
export class MemberHistoryEntry {
  @Prop({ type: String, required: true }) action!: string;
  @Prop({ type: String, default: '' }) detail!: string;
  @Prop({ type: String, default: '' }) byName!: string;
  @Prop({ type: Date, default: () => new Date() }) at!: Date;
}
const MemberHistoryEntrySchema = SchemaFactory.createForClass(MemberHistoryEntry);

export type GroupMemberRecordDocument = GroupMemberRecord & Document;
@Schema({ timestamps: true, collection: 'church_group_members' })
export class GroupMemberRecord {
  @Prop({ type: OID, ref: 'Organization', required: true, index: true }) organizationId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'ChurchGroup', required: true, index: true }) groupId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'Membership', required: true, index: true }) membershipId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'User', required: true }) userId!: Types.ObjectId;
  @Prop({ type: String, enum: GROUP_ROLES, default: 'member' }) role!: GroupRole;
  /** Custom leadership title (e.g. "Worship coordinator"). */
  @Prop({ type: String, default: '', maxlength: 60 }) title!: string;
  @Prop({ type: String, enum: MEMBER_STATUSES, default: 'active', index: true }) status!: string;
  @Prop({ type: [OID], default: [] }) teamIds!: Types.ObjectId[];
  @Prop({ type: Date, default: () => new Date() }) joinedAt!: Date;
  @Prop({ type: OID, ref: 'User', default: null }) approvedByUserId?: Types.ObjectId | null;
  @Prop({ type: [MemberHistoryEntrySchema], default: [] }) history!: MemberHistoryEntry[];
}
export const GroupMemberRecordSchema = SchemaFactory.createForClass(GroupMemberRecord);
GroupMemberRecordSchema.index({ groupId: 1, membershipId: 1 }, { unique: true });

/* ============================================================================
 * Join requests
 * ========================================================================== */

export type GroupJoinRequestDocument = GroupJoinRequest & Document;
@Schema({ timestamps: true, collection: 'church_group_requests' })
export class GroupJoinRequest {
  @Prop({ type: OID, ref: 'Organization', required: true, index: true }) organizationId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'ChurchGroup', required: true, index: true }) groupId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'Membership', required: true }) membershipId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'User', required: true }) userId!: Types.ObjectId;
  @Prop({ type: String, default: '' }) applicantName!: string;
  @Prop({ type: String, default: '', maxlength: 1000 }) message!: string;
  @Prop({ type: String, enum: ['pending', 'approved', 'rejected', 'withdrawn'], default: 'pending', index: true }) status!: string;
  @Prop({ type: String, default: '' }) reviewNote!: string;
  @Prop({ type: OID, ref: 'User', default: null }) reviewedByUserId?: Types.ObjectId | null;
  @Prop({ type: Date, default: null }) reviewedAt?: Date | null;
  createdAt?: Date;
}
export const GroupJoinRequestSchema = SchemaFactory.createForClass(GroupJoinRequest);
GroupJoinRequestSchema.index({ groupId: 1, membershipId: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

/* ============================================================================
 * Invitations
 * ========================================================================== */

export type GroupInvitationDocument = GroupInvitation & Document;
@Schema({ timestamps: true, collection: 'church_group_invitations' })
export class GroupInvitation {
  @Prop({ type: OID, ref: 'Organization', required: true, index: true }) organizationId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'ChurchGroup', required: true, index: true }) groupId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'User', required: true }) inviterUserId!: Types.ObjectId;
  @Prop({ type: String, default: '' }) inviterName!: string;
  /** Church member invited (preferred), or a Fockis user, or an email. */
  @Prop({ type: OID, ref: 'Membership', default: null, index: true }) recipientMembershipId?: Types.ObjectId | null;
  @Prop({ type: OID, ref: 'User', default: null, index: true }) recipientUserId?: Types.ObjectId | null;
  @Prop({ type: String, default: '', lowercase: true, trim: true, index: true }) recipientEmail!: string;
  @Prop({ type: String, default: '' }) recipientName!: string;
  /** SHA-256 of the link token (the token itself is only in the link). */
  @Prop({ type: String, required: true, index: true }) tokenHash!: string;
  @Prop({ type: String, default: '', maxlength: 600 }) message!: string;
  @Prop({ type: Date, required: true }) expiresAt!: Date;
  @Prop({ type: String, enum: ['pending', 'accepted', 'declined', 'expired', 'revoked'], default: 'pending', index: true }) status!: string;
  @Prop({ type: Date, default: null }) respondedAt?: Date | null;
  createdAt?: Date;
}
export const GroupInvitationSchema = SchemaFactory.createForClass(GroupInvitation);

/* ============================================================================
 * Proposals
 * ========================================================================== */

export const PROPOSAL_STATUSES = ['draft', 'submitted', 'under_review', 'more_info', 'approved', 'rejected', 'converted'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

@Schema({ _id: false })
export class ProposalHistory {
  @Prop({ type: String, required: true }) status!: string;
  @Prop({ type: String, default: '' }) note!: string;
  @Prop({ type: String, default: '' }) byName!: string;
  @Prop({ type: Date, default: () => new Date() }) at!: Date;
}
const ProposalHistorySchema = SchemaFactory.createForClass(ProposalHistory);

export type GroupProposalDocument = GroupProposal & Document;
@Schema({ timestamps: true, collection: 'church_group_proposals' })
export class GroupProposal {
  @Prop({ type: OID, ref: 'Organization', required: true, index: true }) organizationId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'User', required: true, index: true }) proposedByUserId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'Membership', default: null }) proposedByMembershipId?: Types.ObjectId | null;
  @Prop({ type: String, default: '' }) proposedByName!: string;
  @Prop({ type: String, required: true, trim: true, maxlength: 120 }) name!: string;
  @Prop({ type: String, enum: GROUP_CATEGORIES, default: 'custom' }) category!: GroupCategory;
  @Prop({ type: String, default: '', maxlength: 2000 }) description!: string;
  @Prop({ type: String, default: '', maxlength: 2000 }) purpose!: string;
  @Prop({ type: OID, ref: 'Membership', default: null }) proposedLeaderMembershipId?: Types.ObjectId | null;
  @Prop({ type: Number, default: null }) expectedMembers?: number | null;
  @Prop({ type: String, default: '', maxlength: 1000 }) suggestedActivities!: string;
  @Prop({ type: [String], default: [] }) documentUrls!: string[];
  @Prop({ type: String, enum: PROPOSAL_STATUSES, default: 'submitted', index: true }) status!: ProposalStatus;
  @Prop({ type: String, default: '' }) reviewNote!: string;
  @Prop({ type: Date, default: null }) submittedAt?: Date | null;
  @Prop({ type: OID, ref: 'ChurchGroup', default: null }) convertedGroupId?: Types.ObjectId | null;
  @Prop({ type: [ProposalHistorySchema], default: [] }) history!: ProposalHistory[];
  createdAt?: Date;
  updatedAt?: Date;
}
export const GroupProposalSchema = SchemaFactory.createForClass(GroupProposal);

/* ============================================================================
 * Teams
 * ========================================================================== */

export type GroupTeamDocument = GroupTeam & Document;
@Schema({ timestamps: true, collection: 'church_group_teams' })
export class GroupTeam {
  @Prop({ type: OID, ref: 'Organization', required: true, index: true }) organizationId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'ChurchGroup', required: true, index: true }) groupId!: Types.ObjectId;
  @Prop({ type: String, required: true, trim: true, maxlength: 80 }) name!: string;
  @Prop({ type: String, default: '', maxlength: 600 }) description!: string;
  @Prop({ type: String, default: '', maxlength: 600 }) responsibilities!: string;
  @Prop({ type: String, default: '', maxlength: 200 }) schedule!: string;
  @Prop({ type: OID, ref: 'Membership', default: null }) leaderMembershipId?: Types.ObjectId | null;
  @Prop({ type: OID, ref: 'Membership', default: null }) assistantMembershipId?: Types.ObjectId | null;
  @Prop({ type: [OID], default: [] }) memberIds!: Types.ObjectId[];
  @Prop({ type: String, enum: ['active', 'inactive'], default: 'active' }) status!: string;
}
export const GroupTeamSchema = SchemaFactory.createForClass(GroupTeam);

/* ============================================================================
 * Posts: announcements, discussions, notices
 * ========================================================================== */

@Schema({ _id: true, timestamps: { createdAt: true, updatedAt: false } })
export class PostComment {
  @Prop({ type: OID, ref: 'User', required: true }) authorUserId!: Types.ObjectId;
  @Prop({ type: String, default: '' }) authorName!: string;
  @Prop({ type: String, required: true, maxlength: 2000 }) body!: string;
  createdAt?: Date;
}
const PostCommentSchema = SchemaFactory.createForClass(PostComment);

export type GroupPostDocument = GroupPost & Document;
@Schema({ timestamps: true, collection: 'church_group_posts' })
export class GroupPost {
  @Prop({ type: OID, ref: 'Organization', required: true, index: true }) organizationId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'ChurchGroup', required: true, index: true }) groupId!: Types.ObjectId;
  @Prop({ type: String, enum: ['announcement', 'discussion', 'notice'], required: true, index: true }) kind!: string;
  /** all | team | leaders */
  @Prop({ type: String, enum: ['all', 'team', 'leaders'], default: 'all' }) audience!: string;
  @Prop({ type: OID, ref: 'GroupTeam', default: null }) teamId?: Types.ObjectId | null;
  @Prop({ type: String, default: '', maxlength: 160 }) title!: string;
  @Prop({ type: String, required: true, maxlength: 6000 }) body!: string;
  @Prop({ type: [String], default: [] }) attachmentUrls!: string[];
  @Prop({ type: Boolean, default: false }) pinned!: boolean;
  @Prop({ type: OID, ref: 'User', required: true }) authorUserId!: Types.ObjectId;
  @Prop({ type: String, default: '' }) authorName!: string;
  @Prop({ type: [PostCommentSchema], default: [] }) comments!: PostComment[];
  createdAt?: Date;
}
export const GroupPostSchema = SchemaFactory.createForClass(GroupPost);
GroupPostSchema.index({ groupId: 1, kind: 1, createdAt: -1 });

/* ============================================================================
 * Bible study
 * ========================================================================== */

export type GroupLessonDocument = GroupLesson & Document;
@Schema({ timestamps: true, collection: 'church_group_lessons' })
export class GroupLesson {
  @Prop({ type: OID, ref: 'Organization', required: true, index: true }) organizationId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'ChurchGroup', required: true, index: true }) groupId!: Types.ObjectId;
  /** Study program / series, e.g. "Gospel of John". */
  @Prop({ type: String, default: 'General', maxlength: 100 }) program!: string;
  @Prop({ type: String, required: true, maxlength: 160 }) title!: string;
  @Prop({ type: [String], default: [] }) passages!: string[];
  @Prop({ type: String, default: '', maxlength: 20000 }) body!: string;
  @Prop({ type: [String], default: [] }) questions!: string[];
  @Prop({ type: String, default: '', maxlength: 500 }) reading!: string;
  @Prop({ type: Date, default: null }) scheduledAt?: Date | null;
  @Prop({ type: [String], default: [] }) documentUrls!: string[];
  @Prop({ type: Boolean, default: true }) allowAnswers!: boolean;
  @Prop({ type: String, enum: ['draft', 'published'], default: 'published' }) status!: string;
  @Prop({ type: OID, ref: 'User', required: true }) authorUserId!: Types.ObjectId;
  @Prop({ type: String, default: '' }) authorName!: string;
  createdAt?: Date;
}
export const GroupLessonSchema = SchemaFactory.createForClass(GroupLesson);

export type GroupLessonNoteDocument = GroupLessonNote & Document;
@Schema({ timestamps: true, collection: 'church_group_lesson_notes' })
export class GroupLessonNote {
  @Prop({ type: OID, ref: 'ChurchGroup', required: true, index: true }) groupId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'GroupLesson', required: true, index: true }) lessonId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'Membership', required: true }) membershipId!: Types.ObjectId;
  @Prop({ type: String, default: '' }) memberName!: string;
  /** Answers are visible to group leaders; notes are private to the member. */
  @Prop({ type: [String], default: [] }) answers!: string[];
  @Prop({ type: String, default: '', maxlength: 10000 }) privateNotes!: string;
  @Prop({ type: Boolean, default: false }) completed!: boolean;
  updatedAt?: Date;
}
export const GroupLessonNoteSchema = SchemaFactory.createForClass(GroupLessonNote);
GroupLessonNoteSchema.index({ lessonId: 1, membershipId: 1 }, { unique: true });

/* ============================================================================
 * Prayer requests
 * ========================================================================== */

@Schema({ _id: true, timestamps: { createdAt: true, updatedAt: false } })
export class PrayerResponse {
  @Prop({ type: OID, ref: 'User', required: true }) authorUserId!: Types.ObjectId;
  @Prop({ type: String, default: '' }) authorName!: string;
  @Prop({ type: String, required: true, maxlength: 2000 }) body!: string;
  createdAt?: Date;
}
const PrayerResponseSchema = SchemaFactory.createForClass(PrayerResponse);

export type GroupPrayerDocument = GroupPrayer & Document;
@Schema({ timestamps: true, collection: 'church_group_prayers' })
export class GroupPrayer {
  @Prop({ type: OID, ref: 'Organization', required: true, index: true }) organizationId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'ChurchGroup', required: true, index: true }) groupId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'User', required: true }) authorUserId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'Membership', required: true }) authorMembershipId!: Types.ObjectId;
  @Prop({ type: String, default: '' }) authorName!: string;
  @Prop({ type: String, required: true, maxlength: 160 }) title!: string;
  @Prop({ type: String, default: '', maxlength: 4000 }) body!: string;
  @Prop({ type: String, default: '', maxlength: 60 }) category!: string;
  @Prop({ type: String, default: '' }) attachmentUrl!: string;
  /** leaders | team | members */
  @Prop({ type: String, enum: ['leaders', 'team', 'members'], default: 'leaders' }) privacy!: string;
  @Prop({ type: OID, ref: 'GroupTeam', default: null }) teamId?: Types.ObjectId | null;
  /** Name hidden from everyone but church leadership's audit. */
  @Prop({ type: Boolean, default: false }) anonymous!: boolean;
  @Prop({ type: String, enum: ['open', 'praying', 'answered', 'archived'], default: 'open', index: true }) status!: string;
  @Prop({ type: [PrayerResponseSchema], default: [] }) responses!: PrayerResponse[];
  createdAt?: Date;
}
export const GroupPrayerSchema = SchemaFactory.createForClass(GroupPrayer);

/* ============================================================================
 * Meetings
 * ========================================================================== */

@Schema({ _id: false })
export class MeetingRegistration {
  @Prop({ type: OID, ref: 'Membership', required: true }) membershipId!: Types.ObjectId;
  @Prop({ type: String, default: '' }) name!: string;
  @Prop({ type: Date, default: () => new Date() }) at!: Date;
}
const MeetingRegistrationSchema = SchemaFactory.createForClass(MeetingRegistration);

export type GroupMeetingDocument = GroupMeeting & Document;
@Schema({ timestamps: true, collection: 'church_group_meetings' })
export class GroupMeeting {
  @Prop({ type: OID, ref: 'Organization', required: true, index: true }) organizationId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'ChurchGroup', required: true, index: true }) groupId!: Types.ObjectId;
  @Prop({ type: String, required: true, maxlength: 140 }) title!: string;
  @Prop({ type: String, default: '', maxlength: 3000 }) description!: string;
  @Prop({ type: String, enum: ['bible_study', 'prayer', 'fellowship', 'leadership', 'other'], default: 'fellowship' }) meetingType!: string;
  @Prop({ type: String, enum: ['in_person', 'online', 'hybrid'], default: 'in_person' }) mode!: string;
  @Prop({ type: Date, required: true, index: true }) startsAt!: Date;
  @Prop({ type: Date, default: null }) endsAt?: Date | null;
  @Prop({ type: String, default: '', maxlength: 300 }) location!: string;
  /** Online meetings: a Fockis meeting created through the Meetings module. */
  @Prop({ type: String, default: '' }) fockisMeetingId!: string;
  @Prop({ type: String, default: '', maxlength: 500 }) meetingLink!: string;
  @Prop({ type: String, enum: ['none', 'weekly', 'biweekly', 'monthly'], default: 'none' }) recurrence!: string;
  @Prop({ type: Date, default: null }) recurrenceUntil?: Date | null;
  @Prop({ type: String, enum: ['all', 'team', 'selected'], default: 'all' }) audience!: string;
  @Prop({ type: OID, ref: 'GroupTeam', default: null }) teamId?: Types.ObjectId | null;
  @Prop({ type: [OID], default: [] }) participantIds!: Types.ObjectId[];
  @Prop({ type: Boolean, default: false }) requiresRegistration!: boolean;
  @Prop({ type: Number, default: null }) capacity?: number | null;
  @Prop({ type: [MeetingRegistrationSchema], default: [] }) registrations!: MeetingRegistration[];
  @Prop({ type: OID, ref: 'User', required: true }) organizerUserId!: Types.ObjectId;
  @Prop({ type: String, default: '' }) organizerName!: string;
  @Prop({ type: String, enum: ['scheduled', 'cancelled', 'completed'], default: 'scheduled' }) status!: string;
}
export const GroupMeetingSchema = SchemaFactory.createForClass(GroupMeeting);

/* ============================================================================
 * Attendance
 * ========================================================================== */

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'] as const;
export type GroupAttendanceDocument = GroupAttendance & Document;
@Schema({ timestamps: true, collection: 'church_group_attendance' })
export class GroupAttendance {
  @Prop({ type: OID, ref: 'Organization', required: true, index: true }) organizationId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'ChurchGroup', required: true, index: true }) groupId!: Types.ObjectId;
  /** meeting | activity | lesson | session (ad hoc) */
  @Prop({ type: String, enum: ['meeting', 'activity', 'lesson', 'session'], required: true }) sessionType!: string;
  /** ID of the meeting / event / lesson, or "" for ad hoc sessions. */
  @Prop({ type: String, default: '' }) sessionId!: string;
  /** YYYY-MM-DD: recurring meetings get one session per date. */
  @Prop({ type: String, required: true }) sessionDate!: string;
  @Prop({ type: String, default: '' }) sessionTitle!: string;
  @Prop({ type: OID, ref: 'Membership', required: true, index: true }) membershipId!: Types.ObjectId;
  @Prop({ type: String, default: '' }) memberName!: string;
  @Prop({ type: String, enum: ATTENDANCE_STATUSES, required: true }) status!: string;
  @Prop({ type: OID, ref: 'User', required: true }) recordedByUserId!: Types.ObjectId;
}
export const GroupAttendanceSchema = SchemaFactory.createForClass(GroupAttendance);
// No duplicate entries for the same member and session.
GroupAttendanceSchema.index({ groupId: 1, sessionType: 1, sessionId: 1, sessionDate: 1, membershipId: 1 }, { unique: true });

/* ============================================================================
 * Tasks
 * ========================================================================== */

export type GroupTaskDocument = GroupTask & Document;
@Schema({ timestamps: true, collection: 'church_group_tasks' })
export class GroupTask {
  @Prop({ type: OID, ref: 'Organization', required: true, index: true }) organizationId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'ChurchGroup', required: true, index: true }) groupId!: Types.ObjectId;
  @Prop({ type: String, required: true, maxlength: 160 }) title!: string;
  @Prop({ type: String, default: '', maxlength: 3000 }) description!: string;
  @Prop({ type: OID, ref: 'Membership', default: null, index: true }) assigneeMembershipId?: Types.ObjectId | null;
  @Prop({ type: String, default: '' }) assigneeName!: string;
  @Prop({ type: String, default: '' }) dueDate!: string;
  @Prop({ type: String, enum: ['low', 'medium', 'high'], default: 'medium' }) priority!: string;
  @Prop({ type: String, enum: ['todo', 'in_progress', 'completed', 'cancelled'], default: 'todo', index: true }) status!: string;
  @Prop({ type: [String], default: [] }) attachmentUrls!: string[];
  @Prop({ type: OID, ref: 'User', required: true }) createdByUserId!: Types.ObjectId;
  @Prop({ type: String, default: '' }) createdByName!: string;
}
export const GroupTaskSchema = SchemaFactory.createForClass(GroupTask);

/* ============================================================================
 * Finance
 * ========================================================================== */

export const TRANSACTION_KINDS = ['contribution', 'donation', 'offering', 'expense', 'fund_request'] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

@Schema({ _id: false })
export class FinanceStep {
  @Prop({ type: String, required: true }) action!: string;
  @Prop({ type: String, default: '' }) note!: string;
  @Prop({ type: String, default: '' }) byName!: string;
  @Prop({ type: OID, ref: 'User', default: null }) byUserId?: Types.ObjectId | null;
  @Prop({ type: Date, default: () => new Date() }) at!: Date;
}
const FinanceStepSchema = SchemaFactory.createForClass(FinanceStep);

export type GroupTransactionDocument = GroupTransaction & Document;
@Schema({ timestamps: true, collection: 'church_group_transactions' })
export class GroupTransaction {
  @Prop({ type: OID, ref: 'Organization', required: true, index: true }) organizationId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'ChurchGroup', required: true, index: true }) groupId!: Types.ObjectId;
  @Prop({ type: String, enum: TRANSACTION_KINDS, required: true, index: true }) kind!: TransactionKind;
  @Prop({ type: Number, required: true, min: 0 }) amount!: number;
  @Prop({ type: String, default: 'USD', uppercase: true }) currency!: string;
  @Prop({ type: String, default: '', maxlength: 200 }) purpose!: string;
  @Prop({ type: String, default: '', maxlength: 60 }) category!: string;
  @Prop({ type: String, default: '', maxlength: 2000 }) description!: string;
  @Prop({ type: String, default: '' }) date!: string;
  @Prop({ type: String, default: '' }) receiptUrl!: string;
  @Prop({ type: OID, ref: 'GroupCampaign', default: null, index: true }) campaignId?: Types.ObjectId | null;
  /** Who gave / submitted (never shown to other members). */
  @Prop({ type: OID, ref: 'Membership', default: null, index: true }) membershipId?: Types.ObjectId | null;
  @Prop({ type: OID, ref: 'User', default: null, index: true }) userId?: Types.ObjectId | null;
  @Prop({ type: String, default: '' }) personName!: string;
  /** Donor allows showing their name on the campaign. */
  @Prop({ type: Boolean, default: false }) showName!: boolean;
  /** stripe | manual */
  @Prop({ type: String, enum: ['stripe', 'manual'], default: 'manual' }) source!: string;
  /**
   * contributions: pending → paid | failed | cancelled ; recorded (manual)
   * expenses / fund requests: submitted → under_review → approved | rejected → paid
   */
  @Prop({ type: String, required: true, index: true }) status!: string;
  @Prop({ type: String, default: null }) paymentId?: string | null;
  @Prop({ type: String, default: null }) paymentIntentId?: string | null;
  @Prop({ type: String, default: '' }) receiptNumber!: string;
  @Prop({ type: Date, default: null }) paidAt?: Date | null;
  @Prop({ type: [FinanceStepSchema], default: [] }) steps!: FinanceStep[];
  createdAt?: Date;
}
export const GroupTransactionSchema = SchemaFactory.createForClass(GroupTransaction);
GroupTransactionSchema.index({ groupId: 1, kind: 1, status: 1, createdAt: -1 });

export type GroupCampaignDocument = GroupCampaign & Document;
@Schema({ timestamps: true, collection: 'church_group_campaigns' })
export class GroupCampaign {
  @Prop({ type: OID, ref: 'Organization', required: true, index: true }) organizationId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'ChurchGroup', required: true, index: true }) groupId!: Types.ObjectId;
  @Prop({ type: String, required: true, maxlength: 140 }) title!: string;
  @Prop({ type: String, default: '', maxlength: 4000 }) description!: string;
  @Prop({ type: String, default: '' }) coverUrl!: string;
  @Prop({ type: Number, required: true, min: 1 }) goalAmount!: number;
  @Prop({ type: String, default: 'USD' }) currency!: string;
  @Prop({ type: String, default: '' }) deadline!: string;
  @Prop({ type: String, enum: ['draft', 'active', 'closed'], default: 'active', index: true }) status!: string;
  @Prop({ type: OID, ref: 'User', required: true }) createdByUserId!: Types.ObjectId;
  createdAt?: Date;
}
export const GroupCampaignSchema = SchemaFactory.createForClass(GroupCampaign);

/* ============================================================================
 * Audit
 * ========================================================================== */

export type GroupAuditLogDocument = GroupAuditLog & Document;
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'church_group_audit_logs' })
export class GroupAuditLog {
  @Prop({ type: OID, ref: 'Organization', required: true, index: true }) organizationId!: Types.ObjectId;
  @Prop({ type: OID, ref: 'ChurchGroup', default: null, index: true }) groupId?: Types.ObjectId | null;
  @Prop({ type: OID, ref: 'User', default: null }) actorUserId?: Types.ObjectId | null;
  @Prop({ type: String, default: '' }) actorName!: string;
  @Prop({ type: String, required: true }) action!: string;
  @Prop({ type: String, default: '', maxlength: 500 }) detail!: string;
  createdAt?: Date;
}
export const GroupAuditLogSchema = SchemaFactory.createForClass(GroupAuditLog);
GroupAuditLogSchema.index({ groupId: 1, createdAt: -1 });

/** All schemas, for MongooseModule.forFeature. */
export const COMMUNITY_MODELS = [
  { name: GroupPolicy.name, schema: GroupPolicySchema },
  { name: GroupMemberRecord.name, schema: GroupMemberRecordSchema },
  { name: GroupJoinRequest.name, schema: GroupJoinRequestSchema },
  { name: GroupInvitation.name, schema: GroupInvitationSchema },
  { name: GroupProposal.name, schema: GroupProposalSchema },
  { name: GroupTeam.name, schema: GroupTeamSchema },
  { name: GroupPost.name, schema: GroupPostSchema },
  { name: GroupLesson.name, schema: GroupLessonSchema },
  { name: GroupLessonNote.name, schema: GroupLessonNoteSchema },
  { name: GroupPrayer.name, schema: GroupPrayerSchema },
  { name: GroupMeeting.name, schema: GroupMeetingSchema },
  { name: GroupAttendance.name, schema: GroupAttendanceSchema },
  { name: GroupTask.name, schema: GroupTaskSchema },
  { name: GroupTransaction.name, schema: GroupTransactionSchema },
  { name: GroupCampaign.name, schema: GroupCampaignSchema },
  { name: GroupAuditLog.name, schema: GroupAuditLogSchema },
];
