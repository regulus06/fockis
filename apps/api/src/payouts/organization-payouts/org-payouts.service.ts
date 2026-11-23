/**
 * org-payouts.service.ts
 * -----------------------------------------------------------------------------
 * Organization payouts (Stripe Connect, "separate charges and transfers" —
 * the same model as marketplace seller payouts):
 *
 *   1. A giver pays Fockis (UniversalPaymentService, one Stripe integration).
 *   2. recordIncome() writes a ledger line: the amount that reached Fockis'
 *      Stripe balance, minus the Fockis fee (frozen now), = owed to the
 *      organization. It becomes payable after the hold period (default 7 days).
 *   3. On the organization's schedule (or "Pay out now"), everything payable
 *      is sent in one Stripe transfer to the organization's Connect account.
 *      Stripe then pays the organization's bank.
 *
 * Safety:
 *   - Only the organization owner connects Stripe, changes the schedule or
 *     starts a payout. Owner, administrators / pastors and "manage settings"
 *     members can view. Admin settings are super-admin only (controller).
 *   - Each payout claims its ledger lines and the organization (run lock)
 *     before calling Stripe, uses an idempotency key, and is reconciled if the
 *     API stops mid-way, so money is never sent twice.
 *   - Lines carry the Stripe mode (test / live); an API only touches lines of
 *     its own mode (the local API and the live API can share one database).
 *   - Refunds after a payout are recorded as negative lines and taken from the
 *     next payout.
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";
import Stripe from "stripe";

import { PayoutsService } from "../payouts.service";
import { FinanceAuditService } from "../marketplace-finance/services/finance-audit.service";
import { NotificationsService } from "../../notifications/notifications.service";
import {
  OrgLedgerEntry,
  OrgLedgerEntryDocument,
  OrgPayout,
  OrgPayoutAccount,
  OrgPayoutAccountDocument,
  OrgPayoutConfig,
  OrgPayoutConfigDocument,
  OrgPayoutDocument,
  StripeMode,
} from "./org-payout.schemas";
import { coverAmount, nextRunAt, orgFee, OrgFeeRuleInput, OrgSchedule, refundReversal } from "./org-payout-math";

type Lean = Record<string, any>;

const ADMIN_ROLES = ["administrator", "pastor_director"];
const RUN_LOCK_MS = 10 * 60 * 1000;
const STUCK_AFTER_MS = 15 * 60 * 1000;
const TICK_MS = 10 * 60 * 1000;

/** Two-decimal currencies only (all giving currencies are). */
const toCents = (amount: number) => Math.round(Number(amount) * 100);
const fromCents = (cents: number) => Math.round(cents) / 100;
const iso = (d: unknown) => (d ? new Date(String(d)).toISOString() : null);

export interface IncomeInput {
  organizationId: string;
  sourceType: string;
  sourceId: string;
  paymentId: string;
  description: string;
  /** Amount the giver added to cover the fee, in the gift's own currency. */
  coveredFee?: number;
}

@Injectable()
export class OrgPayoutsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger("OrgPayouts");
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;

  constructor(
    @InjectModel(OrgPayoutConfig.name) private readonly configModel: Model<OrgPayoutConfigDocument>,
    @InjectModel(OrgPayoutAccount.name) private readonly accountModel: Model<OrgPayoutAccountDocument>,
    @InjectModel(OrgLedgerEntry.name) private readonly ledgerModel: Model<OrgLedgerEntryDocument>,
    @InjectModel(OrgPayout.name) private readonly payoutModel: Model<OrgPayoutDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly payouts: PayoutsService,
    private readonly audit: FinanceAuditService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  /* ======================================================================
     Scheduler
     ====================================================================== */

  onModuleInit() {
    if (process.env.NODE_ENV === "test" || process.env.ORG_PAYOUTS_SCHEDULER_DISABLED === "true") return;
    setTimeout(() => void this.tick(), 60_000).unref?.();
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Runs due scheduled payouts and repairs payouts interrupted mid-way. */
  async tick(now = new Date()) {
    if (this.ticking) return;
    this.ticking = true;
    try {
      await this.reconcileStuck(now);
      const mode = this.mode();
      const due = (await this.accountModel
        .find({
          stripeMode: mode,
          stripeAccountId: { $ne: "" },
          onHold: false,
          "schedule.interval": { $ne: "manual" },
          nextRunAt: { $ne: null, $lte: now },
        })
        .select("organizationId")
        .limit(50)
        .lean()
        .exec()) as Lean[];
      for (const a of due) {
        await this.runPayout(String(a.organizationId), "schedule", "system").catch((e) =>
          this.logger.error(`Scheduled payout for ${a.organizationId} failed: ${this.msg(e)}`),
        );
      }
    } catch (e) {
      this.logger.error(`Payout scheduler error: ${this.msg(e)}`);
    } finally {
      this.ticking = false;
    }
  }

  /* ======================================================================
     Settings
     ====================================================================== */

  async getConfig(): Promise<Lean> {
    const found = (await this.configModel.findOne({ key: "default" }).lean().exec()) as Lean | null;
    if (found) return found;
    await this.configModel.updateOne({ key: "default" }, { $setOnInsert: { key: "default" } }, { upsert: true }).exec();
    return (await this.configModel.findOne({ key: "default" }).lean().exec()) as Lean;
  }

  async saveConfig(input: Lean, actorId: string) {
    const before = await this.getConfig();
    const set: Lean = { updatedBy: actorId };
    if (input.fee !== undefined) set.fee = this.feeRules(input.fee);
    if (input.feeCurrency !== undefined) {
      const c = String(input.feeCurrency).toLowerCase();
      if (!/^[a-z]{3}$/.test(c)) throw new BadRequestException("Fee currency must be a 3-letter code.");
      set.feeCurrency = c;
    }
    if (input.holdDays !== undefined) set.holdDays = this.intIn(input.holdDays, 0, 90, "Waiting days");
    if (input.coverFeeEnabled !== undefined) set.coverFeeEnabled = Boolean(input.coverFeeEnabled);
    if (input.minPayoutFloorCents !== undefined) set.minPayoutFloorCents = this.intIn(input.minPayoutFloorCents, 0, 10_000_00, "Minimum payout floor");
    await this.configModel.updateOne({ key: "default" }, { $set: set }, { upsert: true }).exec();
    const after = await this.getConfig();
    await this.audit.record("org_payout_config_updated", "org_payout_config", "default", actorId, {
      before: this.configView(before),
      after: this.configView(after),
    });
    return this.configView(after);
  }

  configView(c: Lean) {
    return {
      fee: this.feeOut(c.fee),
      feeCurrency: c.feeCurrency ?? "usd",
      holdDays: c.holdDays ?? 7,
      coverFeeEnabled: c.coverFeeEnabled !== false,
      minPayoutFloorCents: c.minPayoutFloorCents ?? 100,
      updatedAt: iso(c.updatedAt),
    };
  }

  /** Fee that applies to an organization (its override, or the default). */
  private async rulesFor(orgId: Types.ObjectId): Promise<{ rules: OrgFeeRuleInput; feeCurrency: string; config: Lean; override: boolean }> {
    const config = await this.getConfig();
    const account = (await this.accountModel.findOne({ organizationId: orgId }).select("feeOverride").lean().exec()) as Lean | null;
    const override = Boolean(account?.feeOverride);
    return { rules: this.feeOut(override ? account!.feeOverride : config.fee), feeCurrency: config.feeCurrency ?? "usd", config, override };
  }

  /* ======================================================================
     Giver: "add the fee so the church receives the full gift"
     ====================================================================== */

  /** Extra amount (in the gift currency) for a gift of `amount`. 0 when the option is off. */
  async coverQuote(organizationId: string, amount: number, currency: string) {
    const orgId = this.oid(organizationId);
    const { rules, feeCurrency, config } = await this.rulesFor(orgId);
    const enabled = config.coverFeeEnabled !== false && (rules.percentBps > 0 || rules.fixedCents > 0 || rules.minFeeCents > 0);
    const cents = toCents(amount);
    if (!enabled || !Number.isFinite(cents) || cents <= 0) return { enabled, cover: 0, currency: currency.toUpperCase() };
    const same = currency.toLowerCase() === feeCurrency;
    return { enabled, cover: fromCents(coverAmount(rules, cents, same)), currency: currency.toUpperCase() };
  }

  /* ======================================================================
     Recording money for an organization
     ====================================================================== */

  /**
   * Called once a payment to an organization is paid (idempotent: a second
   * call for the same payment does nothing).
   */
  async recordIncome(input: IncomeInput): Promise<void> {
    const orgId = this.oid(input.organizationId);
    const payment = (await this.connection.collection("payments").findOne({ id: input.paymentId })) as Lean | null;
    if (!payment || payment.status !== "paid" || !payment.stripePaymentIntentId) return;
    if (await this.ledgerModel.exists({ dedupeKey: `income:${input.paymentId}` })) return;

    // What actually reached Fockis' Stripe balance (after any currency conversion).
    const intent = await this.stripe.paymentIntents.retrieve(String(payment.stripePaymentIntentId), {
      expand: ["latest_charge.balance_transaction"],
    });
    const mode: StripeMode = intent.livemode ? "live" : "test";
    const charge = intent.latest_charge && typeof intent.latest_charge === "object" ? (intent.latest_charge as Stripe.Charge) : null;
    const bt = charge?.balance_transaction && typeof charge.balance_transaction === "object" ? (charge.balance_transaction as Stripe.BalanceTransaction) : null;
    const grossCents = bt ? bt.amount : Number(intent.amount_received || intent.amount);
    const currency = (bt ? bt.currency : intent.currency).toLowerCase();
    const stripeFeeCents = bt ? bt.fee : 0;

    const { rules, feeCurrency, config, override } = await this.rulesFor(orgId);
    const feeCents = orgFee(rules, grossCents, currency === feeCurrency);
    const netCents = grossCents - feeCents;

    // Covered fee, converted into the balance currency with the same ratio as the gift.
    const baseCents = toCents(Number(payment.baseAmount));
    const coveredFeeCents = input.coveredFee && baseCents > 0 ? Math.round((toCents(input.coveredFee) * grossCents) / baseCents) : 0;

    const paidAt = payment.paidAt ? new Date(payment.paidAt) : new Date();
    const availableAt = new Date(paidAt.getTime() + Number(config.holdDays ?? 7) * 86_400_000);

    try {
      await this.ledgerModel.create({
        organizationId: orgId,
        kind: "income",
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        paymentId: input.paymentId,
        dedupeKey: `income:${input.paymentId}`,
        stripeMode: mode,
        currency,
        grossCents,
        feeCents,
        coveredFeeCents,
        stripeFeeCents,
        netCents,
        feeRule: { ...rules, feeCurrency, override },
        status: "pending",
        availableAt,
        description: input.description.slice(0, 200),
      });
    } catch (e) {
      if ((e as { code?: number })?.code === 11000) return; // recorded by a parallel call
      throw e;
    }
    await this.ensureAccount(orgId);
    await this.audit.record("org_income_recorded", "organization", String(orgId), "system", {
      paymentId: input.paymentId,
      currency,
      grossCents,
      feeCents,
      netCents,
      availableAt: availableAt.toISOString(),
    });
  }

  @OnEvent("payments.refunded", { async: true })
  async onRefunded(payload: { paymentId?: string }) {
    if (!payload?.paymentId) return;
    try {
      await this.recordRefund(payload.paymentId);
    } catch (e) {
      this.logger.error(`Refund for payment ${payload.paymentId} could not be applied to the organization ledger: ${this.msg(e)}`);
    }
  }

  /** Takes refunded money back from the organization (negative line). */
  async recordRefund(paymentId: string): Promise<void> {
    const income = (await this.ledgerModel.findOne({ dedupeKey: `income:${paymentId}` }).lean().exec()) as Lean | null;
    if (!income) return;
    const payment = (await this.connection.collection("payments").findOne({ id: paymentId })) as Lean | null;
    if (!payment) return;
    const refundedCharged = toCents(Number(payment.refundedAmount ?? 0));
    const chargedTotal = toCents(Number(payment.chargedAmount ?? 0));
    const previous = (await this.ledgerModel.find({ paymentId, kind: "refund" }).lean().exec()) as Lean[];
    const already = previous.reduce<{ grossCents: number; feeCents: number; netCents: number }>(
      (a, r) => ({ grossCents: a.grossCents + r.grossCents, feeCents: a.feeCents + r.feeCents, netCents: a.netCents + r.netCents }),
      { grossCents: 0, feeCents: 0, netCents: 0 },
    );
    const add = refundReversal(
      { grossCents: Number(income.grossCents), feeCents: Number(income.feeCents), netCents: Number(income.netCents) },
      refundedCharged,
      chargedTotal,
      already,
    );
    if (add.netCents === 0 && add.grossCents === 0) return;
    try {
      await this.ledgerModel.create({
        organizationId: income.organizationId,
        kind: "refund",
        sourceType: income.sourceType,
        sourceId: income.sourceId,
        paymentId,
        dedupeKey: `refund:${paymentId}:${refundedCharged}`,
        stripeMode: income.stripeMode,
        currency: income.currency,
        grossCents: add.grossCents,
        feeCents: add.feeCents,
        coveredFeeCents: 0,
        stripeFeeCents: 0,
        netCents: add.netCents,
        feeRule: income.feeRule ?? {},
        status: "pending",
        availableAt: new Date(),
        description: `Refund — ${String(income.description ?? "").slice(0, 180)}`,
      });
    } catch (e) {
      if ((e as { code?: number })?.code === 11000) return;
      throw e;
    }
    await this.audit.record("org_refund_recorded", "organization", String(income.organizationId), "system", { paymentId, ...add });
  }

  /* ======================================================================
     Organization side: Stripe account, schedule, overview, pay out now
     ====================================================================== */

  async overview(organizationId: string, userId: string) {
    const org = await this.organization(organizationId);
    const role = await this.roleOf(org, userId);
    if (!role) throw new ForbiddenException("Only the organization's owner and administrators can see payouts.");
    const account = await this.ensureAccount(org._id);
    const config = await this.getConfig();
    const { rules, feeCurrency, override } = await this.rulesFor(org._id);
    const mode = this.mode();
    const now = new Date();

    const lines = (await this.ledgerModel
      .find({ organizationId: org._id, stripeMode: mode })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec()) as Lean[];
    const balances = await this.balances(org._id, mode, now);
    const payouts = (await this.payoutModel
      .find({ organizationId: org._id, stripeMode: mode })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec()) as Lean[];

    return {
      organization: { id: String(org._id), name: org.name },
      canManage: role === "owner",
      stripe: {
        connected: Boolean(account.stripeAccountId) && account.stripeMode === mode,
        transfersActive: Boolean(account.transfersActive),
        requirementsDue: account.requirementsDue ?? [],
      },
      schedule: account.schedule,
      minPayoutCents: account.minPayoutCents,
      minPayoutFloorCents: config.minPayoutFloorCents ?? 100,
      nextRunAt: iso(account.nextRunAt),
      lastRunAt: iso(account.lastRunAt),
      onHold: Boolean(account.onHold),
      holdReason: account.onHold ? String(account.holdReason ?? "") : "",
      fee: { ...rules, feeCurrency, custom: override },
      holdDays: config.holdDays ?? 7,
      balances,
      lines: lines.map((l) => this.lineView(l, now)),
      payouts: payouts.map((p) => this.payoutView(p)),
    };
  }

  async connect(organizationId: string, userId: string, countryInput: string) {
    const org = await this.organization(organizationId);
    await this.requireOwner(org, userId);
    const account = await this.ensureAccount(org._id);
    const mode = this.mode();
    let accountId = account.stripeMode === mode ? String(account.stripeAccountId ?? "") : "";

    if (accountId) {
      try {
        await this.stripe.v2.core.accounts.retrieve(accountId);
      } catch {
        accountId = "";
      }
    }

    if (!accountId) {
      const country = /^[A-Za-z]{2}$/.test(countryInput) ? countryInput.toLowerCase() : "us";
      const giving = (await this.connection.collection("church_giving_settings").findOne({ organizationId: org._id })) as Lean | null;
      const currency = String(giving?.currency ?? "USD").toLowerCase();
      const email = String(org.contact?.email ?? "").trim();
      const website = String(org.website ?? org.contact?.website ?? "").trim();
      const created = await this.stripe.v2.core.accounts.create(
        {
          display_name: String(org.name).slice(0, 100),
          ...(email ? { contact_email: email } : {}),
          dashboard: "express",
          identity: { country: country as never },
          defaults: {
            currency: currency as never,
            responsibilities: { fees_collector: "application", losses_collector: "application" },
            ...(/^https?:\/\//i.test(website) ? { profile: { business_url: website } } : {}),
          },
          configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
          metadata: { organizationId: String(org._id), ownerUserId: userId, kind: "organization" },
        } as never,
        { idempotencyKey: `fockis_org_connect_${mode}_${org._id}_${Math.floor(Date.now() / 60000)}` },
      );
      accountId = created.id;
      await this.accountModel
        .updateOne(
          { organizationId: org._id },
          { $set: { stripeAccountId: accountId, stripeMode: mode, transfersActive: false, requirementsDue: [] } },
        )
        .exec();
      await this.audit.record("org_stripe_account_created", "organization", String(org._id), userId, { accountId, mode, country });
    }

    const base = this.frontendUrl();
    const link = await this.stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["recipient"],
          refresh_url: `${base}/organizations/${org._id}/admin/payouts?refresh=1`,
          return_url: `${base}/organizations/${org._id}/admin/payouts?done=1`,
        },
      },
    } as never);
    return { url: (link as { url: string }).url };
  }

  /** Re-reads the Stripe account (after onboarding) and returns the overview. */
  async refreshStripe(organizationId: string, userId: string) {
    const org = await this.organization(organizationId);
    if (!(await this.roleOf(org, userId))) throw new ForbiddenException("Not allowed.");
    const account = await this.ensureAccount(org._id);
    if (account.stripeAccountId && account.stripeMode === this.mode()) {
      const status = await this.payouts.fetchAccountStatus(String(account.stripeAccountId));
      await this.accountModel
        .updateOne({ organizationId: org._id }, { $set: { transfersActive: status.transfersActive, requirementsDue: status.requirementsDue } })
        .exec();
    }
    return this.overview(organizationId, userId);
  }

  async dashboardLink(organizationId: string, userId: string) {
    const org = await this.organization(organizationId);
    await this.requireOwner(org, userId);
    const account = await this.ensureAccount(org._id);
    if (!account.stripeAccountId || account.stripeMode !== this.mode()) throw new BadRequestException("Connect a Stripe account first.");
    const link = await this.stripe.accounts.createLoginLink(String(account.stripeAccountId));
    return { url: link.url };
  }

  async saveSchedule(organizationId: string, userId: string, input: Lean) {
    const org = await this.organization(organizationId);
    await this.requireOwner(org, userId);
    const config = await this.getConfig();
    const interval = String(input.interval ?? "");
    if (!["manual", "daily", "weekly", "monthly"].includes(interval)) throw new BadRequestException("Choose how often to be paid.");
    const schedule: OrgSchedule = {
      interval: interval as OrgSchedule["interval"],
      weeklyDay: this.intIn(input.weeklyDay ?? 1, 0, 6, "Day of the week"),
      monthlyDay: this.intIn(input.monthlyDay ?? 1, 1, 28, "Day of the month"),
    };
    const floor = Number(config.minPayoutFloorCents ?? 100);
    const minPayoutCents = this.intIn(input.minPayoutCents ?? floor, floor, 100_000_000, "Minimum payout");
    const next = nextRunAt(schedule, new Date());
    await this.accountModel
      .updateOne({ organizationId: org._id }, { $set: { schedule, minPayoutCents, nextRunAt: next } }, { upsert: true })
      .exec();
    await this.audit.record("org_payout_schedule_updated", "organization", String(org._id), userId, { schedule, minPayoutCents });
    return this.overview(organizationId, userId);
  }

  async payoutNow(organizationId: string, userId: string) {
    const org = await this.organization(organizationId);
    await this.requireOwner(org, userId);
    const results = await this.runPayout(String(org._id), "manual", userId);
    return { results, overview: await this.overview(organizationId, userId) };
  }

  /* ======================================================================
     Paying an organization
     ====================================================================== */

  /**
   * Sends everything payable (per currency) to the organization's Stripe
   * account. Returns one result per currency.
   */
  async runPayout(organizationId: string, trigger: "schedule" | "manual", actorId: string) {
    const orgId = this.oid(organizationId);
    const mode = this.mode();
    const now = new Date();

    const locked = (await this.accountModel
      .findOneAndUpdate(
        { organizationId: orgId, $or: [{ runLockUntil: null }, { runLockUntil: { $lt: now } }] },
        { $set: { runLockUntil: new Date(now.getTime() + RUN_LOCK_MS) } },
        { new: true },
      )
      .lean()
      .exec()) as Lean | null;
    if (!locked) return [{ status: "busy", message: "A payout is already running for this organization." }];

    const results: Lean[] = [];
    try {
      const config = await this.getConfig();
      if (locked.onHold) return [{ status: "on_hold", message: "Payouts are on hold for this organization." }];
      if (!locked.stripeAccountId || locked.stripeMode !== mode) {
        return [{ status: "not_connected", message: "Connect a Stripe account to receive payouts." }];
      }
      const status = await this.payouts.fetchAccountStatus(String(locked.stripeAccountId));
      await this.accountModel
        .updateOne({ organizationId: orgId }, { $set: { transfersActive: status.transfersActive, requirementsDue: status.requirementsDue } })
        .exec();
      if (!status.transfersActive) {
        return [{ status: "not_ready", message: "Finish setting up the Stripe account to receive payouts." }];
      }

      const payable = (await this.ledgerModel
        .find({ organizationId: orgId, stripeMode: mode, status: "pending", payoutId: null, availableAt: { $lte: now } })
        .select("_id currency netCents")
        .lean()
        .exec()) as Lean[];
      const byCurrency = new Map<string, Lean[]>();
      for (const l of payable) byCurrency.set(l.currency, [...(byCurrency.get(l.currency) ?? []), l]);
      if (byCurrency.size === 0) results.push({ status: "nothing_to_pay", message: "Nothing is ready to be paid out yet." });

      const minimum = trigger === "manual" ? Math.max(1, Number(config.minPayoutFloorCents ?? 100)) : Number(locked.minPayoutCents ?? 0);
      for (const [currency, entries] of byCurrency) {
        const total = entries.reduce((s, l) => s + Number(l.netCents), 0);
        if (total < minimum) {
          results.push({ status: "below_minimum", currency, amountCents: total, message: `Waiting until at least ${fromCents(minimum).toFixed(2)} ${currency.toUpperCase()} is ready.` });
          continue;
        }
        results.push(await this.payCurrency(orgId, mode, currency, entries.map((l) => l._id), String(locked.stripeAccountId), trigger, actorId));
      }
      return results;
    } finally {
      const after = new Date();
      const fresh = (await this.accountModel.findOne({ organizationId: orgId }).select("schedule").lean().exec()) as Lean | null;
      const set: Lean = { runLockUntil: null, lastRunAt: after };
      if (trigger === "schedule" && fresh?.schedule) set.nextRunAt = nextRunAt(fresh.schedule as OrgSchedule, after);
      await this.accountModel.updateOne({ organizationId: orgId }, { $set: set }).exec();
    }
  }

  private async payCurrency(
    orgId: Types.ObjectId,
    mode: StripeMode,
    currency: string,
    entryIds: Types.ObjectId[],
    destination: string,
    trigger: "schedule" | "manual",
    actorId: string,
  ): Promise<Lean> {
    const payout = await this.payoutModel.create({
      organizationId: orgId,
      stripeMode: mode,
      currency,
      amountCents: 0,
      status: "processing",
      trigger,
      requestedBy: actorId,
      stripeAccountId: destination,
    });

    // Claim the lines for this payout (lines claimed by anyone else are skipped).
    await this.ledgerModel
      .updateMany({ _id: { $in: entryIds }, status: "pending", payoutId: null }, { $set: { status: "in_payout", payoutId: payout._id } })
      .exec();
    const claimed = (await this.ledgerModel.find({ payoutId: payout._id }).lean().exec()) as Lean[];
    const amountCents = claimed.reduce((s, l) => s + Number(l.netCents), 0);
    const grossCents = claimed.reduce((s, l) => s + Number(l.grossCents), 0);
    const feeCents = claimed.reduce((s, l) => s + Number(l.feeCents), 0);

    if (amountCents <= 0) {
      await this.release(payout._id, "Nothing to pay after refunds.");
      return { status: "nothing_to_pay", currency };
    }
    await this.payoutModel.updateOne({ _id: payout._id }, { $set: { amountCents, grossCents, feeCents, entryCount: claimed.length } }).exec();

    try {
      const transfer = await this.stripe.transfers.create(
        {
          amount: amountCents,
          currency,
          destination,
          transfer_group: `orgpayout_${payout._id}`,
          description: `Fockis payout ${String(payout._id)}`,
          metadata: { organizationId: String(orgId), orgPayoutId: String(payout._id), trigger, entryCount: String(claimed.length) },
        },
        { idempotencyKey: `org_payout_${payout._id}` },
      );
      await this.markPaid(payout._id, transfer.id);
      await this.audit.record("org_payout_sent", "organization", String(orgId), actorId, {
        payoutId: String(payout._id),
        transferId: transfer.id,
        currency,
        amountCents,
        feeCents,
        trigger,
      });
      void this.notifyOwner(orgId, amountCents, currency);
      return { status: "paid", currency, amountCents, payoutId: String(payout._id) };
    } catch (e) {
      const message = this.msg(e).slice(0, 500);
      await this.release(payout._id, message);
      await this.audit.record("org_payout_failed", "organization", String(orgId), actorId, { payoutId: String(payout._id), currency, amountCents, message });
      this.logger.warn(`Payout ${payout._id} for organization ${orgId} failed: ${message}`);
      return { status: "failed", currency, amountCents, message: "Stripe could not send this payout. It will be tried again." };
    }
  }

  private async markPaid(payoutId: Types.ObjectId, transferId: string) {
    await this.payoutModel.updateOne({ _id: payoutId }, { $set: { status: "paid", stripeTransferId: transferId, paidAt: new Date(), failureMessage: "" } }).exec();
    await this.ledgerModel.updateMany({ payoutId }, { $set: { status: "paid" } }).exec();
  }

  /** Payout failed: its lines go back to "pending" for the next run. */
  private async release(payoutId: Types.ObjectId, message: string) {
    await this.ledgerModel.updateMany({ payoutId, status: "in_payout" }, { $set: { status: "pending", payoutId: null } }).exec();
    await this.payoutModel.updateOne({ _id: payoutId }, { $set: { status: "failed", failureMessage: message } }).exec();
  }

  /** Payouts left "processing" (e.g. the API restarted): finish or undo them using Stripe as the source of truth. */
  async reconcileStuck(now = new Date()) {
    const stuck = (await this.payoutModel
      .find({ stripeMode: this.mode(), status: "processing", createdAt: { $lt: new Date(now.getTime() - STUCK_AFTER_MS) } })
      .limit(20)
      .lean()
      .exec()) as Lean[];
    for (const p of stuck) {
      try {
        const found = await this.stripe.transfers.list({ transfer_group: `orgpayout_${p._id}`, limit: 1 });
        if (found.data[0]) {
          await this.markPaid(p._id, found.data[0].id);
          await this.audit.record("org_payout_reconciled", "organization", String(p.organizationId), "system", { payoutId: String(p._id), transferId: found.data[0].id });
        } else {
          await this.release(p._id, "Interrupted before the transfer was created; will be retried.");
        }
      } catch (e) {
        this.logger.warn(`Could not reconcile payout ${p._id}: ${this.msg(e)}`);
      }
    }
  }

  private async notifyOwner(orgId: Types.ObjectId, amountCents: number, currency: string) {
    if (!this.notifications) return;
    const org = (await this.connection.collection("church_organizations").findOne({ _id: orgId }, { projection: { name: 1, createdByUserId: 1 } })) as Lean | null;
    if (!org?.createdByUserId) return;
    await this.notifications
      .create({
        recipientId: String(org.createdByUserId),
        type: "SYSTEM",
        title: "Payout sent",
        message: `${fromCents(amountCents).toFixed(2)} ${currency.toUpperCase()} was sent to ${org.name}'s Stripe account.`,
        entityId: String(orgId),
        entityType: "org_payout",
        link: `/organizations/${orgId}/admin/payouts`,
      } as never)
      .catch(() => undefined);
  }

  /* ======================================================================
     Admin Center
     ====================================================================== */

  async adminList() {
    const mode = this.mode();
    const now = new Date();
    const accounts = (await this.accountModel.find({}).sort({ updatedAt: -1 }).limit(500).lean().exec()) as Lean[];
    const ids = accounts.map((a) => a.organizationId);
    const orgs = (await this.connection
      .collection("church_organizations")
      .find({ _id: { $in: ids } }, { projection: { name: 1 } })
      .toArray()) as Lean[];
    const names = new Map(orgs.map((o) => [String(o._id), String(o.name ?? "")]));
    const rows: Lean[] = [];
    for (const a of accounts) {
      rows.push({
        organizationId: String(a.organizationId),
        name: names.get(String(a.organizationId)) ?? "(deleted organization)",
        connected: Boolean(a.stripeAccountId) && a.stripeMode === mode,
        transfersActive: Boolean(a.transfersActive),
        schedule: a.schedule,
        minPayoutCents: a.minPayoutCents,
        nextRunAt: iso(a.nextRunAt),
        onHold: Boolean(a.onHold),
        holdReason: String(a.holdReason ?? ""),
        feeOverride: a.feeOverride ? this.feeOut(a.feeOverride) : null,
        balances: await this.balances(a.organizationId, mode, now),
      });
    }
    const failed = (await this.payoutModel.find({ stripeMode: mode, status: "failed" }).sort({ createdAt: -1 }).limit(20).lean().exec()) as Lean[];
    const recent = (await this.payoutModel.find({ stripeMode: mode }).sort({ createdAt: -1 }).limit(50).lean().exec()) as Lean[];
    return {
      mode,
      config: this.configView(await this.getConfig()),
      organizations: rows,
      recentPayouts: recent.map((p) => ({ ...this.payoutView(p), organizationId: String(p.organizationId), name: names.get(String(p.organizationId)) ?? "" })),
      failedPayouts: failed.length,
    };
  }

  async adminSetOrg(organizationId: string, actorId: string, input: Lean) {
    const orgId = this.oid(organizationId);
    await this.organization(organizationId);
    await this.ensureAccount(orgId);
    const set: Lean = {};
    if (input.feeOverride !== undefined) set.feeOverride = input.feeOverride === null ? null : this.feeRules(input.feeOverride);
    if (input.onHold !== undefined) {
      set.onHold = Boolean(input.onHold);
      set.holdReason = set.onHold ? String(input.holdReason ?? "").trim().slice(0, 300) : "";
      if (set.onHold && !set.holdReason) throw new BadRequestException("Give a reason for the hold.");
    }
    await this.accountModel.updateOne({ organizationId: orgId }, { $set: set }).exec();
    await this.audit.record("org_payout_admin_update", "organization", organizationId, actorId, set);
    return this.adminList();
  }

  async adminRunNow(organizationId: string, actorId: string) {
    await this.organization(organizationId);
    const results = await this.runPayout(organizationId, "manual", actorId);
    return { results };
  }

  /* ======================================================================
     Helpers
     ====================================================================== */

  get stripe(): Stripe {
    return this.payouts.stripe;
  }

  mode(): StripeMode {
    return String(process.env.STRIPE_SECRET_KEY ?? "").trim().startsWith("sk_live") ? "live" : "test";
  }

  private async balances(orgId: Types.ObjectId, mode: StripeMode, now: Date) {
    const rows = (await this.ledgerModel
      .aggregate([
        { $match: { organizationId: orgId, stripeMode: mode } },
        {
          $group: {
            _id: "$currency",
            waiting: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "pending"] }, { $gt: ["$availableAt", now] }] }, "$netCents", 0] } },
            available: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "pending"] }, { $lte: ["$availableAt", now] }] }, "$netCents", 0] } },
            inPayout: { $sum: { $cond: [{ $eq: ["$status", "in_payout"] }, "$netCents", 0] } },
            paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$netCents", 0] } },
            fees: { $sum: "$feeCents" },
            gross: { $sum: "$grossCents" },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec()) as Lean[];
    return rows.map((r) => ({
      currency: r._id,
      waitingCents: r.waiting,
      availableCents: r.available,
      inPayoutCents: r.inPayout,
      paidCents: r.paid,
      feesCents: r.fees,
      grossCents: r.gross,
    }));
  }

  private lineView(l: Lean, now: Date) {
    const state = l.status === "pending" ? (new Date(l.availableAt) > now ? "waiting" : "available") : l.status;
    return {
      id: String(l._id),
      kind: l.kind,
      description: l.description ?? "",
      currency: l.currency,
      grossCents: l.grossCents,
      feeCents: l.feeCents,
      coveredFeeCents: l.coveredFeeCents ?? 0,
      netCents: l.netCents,
      state,
      availableAt: iso(l.availableAt),
      createdAt: iso(l.createdAt),
      payoutId: l.payoutId ? String(l.payoutId) : null,
    };
  }

  private payoutView(p: Lean) {
    return {
      id: String(p._id),
      currency: p.currency,
      amountCents: p.amountCents,
      grossCents: p.grossCents ?? 0,
      feeCents: p.feeCents ?? 0,
      entryCount: p.entryCount ?? 0,
      status: p.status,
      trigger: p.trigger,
      failureMessage: p.status === "failed" ? String(p.failureMessage ?? "") : "",
      createdAt: iso(p.createdAt),
      paidAt: iso(p.paidAt),
    };
  }

  private async ensureAccount(orgId: Types.ObjectId): Promise<Lean> {
    const existing = (await this.accountModel.findOne({ organizationId: orgId }).lean().exec()) as Lean | null;
    if (existing) return existing;
    const schedule: OrgSchedule = { interval: "weekly", weeklyDay: 1, monthlyDay: 1 };
    await this.accountModel
      .updateOne(
        { organizationId: orgId },
        { $setOnInsert: { organizationId: orgId, schedule, nextRunAt: nextRunAt(schedule, new Date()) } },
        { upsert: true },
      )
      .exec();
    return (await this.accountModel.findOne({ organizationId: orgId }).lean().exec()) as Lean;
  }

  private async organization(organizationId: string): Promise<Lean> {
    const org = (await this.connection
      .collection("church_organizations")
      .findOne({ _id: this.oid(organizationId) }, { projection: { name: 1, createdByUserId: 1, contact: 1, website: 1, status: 1 } })) as Lean | null;
    if (!org) throw new NotFoundException("Organization not found.");
    return org;
  }

  /** "owner", "staff" (can view) or null. */
  private async roleOf(org: Lean, userId: string): Promise<"owner" | "staff" | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    if (org.createdByUserId && String(org.createdByUserId) === userId) return "owner";
    const m = (await this.connection.collection("church_members").findOne({
      organizationId: org._id,
      userId: new Types.ObjectId(userId),
      status: "active",
    })) as Lean | null;
    if (!m) return null;
    if (ADMIN_ROLES.includes(String(m.role)) || (Array.isArray(m.permissions) && m.permissions.includes("manage_settings"))) return "staff";
    return null;
  }

  private async requireOwner(org: Lean, userId: string) {
    if ((await this.roleOf(org, userId)) !== "owner") {
      throw new ForbiddenException("Only the organization's owner can manage payouts.");
    }
  }

  private feeRules(input: Lean): OrgFeeRuleInput {
    const percentBps = this.intIn(input?.percentBps ?? 0, 0, 5000, "Fee percentage");
    const fixedCents = this.intIn(input?.fixedCents ?? 0, 0, 100_000, "Fixed fee");
    const minFeeCents = this.intIn(input?.minFeeCents ?? 0, 0, 100_000, "Minimum fee");
    const maxRaw = input?.maxFeeCents;
    const maxFeeCents = maxRaw === null || maxRaw === undefined || maxRaw === "" ? null : this.intIn(maxRaw, 0, 10_000_000, "Maximum fee");
    if (maxFeeCents !== null && maxFeeCents < minFeeCents) throw new BadRequestException("The maximum fee can't be below the minimum fee.");
    return { percentBps, fixedCents, minFeeCents, maxFeeCents };
  }

  private feeOut(f: Lean | null | undefined): OrgFeeRuleInput {
    return {
      percentBps: Number(f?.percentBps ?? 0),
      fixedCents: Number(f?.fixedCents ?? 0),
      minFeeCents: Number(f?.minFeeCents ?? 0),
      maxFeeCents: f?.maxFeeCents === null || f?.maxFeeCents === undefined ? null : Number(f.maxFeeCents),
    };
  }

  private intIn(v: unknown, min: number, max: number, label: string): number {
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) throw new BadRequestException(`${label} must be a whole number between ${min} and ${max}.`);
    return n;
  }

  private oid(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException("Invalid organization ID.");
    return new Types.ObjectId(id);
  }

  private frontendUrl(): string {
    return (process.env.FRONTEND_URL ?? "http://localhost:5173").trim().replace(/\/+$/, "");
  }

  private msg(e: unknown) {
    return e instanceof Error ? e.message : String(e);
  }
}
