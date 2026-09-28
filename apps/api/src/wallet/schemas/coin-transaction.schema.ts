import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

// ============================================================
// DOCUMENT TYPE
// ============================================================

export type CoinTransactionDocument =
  HydratedDocument<CoinTransaction>;

// ============================================================
// TRANSACTION TYPES
// ============================================================

export enum CoinTransactionType {
  // User purchased coins
  PURCHASE = "PURCHASE",

  // User sent coins as a LIVE gift
  GIFT_SENT = "GIFT_SENT",

  // Creator received coins from a LIVE gift
  GIFT_RECEIVED = "GIFT_RECEIVED",

  // User purchased monetized content
  CONTENT_PURCHASE = "CONTENT_PURCHASE",

  // Creator earned coins from monetized content
  CONTENT_REVENUE = "CONTENT_REVENUE",

  // Coins returned to the user
  REFUND = "REFUND",

  // Promotional or bonus coins
  BONUS = "BONUS",
}

// ============================================================
// COIN TRANSACTION SCHEMA
// ============================================================

@Schema({
  timestamps: true,
})
export class CoinTransaction {

  // ============================================================
  // USER
  // ============================================================

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  // ============================================================
  // AMOUNT
  //
  // Positive = coins added
  // Negative = coins spent
  // ============================================================

  @Prop({
    type: Number,
    required: true,
  })
  amount!: number;

  // ============================================================
  // TYPE
  // ============================================================

  @Prop({
    type: String,
    required: true,
    enum: Object.values(
      CoinTransactionType,
    ),
    index: true,
  })
  type!: CoinTransactionType;

  // ============================================================
  // DESCRIPTION
  // ============================================================

  @Prop({
    type: String,
    default: "",
  })
  description!: string;

  // ============================================================
  // REFERENCE
  //
  // Examples:
  // - Stripe PaymentIntent
  // - Gift ID
  // - Content Purchase ID
  // - Content ID
  // ============================================================

  @Prop({
    type: String,
    default: "",
    index: true,
  })
  referenceId!: string;
}

// ============================================================
// SCHEMA
// ============================================================

export const CoinTransactionSchema =
  SchemaFactory.createForClass(
    CoinTransaction,
  );