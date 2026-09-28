import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type AiToolDocument = HydratedDocument<AiTool>;

@Schema({ timestamps: true, collection: "ai_tools" })
export class AiTool {
  @Prop({ required: true, unique: true, index: true })
  name!: string;

  @Prop({ default: "" })
  description!: string;

  @Prop({ default: "function" })
  type!: string;

  @Prop({ default: true })
  enabled!: boolean;

  @Prop({ default: true })
  requiresAccess!: boolean;

  @Prop({ type: Object, default: {} })
  schema!: Record<string, unknown>;

  @Prop()
  vapiToolId?: string;
}

export const AiToolSchema = SchemaFactory.createForClass(AiTool);
