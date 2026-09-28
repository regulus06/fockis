import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
  Types,
} from "mongoose";

export type WithdrawalDocument =
  Withdrawal & Document;

export type WithdrawalStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled";

@Schema({
  timestamps: true,
})
export class Withdrawal {
  // ==========================================================================
  // USER
  // ==========================================================================

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  // ==========================================================================
  // AMOUNT
  // ==========================================================================

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  amount!: number;

  // ==========================================================================
  // FEE
  // ==========================================================================

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  fee!: number;

  // ==========================================================================
  // NET AMOUNT
  // ==========================================================================

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  netAmount!: number;

  // ==========================================================================
  // CURRENCY
  // ==========================================================================

  @Prop({
    type: String,
    default: "usd",
    lowercase: true,
  })
  currency!: string;

  // ==========================================================================
  // STATUS
  // ==========================================================================

  @Prop({
    type: String,
    enum: [
      "pending",
      "processing",
      "paid",
      "failed",
      "cancelled",
    ],
    default: "pending",
    index: true,
  })
  status!: WithdrawalStatus;

  // ==========================================================================
  // STRIPE CONNECT ACCOUNT
  // ==========================================================================

  @Prop({
    type: String,
    default: null,
    index: true,
  })
  stripeAccountId?:
    | string
    | null;

  // ==========================================================================
  // STRIPE TRANSFER
  // ==========================================================================

  @Prop({
    type: String,
    default: null,
  })
  stripeTransferId?:
    | string
    | null;

  // ==========================================================================
  // STRIPE PAYOUT
  // ==========================================================================

  @Prop({
    type: String,
    default: null,
  })
  stripePayoutId?:
    | string
    | null;

  // ==========================================================================
  // FAILURE REASON
  // ==========================================================================

  @Prop({
    type: String,
    default: null,
  })
  failureReason?:
    | string
    | null;

  // ==========================================================================
  // DESCRIPTION
  // ==========================================================================

  @Prop({
    type: String,
    default: null,
  })
  description?:
    | string
    | null;
}

export const WithdrawalSchema =
  SchemaFactory.createForClass(
    Withdrawal,
  );