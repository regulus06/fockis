import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type AiConversationDocument = HydratedDocument<AiConversation>;

@Schema({ timestamps: true, collection: "ai_conversations" })
export class AiConversation {
  @Prop({ type: Types.ObjectId, index: true })
  userId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  assistantId?: Types.ObjectId;

  @Prop({ default: "" })
  title!: string;

  @Prop({ default: "" })
  summary!: string;

  @Prop({
    enum: ["active", "completed", "blocked", "flagged", "archived"],
    default: "active",
    index: true,
  })
  status!: string;

  @Prop({ default: "chat" })
  channel!: string;

  @Prop({ default: 0 })
  messageCount!: number;

  @Prop({ default: 0 })
  tokensUsed!: number;

  @Prop({ default: 0 })
  creditsUsed!: number;

  @Prop({ default: "" })
  moderationNote!: string;

  @Prop({ type: [Object], default: [] })
  messages!: Record<string, unknown>[];
}

export const AiConversationSchema =
  SchemaFactory.createForClass(AiConversation);
