import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";

type FilterQuery<_T> = Record<string, any>;
import * as crypto from "crypto";

import {
  ACTIVE_DISPUTE_STATUSES,
  DISPUTE_REASONS,
  DISPUTE_STATUSES,
  Dispute,
  DisputeStatus,
} from "./schemas/dispute.schema";
import {
  ADMIN_NOTIFICATION_EVENT,
  ADMIN_NOTIFICATION_RESOLVED_EVENT,
} from "../../admin/notifications/admin-notification.types";

// ============================================================================
// MARKETPLACE DISPUTES
//
// Buyers open a dispute on their own order (one active dispute per order).
// Marketplace staff (marketplace.orders.view / .manage) review and decide.
// Deciding a dispute records the outcome; refunds stay in the existing
// order/payment tools and are not triggered from here.
// ============================================================================

const NOT_DISPUTABLE = new Set(["pending", "cancelled"]);
const REVIEW_PERMISSIONS = ["marketplace.orders.view", "marketplace.orders.manage"];

export type DisputeAction = "start_review" | "resolve_buyer" | "resolve_seller" | "close";

const TRANSITIONS: Record<DisputeAction, { from: DisputeStatus[]; to: DisputeStatus }> = {
  start_review: { from: ["open"], to: "under_review" },
  resolve_buyer: { from: ["open", "under_review"], to: "resolved_buyer" },
  resolve_seller: { from: ["open", "under_review"], to: "resolved_seller" },
  close: { from: ["open", "under_review"], to: "closed" },
};

export function nextDisputeStatus(current: string, action: DisputeAction): DisputeStatus | null {
  const rule = TRANSITIONS[action];

  if (!rule) return null;

  return (rule.from as string[]).includes(current) ? rule.to : null;
}

function disputeNumber(): string {
  return `DP-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

function clean(value: unknown, max: number): string {
  return String(value ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").trim().slice(0, max);
}

@Injectable()
export class DisputesService {
  constructor(
    @InjectModel(Dispute.name) private readonly disputes: Model<Dispute>,
    @InjectConnection() private readonly connection: Connection,
    private readonly emitter: EventEmitter2,
  ) {}

  serialize(doc: any, view: "buyer" | "admin") {
    const base = {
      id: String(doc._id),
      number: doc.number ?? null,
      orderId: doc.orderId ? String(doc.orderId) : null,
      orderNumber: doc.orderNumber ?? "",
      reason: doc.reason,
      description: doc.description ?? "",
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      resolvedAt: doc.resolvedAt ?? null,
    };

    if (view === "buyer") return base;

    return {
      ...base,
      openedBy: doc.openedBy ? String(doc.openedBy) : null,
      sellerIds: (doc.sellerIds ?? []).map(String),
      orderTotal: doc.orderTotal ?? null,
      adminNote: doc.adminNote ?? "",
      assignedTo: doc.assignedTo ?? null,
      resolvedBy: doc.resolvedBy ?? null,
      history: doc.history ?? [],
    };
  }

  // ==========================================================================
  // BUYER
  // ==========================================================================

  async open(userId: string, input: { orderId: string; reason: string; description: string }) {
    if (!Types.ObjectId.isValid(userId)) throw new ForbiddenException();
    if (!Types.ObjectId.isValid(input.orderId)) throw new BadRequestException("Invalid order.");
    if (!(DISPUTE_REASONS as readonly string[]).includes(input.reason)) throw new BadRequestException("Choose a reason.");

    const description = clean(input.description, 2000);

    if (description.length < 10) throw new BadRequestException("Describe the problem (at least 10 characters).");

    const order = await this.connection.collection("orders").findOne(
      { _id: new Types.ObjectId(input.orderId) },
      { projection: { customer: 1, orderNumber: 1, status: 1, totalAmount: 1, "items.seller": 1 } },
    );

    // Same answer for "not found" and "not yours".
    if (!order || String(order.customer) !== String(userId)) throw new NotFoundException("Order not found.");

    if (NOT_DISPUTABLE.has(String(order.status))) {
      throw new BadRequestException("This order can't be disputed yet. Pending or cancelled orders have nothing to dispute.");
    }

    const sellerIds: string[] = Array.from(
      new Set<string>((order.items ?? []).map((item: any) => item?.seller).filter(Boolean).map(String)),
    ).filter((id) => Types.ObjectId.isValid(id));

    const now = new Date();
    let doc: any;

    try {
      doc = await (this.disputes as any).create({
        number: disputeNumber(),
        orderId: order._id,
        orderNumber: String(order.orderNumber ?? ""),
        openedBy: new Types.ObjectId(userId),
        sellerIds: sellerIds.map((id) => new Types.ObjectId(id)),
        reason: input.reason,
        description,
        status: "open",
        active: true,
        orderTotal: typeof order.totalAmount === "number" ? order.totalAmount : null,
        history: [{ at: now, action: "opened", actorId: String(userId), actorName: "Buyer", note: "" }],
      });
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException("This order already has an open dispute.");
      throw error;
    }

    this.emitter.emit(ADMIN_NOTIFICATION_EVENT, {
      type: "marketplace.dispute_opened",
      category: "marketplace",
      priority: input.reason === "unauthorized_charge" ? "high" : "medium",
      title: "New marketplace dispute",
      message: `${doc.number} on order ${doc.orderNumber || String(order._id).slice(-6)}: ${input.reason.replace(/_/g, " ")}.`,
      groupKey: `marketplace_dispute:${doc._id}`,
      entityType: "marketplace_dispute",
      entityId: String(doc._id),
      link: `/admin/marketplace/disputes/${doc._id}`,
      requiredPermissions: REVIEW_PERMISSIONS,
      actionRequired: true,
      excludeUserIds: [String(userId), ...sellerIds],
      metadata: { dispute: doc.number, reason: input.reason },
    });

    return this.serialize(doc.toObject(), "buyer");
  }

  async mine(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return { items: [] };

    const rows = await this.disputes
      .find({ openedBy: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();

    return { items: rows.map((row) => this.serialize(row, "buyer")) };
  }

  // ==========================================================================
  // ADMIN
  // ==========================================================================

  async list(query: { status?: string; search?: string; page?: number; pageSize?: number }) {
    const filter: FilterQuery<Dispute> = {};

    if (query.status === "active") filter.status = { $in: ACTIVE_DISPUTE_STATUSES };
    else if (query.status) {
      if (!(DISPUTE_STATUSES as readonly string[]).includes(query.status)) throw new BadRequestException("Unknown status.");
      filter.status = query.status;
    }

    const search = clean(query.search, 40);

    if (search) {
      const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ number: pattern }, { orderNumber: pattern }];
    }

    const pageSize = Math.min(Math.max(1, Number(query.pageSize) || 20), 100);
    const page = Math.max(1, Number(query.page) || 1);

    const [rows, total, open, review] = await Promise.all([
      this.disputes.find(filter).sort({ active: -1, createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean().exec(),
      this.disputes.countDocuments(filter).exec(),
      this.disputes.countDocuments({ status: "open" }).exec(),
      this.disputes.countDocuments({ status: "under_review" }).exec(),
    ]);

    const userIds = Array.from(new Set(rows.flatMap((r: any) => [r.openedBy, ...(r.sellerIds ?? [])]).filter(Boolean).map(String)));
    const users = userIds.length
      ? await this.connection
          .collection("users")
          .find({ _id: { $in: userIds.map((id) => new Types.ObjectId(id)) } }, { projection: { username: 1 } })
          .toArray()
      : [];
    const names = new Map(users.map((u) => [String(u._id), String(u.username ?? "")]));

    return {
      items: rows.map((row: any) => ({
        ...this.serialize(row, "admin"),
        buyerUsername: names.get(String(row.openedBy)) ?? null,
        sellerUsernames: (row.sellerIds ?? []).map((id: any) => names.get(String(id)) ?? null).filter(Boolean),
      })),
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      counts: { open, underReview: review },
    };
  }

  async get(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Dispute not found.");

    const doc: any = await this.disputes.findById(id).lean().exec();

    if (!doc) throw new NotFoundException("Dispute not found.");

    const ids = [doc.openedBy, ...(doc.sellerIds ?? [])].filter(Boolean).map((v: any) => new Types.ObjectId(String(v)));
    const users = await this.connection.collection("users").find({ _id: { $in: ids } }, { projection: { username: 1 } }).toArray();
    const names = new Map(users.map((u) => [String(u._id), String(u.username ?? "")]));

    return {
      ...this.serialize(doc, "admin"),
      buyerUsername: names.get(String(doc.openedBy)) ?? null,
      sellerUsernames: (doc.sellerIds ?? []).map((sid: any) => names.get(String(sid)) ?? null).filter(Boolean),
    };
  }

  async review(id: string, action: DisputeAction, actor: { id: string; name: string }, noteInput: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Dispute not found.");

    const current: any = await this.disputes.findById(id).lean().exec();

    if (!current) throw new NotFoundException("Dispute not found.");

    const next = nextDisputeStatus(String(current.status), action);

    if (!next) throw new ConflictException(`A dispute that is ${String(current.status).replace(/_/g, " ")} can't be changed this way.`);

    const note = clean(noteInput, 1000);

    if (action !== "start_review" && !note) throw new BadRequestException("Add a note explaining the decision.");

    const now = new Date();
    const closing = next !== "under_review";

    const updated = await this.disputes
      .findOneAndUpdate(
        { _id: current._id, status: current.status },
        {
          $set: {
            status: next,
            active: !closing,
            ...(note ? { adminNote: note } : {}),
            ...(action === "start_review" ? { assignedTo: actor.id } : {}),
            ...(closing ? { resolvedBy: actor.id, resolvedAt: now } : {}),
          },
          $push: { history: { at: now, action, actorId: actor.id, actorName: actor.name.slice(0, 120), note } },
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!updated) throw new ConflictException("The dispute was changed by someone else. Reload and try again.");

    if (closing) {
      this.emitter.emit(ADMIN_NOTIFICATION_RESOLVED_EVENT, {
        entityType: "marketplace_dispute",
        entityId: String(current._id),
        resolvedBy: actor.id,
      });
    }

    return this.get(id);
  }
}
