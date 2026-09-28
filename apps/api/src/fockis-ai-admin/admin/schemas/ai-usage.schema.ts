import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type AiUsageDocument = HydratedDocument<AiUsage>;

@Schema({ timestamps: true, collection: "ai_usage" })
export class AiUsage {
  @Prop({ type: Types.ObjectId, index: true })
  userId?: Types.ObjectId;

  @Prop({ index: true })
  feature!: string;

  @Prop({ default: "unknown" })
  provider!: string;

  @Prop({ default: 0 })
  requests!: number;

  @Prop({ default: 0 })
  tokens!: number;

  @Prop({ default: 0 })
  creditsUsed!: number;

  @Prop({ default: 0 })
  estimatedCost!: number;

  @Prop({ default: "unknown" })
  model!: string;
}

export const AiUsageSchema = SchemaFactory.createForClass(AiUsage);
