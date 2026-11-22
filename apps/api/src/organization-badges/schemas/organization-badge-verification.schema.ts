/**
 * organization-badge-verification.schema.ts
 * One QR scan of a member badge: when, and what result the scanner saw.
 * No personal data about the person scanning is kept beyond a short device
 * description. Entries expire after one year.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'organization_badge_verifications', timestamps: false, versionKey: false })
export class OrganizationBadgeVerification {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  badgeId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Date, required: true, default: () => new Date() })
  at!: Date;

  /** verified | pending | suspended | inactive | revoked | expired */
  @Prop({ type: String, required: true })
  result!: string;

  /** e.g. "Safari on iOS" */
  @Prop({ type: String, default: '' })
  device!: string;
}

export type OrganizationBadgeVerificationDocument = HydratedDocument<OrganizationBadgeVerification>;
export const OrganizationBadgeVerificationSchema = SchemaFactory.createForClass(OrganizationBadgeVerification);
OrganizationBadgeVerificationSchema.index({ badgeId: 1, at: -1 });
OrganizationBadgeVerificationSchema.index({ at: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });
