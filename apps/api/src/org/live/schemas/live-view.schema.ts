/**
 * live-view.schema.ts
 * -----------------------------------------------------------------------------
 * One viewing session of an organization livestream
 * (collection: church_live_views).
 *
 * A session is created only when someone who passed the access check presses
 * Join / Watch — never when a page is merely opened. The watch page sends a
 * heartbeat every minute and "leave" when it closes, so join / leave times
 * and durations are real. A session with no heartbeat for 2 minutes counts as
 * left at its last heartbeat.
 * -----------------------------------------------------------------------------
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrgLiveViewDocument = OrgLiveView & Document;

@Schema({ timestamps: true, collection: 'church_live_views' })
export class OrgLiveView {
  @Prop({ type: Types.ObjectId, required: true, index: true }) organizationId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true }) liveEventId!: Types.ObjectId;

  /** Signed-in viewer (null for public visitors). */
  @Prop({ type: Types.ObjectId, default: null, index: true }) userId?: Types.ObjectId | null;
  /** Random id kept by the visitor's browser (public visitors). */
  @Prop({ type: String, default: '' }) visitorKey!: string;

  /** Active member of the organization at join time. */
  @Prop({ type: Boolean, default: false }) isMember!: boolean;
  /** Watching the recording rather than the live broadcast. */
  @Prop({ type: Boolean, default: false }) isReplay!: boolean;

  @Prop({ type: String, default: '' }) source!: string;

  @Prop({ type: Date, required: true }) joinedAt!: Date;
  @Prop({ type: Date, required: true }) lastSeenAt!: Date;
  @Prop({ type: Date, default: null }) leftAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OrgLiveViewSchema = SchemaFactory.createForClass(OrgLiveView);
OrgLiveViewSchema.index({ liveEventId: 1, lastSeenAt: -1 });
OrgLiveViewSchema.index({ organizationId: 1, joinedAt: -1 });
