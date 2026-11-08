import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, SchemaTypes } from "mongoose";

export type FockisDomainPricingDocument = HydratedDocument<FockisDomainPricing>;

export interface DomainPricingChange {
  summary: string;
  byName?: string;
  at: Date;
}

/**
 * What a Fockis domain (<name>.fockis.com) costs. One document (key "default"),
 * edited by Fockis admins in Admin Center → Domains → Pricing. Nothing here is
 * hard-coded. Used by Organization Identity domains and Fockis Academy schools.
 */
@Schema({ timestamps: true, collection: "fockis_domain_pricing" })
export class FockisDomainPricing {
  @Prop({ required: true, unique: true, default: "default" })
  key!: string;

  /** Off = every domain is free (nothing is charged). */
  @Prop({ default: false })
  enabled!: boolean;

  /** When charging was last switched on (start of the grace period for domains that existed before). */
  @Prop() enabledAt?: Date;

  @Prop({ default: "USD", uppercase: true, trim: true })
  currency!: string;

  /** Months one payment covers. 0 = one-time fee (lifetime). */
  @Prop({ default: 12, min: 0, max: 60 })
  periodMonths!: number;

  /** Days a lapsed domain keeps working before it pauses. */
  @Prop({ default: 14, min: 0, max: 180 })
  graceDays!: number;

  /** Base-domain price per organization type (see domain-price-types.ts). Missing type → "other". */
  @Prop({ type: SchemaTypes.Mixed, default: {} })
  prices!: Record<string, number>;

  /** Price of each member domain (john.church.fockis.com), per period. 0 = included. */
  @Prop({ default: 0, min: 0 })
  memberDomainPrice!: number;

  /** Price of a personal domain (john.fockis.com) for someone outside any organization, per period. 0 = free. */
  @Prop({ default: 0, min: 0 })
  personalDomainPrice!: number;

  /** Optional note shown to organizations on the payment page. */
  @Prop({ trim: true, maxlength: 600 })
  note?: string;

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  history!: DomainPricingChange[];
}

export const FockisDomainPricingSchema = SchemaFactory.createForClass(FockisDomainPricing);
