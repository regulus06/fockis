import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

/**
 * A temporary stop on paying a seller, placed by an admin while something is
 * checked. Fockis only holds money it still has: a hold stops future
 * transfers to the seller's Stripe account. Money already transferred is
 * not affected.
 */

export const HOLD_REASONS = [
  "identity_verification",
  "new_seller_review",
  "suspicious_transaction",
  "unusual_sales_volume",
  "customer_complaint",
  "refund_investigation",
  "chargeback_investigation",
  "account_review",
  "compliance_review",
  "other",
] as const;
export type HoldReason = (typeof HOLD_REASONS)[number];

/** What sellers see for each reason. Internal notes are never shown to sellers. */
export const HOLD_REASON_LABELS: Record<HoldReason, string> = {
  identity_verification: "Identity verification",
  new_seller_review: "New seller review",
  suspicious_transaction: "Transaction review",
  unusual_sales_volume: "Sales volume review",
  customer_complaint: "Customer complaint review",
  refund_investigation: "Refund review",
  chargeback_investigation: "Chargeback review",
  account_review: "Account review",
  compliance_review: "Compliance review",
  other: "Account review",
};

export type HoldScope = "store" | "order";
export type HoldStatus = "active" | "released";

@Schema({ _id: false })
export class HoldEvent {
  @Prop({ required: true })
  action!: string;

  @Prop({ type: String, default: "" })
  by!: string;

  @Prop({ type: Date, default: Date.now })
  at!: Date;

  @Prop({ type: String, default: "" })
  note!: string;
}
export const HoldEventSchema = SchemaFactory.createForClass(HoldEvent);

@Schema({ timestamps: true, collection: "marketplace_payout_holds" })
export class PayoutHold {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  storeId!: Types.ObjectId;

  /** "store" = all of the store's sales; "order" = one order's sales for this store. */
  @Prop({ type: String, enum: ["store", "order"], required: true })
  scope!: HoldScope;

  @Prop({ type: Types.ObjectId, default: null, index: true })
  orderId!: Types.ObjectId | null;

  @Prop({ type: String, default: "" })
  orderNumber!: string;

  /** null = hold everything in scope; a number = keep at least this many cents unpaid. */
  @Prop({ type: Number, min: 1, default: null })
  amountCents!: number | null;

  @Prop({ lowercase: true, trim: true, default: "usd" })
  currency!: string;

  @Prop({ type: String, enum: HOLD_REASONS, required: true })
  reason!: HoldReason;

  /** Optional short message shown to the seller. */
  @Prop({ type: String, maxlength: 300, default: "" })
  sellerMessage!: string;

  @Prop({ type: String, enum: ["active", "released"], default: "active", index: true })
  status!: HoldStatus;

  @Prop({ type: Date, default: null })
  reviewBy!: Date | null;

  @Prop({ type: String, default: "" })
  createdBy!: string;

  @Prop({ type: String, default: "" })
  releasedBy!: string;

  @Prop({ type: Date, default: null })
  releasedAt!: Date | null;

  /** Internal admin history and notes (never shown to sellers). */
  @Prop({ type: [HoldEventSchema], default: [] })
  history!: HoldEvent[];
}

export type PayoutHoldDocument = HydratedDocument<PayoutHold>;
export const PayoutHoldSchema = SchemaFactory.createForClass(PayoutHold);
PayoutHoldSchema.index({ storeId: 1, status: 1 });
