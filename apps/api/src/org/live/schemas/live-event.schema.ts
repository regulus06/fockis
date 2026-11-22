/**
 * live-event.schema.ts
 * -----------------------------------------------------------------------------
 * Organization livestream (collection: church_live_events — the existing
 * collection; every field added here is optional with a default, so older
 * records keep working).
 *
 * Source:
 *   fockis_live  — broadcast through the existing Fockis Live (LiveKit) studio.
 *                  `liveStreamId` links the live_streams record created when
 *                  the host starts.
 *   meeting      — an existing Fockis Meeting the organizer created separately
 *                  and pasted here. The meeting link is never sent to anyone
 *                  the livestream's access policy does not allow.
 *
 * Visibility:
 *   public   — anyone (Fockis Live video still needs a Fockis login).
 *   members  — active members of this organization.
 *   groups   — active members of the selected groups / departments.
 *   private  — invited people only (accepted invitations bound to accounts).
 * -----------------------------------------------------------------------------
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum LiveEventVisibility {
  Public = 'public',
  Members = 'members',
  Private = 'private',
  Groups = 'groups',
}

export enum LiveEventState {
  Draft = 'draft',
  Scheduled = 'scheduled',
  Live = 'live',
  Ended = 'ended',
  Cancelled = 'cancelled',
  Failed = 'failed',
}

export enum LiveSourceType {
  FockisLive = 'fockis_live',
  Meeting = 'meeting',
}

@Schema({ _id: false })
export class LiveEventSettings {
  /** Listed on the public organization page (never grants access by itself). */
  @Prop({ default: true }) showOnPublicPage!: boolean;
  /** Members-only streams: show a locked card to visitors. */
  @Prop({ default: false }) showLockedPreview!: boolean;
  @Prop({ default: true }) enableChat!: boolean;
  @Prop({ default: true }) enableComments!: boolean;
  @Prop({ default: true }) enableRecording!: boolean;
  @Prop({ default: true }) allowReplay!: boolean;
  @Prop({ default: true }) allowSharing!: boolean;
  @Prop({ default: false }) notifyMembers!: boolean;
  @Prop({ default: false }) requireRegistration!: boolean;
  @Prop({ default: false }) waitingRoom!: boolean;
  @Prop({ default: false }) requireApproval!: boolean;
  @Prop({ default: false }) allowGuests!: boolean;
  @Prop({ default: true }) attendanceEnabled!: boolean;
  @Prop({ default: false }) allowAccessRequests!: boolean;
  /** Private streams: invitation links work for anyone who signs in with them. */
  @Prop({ default: false }) bearerLinks!: boolean;
  /** Minutes before the start when viewers may enter (meetings) / see "Waiting for host". */
  @Prop({ default: 15, min: 0, max: 120 }) earlyJoinMinutes!: number;
}
export const LiveEventSettingsSchema = SchemaFactory.createForClass(LiveEventSettings);

@Schema({ _id: false })
export class LinkedMeeting {
  @Prop({ type: Types.ObjectId, default: null }) meetingId?: Types.ObjectId | null;
  @Prop({ default: '' }) title!: string;
  @Prop({ type: Date, default: null }) startsAt?: Date | null;
  /** Meeting's own access setting when it was validated. */
  @Prop({ default: '' }) visibility!: string;
  @Prop({ default: false }) requireApproval!: boolean;
  @Prop({ default: false }) waitingRoom!: boolean;
  @Prop({ default: false }) allowGuests!: boolean;
  @Prop({ type: Date, default: null }) validatedAt?: Date | null;
}
export const LinkedMeetingSchema = SchemaFactory.createForClass(LinkedMeeting);

export type LiveEventDocument = LiveEvent & Document;

@Schema({ timestamps: true, collection: 'church_live_events' })
export class LiveEvent {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', default: null })
  branchId?: Types.ObjectId | null;

  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  title!: string;

  @Prop({ type: String, default: '', maxlength: 2000 })
  description?: string;

  @Prop({ type: String, enum: LiveEventVisibility, default: LiveEventVisibility.Members, index: true })
  visibility!: LiveEventVisibility;

  @Prop({ type: String, enum: LiveEventState, default: LiveEventState.Scheduled, index: true })
  state!: LiveEventState;

  @Prop({ type: Date, required: true, index: true })
  scheduledStart!: Date;

  @Prop({ type: Date, default: null })
  scheduledEnd?: Date | null;

  @Prop({ type: String, default: '' })
  timeZone!: string;

  @Prop({ type: String, default: '', maxlength: 140 })
  location!: string;

  @Prop({ type: Date, default: null })
  actualStart?: Date | null;

  @Prop({ type: Date, default: null })
  endedAt?: Date | null;

  /* Media ------------------------------------------------------------------ */

  /** Legacy fields (never filled by the old code; kept for compatibility). */
  @Prop({ type: String, default: null }) streamUrl?: string | null;
  @Prop({ type: String, default: null }) playbackUrl?: string | null;

  /** Thumbnail (posterUrl is the existing field name). */
  @Prop({ type: String, default: null }) posterUrl?: string | null;
  @Prop({ type: String, default: null }) coverUrl?: string | null;

  /* Source ----------------------------------------------------------------- */

  @Prop({ type: String, enum: LiveSourceType, default: LiveSourceType.FockisLive })
  sourceType!: LiveSourceType;

  /** live_streams record used for the Fockis Live broadcast. */
  @Prop({ type: Types.ObjectId, default: null, index: true })
  liveStreamId?: Types.ObjectId | null;

  /** Pasted meeting link (never returned to people without access). */
  @Prop({ type: String, default: '' })
  meetingUrl!: string;

  @Prop({ type: LinkedMeetingSchema, default: () => ({}) })
  meeting!: LinkedMeeting;

  /* Access ------------------------------------------------------------------ */

  @Prop({ type: [Types.ObjectId], default: [] }) allowedGroupIds!: Types.ObjectId[];
  @Prop({ type: [Types.ObjectId], default: [] }) allowedDepartmentIds!: Types.ObjectId[];

  /** Legacy invite list (emails). Kept for old records; invitations replace it. */
  @Prop({ type: [String], default: [] }) invitedGuestEmails!: string[];

  @Prop({ type: LiveEventSettingsSchema, default: () => ({}) })
  settings!: LiveEventSettings;

  /** Optional link to a Fockis event (apps/api/src/events). */
  @Prop({ type: Types.ObjectId, default: null }) eventId?: Types.ObjectId | null;

  /* Counters ---------------------------------------------------------------- */

  /** Legacy counter. Viewer numbers now come from church_live_views / live_streams. */
  @Prop({ type: Number, default: 0 }) viewerCount!: number;
  @Prop({ type: Number, default: 0 }) peakViewers!: number;
  @Prop({ type: Number, default: 0 }) replayViews!: number;

  @Prop({ type: Boolean, default: false, index: true }) isArchived!: boolean;
  @Prop({ type: Date, default: null }) archivedAt?: Date | null;

  @Prop({ type: Date, default: null }) startingSoonNotifiedAt?: Date | null;

  @Prop({ type: Types.ObjectId, default: null }) createdBy?: Types.ObjectId | null;
  @Prop({ type: Types.ObjectId, default: null }) updatedBy?: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const LiveEventSchema = SchemaFactory.createForClass(LiveEvent);
LiveEventSchema.index({ organizationId: 1, isArchived: 1, scheduledStart: -1 });
LiveEventSchema.index({ organizationId: 1, state: 1, scheduledStart: 1 });
