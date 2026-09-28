import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type AiRecommendationDocument = HydratedDocument<AiRecommendation>;

@Schema({ timestamps: true, collection: "ai_recommendations" })
export class AiRecommendation {
  @Prop({ type: Types.ObjectId, index: true })
  userId?: Types.ObjectId;

  @Prop({ required: true, index: true })
  category!: string;

  @Prop({ required: true })
  targetType!: string;

  @Prop()
  targetId?: string;

  @Prop({ default: "" })
  title!: string;

  @Prop({ default: "" })
  reason!: string;

  @Prop({ default: 0 })
  relevanceScore!: number;

  @Prop({ default: false })
  sponsored!: boolean;

  @Prop({ default: false })
  clicked!: boolean;

  @Prop({ default: false })
  converted!: boolean;
}

export const AiRecommendationSchema =
  SchemaFactory.createForClass(AiRecommendation);
