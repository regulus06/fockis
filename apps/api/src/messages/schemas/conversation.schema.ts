import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type ConversationDocument =
  HydratedDocument<Conversation>;

@Schema({
  timestamps: true,
  collection: "conversations",
})
export class Conversation {
  // ============================================================
  // PARTICIPANTS
  // ============================================================

  @Prop({
    type: [Types.ObjectId],
    ref: "User",
    required: true,
    index: true,
  })
  participantIds!: Types.ObjectId[];

  // ============================================================
  // GROUP
  // ============================================================

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isGroup!: boolean;

  // ============================================================
  // GROUP NAME
  // ============================================================

  @Prop({
    type: String,
    trim: true,
    maxlength: 100,
  })
  groupName?: string;

  // ============================================================
  // GROUP AVATAR
  // ============================================================

  @Prop({
    type: String,
    trim: true,
    maxlength: 1000,
  })
  groupAvatar?: string;

  // ============================================================
  // LAST MESSAGE
  // ============================================================

  @Prop({
    type: Types.ObjectId,
    ref: "Message",
    default: null,
    index: true,
  })
  lastMessageId?: Types.ObjectId | null;

  // ============================================================
  // UNREAD COUNTS
  // ============================================================

  @Prop({
    type: Map,
    of: Number,
    default: {},
  })
  unreadCounts!: Map<string, number>;

  // ============================================================
  // PINNED BY USER
  // ============================================================

  @Prop({
    type: Map,
    of: Boolean,
    default: {},
  })
  pinnedBy!: Map<string, boolean>;

  // ============================================================
  // MUTED BY USER
  // ============================================================

  @Prop({
    type: Map,
    of: Boolean,
    default: {},
  })
  mutedBy!: Map<string, boolean>;

  // ============================================================
  // MONGOOSE TIMESTAMPS
  // ============================================================

  createdAt?: Date;

  updatedAt?: Date;
}

// ============================================================
// SCHEMA
// ============================================================

export const ConversationSchema =
  SchemaFactory.createForClass(
    Conversation,
  );

// ============================================================
// INDEXES
// ============================================================

ConversationSchema.index({
  participantIds: 1,
  updatedAt: -1,
});

ConversationSchema.index({
  participantIds: 1,
  isGroup: 1,
});