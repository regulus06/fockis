import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

// Existing Fockis payment records — read-only here (the payment system is not changed).
import { Payment } from "../../payments/schemas/payment.schema";
import { DomainPricingService } from "../billing/domain-pricing.service";
import type { FockisDomainPricing } from "../billing/fockis-domain-pricing.schema";
import { DOMAIN_NAME_PATTERN, RESERVED_DOMAIN_NAMES, addMonths, periodLabel } from "../billing/domain-price-types";
import type { DomainBillingEntry, DomainBillingQuote } from "../billing/organization-domain-billing.schema";
import { PersonalDomain, type PersonalDomainDocument } from "./personal-domain.schema";

export const PERSONAL_DOMAIN_PAYMENT_PURPOSE = "other";
export const FOCKIS_ROOT = "fockis.com";

const DAY = 86_400_000;
/** An unpaid reservation keeps the name this long. */
const RESERVATION_DAYS = 7;
/** A lapsed personal domain is given back this long after it paused. */
const RELEASE_AFTER_EXPIRED_DAYS = 90;

export type PersonalDomainState = "free" | "exempt" | "paid" | "active" | "grace" | "unpaid" | "expired";

export interface PersonalDomainInfo {
  domain: string;
  name: string;
  state: PersonalDomainState;
  /** Shown on the profile. */
  active: boolean;
  price: number;
  currency: string;
  periodMonths: number;
  periodLabel: string;
  graceDays: number;
  paidUntil: string | null;
  graceEndsAt: string | null;
  /** Unpaid reservation is kept until this date. */
  reservedUntil: string | null;
  renewSoon: boolean;
  canPay: boolean;
  note: string;
  createdAt: string | null;
}

type Rec = Pick<PersonalDomain, "name" | "domain" | "paidUntil" | "paidForever" | "exempt"> & { reservedAt?: Date; createdAt?: Date; entries?: DomainBillingEntry[] };

/**
 * Personal Fockis domains (john.fockis.com) for anyone — paid by the person,
 * at the price set in Admin Center → Domains → Domain Pricing.
 *
 *   Pick a name (reserved for 7 days) → pay through the existing Fockis
 *   checkout → the domain is active and shows on the person's profile.
 *
 * One name can belong to only one person, organization or Academy school.
 */
@Injectable()
export class PersonalDomainService {
  private readonly logger = new Logger(PersonalDomainService.name);

  constructor(
    @InjectModel(PersonalDomain.name) private readonly model: Model<PersonalDomain>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    private readonly pricing: DomainPricingService,
  ) {}

  private oid(id: string, what = "id") {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${what}.`);
    return new Types.ObjectId(id);
  }

  // ======================================================================
  // STATE
  // ======================================================================

  compute(r: Rec, p: FockisDomainPricing, now = new Date()): PersonalDomainInfo {
    const price = Number(p.personalDomainPrice ?? 0) || 0;
    const grace = p.graceDays * DAY;
    const info: PersonalDomainInfo = {
      domain: r.domain,
      name: r.name,
      state: "free",
      active: true,
      price,
      currency: p.currency,
      periodMonths: p.periodMonths,
      periodLabel: periodLabel(p.periodMonths),
      graceDays: p.graceDays,
      paidUntil: r.paidUntil ? new Date(r.paidUntil).toISOString() : null,
      graceEndsAt: null,
      reservedUntil: null,
      renewSoon: false,
      canPay: false,
      note: p.note ?? "",
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    };
    if (!p.enabled || price <= 0) return info;
    if (r.exempt) {
      info.state = "exempt";
      return info;
    }
    if (r.paidForever) {
      info.state = "paid";
      return info;
    }
    if (r.paidUntil) {
      const until = new Date(r.paidUntil).getTime();
      if (now.getTime() <= until) {
        info.state = "active";
        const window = Math.min(30 * DAY, Math.max(3 * DAY, (p.periodMonths || 12) * 30 * DAY * 0.25));
        info.renewSoon = p.periodMonths > 0 && until - now.getTime() <= window;
        info.canPay = info.renewSoon;
        return info;
      }
      const ends = new Date(until + grace);
      info.graceEndsAt = ends.toISOString();
      info.state = now <= ends ? "grace" : "expired";
      info.active = info.state === "grace";
      info.canPay = true;
      return info;
    }
    // Never paid. Domains taken before charging started keep working for the grace period.
    const created = r.createdAt ? new Date(r.createdAt) : now;
    if (p.enabledAt && created < new Date(p.enabledAt)) {
      const ends = new Date(new Date(p.enabledAt).getTime() + grace);
      info.graceEndsAt = ends.toISOString();
      info.state = now <= ends ? "grace" : "expired";
      info.active = info.state === "grace";
      info.canPay = true;
      return info;
    }
    info.state = "unpaid";
    info.active = false;
    info.canPay = true;
    const reserved = r.reservedAt ? new Date(r.reservedAt) : created;
    info.reservedUntil = new Date(reserved.getTime() + RESERVATION_DAYS * DAY).toISOString();
    return info;
  }

  /** Whether someone else may take this record's name now. */
  private isReleased(r: Rec, p: FockisDomainPricing, now = new Date()) {
    const i = this.compute(r, p, now);
    if (i.state === "unpaid" && i.reservedUntil) return new Date(i.reservedUntil) < now;
    if (i.state === "expired" && i.graceEndsAt) return new Date(i.graceEndsAt).getTime() + RELEASE_AFTER_EXPIRED_DAYS * DAY < now.getTime();
    return false;
  }

  // ======================================================================
  // NAMES (one name, one owner across people, organizations and schools)
  // ======================================================================

  normalize(raw: string) {
    return String(raw ?? "")
      .trim()
      .toLowerCase()
      .replace(/\.fockis\.com$/, "");
  }

  async availability(raw: string, forUserId?: string) {
    const name = this.normalize(raw);
    const domain = `${name}.${FOCKIS_ROOT}`;
    const no = (reason: string) => ({ name, domain, available: false, reason });
    if (!DOMAIN_NAME_PATTERN.test(name)) return no("Use 3–30 lowercase letters, numbers or dashes.");
    if (RESERVED_DOMAIN_NAMES.has(name)) return no("That name is reserved by Fockis.");
    const db = this.model.db;
    const [org, school, mine] = await Promise.all([
      db.collection("organization_domains").findOne({ domain }, { projection: { _id: 1 } }),
      db.collection("academy_institutions").findOne({ slug: name }, { projection: { _id: 1 } }),
      this.model.findOne({ name }).lean().exec(),
    ]);
    if (org) return no("Already taken by a Fockis organization.");
    if (school) return no("Already taken by a Fockis Academy school.");
    if (mine && String(mine.userId) !== String(forUserId ?? "") && !this.isReleased(mine, await this.pricing.pricing())) return no("Already taken.");
    return { name, domain, available: true, reason: "" };
  }

  // ======================================================================
  // THE PERSON'S OWN DOMAIN
  // ======================================================================

  async mine(userId: string) {
    const uid = this.oid(userId, "user");
    const r = await this.model.findOne({ userId: uid }).exec();
    if (r) await this.claimPending(r);
    const fresh = r ? await this.model.findById(r._id).lean().exec() : null;
    const p = await this.pricing.pricing();
    return {
      domain: fresh ? this.compute(fresh, p) : null,
      payments: (fresh?.entries ?? [])
        .filter((e) => e.method === "stripe" || e.method === "manual")
        .map((e) => ({ method: e.method, amount: e.amount, currency: e.currency, from: e.from, to: e.to, at: e.at }))
        .reverse(),
      pricing: {
        enabled: p.enabled,
        price: p.enabled ? Number(p.personalDomainPrice ?? 0) : 0,
        currency: p.currency,
        periodMonths: p.periodMonths,
        periodLabel: periodLabel(p.periodMonths),
        graceDays: p.graceDays,
        reservationDays: RESERVATION_DAYS,
        note: p.note ?? "",
      },
    };
  }

  async reserve(userId: string, rawName: string) {
    const uid = this.oid(userId, "user");
    const existing = await this.model.findOne({ userId: uid }).exec();
    const p = await this.pricing.pricing();
    if (existing) {
      const info = this.compute(existing, p);
      // Someone with an unpaid reservation may switch to another name.
      if (info.state !== "unpaid") throw new ConflictException(`You already have ${existing.domain}.`);
    }
    const check = await this.availability(rawName, userId);
    if (!check.available) throw new BadRequestException(check.reason);

    // A stale reservation of this name by someone else is given back.
    const stale = await this.model.findOne({ name: check.name }).exec();
    if (stale && String(stale.userId) !== userId) await stale.deleteOne();

    if (existing) {
      existing.name = check.name;
      existing.domain = check.domain;
      existing.reservedAt = new Date();
      existing.quotes = [];
      existing.markModified("quotes");
      await existing.save();
    } else {
      try {
        await this.model.create({ userId: uid, name: check.name, domain: check.domain, reservedAt: new Date(), quotes: [], entries: [] });
      } catch {
        throw new ConflictException("That name was just taken. Try another one.");
      }
    }
    this.logger.log(`Personal domain ${check.domain} reserved by ${userId}`);
    return this.mine(userId);
  }

  /** Give the name back (an unpaid reservation, or a domain the person no longer wants). */
  async release(userId: string) {
    const r = await this.model.findOne({ userId: this.oid(userId, "user") }).exec();
    if (!r) throw new NotFoundException("You don't have a Fockis domain.");
    await r.deleteOne();
    this.logger.log(`Personal domain ${r.domain} released by ${userId}`);
    return this.mine(userId);
  }

  async checkout(userId: string) {
    const r = await this.model.findOne({ userId: this.oid(userId, "user") }).exec();
    if (!r) throw new NotFoundException("Choose a name first.");
    await this.claimPending(r);
    const p = await this.pricing.pricing();
    const info = this.compute(r, p);
    if (!info.canPay) throw new BadRequestException(info.state === "active" ? "Your domain is paid. You can renew closer to the end date." : "There is nothing to pay right now.");
    if (info.price < 0.5) throw new BadRequestException("The amount is too small to pay by card.");
    const seq = (r.entries ?? []).filter((e) => e.method === "stripe").length + (r.quotes ?? []).length + 1;
    const quote: DomainBillingQuote = {
      referenceId: `fockis-personal-domain:${String(r._id)}:${seq}`,
      kind: "renew",
      amount: info.price,
      currency: p.currency,
      memberDomains: 0,
      periodMonths: p.periodMonths,
      createdAt: new Date(),
    };
    r.quotes = [...(r.quotes ?? []), quote].slice(-10);
    r.markModified("quotes");
    await r.save();
    return {
      purpose: PERSONAL_DOMAIN_PAYMENT_PURPOSE,
      referenceId: quote.referenceId,
      amount: quote.amount,
      currency: quote.currency,
      periodMonths: p.periodMonths,
      periodLabel: periodLabel(p.periodMonths),
      domain: r.domain,
      renewal: !!r.paidUntil || r.paidForever,
      paidUntil: info.paidUntil,
      note: p.note ?? "",
      metadata: { source: "fockis-personal-domain", personalDomainId: String(r._id), userId },
    };
  }

  async claim(userId: string, paymentIntentId: string) {
    const r = await this.model.findOne({ userId: this.oid(userId, "user") }).exec();
    if (!r) throw new NotFoundException("You don't have a Fockis domain.");
    const intent = String(paymentIntentId || "").trim();
    if (!intent) throw new BadRequestException("Missing payment reference.");
    if (!(r.entries ?? []).some((e) => e.paymentIntentId === intent)) {
      const payment = await this.paymentModel.findOne({ stripePaymentIntentId: intent }).lean().exec();
      if (!payment) throw new NotFoundException("Payment not found.");
      await this.apply(r, payment, "You");
    }
    return this.mine(userId);
  }

  private async claimPending(r: PersonalDomainDocument) {
    if (!(r.quotes ?? []).length) return;
    const payments = await this.paymentModel
      .find({ referenceId: { $in: r.quotes.map((q) => q.referenceId) }, status: "paid" })
      .sort({ paidAt: 1 })
      .lean()
      .exec();
    for (const pay of payments) {
      if ((r.entries ?? []).some((e) => e.paymentIntentId && e.paymentIntentId === pay.stripePaymentIntentId)) continue;
      try {
        await this.apply(r, pay, "Automatic");
      } catch (e) {
        this.logger.warn(`Personal domain payment for ${r.domain} not applied: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  private async apply(r: PersonalDomainDocument, payment: Payment, byName: string) {
    const quote = (r.quotes ?? []).find((q) => q.referenceId === payment.referenceId);
    if (!quote) throw new ForbiddenException("This payment was made for something else.");
    if (payment.userId && String(payment.userId) !== String(r.userId)) throw new ForbiddenException("This payment was made by another account.");
    if (payment.status !== "paid") throw new BadRequestException("The payment has not completed yet.");
    if (payment.purpose !== PERSONAL_DOMAIN_PAYMENT_PURPOSE) throw new BadRequestException("Unexpected payment type.");
    const currency = String(payment.baseCurrency).toUpperCase();
    if (currency !== quote.currency) throw new BadRequestException("Payment currency does not match the price.");
    if (Number(payment.baseAmount) + 0.001 < quote.amount) throw new BadRequestException("Payment amount is lower than the price.");
    const intent = payment.stripePaymentIntentId;
    if (!intent) throw new BadRequestException("Payment is missing its Stripe reference.");
    if (await this.model.exists({ "entries.paymentIntentId": intent })) throw new ConflictException("This payment has already been used.");

    const now = new Date();
    const from = r.paidUntil && r.paidUntil > now ? r.paidUntil : now;
    const entry: DomainBillingEntry = {
      method: "stripe",
      kind: "renew",
      amount: Number(payment.baseAmount),
      currency,
      from,
      paymentIntentId: intent,
      paymentId: payment.id,
      referenceId: quote.referenceId,
      byName,
      at: now,
    };
    if (quote.periodMonths === 0) r.paidForever = true;
    else {
      entry.to = addMonths(from, quote.periodMonths);
      r.paidUntil = entry.to;
    }
    r.quotes = (r.quotes ?? []).filter((q) => q.referenceId !== quote.referenceId);
    r.entries = [...(r.entries ?? []), entry];
    r.markModified("quotes");
    r.markModified("entries");
    await r.save();
    this.logger.log(`Personal domain ${r.domain} paid ${currency} ${payment.baseAmount} (${intent})`);
  }

  // ======================================================================
  // PUBLIC (profile)
  // ======================================================================

  /** The domain shown on someone's profile, only while it is active. */
  async forProfile(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return { domain: null };
    const r = await this.model.findOne({ userId: new Types.ObjectId(userId) }).lean().exec();
    if (!r) return { domain: null };
    const info = this.compute(r, await this.pricing.pricing());
    return { domain: info.active ? r.domain : null };
  }

  // ======================================================================
  // ADMIN CENTER
  // ======================================================================

  async adminList(q: { search?: string; state?: string; page?: number }) {
    const limit = 25;
    const page = Math.max(1, Number(q.page) || 1);
    const match: Record<string, unknown> = {};
    if (q.search?.trim()) match.name = { $regex: q.search.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") };
    const [list, p] = await Promise.all([this.model.find(match).sort({ createdAt: -1 }).limit(3000).lean().exec(), this.pricing.pricing()]);
    const users = await this.model.db
      .collection("users")
      .find({ _id: { $in: list.map((r) => r.userId) } }, { projection: { name: 1, fullName: 1, username: 1, email: 1 } })
      .toArray();
    const byId = new Map(users.map((u) => [String(u._id), u as { name?: string; fullName?: string; username?: string; email?: string }]));
    let rows = list.map((r) => {
      const info = this.compute(r, p);
      const u = byId.get(String(r.userId));
      return {
        id: String(r._id),
        userId: String(r.userId),
        userName: String(u?.name || u?.fullName || u?.username || "—"),
        userEmail: String(u?.email ?? ""),
        domain: r.domain,
        state: info.state,
        active: info.active,
        price: info.price,
        currency: info.currency,
        paidUntil: info.paidUntil,
        graceEndsAt: info.graceEndsAt,
        reservedUntil: info.reservedUntil,
        createdAt: info.createdAt,
      };
    });
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.state] = (counts[r.state] ?? 0) + 1;
    if (q.state && q.state !== "all") {
      rows = q.state === "due" ? rows.filter((r) => ["unpaid", "grace", "expired"].includes(r.state)) : q.state === "active" ? rows.filter((r) => r.state === "active" || r.state === "paid") : rows.filter((r) => r.state === q.state);
    }
    const total = rows.length;
    return { items: rows.slice((page - 1) * limit, page * limit), counts, page, total, hasMore: page * limit < total };
  }

  async adminDetail(id: string) {
    const r = await this.model.findById(this.oid(id)).exec();
    if (!r) throw new NotFoundException("Personal domain not found.");
    await this.claimPending(r);
    const fresh = (await this.model.findById(r._id).lean().exec())!;
    const u = (await this.model.db.collection("users").findOne({ _id: fresh.userId }, { projection: { name: 1, fullName: 1, username: 1, email: 1 } })) as {
      name?: string;
      fullName?: string;
      username?: string;
      email?: string;
    } | null;
    return {
      id: String(fresh._id),
      user: { id: String(fresh.userId), name: String(u?.name || u?.fullName || u?.username || "—"), email: String(u?.email ?? ""), username: String(u?.username ?? "") },
      billing: this.compute(fresh, await this.pricing.pricing()),
      exempt: !!fresh.exempt,
      exemptReason: fresh.exemptReason ?? "",
      paidForever: !!fresh.paidForever,
      entries: [...(fresh.entries ?? [])].reverse(),
    };
  }

  async adminAction(id: string, body: { action: "exempt" | "unexempt" | "set_paid_until" | "clear_paid" | "release"; until?: string; amount?: number; note?: string }, byName: string) {
    const r = await this.model.findById(this.oid(id)).exec();
    if (!r) throw new NotFoundException("Personal domain not found.");
    const p = await this.pricing.pricing();
    const note = String(body.note ?? "").trim().slice(0, 500) || undefined;
    const now = new Date();
    const push = (e: DomainBillingEntry) => {
      r.entries = [...(r.entries ?? []), e];
      r.markModified("entries");
    };
    switch (body.action) {
      case "exempt":
        if (!note || note.length < 3) throw new BadRequestException("Say why this person doesn't pay.");
        r.exempt = true;
        r.exemptReason = note;
        push({ method: "exempt", note, byName, at: now });
        break;
      case "unexempt":
        r.exempt = false;
        r.exemptReason = undefined;
        push({ method: "unexempt", note, byName, at: now });
        break;
      case "set_paid_until": {
        const until = body.until ? new Date(body.until) : null;
        if (!until || Number.isNaN(until.getTime())) throw new BadRequestException("Choose the date the domain is paid until.");
        if (until.getTime() < now.getTime() - DAY) throw new BadRequestException("The paid-until date must be today or later.");
        const amount = body.amount !== undefined && body.amount !== null ? Math.round(Number(body.amount) * 100) / 100 : undefined;
        push({ method: "manual", kind: "renew", amount, currency: p.currency, from: r.paidUntil && r.paidUntil > now ? r.paidUntil : now, to: until, note, byName, at: now });
        r.paidUntil = until;
        break;
      }
      case "clear_paid":
        if (!note || note.length < 3) throw new BadRequestException("Say why the payment is cleared.");
        push({ method: "cleared", note, byName, at: now });
        r.paidUntil = undefined;
        r.paidForever = false;
        break;
      case "release":
        if (!note || note.length < 3) throw new BadRequestException("Say why the name is taken back.");
        await r.deleteOne();
        this.logger.warn(`Personal domain ${r.domain} taken back by ${byName}: ${note}`);
        return { released: true };
      default:
        throw new BadRequestException("Unknown action.");
    }
    await r.save();
    return this.adminDetail(id);
  }
}
