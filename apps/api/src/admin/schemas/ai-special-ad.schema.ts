import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type AiSpecialAdDocument = HydratedDocument<AiSpecialAd>;

@Schema({ timestamps: true, collection: "ai_special_ads" })
export class AiSpecialAd {
  @Prop({ type: Types.ObjectId, index: true })
  campaignId?: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ default: "" })
  description!: string;

  @Prop({ default: "" })
  advertiserName!: string;

  @Prop({ default: "" })
  destinationUrl!: string;

  @Prop({ default: true })
  enabled!: boolean;

  @Prop({ default: true })
  clearlyLabeledSponsored!: boolean;

  @Prop({ type: Object, default: {} })
  targeting!: Record<string, unknown>;

  @Prop({ default: 0 })
  impressions!: number;

  @Prop({ default: 0 })
  clicks!: number;
}

export const AiSpecialAdSchema =
  SchemaFactory.createForClass(AiSpecialAd);
