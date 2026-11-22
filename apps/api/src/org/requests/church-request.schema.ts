/**
 * church-request.schema.ts
 * -----------------------------------------------------------------------------
 * Requests & Inquiries: prayer requests, counseling, questions, volunteer
 * offers… sent by members, by visitors from the public website, or entered
 * by staff. Each request keeps its replies, internal notes and a full
 * history of who did what.
 *
 * Internal notes are never returned to the requester or by public endpoints.
 * Prayer, counseling and pastoral-support requests are visible only to the
 * owner, administrators, pastors and the person they are assigned to.
 * -----------------------------------------------------------------------------
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const REQUEST_TYPES = [
  'prayer',
  'visit',
  'counseling',
  'general',
  'volunteer',
  'membership',
  'baptism',
  'marriage',
  'event',
  'ministry',
  'pastoral_support',
  'assistance',
  'meeting',
  'other',
] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

/** Types the public "Contact Our Church" form offers. */
export const PUBLIC_REQUEST_TYPES: readonly RequestType[] = ['general', 'prayer', 'visit', 'membership', 'baptism', 'counseling', 'volunteer', 'assistance', 'meeting', 'other'];

/** Restricted to the owner, administrators, pastors and the assignee. */
export const SENSITIVE_REQUEST_TYPES: readonly RequestType[] = ['prayer', 'counseling', 'pastoral_support', 'assistance'];

export const REQUEST_STATUSES = ['new', 'in_progress', 'waiting', 'resolved', 'archived'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_PRIORITIES = ['normal', 'high', 'urgent'] as const;
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];

@Schema({ _id: false })
export class RequestReply {
  @Prop({ type: String, required: true }) id!: string;
  /** email | fockis */
  @Prop({ type: String, required: true }) channel!: string;
  @Prop({ type: String, required: true }) body!: string;
  @Prop({ type: String, default: '' }) to!: string;
  @Prop({ type: Types.ObjectId, default: null }) sentByUserId!: Types.ObjectId | null;
  @Prop({ type: String, default: '' }) sentByName!: string;
  @Prop({ type: Date, required: true }) sentAt!: Date;
  /** sent | failed */
  @Prop({ type: String, required: true }) delivery!: string;
  @Prop({ type: String, default: '' }) error!: string;
}
export const RequestReplySchema = SchemaFactory.createForClass(RequestReply);

@Schema({ _id: false })
export class RequestNote {
  @Prop({ type: String, required: true }) id!: string;
  @Prop({ type: String, required: true }) body!: string;
  /** staff | pastoral */
  @Prop({ type: String, default: 'staff' }) visibility!: string;
  @Prop({ type: Types.ObjectId, default: null }) authorUserId!: Types.ObjectId | null;
  @Prop({ type: String, default: '' }) authorName!: string;
  @Prop({ type: Date, required: true }) createdAt!: Date;
}
export const RequestNoteSchema = SchemaFactory.createForClass(RequestNote);

@Schema({ _id: false })
export class RequestHistoryEntry {
  @Prop({ type: Date, required: true }) at!: Date;
  /** submitted, created, assigned, reassigned, unassigned, status_changed, priority_changed, replied, note_added, resolved, archived, restored, due_changed, ministry_assigned, overdue */
  @Prop({ type: String, required: true }) action!: string;
  @Prop({ type: Types.ObjectId, default: null }) actorUserId!: Types.ObjectId | null;
  @Prop({ type: String, default: '' }) actorName!: string;
  @Prop({ type: String, default: '' }) from!: string;
  @Prop({ type: String, default: '' }) to!: string;
  @Prop({ type: String, default: '' }) note!: string;
}
export const RequestHistoryEntrySchema = SchemaFactory.createForClass(RequestHistoryEntry);

@Schema({ timestamps: true, collection: 'church_requests' })
export class ChurchRequest {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  /** e.g. REQ-2026-7F3K9Q (shown to the requester). */
  @Prop({ type: String, required: true, unique: true })
  requestNumber!: string;

  /** member | public */
  @Prop({ type: String, enum: ['member', 'public'], required: true, index: true })
  requesterType!: 'member' | 'public';

  @Prop({ type: Types.ObjectId, default: null, index: true }) requesterUserId!: Types.ObjectId | null;
  @Prop({ type: Types.ObjectId, ref: 'Membership', default: null }) requesterMembershipId!: Types.ObjectId | null;
  @Prop({ type: String, required: true, trim: true }) requesterName!: string;
  @Prop({ type: String, default: '', trim: true, lowercase: true }) email!: string;
  @Prop({ type: String, default: '', trim: true }) phone!: string;
  @Prop({ type: String, default: null }) avatarUrl!: string | null;

  @Prop({ type: String, enum: REQUEST_TYPES, required: true, index: true }) requestType!: RequestType;
  @Prop({ type: String, required: true, trim: true }) subject!: string;
  @Prop({ type: String, required: true }) message!: string;

  @Prop({ type: String, enum: REQUEST_STATUSES, default: 'new', index: true }) status!: RequestStatus;
  @Prop({ type: String, default: null }) statusBeforeArchive!: RequestStatus | null;
  @Prop({ type: String, enum: REQUEST_PRIORITIES, default: 'normal' }) priority!: RequestPriority;
  /** 0 normal, 1 high, 2 urgent — for sorting by priority. */
  @Prop({ type: Number, default: 0 }) priorityRank!: number;

  @Prop({ type: Types.ObjectId, ref: 'Membership', default: null, index: true }) assignedToMembershipId!: Types.ObjectId | null;
  @Prop({ type: Types.ObjectId, default: null }) assignedToUserId!: Types.ObjectId | null;
  @Prop({ type: String, default: '' }) assignedToName!: string;
  @Prop({ type: Types.ObjectId, ref: 'Department', default: null, index: true }) assignedDepartmentId!: Types.ObjectId | null;
  @Prop({ type: String, default: '' }) assignedDepartmentName!: string;
  @Prop({ type: Types.ObjectId, default: null }) assignedByUserId!: Types.ObjectId | null;
  @Prop({ type: Date, default: null }) assignedAt!: Date | null;

  /** Respond/resolve by. Set from the priority when not given. */
  @Prop({ type: Date, default: null, index: true }) dueAt!: Date | null;

  /** public_form | member_form | staff */
  @Prop({ type: String, default: 'public_form' }) source!: string;
  @Prop({ type: Date, default: null }) consentAt!: Date | null;

  @Prop({ type: [RequestReplySchema], default: [] }) replies!: RequestReply[];
  @Prop({ type: [RequestNoteSchema], default: [] }) notes!: RequestNote[];
  @Prop({ type: [RequestHistoryEntrySchema], default: [] }) history!: RequestHistoryEntry[];

  @Prop({ type: Date, default: null }) firstResponseAt!: Date | null;
  @Prop({ type: Date, default: null }) resolvedAt!: Date | null;
  @Prop({ type: Date, default: null }) archivedAt!: Date | null;
  @Prop({ type: Date, default: null }) overdueNotifiedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ChurchRequestDocument = HydratedDocument<ChurchRequest>;
export const ChurchRequestSchema = SchemaFactory.createForClass(ChurchRequest);
ChurchRequestSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
ChurchRequestSchema.index({ organizationId: 1, requesterType: 1, createdAt: -1 });
ChurchRequestSchema.index({ organizationId: 1, assignedToMembershipId: 1, status: 1 });
ChurchRequestSchema.index({ organizationId: 1, dueAt: 1, status: 1 });
