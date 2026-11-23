import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const DISPUTE_REASONS = [
  "not_received",
  "not_as_described",
  "damaged",
  "wrong_item",
  "unauthorized_charge",
  "other",
] as const;

export type DisputeReason = (typeof DISPUTE_REASONS)[number];

export const DISPUTE_STATUSES = [
  "open",
  "under_review",
  "resolved_buyer",
  "resolved_seller",
  "closed",
] as const;

export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const ACTIVE_DISPUTE_STATUSES: DisputeStatus[] = ["open", "under_review"];

@Schema({ _id: false })
export class DisputeEvent {
  @Prop({ type: Date, required: true }) at!: Date;
  @Prop({ required: true, maxlength: 40 }) action!: string;
  @Prop({ type: String, default: null }) actorId!: string | null;
  @Prop({ type: String, default: "", maxlength: 120 }) actorName!: string;
  @Prop({ type: String, default: "", maxlength: 1000 }) note!: string;
}

const DisputeEventSchema = SchemaFactory.createForClass(DisputeEvent);

@Schema({ timestamps: true })
export class Dispute extends Document {
  @Prop({ type: String, default: null, maxlength: 20 })
  number!: string | null;

  @Prop({ type: Types.ObjectId, ref: "Order" })
  orderId!: Types.ObjectId;

  @Prop({ type: String, default: "" })
  orderNumber!: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  openedBy!: Types.ObjectId;

  /** Sellers on the order (for seller visibility and notifications). */
  @Prop({ type: [Types.ObjectId], default: [] })
  sellerIds!: Types.ObjectId[];

  @Prop()
  reason!: string;

  @Prop()
  description!: string;

  @Prop({ default: "open" })
  status!: string;

  /** True while the dispute is open or under review (one per order). */
  @Prop({ default: true })
  active!: boolean;

  @Prop()
  adminNote!: string;

  @Prop({ type: String, default: null }) assignedTo!: string | null;
  @Prop({ type: String, default: null }) resolvedBy!: string | null;
  @Prop({ type: Date, default: null }) resolvedAt!: Date | null;

  @Prop({ type: Number, default: null })
  orderTotal!: number | null;

  @Prop({ type: [DisputeEventSchema], default: [] })
  history!: DisputeEvent[];
}

export const DisputeSchema = SchemaFactory.createForClass(Dispute);

DisputeSchema.index(
  { orderId: 1 },
  { unique: true, partialFilterExpression: { active: true } },
);
DisputeSchema.index({ openedBy: 1, createdAt: -1 });
DisputeSchema.index({ status: 1, createdAt: -1 });
