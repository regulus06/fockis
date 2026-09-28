import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MessageSettingsDocument =
  HydratedDocument<MessageSettings>;

@Schema({
  collection: 'message_settings',
  timestamps: true,
})
export class MessageSettings {
  @Prop({
    type: Boolean,
    default: true,
  })
  messagingEnabled!: boolean;

  @Prop({
    type: Number,
    default: 1000,
    min: 1,
  })
  maxMessageLength!: number;

  @Prop({
    type: Number,
    default: 100,
    min: 0,
  })
  maxMessagesPerMinute!: number;

  @Prop({
    type: Boolean,
    default: true,
  })
  reactionsEnabled!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  repliesEnabled!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  forwardingEnabled!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  editingEnabled!: boolean;

  @Prop({
    type: Number,
    default: 15,
    min: 0,
  })
  editWindowMinutes!: number;

  @Prop({
    type: Boolean,
    default: true,
  })
  deletionEnabled!: boolean;

  @Prop({
    type: Number,
    default: 48,
    min: 0,
  })
  deletionWindowHours!: number;

  @Prop({
    type: Boolean,
    default: true,
  })
  readReceiptsEnabled!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  typingIndicatorsEnabled!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  onlineStatusEnabled!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  linkPreviewsEnabled!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  messageSearchEnabled!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  pinningEnabled!: boolean;
}

export const MessageSettingsSchema =
  SchemaFactory.createForClass(MessageSettings);

MessageSettingsSchema.index(
  { createdAt: 1 },
  { unique: false },
);