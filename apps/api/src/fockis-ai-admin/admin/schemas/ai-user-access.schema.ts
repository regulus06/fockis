import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type AiUserAccessDocument = HydratedDocument<AiUserAccess>;

@Schema({ timestamps: true, collection: "ai_user_access" })
export class AiUserAccess {
  @Prop({ required: true, unique: true, index: true, type: Types.ObjectId })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
    enum: ["INHERIT", "CUSTOM", "GRANTED", "BLOCKED"],
    default: "INHERIT",
  })
  mode!: string;

  @Prop({ type: Object, default: {} })
  features!: Record<string, boolean>;

  @Prop({ type: Date, default: null })
  expiresAt?: Date | null;

  @Prop({ default: "" })
  reason!: string;

  @Prop({ type: Types.ObjectId, default: null })
  updatedBy?: Types.ObjectId | null;
}

export const AiUserAccessSchema =
  SchemaFactory.createForClass(AiUserAccess);
