import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

/**
 * One settings document is stored with _id = "marketplace".
 * Rates are percentages, e.g. 10 means 10%.
 */
export type MarketplaceCommissionDocument =
  HydratedDocument<MarketplaceCommission>;

@Schema({ _id: false })
export class CommissionOverride {
  @Prop({ required: true, trim: true })
  key!: string;

  @Prop({ required: true, min: 0, max: 100 })
  rate!: number;
}
export const CommissionOverrideSchema =
  SchemaFactory.createForClass(CommissionOverride);

@Schema({ _id: false })
export class CommissionAuditEntry {
  @Prop({ required: true })
  action!: string;

  @Prop({ required: true, min: 0, max: 100 })
  previousDefaultRate!: number;

  @Prop({ required: true, min: 0, max: 100 })
  newDefaultRate!: number;

  @Prop({ required: true })
  changedBy!: string;

  @Prop({ default: Date.now })
  changedAt!: Date;

  @Prop({ type: Object, default: {} })
  changes!: Record<string, unknown>;
}
export const CommissionAuditEntrySchema =
  SchemaFactory.createForClass(CommissionAuditEntry);

@Schema({ timestamps: true, collection: "marketplace_commission_settings" })
export class MarketplaceCommission {
  /** Singleton document ID: "marketplace" (a text ID, not a database ObjectId). */
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, min: 0, max: 100, default: 10 })
  defaultRate!: number;

  /** Keys are product category IDs/slugs. */
  @Prop({ type: [CommissionOverrideSchema], default: [] })
  categoryRates!: CommissionOverride[];

  /** Keys are MongoDB Store IDs. */
  @Prop({ type: [CommissionOverrideSchema], default: [] })
  storeRates!: CommissionOverride[];

  /** Fixed commission per shipment, in cents, added to the percentage. */
  @Prop({ type: Number, min: 0, default: 0 })
  defaultFixedCents!: number;

  /** Smallest commission per shipment, in cents. */
  @Prop({ type: Number, min: 0, default: 0 })
  minCommissionCents!: number;

  /** Largest commission per shipment, in cents. null = no maximum. */
  @Prop({ type: Number, min: 0, default: null })
  maxCommissionCents!: number | null;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: [CommissionAuditEntrySchema], default: [] })
  auditLog!: CommissionAuditEntry[];
}

export const MarketplaceCommissionSchema =
  SchemaFactory.createForClass(MarketplaceCommission);
