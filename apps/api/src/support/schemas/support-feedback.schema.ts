import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

import { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES } from "../support.constants";
import type { FeedbackCategory, FeedbackStatus } from "../support.constants";
import { SupportAttachment, SupportAttachmentSchema, SupportNote, SupportNoteSchema } from "./support-ticket.schema";

/** A reply from Fockis staff that the user can see. */
@Schema({ _id: true, timestamps: false })
export class FeedbackResponse {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  authorId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 5000 })
  body!: string;

  @Prop({ type: Date, default: () => new Date() })
  createdAt!: Date;
}
export const FeedbackResponseSchema = SchemaFactory.createForClass(FeedbackResponse);

@Schema({ _id: false })
export class FeedbackStatusChange {
  @Prop({ type: String, enum: FEEDBACK_STATUSES, required: true })
  status!: FeedbackStatus;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  by!: Types.ObjectId | null;

  @Prop({ type: Date, default: () => new Date() })
  at!: Date;
}
export const FeedbackStatusChangeSchema = SchemaFactory.createForClass(FeedbackStatusChange);

/** Product feedback from a user: ideas, bug reports, complaints and suggestions. */
@Schema({ collection: "support_feedback", timestamps: true })
export class SupportFeedback {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  /** Short reference shown to the user, e.g. FB-7Q4M2D. */
  @Prop({ type: String, required: true, unique: true })
  number!: string;

  @Prop({ type: String, enum: FEEDBACK_CATEGORIES, required: true, index: true })
  category!: FeedbackCategory;

  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  subject!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 5000 })
  description!: string;

  @Prop({ type: [SupportAttachmentSchema], default: [] })
  attachments!: SupportAttachment[];

  @Prop({ type: String, enum: FEEDBACK_STATUSES, default: "new", index: true })
  status!: FeedbackStatus;

  @Prop({ type: [FeedbackStatusChangeSchema], default: [] })
  statusHistory!: FeedbackStatusChange[];

  @Prop({ type: [FeedbackResponseSchema], default: [] })
  responses!: FeedbackResponse[];

  /** Staff-only notes. Never returned by user endpoints. */
  @Prop({ type: [SupportNoteSchema], default: [] })
  notes!: SupportNote[];

  @Prop({ type: Types.ObjectId, ref: "User", default: null, index: true })
  assignedTo!: Types.ObjectId | null;

  @Prop({ type: Boolean, default: false, index: true })
  archived!: boolean;

  /** Staff replied since the user last opened it. */
  @Prop({ type: Boolean, default: false })
  userUnread!: boolean;

  @Prop({ type: Date, default: null })
  firstResponseAt!: Date | null;

  /** When it reached implemented or rejected. */
  @Prop({ type: Date, default: null })
  resolvedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type SupportFeedbackDocument = HydratedDocument<SupportFeedback>;
export const SupportFeedbackSchema = SchemaFactory.createForClass(SupportFeedback);
SupportFeedbackSchema.index({ userId: 1, createdAt: -1 });
SupportFeedbackSchema.index({ archived: 1, status: 1, createdAt: -1 });
