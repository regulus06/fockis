/**
 * announcement.schema.ts
 * -----------------------------------------------------------------------------
 * Mongoose schemas backing the Communication area:
 *
 * - Announcements
 * - Church Messages
 * - Department Messages
 * - Church Notifications
 *
 * The given file tree contains one schema file for the communication module,
 * so all three schemas are defined here.
 * -----------------------------------------------------------------------------
 */

import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  Document,
  Types,
} from 'mongoose';

/* ============================================================================
 * ENUMS
 * ========================================================================== */

export enum AnnouncementAudience {
  Everyone = 'everyone',
  Members = 'members',
  Department = 'department',
  Group = 'group',
  Leadership = 'leadership',
}

/* ============================================================================
 * ANNOUNCEMENT
 * ========================================================================== */

export type AnnouncementDocument =
  Announcement & Document;

@Schema({
  timestamps: {
    createdAt: 'publishedAt',
    updatedAt: true,
  },
  collection: 'church_announcements',
})
export class Announcement {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  title!: string;

  @Prop({
    required: true,
  })
  body!: string;

  @Prop({
    type: String,
    enum: AnnouncementAudience,
    default: AnnouncementAudience.Everyone,
    index: true,
  })
  audience!: AnnouncementAudience;

  @Prop({
    type: Types.ObjectId,
    ref: 'Department',
    default: null,
  })
  departmentId?: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'ChurchGroup',
    default: null,
  })
  groupId?: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'Membership',
    required: true,
  })
  authorId!: Types.ObjectId;

  @Prop({
    default: false,
  })
  pinned?: boolean;

  publishedAt?: Date;

  updatedAt?: Date;
}

export const AnnouncementSchema =
  SchemaFactory.createForClass(
    Announcement,
  );

AnnouncementSchema.index({
  organizationId: 1,
  publishedAt: -1,
});

/* ============================================================================
 * CHURCH MESSAGE
 *
 * Also backs Department Messages through departmentId.
 * ========================================================================== */

export type ChurchMessageDocument =
  ChurchMessage & Document;

@Schema({
  timestamps: {
    createdAt: 'sentAt',
    updatedAt: false,
  },
  collection: 'church_messages',
})
export class ChurchMessage {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  @Prop({
    required: true,
    index: true,
  })
  threadId!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Membership',
    required: true,
  })
  senderId!: Types.ObjectId;

  @Prop({
    required: true,
  })
  body!: string;

  /**
   * Present only for department-scoped messages.
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Department',
    default: null,
    index: true,
  })
  departmentId?: Types.ObjectId | null;

  @Prop({
    type: Date,
    default: null,
  })
  readAt?: Date | null;

  sentAt?: Date;
}

export const ChurchMessageSchema =
  SchemaFactory.createForClass(
    ChurchMessage,
  );

ChurchMessageSchema.index({
  organizationId: 1,
  sentAt: -1,
});

/* ============================================================================
 * CHURCH NOTIFICATION
 * ========================================================================== */

export type ChurchNotificationCategory =
  | 'event'
  | 'announcement'
  | 'message'
  | 'attendance'
  | 'membership'
  | 'system';

export type ChurchNotificationDocument =
  ChurchNotification & Document;

@Schema({
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: false,
  },
  collection: 'church_notifications',
})
export class ChurchNotification {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    default: null,
    index: true,
  })
  organizationId?: Types.ObjectId | null;

  /**
   * The Membership this notification was generated for.
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Membership',
    required: true,
    index: true,
  })
  recipientId!: Types.ObjectId;

  @Prop({
    required: true,
  })
  title!: string;

  @Prop({
    required: true,
  })
  body!: string;

  @Prop({
    required: true,
  })
  category!: ChurchNotificationCategory;

  @Prop()
  linkPath?: string;

  @Prop({
    default: false,
    index: true,
  })
  isRead!: boolean;

  createdAt?: Date;
}

export const ChurchNotificationSchema =
  SchemaFactory.createForClass(
    ChurchNotification,
  );

ChurchNotificationSchema.index({
  recipientId: 1,
  createdAt: -1,
});