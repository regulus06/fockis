import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
  Types,
} from "mongoose";

export type ContentDownloadDocument =
  ContentDownload & Document;

@Schema({
  timestamps: true,
})
export class ContentDownload {
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  contentId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "ContentPurchase",
    required: true,
  })
  purchaseId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
  })
  contentType!: string;

  @Prop({
    type: String,
    required: true,
  })
  ipAddress!: string;

  @Prop({
    type: String,
    required: true,
  })
  userAgent!: string;

  @Prop({
    default: true,
  })
  successful!: boolean;

  @Prop()
  downloadedAt!: Date;
}

export const ContentDownloadSchema =
  SchemaFactory.createForClass(ContentDownload);