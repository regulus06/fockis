import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageReportDocument =
  HydratedDocument<MessageReport>;

export enum MessageReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  DISMISSED = 'dismissed',
  ACTIONED = 'actioned',
}

export enum MessageReportReason {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  SCAM = 'scam',
  ABUSE = 'abuse',
  SEXUAL_CONTENT = 'sexual_content',
  VIOLENCE = 'violence',
  HATE = 'hate',
  OTHER = 'other',
}

@Schema({
  collection: 'message_reports',
  timestamps: true,
})
export class MessageReport {
  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  reporterId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  reportedUserId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: false,
    index: true,
  })
  messageId?: Types.ObjectId;

  @Prop({
    type: String,
    required: false,
  })
  conversationId?: string;

  @Prop({
    type: String,
    enum: Object.values(MessageReportReason),
    required: true,
  })
  reason!: MessageReportReason;

  @Prop({
    type: String,
    required: false,
    maxlength: 2000,
  })
  description?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 5000,
  })
  messageSnapshot?: string;

  @Prop({
    type: String,
    enum: Object.values(MessageReportStatus),
    default: MessageReportStatus.PENDING,
    index: true,
  })
  status!: MessageReportStatus;

  @Prop({
    type: Types.ObjectId,
    required: false,
  })
  reviewedBy?: Types.ObjectId;

  @Prop({
    type: String,
    required: false,
    maxlength: 2000,
  })
  adminNote?: string;

  @Prop({
    type: Date,
    required: false,
  })
  reviewedAt?: Date;
}

export const MessageReportSchema =
  SchemaFactory.createForClass(MessageReport);

MessageReportSchema.index({
  status: 1,
  createdAt: -1,
});

MessageReportSchema.index({
  reportedUserId: 1,
  createdAt: -1,
});