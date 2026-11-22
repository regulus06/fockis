/**
 * live-invitation.schema.ts
 * -----------------------------------------------------------------------------
 * Invitations and access requests for organization livestreams
 * (collection: church_live_invitations).
 *
 * kind = "invite":  created by a manager. Either for a Fockis user (userId),
 *                   for an email address, or a shareable link. The link token
 *                   is stored only as a SHA-256 hash; the plain token is
 *                   shown to the manager once (and can be re-issued).
 *                   An invitation grants access only after a signed-in user
 *                   accepts it, which binds it to that account; a link sent
 *                   to an email or a user can only be accepted by that
 *                   person, unless the stream allows bearer links.
 * kind = "request": a signed-in person asked to join; a manager approves
 *                   (status accepted) or denies (declined).
 * -----------------------------------------------------------------------------
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LiveInvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked' | 'declined';
export type LiveInvitationKind = 'invite' | 'request';

export type OrgLiveInvitationDocument = OrgLiveInvitation & Document;

@Schema({ timestamps: true, collection: 'church_live_invitations' })
export class OrgLiveInvitation {
  @Prop({ type: Types.ObjectId, required: true, index: true }) organizationId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true }) liveEventId!: Types.ObjectId;

  @Prop({ type: String, enum: ['invite', 'request'], default: 'invite' }) kind!: LiveInvitationKind;

  /** The invited (or requesting / accepting) Fockis account. */
  @Prop({ type: Types.ObjectId, default: null, index: true }) userId?: Types.ObjectId | null;
  @Prop({ type: String, default: '', lowercase: true, trim: true, maxlength: 254 }) email!: string;
  @Prop({ type: String, default: '', maxlength: 120 }) displayName!: string;

  /** SHA-256 of the link token (null for user invitations without a link and for requests). */
  @Prop({ type: String, default: null, index: true, sparse: true }) tokenHash?: string | null;
  /** Shareable link (not addressed to one person). Needs settings.bearerLinks. */
  @Prop({ type: Boolean, default: false }) isLink!: boolean;

  @Prop({ type: String, enum: ['pending', 'accepted', 'expired', 'revoked', 'declined'], default: 'pending', index: true })
  status!: LiveInvitationStatus;

  @Prop({ type: Date, default: null }) expiresAt?: Date | null;
  @Prop({ type: Date, default: null }) acceptedAt?: Date | null;
  @Prop({ type: Date, default: null }) respondedAt?: Date | null;
  @Prop({ type: Date, default: null }) lastSentAt?: Date | null;
  @Prop({ type: Number, default: 0 }) sendCount!: number;
  @Prop({ type: String, default: '', maxlength: 500 }) message!: string;

  @Prop({ type: Types.ObjectId, default: null }) invitedBy?: Types.ObjectId | null;
  @Prop({ type: Types.ObjectId, default: null }) respondedBy?: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OrgLiveInvitationSchema = SchemaFactory.createForClass(OrgLiveInvitation);
OrgLiveInvitationSchema.index({ liveEventId: 1, userId: 1, status: 1 });
OrgLiveInvitationSchema.index({ liveEventId: 1, kind: 1, createdAt: -1 });
