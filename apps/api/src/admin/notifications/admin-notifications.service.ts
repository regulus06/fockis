import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { OnEvent } from "@nestjs/event-emitter";
import { Model, Types } from "mongoose";

type FilterQuery<_T> = Record<string, any>;

import {
  AdminNotification,
  AdminNotificationDocument,
  AdminNotificationPreference,
  AdminNotificationPreferenceDocument,
} from "./admin-notification.schema";
import {
  ADMIN_NOTIFICATION_CATEGORIES,
  ADMIN_NOTIFICATION_EVENT,
  ADMIN_NOTIFICATION_RESOLVED_EVENT,
  PRIORITY_RANK,
  isCategory,
  isPriority,
  safeAdminLink,
} from "./admin-notification.types";
import type {
  AdminNotificationEvent,
  AdminNotificationPriority,
  AdminNotificationResolvedEvent,
} from "./admin-notification.types";
import { AdminRecipientsService } from "./admin-recipients.service";
import { AdminNotificationsGateway } from "./admin-notifications.gateway";

// ============================================================================
// ADMIN NOTIFICATIONS
// ============================================================================

const DAY_MS = 86_400_000;
const UNREAD_RETENTION_DAYS = 180;
const ACTION_RETENTION_DAYS = 365;
const READ_RETENTION_DAYS = 90;
/** A repeat of the same event inside this time does not re-mark it unread. */
const REPEAT_COOLDOWN_MS = 15 * 60_000;
const MAX_PAGE_SIZE = 100;

export interface NotificationReader {
  id: string;
  permissions: string[];
  isSuperAdmin: boolean;
}

export interface NotificationListQuery {
  status?: "all" | "unread" | "read";
  category?: string;
  priority?: string;
  actionState?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export function readerFromRequest(req: any): NotificationReader {
  const user = req?.user ?? {};
  const id = String(user.id ?? user.userId ?? user._id ?? "");
  const role = String(user.role ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");

  return {
    id,
    permissions: Array.isArray(user.permissions)
      ? user.permissions.map((p: unknown) => String(p).toLowerCase())
      : [],
    isSuperAdmin: user.isSuperAdmin === true || role === "super_admin",
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clean(text: unknown, max: number): string {
  return String(text ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);
}

function rankToPriority(rank: number): AdminNotificationPriority {
  if (rank >= 4) return "critical";
  if (rank === 3) return "high";
  if (rank === 2) return "medium";
  return "low";
}

@Injectable()
export class AdminNotificationsService {
  private readonly logger = new Logger(AdminNotificationsService.name);

  constructor(
    @InjectModel(AdminNotification.name)
    private readonly notifications: Model<AdminNotificationDocument>,

    @InjectModel(AdminNotificationPreference.name)
    private readonly preferences: Model<AdminNotificationPreferenceDocument>,

    private readonly recipients: AdminRecipientsService,
    private readonly gateway: AdminNotificationsGateway,
  ) {}

  // ==========================================================================
  // EVENT BUS
  // ==========================================================================

  @OnEvent(ADMIN_NOTIFICATION_EVENT, { async: true, suppressErrors: true })
  async onEvent(event: AdminNotificationEvent): Promise<void> {
    try {
      await this.raise(event);
    } catch (error) {
      this.logger.error(
        `Admin notification "${event?.type}" failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  @OnEvent(ADMIN_NOTIFICATION_RESOLVED_EVENT, { async: true, suppressErrors: true })
  async onResolved(event: AdminNotificationResolvedEvent): Promise<void> {
    try {
      await this.resolveEntity(event.entityType, event.entityId);
    } catch (error) {
      this.logger.error(
        `Resolving notifications for ${event?.entityType}:${event?.entityId} failed: ${String(error)}`,
      );
    }
  }

  // ==========================================================================
  // CREATE / ESCALATE
  // ==========================================================================

  /** Returns how many recipients received (or had updated) the notification. */
  async raise(event: AdminNotificationEvent): Promise<number> {
    if (!event || !isCategory(event.category) || !isPriority(event.priority)) {
      throw new Error("Invalid admin notification category or priority.");
    }

    const required = (event.requiredPermissions ?? [])
      .map((p) => String(p).trim().toLowerCase())
      .filter(Boolean);

    if (!required.length) {
      // Never broadcast: every notification is scoped to permissions.
      throw new Error("Admin notifications must name required permissions.");
    }

    const groupKey = clean(event.groupKey, 200);
    const entityType = clean(event.entityType, 60);
    const entityId = clean(event.entityId, 80);

    if (!groupKey || !entityType || !entityId) {
      throw new Error("Admin notifications need a group key and an entity.");
    }

    const recipientIds = await this.recipients.resolve(required, event.excludeUserIds ?? []);

    if (!recipientIds.length) return 0;

    const muted = await this.mutedFor(recipientIds, event.category);
    const rank = PRIORITY_RANK[event.priority];
    const now = new Date();
    const retentionDays = event.actionRequired ? ACTION_RETENTION_DAYS : UNREAD_RETENTION_DAYS;
    const expiresAt = new Date(now.getTime() + retentionDays * DAY_MS);
    const link = safeAdminLink(event.link);

    const metadata: Record<string, string | number | boolean | null> = {};

    for (const [key, value] of Object.entries(event.metadata ?? {}).slice(0, 20)) {
      if (["string", "number", "boolean"].includes(typeof value) || value === null) {
        metadata[clean(key, 40)] = typeof value === "string" ? clean(value, 200) : value;
      }
    }

    let delivered = 0;

    for (const recipient of recipientIds) {
      // Critical notifications cannot be muted.
      if (event.priority !== "critical" && muted.has(recipient)) continue;

      const recipientId = new Types.ObjectId(recipient);

      let before: any = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          before = await this.notifications.collection.findOneAndUpdate(
            { recipientId, groupKey },
            {
              $setOnInsert: {
                recipientId,
                groupKey,
                category: event.category,
                entityType,
                entityId,
                requiredPermissions: required,
                firstOccurredAt: now,
                read: false,
                readAt: null,
                resolvedAt: null,
                createdAt: now,
                priority: event.priority,
                ...(event.actionRequired ? {} : { actionState: "none" }),
              },
              $set: {
                type: clean(event.type, 80),
                title: clean(event.title, 160),
                message: clean(event.message, 600),
                link,
                metadata,
                lastOccurredAt: now,
                expiresAt,
                updatedAt: now,
                ...(event.actionRequired ? { actionState: "open" } : {}),
              },
              $max: { priorityRank: rank },
              $inc: { occurrences: 1 },
            } as any,
            { upsert: true, returnDocument: "before" },
          );
          break;
        } catch (error: any) {
          // Two inserts raced on the unique index: the retry updates.
          if (error?.code !== 11000 || attempt === 1) throw error;
        }
      }

      const previous = (before && "value" in before && "ok" in before ? before.value : before) as any;
      const previousRank = Number(previous?.priorityRank ?? 0);
      const escalated = rank > previousRank;
      const repeatAfterCooldown =
        previous?.lastOccurredAt &&
        now.getTime() - new Date(previous.lastOccurredAt).getTime() > REPEAT_COOLDOWN_MS;
      const reopened = Boolean(event.actionRequired && previous?.actionState === "resolved");
      const alert = !previous || escalated || Boolean(repeatAfterCooldown) || reopened;

      const fix: Record<string, unknown> = {};

      if (previous && escalated) fix.priority = rankToPriority(rank);
      if (alert) {
        fix.read = false;
        fix.readAt = null;
      }
      if (reopened) fix.resolvedAt = null;

      if (Object.keys(fix).length) {
        await this.notifications.collection.updateOne({ recipientId, groupKey }, { $set: fix });
      }

      delivered += 1;

      this.gateway.deliver(recipient, {
        kind: "notification",
        alert,
        priority: rankToPriority(Math.max(rank, previousRank)),
        category: event.category,
        title: clean(event.title, 160),
        link,
      });
    }

    return delivered;
  }

  /** The underlying item was resolved: close the action on every copy. */
  async resolveEntity(entityType: string, entityId: string): Promise<number> {
    const filter: Record<string, any> = { entityType, entityId: String(entityId), actionState: "open" };
    const affected: any[] = await this.notifications
      .find(filter)
      .select("recipientId")
      .lean()
      .exec();

    if (!affected.length) return 0;

    const result = await this.notifications
      .updateMany(filter, { $set: { actionState: "resolved", resolvedAt: new Date() } })
      .exec();

    for (const id of new Set(affected.map((n) => String(n.recipientId)))) {
      this.gateway.deliver(id, { kind: "changed" });
    }

    return result.modifiedCount ?? 0;
  }

  private async mutedFor(recipientIds: string[], category: string): Promise<Set<string>> {
    const rows = await this.preferences
      .find({
        userId: { $in: recipientIds.map((id) => new Types.ObjectId(id)) },
        mutedCategories: category,
      })
      .select("userId")
      .lean()
      .exec();

    return new Set(rows.map((r) => String(r.userId)));
  }

  // ==========================================================================
  // READ
  // ==========================================================================

  /** Base filter: own notifications that the reader may still see. */
  private visibleFilter(reader: NotificationReader): FilterQuery<AdminNotificationDocument> {
    if (!Types.ObjectId.isValid(reader.id)) {
      // No id → nothing is visible.
      return { _id: { $exists: false } };
    }

    const filter: FilterQuery<AdminNotificationDocument> = {
      recipientId: new Types.ObjectId(reader.id),
    };

    if (!reader.isSuperAdmin) {
      filter.requiredPermissions = { $in: reader.permissions.length ? reader.permissions : ["__none__"] };
    }

    return filter;
  }

  serialize(doc: any) {
    return {
      id: String(doc._id),
      type: doc.type,
      category: doc.category,
      priority: doc.priority,
      title: doc.title,
      message: doc.message,
      link: safeAdminLink(doc.link),
      entityType: doc.entityType,
      entityId: doc.entityId,
      actionState: doc.actionState ?? "none",
      resolvedAt: doc.resolvedAt ?? null,
      read: Boolean(doc.read),
      readAt: doc.readAt ?? null,
      occurrences: Number(doc.occurrences ?? 1),
      firstOccurredAt: doc.firstOccurredAt,
      lastOccurredAt: doc.lastOccurredAt,
      metadata: doc.metadata ?? {},
    };
  }

  async list(reader: NotificationReader, query: NotificationListQuery) {
    const filter: FilterQuery<AdminNotificationDocument> = this.visibleFilter(reader);

    if (query.status === "unread") filter.read = false;
    if (query.status === "read") filter.read = true;

    if (query.category) {
      if (!isCategory(query.category)) throw new BadRequestException("Unknown category.");
      filter.category = query.category;
    }

    if (query.priority) {
      if (!isPriority(query.priority)) throw new BadRequestException("Unknown priority.");
      filter.priority = query.priority;
    }

    if (query.actionState) {
      if (!["none", "open", "resolved"].includes(query.actionState)) {
        throw new BadRequestException("Unknown action state.");
      }
      filter.actionState = query.actionState;
    }

    const range: Record<string, Date> = {};
    if (query.from) {
      const d = new Date(query.from);
      if (Number.isNaN(d.getTime())) throw new BadRequestException("Invalid start date.");
      range.$gte = d;
    }
    if (query.to) {
      const d = new Date(query.to);
      if (Number.isNaN(d.getTime())) throw new BadRequestException("Invalid end date.");
      range.$lte = d;
    }
    if (Object.keys(range).length) filter.lastOccurredAt = range;

    const search = clean(query.search, 80);
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ title: pattern }, { message: pattern }];
    }

    const pageSize = Math.min(Math.max(1, Number(query.pageSize) || 20), MAX_PAGE_SIZE);
    const page = Math.max(1, Number(query.page) || 1);

    const [rows, total, unread] = await Promise.all([
      this.notifications
        .find(filter)
        .sort({ read: 1, lastOccurredAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
        .exec(),
      this.notifications.countDocuments(filter).exec(),
      this.unreadCount(reader),
    ]);

    return {
      items: rows.map((row) => this.serialize(row)),
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      unread,
      categories: ADMIN_NOTIFICATION_CATEGORIES,
    };
  }

  async unreadCount(reader: NotificationReader): Promise<number> {
    return this.notifications.countDocuments({ ...this.visibleFilter(reader), read: false }).exec();
  }

  async get(reader: NotificationReader, id: string) {
    const doc = await this.findVisible(reader, id);

    return this.serialize(doc);
  }

  private async findVisible(reader: NotificationReader, id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Notification not found.");

    const doc = await this.notifications
      .findOne({ ...this.visibleFilter(reader), _id: new Types.ObjectId(id) })
      .lean()
      .exec();

    if (!doc) throw new NotFoundException("Notification not found.");

    return doc;
  }

  // ==========================================================================
  // READ STATE
  //
  // Reading never changes the underlying incident, case or dispute.
  // ==========================================================================

  private readUpdate(now: Date) {
    const readExpiry = new Date(now.getTime() + READ_RETENTION_DAYS * DAY_MS);

    return [
      {
        $set: {
          read: true,
          readAt: { $ifNull: ["$readAt", now] },
          expiresAt: {
            $cond: [
              { $eq: ["$actionState", "open"] },
              "$expiresAt",
              { $min: ["$expiresAt", readExpiry] },
            ],
          },
        },
      },
    ];
  }

  async markRead(reader: NotificationReader, id: string) {
    const doc = await this.findVisible(reader, id);

    await this.notifications.updateOne({ _id: doc._id }, this.readUpdate(new Date()) as any).exec();

    this.gateway.deliver(reader.id, { kind: "changed" });

    return { ...this.serialize({ ...doc, read: true, readAt: doc.readAt ?? new Date() }), unread: await this.unreadCount(reader) };
  }

  async markUnread(reader: NotificationReader, id: string) {
    const doc = await this.findVisible(reader, id);

    await this.notifications
      .updateOne({ _id: doc._id }, { $set: { read: false, readAt: null } })
      .exec();

    this.gateway.deliver(reader.id, { kind: "changed" });

    return { ...this.serialize({ ...doc, read: false, readAt: null }), unread: await this.unreadCount(reader) };
  }

  async markAllRead(reader: NotificationReader, category?: string) {
    const filter: FilterQuery<AdminNotificationDocument> = { ...this.visibleFilter(reader), read: false };

    if (category) {
      if (!isCategory(category)) throw new BadRequestException("Unknown category.");
      filter.category = category;
    }

    const result = await this.notifications.updateMany(filter, this.readUpdate(new Date()) as any).exec();

    this.gateway.deliver(reader.id, { kind: "changed" });

    return { updated: result.modifiedCount ?? 0, unread: await this.unreadCount(reader) };
  }

  // ==========================================================================
  // PREFERENCES
  // ==========================================================================

  async getPreferences(reader: NotificationReader) {
    const doc = Types.ObjectId.isValid(reader.id)
      ? await this.preferences.findOne({ userId: new Types.ObjectId(reader.id) }).lean().exec()
      : null;

    return {
      mutedCategories: doc?.mutedCategories ?? [],
      realtimeToasts: doc?.realtimeToasts ?? true,
      categories: ADMIN_NOTIFICATION_CATEGORIES,
      criticalAlwaysDelivered: true,
    };
  }

  async updatePreferences(
    reader: NotificationReader,
    input: { mutedCategories?: string[]; realtimeToasts?: boolean },
  ) {
    if (!Types.ObjectId.isValid(reader.id)) throw new BadRequestException("Invalid account.");

    const set: Record<string, unknown> = {};

    if (input.mutedCategories !== undefined) {
      const invalid = input.mutedCategories.filter((c) => !isCategory(c));
      if (invalid.length) throw new BadRequestException(`Unknown categories: ${invalid.join(", ")}.`);
      set.mutedCategories = Array.from(new Set(input.mutedCategories));
    }

    if (input.realtimeToasts !== undefined) set.realtimeToasts = Boolean(input.realtimeToasts);

    await this.preferences
      .updateOne({ userId: new Types.ObjectId(reader.id) }, { $set: set }, { upsert: true })
      .exec();

    return this.getPreferences(reader);
  }
}
