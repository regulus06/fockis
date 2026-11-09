import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

/** Single settings document (key "global") for Help & Support. */
@Schema({ collection: "support_settings", timestamps: true })
export class SupportSettings {
  @Prop({ type: String, required: true, unique: true, default: "global" })
  key!: string;

  /** Set by a support agent in the admin Support inbox. Drives the "Online now" badge. */
  @Prop({ type: Boolean, default: false })
  liveChatOnline!: boolean;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  updatedBy!: Types.ObjectId | null;

  updatedAt!: Date;
}

export type SupportSettingsDocument = HydratedDocument<SupportSettings>;
export const SupportSettingsSchema = SchemaFactory.createForClass(SupportSettings);
