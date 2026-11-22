import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { randomBytes } from "crypto";
import Stripe from "stripe";

import {
  Store,
  StoreDocument,
} from "../stores/schemas/store.schema";
import {
  Order,
  OrderDocument,
  OrderStatus,
  PaymentStatus,
} from "../fockis-shop/orders/schemas/order.schema";
import { FockisStripeService } from "../payments/services/stripe.service";
import {
  CommissionQuote,
  MarketplaceCommissionService,
} from "./fockis-marketplace-commission/services/marketplace-commission.service";
import { PayoutHoldsService } from "./marketplace-finance/services/payout-holds.service";

/** One seller's share of one shipment, as the payout ledger sees it. */
export interface ShipmentAllocation {
  orderId: string;
  orderNumber: string;
  shipmentId: string;
  storeId: string;
  currency: string;
  paidAt: Date | null;
  orderDate: Date | null;
  labelPurchasedAt: Date | null;
  paymentStatus: string;
  orderStatus: string;
  /** Item subtotal for this shipment. */
  subtotalCents: number;
  commissionCents: number;
  commissionRate: number;
  /** Seller share before any early payout fee. */
  sellerCents: number;
  /** True once the commission is frozen on the order (seller already paid). */
  snapshot: boolean;
  transferred: boolean;
  stripeTransferId: string;
  payoutStatus: string;
  payoutType: string;
  earlyFeeCents: number;
  /** What actually went to the seller's Stripe account. */
  transferredCents: number;
  payoutAt: Date | null;
  /** Paid by the customer and not refunded or cancelled. */
  payable: boolean;
}

/** Order states in which the customer has paid. */
const PAID_ORDER_STATUSES: string[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.READY_TO_SHIP,
  OrderStatus.SHIPPED,
  OrderStatus.IN_TRANSIT,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

/** A claim older than this is treated as abandoned (for example the API restarted mid-transfer). */
const CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Seller payouts through Stripe Connect (Express accounts).
 *
 * Money flow ("separate charges and transfers"):
 *   1. The customer pays the whole cart to the Fockis platform account.
 *   2. When a seller buys the shipping label for their shipment, Fockis
 *      transfers that seller's share to their Connect account.
 *   3. Stripe pays the seller's bank automatically on their payout schedule.
 *
 * Seller share = item subtotal of the shipment − platform commission.
 * Shipping paid by the customer stays with Fockis, because Fockis pays
 * Shippo for the label.
 */
type AccountStatus = {
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  transfersActive: boolean;
  readyForPayouts: boolean;
  requirementsDue: string[];
};

@Injectable()
export class PayoutsService implements OnModuleInit {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    @InjectModel(Store.name)
    private readonly storeModel: Model<StoreDocument>,

    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,

    private readonly fockisStripe: FockisStripeService,

    private readonly commissionService: MarketplaceCommissionService,

    private readonly holdsService: PayoutHoldsService,
  ) {}

  /**
   * Logs which Stripe account and mode the API is using, so it is easy to
   * confirm the right key was loaded. Only a short prefix is printed.
   */
  async onModuleInit() {
    const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
    const prefix = key.slice(0, 16);

    try {
      const account = await this.stripe.accounts.retrieveCurrent();
      const name =
        account.settings?.dashboard?.display_name ||
        account.business_profile?.name ||
        "(no name)";

      this.logger.log(
        `Stripe key ${prefix}… → account "${name}" (${account.id}), ${this.stripeMode()} mode.`,
      );
    } catch (error) {
      this.logger.warn(
        `Stripe key ${prefix}… (${this.stripeMode()} mode) — could not read account details: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  get stripe(): Stripe {
    return this.fockisStripe.client;
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  private frontendUrl(): string {
    return (process.env.FRONTEND_URL ?? "http://localhost:5173")
      .trim()
      .replace(/\/+$/, "");
  }


  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  async getOwnedStore(userId: string, storeId: string) {
    if (!storeId || !Types.ObjectId.isValid(storeId)) {
      throw new BadRequestException("A valid store ID is required.");
    }

    const store = await this.storeModel.findById(storeId).exec();
    if (!store) {
      throw new NotFoundException("Store not found.");
    }

    const ownsStore =
      String(store.ownerId) === userId ||
      String(store.sellerId ?? "") === userId;

    if (!ownsStore) {
      throw new ForbiddenException("You do not own this store.");
    }

    return store;
  }

  private stripeMode(): "live" | "test" {
    const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
    return key.startsWith("sk_live_") || key.startsWith("rk_live_")
      ? "live"
      : "test";
  }

  /** True when Stripe says the account doesn't exist for the current key. */
  private isMissingAccountError(error: unknown): boolean {
    const err = error as {
      statusCode?: number;
      code?: string;
      type?: string;
      raw?: { code?: string };
    };
    const code = err?.code ?? err?.raw?.code ?? "";

    return (
      err?.statusCode === 404 ||
      err?.statusCode === 403 ||
      err?.type === "StripePermissionError" ||
      code === "resource_missing" ||
      code === "account_invalid"
    );
  }

  /**
   * Returns the store's seller account ID if it exists under the Stripe
   * account the current keys belong to.
   *
   * If the store was set up under another Stripe account, or in test mode
   * before switching to live keys, the old ID is cleared so the seller can
   * set up payouts again under the correct account.
   */
  async usableAccountId(store: StoreDocument): Promise<string | null> {
    const accountId = store.stripeAccountId;
    if (!accountId) return null;

    try {
      await this.stripe.v2.core.accounts.retrieve(accountId);
      return accountId;
    } catch (error) {
      if (!this.isMissingAccountError(error)) throw error;

      this.logger.warn(
        `Store ${store._id} had Stripe account ${accountId}, which doesn't exist for the current ${this.stripeMode()} Stripe key. Clearing it so the seller can set up payouts again.`,
      );

      await this.storeModel
        .updateOne(
          { _id: store._id },
          {
            $set: {
              stripeAccountId: "",
              stripeDetailsSubmitted: false,
              stripePayoutsEnabled: false,
              stripeTransfersActive: false,
              stripeAccountUpdatedAt: new Date(),
            },
          },
        )
        .exec();

      store.stripeAccountId = "";
      return null;
    }
  }

  /**
   * Reads a seller account with the Accounts v2 API and returns a simple
   * status, then saves it on the store.
   *
   * Sellers are Accounts v2 "recipients": they can receive /v1/transfers
   * once the stripe_balance.stripe_transfers capability is active.
   */
  async fetchAccountStatus(accountId: string): Promise<AccountStatus> {
    const account = await this.stripe.v2.core.accounts.retrieve(accountId, {
      include: ["configuration.recipient", "requirements"],
    });

    const balance = account.configuration?.recipient?.capabilities?.stripe_balance;
    const transfersActive = balance?.stripe_transfers?.status === "active";
    const payoutsStatus = balance?.payouts?.status;

    const requirementsDue = Array.from(
      new Set(
        (account.requirements?.entries ?? [])
          .filter((entry) => entry.awaiting_action_from === "user")
          .map((entry) => entry.description),
      ),
    );

    const status: AccountStatus = {
      detailsSubmitted: requirementsDue.length === 0,
      payoutsEnabled: payoutsStatus ? payoutsStatus === "active" : transfersActive,
      transfersActive,
      readyForPayouts: transfersActive,
      requirementsDue,
    };

    await this.storeModel
      .updateOne(
        { stripeAccountId: accountId },
        {
          $set: {
            stripeDetailsSubmitted: status.detailsSubmitted,
            stripePayoutsEnabled: status.payoutsEnabled,
            stripeTransfersActive: status.transfersActive,
            stripeAccountUpdatedAt: new Date(),
          },
        },
      )
      .exec();

    return status;
  }

  // ---------------------------------------------------------------------------
  // Seller onboarding
  // ---------------------------------------------------------------------------

  /**
   * Creates the seller's Connect account if needed and returns a
   * Stripe-hosted onboarding URL. Send the seller's browser to that URL.
   */
  async createOnboardingLink(userId: string, storeId: string) {
    const store = await this.getOwnedStore(userId, storeId);
    let accountId = (await this.usableAccountId(store)) ?? "";

    if (!accountId) {
      // Accounts v2: the seller is a "recipient" that receives transfers
      // from Fockis (separate charges and transfers) and uses the
      // Stripe Express dashboard. Stripe collects the seller's ID and bank.
      const account = await this.stripe.v2.core.accounts.create(
        {
          display_name: store.name,
          ...(store.email ? { contact_email: store.email } : {}),
          dashboard: "express",
          identity: {
            country: (store.countryCode || "US").toLowerCase(),
          },
          defaults: {
            currency: String(store.currency || "USD").toLowerCase(),
            responsibilities: {
              fees_collector: "application",
              losses_collector: "application",
            },
            ...(store.website
              ? { profile: { business_url: store.website } }
              : {}),
          },
          configuration: {
            recipient: {
              capabilities: {
                stripe_balance: {
                  stripe_transfers: { requested: true },
                },
              },
            },
          },
          metadata: {
            storeId: String(store._id),
            fockisStoreId: store.fockisStoreId,
            ownerUserId: userId,
          },
        },
        {
          // Includes the key mode and the minute so a store whose old account
          // was cleared (for example after switching Stripe keys) gets a
          // new account instead of a cached response.
          idempotencyKey: `fockis_connect_v2_${this.stripeMode()}_${store._id}_${Math.floor(Date.now() / 60000)}`,
        },
      );

      accountId = account.id;

      await this.storeModel
        .updateOne(
          { _id: store._id },
          {
            $set: {
              stripeAccountId: account.id,
              stripeDetailsSubmitted: false,
              stripePayoutsEnabled: false,
              stripeTransfersActive: false,
              stripeAccountUpdatedAt: new Date(),
            },
          },
        )
        .exec();

      this.logger.log(
        `Created Stripe Connect account ${account.id} for store ${store._id}.`,
      );
    }

    const base = this.frontendUrl();
    const link = await this.stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["recipient"],
          refresh_url: `${base}/seller/payouts?storeId=${storeId}&refresh=1`,
          return_url: `${base}/seller/payouts?storeId=${storeId}&done=1`,
        },
      },
    });

    return { url: link.url };
  }

  /**
   * Current payout status for the seller dashboard.
   */
  async getStatus(userId: string, storeId: string) {
    const store = await this.getOwnedStore(userId, storeId);

    const accountId = await this.usableAccountId(store);

    if (!accountId) {
      return {
        connected: false,
        detailsSubmitted: false,
        payoutsEnabled: false,
        transfersActive: false,
        readyForPayouts: false,
        requirementsDue: [] as string[],
      };
    }

    const status = await this.fetchAccountStatus(accountId);

    // Release any sales that shipped before the seller finished setup.
    // Done here as well as in the webhook, so it works even without one.
    if (status.readyForPayouts) {
      void this.releasePendingForStore(String(store._id)).catch((error) =>
        this.logger.error(
          `Releasing pending payouts failed for store ${store._id}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        ),
      );
    }

    return { connected: true, ...status };
  }

  /**
   * One-time link to the seller's Stripe Express dashboard
   * (balance, payouts, bank account).
   */
  async createDashboardLink(userId: string, storeId: string) {
    const store = await this.getOwnedStore(userId, storeId);

    if (!store.stripeAccountId) {
      throw new BadRequestException("This store has not set up payouts yet.");
    }

    const link = await this.stripe.accounts.createLoginLink(
      store.stripeAccountId,
    );
    return { url: link.url };
  }

  // ---------------------------------------------------------------------------
  // Paying sellers
  // ---------------------------------------------------------------------------

  /**
   * Transfers the seller's share for one shipment of a paid order.
   * Safe to call more than once: an existing transfer is never repeated.
   *
   * Standard payouts are started by ShippingService after the seller buys
   * the label. Early payouts are started by the seller (see SellerFinanceService)
   * and pass `early`, whose fee Fockis keeps out of the transfer.
   *
   * Before paying, it checks admin holds and the seller's Stripe account,
   * then freezes the commission on the order (the frozen numbers are reused
   * on every later call, so a rate change never alters this sale).
   */
  async releaseShipmentPayout(
    orderId: string,
    shipmentId: string,
    early?: { requestId: string; feeCents: number; expectedSellerCents: number },
  ) {
    if (
      !Types.ObjectId.isValid(orderId) ||
      !Types.ObjectId.isValid(shipmentId)
    ) {
      throw new BadRequestException("Valid order and shipment IDs are required.");
    }

    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException("Order not found.");
    }

    const shipment = (order.shipments ?? []).find(
      (item) => String(item._id) === shipmentId,
    );
    if (!shipment) {
      throw new NotFoundException("The shipment was not found in this order.");
    }

    if (shipment.stripeTransferId) {
      return {
        status: "already_paid_out",
        transferId: shipment.stripeTransferId,
      };
    }

    if (!this.isOrderPayable(order)) {
      throw new BadRequestException(
        "The order must be paid (and not refunded or cancelled) before the seller can be paid out.",
      );
    }

    const store = await this.storeModel.findById(shipment.storeId).exec();
    if (!store) {
      throw new NotFoundException("The seller's store was not found.");
    }
    const storeId = String(store._id);

    // 1. Admin holds.
    const holds = await this.holdsService.check(storeId, orderId);
    let heldByAmount = false;
    if (!holds.blocked && holds.reservedCents > 0) {
      // Amount holds: the store must keep at least that much unpaid.
      const others = await this.untransferredCentsForStore(storeId, shipmentId);
      heldByAmount = others < holds.reservedCents;
    }
    if (holds.blocked || heldByAmount) {
      if (!early) {
        shipment.payoutStatus = "on_hold";
        await order.save({ validateModifiedOnly: true });
        this.logger.warn(
          `Payout for order ${order.orderNumber} shipment ${shipmentId} is on hold for store ${storeId}.`,
        );
      }
      return { status: "on_hold" };
    }

    // 2. The seller's Stripe account must be able to receive transfers.
    let ready = false;
    const sellerAccountId = await this.usableAccountId(store);
    if (sellerAccountId) {
      const accountStatus = await this.fetchAccountStatus(sellerAccountId);
      ready = accountStatus.readyForPayouts;
    }

    if (!sellerAccountId || !ready) {
      if (!early) {
        shipment.payoutStatus = "pending_seller_onboarding";
        await order.save({ validateModifiedOnly: true });
        this.logger.warn(
          `Payout for order ${orderId} shipment ${shipmentId} is waiting: store ${storeId} has not finished Stripe onboarding.`,
        );
      }
      return { status: "pending_seller_onboarding" };
    }

    // 3. Commission: reuse the frozen numbers, or work them out now and freeze them.
    const quote = await this.quoteForShipment(order, shipment);
    if (!this.hasSnapshot(shipment)) {
      shipment.payoutCommissionRate = quote.rate;
      shipment.payoutCommissionSource = quote.source;
      shipment.payoutSubtotal = quote.subtotalCents / 100;
      shipment.payoutCommission = quote.commissionCents / 100;
      shipment.payoutSellerAmount = quote.sellerCents / 100;
      shipment.payoutQuoteAt = new Date();
    }
    const sellerCents = quote.sellerCents;
    const commissionCents = quote.commissionCents;

    if (sellerCents <= 0) {
      shipment.payoutStatus = "nothing_to_pay";
      await order.save({ validateModifiedOnly: true });
      return { status: "nothing_to_pay" };
    }

    // 4. Early payout: the seller agreed to a fee that Fockis keeps.
    const feeCents = early ? early.feeCents : 0;
    if (early) {
      if (sellerCents !== early.expectedSellerCents) {
        // The amount changed since the seller saw the preview.
        return { status: "amount_changed" };
      }
      if (!Number.isSafeInteger(feeCents) || feeCents < 0 || feeCents >= sellerCents) {
        throw new BadRequestException("The early payout fee is not valid for this sale.");
      }
    }
    const transferCents = sellerCents - feeCents;

    // 5. Claim the shipment so two transfers can never start at once.
    const claimId = randomBytes(12).toString("hex");
    const claimed = await this.orderModel
      .updateOne(
        {
          _id: order._id,
          shipments: {
            $elemMatch: {
              _id: shipment._id,
              stripeTransferId: { $in: ["", null] },
              $or: [
                { payoutClaimId: { $in: ["", null] } },
                { payoutClaimId: { $exists: false } },
                { payoutClaimedAt: { $lt: new Date(Date.now() - CLAIM_TIMEOUT_MS) } },
              ],
            },
          },
        },
        { $set: { "shipments.$.payoutClaimId": claimId, "shipments.$.payoutClaimedAt": new Date() } },
      )
      .exec();
    if (claimed.modifiedCount !== 1) {
      return { status: "in_progress" };
    }

    const chargeId = await this.resolveChargeId(order);
    const currency = String(order.currency || "usd").toLowerCase();

    let transfer: Stripe.Transfer;
    try {
      transfer = await this.stripe.transfers.create(
        {
          amount: transferCents,
          currency,
          destination: sellerAccountId,
          transfer_group: `order_${orderId}`,
          ...(chargeId ? { source_transaction: chargeId } : {}),
          metadata: {
            orderId,
            orderNumber: order.orderNumber,
            shipmentId,
            storeId,
            subtotalCents: String(quote.subtotalCents),
            commissionCents: String(commissionCents),
            sellerCents: String(sellerCents),
            payoutType: early ? "early" : "standard",
            earlyPayoutFeeCents: String(feeCents),
            ...(early ? { earlyPayoutRequestId: early.requestId } : {}),
          },
        },
        {
          idempotencyKey: early
            ? `fockis_early_${early.requestId}_${shipmentId}`
            : `fockis_payout_${orderId}_${shipmentId}`,
        },
      );
    } catch (error) {
      await this.orderModel
        .updateOne(
          { _id: order._id, "shipments._id": shipment._id, "shipments.payoutClaimId": claimId },
          { $set: { "shipments.$.payoutClaimId": "", "shipments.$.payoutClaimedAt": null } },
        )
        .exec();
      throw error;
    }

    shipment.stripeTransferId = transfer.id;
    shipment.payoutStatus = "paid_out";
    shipment.payoutType = early ? "early" : "standard";
    shipment.payoutEarlyFeeCents = early ? feeCents : null;
    shipment.payoutEarlyRequestId = early ? early.requestId : "";
    shipment.payoutAmount = transferCents / 100;
    shipment.payoutCommission = commissionCents / 100;
    shipment.payoutCurrency = currency;
    shipment.payoutAt = new Date();
    shipment.payoutClaimId = "";
    shipment.payoutClaimedAt = null;
    await order.save({ validateModifiedOnly: true });

    this.logger.log(
      `Transferred ${(transferCents / 100).toFixed(2)} ${currency.toUpperCase()} to ${sellerAccountId} for order ${order.orderNumber} shipment ${shipmentId}${
        early ? ` (early payout, fee ${(feeCents / 100).toFixed(2)})` : ""
      }.`,
    );

    return {
      status: "paid_out",
      transferId: transfer.id,
      amount: transferCents / 100,
      commission: commissionCents / 100,
      earlyPayoutFee: feeCents / 100,
      currency,
    };
  }

  // ---------------------------------------------------------------------------
  // Payout ledger (read side)
  // ---------------------------------------------------------------------------

  /** Paid by the customer and not refunded, partly refunded or cancelled. */
  isOrderPayable(order: Pick<OrderDocument, "paymentStatus" | "status">): boolean {
    const blocked: string[] = [
      OrderStatus.CANCELLED,
      OrderStatus.REFUNDED,
      OrderStatus.RETURN_REQUESTED,
      OrderStatus.RETURNED,
    ];
    if (blocked.includes(order.status)) return false;
    if (
      order.paymentStatus === PaymentStatus.REFUNDED ||
      order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED ||
      order.paymentStatus === PaymentStatus.FAILED
    ) {
      return false;
    }
    return order.paymentStatus === PaymentStatus.PAID || PAID_ORDER_STATUSES.includes(order.status);
  }

  private hasSnapshot(shipment: OrderDocument["shipments"][number]): boolean {
    return (
      shipment.payoutCommissionRate !== null &&
      shipment.payoutCommissionRate !== undefined &&
      shipment.payoutSellerAmount !== null &&
      shipment.payoutSellerAmount !== undefined &&
      shipment.payoutCommission !== null &&
      shipment.payoutCommission !== undefined
    );
  }

  /**
   * Commission for one shipment: the frozen numbers if the seller was already
   * paid, otherwise today's admin settings (not saved).
   */
  async quoteForShipment(
    order: OrderDocument,
    shipment: OrderDocument["shipments"][number],
  ): Promise<CommissionQuote> {
    const subtotalCents = this.shipmentSubtotalCents(order, shipment);
    if (this.hasSnapshot(shipment)) {
      return {
        rate: shipment.payoutCommissionRate as number,
        fixedCents: 0,
        minCents: 0,
        maxCents: null,
        subtotalCents: Math.round((shipment.payoutSubtotal ?? subtotalCents / 100) * 100),
        commissionCents: Math.round((shipment.payoutCommission as number) * 100),
        sellerCents: Math.round((shipment.payoutSellerAmount as number) * 100),
        source: (shipment.payoutCommissionSource || "default") as CommissionQuote["source"],
      };
    }
    if (
      shipment.stripeTransferId &&
      shipment.payoutCommission !== null &&
      shipment.payoutCommission !== undefined &&
      shipment.payoutAmount !== null &&
      shipment.payoutAmount !== undefined
    ) {
      // Paid out before snapshots existed: use what was actually recorded.
      const commissionCents = Math.round(shipment.payoutCommission * 100);
      const sellerCents = Math.round(shipment.payoutAmount * 100) + (shipment.payoutEarlyFeeCents ?? 0);
      return {
        rate: subtotalCents > 0 ? Math.round((commissionCents / subtotalCents) * 10000) / 100 : 0,
        fixedCents: 0,
        minCents: 0,
        maxCents: null,
        subtotalCents,
        commissionCents,
        sellerCents,
        source: "default",
      };
    }
    return this.commissionService.quote({ subtotalCents, storeId: String(shipment.storeId) });
  }

  /** Every shipment of a store with its money, newest first. */
  async storeAllocations(storeId: string, limit = 1000): Promise<ShipmentAllocation[]> {
    if (!Types.ObjectId.isValid(storeId)) return [];
    const store = new Types.ObjectId(storeId);
    const orders = await this.orderModel
      .find({ "shipments.storeId": store })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    const rows: ShipmentAllocation[] = [];
    for (const order of orders) {
      const payable = this.isOrderPayable(order);
      for (const shipment of order.shipments ?? []) {
        if (String(shipment.storeId) !== storeId) continue;
        // Skip unpaid orders that were never paid out (abandoned checkouts, etc.).
        if (!payable && !shipment.stripeTransferId && order.paymentStatus === PaymentStatus.PENDING) continue;

        // One broken order (for example items with a $0 total) must not stop
        // the whole payouts page. Skip it here and log it for a look.
        let quote: CommissionQuote;
        try {
          quote = await this.quoteForShipment(order, shipment);
        } catch (error) {
          this.logger.warn(
            `Skipped order ${order.orderNumber} shipment ${shipment._id} in the payout ledger: ${
              error instanceof Error ? error.message : "unknown error"
            }`,
          );
          continue;
        }
        const transferred = Boolean(shipment.stripeTransferId);
        const earlyFeeCents = shipment.payoutEarlyFeeCents ?? 0;
        rows.push({
          orderId: String(order._id),
          orderNumber: order.orderNumber,
          shipmentId: String(shipment._id),
          storeId,
          currency: String(order.currency || "usd").toLowerCase(),
          paidAt: order.paidAt ?? null,
          orderDate: order.orderDate ?? (order as OrderDocument & { createdAt?: Date }).createdAt ?? null,
          labelPurchasedAt: shipment.labelPurchasedAt ?? null,
          paymentStatus: order.paymentStatus,
          orderStatus: order.status,
          subtotalCents: quote.subtotalCents,
          commissionCents: quote.commissionCents,
          commissionRate: quote.rate,
          sellerCents: quote.sellerCents,
          snapshot: this.hasSnapshot(shipment),
          transferred,
          stripeTransferId: shipment.stripeTransferId || "",
          payoutStatus: shipment.payoutStatus || "",
          payoutType: shipment.payoutType || (transferred ? "standard" : ""),
          earlyFeeCents,
          transferredCents: transferred
            ? Math.round((shipment.payoutAmount ?? quote.sellerCents / 100) * 100)
            : 0,
          payoutAt: shipment.payoutAt ?? null,
          payable,
        });
      }
    }
    return rows;
  }

  /** Marketplace-wide totals of what has been paid to sellers, by currency. */
  async marketplaceTotals() {
    return this.orderModel
      .aggregate<{
        _id: string;
        transferredCents: number;
        commissionCents: number;
        earlyFeeCents: number;
        shipments: number;
      }>([
        { $unwind: "$shipments" },
        { $match: { "shipments.stripeTransferId": { $nin: ["", null] } } },
        {
          $group: {
            _id: { $toLower: { $ifNull: ["$currency", "usd"] } },
            transferredCents: { $sum: { $round: [{ $multiply: [{ $ifNull: ["$shipments.payoutAmount", 0] }, 100] }, 0] } },
            commissionCents: { $sum: { $round: [{ $multiply: [{ $ifNull: ["$shipments.payoutCommission", 0] }, 100] }, 0] } },
            earlyFeeCents: { $sum: { $ifNull: ["$shipments.payoutEarlyFeeCents", 0] } },
            shipments: { $sum: 1 },
          },
        },
      ])
      .exec();
  }

  /** Seller money still with Fockis for this store (paid orders, not yet transferred). */
  async untransferredCentsForStore(storeId: string, excludeShipmentId?: string): Promise<number> {
    const rows = await this.storeAllocations(storeId);
    return rows
      .filter((row) => row.payable && !row.transferred && row.shipmentId !== excludeShipmentId)
      .reduce((sum, row) => sum + row.sellerCents, 0);
  }

  /**
   * Pays shipments that were stopped by a hold, once the hold is gone.
   * Only shipments whose label was bought (normal payout time) are paid;
   * the others become available for early payout again.
   */
  async releaseHeldForStore(storeId: string, orderId?: string) {
    const query: Record<string, unknown> = {
      shipments: {
        $elemMatch: { storeId: new Types.ObjectId(storeId), payoutStatus: "on_hold" },
      },
    };
    if (orderId) query._id = new Types.ObjectId(orderId);
    const orders = await this.orderModel.find(query).exec();
    const results: Array<{ orderId: string; shipmentId: string; status: string }> = [];

    for (const order of orders) {
      for (const shipment of order.shipments ?? []) {
        if (String(shipment.storeId) !== storeId || shipment.payoutStatus !== "on_hold") continue;
        if (!shipment.labelPurchasedAt) {
          shipment.payoutStatus = "";
          await order.save({ validateModifiedOnly: true });
          results.push({ orderId: String(order._id), shipmentId: String(shipment._id), status: "available" });
          continue;
        }
        try {
          const result = await this.releaseShipmentPayout(String(order._id), String(shipment._id));
          results.push({ orderId: String(order._id), shipmentId: String(shipment._id), status: result.status });
        } catch (error) {
          this.logger.error(
            `Releasing held payout failed for order ${order._id} shipment ${shipment._id}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          );
          results.push({ orderId: String(order._id), shipmentId: String(shipment._id), status: "failed" });
        }
      }
    }
    return results;
  }

  /**
   * Pays every shipment that was waiting for this store to finish onboarding.
   */
  async releasePendingForStore(storeId: string) {
    const orders = await this.orderModel
      .find({
        shipments: {
          $elemMatch: {
            storeId: new Types.ObjectId(storeId),
            payoutStatus: "pending_seller_onboarding",
          },
        },
      })
      .exec();

    for (const order of orders) {
      for (const shipment of order.shipments ?? []) {
        if (
          String(shipment.storeId) === String(storeId) &&
          shipment.payoutStatus === "pending_seller_onboarding"
        ) {
          try {
            await this.releaseShipmentPayout(
              String(order._id),
              String(shipment._id),
            );
          } catch (error) {
            this.logger.error(
              `Pending payout failed for order ${order._id} shipment ${shipment._id}: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            );
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Webhook
  // ---------------------------------------------------------------------------

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new ServiceUnavailableException(
        "Set STRIPE_CONNECT_WEBHOOK_SECRET in apps/api/.env.",
      );
    }

    try {
      return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new BadRequestException("Invalid Stripe webhook signature.");
    }
  }

  /**
   * Called when Stripe reports a change on a seller account.
   * Re-reads the account with Accounts v2 rather than trusting the payload.
   */
  async handleAccountUpdated(accountId: string) {
    const store = await this.storeModel
      .findOne({ stripeAccountId: accountId })
      .exec();
    if (!store) return;

    const status = await this.fetchAccountStatus(accountId);

    if (status.readyForPayouts) {
      await this.releasePendingForStore(String(store._id));
    }
  }

  // ---------------------------------------------------------------------------
  // Order helpers
  // ---------------------------------------------------------------------------

  /**
   * Item subtotal (in cents) for one seller's shipment.
   * Uses the shipment's itemIds; falls back to order items from the same store.
   */
  private shipmentSubtotalCents(
    order: OrderDocument,
    shipment: OrderDocument["shipments"][number],
  ): number {
    const itemIds = new Set((shipment.itemIds ?? []).map((id) => String(id)));
    const storeId = String(shipment.storeId);

    const items = (order.items ?? []).filter((item) => {
      const itemId = String((item as typeof item & { _id?: unknown })._id ?? "");
      return itemIds.size
        ? itemIds.has(itemId)
        : String(item.storeId) === storeId;
    });

    const total = items.reduce((sum, item) => {
      const lineTotal = Number(item.itemTotal);
      if (Number.isFinite(lineTotal) && lineTotal > 0) {
        return sum + lineTotal;
      }
      const price = Number(item.price ?? item.unitPrice ?? 0);
      const quantity = Number(item.quantity ?? 1);
      return Number.isFinite(price) && Number.isFinite(quantity)
        ? sum + price * quantity
        : sum;
    }, 0);

    if (total <= 0) {
      throw new BadRequestException(
        "Could not determine the item subtotal for this shipment.",
      );
    }

    return Math.round(total * 100);
  }

  /**
   * Finds the Stripe charge behind the order's PaymentIntent so the transfer
   * is tied to it (source_transaction). This lets the transfer succeed even
   * while the customer's payment is still pending in the platform balance.
   */
  private async resolveChargeId(
    order: OrderDocument,
  ): Promise<string | undefined> {
    const paymentIntentId = order.paymentIntentId;

    if (paymentIntentId && paymentIntentId.startsWith("pi_")) {
      const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      const latest = intent.latest_charge;
      if (typeof latest === "string") return latest;
      if (latest && typeof latest === "object") return latest.id;
    }

    this.logger.warn(
      `No Stripe charge found on order ${order.orderNumber}. The transfer will use the platform's available balance.`,
    );
    return undefined;
  }
}
