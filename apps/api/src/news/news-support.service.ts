/**
 * news-support.service.ts — reader support (donations, monthly/annual pledges,
 * fundraising campaigns) and the public request system (news tips, coverage,
 * interviews, corrections…).
 *
 * Donations use the existing UniversalPaymentService (Stripe). A donation is
 * marked paid only after the payment is verified with Stripe (confirm call or
 * the `payments.succeeded` webhook event) and its user, amount and currency
 * match. Campaign totals are computed from paid donations — never typed in.
 *
 * Recurring: the existing payment service has no stored-card subscriptions, so
 * monthly/annual support is a pledge — the first gift is charged now and the
 * donor gets a one-click renewal reminder when the next one is due.
 */

import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createHash, randomBytes, randomInt } from 'crypto';

import { UniversalPaymentService } from '../payments/services/payment.service';
import { PaymentPurpose } from '../payments/constants/payment-purpose.constants';
import { NewsAccessService, iso, oid, safeUrl, sameId, str } from './news-access.service';
import { NewsPublicService } from './news-public.service';
import { NEWS_MODEL, REQUEST_STATUSES, REQUEST_TYPES } from './news.schemas';

type AnyModel = Model<any>;
type Lean = Record<string, any>;

const REF_PREFIX = 'news-donation:';
const CONFIDENTIAL_TYPES = new Set(['news_tip', 'story']);
const REQUEST_LABELS: Record<string, string> = {
  coverage: 'Coverage request',
  interview: 'Interview request',
  news_tip: 'News tip',
  story: 'Story submission',
  advertising: 'Advertising request',
  partnership: 'Partnership request',
  correction: 'Correction request',
  general: 'General inquiry',
};
const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  received: 'Received',
  under_review: 'Under review',
  assigned: 'Assigned to a journalist',
  in_progress: 'In progress',
  more_info: 'More information needed',
  completed: 'Completed',
  declined: 'Declined',
};

interface PaymentRecord {
  _id: Types.ObjectId;
  id: string;
  userId: Types.ObjectId;
  purpose: string;
  referenceId: string;
  status: string;
  baseAmount: number;
  baseCurrency: string;
  chargedAmount: number;
  chargedCurrency: string;
  stripePaymentIntentId: string | null;
}

const hash = (v: string) => createHash('sha256').update(v).digest('hex');
const money = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class NewsSupportService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('FockisNewsSupport');
  private timer: NodeJS.Timeout | null = null;
  /** Small in-memory limiter for anonymous request submissions (per hashed IP). */
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly access: NewsAccessService,
    private readonly pub: NewsPublicService,
    private readonly payments: UniversalPaymentService,
    @InjectModel(NEWS_MODEL.donation) private readonly donations: AnyModel,
    @InjectModel(NEWS_MODEL.pledge) private readonly pledges: AnyModel,
    @InjectModel(NEWS_MODEL.campaign) private readonly campaigns: AnyModel,
    @InjectModel(NEWS_MODEL.request) private readonly requests: AnyModel,
  ) {}

  onModuleInit() {
    if (process.env.NEWS_SCHEDULER_DISABLED === 'true') return;
    // Pledge reminders: checked hourly.
    this.timer = setInterval(() => void this.remindPledges().catch((err) => this.logger.warn(`Pledges: ${String(err)}`)), 3_600_000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /* ==========================================================================
   * Public support page
   * ======================================================================== */

  async supportPage(slug: string, userId: string | null) {
    const o = await this.access.outletBySlug(slug);
    const rows = (await this.campaigns.find({ outletId: o._id, status: 'active' }).sort({ createdAt: -1 }).limit(10).lean().exec()) as Lean[];
    const totals = await this.pub.campaignTotals(rows.map((r) => r._id));
    const supporters = (await this.donations
      .find({ outletId: o._id, status: 'paid', showName: true, anonymous: false })
      .sort({ paidAt: -1 })
      .limit(12)
      .select('donorName message paidAt')
      .lean()
      .exec()) as Lean[];
    return {
      outlet: this.pub.outletCard(o),
      enabled: o.settings?.donationsEnabled !== false,
      message: o.settings?.supportMessage || '',
      currency: o.settings?.currency || 'USD',
      suggested: [5, 10, 25, 50],
      campaigns: rows.map((c) => this.pub.campaignCard(c, totals.get(String(c._id)))),
      supporters: supporters.map((s) => ({ name: s.donorName, message: s.message || '', at: iso(s.paidAt) })),
      signedIn: Boolean(userId),
      privacy: [
        'The media organization sees the amount, date, campaign and your message.',
        'It sees your name only if you choose to show it. Anonymous gifts show no name to the media.',
        'Card details are handled by Stripe and never stored by Fockis or the media.',
        'Donations are not automatically tax-deductible; ask the media organization about receipts for tax purposes.',
      ],
    };
  }

  async startDonation(userId: string, slug: string, input: Record<string, unknown>) {
    const o = await this.access.outletBySlug(slug);
    if (o.settings?.donationsEnabled === false) throw new ForbiddenException('This media organization is not accepting donations.');
    const amount = money(Number(input.amount));
    if (!Number.isFinite(amount) || amount < 1) throw new BadRequestException('The minimum donation is 1.');
    if (amount > 10_000) throw new BadRequestException('For gifts above 10,000 please contact the media organization.');
    const frequency = ['monthly', 'annual'].includes(String(input.frequency)) ? (String(input.frequency) as 'monthly' | 'annual') : 'once';
    const currency = o.settings?.currency || 'USD';
    let campaignId: Types.ObjectId | null = null;
    if (input.campaignId) {
      const c = (await this.campaigns.findOne({ _id: oid(input.campaignId, 'campaign ID'), outletId: o._id, status: 'active' }).lean().exec()) as Lean | null;
      if (!c) throw new BadRequestException('This campaign is not accepting donations.');
      if (c.deadline && c.deadline < new Date().toISOString().slice(0, 10)) throw new BadRequestException('This campaign has ended.');
      campaignId = c._id;
    }
    const anonymous = Boolean(input.anonymous);
    const showName = !anonymous && Boolean(input.showName);
    const me = await this.access.userName(userId);

    let pledgeId: Types.ObjectId | null = null;
    if (input.pledgeId) {
      // Renewal of an existing pledge.
      const p = (await this.pledges.findOne({ _id: oid(input.pledgeId, 'pledge ID'), userId: oid(userId), outletId: o._id, status: 'active' }).lean().exec()) as Lean | null;
      if (!p) throw new NotFoundException('Pledge not found.');
      pledgeId = p._id;
    } else if (frequency !== 'once') {
      const p = await this.pledges.create({ outletId: o._id, userId: oid(userId), campaignId, amount, currency, frequency, anonymous, showName, status: 'pending' });
      pledgeId = p._id;
    }

    const donation = await this.donations.create({
      outletId: o._id,
      campaignId,
      pledgeId,
      userId: oid(userId),
      amount,
      currency,
      frequency,
      anonymous,
      showName,
      message: str(input.message, 500),
      donorName: anonymous ? '' : me.name,
      status: 'pending',
    });
    const res = (await this.payments.createPayment(userId, {
      purpose: PaymentPurpose.NEWS_DONATION,
      referenceId: `${REF_PREFIX}${String(donation._id)}`,
      baseAmount: amount,
      baseCurrency: currency,
      country: /^[A-Za-z]{2}$/.test(String(input.country ?? '')) ? String(input.country).toUpperCase() : 'US',
      idempotencyKey: `news-donation-${String(donation._id)}`,
      metadata: { outletId: String(o._id), donationId: String(donation._id), campaignId: campaignId ? String(campaignId) : '' },
    } as never)) as { paymentId: string; clientSecret: string | null; stripePaymentIntentId?: string | null; chargedAmount: number; chargedCurrency: string };
    if (!res?.clientSecret) {
      await this.donations.updateOne({ _id: donation._id }, { $set: { status: 'failed' } }).exec();
      throw new BadRequestException('The secure payment could not be started. Please try again.');
    }
    await this.donations.updateOne({ _id: donation._id }, { $set: { paymentId: res.paymentId, paymentIntentId: res.stripePaymentIntentId ?? null } }).exec();
    return { donationId: String(donation._id), clientSecret: res.clientSecret, paymentIntentId: res.stripePaymentIntentId ?? null, amount: res.chargedAmount, currency: res.chargedCurrency, frequency };
  }

  async confirmDonation(userId: string, donationId: string, paymentIntentId: string) {
    const d = (await this.donations.findOne({ _id: oid(donationId, 'donation ID') }).lean().exec()) as Lean | null;
    if (!d || !sameId(d.userId, userId)) throw new NotFoundException('Donation not found.');
    if (d.status !== 'paid') {
      await this.payments.confirmPayment(userId, str(paymentIntentId, 200));
      const record = (await this.access.connection.collection('payments').findOne({ stripePaymentIntentId: str(paymentIntentId, 200) })) as unknown as PaymentRecord | null;
      if (!record || record.referenceId !== `${REF_PREFIX}${String(d._id)}`) throw new BadRequestException("This payment doesn't belong to this donation.");
      await this.fulfill(record);
    }
    const fresh = (await this.donations.findById(d._id).lean().exec()) as Lean;
    if (fresh.status !== 'paid') throw new BadRequestException("The payment hasn't completed yet. If you were charged, it will update automatically.");
    const o = (await this.access.outlets.findById(d.outletId).lean().exec()) as Lean;
    return this.receipt(fresh, o);
  }

  @OnEvent('payments.succeeded')
  async onPaymentSucceeded(payload: { paymentId?: string; purpose?: string; referenceId?: string }) {
    if (payload?.purpose !== PaymentPurpose.NEWS_DONATION || !String(payload.referenceId ?? '').startsWith(REF_PREFIX) || !payload.paymentId) return;
    try {
      const record = (await this.access.connection.collection('payments').findOne({ id: payload.paymentId })) as unknown as PaymentRecord | null;
      if (record) await this.fulfill(record);
    } catch (err) {
      this.logger.error(`News donation payment ${payload.paymentId} could not be applied: ${String(err)}`);
    }
  }

  /** Idempotent. Applies a verified Stripe payment to its donation. */
  private async fulfill(record: PaymentRecord) {
    if (record.purpose !== PaymentPurpose.NEWS_DONATION || record.status !== 'paid' || !record.referenceId.startsWith(REF_PREFIX)) return;
    const id = record.referenceId.slice(REF_PREFIX.length);
    if (!Types.ObjectId.isValid(id)) return;
    const d = (await this.donations.findById(id).lean().exec()) as Lean | null;
    if (!d || d.status === 'paid') return;
    const amount = Number(record.baseAmount ?? record.chargedAmount);
    const currency = String(record.baseCurrency ?? record.chargedCurrency).toUpperCase();
    if (!sameId(d.userId, record.userId) || currency !== String(d.currency).toUpperCase() || Math.abs(amount - Number(d.amount)) > 0.005) {
      this.logger.error(`Payment ${record.id} does not match donation ${id}.`);
      return;
    }
    const receiptNumber = `FN-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
    const updated = (await this.donations
      .findOneAndUpdate(
        { _id: d._id, status: { $ne: 'paid' } },
        { $set: { status: 'paid', paidAt: new Date(), paymentId: record.id, paymentIntentId: record.stripePaymentIntentId, chargedAmount: record.chargedAmount, chargedCurrency: record.chargedCurrency, receiptNumber } },
        { new: true },
      )
      .lean()
      .exec()) as Lean | null;
    if (!updated) return;
    if (d.pledgeId) {
      const p = (await this.pledges.findById(d.pledgeId).lean().exec()) as Lean | null;
      if (p) {
        const base = p.nextDueAt && new Date(p.nextDueAt) > new Date() ? new Date(p.nextDueAt) : new Date();
        const next = new Date(base);
        if (p.frequency === 'monthly') next.setMonth(next.getMonth() + 1);
        else next.setFullYear(next.getFullYear() + 1);
        await this.pledges.updateOne({ _id: p._id }, { $set: { status: p.status === 'cancelled' ? 'cancelled' : 'active', nextDueAt: next, remindedAt: null }, $inc: { paymentsCount: 1 } }).exec();
      }
    }
    const o = (await this.access.outlets.findById(d.outletId).lean().exec()) as Lean | null;
    if (!o) return;
    await this.access.notify([String(d.userId)], `Thank you for supporting ${o.name}`, `Your donation of ${Number(d.amount).toFixed(2)} ${d.currency} was received. Receipt ${receiptNumber}.`, `/news/my-support`, String(d._id), 'news_donation');
    const managers = await this.access.staffWith(o, 'manage_donations');
    await this.access.notify(managers, 'New donation', `${Number(d.amount).toFixed(2)} ${d.currency} from ${d.anonymous ? 'an anonymous supporter' : d.donorName || 'a supporter'}.`, `/news/admin/${o._id}/donations`, String(d._id), 'news_donation');
    await this.access.audit(o._id, null, 'donation_received', `${Number(d.amount).toFixed(2)} ${d.currency}`);
  }

  private receipt(d: Lean, o: Lean) {
    return {
      id: String(d._id),
      receiptNumber: d.receiptNumber,
      amount: d.amount,
      currency: d.currency,
      frequency: d.frequency,
      status: d.status,
      paidAt: iso(d.paidAt),
      anonymous: Boolean(d.anonymous),
      message: d.message || '',
      outlet: { name: o?.name ?? '', slug: o?.slug ?? '', logoUrl: o?.logoUrl ?? '' },
      note: 'This receipt confirms your payment. It is not a tax receipt unless the media organization issues one.',
    };
  }

  /** Donor's own history (all media). */
  async myDonations(userId: string) {
    const rows = (await this.donations.find({ userId: oid(userId), status: { $in: ['paid', 'refunded'] } }).sort({ paidAt: -1 }).limit(200).lean().exec()) as Lean[];
    const outlets = (await this.access.outlets.find({ _id: { $in: rows.map((r) => r.outletId) } }).select('name slug logoUrl').lean().exec()) as Lean[];
    const byId = new Map(outlets.map((o) => [String(o._id), o]));
    const pledges = (await this.pledges.find({ userId: oid(userId), status: 'active' }).lean().exec()) as Lean[];
    return {
      items: rows.map((d) => this.receipt(d, byId.get(String(d.outletId)) ?? {})),
      pledges: await Promise.all(
        pledges.map(async (p) => {
          const o = byId.get(String(p.outletId)) ?? ((await this.access.outlets.findById(p.outletId).select('name slug logoUrl').lean().exec()) as Lean | null) ?? {};
          return { id: String(p._id), amount: p.amount, currency: p.currency, frequency: p.frequency, nextDueAt: iso(p.nextDueAt), due: Boolean(p.nextDueAt && new Date(p.nextDueAt) <= new Date()), outlet: { name: o.name ?? '', slug: o.slug ?? '' }, campaignId: p.campaignId ? String(p.campaignId) : null };
        }),
      ),
    };
  }

  async cancelPledge(userId: string, pledgeId: string) {
    const r = await this.pledges.updateOne({ _id: oid(pledgeId, 'pledge ID'), userId: oid(userId), status: { $ne: 'cancelled' } }, { $set: { status: 'cancelled' } }).exec();
    if (!r.matchedCount) throw new NotFoundException('Pledge not found.');
    return { ok: true };
  }

  private async remindPledges() {
    const due = (await this.pledges.find({ status: 'active', nextDueAt: { $lte: new Date() }, remindedAt: null }).limit(500).lean().exec()) as Lean[];
    for (const p of due) {
      const o = (await this.access.outlets.findById(p.outletId).select('name slug status').lean().exec()) as Lean | null;
      await this.pledges.updateOne({ _id: p._id }, { $set: { remindedAt: new Date() } }).exec();
      if (!o || o.status !== 'active') continue;
      await this.access.notify([String(p.userId)], `Your ${p.frequency} support for ${o.name} is due`, `Renew your ${Number(p.amount).toFixed(2)} ${p.currency} gift in one click, or cancel anytime.`, `/news/my-support`, String(p._id), 'news_donation');
    }
  }

  /* ==========================================================================
   * Donation administration
   * ======================================================================== */

  async adminDonations(outletId: string, userId: string, q: { status?: string; campaignId?: string; frequency?: string; page?: number }) {
    const { outlet, actor } = await this.access.require(outletId, userId, 'view_finance', 'Only finance staff can see donations.');
    const page = Math.max(1, Math.min(500, Number(q.page) || 1));
    const filter: Record<string, unknown> = { outletId: outlet._id, status: { $in: ['paid', 'refunded'] } };
    if (q.status && ['paid', 'refunded', 'pending', 'failed'].includes(q.status)) filter.status = q.status;
    if (q.campaignId) filter.campaignId = oid(q.campaignId, 'campaign ID');
    if (q.frequency && ['once', 'monthly', 'annual'].includes(q.frequency)) filter.frequency = q.frequency;
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const [rows, total, summary, monthly, campaignRows, pledgeCount] = await Promise.all([
      this.donations.find(filter).sort({ paidAt: -1, createdAt: -1 }).skip((page - 1) * 30).limit(30).lean().exec() as Promise<Lean[]>,
      this.donations.countDocuments(filter).exec(),
      this.donations.aggregate([{ $match: { outletId: outlet._id, status: 'paid' } }, { $group: { _id: '$frequency', total: { $sum: '$amount' }, n: { $sum: 1 } } }]).exec() as Promise<{ _id: string; total: number; n: number }[]>,
      this.donations.aggregate([{ $match: { outletId: outlet._id, status: 'paid', paidAt: { $gte: yearStart } } }, { $group: { _id: { $month: '$paidAt' }, total: { $sum: '$amount' } } }, { $sort: { _id: 1 } }]).exec() as Promise<{ _id: number; total: number }[]>,
      this.campaigns.find({ outletId: outlet._id }).select('title').lean().exec() as Promise<Lean[]>,
      this.pledges.countDocuments({ outletId: outlet._id, status: 'active' }).exec(),
    ]);
    const titles = new Map(campaignRows.map((c) => [String(c._id), c.title]));
    const sum = (f?: string) => money(summary.filter((s) => !f || s._id === f).reduce((a, s) => a + s.total, 0));
    return {
      currency: outlet.settings?.currency || 'USD',
      canRefund: actor.can('manage_donations'),
      summary: { total: sum(), oneTime: sum('once'), recurring: money(sum('monthly') + sum('annual')), count: summary.reduce((a, s) => a + s.n, 0), activePledges: pledgeCount },
      monthly: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: money(monthly.find((m) => m._id === i + 1)?.total ?? 0) })),
      page,
      total,
      items: rows.map((d) => ({
        id: String(d._id),
        amount: d.amount,
        currency: d.currency,
        frequency: d.frequency,
        // Donor identity is shown only when the donor chose to show it.
        donor: d.anonymous ? 'Anonymous' : d.showName ? d.donorName || 'Supporter' : 'Private supporter',
        anonymous: Boolean(d.anonymous),
        message: d.message || '',
        campaign: d.campaignId ? titles.get(String(d.campaignId)) ?? '' : '',
        status: d.status,
        receiptNumber: d.receiptNumber,
        paidAt: iso(d.paidAt),
        refundedAt: iso(d.refundedAt),
      })),
    };
  }

  async refund(outletId: string, userId: string, donationId: string) {
    const { outlet, actor } = await this.access.require(outletId, userId, 'manage_donations', 'Only finance administrators can refund donations.');
    const d = (await this.donations.findOne({ _id: oid(donationId, 'donation ID'), outletId: outlet._id }).lean().exec()) as Lean | null;
    if (!d) throw new NotFoundException('Donation not found.');
    if (d.status !== 'paid') throw new ConflictException('Only paid donations can be refunded.');
    const record = (await this.access.connection.collection('payments').findOne({ id: d.paymentId })) as unknown as PaymentRecord | null;
    if (!record) throw new BadRequestException('The payment record was not found.');
    await this.payments.refund(String(d.userId), String(record._id));
    await this.donations.updateOne({ _id: d._id, status: 'paid' }, { $set: { status: 'refunded', refundedAt: new Date() } }).exec();
    await this.access.notify([String(d.userId)], `Refund from ${outlet.name}`, `Your donation of ${Number(d.amount).toFixed(2)} ${d.currency} was refunded.`, `/news/my-support`, String(d._id), 'news_donation');
    await this.access.audit(outlet._id, actor, 'donation_refunded', `${Number(d.amount).toFixed(2)} ${d.currency} · ${d.receiptNumber}`);
    return { ok: true };
  }

  async exportDonations(outletId: string, userId: string) {
    const { outlet } = await this.access.require(outletId, userId, 'view_finance', 'Only finance staff can export donations.');
    const rows = (await this.donations.find({ outletId: outlet._id, status: { $in: ['paid', 'refunded'] } }).sort({ paidAt: -1 }).limit(10_000).lean().exec()) as Lean[];
    return {
      items: rows.map((d) => ({ date: iso(d.paidAt), receipt: d.receiptNumber, amount: d.amount, currency: d.currency, frequency: d.frequency, donor: d.anonymous ? 'Anonymous' : d.showName ? d.donorName : 'Private supporter', status: d.status, message: d.message || '' })),
    };
  }

  /* ==========================================================================
   * Campaigns
   * ======================================================================== */

  async adminCampaigns(outletId: string, userId: string) {
    const { outlet, actor } = await this.access.require(outletId, userId);
    const rows = (await this.campaigns.find({ outletId: outlet._id }).sort({ createdAt: -1 }).lean().exec()) as Lean[];
    const totals = await this.pub.campaignTotals(rows.map((r) => r._id));
    return { canManage: actor.can('manage_donations'), items: rows.map((c) => this.pub.campaignCard(c, totals.get(String(c._id)))) };
  }

  async saveCampaign(outletId: string, userId: string, campaignId: string | null, input: Record<string, unknown>) {
    const { outlet, actor } = await this.access.require(outletId, userId, 'manage_donations', 'Only finance administrators can manage campaigns.');
    const title = str(input.title, 160);
    if (title.length < 3) throw new BadRequestException('Give the campaign a title.');
    const goal = money(Number(input.goal));
    if (!(goal >= 1)) throw new BadRequestException('Set a fundraising goal.');
    const deadline = /^\d{4}-\d{2}-\d{2}$/.test(String(input.deadline ?? '')) ? String(input.deadline) : '';
    const status = ['draft', 'active', 'closed'].includes(String(input.status)) ? String(input.status) : 'active';
    const data = { title, description: str(input.description, 5000), coverUrl: safeUrl(input.coverUrl), goal, deadline, status, currency: outlet.settings?.currency || 'USD' };
    let doc;
    if (campaignId) {
      doc = await this.campaigns.findOne({ _id: oid(campaignId, 'campaign ID'), outletId: outlet._id });
      if (!doc) throw new NotFoundException('Campaign not found.');
      Object.assign(doc, data);
      const update = str(input.update, 1000);
      if (update) doc.updates.push({ at: new Date(), text: update, byName: actor.name });
      await doc.save();
    } else doc = await this.campaigns.create({ ...data, outletId: outlet._id });
    await this.access.audit(outlet._id, actor, campaignId ? 'campaign_updated' : 'campaign_created', title);
    const totals = await this.pub.campaignTotals([doc._id]);
    return this.pub.campaignCard(doc.toObject(), totals.get(String(doc._id)));
  }

  /* ==========================================================================
   * Requests — public submission & tracking
   * ======================================================================== */

  private limit(key: string, max: number, windowMs: number) {
    const now = Date.now();
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (list.length >= max) throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    list.push(now);
    this.hits.set(key, list);
    if (this.hits.size > 5000) this.hits.clear();
  }

  async submitRequest(userId: string | null, slug: string, input: Record<string, unknown>, meta: { ip?: string }) {
    const o = await this.access.outletBySlug(slug);
    if (o.settings?.requestsEnabled === false) throw new ForbiddenException('This media organization is not accepting requests.');
    // Spam protection: honeypot field and per-sender rate limits.
    if (str(input.website, 100)) throw new BadRequestException('Request rejected.');
    this.limit(`ip:${hash(meta.ip ?? 'unknown').slice(0, 24)}`, 6, 3_600_000);
    if (userId) this.limit(`u:${userId}`, 10, 3_600_000);
    const type = String(input.type);
    if (!(REQUEST_TYPES as readonly string[]).includes(type)) throw new BadRequestException('Choose the type of request.');
    const subject = str(input.subject, 200);
    const description = str(input.description, 8000);
    if (subject.length < 4) throw new BadRequestException('Add a subject.');
    if (description.length < 20) throw new BadRequestException('Describe your request in a little more detail (at least 20 characters).');
    const anonymous = CONFIDENTIAL_TYPES.has(type) && Boolean(input.anonymous);
    const email = str(input.email, 200).toLowerCase();
    const contactName = anonymous ? '' : str(input.contactName, 120);
    if (!anonymous) {
      if (contactName.length < 2) throw new BadRequestException('Add your name.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Add a valid email so the newsroom can reply.');
    } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('The email address is not valid.');
    const attachments = (Array.isArray(input.attachments) ? input.attachments : []).map((u) => safeUrl(u)).filter(Boolean).slice(0, 6);
    const reference = `${slugPrefix(o.slug)}-${new Date().getFullYear()}-${String(randomInt(0, 1_000_000)).padStart(6, '0')}`;
    const trackingCode = randomBytes(9).toString('base64url');
    const doc = await this.requests.create({
      outletId: o._id,
      reference,
      type,
      subject,
      description,
      contactName,
      email,
      phone: anonymous ? '' : str(input.phone, 40),
      location: str(input.location, 200),
      attachments,
      confidential: Boolean(input.confidential) || anonymous,
      anonymous,
      submitterUserId: anonymous ? null : userId ? oid(userId) : null,
      trackingHash: hash(`${reference}:${trackingCode}`),
      status: 'submitted',
      priority: type === 'news_tip' || type === 'correction' ? 'high' : 'normal',
      history: [{ at: new Date(), byName: 'Submitter', action: 'submitted' }],
    });
    const perm = doc.confidential ? 'view_confidential_tips' : 'manage_requests';
    const staff = await this.access.staffWith(o, perm);
    // Notification never includes the content of confidential submissions.
    await this.access.notify(staff, `${REQUEST_LABELS[type]} — ${o.name}`, doc.confidential ? `A confidential submission arrived (${reference}).` : `${subject} (${reference})`, `/news/admin/${o._id}/requests`, String(doc._id), 'news_request');
    return {
      reference,
      trackingCode,
      status: 'submitted',
      message: 'Your request was received. Keep your reference number and tracking code to check its status.',
      notice: anonymous ? 'You chose to submit anonymously. Fockis does not attach your account to this submission, but confidentiality cannot be guaranteed in every situation (for example, details in your message may identify you).' : '',
    };
  }

  async trackRequest(reference: string, code: string, userId: string | null) {
    this.limit(`track:${hash(reference).slice(0, 16)}`, 30, 3_600_000);
    const r = (await this.requests.findOne({ reference: str(reference, 40).toUpperCase() }).lean().exec()) as Lean | null;
    const ok = r && (hash(`${r.reference}:${str(code, 40)}`) === r.trackingHash || (userId && sameId(r.submitterUserId, userId)));
    if (!r || !ok) throw new NotFoundException('No request matches this reference and code.');
    const o = (await this.access.outlets.findById(r.outletId).select('name slug logoUrl').lean().exec()) as Lean | null;
    return {
      reference: r.reference,
      type: r.type,
      typeLabel: REQUEST_LABELS[r.type],
      subject: r.subject,
      status: r.status,
      statusLabel: STATUS_LABELS[r.status],
      submittedAt: iso(r.createdAt),
      updatedAt: iso(r.updatedAt),
      outlet: { name: o?.name ?? '', slug: o?.slug ?? '' },
      // Internal notes are never included.
      messages: (r.messages ?? []).map((m: Lean) => ({ at: iso(m.at), from: m.from, byName: m.from === 'staff' ? o?.name ?? 'Newsroom' : 'You', text: m.text })),
      canReply: !['completed', 'declined'].includes(r.status),
    };
  }

  async replyAsSubmitter(reference: string, code: string, userId: string | null, text: string) {
    await this.trackRequest(reference, code, userId);
    const body = str(text, 4000);
    if (body.length < 2) throw new BadRequestException('Write a message.');
    const r = await this.requests.findOne({ reference: str(reference, 40).toUpperCase() });
    if (!r || ['completed', 'declined'].includes(r.status)) throw new ConflictException('This request is closed.');
    r.messages.push({ at: new Date(), from: 'submitter', byName: 'Submitter', text: body });
    if (r.status === 'more_info') r.status = 'under_review';
    r.history.push({ at: new Date(), byName: 'Submitter', action: 'replied' });
    await r.save();
    const o = (await this.access.outlets.findById(r.outletId).lean().exec()) as Lean;
    const staff = r.assigneeUserId ? [String(r.assigneeUserId)] : await this.access.staffWith(o, r.confidential ? 'view_confidential_tips' : 'manage_requests');
    await this.access.notify(staff, `Reply on ${r.reference}`, r.confidential ? 'The submitter added information.' : body.slice(0, 160), `/news/admin/${o._id}/requests`, String(r._id), 'news_request');
    return this.trackRequest(reference, code, userId);
  }

  /* ==========================================================================
   * Requests — newsroom
   * ======================================================================== */

  private async requestGate(outletId: string, userId: string) {
    const { outlet, actor } = await this.access.require(outletId, userId);
    const canAll = actor.can('manage_requests');
    const canConfidential = actor.can('view_confidential_tips');
    return { outlet, actor, canAll, canConfidential };
  }

  /** What this staff member may see: assigned requests always; others by permission. */
  private visibleFilter(outletId: Types.ObjectId, userId: string, canAll: boolean, canConfidential: boolean) {
    const or: Record<string, unknown>[] = [{ assigneeUserId: oid(userId) }];
    if (canAll) or.push({ confidential: false });
    if (canConfidential) or.push({ confidential: true });
    return { outletId, $or: or };
  }

  async adminRequests(outletId: string, userId: string, q: { type?: string; status?: string; page?: number }) {
    const { outlet, canAll, canConfidential } = await this.requestGate(outletId, userId);
    const page = Math.max(1, Math.min(500, Number(q.page) || 1));
    const base = this.visibleFilter(outlet._id, userId, canAll, canConfidential);
    const filter: Record<string, unknown> = { ...base };
    if (q.type && (REQUEST_TYPES as readonly string[]).includes(q.type)) filter.type = q.type;
    if (q.status === 'open') filter.status = { $nin: ['completed', 'declined'] };
    else if (q.status && (REQUEST_STATUSES as readonly string[]).includes(q.status)) filter.status = q.status;
    const [rows, total, counts] = await Promise.all([
      this.requests.find(filter).select('-internalNotes -trackingHash').sort({ createdAt: -1 }).skip((page - 1) * 30).limit(30).lean().exec() as Promise<Lean[]>,
      this.requests.countDocuments(filter).exec(),
      this.requests.aggregate([{ $match: { ...base, status: { $nin: ['completed', 'declined'] } } }, { $group: { _id: '$type', n: { $sum: 1 } } }]).exec() as Promise<{ _id: string; n: number }[]>,
    ]);
    return {
      page,
      total,
      openByType: Object.fromEntries(counts.map((c) => [c._id, c.n])),
      canAssign: canAll || canConfidential,
      items: rows.map((r) => ({
        id: String(r._id),
        reference: r.reference,
        type: r.type,
        subject: r.subject,
        status: r.status,
        priority: r.priority,
        confidential: Boolean(r.confidential),
        anonymous: Boolean(r.anonymous),
        contactName: r.anonymous ? 'Anonymous' : r.contactName,
        assigneeName: r.assigneeName || '',
        createdAt: iso(r.createdAt),
        updatedAt: iso(r.updatedAt),
      })),
    };
  }

  async getRequest(outletId: string, userId: string, requestId: string) {
    const { outlet, canAll, canConfidential } = await this.requestGate(outletId, userId);
    const r = (await this.requests.findOne({ _id: oid(requestId, 'request ID'), ...this.visibleFilter(outlet._id, userId, canAll, canConfidential) }).lean().exec()) as Lean | null;
    if (!r) throw new NotFoundException('Request not found.');
    if (r.status === 'submitted') {
      await this.requests.updateOne({ _id: r._id, status: 'submitted' }, { $set: { status: 'received' }, $push: { history: { at: new Date(), byName: 'Newsroom', action: 'received' } } }).exec();
      r.status = 'received';
    }
    return {
      id: String(r._id),
      reference: r.reference,
      type: r.type,
      typeLabel: REQUEST_LABELS[r.type],
      subject: r.subject,
      description: r.description,
      contactName: r.anonymous ? '' : r.contactName,
      email: r.email,
      phone: r.phone,
      location: r.location,
      attachments: r.attachments ?? [],
      confidential: Boolean(r.confidential),
      anonymous: Boolean(r.anonymous),
      status: r.status,
      priority: r.priority,
      assigneeUserId: r.assigneeUserId ? String(r.assigneeUserId) : null,
      assigneeName: r.assigneeName || '',
      internalNotes: (r.internalNotes ?? []).map((n: Lean) => ({ at: iso(n.at), byName: n.byName, text: n.text })),
      messages: (r.messages ?? []).map((m: Lean) => ({ at: iso(m.at), from: m.from, byName: m.byName, text: m.text })),
      history: (r.history ?? []).map((h: Lean) => ({ at: iso(h.at), byName: h.byName, action: h.action })),
      createdAt: iso(r.createdAt),
      canAssign: canAll || canConfidential,
    };
  }

  async updateRequest(outletId: string, userId: string, requestId: string, input: Record<string, unknown>) {
    const { outlet, actor, canAll, canConfidential } = await this.requestGate(outletId, userId);
    const r = await this.requests.findOne({ _id: oid(requestId, 'request ID'), ...this.visibleFilter(outlet._id, userId, canAll, canConfidential) });
    if (!r) throw new NotFoundException('Request not found.');
    const log = (action: string) => r.history.push({ at: new Date(), byName: actor.name, action });
    let notifySubmitter = '';
    if (input.status !== undefined) {
      const s = String(input.status);
      if (!(REQUEST_STATUSES as readonly string[]).includes(s)) throw new BadRequestException('Unknown status.');
      if (s !== r.status) {
        r.status = s as never;
        log(`status: ${STATUS_LABELS[s]}`);
        notifySubmitter = `Your request ${r.reference} is now: ${STATUS_LABELS[s]}.`;
      }
    }
    if (input.priority !== undefined && ['low', 'normal', 'high', 'urgent'].includes(String(input.priority))) {
      r.priority = String(input.priority) as never;
      log(`priority: ${r.priority}`);
    }
    if (input.assigneeUserId !== undefined) {
      if (!(canAll || canConfidential)) throw new ForbiddenException('You cannot assign requests.');
      if (!input.assigneeUserId) {
        r.assigneeUserId = null;
        r.assigneeName = '';
        log('unassigned');
      } else {
        const m = (await this.access.members.findOne({ outletId: outlet._id, userId: oid(input.assigneeUserId, 'user ID'), status: 'active' }).lean().exec()) as Lean | null;
        const isOwner = sameId(outlet.ownerUserId, input.assigneeUserId);
        if (!m && !isOwner) throw new BadRequestException('Assign the request to a newsroom team member.');
        r.assigneeUserId = oid(input.assigneeUserId);
        r.assigneeName = m?.displayName || (await this.access.userName(String(input.assigneeUserId))).name;
        if (['submitted', 'received', 'under_review'].includes(r.status)) r.status = 'assigned';
        log(`assigned to ${r.assigneeName}`);
        await this.access.notify([String(input.assigneeUserId)], `Request assigned to you — ${outlet.name}`, r.confidential ? `Confidential request ${r.reference}` : `${r.subject} (${r.reference})`, `/news/admin/${outlet._id}/requests`, String(r._id), 'news_request');
      }
    }
    const note = str(input.internalNote, 4000);
    if (note) {
      r.internalNotes.push({ at: new Date(), byName: actor.name, text: note });
      log('internal note added');
    }
    const reply = str(input.reply, 4000);
    if (reply) {
      r.messages.push({ at: new Date(), from: 'staff', byName: actor.name, text: reply });
      if (input.askMoreInfo === true) r.status = 'more_info';
      log(input.askMoreInfo === true ? 'asked for more information' : 'replied');
      notifySubmitter = input.askMoreInfo === true ? `${outlet.name} needs more information about ${r.reference}.` : `${outlet.name} replied to ${r.reference}.`;
    }
    await r.save();
    if (notifySubmitter && r.submitterUserId) await this.access.notify([String(r.submitterUserId)], `Update on your request`, notifySubmitter, `/news/requests/track?ref=${encodeURIComponent(r.reference)}`, String(r._id), 'news_request');
    await this.access.audit(outlet._id, actor, 'request_updated', r.reference);
    return this.getRequest(outletId, userId, requestId);
  }
}

function slugPrefix(slug: string) {
  const letters = slug.replace(/[^a-z]/g, '').toUpperCase();
  return (letters.slice(0, 3) || 'FKN').padEnd(3, 'X');
}
