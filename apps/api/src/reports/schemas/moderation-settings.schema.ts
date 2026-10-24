import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

import { ReportReason } from "../reports.constants";

export type ModerationSettingsDocument = HydratedDocument<ModerationSettings>;

/** Single document (key "default") with admin-editable thresholds. */
@Schema({ collection: "moderation_settings", timestamps: true, versionKey: false })
export class ModerationSettings {
  @Prop({ type: String, required: true, unique: true, default: "default" })
  key!: string;

  @Prop({ type: Number, min: 1, max: 1000 })
  reviewThreshold?: number;

  @Prop({ type: Number, min: 1, max: 1000 })
  highPriorityThreshold?: number;

  @Prop({ type: [String], enum: Object.values(ReportReason), default: undefined })
  urgentReasons?: ReportReason[];

  @Prop({ type: Number, min: 1, max: 1000 })
  maxReportsPerDay?: number;

  @Prop({ type: Boolean })
  notifyOnNewCase?: boolean;

  @Prop({ type: String, default: "" })
  updatedBy!: string;
}

export const ModerationSettingsSchema = SchemaFactory.createForClass(ModerationSettings);
