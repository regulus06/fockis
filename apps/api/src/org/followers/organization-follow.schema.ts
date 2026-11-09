/**
 * organization-follow.schema.ts
 * A Fockis user following an organization's public updates. Following is not
 * membership: it grants no access to anything private.
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'organization_follows' })
export class OrganizationFollow {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export type OrganizationFollowDocument = HydratedDocument<OrganizationFollow>;

export const OrganizationFollowSchema = SchemaFactory.createForClass(OrganizationFollow);

OrganizationFollowSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
