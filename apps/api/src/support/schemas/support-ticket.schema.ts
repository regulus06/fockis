import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

import { SUPPORT_CATEGORIES, SUPPORT_KINDS, SUPPORT_PRIORITIES, SUPPORT_STATUSES } from "../support.constants";
import type { SupportCategory, SupportKind, SupportPriority, SupportStatus } from "../support.constants";

/** A file stored privately in cloud storage; only signed, short-lived links are handed out. */
@Schema({ _id: false })
export class SupportAttachment {
  @Prop({ type: String, required: true })
  key!: string;

  @Prop({ type: String, required: true, maxlength: 200 })
  name!: string;

  @Prop({ type: String, required: true })
  mimeType!: string;

  @Prop({ type: Number, required: true })
  size!: number;
}
export const SupportAttachmentSchema = SchemaFactory.createForClass(SupportAttachment);

@Schema({ _id: true, timestamps: false })
export class SupportMessage {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  authorId!: Types.ObjectId;

  /** user = the person who opened the ticket; agent = Fockis staff. */
  @Prop({ type: String, enum: ["user", "agent"], required: true })
  author!: "user" | "agent";

  @Prop({ type: String, trim: true, maxlength: 5000, default: "" })
  body!: string;

  @Prop({ type: [SupportAttachmentSchema], default: [] })
  attachments!: SupportAttachment[];

  @Prop({ type: Date, default: () => new Date() })
  createdAt!: Date;
}
export const SupportMessageSchema = SchemaFactory.createForClass(SupportMessage);

/** Staff-only note. Never returned by user endpoints. */
@Schema({ _id: true, timestamps: false })
export class SupportNote {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  authorId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 2000 })
  body!: string;

  @Prop({ type: Date, default: () => new Date() })
  createdAt!: Date;
}
export const SupportNoteSchema = SchemaFactory.createForClass(SupportNote);

/**
 * A Help & Support request: a Contact Support question, a problem report
 * or a live-chat conversation. Messages are stored on the ticket.
 */
@Schema({ collection: "support_tickets", timestamps: true })
export class SupportTicket {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  /** Short reference shown to the user, e.g. FK-7Q4M2D. */
  @Prop({ type: String, required: true, unique: true })
  number!: string;

  @Prop({ type: String, enum: SUPPORT_KINDS, required: true })
  kind!: SupportKind;

  @Prop({ type: String, enum: SUPPORT_CATEGORIES, required: true })
  category!: SupportCategory;

  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  subject!: string;

  @Prop({ type: String, enum: SUPPORT_STATUSES, default: "open", index: true })
  status!: SupportStatus;

  @Prop({ type: String, enum: SUPPORT_PRIORITIES, default: "normal", index: true })
  priority!: SupportPriority;

  @Prop({ type: Types.ObjectId, ref: "User", default: null, index: true })
  assignedTo!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  assignedAt!: Date | null;

  @Prop({ type: [SupportMessageSchema], default: [] })
  messages!: SupportMessage[];

  @Prop({ type: [SupportNoteSchema], default: [] })
  notes!: SupportNote[];

  /** Where the problem happened (Report a Problem). */
  @Prop({ type: String, trim: true, maxlength: 500, default: "" })
  pageUrl!: string;

  /** Feature the problem affects (Report a Problem). */
  @Prop({ type: String, trim: true, maxlength: 100, default: "" })
  affectedFeature!: string;

  /** Browser / device summary sent with problem reports. */
  @Prop({ type: String, trim: true, maxlength: 300, default: "" })
  deviceInfo!: string;

  @Prop({ type: Date, default: () => new Date(), index: true })
  lastMessageAt!: Date;

  /** First staff reply, for response-time reporting. */
  @Prop({ type: Date, default: null })
  firstResponseAt!: Date | null;

  /** An agent replied since the user last opened the ticket. */
  @Prop({ type: Boolean, default: false })
  userUnread!: boolean;

  /** The user wrote since an agent last opened the ticket. */
  @Prop({ type: Boolean, default: true })
  agentUnread!: boolean;

  @Prop({ type: Date, default: null })
  resolvedAt!: Date | null;

  @Prop({ type: Date, default: null })
  closedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type SupportTicketDocument = HydratedDocument<SupportTicket>;
export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);
SupportTicketSchema.index({ userId: 1, lastMessageAt: -1 });
SupportTicketSchema.index({ status: 1, lastMessageAt: -1 });
SupportTicketSchema.index({ kind: 1, status: 1 });
