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
  ContentType,
} from "../types/content-monetization.types";

export type PaidContentDocument = PaidContent & Document;

@Schema({
  timestamps: true,
})
export class PaidContent {
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
    type: String,
    enum: Object.values(ContentType),
    required: true,
  })
  contentType!: ContentType;

  @Prop({
    required: true,
    trim: true,
  })
  title!: string;

  @Prop({
    trim: true,
    default: "",
  })
  description!: string;

  @Prop({
    default: false,
  })
  isPaid!: boolean;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  streamPrice!: number;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  downloadPrice!: number;

  @Prop({
    type: String,
    enum: Object.values(ContentPriceCurrency),
    default: ContentPriceCurrency.COINS,
  })
  currency!: ContentPriceCurrency;

  @Prop({
    default: false,
  })
  downloadEnabled!: boolean;

  @Prop({
    default: false,
  })
  downloadIncludedWithStream!: boolean;

  @Prop({
    default: true,
  })
  streamEnabled!: boolean;

  @Prop({
    default: true,
  })
  active!: boolean;

  @Prop({
    default: 0,
  })
  totalPurchases!: number;

  @Prop({
    default: 0,
  })
  totalDownloads!: number;
}

export const PaidContentSchema =
  SchemaFactory.createForClass(PaidContent);

PaidContentSchema.index({
  contentId: 1,
  contentType: 1,
});

PaidContentSchema.index({
  creatorId: 1,
});