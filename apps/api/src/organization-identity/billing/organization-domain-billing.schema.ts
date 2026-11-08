import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, SchemaTypes, Types } from "mongoose";

export type OrganizationDomainBillingDocument = HydratedDocument<OrganizationDomainBilling>;

/** A payment, an admin-recorded payment, or a waiver. */
export interface DomainBillingEntry {
  method: "stripe" | "manual" | "exempt" | "unexempt" | "cleared";
  kind?: "activate" | "renew" | "members";
  amount?: number;
  currency?: string;
  /** Member domains covered by this entry. */
  memberDomains?: number;
  from?: Date;
  to?: Date;
  paymentIntentId?: string;
  paymentId?: string;
  referenceId?: string;
  note?: string;
  byName?: string;
  at: Date;
}

/** Price quoted to the organization; the payment must match one of these. */
export interface DomainBillingQuote {
  referenceId: string;
  kind: "activate" | "renew" | "members";
  amount: number;
  currency: string;
  /** Member domains this payment pays for (total for activate/renew, extra for members). */
  memberDomains: number;
  periodMonths: number;
  createdAt: Date;
}

/**
 * Fee state of an organization's Fockis domain (Organization Identity).
 * Separate from organization_domains so the domain records stay as they are.
 */
@Schema({ timestamps: true, collection: "organization_domain_billing" })
export class OrganizationDomainBilling {
  @Prop({ type: Types.ObjectId, ref: "Organization", required: true, unique: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ index: true }) paidUntil?: Date;
  @Prop({ default: false }) paidForever!: boolean;

  /** Member domains paid for in the current period. */
  @Prop({ default: 0, min: 0 }) memberSlots!: number;

  @Prop({ default: false, index: true }) exempt!: boolean;
  @Prop({ trim: true }) exemptReason?: string;

  @Prop({ type: [SchemaTypes.Mixed], default: [] }) quotes!: DomainBillingQuote[];
  @Prop({ type: [SchemaTypes.Mixed], default: [] }) entries!: DomainBillingEntry[];
}

export const OrganizationDomainBillingSchema = SchemaFactory.createForClass(OrganizationDomainBilling);
