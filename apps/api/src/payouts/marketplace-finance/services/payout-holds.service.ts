import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  HOLD_REASONS,
  HOLD_REASON_LABELS,
  HoldReason,
  PayoutHold,
  PayoutHoldDocument,
} from "../schemas/payout-hold.schema";
import { FinanceAuditService } from "./finance-audit.service";

export interface CreateHoldInput {
  storeId: string;
  scope: "store" | "order";
  orderId?: string;
  orderNumber?: string;
  amountCents?: number | null;
  currency?: string;
  reason: HoldReason;
  sellerMessage?: string;
  reviewBy?: string | null;
  note?: string;
}

function objectId(value: unknown, label: string): Types.ObjectId {
  const text = String(value ?? "");
  if (!Types.ObjectId.isValid(text)) throw new BadRequestException(`A valid ${label} is required.`);
  return new Types.ObjectId(text);
}

/** How active holds apply to one shipment's money. */
export interface HoldCheck {
  /** A hold blocks this money completely. */
  blocked: boolean;
  /** The holds that block it. */
  blockingHolds: PayoutHold[];
  /** Cents that must stay unpaid for the store because of amount holds. */
  reservedCents: number;
}

@Injectable()
export class PayoutHoldsService {
  constructor(
    @InjectModel(PayoutHold.name)
    private readonly holdModel: Model<PayoutHoldDocument>,
    private readonly audit: FinanceAuditService,
  ) {}

  /* ------------------------------------------------------------------------
     Reading
  ------------------------------------------------------------------------ */

  async activeForStore(storeId: string) {
    if (!Types.ObjectId.isValid(storeId)) return [];
    return this.holdModel
      .find({ storeId: new Types.ObjectId(storeId), status: "active" })
      .lean()
      .exec();
  }

  /** Splits a store's active holds into "blocks this order" and "keep this many cents". */
  checkFromList(holds: PayoutHold[], orderId: string): HoldCheck {
    const blockingHolds = holds.filter(
      (hold) =>
        hold.amountCents === null &&
        (hold.scope === "store" || (hold.scope === "order" && String(hold.orderId) === orderId)),
    );
    const reservedCents = holds
      .filter((hold) => hold.amountCents !== null)
      .reduce((sum, hold) => sum + (hold.amountCents ?? 0), 0);
    return { blocked: blockingHolds.length > 0, blockingHolds, reservedCents };
  }

  async check(storeId: string, orderId: string): Promise<HoldCheck> {
    return this.checkFromList(await this.activeForStore(storeId), orderId);
  }

  async list(filter: { status?: string; storeId?: string; orderId?: string; reason?: string; limit?: number }) {
    const query: Record<string, unknown> = {};
    if (filter.status === "active" || filter.status === "released") query.status = filter.status;
    if (filter.storeId) query.storeId = objectId(filter.storeId, "store ID");
    if (filter.orderId) query.orderId = objectId(filter.orderId, "order ID");
    if (filter.reason && (HOLD_REASONS as readonly string[]).includes(filter.reason)) query.reason = filter.reason;
    const limit = Math.min(Math.max(Number(filter.limit) || 200, 1), 1000);
    return this.holdModel.find(query).sort({ status: 1, createdAt: -1 }).limit(limit).lean().exec();
  }

  /** What the seller may see about a hold (no internal notes or who placed it). */
  sellerView(hold: PayoutHold & { _id?: unknown }) {
    return {
      id: String(hold._id),
      scope: hold.scope,
      orderNumber: hold.orderNumber || null,
      amountCents: hold.amountCents,
      currency: hold.currency,
      reason: HOLD_REASON_LABELS[hold.reason] ?? "Account review",
      message: hold.sellerMessage || null,
      reviewBy: hold.reviewBy,
      since: (hold as PayoutHold & { createdAt?: Date }).createdAt ?? null,
    };
  }

  /* ------------------------------------------------------------------------
     Admin actions
  ------------------------------------------------------------------------ */

  async create(actor: string, input: CreateHoldInput) {
    if (!(HOLD_REASONS as readonly string[]).includes(input.reason)) {
      throw new BadRequestException("Choose a valid hold reason.");
    }
    if (input.scope !== "store" && input.scope !== "order") {
      throw new BadRequestException('Scope must be "store" or "order".');
    }
    const storeId = objectId(input.storeId, "store ID");
    const orderId = input.scope === "order" ? objectId(input.orderId, "order ID") : null;

    let amountCents: number | null = null;
    if (input.amountCents !== undefined && input.amountCents !== null && String(input.amountCents) !== "") {
      amountCents = Number(input.amountCents);
      if (!Number.isSafeInteger(amountCents) || amountCents < 1) {
        throw new BadRequestException("The held amount must be a whole number of cents above 0.");
      }
    }
    const reviewBy = input.reviewBy ? new Date(input.reviewBy) : null;
    if (reviewBy && Number.isNaN(reviewBy.getTime())) throw new BadRequestException("Review date is not valid.");

    const hold = await this.holdModel.create({
      storeId,
      scope: input.scope,
      orderId,
      orderNumber: String(input.orderNumber ?? "").slice(0, 60),
      amountCents,
      currency: String(input.currency ?? "usd").toLowerCase(),
      reason: input.reason,
      sellerMessage: String(input.sellerMessage ?? "").trim().slice(0, 300),
      reviewBy,
      createdBy: actor,
      status: "active",
      history: [{ action: "created", by: actor, at: new Date(), note: String(input.note ?? "").slice(0, 2000) }],
    });
    await this.audit.record("hold_created", "payout_hold", String(hold._id), actor, { hold: hold.toObject() }, String(storeId));
    return hold;
  }

  private async getActive(holdId: string) {
    const hold = await this.holdModel.findById(objectId(holdId, "hold ID")).exec();
    if (!hold) throw new NotFoundException("Hold not found.");
    return hold;
  }

  async release(actor: string, holdId: string, note = "") {
    const hold = await this.getActive(holdId);
    if (hold.status !== "active") throw new BadRequestException("This hold was already released.");
    hold.status = "released";
    hold.releasedBy = actor;
    hold.releasedAt = new Date();
    hold.history.push({ action: "released", by: actor, at: new Date(), note: String(note).slice(0, 2000) });
    await hold.save();
    await this.audit.record("hold_released", "payout_hold", String(hold._id), actor, { note }, String(hold.storeId));
    return hold;
  }

  async extend(actor: string, holdId: string, reviewBy: string, note = "") {
    const hold = await this.getActive(holdId);
    if (hold.status !== "active") throw new BadRequestException("Only active holds can be extended.");
    const date = new Date(reviewBy);
    if (Number.isNaN(date.getTime()) || date <= new Date()) {
      throw new BadRequestException("Choose a review date in the future.");
    }
    const previous = hold.reviewBy;
    hold.reviewBy = date;
    hold.history.push({
      action: "extended",
      by: actor,
      at: new Date(),
      note: `${previous ? previous.toISOString().slice(0, 10) : "no date"} → ${date.toISOString().slice(0, 10)}${
        note ? ` — ${String(note).slice(0, 2000)}` : ""
      }`,
    });
    await hold.save();
    await this.audit.record("hold_extended", "payout_hold", String(hold._id), actor, { from: previous, to: date, note }, String(hold.storeId));
    return hold;
  }

  async addNote(actor: string, holdId: string, note: string) {
    const text = String(note ?? "").trim();
    if (!text) throw new BadRequestException("Write a note first.");
    const hold = await this.getActive(holdId);
    hold.history.push({ action: "note", by: actor, at: new Date(), note: text.slice(0, 2000) });
    await hold.save();
    await this.audit.record("hold_note", "payout_hold", String(hold._id), actor, { note: text }, String(hold.storeId));
    return hold;
  }
}
