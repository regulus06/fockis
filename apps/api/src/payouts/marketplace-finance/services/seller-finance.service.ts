import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { createHash } from "crypto";
import { Model, Types } from "mongoose";

import { Store, StoreDocument } from "../../../stores/schemas/store.schema";
import { PayoutsService, ShipmentAllocation } from "../../payouts.service";
import { calculateFee, FeeBreakdown, splitProportionally } from "../payout-math";
import {
  EarlyPayoutRequest,
  EarlyPayoutRequestDocument,
} from "../schemas/early-payout-request.schema";
import { PayoutPlan, PayoutPlanDocument } from "../schemas/payout-plan.schema";
import { FinanceAuditService } from "./finance-audit.service";
import { PayoutHoldsService } from "./payout-holds.service";
import { PayoutPlansService } from "./payout-plans.service";

/** Where one sale's money is right now, from the seller's point of view. */
export type AllocationState =
  | "transferred" // sent to the seller's Stripe account
  | "available" // with Fockis, can be paid out early now
  | "pending" // with Fockis, not yet eligible (waiting period or Stripe setup)
  | "held" // stopped by an admin hold
  | "refunded"; // refunded or cancelled: nothing to pay

export interface AllocationRow extends ShipmentAllocation {
  state: AllocationState;
  stateReason: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function planSnapshot(plan: PayoutPlan & { _id?: unknown }) {
  return {
    id: String(plan._id),
    name: plan.name,
    version: plan.version,
    currency: plan.currency,
    earlyPayout: {
      enabled: plan.earlyPayout?.enabled ?? false,
      percentBps: plan.earlyPayout?.percentBps ?? 0,
      fixedCents: plan.earlyPayout?.fixedCents ?? 0,
      minFeeCents: plan.earlyPayout?.minFeeCents ?? 0,
      maxFeeCents: plan.earlyPayout?.maxFeeCents ?? null,
      tiers: (plan.earlyPayout?.tiers ?? []).map((t) => ({
        upToCents: t.upToCents,
        percentBps: t.percentBps,
        fixedCents: t.fixedCents,
      })),
    },
    minPayoutCents: plan.minPayoutCents ?? 0,
    maxPayoutCents: plan.maxPayoutCents ?? null,
    waitDaysAfterPayment: plan.waitDaysAfterPayment ?? 0,
    payoutScheduleLabel: plan.payoutScheduleLabel || "",
  };
}

@Injectable()
export class SellerFinanceService {
  private readonly logger = new Logger(SellerFinanceService.name);

  constructor(
    @InjectModel(Store.name)
    private readonly storeModel: Model<StoreDocument>,
    @InjectModel(EarlyPayoutRequest.name)
    private readonly requestModel: Model<EarlyPayoutRequestDocument>,
    private readonly payouts: PayoutsService,
    private readonly plans: PayoutPlansService,
    private readonly holds: PayoutHoldsService,
    private readonly audit: FinanceAuditService,
  ) {}

  /* ========================================================================
     Ledger
  ======================================================================== */

  /**
   * Every sale of the store with its state. Amount holds are applied to the
   * newest available sales first, so older money stays payable.
   */
  private async classify(
    storeId: string,
    plan: PayoutPlanDocument | null,
    accountReady: boolean,
  ) {
    const rows = await this.payouts.storeAllocations(storeId);
    const activeHolds = await this.holds.activeForStore(storeId);
    const now = Date.now();
    const waitMs = (plan?.waitDaysAfterPayment ?? 0) * DAY_MS;

    const out: AllocationRow[] = rows.map((row) => {
      if (row.transferred) return { ...row, state: "transferred", stateReason: "" };
      if (!row.payable) return { ...row, state: "refunded", stateReason: "Refunded or cancelled" };

      const check = this.holds.checkFromList(activeHolds, row.orderId);
      if (check.blocked || row.payoutStatus === "on_hold") {
        return { ...row, state: "held", stateReason: "On hold for review" };
      }
      if (!accountReady) {
        return { ...row, state: "pending", stateReason: "Finish your Stripe setup" };
      }
      const paidAt = (row.paidAt ?? row.orderDate)?.getTime() ?? now;
      if (now - paidAt < waitMs) {
        const days = Math.ceil((paidAt + waitMs - now) / DAY_MS);
        return { ...row, state: "pending", stateReason: `Available in ${days} day${days === 1 ? "" : "s"}` };
      }
      return { ...row, state: "available", stateReason: "" };
    });

    // Amount holds: keep that many cents of available money unpaid (newest sales first).
    let reserved = this.holds.checkFromList(activeHolds, "").reservedCents;
    if (reserved > 0) {
      for (const row of out) {
        if (reserved <= 0) break;
        if (row.state !== "available") continue;
        row.state = "held";
        row.stateReason = "On hold for review";
        reserved -= row.sellerCents;
      }
    }
    return { rows: out, activeHolds };
  }

  private sum(rows: AllocationRow[], pick: (row: AllocationRow) => number, states?: AllocationState[]) {
    return rows.filter((r) => !states || states.includes(r.state)).reduce((total, row) => total + pick(row), 0);
  }

  /** The store's Stripe account status, balance and recent bank payouts (best effort). */
  private async stripeAccountInfo(store: StoreDocument) {
    const accountId = await this.payouts.usableAccountId(store);
    if (!accountId) {
      return { connected: false, ready: false, detailsSubmitted: false, payoutsEnabled: false, requirementsDue: [] as string[] };
    }
    const status = await this.payouts.fetchAccountStatus(accountId);
    const info: Record<string, unknown> = { connected: true, ready: status.readyForPayouts, ...status };

    try {
      const balance = await this.payouts.stripe.balance.retrieve({}, { stripeAccount: accountId });
      info.stripeBalance = {
        available: balance.available.map((b) => ({ amountCents: b.amount, currency: b.currency })),
        pending: balance.pending.map((b) => ({ amountCents: b.amount, currency: b.currency })),
      };
    } catch (error) {
      this.logger.debug(`Balance not readable for ${accountId}: ${error instanceof Error ? error.message : error}`);
    }

    try {
      const payouts = await this.payouts.stripe.payouts.list({ limit: 20 }, { stripeAccount: accountId });
      info.bankPayouts = payouts.data.map((p) => ({
        id: p.id,
        amountCents: p.amount,
        currency: p.currency,
        status: p.status,
        arrivalDate: p.arrival_date ? new Date(p.arrival_date * 1000) : null,
        createdAt: new Date(p.created * 1000),
        method: p.method,
        failureMessage: p.failure_message ?? null,
      }));
    } catch (error) {
      this.logger.debug(`Payouts not readable for ${accountId}: ${error instanceof Error ? error.message : error}`);
    }

    try {
      const account = await this.payouts.stripe.accounts.retrieve(accountId);
      const schedule = account.settings?.payouts?.schedule;
      if (schedule) {
        info.payoutSchedule = {
          interval: schedule.interval,
          weeklyAnchor: schedule.weekly_anchor ?? null,
          monthlyAnchor: schedule.monthly_anchor ?? null,
          delayDays: schedule.delay_days,
        };
      }
    } catch (error) {
      this.logger.debug(`Schedule not readable for ${accountId}: ${error instanceof Error ? error.message : error}`);
    }
    return info;
  }

  /* ========================================================================
     Seller: summary and history
  ======================================================================== */

  async summary(userId: string, storeId: string) {
    const store = await this.payouts.getOwnedStore(userId, storeId);
    return this.buildSummary(store, false);
  }

  /** Shared by the seller page and the admin seller record. */
  async buildSummary(store: StoreDocument, forAdmin: boolean) {
    const storeId = String(store._id);
    const account = await this.stripeAccountInfo(store);
    const { plan, source } = await this.plans.planForStore(storeId);
    const { rows, activeHolds } = await this.classify(storeId, plan, Boolean(account.ready));

    const live = rows.filter((r) => r.state !== "refunded");
    const currency = rows[0]?.currency ?? plan?.currency ?? "usd";
    const earlyRequests = await this.requestModel
      .find({ storeId: store._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();

    return {
      store: { id: storeId, name: (store as StoreDocument & { name?: string }).name ?? "" },
      currency,
      totals: {
        salesCents: this.sum(live, (r) => r.subtotalCents),
        commissionCents: this.sum(live, (r) => r.commissionCents),
        earningsCents: this.sum(live, (r) => r.sellerCents),
        availableCents: this.sum(rows, (r) => r.sellerCents, ["available"]),
        pendingCents: this.sum(rows, (r) => r.sellerCents, ["pending"]),
        heldCents: this.sum(rows, (r) => r.sellerCents, ["held"]),
        transferredCents: this.sum(rows, (r) => r.transferredCents, ["transferred"]),
        earlyFeesCents: this.sum(rows, (r) => r.earlyFeeCents, ["transferred"]),
        refundedCents: this.sum(rows, (r) => r.subtotalCents, ["refunded"]),
      },
      account,
      plan: plan
        ? { ...planSnapshot(plan), source }
        : null,
      holds: forAdmin ? activeHolds : activeHolds.map((h) => this.holds.sellerView(h)),
      earlyRequests: earlyRequests.map((r) => ({
        id: String(r._id),
        status: r.status,
        currency: r.currency,
        grossCents: r.grossCents,
        feeCents: r.feeCents,
        netCents: r.netCents,
        transferredNetCents: r.transferredNetCents,
        items: r.items.length,
        createdAt: (r as typeof r & { createdAt?: Date }).createdAt ?? null,
      })),
    };
  }

  async history(userId: string, storeId: string) {
    const store = await this.payouts.getOwnedStore(userId, storeId);
    return this.buildHistory(store);
  }

  async buildHistory(store: StoreDocument) {
    const storeId = String(store._id);
    const account = await this.payouts.usableAccountId(store);
    const ready = account ? (await this.payouts.fetchAccountStatus(account)).readyForPayouts : false;
    const { plan } = await this.plans.planForStore(storeId);
    const { rows } = await this.classify(storeId, plan, ready);
    return rows.map((r) => ({
      orderId: r.orderId,
      orderNumber: r.orderNumber,
      shipmentId: r.shipmentId,
      date: r.payoutAt ?? r.paidAt ?? r.orderDate,
      currency: r.currency,
      grossCents: r.subtotalCents,
      commissionCents: r.commissionCents,
      commissionRate: r.commissionRate,
      sellerCents: r.sellerCents,
      earlyFeeCents: r.earlyFeeCents,
      netCents: r.transferred ? r.transferredCents : r.sellerCents,
      payoutType: r.payoutType || null,
      state: r.state,
      stateReason: r.stateReason,
      stripeTransferId: r.stripeTransferId || null,
    }));
  }

  /* ========================================================================
     Seller: early payout
  ======================================================================== */

  private quoteHash(storeId: string, currency: string, items: Array<{ shipmentId: string; amountCents: number }>, fee: FeeBreakdown, plan: PayoutPlanDocument) {
    const text = JSON.stringify({
      storeId,
      currency,
      items: items.map((i) => [i.shipmentId, i.amountCents]),
      fee: fee.feeCents,
      net: fee.netCents,
      plan: String(plan._id),
      version: plan.version,
    });
    return createHash("sha256").update(text).digest("hex");
  }

  /**
   * Works out what an early payout would be right now, without paying.
   * The same numbers are worked out again when the seller confirms.
   */
  async earlyPreview(userId: string, storeId: string) {
    const store = await this.payouts.getOwnedStore(userId, storeId);
    return this.buildEarlyQuote(store);
  }

  private async buildEarlyQuote(store: StoreDocument) {
    const storeId = String(store._id);
    const reasons: string[] = [];

    const accountId = await this.payouts.usableAccountId(store);
    const accountReady = accountId ? (await this.payouts.fetchAccountStatus(accountId)).readyForPayouts : false;
    if (!accountReady) reasons.push("Finish your Stripe setup and verification first.");

    const { plan } = await this.plans.planForStore(storeId);
    if (!plan) reasons.push("Early payouts are not available yet. Fockis has not set up a payout plan.");
    else if (!plan.earlyPayout?.enabled) reasons.push(`Early payouts are not included in your plan (${plan.name}).`);

    const { rows } = await this.classify(storeId, plan, accountReady);
    const planCurrency = (plan?.currency ?? "usd").toLowerCase();
    let available = rows
      .filter((r) => r.state === "available" && r.currency === planCurrency)
      .sort((a, b) => (a.paidAt?.getTime() ?? 0) - (b.paidAt?.getTime() ?? 0)); // oldest first

    const otherCurrency = rows.filter((r) => r.state === "available" && r.currency !== planCurrency);
    if (otherCurrency.length) {
      reasons.push(`Some sales are in another currency and can't be paid out early with your plan (${planCurrency.toUpperCase()}).`);
    }

    // Respect the plan's largest payout per request.
    if (plan?.maxPayoutCents !== null && plan?.maxPayoutCents !== undefined) {
      const picked: AllocationRow[] = [];
      let total = 0;
      for (const row of available) {
        if (total + row.sellerCents > plan.maxPayoutCents) continue;
        picked.push(row);
        total += row.sellerCents;
      }
      available = picked;
    }

    const items = available.map((r) => ({
      orderId: r.orderId,
      shipmentId: r.shipmentId,
      orderNumber: r.orderNumber,
      amountCents: r.sellerCents,
    }));
    const grossCents = items.reduce((sum, i) => sum + i.amountCents, 0);

    const fee = calculateFee(
      {
        percentBps: plan?.earlyPayout?.percentBps ?? 0,
        fixedCents: plan?.earlyPayout?.fixedCents ?? 0,
        minFeeCents: plan?.earlyPayout?.minFeeCents ?? 0,
        maxFeeCents: plan?.earlyPayout?.maxFeeCents ?? null,
        tiers: plan?.earlyPayout?.tiers ?? [],
      },
      grossCents,
    );

    if (grossCents === 0) reasons.push("You have no money available for early payout right now.");
    else if (plan && grossCents < (plan.minPayoutCents ?? 0)) {
      reasons.push(`The smallest early payout is ${(plan.minPayoutCents / 100).toFixed(2)} ${planCurrency.toUpperCase()}.`);
    }
    if (grossCents > 0 && fee.netCents <= 0) reasons.push("The fee would be larger than the payout.");

    // Each sale's part of the fee; every sale must keep something after its part.
    const feeParts = splitProportionally(fee.feeCents, items.map((i) => i.amountCents));
    if (items.some((item, index) => feeParts[index] >= item.amountCents)) {
      reasons.push("One of the sales is too small for this fee. Wait for more sales or ask Fockis support.");
    }

    const eligible = reasons.length === 0 && Boolean(plan);
    return {
      eligible,
      reasons,
      currency: planCurrency,
      items: items.map((item, index) => ({ ...item, feeCents: feeParts[index] })),
      fee,
      plan: plan ? planSnapshot(plan) : null,
      quoteHash: plan && eligible ? this.quoteHash(storeId, planCurrency, items, fee, plan) : null,
      note: "Your money goes to your Stripe account now. Stripe then sends it to your bank on your Stripe payout schedule.",
    };
  }

  /**
   * Pays the seller early. The seller must send the quoteHash from the preview
   * they agreed to; if anything changed (amounts, fee settings, holds), nothing
   * is paid and they see the new numbers.
   */
  async earlyConfirm(userId: string, storeId: string, quoteHash: string) {
    if (!quoteHash || typeof quoteHash !== "string") {
      throw new BadRequestException("Review the fee and confirm again.");
    }
    const store = await this.payouts.getOwnedStore(userId, storeId);
    const quote = await this.buildEarlyQuote(store);
    if (!quote.eligible || !quote.plan) {
      throw new BadRequestException(quote.reasons[0] ?? "Early payout is not available right now.");
    }
    if (quote.quoteHash !== quoteHash) {
      throw new ConflictException({
        message: "Your payout changed since you looked at it. Please review the new amounts and confirm again.",
        preview: quote,
      });
    }

    let request: EarlyPayoutRequestDocument;
    try {
      request = await this.requestModel.create({
        storeId: store._id,
        requestedBy: userId,
        currency: quote.currency,
        grossCents: quote.fee.grossCents,
        feeCents: quote.fee.feeCents,
        netCents: quote.fee.netCents,
        items: quote.items.map((item) => ({
          orderId: new Types.ObjectId(item.orderId),
          shipmentId: new Types.ObjectId(item.shipmentId),
          orderNumber: item.orderNumber,
          amountCents: item.amountCents,
          feeCents: item.feeCents,
          status: "pending",
        })),
        planId: new Types.ObjectId(quote.plan.id),
        pricingSnapshot: { plan: quote.plan, fee: quote.fee, at: new Date() },
        quoteHash,
        status: "processing",
      });
    } catch (error) {
      if ((error as { code?: number })?.code === 11000) {
        throw new ConflictException("An early payout is already being processed for this store.");
      }
      throw error;
    }

    let transferredNet = 0;
    let collectedFee = 0;
    let paidCount = 0;

    for (const item of request.items) {
      try {
        const result = await this.payouts.releaseShipmentPayout(String(item.orderId), String(item.shipmentId), {
          requestId: String(request._id),
          feeCents: item.feeCents,
          expectedSellerCents: item.amountCents,
        });
        item.status = result.status;
        if (result.status === "paid_out" && "transferId" in result) {
          item.stripeTransferId = String(result.transferId);
          transferredNet += item.amountCents - item.feeCents;
          collectedFee += item.feeCents;
          paidCount += 1;
        }
      } catch (error) {
        item.status = "failed";
        item.error = error instanceof Error ? error.message.slice(0, 300) : "Transfer failed";
        this.logger.error(`Early payout ${request._id} item ${item.shipmentId} failed: ${item.error}`);
      }
    }

    request.transferredNetCents = transferredNet;
    request.collectedFeeCents = collectedFee;
    request.status = paidCount === request.items.length ? "completed" : paidCount > 0 ? "partial" : "failed";
    request.completedAt = new Date();
    request.markModified("items");
    await request.save();

    await this.audit.record(
      "early_payout",
      "early_payout",
      String(request._id),
      userId,
      {
        status: request.status,
        grossCents: request.grossCents,
        feeCents: request.feeCents,
        netCents: request.netCents,
        transferredNetCents: transferredNet,
        collectedFeeCents: collectedFee,
        plan: quote.plan,
      },
      storeId,
    );

    return {
      id: String(request._id),
      status: request.status,
      currency: request.currency,
      grossCents: request.grossCents,
      feeCents: request.feeCents,
      netCents: request.netCents,
      transferredNetCents: transferredNet,
      collectedFeeCents: collectedFee,
      items: request.items.map((i) => ({
        orderNumber: i.orderNumber,
        amountCents: i.amountCents,
        feeCents: i.feeCents,
        status: i.status,
        error: i.error || null,
      })),
    };
  }

  /* ========================================================================
     Admin
  ======================================================================== */

  async searchStores(q: string) {
    const text = String(q ?? "").trim();
    const query: Record<string, unknown> = {};
    if (text) {
      if (Types.ObjectId.isValid(text)) query._id = new Types.ObjectId(text);
      else {
        const pattern = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        query.$or = [{ name: pattern }, { slug: pattern }];
      }
    }
    const stores = await this.storeModel
      .find(query)
      .select("name slug ownerId stripeAccountId stripeTransfersActive stripePayoutsEnabled")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();
    const assignments = await this.plans.assignmentsFor(stores.map((s) => String(s._id)));
    return stores.map((s) => ({
      id: String(s._id),
      name: (s as { name?: string }).name ?? "",
      slug: (s as { slug?: string }).slug ?? "",
      ownerId: String(s.ownerId ?? ""),
      stripeConnected: Boolean(s.stripeAccountId),
      transfersActive: Boolean(s.stripeTransfersActive),
      planId: assignments.get(String(s._id)) ?? null,
    }));
  }

  async adminStoreRecord(storeId: string) {
    if (!Types.ObjectId.isValid(storeId)) throw new BadRequestException("A valid store ID is required.");
    const store = await this.storeModel.findById(storeId).exec();
    if (!store) throw new BadRequestException("Store not found.");
    const [summary, history] = await Promise.all([this.buildSummary(store, true), this.buildHistory(store)]);
    return { ...summary, history };
  }

  async releaseAfterHold(storeId: string, orderId?: string) {
    return this.payouts.releaseHeldForStore(storeId, orderId);
  }

  async listEarlyRequests(filter: { storeId?: string; status?: string; limit?: number }) {
    const query: Record<string, unknown> = {};
    if (filter.storeId && Types.ObjectId.isValid(filter.storeId)) query.storeId = new Types.ObjectId(filter.storeId);
    if (filter.status) query.status = filter.status;
    const limit = Math.min(Math.max(Number(filter.limit) || 200, 1), 1000);
    return this.requestModel.find(query).sort({ createdAt: -1 }).limit(limit).lean().exec();
  }

  /** Marketplace totals for the admin overview (from early payout records and holds). */
  async adminOverview() {
    const [fees] = await this.requestModel.aggregate<{ fees: number; net: number; count: number }>([
      { $match: { status: { $in: ["completed", "partial"] } } },
      { $group: { _id: null, fees: { $sum: "$collectedFeeCents" }, net: { $sum: "$transferredNetCents" }, count: { $sum: 1 } } },
    ]);
    const activeHolds = await this.holds.list({ status: "active", limit: 1000 });
    const paidToSellers = await this.payouts.marketplaceTotals();
    return {
      paidToSellers,
      earlyPayoutFeesCents: fees?.fees ?? 0,
      earlyPayoutsNetCents: fees?.net ?? 0,
      earlyPayoutCount: fees?.count ?? 0,
      activeHolds: activeHolds.length,
      storesOnHold: new Set(activeHolds.map((h) => String(h.storeId))).size,
    };
  }
}
