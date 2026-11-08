import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, SchemaTypes, Types } from "mongoose";

import type { DomainBillingEntry, DomainBillingQuote } from "../billing/organization-domain-billing.schema";

export type PersonalDomainDocument = HydratedDocument<PersonalDomain>;

/**
 * A person's own Fockis domain (john.fockis.com), separate from any
 * organization or school. One per person. Shown on their profile while paid.
 * Price: Admin Center → Domains → Domain Pricing → "Personal domain".
 */
@Schema({ timestamps: true, collection: "personal_domains" })
export class PersonalDomain {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, unique: true, index: true })
  userId!: Types.ObjectId;

  /** "john" */
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  name!: string;

  /** "john.fockis.com" */
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  domain!: string;

  /** When the current name was picked (an unpaid reservation lasts 7 days from here). */
  @Prop({ default: () => new Date() }) reservedAt!: Date;

  @Prop({ index: true }) paidUntil?: Date;
  @Prop({ default: false }) paidForever!: boolean;

  @Prop({ default: false }) exempt!: boolean;
  @Prop({ trim: true }) exemptReason?: string;

  @Prop({ type: [SchemaTypes.Mixed], default: [] }) quotes!: DomainBillingQuote[];
  @Prop({ type: [SchemaTypes.Mixed], default: [] }) entries!: DomainBillingEntry[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const PersonalDomainSchema = SchemaFactory.createForClass(PersonalDomain);
