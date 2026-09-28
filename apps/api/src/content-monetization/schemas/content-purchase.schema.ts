import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
  Types,
} from "mongoose";

import {
  ContentPriceCurrency,
  PaymentMethod,
  PurchaseStatus,
  PurchaseType,
} from "../types/content-monetization.types";

export type ContentPurchaseDocument =
  ContentPurchase & Document;

@Schema({
  timestamps: true,
})
export class ContentPurchase {
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  buyerId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  creatorId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  contentId!: Types.ObjectId;

  @Prop({
    required: true,
  })
  contentType!: string;

  @Prop({
    type: String,
    enum: Object.values(PurchaseType),
    required: true,
  })
  purchaseType!: PurchaseType;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  amount!: number;

  @Prop({
    type: String,
    enum: Object.values(ContentPriceCurrency),
    required: true,
  })
  currency!: ContentPriceCurrency;

  @Prop({
    type: String,
    enum: Object.values(PaymentMethod),
    required: true,
  })
  paymentMethod!: PaymentMethod;

  @Prop({
    type: String,
    enum: Object.values(PurchaseStatus),
    default: PurchaseStatus.PENDING,
    index: true,
  })
  status!: PurchaseStatus;

  @Prop()
  stripePaymentIntentId?: string;

  @Prop()
  stripeCheckoutSessionId?: string;

  @Prop()
  walletTransactionId?: string;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  platformFee!: number;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  creatorAmount!: number;

  @Prop()
  completedAt?: Date;

  @Prop()
  refundedAt?: Date;
}

export const ContentPurchaseSchema =
  SchemaFactory.createForClass(ContentPurchase);

ContentPurchaseSchema.index({
  buyerId: 1,
  contentId: 1,
});

ContentPurchaseSchema.index({
  creatorId: 1,
  status: 1,
});

ContentPurchaseSchema.index({
  stripePaymentIntentId: 1,
});