import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

export type AiCreditsDocument = HydratedDocument<AiCredits>;

@Schema({
  timestamps: true,
  collection: "ai_credits",
})
export class AiCredits {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  balance!: number;

  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  monthlyAllowance!: number;

  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  usedThisPeriod!: number;

  @Prop()
  resetAt?: Date;

  @Prop({
    required: true,
    default: 0,
  })
  reserved!: number;
}

export const AiCreditsSchema = SchemaFactory.createForClass(AiCredits);