import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { AcademyInstitution, type InstitutionBillingEntry, type InstitutionDocument } from "../schemas/institution.schema";
// One price list for every Fockis domain (shared with Organization Identity).
import { DomainPricingService } from "../../../organization-identity/billing/domain-pricing.service";
import type { FockisDomainPricing, FockisDomainPricingDocument } from "../../../organization-identity/billing/fockis-domain-pricing.schema";
// Existing Fockis payment records — read-only here (no change to the payment system).
import { Payment } from "../../../payments/schemas/payment.schema";

/** Same purpose Academy class purchases use in the universal payment system. */
export const DOMAIN_PAYMENT_PURPOSE = "other";

export type BillingState =
  | "free" // charging is off, or this type costs 0
  | "exempt" // Fockis admin waived the fee
  | "paid" // one-time fee paid
  | "active" // paid until a date in the future
  | "grace" // payment is due; the domain still works until graceEndsAt
  | "unpaid" // approved but never paid — domain not active yet
  | "expired" // lapsed past the grace period — domain paused
  | "not_approved"; // still in review (nothing to pay yet)

export interface BillingInfo {
  state: BillingState;
  /** Domain features work (catalog, joins, new classes, new students). */
  active: boolean;
  /** The organization should pay now (button shown). */
  canPay: boolean;
  price: number;
  currency: string;
  periodMonths: number;
  graceDays: number;
  paidUntil: string | null;
  graceEndsAt: string | null;
  /** Shown when paidUntil is near. */
  renewSoon: boolean;
  note: string;
}

type InstLike = Pick<AcademyInstitution, "type" | "status" | "paidUntil" | "paidForever" | "billingExempt" | "approvedAt" | "reviewedAt"> & {
  _id: Types.ObjectId;
  billing?: InstitutionBillingEntry[];
  createdAt?: Date;
};

const DAY = 86_400_000;

function addMonths(d: Date, months: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}

function periodLabel(months: number) {
  if (months === 0) return "one-time";
  if (months === 1) return "1 month";
  if (months === 12) return "1 year";
  if (months % 12 === 0) return `${months / 12} years`;
  return `${months} months`;
}

/**
 * Fees for Fockis domains (<name>.fockis.com).
 *
 *   Organization registers → Fockis admin approves → organization pays → domain active.
 *
 * Payments go through the existing Fockis checkout (/payments/create → Stripe →
 * /payments/confirm). This service only prices the domain, hands the checkout a
 * reference that ties the payment to the organization and the period, and then
 * reads the paid record to extend the domain. It never writes payment records.
 */
@Injectable()
export class DomainBillingService {
  private readonly logger = new Logger(DomainBillingService.name);
  private cache: { at: number; ids: Set<string> } | null = null;

  constructor(
    @InjectModel(AcademyInstitution.name) private readonly instModel: Model<AcademyInstitution>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    private readonly prices: DomainPricingService,
  ) {
    this.prices.onChange(() => (this.cache = null));
  }

  // ======================================================================
  // PRICING (Fockis admins)
  // ======================================================================

  /** The shared Fockis domain price list (Admin Center → Domains → Pricing). */
  pricing(): Promise<FockisDomainPricingDocument> {
    return this.prices.pricing();
  }

  /** What schools see before they register / pay. */
  publicPricing() {
    return this.prices.publicView();
  }

  // ======================================================================
  // STATE
  // ======================================================================

  priceFor(p: Pick<FockisDomainPricing, "prices">, type?: string) {
    const v = p.prices?.[type ?? "other"];
    return Number(v ?? p.prices?.other ?? 0) || 0;
  }

  compute(inst: InstLike, p: FockisDomainPricing, now = new Date()): BillingInfo {
    const price = this.priceFor(p, inst.type);
    const base = {
      price,
      currency: p.currency,
      periodMonths: p.periodMonths,
      graceDays: p.graceDays,
      paidUntil: inst.paidUntil ? inst.paidUntil.toISOString() : null,
      graceEndsAt: null as string | null,
      renewSoon: false,
      note: p.note ?? "",
    };
    const out = (state: BillingState, active: boolean, canPay: boolean, extra: Partial<BillingInfo> = {}): BillingInfo => ({ ...base, state, active, canPay, ...extra });

    if (inst.status !== "approved") return out("not_approved", false, false);
    if (!p.enabled || price <= 0) return out("free", true, false);
    if (inst.billingExempt) return out("exempt", true, false);
    if (inst.paidForever) return out("paid", true, false);

    const grace = p.graceDays * DAY;
    if (inst.paidUntil) {
      const until = inst.paidUntil.getTime();
      if (now.getTime() <= until) {
        // Renewal opens 30 days (or a quarter of a short period) before the end.
        const window = Math.min(30 * DAY, Math.max(3 * DAY, (p.periodMonths || 12) * 30 * DAY * 0.25));
        const renewSoon = until - now.getTime() <= window;
        return out("active", true, renewSoon && p.periodMonths > 0, { renewSoon });
      }
      const ends = new Date(until + grace);
      if (now <= ends) return out("grace", true, true, { graceEndsAt: ends.toISOString() });
      return out("expired", false, true, { graceEndsAt: ends.toISOString() });
    }

    // Never paid. Organizations approved before charging was switched on keep
    // working for the grace period; new ones pay to switch the domain on.
    const approvedAt = inst.approvedAt ?? inst.reviewedAt ?? inst.createdAt;
    if (p.enabledAt && approvedAt && approvedAt < p.enabledAt) {
      const ends = new Date(p.enabledAt.getTime() + grace);
      if (now <= ends) return out("grace", true, true, { graceEndsAt: ends.toISOString() });
      return out("expired", false, true, { graceEndsAt: ends.toISOString() });
    }
    return out("unpaid", false, true);
  }

  async infoFor(inst: InstLike) {
    return this.compute(inst, await this.pricing());
  }

  async isActive(inst: InstLike) {
    return (await this.infoFor(inst)).active;
  }

  /** Throws when the organization's domain isn't paid (used before creating students, classes…). */
  async assertActive(inst: InstLike, what = "do this") {
    const info = await this.infoFor(inst);
    if (info.active || info.state === "not_approved") return info;
    throw new ForbiddenException(
      info.state === "unpaid"
        ? `Your school is approved. Pay for your Fockis domain to ${what}.`
        : `Your Fockis domain has expired. Renew it to ${what}.`,
    );
  }

  /** Approved organizations whose domain is paused (unpaid / expired). Cached for a minute. */
  async inactiveIds(): Promise<Set<string>> {
    if (this.cache && Date.now() - this.cache.at < 60_000) return this.cache.ids;
    const p = await this.pricing();
    const ids = new Set<string>();
    if (p.enabled) {
      const list = await this.instModel
        .find({ status: "approved", billingExempt: { $ne: true }, paidForever: { $ne: true } }, { type: 1, status: 1, paidUntil: 1, paidForever: 1, billingExempt: 1, approvedAt: 1, reviewedAt: 1, createdAt: 1 })
        .lean()
        .exec();
      const now = new Date();
      for (const i of list) if (!this.compute(i as unknown as InstLike, p, now).active) ids.add(String(i._id));
    }
    this.cache = { at: Date.now(), ids };
    return ids;
  }

  async inactiveObjectIds() {
    return [...(await this.inactiveIds())].map((id) => new Types.ObjectId(id));
  }

  // ======================================================================
  // PAYING (through the existing Fockis checkout)
  // ======================================================================

  /** Ties one payment to one organization and one billing period. */
  reference(inst: InstLike) {
    const paid = (inst.billing ?? []).filter((b) => b.method === "stripe").length;
    return `academy-domain:${String(inst._id)}:${paid + 1}`;
  }

  async checkoutInfo(inst: InstitutionDocument & { name: string; slug: string }, academyUserId: string) {
    const p = await this.pricing();
    const info = this.compute(inst, p);
    if (info.state === "not_approved") throw new BadRequestException("Fockis Academy reviews your registration first. You can pay once it is approved.");
    if (!info.canPay) throw new BadRequestException(info.state === "active" ? "Your domain is paid. You can renew closer to the end date." : "There is nothing to pay for this domain.");
    return {
      purpose: DOMAIN_PAYMENT_PURPOSE,
      referenceId: this.reference(inst),
      amount: info.price,
      currency: info.currency,
      periodMonths: p.periodMonths,
      periodLabel: periodLabel(p.periodMonths),
      title: `${inst.slug}.fockis.com`,
      organization: inst.name,
      type: inst.type,
      renewal: !!inst.paidUntil,
      note: p.note ?? "",
      metadata: {
        source: "fockis-academy-domain",
        academyInstitution: String(inst._id),
        academyUser: academyUserId,
      },
    };
  }

  /** After the existing checkout succeeded: verify the paid record and extend the domain. */
  async claim(inst: InstitutionDocument, paymentIntentId: string, byName: string) {
    const intent = String(paymentIntentId || "").trim();
    if (!intent) throw new BadRequestException("Missing payment reference.");
    if ((inst.billing ?? []).some((b) => b.paymentIntentId === intent)) return this.infoFor(inst);
    const payment = await this.paymentModel.findOne({ stripePaymentIntentId: intent }).lean().exec();
    if (!payment) throw new NotFoundException("Payment not found.");
    await this.apply(inst, payment, byName);
    return this.infoFor(inst);
  }

  /** Picks up a payment whose page was closed before it could be claimed. */
  async claimPending(inst: InstitutionDocument) {
    if (inst.status !== "approved") return false;
    const payment = await this.paymentModel.findOne({ referenceId: this.reference(inst), status: "paid" }).sort({ paidAt: -1 }).lean().exec();
    if (!payment) return false;
    try {
      await this.apply(inst, payment, "Automatic");
      return true;
    } catch (e) {
      this.logger.warn(`Domain payment for ${String(inst._id)} not applied: ${e instanceof Error ? e.message : e}`);
      return false;
    }
  }

  private async apply(inst: InstitutionDocument, payment: Payment, byName: string) {
    const p = await this.pricing();
    const ref = this.reference(inst);
    if (payment.referenceId !== ref) throw new ForbiddenException("This payment was made for a different organization or period.");
    if (payment.status !== "paid") throw new BadRequestException("The payment has not completed yet.");
    if (payment.purpose !== DOMAIN_PAYMENT_PURPOSE) throw new BadRequestException("Unexpected payment type.");
    const currency = String(payment.baseCurrency).toUpperCase();
    if (currency !== p.currency) throw new BadRequestException("Payment currency does not match the domain price.");
    const price = this.priceFor(p, inst.type);
    if (Number(payment.baseAmount) + 0.001 < price) throw new BadRequestException("Payment amount is lower than the domain price.");
    const intent = payment.stripePaymentIntentId;
    if (!intent) throw new BadRequestException("Payment is missing its Stripe reference.");
    const used = await this.instModel.exists({ "billing.paymentIntentId": intent });
    if (used) throw new ConflictException("This payment has already been used.");

    const now = new Date();
    const from = inst.paidUntil && inst.paidUntil > now ? inst.paidUntil : now;
    const entry: InstitutionBillingEntry = {
      method: "stripe",
      amount: Number(payment.baseAmount),
      currency,
      from,
      paymentIntentId: intent,
      paymentId: payment.id,
      referenceId: ref,
      byName,
      at: now,
    };
    if (p.periodMonths === 0) {
      inst.paidForever = true;
    } else {
      entry.to = addMonths(from, p.periodMonths);
      inst.paidUntil = entry.to;
    }
    inst.billing = [...(inst.billing ?? []), entry];
    inst.markModified("billing");
    await inst.save();
    this.cache = null;
    this.logger.log(`Domain ${inst.slug} paid ${currency} ${payment.baseAmount} (${intent})`);
  }

  // ======================================================================
  // ADMIN OVERRIDES (cash / bank payments, waivers)
  // ======================================================================

  async adminAction(
    id: string,
    body: { action: "exempt" | "unexempt" | "set_paid_until" | "clear_paid"; until?: string; amount?: number; note?: string },
    byName: string,
  ) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Institution not found.");
    const inst = await this.instModel.findById(id).exec();
    if (!inst) throw new NotFoundException("Institution not found.");
    const p = await this.pricing();
    const note = String(body.note ?? "").trim().slice(0, 500) || undefined;
    const now = new Date();
    const push = (e: InstitutionBillingEntry) => {
      inst.billing = [...(inst.billing ?? []), e];
      inst.markModified("billing");
    };

    switch (body.action) {
      case "exempt":
        if (!note || note.length < 3) throw new BadRequestException("Say why this organization doesn't pay.");
        inst.billingExempt = true;
        inst.billingExemptReason = note;
        push({ method: "exempt", note, byName, at: now });
        break;
      case "unexempt":
        inst.billingExempt = false;
        inst.billingExemptReason = undefined;
        push({ method: "unexempt", note, byName, at: now });
        break;
      case "set_paid_until": {
        const until = body.until ? new Date(body.until) : null;
        if (!until || Number.isNaN(until.getTime())) throw new BadRequestException("Choose the date the domain is paid until.");
        if (until.getTime() < now.getTime() - DAY) throw new BadRequestException("The paid-until date must be today or later.");
        const amount = body.amount !== undefined && body.amount !== null ? Math.round(Number(body.amount) * 100) / 100 : undefined;
        if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) throw new BadRequestException("Amount must be 0 or more.");
        push({ method: "manual", amount, currency: p.currency, from: inst.paidUntil && inst.paidUntil > now ? inst.paidUntil : now, to: until, note, byName, at: now });
        inst.paidUntil = until;
        break;
      }
      case "clear_paid":
        if (!note || note.length < 3) throw new BadRequestException("Say why the payment is cleared.");
        push({ method: "manual", note: `Paid period cleared — ${note}`, byName, at: now });
        inst.paidUntil = undefined;
        inst.paidForever = false;
        break;
      default:
        throw new BadRequestException("Unknown action.");
    }
    await inst.save();
    this.cache = null;
    return this.adminView(inst);
  }

  /** Billing block for the Admin Center school page. */
  async adminView(inst: InstitutionDocument | (InstLike & { billingExemptReason?: string })) {
    const obj = "toObject" in inst ? (inst.toObject() as unknown as InstLike & { billingExemptReason?: string }) : inst;
    const info = await this.infoFor(obj);
    return {
      ...info,
      exempt: !!obj.billingExempt,
      exemptReason: obj.billingExemptReason ?? "",
      paidForever: !!obj.paidForever,
      entries: [...(obj.billing ?? [])].reverse(),
    };
  }
}
