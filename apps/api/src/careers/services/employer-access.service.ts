import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import type { JobDocument } from "../schemas/job.schema";
import { Application, type ApplicationDocument } from "../schemas/application.schema";
import {
  EmployerCompany,
  type EmployerBillingEntry,
  type EmployerCompanyDocument,
  type EmployerPlanQuote,
} from "../schemas/employer-company.schema";
import { EmployerPlanSettings, type EmployerPlanConfig, type EmployerPlanSettingsDocument } from "../schemas/employer-plan-settings.schema";
// Existing Fockis payment records — read-only here (the payment system is not changed).
import { Payment } from "../../payments/schemas/payment.schema";

export const EMPLOYER_PAYMENT_PURPOSE = "other";
const DAY = 86_400_000;

/** Starting plans (no prices). Fockis admins set prices and limits in the Admin Center. */
const DEFAULT_PLANS: EmployerPlanConfig[] = [
  {
    id: "free",
    name: "Free",
    description: "Post jobs and manage applicants on Fockis Careers.",
    features: ["Fockis and external applications", "Applicant tracking and notes", "Interview scheduling"],
    price: 0,
    periodMonths: 0,
    maxActiveJobs: 0,
  },
  {
    id: "growth",
    name: "Growth",
    description: "For teams hiring regularly.",
    features: ["Everything in Free", "Promoted job listings", "Advanced hiring analytics", "Priority verification review"],
    price: 0,
    periodMonths: 1,
    maxActiveJobs: 0,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations with custom needs.",
    features: ["Everything in Growth", "Dedicated account manager", "Custom integrations", "Volume hiring support"],
    price: 0,
    periodMonths: 12,
    maxActiveJobs: 0,
  },
];

export type EmployerStatus = "not_submitted" | "pending" | "approved" | "rejected" | "blocked";
export type PlanState = "free" | "exempt" | "paid" | "active" | "grace" | "expired";

export interface EmployerPlanInfo {
  /** Plan the employer chose. */
  planId: string;
  /** Plan whose limits apply now (a lapsed paid plan falls back to "free"). */
  effectivePlanId: string;
  state: PlanState;
  paidUntil: string | null;
  graceEndsAt: string | null;
  renewSoon: boolean;
  maxActiveJobs: number;
}

type CompanyLike = Pick<EmployerCompany, "verification" | "billing" | "blocked"> & { _id?: Types.ObjectId; ownerId: Types.ObjectId };

const periodText = (m: number) => (m === 0 ? "one-time" : m === 1 ? "month" : m === 12 ? "year" : `${m} months`);
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Who may publish on Fockis Careers, and on which plan.
 *
 *   Employer submits the verification form → Fockis admin approves → every job
 *   they post appears on Careers. Rejected / blocked employers' jobs stay hidden.
 *   Paid plans (prices set by Fockis admins) are bought through the existing
 *   Fockis checkout; this service only reads the paid records.
 */
@Injectable()
export class EmployerAccessService {
  private readonly logger = new Logger(EmployerAccessService.name);
  private pausedCache: { at: number; ids: Types.ObjectId[] } | null = null;

  constructor(
    @InjectModel("FockisCareerJob") private readonly jobModel: Model<JobDocument>,
    @InjectModel(Application.name) private readonly applicationModel: Model<ApplicationDocument>,
    @InjectModel(EmployerCompany.name) private readonly companyModel: Model<EmployerCompanyDocument>,
    @InjectModel(EmployerPlanSettings.name) private readonly settingsModel: Model<EmployerPlanSettings>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
  ) {}

  private oid(id: string, what = "id") {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${what}.`);
    return new Types.ObjectId(id);
  }

  // ======================================================================
  // PLAN SETTINGS (Admin Center)
  // ======================================================================

  async settings(): Promise<EmployerPlanSettingsDocument> {
    const found = await this.settingsModel.findOne({ key: "default" }).exec();
    if (found) return found;
    try {
      return await this.settingsModel.create({ key: "default", enabled: false, currency: "USD", graceDays: 7, plans: DEFAULT_PLANS, history: [] });
    } catch {
      return (await this.settingsModel.findOne({ key: "default" }).exec())!;
    }
  }

  plan(s: Pick<EmployerPlanSettings, "plans">, id?: string | null): EmployerPlanConfig {
    const plans = s.plans?.length ? s.plans : DEFAULT_PLANS;
    return plans.find((p) => p.id === (id || "free")) ?? plans.find((p) => p.id === "free") ?? plans[0];
  }

  /** Plans as employers see them (no prices when charging is off). */
  async publicPlans() {
    const s = await this.settings();
    return {
      enabled: s.enabled,
      currency: s.currency,
      graceDays: s.graceDays,
      note: s.note ?? "",
      plans: (s.plans?.length ? s.plans : DEFAULT_PLANS).map((p) => ({
        ...p,
        price: s.enabled ? Number(p.price) || 0 : 0,
        periodLabel: periodText(p.periodMonths),
      })),
    };
  }

  async settingsView() {
    const s = await this.settings();
    return {
      enabled: s.enabled,
      currency: s.currency,
      graceDays: s.graceDays,
      note: s.note ?? "",
      plans: s.plans?.length ? s.plans : DEFAULT_PLANS,
      updatedAt: (s as unknown as { updatedAt?: Date }).updatedAt ?? null,
      history: [...(s.history ?? [])].reverse().slice(0, 50),
    };
  }

  async saveSettings(
    dto: { enabled?: boolean; currency?: string; graceDays?: number; note?: string; plans?: Array<Partial<EmployerPlanConfig> & { id: string }> },
    byName: string,
  ) {
    const s = await this.settings();
    const changes: string[] = [];
    if (dto.currency !== undefined) {
      const c = String(dto.currency).trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(c)) throw new BadRequestException("Currency must be a 3-letter code such as USD.");
      if (c !== s.currency) changes.push(`currency ${s.currency} → ${c}`);
      s.currency = c;
    }
    if (dto.graceDays !== undefined) {
      const g = Math.round(Number(dto.graceDays));
      if (!Number.isFinite(g) || g < 0 || g > 180) throw new BadRequestException("Grace period must be 0 to 180 days.");
      if (g !== s.graceDays) changes.push(`grace ${s.graceDays} → ${g} days`);
      s.graceDays = g;
    }
    if (dto.note !== undefined) {
      const n = String(dto.note).trim().slice(0, 600);
      if (n !== (s.note ?? "")) changes.push("note updated");
      s.note = n || undefined;
    }
    if (dto.plans) {
      const current = s.plans?.length ? s.plans : DEFAULT_PLANS;
      const next = current.map((p) => ({ ...p }));
      for (const input of dto.plans) {
        const p = next.find((x) => x.id === input.id);
        if (!p) throw new BadRequestException(`Unknown plan "${input.id}".`);
        if (input.name !== undefined) {
          const v = String(input.name).trim().slice(0, 60);
          if (!v) throw new BadRequestException("A plan needs a name.");
          if (v !== p.name) changes.push(`${p.name} renamed to ${v}`);
          p.name = v;
        }
        if (input.description !== undefined) p.description = String(input.description).trim().slice(0, 300);
        if (input.features !== undefined) p.features = (input.features ?? []).map((f) => String(f).trim()).filter(Boolean).slice(0, 12);
        if (input.price !== undefined) {
          const v = round2(Number(input.price));
          if (!Number.isFinite(v) || v < 0 || v > 1_000_000) throw new BadRequestException(`Price for ${p.name} must be 0 or more.`);
          if (p.id === "free" && v > 0) throw new BadRequestException("The Free plan can't have a price.");
          if (v !== p.price) changes.push(`${p.name} ${s.currency} ${p.price} → ${v}`);
          p.price = v;
        }
        if (input.periodMonths !== undefined) {
          const m = Math.round(Number(input.periodMonths));
          if (!Number.isFinite(m) || m < 0 || m > 60) throw new BadRequestException("Billing period must be 0 (one-time) to 60 months.");
          if (m !== p.periodMonths) changes.push(`${p.name} period → ${periodText(m)}`);
          p.periodMonths = m;
        }
        if (input.maxActiveJobs !== undefined) {
          const n = Math.round(Number(input.maxActiveJobs));
          if (!Number.isFinite(n) || n < 0 || n > 100_000) throw new BadRequestException("Live job limit must be 0 (unlimited) or more.");
          if (n !== p.maxActiveJobs) changes.push(`${p.name} live jobs ${p.maxActiveJobs || "∞"} → ${n || "∞"}`);
          p.maxActiveJobs = n;
        }
      }
      s.plans = next;
      s.markModified("plans");
    }
    if (dto.enabled !== undefined && dto.enabled !== s.enabled) {
      changes.push(dto.enabled ? "charging turned ON" : "charging turned OFF");
      s.enabled = dto.enabled;
    }
    if (changes.length) {
      s.history = [...(s.history ?? []), { summary: changes.join(" · "), byName, at: new Date() }].slice(-200);
      s.markModified("history");
      await s.save();
      this.pausedCache = null;
      this.logger.log(`Employer plans changed by ${byName}: ${changes.join("; ")}`);
    }
    return this.settingsView();
  }

  // ======================================================================
  // STATUS
  // ======================================================================

  status(c: Pick<CompanyLike, "verification" | "blocked"> | null | undefined): EmployerStatus {
    if (!c) return "not_submitted";
    if (c.blocked) return "blocked";
    return (c.verification?.status as EmployerStatus) ?? "not_submitted";
  }

  /** Plan state. A paid plan that lapsed past the grace period falls back to Free. */
  planInfo(c: Pick<CompanyLike, "billing"> | null | undefined, s: EmployerPlanSettings, now = new Date()): EmployerPlanInfo {
    const b = c?.billing;
    const chosen = this.plan(s, b?.plan);
    const free = this.plan(s, "free");
    const info: EmployerPlanInfo = {
      planId: chosen.id,
      effectivePlanId: chosen.id,
      state: "free",
      paidUntil: b?.paidUntil ? new Date(b.paidUntil).toISOString() : null,
      graceEndsAt: null,
      renewSoon: false,
      maxActiveJobs: chosen.maxActiveJobs,
    };
    const price = s.enabled ? Number(chosen.price) || 0 : 0;
    if (chosen.id === "free" || price <= 0) return info;
    if (b?.exempt) return { ...info, state: "exempt" };
    if (b?.paidUntil) {
      const until = new Date(b.paidUntil).getTime();
      if (chosen.periodMonths === 0) return { ...info, state: "paid" };
      if (now.getTime() <= until) {
        const window = Math.min(14 * DAY, Math.max(3 * DAY, chosen.periodMonths * 30 * DAY * 0.25));
        return { ...info, state: "active", renewSoon: until - now.getTime() <= window };
      }
      const ends = new Date(until + s.graceDays * DAY);
      if (now <= ends) return { ...info, state: "grace", graceEndsAt: ends.toISOString() };
      return { ...info, state: "expired", graceEndsAt: ends.toISOString(), effectivePlanId: free.id, maxActiveJobs: free.maxActiveJobs };
    }
    // A paid plan set without payment (e.g. chosen while charging was off) acts as Free until paid.
    return { ...info, state: "expired", effectivePlanId: free.id, maxActiveJobs: free.maxActiveJobs };
  }

  private liveJobsFilter(ownerId: Types.ObjectId, excludeJobId?: Types.ObjectId) {
    return {
      employerId: ownerId,
      isActive: true,
      takenDown: { $ne: true },
      ...(excludeJobId ? { _id: { $ne: excludeJobId } } : {}),
    };
  }

  /**
   * Before a new job is saved. Blocked employers can't post; approved employers
   * must stay within their plan's live-job limit.
   * Returns whether the job goes live right away (employer approved).
   */
  async prepareNewJob(ownerId: string) {
    const oid = this.oid(ownerId, "employer");
    const company = await this.companyModel.findOne({ ownerId: oid }).lean().exec();
    const st = this.status(company);
    if (st === "blocked") throw new ForbiddenException("Your employer account is blocked by Fockis. Contact support.");
    await this.assertWithinLimit(oid, company);
    return { live: st === "approved" };
  }

  /** Before a job is (re)opened. */
  async assertCanActivate(ownerId: string, jobId: string) {
    const oid = this.oid(ownerId, "employer");
    const company = await this.companyModel.findOne({ ownerId: oid }).lean().exec();
    if (this.status(company) === "blocked") throw new ForbiddenException("Your employer account is blocked by Fockis. Contact support.");
    const job = await this.jobModel.findOne({ _id: this.oid(jobId, "job"), employerId: oid }).select("takenDown").lean().exec();
    if (job && (job as { takenDown?: boolean }).takenDown) throw new ForbiddenException("Fockis took this job down. Contact support.");
    await this.assertWithinLimit(oid, company, new Types.ObjectId(jobId));
  }

  private async assertWithinLimit(ownerId: Types.ObjectId, company: CompanyLike | null, excludeJobId?: Types.ObjectId) {
    const s = await this.settings();
    const info = this.planInfo(company, s);
    if (!info.maxActiveJobs) return;
    const live = await this.jobModel.countDocuments(this.liveJobsFilter(ownerId, excludeJobId)).exec();
    if (live >= info.maxActiveJobs) {
      const plan = this.plan(s, info.effectivePlanId);
      throw new ForbiddenException(
        `Your ${plan.name} plan allows ${info.maxActiveJobs} open job${info.maxActiveJobs === 1 ? "" : "s"} at a time. Close a job or upgrade your plan in Employer Center → Billing.`,
      );
    }
  }

  /** Make the employer's jobs match its approval: approved and not blocked → shown on Careers. */
  async syncJobs(ownerId: Types.ObjectId) {
    const company = await this.companyModel.findOne({ ownerId }).select("verification.status blocked").lean().exec();
    const show = this.status(company) === "approved";
    await this.jobModel.updateMany({ employerId: ownerId, takenDown: { $ne: true } }, { $set: { isApproved: show } }).exec();
    this.pausedCache = null;
  }

  /**
   * Employers whose jobs are hidden right now even though approved: a lapsed
   * paid plan whose open jobs exceed what Free allows. Cached for a minute.
   */
  async pausedOwnerIds(): Promise<Types.ObjectId[]> {
    if (this.pausedCache && Date.now() - this.pausedCache.at < 60_000) return this.pausedCache.ids;
    const s = await this.settings();
    const ids: Types.ObjectId[] = [];
    if (s.enabled) {
      const paidPlanIds = (s.plans ?? []).filter((p) => p.id !== "free" && Number(p.price) > 0).map((p) => p.id);
      if (paidPlanIds.length) {
        const companies = await this.companyModel
          .find({ "billing.plan": { $in: paidPlanIds }, "billing.exempt": { $ne: true }, blocked: { $ne: true } })
          .select("ownerId billing")
          .lean()
          .exec();
        for (const c of companies) {
          const info = this.planInfo(c, s);
          if (info.state !== "expired" || !info.maxActiveJobs) continue;
          const live = await this.jobModel.countDocuments(this.liveJobsFilter(c.ownerId)).exec();
          if (live > info.maxActiveJobs) ids.push(c.ownerId);
        }
      }
    }
    this.pausedCache = { at: Date.now(), ids };
    return ids;
  }

  /** Extra filter for every public Careers query. */
  async publicJobFilter() {
    const paused = await this.pausedOwnerIds();
    return { takenDown: { $ne: true }, ...(paused.length ? { employerId: { $nin: paused } } : {}) };
  }

  // ======================================================================
  // EMPLOYER PAYING (existing Fockis checkout)
  // ======================================================================

  async billingFor(ownerId: string) {
    const oid = this.oid(ownerId, "employer");
    await this.claimPending(oid);
    const [company, s] = await Promise.all([this.companyModel.findOne({ ownerId: oid }).lean().exec(), this.settings()]);
    const info = this.planInfo(company, s);
    const live = await this.jobModel.countDocuments(this.liveJobsFilter(oid)).exec();
    return {
      status: this.status(company),
      plan: info,
      liveJobs: live,
      pricing: await this.publicPlans(),
      payments: (company?.billing?.entries ?? [])
        .filter((e) => e.method === "stripe" || e.method === "manual")
        .map((e) => ({ method: e.method, plan: e.plan, amount: e.amount, currency: e.currency, from: e.from, to: e.to, at: e.at }))
        .reverse(),
    };
  }

  /** Switch plan. Free (or free-of-charge) plans switch at once; paid plans return a checkout quote. */
  async choosePlan(ownerId: string, planId: string, byName: string) {
    const oid = this.oid(ownerId, "employer");
    const s = await this.settings();
    const plan = (s.plans?.length ? s.plans : DEFAULT_PLANS).find((p) => p.id === planId);
    if (!plan) throw new BadRequestException("Unknown plan.");
    const company = await this.ensureCompany(oid);
    if (company.blocked) throw new ForbiddenException("Your employer account is blocked by Fockis.");
    const price = s.enabled ? Number(plan.price) || 0 : 0;

    if (price <= 0) {
      // Moving down: the new limit must fit the jobs already open.
      if (plan.maxActiveJobs) {
        const live = await this.jobModel.countDocuments(this.liveJobsFilter(oid)).exec();
        if (live > plan.maxActiveJobs) {
          throw new BadRequestException(`${plan.name} allows ${plan.maxActiveJobs} open job${plan.maxActiveJobs === 1 ? "" : "s"}. Close ${live - plan.maxActiveJobs} first.`);
        }
      }
      company.billing.plan = plan.id;
      company.billing.entries = [...(company.billing.entries ?? []), { method: "plan_change", plan: plan.id, note: "Switched plan", byName, at: new Date() }];
      company.markModified("billing");
      await company.save();
      this.pausedCache = null;
      return { switched: true as const, checkout: null };
    }

    const seq = (company.billing.entries ?? []).filter((e) => e.method === "stripe").length + (company.billing.quotes ?? []).length + 1;
    const quote: EmployerPlanQuote = {
      referenceId: `fockis-employer-plan:${String(company._id)}:${plan.id}:${seq}`,
      plan: plan.id,
      amount: price,
      currency: s.currency,
      periodMonths: plan.periodMonths,
      createdAt: new Date(),
    };
    company.billing.quotes = [...(company.billing.quotes ?? []), quote].slice(-10);
    company.markModified("billing");
    await company.save();
    const current = this.planInfo(company, s);
    return {
      switched: false as const,
      checkout: {
        purpose: EMPLOYER_PAYMENT_PURPOSE,
        referenceId: quote.referenceId,
        amount: quote.amount,
        currency: quote.currency,
        plan: { id: plan.id, name: plan.name, periodMonths: plan.periodMonths, periodLabel: periodText(plan.periodMonths), maxActiveJobs: plan.maxActiveJobs, features: plan.features },
        companyName: company.companyName || "Your company",
        renewal: current.planId === plan.id && !!company.billing.paidUntil,
        note: s.note ?? "",
        metadata: { source: "fockis-employer-plan", companyId: String(company._id), plan: plan.id },
      },
    };
  }

  async claim(ownerId: string, paymentIntentId: string, byName: string) {
    const oid = this.oid(ownerId, "employer");
    const intent = String(paymentIntentId || "").trim();
    if (!intent) throw new BadRequestException("Missing payment reference.");
    const company = await this.companyModel.findOne({ ownerId: oid }).exec();
    if (!company) throw new NotFoundException("Employer not found.");
    if (!(company.billing?.entries ?? []).some((e) => e.paymentIntentId === intent)) {
      const payment = await this.paymentModel.findOne({ stripePaymentIntentId: intent }).lean().exec();
      if (!payment) throw new NotFoundException("Payment not found.");
      await this.apply(company, payment, byName);
    }
    return this.billingFor(ownerId);
  }

  private async claimPending(ownerId: Types.ObjectId) {
    const company = await this.companyModel.findOne({ ownerId }).exec();
    const quotes = company?.billing?.quotes ?? [];
    if (!company || !quotes.length) return;
    const payments = await this.paymentModel
      .find({ referenceId: { $in: quotes.map((q) => q.referenceId) }, status: "paid" })
      .sort({ paidAt: 1 })
      .lean()
      .exec();
    for (const pay of payments) {
      if ((company.billing.entries ?? []).some((e) => e.paymentIntentId && e.paymentIntentId === pay.stripePaymentIntentId)) continue;
      try {
        await this.apply(company, pay, "Automatic");
      } catch (e) {
        this.logger.warn(`Employer plan payment not applied: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  private async apply(company: EmployerCompanyDocument, payment: Payment, byName: string) {
    const quote = (company.billing?.quotes ?? []).find((q) => q.referenceId === payment.referenceId);
    if (!quote) throw new ForbiddenException("This payment was made for something else.");
    if (payment.status !== "paid") throw new BadRequestException("The payment has not completed yet.");
    if (payment.purpose !== EMPLOYER_PAYMENT_PURPOSE) throw new BadRequestException("Unexpected payment type.");
    const currency = String(payment.baseCurrency).toUpperCase();
    if (currency !== quote.currency) throw new BadRequestException("Payment currency does not match the price.");
    if (Number(payment.baseAmount) + 0.001 < quote.amount) throw new BadRequestException("Payment amount is lower than the price.");
    const intent = payment.stripePaymentIntentId;
    if (!intent) throw new BadRequestException("Payment is missing its Stripe reference.");
    if (await this.companyModel.exists({ "billing.entries.paymentIntentId": intent })) throw new ConflictException("This payment has already been used.");

    const now = new Date();
    const samePlan = company.billing.plan === quote.plan;
    const from = samePlan && company.billing.paidUntil && company.billing.paidUntil > now ? company.billing.paidUntil : now;
    const entry: EmployerBillingEntry = {
      method: "stripe",
      plan: quote.plan,
      amount: Number(payment.baseAmount),
      currency,
      from,
      paymentIntentId: intent,
      paymentId: payment.id,
      referenceId: quote.referenceId,
      byName,
      at: now,
    };
    company.billing.plan = quote.plan;
    if (quote.periodMonths === 0) {
      company.billing.paidUntil = new Date("2999-12-31T00:00:00Z");
    } else {
      const to = new Date(from);
      to.setMonth(to.getMonth() + quote.periodMonths);
      entry.to = to;
      company.billing.paidUntil = to;
    }
    company.billing.quotes = (company.billing.quotes ?? []).filter((q) => q.referenceId !== quote.referenceId);
    company.billing.entries = [...(company.billing.entries ?? []), entry];
    company.markModified("billing");
    await company.save();
    this.pausedCache = null;
    this.logger.log(`Employer ${String(company.ownerId)} paid ${currency} ${payment.baseAmount} for ${quote.plan} (${intent})`);
  }

  private async ensureCompany(ownerId: Types.ObjectId) {
    return this.companyModel
      .findOneAndUpdate({ ownerId }, { $setOnInsert: { ownerId } }, { new: true, upsert: true, setDefaultsOnInsert: true })
      .exec() as Promise<EmployerCompanyDocument>;
  }

  // ======================================================================
  // ADMIN CENTER
  // ======================================================================

  async adminOverview() {
    const [byStatus, blocked, jobs, liveJobs, takenDown, applications, s] = await Promise.all([
      this.companyModel.aggregate<{ _id: string; n: number }>([{ $match: { blocked: { $ne: true } } }, { $group: { _id: "$verification.status", n: { $sum: 1 } } }]).exec(),
      this.companyModel.countDocuments({ blocked: true }).exec(),
      this.jobModel.countDocuments({}).exec(),
      this.jobModel.countDocuments({ isActive: true, isApproved: true, takenDown: { $ne: true } }).exec(),
      this.jobModel.countDocuments({ takenDown: true }).exec(),
      this.applicationModel.countDocuments({}).exec(),
      this.settings(),
    ]);
    const counts: Record<string, number> = { not_submitted: 0, pending: 0, approved: 0, rejected: 0, blocked };
    for (const r of byStatus) counts[r._id ?? "not_submitted"] = (counts[r._id ?? "not_submitted"] ?? 0) + r.n;
    return { employers: counts, jobs: { total: jobs, live: liveJobs, takenDown }, applications, chargingOn: s.enabled };
  }

  async adminEmployers(q: { status?: string; search?: string; page?: number }) {
    const limit = 25;
    const page = Math.max(1, Number(q.page) || 1);
    const filter: Record<string, unknown> = {};
    if (q.status === "blocked") filter.blocked = true;
    else if (q.status && q.status !== "all") {
      filter.blocked = { $ne: true };
      filter["verification.status"] = q.status === "not_submitted" ? { $in: ["not_submitted", null] } : q.status;
    }
    if (q.search?.trim()) {
      const rx = new RegExp(q.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ companyName: rx }, { "verification.legalName": rx }, { "verification.businessEmail": rx }];
    }
    const [list, total, s] = await Promise.all([
      this.companyModel
        .find(filter)
        .select("ownerId companyName logoUrl industry city country verification blocked billing createdAt")
        .sort({ "verification.submittedAt": -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.companyModel.countDocuments(filter).exec(),
      this.settings(),
    ]);
    const owners = list.map((c) => c.ownerId);
    const jobCounts = await this.jobModel
      .aggregate<{ _id: Types.ObjectId; total: number; live: number }>([
        { $match: { employerId: { $in: owners } } },
        { $group: { _id: "$employerId", total: { $sum: 1 }, live: { $sum: { $cond: [{ $and: ["$isActive", "$isApproved", { $ne: ["$takenDown", true] }] }, 1, 0] } } } },
      ])
      .exec();
    const byOwner = new Map(jobCounts.map((j) => [String(j._id), j]));
    return {
      items: list.map((c) => {
        const info = this.planInfo(c, s);
        const jc = byOwner.get(String(c.ownerId));
        return {
          id: String(c.ownerId),
          companyName: c.companyName || c.verification?.legalName || "Unnamed employer",
          logoUrl: c.logoUrl || null,
          industry: c.industry ?? "",
          location: [c.city, c.country].filter(Boolean).join(", "),
          status: this.status(c),
          businessEmail: c.verification?.businessEmail ?? "",
          submittedAt: c.verification?.submittedAt ?? null,
          plan: this.plan(s, info.planId).name,
          planState: info.state,
          jobs: jc?.total ?? 0,
          liveJobs: jc?.live ?? 0,
        };
      }),
      page,
      total,
      hasMore: page * limit < total,
    };
  }

  async adminEmployer(ownerId: string) {
    const oid = this.oid(ownerId, "employer");
    await this.claimPending(oid);
    const [c, s] = await Promise.all([this.companyModel.findOne({ ownerId: oid }).lean().exec(), this.settings()]);
    if (!c) throw new NotFoundException("Employer not found.");
    const [jobs, owner] = await Promise.all([
      this.jobModel
        .find({ employerId: oid })
        .select("title city country isActive isApproved takenDown takenDownReason createdAt applicationDeadline")
        .sort({ createdAt: -1 })
        .limit(200)
        .lean()
        .exec(),
      this.companyModel.db.collection("users").findOne({ _id: oid }, { projection: { name: 1, fullName: 1, username: 1, email: 1 } }),
    ]);
    const counts = await this.applicationModel
      .aggregate<{ _id: Types.ObjectId; n: number }>([{ $match: { jobId: { $in: jobs.map((j) => j._id) } } }, { $group: { _id: "$jobId", n: { $sum: 1 } } }])
      .exec();
    const applied = new Map(counts.map((x) => [String(x._id), x.n]));
    const info = this.planInfo(c, s);
    const u = owner as { name?: string; fullName?: string; username?: string; email?: string } | null;
    return {
      id: String(c.ownerId),
      companyName: c.companyName || c.verification?.legalName || "Unnamed employer",
      logoUrl: c.logoUrl || null,
      industry: c.industry ?? "",
      companySize: c.companySize ?? "",
      website: c.website ?? "",
      location: [c.city, c.stateProvince, c.country].filter(Boolean).join(", "),
      about: c.about ?? "",
      owner: { id: String(c.ownerId), name: String(u?.name || u?.fullName || u?.username || "—"), email: String(u?.email ?? "") },
      teamSize: (c.team ?? []).filter((m) => m.status === "active").length + 1,
      status: this.status(c),
      blockedReason: c.blockedReason ?? "",
      verification: {
        status: c.verification?.status ?? "not_submitted",
        legalName: c.verification?.legalName ?? "",
        businessEmail: c.verification?.businessEmail ?? "",
        website: c.verification?.website ?? "",
        registrationNumber: c.verification?.registrationNumber ?? "",
        documents: c.verification?.documents ?? [],
        submittedAt: c.verification?.submittedAt ?? null,
        reviewedAt: c.verification?.reviewedAt ?? null,
        reviewerNote: c.verification?.reviewerNote ?? "",
      },
      plan: { ...info, name: this.plan(s, info.planId).name, exempt: !!c.billing?.exempt, exemptReason: c.billing?.exemptReason ?? "" },
      plans: (s.plans?.length ? s.plans : DEFAULT_PLANS).map((p) => ({ id: p.id, name: p.name, price: s.enabled ? p.price : 0, periodMonths: p.periodMonths })),
      currency: s.currency,
      billingEntries: [...(c.billing?.entries ?? [])].reverse(),
      history: [
        ...(c.verificationHistory ?? []).map((h) => ({ action: h.status, reason: h.note, at: h.at, byName: undefined as string | undefined })),
        ...(c.adminHistory ?? []).map((h) => ({ action: h.action, reason: h.reason, at: h.at, byName: h.byName })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
      jobs: jobs.map((j) => ({
        id: String(j._id),
        title: j.title,
        location: [j.city, j.country].filter(Boolean).join(", "),
        status: (j as { takenDown?: boolean }).takenDown ? "taken_down" : !j.isActive ? "closed" : j.isApproved ? "live" : "waiting",
        applications: applied.get(String(j._id)) ?? 0,
        createdAt: (j as { createdAt?: Date }).createdAt ?? null,
      })),
    };
  }

  async adminEmployerAction(
    ownerId: string,
    body: { action: "approve" | "reject" | "block" | "unblock" | "set_plan" | "exempt" | "unexempt" | "clear_paid"; reason?: string; plan?: string; until?: string; amount?: number },
    byName: string,
  ) {
    const oid = this.oid(ownerId, "employer");
    const c = await this.companyModel.findOne({ ownerId: oid }).exec();
    if (!c) throw new NotFoundException("Employer not found.");
    const s = await this.settings();
    const reason = String(body.reason ?? "").trim().slice(0, 2000) || undefined;
    const now = new Date();
    const need = (what: string) => {
      if (!reason || reason.length < 3) throw new BadRequestException(`Give a reason to ${what}.`);
    };
    const log = (action: string) => {
      c.adminHistory = [...(c.adminHistory ?? []), { action, reason, byName, at: now }];
    };
    const st = this.status(c);

    switch (body.action) {
      case "approve":
        if (st === "blocked") throw new BadRequestException("Unblock this employer first.");
        if (st === "approved") throw new BadRequestException("Already approved.");
        c.verification = { ...(c.verification ?? { documents: [] }), status: "approved", reviewedAt: now, reviewerNote: reason } as typeof c.verification;
        c.verificationHistory = [...(c.verificationHistory ?? []), { status: "approved", note: reason ? `Approved by Fockis — ${reason}` : "Approved by Fockis", at: now }];
        log("approved");
        break;
      case "reject":
        need("reject");
        if (st === "blocked") throw new BadRequestException("Unblock this employer first.");
        c.verification = { ...(c.verification ?? { documents: [] }), status: "rejected", reviewedAt: now, reviewerNote: reason } as typeof c.verification;
        c.verificationHistory = [...(c.verificationHistory ?? []), { status: "rejected", note: reason, at: now }];
        log("rejected");
        break;
      case "block":
        need("block");
        if (c.blocked) throw new BadRequestException("Already blocked.");
        c.blocked = true;
        c.blockedReason = reason;
        c.blockedAt = now;
        log("blocked");
        break;
      case "unblock":
        if (!c.blocked) throw new BadRequestException("Not blocked.");
        c.blocked = false;
        c.blockedReason = undefined;
        log("unblocked");
        break;
      case "set_plan": {
        const plan = (s.plans?.length ? s.plans : DEFAULT_PLANS).find((p) => p.id === body.plan);
        if (!plan) throw new BadRequestException("Choose a plan.");
        const until = body.until ? new Date(body.until) : null;
        if (until && Number.isNaN(until.getTime())) throw new BadRequestException("Invalid date.");
        const amount = body.amount !== undefined && body.amount !== null ? round2(Number(body.amount)) : undefined;
        c.billing.plan = plan.id;
        if (until) c.billing.paidUntil = until;
        c.billing.entries = [
          ...(c.billing.entries ?? []),
          until
            ? { method: "manual", plan: plan.id, amount, currency: s.currency, from: now, to: until, note: reason, byName, at: now }
            : { method: "plan_change", plan: plan.id, note: reason ?? "Plan set by Fockis", byName, at: now },
        ];
        log(`plan set to ${plan.name}`);
        break;
      }
      case "exempt":
        need("make the plan free of charge");
        c.billing.exempt = true;
        c.billing.exemptReason = reason;
        c.billing.entries = [...(c.billing.entries ?? []), { method: "exempt", note: reason, byName, at: now }];
        log("plan made free of charge");
        break;
      case "unexempt":
        c.billing.exempt = false;
        c.billing.exemptReason = undefined;
        c.billing.entries = [...(c.billing.entries ?? []), { method: "unexempt", note: reason, byName, at: now }];
        log("free of charge removed");
        break;
      case "clear_paid":
        need("clear the paid period");
        c.billing.paidUntil = undefined;
        c.billing.entries = [...(c.billing.entries ?? []), { method: "cleared", note: reason, byName, at: now }];
        log("paid period cleared");
        break;
      default:
        throw new BadRequestException("Unknown action.");
    }
    c.markModified("billing");
    c.markModified("verification");
    await c.save();
    await this.syncJobs(oid);
    return this.adminEmployer(ownerId);
  }

  async adminJobs(q: { status?: string; search?: string; page?: number }) {
    const limit = 25;
    const page = Math.max(1, Number(q.page) || 1);
    const filter: Record<string, unknown> = {};
    if (q.status === "live") Object.assign(filter, { isActive: true, isApproved: true, takenDown: { $ne: true } });
    else if (q.status === "waiting") Object.assign(filter, { isActive: true, isApproved: false, takenDown: { $ne: true } });
    else if (q.status === "taken_down") filter.takenDown = true;
    else if (q.status === "closed") Object.assign(filter, { isActive: false, takenDown: { $ne: true } });
    if (q.search?.trim()) {
      const rx = new RegExp(q.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: rx }, { company: rx }];
    }
    const [list, total] = await Promise.all([
      this.jobModel.find(filter).select("title company city country employerId isActive isApproved takenDown takenDownReason createdAt").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
      this.jobModel.countDocuments(filter).exec(),
    ]);
    const counts = await this.applicationModel
      .aggregate<{ _id: Types.ObjectId; n: number }>([{ $match: { jobId: { $in: list.map((j) => j._id) } } }, { $group: { _id: "$jobId", n: { $sum: 1 } } }])
      .exec();
    const applied = new Map(counts.map((x) => [String(x._id), x.n]));
    return {
      items: list.map((j) => ({
        id: String(j._id),
        title: j.title,
        company: j.company,
        employerId: String(j.employerId),
        location: [j.city, j.country].filter(Boolean).join(", "),
        status: (j as { takenDown?: boolean }).takenDown ? "taken_down" : !j.isActive ? "closed" : j.isApproved ? "live" : "waiting",
        takenDownReason: (j as { takenDownReason?: string }).takenDownReason ?? "",
        applications: applied.get(String(j._id)) ?? 0,
        createdAt: (j as { createdAt?: Date }).createdAt ?? null,
      })),
      page,
      total,
      hasMore: page * limit < total,
    };
  }

  async adminJobAction(jobId: string, body: { action: "take_down" | "restore" | "delete"; reason?: string }, byName = "Fockis admin") {
    const job = await this.jobModel.findById(this.oid(jobId, "job")).exec();
    if (!job) throw new NotFoundException("Job not found.");
    if (body.action === "delete") {
      // Permanent. Applications already sent stay in applicants' history (same as an employer deleting a job).
      const reason = String(body.reason ?? "").trim();
      if (reason.length < 3) throw new BadRequestException("Give a reason to delete the job.");
      await job.deleteOne();
      this.pausedCache = null;
      this.logger.warn(`Job ${jobId} ("${(job as unknown as { title?: string }).title ?? ""}") deleted by ${byName}: ${reason}`);
      return { ok: true };
    }
    const doc = job as unknown as { takenDown?: boolean; takenDownReason?: string; takenDownAt?: Date; isApproved: boolean; employerId: Types.ObjectId; save(): Promise<unknown> };
    if (body.action === "take_down") {
      const reason = String(body.reason ?? "").trim();
      if (reason.length < 3) throw new BadRequestException("Give a reason to take the job down.");
      doc.takenDown = true;
      doc.takenDownReason = reason.slice(0, 2000);
      doc.takenDownAt = new Date();
      doc.isApproved = false;
      await doc.save();
    } else {
      doc.takenDown = false;
      doc.takenDownReason = undefined;
      await doc.save();
      await this.syncJobs(doc.employerId);
    }
    this.pausedCache = null;
    return { ok: true };
  }
}
