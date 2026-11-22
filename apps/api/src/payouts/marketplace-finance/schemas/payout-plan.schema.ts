import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

/**
 * Seller payout plans (for example "Standard Seller", "Verified Seller").
 * Created and edited by admins in Admin Center — nothing here is hardcoded.
 *
 * Money is stored in integer cents. Percentages are stored in basis points:
 * 150 = 1.50 %.
 */

export type PayoutPlanStatus = "active" | "inactive" | "archived";

@Schema({ _id: false })
export class EarlyPayoutFeeTier {
  /** This tier applies while the requested amount is at most this many cents. null = no upper limit. */
  @Prop({ type: Number, min: 0, default: null })
  upToCents!: number | null;

  @Prop({ type: Number, min: 0, max: 10000, default: 0 })
  percentBps!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  fixedCents!: number;
}
export const EarlyPayoutFeeTierSchema = SchemaFactory.createForClass(EarlyPayoutFeeTier);

@Schema({ _id: false })
export class EarlyPayoutFee {
  @Prop({ default: false })
  enabled!: boolean;

  /** Percentage of the requested amount, in basis points (150 = 1.50 %). */
  @Prop({ type: Number, min: 0, max: 10000, default: 0 })
  percentBps!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  fixedCents!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  minFeeCents!: number;

  /** null = no maximum. */
  @Prop({ type: Number, min: 0, default: null })
  maxFeeCents!: number | null;

  /** Optional tiers. When set, the matching tier's percent and fixed fee replace percentBps / fixedCents. */
  @Prop({ type: [EarlyPayoutFeeTierSchema], default: [] })
  tiers!: EarlyPayoutFeeTier[];
}
export const EarlyPayoutFeeSchema = SchemaFactory.createForClass(EarlyPayoutFee);

@Schema({ timestamps: true, collection: "marketplace_payout_plans" })
export class PayoutPlan {
  @Prop({ required: true, trim: true, maxlength: 80 })
  name!: string;

  @Prop({ trim: true, maxlength: 500, default: "" })
  description!: string;

  /** Lowercase ISO currency the fixed amounts are in, e.g. "usd". */
  @Prop({ required: true, lowercase: true, trim: true, default: "usd" })
  currency!: string;

  @Prop({ type: EarlyPayoutFeeSchema, default: () => ({}) })
  earlyPayout!: EarlyPayoutFee;

  /** Smallest early payout a seller may request. */
  @Prop({ type: Number, min: 0, default: 0 })
  minPayoutCents!: number;

  /** Largest early payout per request. null = no limit. */
  @Prop({ type: Number, min: 0, default: null })
  maxPayoutCents!: number | null;

  /** Days after the customer paid before a sale can be paid out early. */
  @Prop({ type: Number, min: 0, max: 365, default: 0 })
  waitDaysAfterPayment!: number;

  /** Label shown to sellers, e.g. "Weekly". Stripe still decides the real bank schedule. */
  @Prop({ trim: true, maxlength: 40, default: "" })
  payoutScheduleLabel!: string;

  /** Used for stores with no plan assigned. Only one active plan can be the default. */
  @Prop({ default: false })
  isDefault!: boolean;

  @Prop({ type: String, enum: ["active", "inactive", "archived"], default: "active" })
  status!: PayoutPlanStatus;

  @Prop({ type: Date, default: null })
  effectiveFrom!: Date | null;

  @Prop({ type: Date, default: null })
  effectiveTo!: Date | null;

  /** Goes up by one on every edit; saved in each payout's snapshot. */
  @Prop({ type: Number, default: 1 })
  version!: number;

  @Prop({ type: String, default: "" })
  createdBy!: string;

  @Prop({ type: String, default: "" })
  updatedBy!: string;
}

export type PayoutPlanDocument = HydratedDocument<PayoutPlan> & { _id: Types.ObjectId };
export const PayoutPlanSchema = SchemaFactory.createForClass(PayoutPlan);
PayoutPlanSchema.index({ status: 1, isDefault: 1 });

/* ========================================================================== */

@Schema({ timestamps: true, collection: "marketplace_payout_plan_assignments" })
export class PayoutPlanAssignment {
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true })
  storeId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  planId!: Types.ObjectId;

  @Prop({ type: String, default: "" })
  assignedBy!: string;
}

export type PayoutPlanAssignmentDocument = HydratedDocument<PayoutPlanAssignment>;
export const PayoutPlanAssignmentSchema = SchemaFactory.createForClass(PayoutPlanAssignment);
