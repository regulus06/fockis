import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { Organization, type OrganizationDocument } from "../../org/organizations/schemas/organization.schema";
// Existing Fockis payment records — read-only here (the payment system is not changed).
import { Payment } from "../../payments/schemas/payment.schema";
import { OrganizationDomain, OrganizationDomainType, type OrganizationDomainDocument } from "../schemas/organization-domain.schema";
import { OrganizationIdentityCommonService } from "../services/organization-identity-common.service";

import { DomainPricingService } from "./domain-pricing.service";
import type { FockisDomainPricing } from "./fockis-domain-pricing.schema";
import { DOMAIN_PRICE_TYPES, addMonths, periodLabel } from "./domain-price-types";
import {
  OrganizationDomainBilling,
  type DomainBillingEntry,
  type DomainBillingQuote,
  type OrganizationDomainBillingDocument,
} from "./organization-domain-billing.schema";

/** Same purpose other Fockis purchases use in the universal payment system. */
export const DOMAIN_PAYMENT_PURPOSE = "other";

const DAY = 86_400_000;

export type OrgDomainState =
  | "no_domain" // no base domain yet — nothing to pay
  | "free" // charging off, or this organization type's base domain is free
  | "exempt" // a Fockis admin waived the fee
  | "paid" // one-time fee paid
  | "active" // paid until a date in the future
  | "grace" // payment due; still works until graceEndsAt
  | "unpaid" // base domain reserved but not paid — not active yet
  | "expired"; // lapsed past the grace period — paused

export interface OrgDomainBillingInfo {
  organizationId: string;
  organizationType: string;
  organizationTypeLabel: string;
  baseDomain: string | null;
  baseDomainStatus: string | null;
  state: OrgDomainState;
  /** The base domain may be verified / used (member logins, new member domains…). */
  active: boolean;
  price: number;
  memberDomainPrice: number;
  currency: string;
  periodMonths: number;
  periodLabel: string;
  graceDays: number;
  paidUntil: string | null;
  graceEndsAt: string | null;
  renewSoon: boolean;
  /** Verified member domains right now. */
  memberDomainsUsed: number;
  /** Member domains paid for; null = unlimited (free or exempt). */
  memberDomainsAllowed: number | null;
  canAddMemberDomain: boolean;
  /** Show "Pay / Renew". */
  canRenew: boolean;
  /** Show "Buy more member domains". */
  canBuyMemberDomains: boolean;
  /** Amount of a renewal covering the member domains in use. */
  renewTotal: number;
  note: string;
}

type Billing = OrganizationDomainBilling & { _id?: Types.ObjectId };

/**
 * Fees for Organization Identity domains (springfieldchurch.fockis.com and its
 * member domains john.springfieldchurch.fockis.com).
 *
 *   Organization adds its base domain (Pending) → pays → domain is verified / active.
 *   Each member domain costs the member price per period (if set).
 *
 * Payments go through the existing Fockis checkout (/payments/create → Stripe →
 * /payments/confirm). This service prices the domain, gives the checkout a
 * reference, then reads the paid record to extend the domain. It never writes
 * payment records.
 */
@Injectable()
export class OrganizationDomainBillingService {
  private readonly logger = new Logger(OrganizationDomainBillingService.name);

  constructor(
    @InjectModel(OrganizationDomainBilling.name) private readonly billingModel: Model<OrganizationDomainBilling>,
    @InjectModel(OrganizationDomain.name) private readonly domainModel: Model<OrganizationDomainDocument>,
    @InjectModel(Organization.name) private readonly orgModel: Model<OrganizationDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    private readonly pricing: DomainPricingService,
    private readonly common: OrganizationIdentityCommonService,
  ) {}

  // ======================================================================
  // STATE
  // ======================================================================

  private async billingDoc(orgId: Types.ObjectId): Promise<OrganizationDomainBillingDocument> {
    const found = await this.billingModel.findOne({ organizationId: orgId }).exec();
    if (found) return found;
    try {
      return await this.billingModel.create({ organizationId: orgId, memberSlots: 0, quotes: [], entries: [] });
    } catch {
      return (await this.billingModel.findOne({ organizationId: orgId }).exec())!;
    }
  }

  private baseDomain(orgId: Types.ObjectId) {
    return this.domainModel.findOne({ organizationId: orgId, domainType: OrganizationDomainType.Organization } as never).exec();
  }

  private verifiedMembers(orgId: Types.ObjectId) {
    return this.domainModel
      .countDocuments({ organizationId: orgId, domainType: OrganizationDomainType.Member, status: this.common.domainStatusVerified() } as never)
      .exec();
  }

  compute(
    org: Pick<Organization, "organizationType"> & { _id: Types.ObjectId },
    b: Partial<Billing> | null,
    p: FockisDomainPricing,
    base: Pick<OrganizationDomain, "domain" | "status" | "verifiedAt"> | null,
    used: number,
    now = new Date(),
  ): OrgDomainBillingInfo {
    const type = String(org.organizationType ?? "other");
    const price = this.pricing.priceFor(p, type);
    const memberPrice = Number(p.memberDomainPrice ?? 0) || 0;
    const grace = p.graceDays * DAY;
    const info: OrgDomainBillingInfo = {
      organizationId: String(org._id),
      organizationType: type,
      organizationTypeLabel: DOMAIN_PRICE_TYPES.find((t) => t.key === type)?.label ?? type,
      baseDomain: base?.domain ?? null,
      baseDomainStatus: base ? String(base.status) : null,
      state: "free",
      active: true,
      price,
      memberDomainPrice: memberPrice,
      currency: p.currency,
      periodMonths: p.periodMonths,
      periodLabel: periodLabel(p.periodMonths),
      graceDays: p.graceDays,
      paidUntil: b?.paidUntil ? new Date(b.paidUntil).toISOString() : null,
      graceEndsAt: null,
      renewSoon: false,
      memberDomainsUsed: used,
      memberDomainsAllowed: null,
      canAddMemberDomain: true,
      canRenew: false,
      canBuyMemberDomains: false,
      renewTotal: 0,
      note: p.note ?? "",
    };

    const charging = p.enabled && (price > 0 || memberPrice > 0);
    if (!base) {
      info.state = "no_domain";
      return info;
    }
    if (!charging) return info;
    if (b?.exempt) {
      info.state = "exempt";
      return info;
    }

    // Is there a paid period right now?
    let periodValid = false;
    if (b?.paidForever) {
      info.state = "paid";
      periodValid = true;
    } else if (b?.paidUntil) {
      const until = new Date(b.paidUntil).getTime();
      if (now.getTime() <= until) {
        info.state = "active";
        periodValid = true;
        const window = Math.min(30 * DAY, Math.max(3 * DAY, (p.periodMonths || 12) * 30 * DAY * 0.25));
        info.renewSoon = p.periodMonths > 0 && until - now.getTime() <= window;
      } else {
        const ends = new Date(until + grace);
        info.graceEndsAt = ends.toISOString();
        info.state = now <= ends ? "grace" : "expired";
        periodValid = now <= ends;
      }
    } else {
      // Never paid. Domains verified before charging was switched on keep
      // working for the grace period; new ones pay to activate.
      const verifiedAt = base.verifiedAt ? new Date(base.verifiedAt) : null;
      if (p.enabledAt && verifiedAt && verifiedAt < new Date(p.enabledAt)) {
        const ends = new Date(new Date(p.enabledAt).getTime() + grace);
        info.graceEndsAt = ends.toISOString();
        info.state = now <= ends ? "grace" : "expired";
      } else {
        info.state = "unpaid";
      }
    }

    // A free base domain (price 0) always works; only member domains are charged.
    if (price <= 0 && !periodValid) info.state = "free";
    info.active = info.state === "free" || info.state === "paid" || info.state === "active" || info.state === "grace";

    if (memberPrice > 0) {
      const slots = periodValid ? Number(b?.memberSlots ?? 0) : 0;
      info.memberDomainsAllowed = slots;
      info.canAddMemberDomain = info.active && used < slots;
      info.canBuyMemberDomains = periodValid && (info.state === "active" || info.state === "paid");
    } else {
      info.canAddMemberDomain = info.active;
    }

    info.renewTotal = round2(price + memberPrice * used);
    info.canRenew =
      info.state === "unpaid" ||
      info.state === "expired" ||
      info.state === "grace" ||
      (info.state === "active" && info.renewSoon) ||
      // free base domain, paying only for member domains: starts a period
      (info.state === "free" && memberPrice > 0 && !periodValid);
    return info;
  }

  async info(orgId: Types.ObjectId | string): Promise<OrgDomainBillingInfo> {
    const id = typeof orgId === "string" ? this.common.toObjectId(orgId, "organizationId") : orgId;
    const [org, p, base, used, b] = await Promise.all([
      this.orgModel.findById(id).select("organizationType").lean().exec(),
      this.pricing.pricing(),
      this.baseDomain(id),
      this.verifiedMembers(id),
      this.billingModel.findOne({ organizationId: id }).lean().exec(),
    ]);
    if (!org) throw new NotFoundException("Organization not found.");
    return this.compute(org as never, b as never, p, base, used);
  }

  // ======================================================================
  // CHECKS used by Organization Identity
  // ======================================================================

  /** Before verifying the base domain. */
  async assertBaseCanBeVerified(orgId: Types.ObjectId) {
    await this.claimPending(orgId);
    const i = await this.info(orgId);
    if (i.active) return;
    throw new BadRequestException(
      i.state === "unpaid"
        ? `Pay for ${i.baseDomain ?? "your Fockis domain"} to activate it.`
        : `${i.baseDomain ?? "Your Fockis domain"} has expired. Renew it to keep using it.`,
    );
  }

  /** Before a new member domain becomes verified (member logins, manual member domains). */
  async assertCanAddMemberDomain(orgId: Types.ObjectId) {
    await this.claimPending(orgId);
    const i = await this.info(orgId);
    if (i.canAddMemberDomain) return;
    if (!i.active) {
      throw new BadRequestException(
        i.state === "unpaid" ? "Pay for your organization's Fockis domain first." : "Your organization's Fockis domain has expired. Renew it first.",
      );
    }
    throw new BadRequestException(
      `All ${i.memberDomainsAllowed ?? 0} paid member domains are in use. Buy more member domains (${i.currency} ${i.memberDomainPrice.toFixed(2)} each) in Domains.`,
    );
  }

  /** Before giving an existing domain to a new member login. */
  async assertActive(orgId: Types.ObjectId) {
    const i = await this.info(orgId);
    if (i.active || i.state === "no_domain") return;
    throw new BadRequestException("Your organization's Fockis domain isn't paid. Pay or renew it in Domains.");
  }

  // ======================================================================
  // PAYING (through the existing Fockis checkout)
  // ======================================================================

  async checkout(
    organizationId: string,
    actorUserId: string,
    body: { kind?: "renew" | "members"; memberDomains?: number },
  ) {
    await this.common.requireAdministrator(organizationId, actorUserId);
    const org = await this.common.getOrganization(organizationId);
    await this.claimPending(org._id);
    const p = await this.pricing.pricing();
    const info = await this.info(org._id);
    const b = await this.billingDoc(org._id);
    const kind = body.kind === "members" ? "members" : "renew";
    const wanted = Math.max(0, Math.min(10_000, Math.round(Number(body.memberDomains ?? 0)) || 0));

    if (!info.baseDomain) throw new BadRequestException("Add your organization's Fockis domain first.");
    let amount = 0;
    let memberDomains = 0;
    let summary = "";

    if (kind === "renew") {
      if (!info.canRenew) throw new BadRequestException(info.state === "active" ? "Your domain is paid. You can renew closer to the end date." : "There is nothing to pay right now.");
      memberDomains = info.memberDomainPrice > 0 ? Math.max(info.memberDomainsUsed, wanted) : 0;
      amount = round2(info.price + info.memberDomainPrice * memberDomains);
      summary = [
        info.price > 0 ? `${info.baseDomain}` : "",
        memberDomains > 0 ? `${memberDomains} member domain${memberDomains === 1 ? "" : "s"}` : "",
      ]
        .filter(Boolean)
        .join(" + ");
    } else {
      if (!info.canBuyMemberDomains) throw new BadRequestException("Member domains can be bought while your domain is paid.");
      if (wanted < 1) throw new BadRequestException("Choose how many member domains to add.");
      memberDomains = wanted;
      // Prorated to the end of the current period (full price for a one-time fee).
      let factor = 1;
      if (!b.paidForever && b.paidUntil && p.periodMonths > 0) {
        const end = new Date(b.paidUntil).getTime();
        const start = addMonths(new Date(b.paidUntil), -p.periodMonths).getTime();
        factor = Math.min(1, Math.max(0, (end - Date.now()) / (end - start)));
      }
      amount = round2(info.memberDomainPrice * wanted * factor);
      summary = `${wanted} more member domain${wanted === 1 ? "" : "s"}${factor < 1 ? ` (until ${new Date(b.paidUntil!).toISOString().slice(0, 10)})` : ""}`;
    }
    if (amount < 0.5) throw new BadRequestException("The amount is too small to pay by card.");

    const seq = (b.entries ?? []).filter((e) => e.method === "stripe").length + (b.quotes ?? []).length + 1;
    const quote: DomainBillingQuote = {
      referenceId: `fockis-domain:${String(org._id)}:${kind}:${seq}`,
      kind,
      amount,
      currency: p.currency,
      memberDomains,
      periodMonths: p.periodMonths,
      createdAt: new Date(),
    };
    b.quotes = [...(b.quotes ?? []), quote].slice(-10);
    b.markModified("quotes");
    await b.save();

    return {
      purpose: DOMAIN_PAYMENT_PURPOSE,
      referenceId: quote.referenceId,
      kind,
      amount,
      currency: p.currency,
      periodMonths: p.periodMonths,
      periodLabel: periodLabel(p.periodMonths),
      summary,
      domain: info.baseDomain,
      organization: String((org as unknown as { name?: string }).name ?? ""),
      organizationTypeLabel: info.organizationTypeLabel,
      basePrice: kind === "renew" ? info.price : 0,
      memberDomainPrice: info.memberDomainPrice,
      memberDomains,
      paidUntil: info.paidUntil,
      note: p.note ?? "",
      metadata: {
        source: "fockis-organization-domain",
        organizationId: String(org._id),
        kind,
      },
    };
  }

  async claim(organizationId: string, actorUserId: string, paymentIntentId: string) {
    await this.common.requireAdministrator(organizationId, actorUserId);
    const org = await this.common.getOrganization(organizationId);
    const intent = String(paymentIntentId || "").trim();
    if (!intent) throw new BadRequestException("Missing payment reference.");
    const b = await this.billingDoc(org._id);
    if (!(b.entries ?? []).some((e) => e.paymentIntentId === intent)) {
      const payment = await this.paymentModel.findOne({ stripePaymentIntentId: intent }).lean().exec();
      if (!payment) throw new NotFoundException("Payment not found.");
      await this.apply(org._id, b, payment, "Organization administrator");
    }
    return this.info(org._id);
  }

  /** Applies a paid quote whose page closed before it was claimed. */
  async claimPending(orgId: Types.ObjectId) {
    const b = await this.billingModel.findOne({ organizationId: orgId }).exec();
    if (!b || !(b.quotes ?? []).length) return false;
    const refs = b.quotes.map((q) => q.referenceId);
    const payments = await this.paymentModel.find({ referenceId: { $in: refs }, status: "paid" }).sort({ paidAt: 1 }).lean().exec();
    let applied = false;
    for (const pay of payments) {
      if ((b.entries ?? []).some((e) => e.paymentIntentId && e.paymentIntentId === pay.stripePaymentIntentId)) continue;
      try {
        await this.apply(orgId, b, pay, "Automatic");
        applied = true;
      } catch (e) {
        this.logger.warn(`Domain payment for ${String(orgId)} not applied: ${e instanceof Error ? e.message : e}`);
      }
    }
    return applied;
  }

  private async apply(orgId: Types.ObjectId, b: OrganizationDomainBillingDocument, payment: Payment, byName: string) {
    const quote = (b.quotes ?? []).find((q) => q.referenceId === payment.referenceId);
    if (!quote) throw new ForbiddenException("This payment was made for a different organization or purchase.");
    if (payment.status !== "paid") throw new BadRequestException("The payment has not completed yet.");
    if (payment.purpose !== DOMAIN_PAYMENT_PURPOSE) throw new BadRequestException("Unexpected payment type.");
    const currency = String(payment.baseCurrency).toUpperCase();
    if (currency !== quote.currency) throw new BadRequestException("Payment currency does not match the price.");
    if (Number(payment.baseAmount) + 0.001 < quote.amount) throw new BadRequestException("Payment amount is lower than the price.");
    const intent = payment.stripePaymentIntentId;
    if (!intent) throw new BadRequestException("Payment is missing its Stripe reference.");
    if (await this.billingModel.exists({ "entries.paymentIntentId": intent })) throw new ConflictException("This payment has already been used.");

    const now = new Date();
    const entry: DomainBillingEntry = {
      method: "stripe",
      kind: quote.kind,
      amount: Number(payment.baseAmount),
      currency,
      memberDomains: quote.memberDomains,
      paymentIntentId: intent,
      paymentId: payment.id,
      referenceId: quote.referenceId,
      byName,
      at: now,
    };

    if (quote.kind === "members") {
      b.memberSlots = Number(b.memberSlots ?? 0) + quote.memberDomains;
      entry.to = b.paidUntil;
    } else {
      const from = b.paidUntil && b.paidUntil > now ? b.paidUntil : now;
      entry.from = from;
      if (quote.periodMonths === 0) {
        b.paidForever = true;
      } else {
        entry.to = addMonths(from, quote.periodMonths);
        b.paidUntil = entry.to;
      }
      b.memberSlots = quote.memberDomains;
      // Paying activates the base domain.
      await this.domainModel
        .updateOne(
          { organizationId: orgId, domainType: OrganizationDomainType.Organization, status: this.common.domainStatusPending() } as never,
          { $set: { status: this.common.domainStatusVerified(), verifiedAt: now } },
        )
        .exec();
    }
    b.quotes = (b.quotes ?? []).filter((q) => q.referenceId !== quote.referenceId);
    b.entries = [...(b.entries ?? []), entry];
    b.markModified("quotes");
    b.markModified("entries");
    await b.save();
    this.logger.log(`Organization ${String(orgId)} paid ${currency} ${payment.baseAmount} for domain (${quote.kind}, ${intent})`);
  }

  // ======================================================================
  // ADMIN CENTER
  // ======================================================================

  async adminList(q: { search?: string; state?: string; page?: number }) {
    const limit = 25;
    const page = Math.max(1, Number(q.page) || 1);
    const match: Record<string, unknown> = { domainType: OrganizationDomainType.Organization };
    if (q.search?.trim()) match.domain = { $regex: escapeRegex(q.search.trim().toLowerCase()) };
    const bases = await this.domainModel.find(match as never).sort({ createdAt: -1 }).limit(2000).lean().exec();
    const orgIds = bases.map((d) => d.organizationId);
    const [orgs, billings, memberCounts, p] = await Promise.all([
      this.orgModel.find({ _id: { $in: orgIds } }).select("name organizationType status").lean().exec(),
      this.billingModel.find({ organizationId: { $in: orgIds } }).lean().exec(),
      this.domainModel
        .aggregate<{ _id: Types.ObjectId; n: number }>([
          { $match: { organizationId: { $in: orgIds }, domainType: OrganizationDomainType.Member, status: this.common.domainStatusVerified() } },
          { $group: { _id: "$organizationId", n: { $sum: 1 } } },
        ])
        .exec(),
      this.pricing.pricing(),
    ]);
    const orgById = new Map(orgs.map((o) => [String(o._id), o]));
    const billById = new Map(billings.map((x) => [String(x.organizationId), x]));
    const usedById = new Map(memberCounts.map((x) => [String(x._id), x.n]));

    let rows = bases.map((d) => {
      const id = String(d.organizationId);
      const org = orgById.get(id);
      const info = this.compute({ _id: d.organizationId, organizationType: org?.organizationType } as never, (billById.get(id) ?? null) as never, p, d, usedById.get(id) ?? 0);
      return {
        organizationId: id,
        organizationName: String((org as { name?: string } | undefined)?.name ?? "—"),
        organizationTypeLabel: info.organizationTypeLabel,
        domain: d.domain,
        domainStatus: String(d.status),
        state: info.state,
        active: info.active,
        price: info.price,
        currency: info.currency,
        paidUntil: info.paidUntil,
        graceEndsAt: info.graceEndsAt,
        memberDomainsUsed: info.memberDomainsUsed,
        memberDomainsAllowed: info.memberDomainsAllowed,
      };
    });
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.state] = (counts[r.state] ?? 0) + 1;
    if (q.state && q.state !== "all") {
      rows = q.state === "due" ? rows.filter((r) => ["unpaid", "grace", "expired"].includes(r.state)) : rows.filter((r) => r.state === q.state);
    }
    const total = rows.length;
    return { items: rows.slice((page - 1) * limit, page * limit), counts, page, total, hasMore: page * limit < total };
  }

  async adminDetail(organizationId: string) {
    const id = this.common.toObjectId(organizationId, "organizationId");
    const org = await this.orgModel.findById(id).select("name organizationType status createdByUserId").lean().exec();
    if (!org) throw new NotFoundException("Organization not found.");
    await this.claimPending(id);
    const [info, b, members] = await Promise.all([
      this.info(id),
      this.billingModel.findOne({ organizationId: id }).lean().exec(),
      this.domainModel
        .find({ organizationId: id, domainType: OrganizationDomainType.Member } as never)
        .select("domain status assignedUserId createdAt")
        .sort({ createdAt: -1 })
        .limit(200)
        .lean()
        .exec(),
    ]);
    return {
      organization: { id: String(org._id), name: String((org as { name?: string }).name ?? ""), status: String((org as { status?: string }).status ?? "") },
      billing: info,
      exempt: !!b?.exempt,
      exemptReason: b?.exemptReason ?? "",
      paidForever: !!b?.paidForever,
      memberSlots: Number(b?.memberSlots ?? 0),
      entries: [...(b?.entries ?? [])].reverse(),
      memberDomains: members.map((m) => ({ domain: m.domain, status: String(m.status), assigned: !!m.assignedUserId, createdAt: (m as { createdAt?: Date }).createdAt ?? null })),
    };
  }

  async adminAction(
    organizationId: string,
    body: { action: "exempt" | "unexempt" | "set_paid_until" | "clear_paid"; until?: string; amount?: number; memberDomains?: number; note?: string },
    byName: string,
  ) {
    const id = this.common.toObjectId(organizationId, "organizationId");
    const org = await this.orgModel.findById(id).select("_id").lean().exec();
    if (!org) throw new NotFoundException("Organization not found.");
    const b = await this.billingDoc(id);
    const p = await this.pricing.pricing();
    const note = String(body.note ?? "").trim().slice(0, 500) || undefined;
    const now = new Date();
    const push = (e: DomainBillingEntry) => {
      b.entries = [...(b.entries ?? []), e];
      b.markModified("entries");
    };

    switch (body.action) {
      case "exempt":
        if (!note || note.length < 3) throw new BadRequestException("Say why this organization doesn't pay.");
        b.exempt = true;
        b.exemptReason = note;
        push({ method: "exempt", note, byName, at: now });
        break;
      case "unexempt":
        b.exempt = false;
        b.exemptReason = undefined;
        push({ method: "unexempt", note, byName, at: now });
        break;
      case "set_paid_until": {
        const until = body.until ? new Date(body.until) : null;
        if (!until || Number.isNaN(until.getTime())) throw new BadRequestException("Choose the date the domain is paid until.");
        if (until.getTime() < now.getTime() - DAY) throw new BadRequestException("The paid-until date must be today or later.");
        const amount = body.amount !== undefined && body.amount !== null ? round2(Number(body.amount)) : undefined;
        if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) throw new BadRequestException("Amount must be 0 or more.");
        const slots = body.memberDomains !== undefined ? Math.max(0, Math.round(Number(body.memberDomains)) || 0) : Number(b.memberSlots ?? 0);
        push({ method: "manual", kind: "renew", amount, currency: p.currency, memberDomains: slots, from: b.paidUntil && b.paidUntil > now ? b.paidUntil : now, to: until, note, byName, at: now });
        b.paidUntil = until;
        b.memberSlots = slots;
        await this.domainModel
          .updateOne(
            { organizationId: id, domainType: OrganizationDomainType.Organization, status: this.common.domainStatusPending() } as never,
            { $set: { status: this.common.domainStatusVerified(), verifiedAt: now } },
          )
          .exec();
        break;
      }
      case "clear_paid":
        if (!note || note.length < 3) throw new BadRequestException("Say why the payment is cleared.");
        push({ method: "cleared", note, byName, at: now });
        b.paidUntil = undefined;
        b.paidForever = false;
        b.memberSlots = 0;
        break;
      default:
        throw new BadRequestException("Unknown action.");
    }
    await b.save();
    return this.adminDetail(organizationId);
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
