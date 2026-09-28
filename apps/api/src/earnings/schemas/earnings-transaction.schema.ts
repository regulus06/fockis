import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
  Types,
} from "mongoose";

export type EarningsTransactionDocument =
  EarningsTransaction & Document;

@Schema({
  timestamps: true,
})
export class EarningsTransaction {
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  creatorId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: [
      "gift_received",
      "withdrawal",
      "withdrawal_reversed",
      "adjustment",
      "refund",
    ],
    required: true,
  })
  type!:
    | "gift_received"
    | "withdrawal"
    | "withdrawal_reversed"
    | "adjustment"
    | "refund";

  @Prop({
    type: Number,
    required: true,
  })
  amount!: number;

  @Prop({
    type: Number,
    default: 0,
  })
  coins!: number;

  @Prop({
    type: String,
    enum: [
      "live",
      "post",
      "video",
      "photo",
      "profile",
      "other",
    ],
    default: "other",
  })
  sourceType!:
    | "live"
    | "post"
    | "video"
    | "photo"
    | "profile"
    | "other";

  @Prop({
    type: Types.ObjectId,
    default: null,
  })
  sourceId?: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: "Gift",
    default: null,
  })
  giftId?: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: "GiftTransaction",
    default: null,
  })
  giftTransactionId?: Types.ObjectId | null;

  @Prop({
    type: String,
    default: null,
  })
  description?: string | null;

  @Prop({
    type: String,
    default: null,
  })
  referenceId?: string | null;

  @Prop({
    type: String,
    default: "usd",
  })
  currency!: string;
}

export const EarningsTransactionSchema =
  SchemaFactory.createForClass(
    EarningsTransaction,
  );