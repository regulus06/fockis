import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

import {
  ADMIN_NOTIFICATION_CATEGORIES,
  ADMIN_NOTIFICATION_PRIORITIES,
} from "./admin-notification.types";
import type {
  AdminNotificationActionState,
  AdminNotificationCategory,
  AdminNotificationPriority,
} from "./admin-notification.types";

// ============================================================================
// ADMIN NOTIFICATION
//
// One document per recipient per group. A repeated or escalated event updates
// the same document (count, priority, unread) instead of adding new ones.
// ============================================================================

@Schema({ collection: "admin_notifications", timestamps: true })
export class AdminNotification {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  recipientId!: Types.ObjectId;

  @Prop({ required: true, maxlength: 200 })
  groupKey!: string;

  @Prop({ required: true, maxlength: 80 })
  type!: string;

  @Prop({ type: String, required: true, enum: ADMIN_NOTIFICATION_CATEGORIES })
  category!: AdminNotificationCategory;

  @Prop({ type: String, required: true, enum: ADMIN_NOTIFICATION_PRIORITIES })
  priority!: AdminNotificationPriority;

  /** Numeric priority (low 1 … critical 4); only ever raised. */
  @Prop({ default: 1, min: 1, max: 4 })
  priorityRank!: number;

  @Prop({ required: true, maxlength: 160 })
  title!: string;

  @Prop({ required: true, maxlength: 600 })
  message!: string;

  @Prop({ required: true, maxlength: 60 })
  entityType!: string;

  @Prop({ required: true, maxlength: 80 })
  entityId!: string;

  @Prop({ required: true, maxlength: 300 })
  link!: string;

  @Prop({ type: [String], default: [] })
  requiredPermissions!: string[];

  @Prop({ type: String, enum: ["none", "open", "resolved"], default: "none" })
  actionState!: AdminNotificationActionState;

  @Prop({ type: Date, default: null })
  resolvedAt!: Date | null;

  @Prop({ default: false })
  read!: boolean;

  @Prop({ type: Date, default: null })
  readAt!: Date | null;

  /** How many times the grouped event happened. */
  @Prop({ default: 1, min: 1 })
  occurrences!: number;

  @Prop({ type: Date, required: true })
  firstOccurredAt!: Date;

  @Prop({ type: Date, required: true })
  lastOccurredAt!: Date;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, string | number | boolean | null>;

  /** TTL: retention (shorter once read). */
  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export type AdminNotificationDocument = HydratedDocument<AdminNotification>;

export const AdminNotificationSchema =
  SchemaFactory.createForClass(AdminNotification);

AdminNotificationSchema.index({ recipientId: 1, groupKey: 1 }, { unique: true });
AdminNotificationSchema.index({ recipientId: 1, read: 1, lastOccurredAt: -1 });
AdminNotificationSchema.index({ recipientId: 1, category: 1, lastOccurredAt: -1 });
AdminNotificationSchema.index({ entityType: 1, entityId: 1 });
AdminNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ============================================================================
// PREFERENCES
// ============================================================================

@Schema({ collection: "admin_notification_preferences", timestamps: true })
export class AdminNotificationPreference {
  @Prop({ type: Types.ObjectId, required: true, unique: true })
  userId!: Types.ObjectId;

  /** Categories muted in-app. Critical notifications are always delivered. */
  @Prop({ type: [String], default: [] })
  mutedCategories!: string[];

  /** Show a pop-up toast for new high/critical notifications. */
  @Prop({ default: true })
  realtimeToasts!: boolean;
}

export type AdminNotificationPreferenceDocument =
  HydratedDocument<AdminNotificationPreference>;

export const AdminNotificationPreferenceSchema = SchemaFactory.createForClass(
  AdminNotificationPreference,
);
