import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

/**
 * One seller request to be paid early. Keeps a copy of the plan and fee
 * settings used, so later admin changes never alter past requests.
 */

export type EarlyPayoutStatus = "processing" | "completed" | "partial" | "failed";

@Schema({ _id: false })
export class EarlyPayoutItem {
  @Prop({ type: Types.ObjectId, required: true })
  orderId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  shipmentId!: Types.ObjectId;

  @Prop({ type: String, default: "" })
  orderNumber!: string;

  /** Seller share before the early payout fee. */
  @Prop({ type: Number, required: true, min: 0 })
  amountCents!: number;

  /** This item's part of the request fee. */
  @Prop({ type: Number, required: true, min: 0 })
  feeCents!: number;

  @Prop({ type: String, default: "pending" })
  status!: string;

  @Prop({ type: String, default: "" })
  stripeTransferId!: string;

  @Prop({ type: String, default: "" })
  error!: string;
}
export const EarlyPayoutItemSchema = SchemaFactory.createForClass(EarlyPayoutItem);

@Schema({ timestamps: true, collection: "marketplace_early_payout_requests" })
export class EarlyPayoutRequest {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  storeId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  requestedBy!: string;

  @Prop({ lowercase: true, required: true })
  currency!: string;

  @Prop({ type: Number, required: true, min: 0 })
  grossCents!: number;

  @Prop({ type: Number, required: true, min: 0 })
  feeCents!: number;

  @Prop({ type: Number, required: true, min: 0 })
  netCents!: number;

  /** Amounts actually transferred (may be lower than netCents if some items failed). */
  @Prop({ type: Number, default: 0 })
  transferredNetCents!: number;

  @Prop({ type: Number, default: 0 })
  collectedFeeCents!: number;

  @Prop({ type: [EarlyPayoutItemSchema], default: [] })
  items!: EarlyPayoutItem[];

  @Prop({ type: Types.ObjectId, default: null })
  planId!: Types.ObjectId | null;

  /** Copy of the plan and fee rules used for this request. */
  @Prop({ type: Object, default: {} })
  pricingSnapshot!: Record<string, unknown>;

  @Prop({ type: String, required: true })
  quoteHash!: string;

  @Prop({
    type: String,
    enum: ["processing", "completed", "partial", "failed"],
    default: "processing",
    index: true,
  })
  status!: EarlyPayoutStatus;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;
}

export type EarlyPayoutRequestDocument = HydratedDocument<EarlyPayoutRequest>;
export const EarlyPayoutRequestSchema = SchemaFactory.createForClass(EarlyPayoutRequest);

/** Only one request per store can be processing at a time (stops double requests). */
EarlyPayoutRequestSchema.index(
  { storeId: 1 },
  { unique: true, partialFilterExpression: { status: "processing" }, name: "one_processing_request_per_store" },
);
