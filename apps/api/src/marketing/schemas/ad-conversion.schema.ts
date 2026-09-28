import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from "mongoose";

export type AdConversionDocument =
  HydratedDocument<AdConversion>;

/* ============================================================
   CONVERSION TYPES
============================================================ */

export enum ConversionType {
  PURCHASE = "PURCHASE",
  SIGN_UP = "SIGN_UP",
  APP_INSTALL = "APP_INSTALL",
  LEAD = "LEAD",
  ADD_TO_CART = "ADD_TO_CART",
  CHECKOUT = "CHECKOUT",
  WEBSITE_ACTION = "WEBSITE_ACTION",
  CUSTOM = "CUSTOM",
}

/* ============================================================
   CONVERSION
============================================================ */

@Schema({
  timestamps: true,
  collection: "marketing_ad_conversions",
})
export class AdConversion {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Advertisement",
    required: true,
    index: true,
  })
  adId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Campaign",
    required: true,
    index: true,
  })
  campaignId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "User",
    required: false,
    index: true,
  })
  userId?: Types.ObjectId;

  @Prop({
    required: true,
    enum: ConversionType,
    index: true,
  })
  type!: ConversionType;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  value!: number;

  @Prop({
    required: false,
  })
  currency?: string;

  @Prop({
    required: false,
    unique: true,
    sparse: true,
  })
  externalId?: string;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: {},
  })
  metadata!: Record<string, unknown>;
}

export const AdConversionSchema =
  SchemaFactory.createForClass(
    AdConversion,
  );

AdConversionSchema.index({
  campaignId: 1,
  createdAt: -1,
});

AdConversionSchema.index({
  adId: 1,
  createdAt: -1,
});