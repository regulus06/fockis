import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type AiPlanDocument = HydratedDocument<AiPlan>;

@Schema({ timestamps: true, collection: "ai_plans" })
export class AiPlan {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ default: "" })
  description!: string;

  @Prop({ index: true })
  membershipPlanId?: string;

  @Prop({ default: 0, index: true })
  priority!: number;

  @Prop({ default: true })
  enabled!: boolean;

  @Prop({
    type: {
      chat: { type: Boolean, default: false },
      voice: { type: Boolean, default: false },
      phoneCalls: { type: Boolean, default: false },
      recommendations: { type: Boolean, default: false },
      specialAds: { type: Boolean, default: false },
    },
    default: {},
  })
  features!: {
    chat?: boolean;
    voice?: boolean;
    phoneCalls?: boolean;
    recommendations?: boolean;
    specialAds?: boolean;
  };

  @Prop({ type: Object, default: {} })
  limits!: Record<string, number>;
}

export const AiPlanSchema = SchemaFactory.createForClass(AiPlan);
