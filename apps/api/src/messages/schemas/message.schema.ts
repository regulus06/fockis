import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type MessageDocument =
  HydratedDocument<Message>;

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  DOCUMENT = "document",
  FILE = "file",
  SYSTEM = "system",
}

export enum MessageStatus {
  SENDING = "sending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
}

/* ============================================================================
   ATTACHMENT
============================================================================ */

@Schema({
  _id: false,
})
export class MessageAttachment {
  @Prop({
    type: String,
    required: true,
  })
  id!: string;

  @Prop({
    type: String,
    enum: [
      "image",
      "video",
      "audio",
      "document",
    ],
    required: true,
  })
  kind!: string;

  @Prop({
    type: String,
    required: true,
  })
  url!: string;

  @Prop({
    type: String,
    required: true,
  })
  name!: string;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  size!: number;

  @Prop({
    type: String,
    required: true,
  })
  mimeType!: string;

  @Prop({
    type: Number,
    min: 0,
  })
  width?: number;

  @Prop({
    type: Number,
    min: 0,
  })
  height?: number;

  @Prop({
    type: Number,
    min: 0,
  })
  duration?: number;

  @Prop({
    type: [Number],
    default: undefined,
  })
  waveform?: number[];

  @Prop({
    type: String,
  })
  thumbnailUrl?: string;

  @Prop({
    type: String,
    maxlength: 2000,
  })
  caption?: string;
}

/* ============================================================================
   REPLY
============================================================================ */

@Schema({
  _id: false,
})
export class ReplyReference {
  @Prop({
    type: Types.ObjectId,
    ref: "Message",
    required: true,
  })
  messageId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
  })
  senderName!: string;

  @Prop({
    type: String,
    maxlength: 500,
  })
  preview!: string;

  @Prop({
    type: String,
    enum: Object.values(MessageType),
    required: true,
  })
  type!: MessageType;
}

/* ============================================================================
   REACTION
============================================================================ */

@Schema({
  _id: false,
})
export class MessageReaction {
  @Prop({
    type: String,
    enum: [
      "❤️",
      "😂",
      "👍",
      "😮",
      "😢",
      "🙏",
    ],
    required: true,
  })
  emoji!: string;

  @Prop({
    type: [Types.ObjectId],
    ref: "User",
    default: [],
  })
  userIds!: Types.ObjectId[];
}

/* ============================================================================
   MESSAGE
============================================================================ */

@Schema({
  timestamps: true,
  collection: "messages",
})
export class Message {
  @Prop({
    type: Types.ObjectId,
    ref: "Conversation",
    required: true,
    index: true,
  })
  conversationId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  senderId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(MessageType),
    required: true,
    index: true,
  })
  type!: MessageType;

  @Prop({
    type: String,
    maxlength: 10000,
  })
  text?: string;

  @Prop({
    type: [MessageAttachment],
    default: [],
  })
  attachments!: MessageAttachment[];

  @Prop({
    type: [MessageReaction],
    default: [],
  })
  reactions!: MessageReaction[];

  @Prop({
    type: ReplyReference,
    default: null,
  })
  replyTo?: ReplyReference | null;

  @Prop({
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.SENT,
    index: true,
  })
  status!: MessageStatus;

  @Prop({
    type: [Types.ObjectId],
    ref: "User",
    default: [],
  })
  deliveredTo!: Types.ObjectId[];

  @Prop({
    type: [Types.ObjectId],
    ref: "User",
    default: [],
  })
  readBy!: Types.ObjectId[];

  @Prop({
    type: [Types.ObjectId],
    ref: "User",
    default: [],
  })
  starredBy!: Types.ObjectId[];

  /*
   * Users who chose "Delete for me".
   *
   * The message itself remains in MongoDB.
   * It simply disappears from these users' message lists.
   */
  @Prop({
    type: [Types.ObjectId],
    ref: "User",
    default: [],
  })
  deletedForMeBy!: Types.ObjectId[];

  /*
   * True means the sender permanently removed the message
   * for everyone in the conversation.
   */
  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  deletedForEveryone!: boolean;

  /*
   * Proper persisted edit timestamp.
   */
  @Prop({
    type: Date,
    default: null,
  })
  editedAt?: Date | null;

  @Prop({
    type: String,
    maxlength: 500,
  })
  systemLabel?: string;

  createdAt?: Date;

  updatedAt?: Date;
}

/* ============================================================================
   SCHEMA
============================================================================ */

export const MessageSchema =
  SchemaFactory.createForClass(Message);

/* ============================================================================
   INDEXES
============================================================================ */

MessageSchema.index({
  conversationId: 1,
  createdAt: -1,
});

MessageSchema.index({
  senderId: 1,
  createdAt: -1,
});

MessageSchema.index({
  conversationId: 1,
  "attachments.kind": 1,
  createdAt: -1,
});

MessageSchema.index({
  conversationId: 1,
  text: "text",
});

MessageSchema.index({
  conversationId: 1,
  deletedForMeBy: 1,
});

MessageSchema.index({
  conversationId: 1,
  deletedForEveryone: 1,
});