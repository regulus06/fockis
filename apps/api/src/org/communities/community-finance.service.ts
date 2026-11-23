/**
 * community-finance.service.ts
 * -----------------------------------------------------------------------------
 * Group Finance Center and fundraising.
 *
 *  - Each group has its own records (church_group_transactions), always under
 *    church oversight: church leadership sees every group; group leaders and
 *    treasurers see only their group; members see only their own giving.
 *  - Digital contributions use the existing universal Fockis payment service
 *    (one Stripe integration, the church's account). purpose "church",
 *    referenceId = the transaction ID, metadata = organization / group /
 *    campaign. The payment service emits "payments.succeeded"; we verify the
 *    stored payment (user + amount + currency) before marking it paid.
 *  - Nobody withdraws money here: expenses and fund requests are approval
 *    records; payouts stay with the church's own payment account.
 *  - Expenses: submitted by leader/treasurer → approved/rejected by another
 *    group manager or church leadership → paid.
 *  - Fund requests (money from the church): submitted → under review (church)
 *    → approved/rejected by church leadership → paid. Every step is logged.
 * -----------------------------------------------------------------------------
 */

import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { Connection, Model, Types } from 'mongoose';

import { ChurchGroup, ChurchGroupDocument } from '../groups/schemas/church-group.schema';
import { Membership, MembershipDocument } from '../members/schemas/membership.schema';
import { MembershipStatus } from '../enums/membership-status.enum';
import { UniversalPaymentService } from '../../payments/services/payment.service';
import { PaymentPurpose } from '../../payments/constants/payment-purpose.constants';
import { CommunityAccessService, sameId, type GroupRights, type LeanGroup } from './community-access.service';
import { CommunitiesService } from './communities.service';
import {
  GroupAttendance,
  GroupAttendanceDocument,
  GroupCampaign,
  GroupCampaignDocument,
  GroupMeeting,
  GroupMeetingDocument,
  GroupMemberRecord,
  GroupMemberRecordDocument,
  GroupTransaction,
  GroupTransactionDocument,
} from './community.schemas';

type AnyModel = Model<any>;
const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d ? new Date(String(d)).toISOString() : null);
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const round = (n: number) => Math.round(n * 100) / 100;
const REF_PREFIX = 'group-tx:';
const INCOME = ['contribution', 'donation', 'offering'];
const PAID_INCOME = ['paid', 'recorded'];

interface PaymentRecord {
  id: string;
  userId: Types.ObjectId;
  purpose: string;
  referenceId: string;
  status: string;
  chargedAmount: number;
  chargedCurrency: string;
  stripePaymentIntentId: string | null;
}

@Injectable()
export class CommunityFinanceService {
  private readonly logger = new Logger(CommunityFinanceService.name);

  constructor(
    @InjectModel(GroupTransaction.name) private readonly txModel: Model<GroupTransactionDocument>,
    @InjectModel(GroupCampaign.name) private readonly campaignModel: Model<GroupCampaignDocument>,
    @InjectModel(ChurchGroup.name) private readonly groupModel: Model<ChurchGroupDocument>,
    @InjectModel(Membership.name) private readonly membershipModel: Model<MembershipDocument>,
    @InjectModel(GroupMemberRecord.name) private readonly recordModel: Model<GroupMemberRecordDocument>,
    @InjectModel(GroupMeeting.name) private readonly meetingModel: Model<GroupMeetingDocument>,
    @InjectModel(GroupAttendance.name) private readonly attendanceModel: Model<GroupAttendanceDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly access: CommunityAccessService,
    private readonly communities: CommunitiesService,
    private readonly payments: UniversalPaymentService,
  ) {}

  private get m() {
    return {
      tx: this.txModel as unknown as AnyModel,
      campaign: this.campaignModel as unknown as AnyModel,
      group: this.groupModel as unknown as AnyModel,
      member: this.membershipModel as unknown as AnyModel,
      record: this.recordModel as unknown as AnyModel,
      meeting: this.meetingModel as unknown as AnyModel,
      attendance: this.attendanceModel as unknown as AnyModel,
    };
  }

  private oid(v: string, label: string) {
    return this.access.toId(v, label);
  }

  private amountOf(v: unknown) {
    const n = round(Number(v));
    if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) throw new BadRequestException('Enter an amount greater than zero.');
    return n;
  }

  private txView(t: Record<string, any>, r: GroupRights | null, campaigns: Map<string, string>) {
    const own = r ? sameId(t.userId, r.actor.userId) : false;
    const isIncome = INCOME.includes(t.kind);
    return {
      id: String(t._id),
      kind: t.kind,
      amount: t.amount,
      currency: t.currency,
      purpose: t.purpose ?? '',
      category: t.category ?? '',
      description: t.description ?? '',
      date: t.date || (t.createdAt ? iso(t.createdAt)!.slice(0, 10) : ''),
      receiptUrl: t.receiptUrl ?? '',
      receiptNumber: t.receiptNumber ?? '',
      campaignId: t.campaignId ? String(t.campaignId) : null,
      campaignTitle: t.campaignId ? (campaigns.get(String(t.campaignId)) ?? '') : '',
      // Contributors' names are never shown to other members.
      personName: isIncome && r && !r.canViewFinance && !own ? '' : (t.personName ?? ''),
      source: t.source,
      status: t.status,
      paidAt: iso(t.paidAt),
      createdAt: iso(t.createdAt),
      isMine: own,
      steps: r?.canViewFinance || own ? (t.steps ?? []).map((s: Record<string, any>) => ({ action: s.action, note: s.note ?? '', byName: s.byName ?? '', at: iso(s.at) })) : [],
    };
  }

  /* ==========================================================================
     FINANCE CENTER
     ========================================================================== */

  async summary(organizationId: string, userId: string, groupId: string) {
    const r = await this.access.require(organizationId, userId, groupId, 'canViewFinance', 'Group finances are visible to the group leader, treasurer and church leadership.');
    this.access.requireService(r, 'finance');
    return this.computeSummary(r.group, r.settings.currency, r.settings.annualBudget);
  }

  private async computeSummary(g: LeanGroup, currency: string, annualBudget: number | null) {
    const agg = (await this.m.tx.aggregate([{ $match: { groupId: g._id } }, { $group: { _id: { k: '$kind', s: '$status' }, total: { $sum: '$amount' }, n: { $sum: 1 } } }])) as Array<{ _id: { k: string; s: string }; total: number; n: number }>;
    const sum = (kinds: string[], statuses: string[]) => round(agg.filter((a) => kinds.includes(a._id.k) && statuses.includes(a._id.s)).reduce((x, a) => x + a.total, 0));
    const count = (kinds: string[], statuses: string[]) => agg.filter((a) => kinds.includes(a._id.k) && statuses.includes(a._id.s)).reduce((x, a) => x + a.n, 0);
    const contributions = sum(INCOME, PAID_INCOME);
    const fundsReceived = sum(['fund_request'], ['paid']);
    const expenses = sum(['expense'], ['approved', 'paid']);
    const contributors = (await this.m.tx.distinct('userId', { groupId: g._id, kind: { $in: INCOME }, status: { $in: PAID_INCOME }, userId: { $ne: null } })).length;
    const campaigns = (await this.m.campaign.find({ groupId: g._id, status: 'active' }).lean().exec()) as Array<Record<string, any>>;
    const raised = await this.raisedBy(campaigns.map((c) => c._id));
    const goal = campaigns.reduce((a, c) => a + Number(c.goalAmount || 0), 0);
    const collected = campaigns.reduce((a, c) => a + (raised.get(String(c._id)) ?? 0), 0);
    return {
      currency,
      annualBudget,
      totalContributions: contributions,
      fundsFromChurch: fundsReceived,
      totalExpenses: expenses,
      availableBalance: round(contributions + fundsReceived - expenses),
      totalContributors: contributors,
      pendingRequests: count(['expense', 'fund_request'], ['submitted', 'under_review']),
      fundraising: { campaigns: campaigns.length, goal: round(goal), collected: round(collected), progress: goal ? Math.min(100, Math.round((collected / goal) * 100)) : null },
    };
  }

  async transactions(organizationId: string, userId: string, groupId: string, q: { kind?: string; status?: string; page?: string }) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    this.access.requireService(r, 'finance');
    const filter: Record<string, unknown> = { groupId: r.group._id };
    // Members only ever see their own records.
    if (!r.canViewFinance) filter.userId = new Types.ObjectId(userId);
    if (q.kind) filter.kind = q.kind === 'income' ? { $in: INCOME } : q.kind;
    if (q.status) filter.status = q.status;
    const page = Math.max(1, Math.floor(Number(q.page) || 1));
    const [rows, total] = await Promise.all([
      this.m.tx.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 50).limit(50).lean().exec(),
      this.m.tx.countDocuments(filter),
    ]);
    const campaigns = await this.campaignTitles(r.group._id);
    return { page, total, canManage: r.canManageFinance, canApproveChurchFunds: r.canApproveChurchFunds, items: (rows as Array<Record<string, any>>).map((t) => this.txView(t, r, campaigns)) };
  }

  private async campaignTitles(groupId: Types.ObjectId) {
    const rows = (await this.m.campaign.find({ groupId }).select('title').lean().exec()) as Array<{ _id: Types.ObjectId; title: string }>;
    return new Map(rows.map((c) => [String(c._id), c.title]));
  }

  /** Manual entries by the treasurer/leader: cash contributions, expenses, fund requests. */
  async createRecord(organizationId: string, userId: string, groupId: string, input: Record<string, unknown>) {
    const r = await this.access.require(organizationId, userId, groupId, 'canManageFinance', 'Only the group leader or treasurer can record finances.');
    this.access.requireService(r, 'finance');
    const kind = String(input.kind);
    if (!['contribution', 'donation', 'offering', 'expense', 'fund_request'].includes(kind)) throw new BadRequestException('Choose what you are recording.');
    const amount = this.amountOf(input.amount);
    const description = str(input.description, 2000);
    const purpose = str(input.purpose, 200);
    if (!purpose && !description) throw new BadRequestException('Describe the purpose.');
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(input.date ?? '')) ? String(input.date) : new Date().toISOString().slice(0, 10);
    const receiptUrl = /^(\/|https?:\/\/)/.test(String(input.receiptUrl ?? '')) ? str(input.receiptUrl, 600) : '';
    let campaignId: Types.ObjectId | null = null;
    if (input.campaignId && Types.ObjectId.isValid(String(input.campaignId))) {
      const c = await this.m.campaign.findOne({ _id: new Types.ObjectId(String(input.campaignId)), groupId: r.group._id }).lean().exec();
      if (!c) throw new BadRequestException('Campaign not found.');
      campaignId = new Types.ObjectId(String(input.campaignId));
    }
    let personName = str(input.personName, 120);
    let membershipId: Types.ObjectId | null = null;
    let personUser: Types.ObjectId | null = null;
    if (INCOME.includes(kind) && input.membershipId && Types.ObjectId.isValid(String(input.membershipId))) {
      const p = (await this.m.member.findOne({ _id: new Types.ObjectId(String(input.membershipId)), organizationId: r.group.organizationId }).select('profile.displayName userId').lean().exec()) as Record<string, any> | null;
      if (p) {
        membershipId = p._id;
        personUser = p.userId;
        personName = p.profile?.displayName ?? personName;
      }
    }
    const status = INCOME.includes(kind) ? 'recorded' : 'submitted';
    const doc = await this.m.tx.create({
      organizationId: r.group.organizationId,
      groupId: r.group._id,
      kind,
      amount,
      currency: r.settings.currency,
      purpose,
      category: str(input.category, 60),
      description,
      date,
      receiptUrl,
      campaignId,
      membershipId: INCOME.includes(kind) ? membershipId : r.actor.membershipId ? new Types.ObjectId(r.actor.membershipId) : null,
      userId: INCOME.includes(kind) ? personUser : new Types.ObjectId(userId),
      personName: INCOME.includes(kind) ? personName : r.actor.displayName,
      source: 'manual',
      status,
      receiptNumber: INCOME.includes(kind) ? this.receiptNumber() : '',
      paidAt: INCOME.includes(kind) ? new Date() : null,
      steps: [{ action: INCOME.includes(kind) ? 'recorded' : 'submitted', note: '', byName: r.actor.displayName, byUserId: new Types.ObjectId(userId), at: new Date() }],
    });
    if (kind === 'fund_request') {
      const to = (await this.communities.reviewerUserIds(organizationId)).filter((u) => u !== userId);
      await this.communities.notify(to, 'Group fund request', `${r.group.name}: ${purpose || description.slice(0, 60)} (${amount.toFixed(2)} ${r.settings.currency}).`, this.communities.groupLink(organizationId, groupId, 'finance'), String(doc._id));
    } else if (kind === 'expense') {
      const to = (await this.communities.leaderUserIds(r.group, ['leader', 'treasurer'])).filter((u) => u !== userId);
      await this.communities.notify(to, 'Expense awaiting approval', `${r.group.name}: ${purpose || description.slice(0, 60)} (${amount.toFixed(2)} ${r.settings.currency}).`, this.communities.groupLink(organizationId, groupId, 'finance'), String(doc._id));
    }
    await this.access.audit(organizationId, r.group._id, r.actor, `finance_${kind}`, `${purpose || description.slice(0, 60)} — ${amount.toFixed(2)} ${r.settings.currency}`);
    return { id: String(doc._id) };
  }

  /** Approval workflow for expenses and fund requests. */
  async decide(organizationId: string, userId: string, groupId: string, txId: string, input: { action?: string; note?: string }) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    const tx = await this.txModel.findOne({ _id: this.oid(txId, 'Record ID'), groupId: r.group._id });
    if (!tx) throw new NotFoundException('Record not found.');
    const action = String(input.action);
    const note = str(input.note, 1000);
    const own = sameId(tx.userId, userId);
    const step = (a: string) => tx.steps.push({ action: a, note, byName: r.actor.displayName, byUserId: new Types.ObjectId(userId), at: new Date() } as any);

    if (action === 'cancel') {
      if (!own || !['submitted', 'under_review'].includes(tx.status)) throw new ForbiddenException('Only the person who submitted it can cancel a pending request.');
      tx.status = 'cancelled';
      step('cancelled');
    } else if (tx.kind === 'expense') {
      // Another group manager (or church leadership) approves; nobody approves their own expense.
      if (!r.canManageFinance) throw new ForbiddenException('You cannot review expenses.');
      if (own && !r.governs) throw new ForbiddenException('Someone else must approve your own expense.');
      const allowed: Record<string, string[]> = { submitted: ['approve', 'reject'], approved: ['mark_paid', 'reject'] };
      if (!(allowed[tx.status] ?? []).includes(action)) throw new ConflictException('This change is not possible.');
      if (action === 'reject' && !note) throw new BadRequestException('Add a note explaining the decision.');
      tx.status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'paid';
      step(tx.status);
    } else if (tx.kind === 'fund_request') {
      // Church leadership reviews; group leaders cannot approve church money.
      if (!r.canApproveChurchFunds) throw new ForbiddenException('Only church leadership can review fund requests.');
      const allowed: Record<string, string[]> = { submitted: ['review', 'approve', 'reject'], under_review: ['approve', 'reject'], approved: ['mark_paid'] };
      if (!(allowed[tx.status] ?? []).includes(action)) throw new ConflictException('This change is not possible.');
      if (action === 'reject' && !note) throw new BadRequestException('Add a note explaining the decision.');
      tx.status = action === 'review' ? 'under_review' : action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'paid';
      if (tx.status === 'paid') tx.paidAt = new Date();
      step(tx.status);
    } else {
      throw new BadRequestException('Contributions do not need approval.');
    }
    await tx.save();
    if (!own && tx.userId) {
      await this.communities.notify([String(tx.userId)], `${r.group.name}: ${tx.kind === 'expense' ? 'expense' : 'fund request'} ${tx.status.replace('_', ' ')}`, `${tx.purpose || tx.description.slice(0, 60)} — ${tx.amount.toFixed(2)} ${tx.currency}.${note ? ` ${note}` : ''}`, this.communities.groupLink(organizationId, groupId, 'finance'), String(tx._id));
    }
    await this.access.audit(organizationId, r.group._id, r.actor, `finance_${tx.status}`, `${tx.purpose} — ${tx.amount.toFixed(2)} ${tx.currency}`);
    return { ok: true, status: tx.status };
  }

  private receiptNumber() {
    return `GR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  /* ==========================================================================
     DIGITAL CONTRIBUTIONS (universal Fockis payments / Stripe)
     ========================================================================== */

  async startContribution(organizationId: string, userId: string, groupId: string, input: { amount?: unknown; campaignId?: string; purpose?: string; kind?: string; showName?: boolean; country?: string }) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    if (!r.isMember) throw new ForbiddenException('Join the group to contribute.');
    const g = r.group;
    let campaign: Record<string, any> | null = null;
    if (input.campaignId) {
      this.access.requireService(r, 'fundraising');
      campaign = (await this.m.campaign.findOne({ _id: this.oid(input.campaignId, 'Campaign ID'), groupId: g._id }).lean().exec()) as Record<string, any> | null;
      if (!campaign || campaign.status !== 'active') throw new BadRequestException('This campaign is not accepting contributions.');
      if (campaign.deadline && campaign.deadline < new Date().toISOString().slice(0, 10)) throw new BadRequestException('This campaign has ended.');
    } else {
      this.access.requireService(r, 'contributions');
    }
    const amount = this.amountOf(input.amount);
    if (amount < 1) throw new BadRequestException('The minimum contribution is 1.00.');
    const currency = campaign?.currency || r.settings.currency;
    const kind = ['contribution', 'donation', 'offering'].includes(String(input.kind)) ? String(input.kind) : 'contribution';
    const tx = await this.m.tx.create({
      organizationId: g.organizationId,
      groupId: g._id,
      kind,
      amount,
      currency,
      purpose: campaign ? campaign.title : str(input.purpose, 200) || 'Group contribution',
      campaignId: campaign ? campaign._id : null,
      membershipId: r.actor.membershipId ? new Types.ObjectId(r.actor.membershipId) : null,
      userId: new Types.ObjectId(userId),
      personName: r.actor.displayName,
      showName: Boolean(input.showName),
      source: 'stripe',
      status: 'pending',
      date: new Date().toISOString().slice(0, 10),
      steps: [{ action: 'started', note: '', byName: r.actor.displayName, byUserId: new Types.ObjectId(userId), at: new Date() }],
    });
    const res = (await this.payments.createPayment(userId, {
      purpose: PaymentPurpose.CHURCH,
      referenceId: `${REF_PREFIX}${String(tx._id)}`,
      baseAmount: amount,
      baseCurrency: currency,
      country: /^[A-Za-z]{2}$/.test(String(input.country ?? '')) ? String(input.country).toUpperCase() : 'US',
      idempotencyKey: `group-contribution-${String(tx._id)}`,
      metadata: { organizationId, groupId: String(g._id), campaignId: campaign ? String(campaign._id) : '', transactionId: String(tx._id) },
    } as any)) as { paymentId: string; clientSecret: string | null; stripePaymentIntentId?: string | null; chargedAmount: number; chargedCurrency: string };
    if (!res.clientSecret) {
      await this.m.tx.updateOne({ _id: tx._id }, { $set: { status: 'failed' } });
      throw new BadRequestException('The payment could not be started. Please try again.');
    }
    await this.m.tx.updateOne({ _id: tx._id }, { $set: { paymentId: res.paymentId, paymentIntentId: res.stripePaymentIntentId ?? null } });
    return { transactionId: String(tx._id), clientSecret: res.clientSecret, paymentIntentId: res.stripePaymentIntentId ?? null, amount: res.chargedAmount, currency: res.chargedCurrency };
  }

  /** Called by the contributor after Stripe confirms the card. */
  async confirmContribution(organizationId: string, userId: string, groupId: string, txId: string, paymentIntentId: string) {
    const tx = (await this.m.tx.findOne({ _id: this.oid(txId, 'Contribution ID'), groupId: this.oid(groupId, 'Group ID'), organizationId: this.oid(organizationId, 'Organization ID') }).lean().exec()) as Record<string, any> | null;
    if (!tx || !sameId(tx.userId, userId)) throw new NotFoundException('Contribution not found.');
    // The payment service verifies the intent with Stripe and records it.
    await this.payments.confirmPayment(userId, String(paymentIntentId));
    const record = (await this.connection.collection('payments').findOne({ stripePaymentIntentId: String(paymentIntentId) })) as unknown as PaymentRecord | null;
    if (!record || record.referenceId !== `${REF_PREFIX}${String(tx._id)}`) throw new BadRequestException("This payment doesn't belong to this contribution.");
    await this.fulfill(record);
    const fresh = (await this.m.tx.findById(tx._id).lean().exec()) as Record<string, any>;
    if (fresh.status !== 'paid') throw new BadRequestException("The payment hasn't completed yet. If you were charged, it will update automatically.");
    return { status: 'paid', receiptNumber: fresh.receiptNumber, amount: fresh.amount, currency: fresh.currency };
  }

  @OnEvent('payments.succeeded')
  async onPaymentSucceeded(payload: { paymentId?: string; purpose?: string; referenceId?: string }) {
    if (payload?.purpose !== PaymentPurpose.CHURCH || !String(payload.referenceId ?? '').startsWith(REF_PREFIX) || !payload.paymentId) return;
    try {
      const record = (await this.connection.collection('payments').findOne({ id: payload.paymentId })) as unknown as PaymentRecord | null;
      if (record) await this.fulfill(record);
    } catch (e) {
      this.logger.error(`Group contribution payment ${payload.paymentId} could not be applied: ${String(e)}`);
    }
  }

  /** Idempotent: marks the contribution paid once the verified payment covers it. */
  private async fulfill(record: PaymentRecord) {
    if (record.purpose !== PaymentPurpose.CHURCH || record.status !== 'paid' || !record.referenceId.startsWith(REF_PREFIX)) return;
    const txId = record.referenceId.slice(REF_PREFIX.length);
    if (!Types.ObjectId.isValid(txId)) return;
    const tx = (await this.m.tx.findById(txId).lean().exec()) as Record<string, any> | null;
    if (!tx || tx.status === 'paid') return;
    if (!sameId(tx.userId, record.userId)) {
      this.logger.error(`Payment ${record.id} user does not match contribution ${txId}.`);
      return;
    }
    if (String(record.chargedCurrency).toUpperCase() !== String(tx.currency).toUpperCase() || Math.abs(Number(record.chargedAmount) - Number(tx.amount)) > 0.005) {
      this.logger.error(`Payment ${record.id} amount does not match contribution ${txId}.`);
      return;
    }
    const updated = (await this.m.tx
      .findOneAndUpdate(
        { _id: tx._id, status: { $ne: 'paid' } },
        {
          $set: { status: 'paid', paidAt: new Date(), paymentId: record.id, paymentIntentId: record.stripePaymentIntentId, receiptNumber: this.receiptNumber() },
          $push: { steps: { action: 'paid', note: 'Card payment confirmed', byName: tx.personName ?? '', at: new Date() } },
        },
        { new: true },
      )
      .lean()
      .exec()) as Record<string, any> | null;
    if (!updated) return;
    const g = (await this.m.group.findById(tx.groupId).lean().exec()) as LeanGroup | null;
    if (!g) return;
    const orgId = String(g.organizationId);
    await this.communities.notify([String(tx.userId)], 'Thank you for your contribution', `${g.name}: ${Number(tx.amount).toFixed(2)} ${tx.currency} received. Receipt ${updated.receiptNumber}.`, this.communities.groupLink(orgId, String(g._id), 'finance'), String(tx._id));
    const managers = await this.communities.leaderUserIds(g, ['leader', 'treasurer']);
    await this.communities.notify(managers.filter((u) => u !== String(tx.userId)), 'Contribution received', `${g.name}: ${Number(tx.amount).toFixed(2)} ${tx.currency}${tx.campaignId ? ` for "${tx.purpose}"` : ''}.`, this.communities.groupLink(orgId, String(g._id), 'finance'), String(tx._id));
    await this.access.audit(orgId, g._id, null, 'contribution_received', `${Number(tx.amount).toFixed(2)} ${tx.currency}`);
  }

  /** The signed-in member's own giving, across all groups of the church. */
  async myContributions(organizationId: string, userId: string) {
    const rows = (await this.m.tx
      .find({ organizationId: this.oid(organizationId, 'Organization ID'), userId: new Types.ObjectId(userId), kind: { $in: INCOME }, status: { $in: ['paid', 'recorded', 'pending'] } })
      .sort({ createdAt: -1 })
      .limit(300)
      .lean()
      .exec()) as Array<Record<string, any>>;
    const groups = (await this.m.group.find({ _id: { $in: [...new Set(rows.map((x) => String(x.groupId)))].map((x) => new Types.ObjectId(x)) } }).select('name').lean().exec()) as LeanGroup[];
    const names = new Map(groups.map((g) => [String(g._id), g.name]));
    return {
      items: rows.map((t) => ({
        id: String(t._id),
        groupId: String(t.groupId),
        groupName: names.get(String(t.groupId)) ?? '',
        amount: t.amount,
        currency: t.currency,
        purpose: t.purpose,
        status: t.status,
        receiptNumber: t.receiptNumber ?? '',
        date: t.date || iso(t.createdAt)?.slice(0, 10),
        paidAt: iso(t.paidAt),
      })),
    };
  }

  /* ==========================================================================
     FUNDRAISING
     ========================================================================== */

  private async raisedBy(ids: Types.ObjectId[]) {
    if (!ids.length) return new Map<string, number>();
    const rows = (await this.m.tx.aggregate([
      { $match: { campaignId: { $in: ids }, kind: { $in: INCOME }, status: { $in: PAID_INCOME } } },
      { $group: { _id: '$campaignId', total: { $sum: '$amount' }, donors: { $addToSet: '$userId' } } },
    ])) as Array<{ _id: Types.ObjectId; total: number }>;
    return new Map(rows.map((x) => [String(x._id), round(x.total)]));
  }

  async campaigns(organizationId: string, userId: string, groupId: string) {
    const r = await this.access.requireMember(organizationId, userId, groupId);
    this.access.requireService(r, 'fundraising');
    const filter: Record<string, unknown> = { groupId: r.group._id };
    if (!r.canManageFinance) filter.status = { $ne: 'draft' };
    const rows = (await this.m.campaign.find(filter).sort({ status: 1, createdAt: -1 }).lean().exec()) as Array<Record<string, any>>;
    const raised = await this.raisedBy(rows.map((c) => c._id));
    const donorCounts = (await this.m.tx.aggregate([
      { $match: { campaignId: { $in: rows.map((c) => c._id) }, kind: { $in: INCOME }, status: { $in: PAID_INCOME } } },
      { $group: { _id: '$campaignId', donors: { $addToSet: { $ifNull: ['$userId', '$_id'] } } } },
    ])) as Array<{ _id: Types.ObjectId; donors: unknown[] }>;
    // Public donor wall: only people who chose to show their name.
    const named = (await this.m.tx
      .find({ campaignId: { $in: rows.map((c) => c._id) }, status: 'paid', showName: true })
      .select('campaignId personName')
      .sort({ paidAt: -1 })
      .limit(500)
      .lean()
      .exec()) as Array<{ campaignId: Types.ObjectId; personName: string }>;
    return {
      canManage: r.canManageFinance,
      canContribute: r.isMember,
      items: rows.map((c) => {
        const collected = raised.get(String(c._id)) ?? 0;
        return {
          id: String(c._id),
          title: c.title,
          description: c.description ?? '',
          coverUrl: c.coverUrl || null,
          goalAmount: c.goalAmount,
          currency: c.currency,
          deadline: c.deadline ?? '',
          status: c.status,
          collected,
          progress: Math.min(100, Math.round((collected / Number(c.goalAmount || 1)) * 100)),
          donors: donorCounts.find((d) => sameId(d._id, c._id))?.donors.length ?? 0,
          supporters: [...new Set(named.filter((n) => sameId(n.campaignId, c._id)).map((n) => n.personName).filter(Boolean))].slice(0, 20),
          createdAt: iso(c.createdAt),
        };
      }),
    };
  }

  async saveCampaign(organizationId: string, userId: string, groupId: string, campaignId: string | null, input: Record<string, unknown>) {
    const r = await this.access.require(organizationId, userId, groupId, 'canManageFinance', 'Only the group leader or treasurer can manage campaigns.');
    this.access.requireService(r, 'fundraising');
    const title = str(input.title, 140);
    if (!title) throw new BadRequestException('Give the campaign a title.');
    const goal = this.amountOf(input.goalAmount);
    const deadline = /^\d{4}-\d{2}-\d{2}$/.test(String(input.deadline ?? '')) ? String(input.deadline) : '';
    const data = {
      title,
      description: str(input.description, 4000),
      coverUrl: /^(\/|https?:\/\/)/.test(String(input.coverUrl ?? '')) ? str(input.coverUrl, 600) : '',
      goalAmount: goal,
      deadline,
      status: ['draft', 'active', 'closed'].includes(String(input.status)) ? String(input.status) : 'active',
    };
    let id = campaignId;
    if (campaignId) {
      const res = await this.m.campaign.updateOne({ _id: this.oid(campaignId, 'Campaign ID'), groupId: r.group._id }, { $set: data });
      if (!res.matchedCount) throw new NotFoundException('Campaign not found.');
    } else {
      const doc = await this.m.campaign.create({ ...data, currency: r.settings.currency, organizationId: r.group.organizationId, groupId: r.group._id, createdByUserId: new Types.ObjectId(userId) });
      id = String(doc._id);
      if (data.status === 'active') {
        await this.communities.notify((await this.communities.memberUserIds(r.group)).filter((u) => u !== userId), `${r.group.name}: new fundraising campaign`, title, this.communities.groupLink(organizationId, groupId, 'fundraising'), id);
      }
    }
    await this.access.audit(organizationId, r.group._id, r.actor, campaignId ? 'campaign_updated' : 'campaign_created', title);
    return { id };
  }

  /* ==========================================================================
     REPORTS
     ========================================================================== */

  async groupReport(organizationId: string, userId: string, groupId: string) {
    const r = await this.access.require(organizationId, userId, groupId, 'canManage', 'Reports are available to the group leader and church leadership.');
    return this.reportFor(r.group, r.settings.currency, r.settings.annualBudget, r.canViewFinance);
  }

  private async reportFor(g: LeanGroup, currency: string, annualBudget: number | null, withFinance: boolean) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const since90 = new Date(now.getTime() - 90 * 86400000);
    const [members, newMembers, joinsByMonth, meetings, attendance, activities, finance] = await Promise.all([
      this.m.member.countDocuments({ organizationId: g.organizationId, groupIds: g._id, status: MembershipStatus.Active }),
      this.m.record.countDocuments({ groupId: g._id, status: 'active', joinedAt: { $gte: since90 } }),
      this.m.record.aggregate([
        { $match: { groupId: g._id, joinedAt: { $gte: start } } },
        { $group: { _id: { y: { $year: '$joinedAt' }, m: { $month: '$joinedAt' } }, n: { $sum: 1 } } },
      ]),
      this.m.meeting.countDocuments({ groupId: g._id, startsAt: { $gte: since90, $lt: now } }),
      this.m.attendance.aggregate([
        { $match: { groupId: g._id } },
        { $group: { _id: null, total: { $sum: 1 }, present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } }, people: { $addToSet: '$membershipId' } } },
      ]),
      this.connection.collection('church_events').countDocuments({ groupId: g._id, startsAt: { $gte: since90, $lt: now } }),
      withFinance ? this.computeSummary(g, currency, annualBudget) : Promise.resolve(null),
    ]);
    const months: { label: string; joined: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const row = (joinsByMonth as Array<{ _id: { y: number; m: number }; n: number }>).find((x) => x._id.y === d.getFullYear() && x._id.m === d.getMonth() + 1);
      months.push({ label: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), joined: row?.n ?? 0 });
    }
    const att = (attendance as Array<{ total: number; present: number; people: unknown[] }>)[0];
    return {
      group: { id: String(g._id), name: g.name, category: CommunityAccessService.categoryOf(g), status: CommunityAccessService.statusOf(g) },
      generatedAt: now.toISOString(),
      members,
      newMembers90Days: newMembers,
      growth: months,
      meetings90Days: meetings,
      activities90Days: activities,
      attendanceRate: att?.total ? Math.round((att.present / att.total) * 100) : null,
      engagedMembers: att?.people?.length ?? 0,
      engagementRate: members && att?.people ? Math.min(100, Math.round((att.people.length / members) * 100)) : null,
      finance,
    };
  }

  /** Church-wide report: everything for church leadership; leaders see the groups they lead. */
  async churchReport(organizationId: string, userId: string) {
    const actor = await this.access.actor(organizationId, userId);
    const groups = (await this.m.group.find({ organizationId: this.oid(organizationId, 'Organization ID'), deletedAt: null }).lean().exec()) as LeanGroup[];
    const items: Record<string, unknown>[] = [];
    for (const g of groups) {
      let withFinance = actor.canCreate;
      if (!actor.canCreate) {
        const r = await this.access.rights(organizationId, userId, g, actor);
        if (!r.canManage) continue;
        withFinance = r.canViewFinance;
      }
      const s = this.access.settingsOf(g);
      const rep = await this.reportFor(g, s.currency, s.annualBudget, withFinance);
      items.push({
        id: rep.group.id,
        name: rep.group.name,
        category: rep.group.category,
        status: rep.group.status,
        members: rep.members,
        newMembers90Days: rep.newMembers90Days,
        meetings90Days: rep.meetings90Days,
        activities90Days: rep.activities90Days,
        attendanceRate: rep.attendanceRate,
        engagementRate: rep.engagementRate,
        currency: s.currency,
        contributions: rep.finance?.totalContributions ?? null,
        expenses: rep.finance?.totalExpenses ?? null,
        balance: rep.finance?.availableBalance ?? null,
        fundraisingCollected: rep.finance?.fundraising.collected ?? null,
        pendingFinanceRequests: rep.finance?.pendingRequests ?? null,
      });
    }
    if (!actor.canCreate && !items.length) throw new ForbiddenException('Reports are available to group leaders and church leadership.');
    const live = items.filter((i) => i.status !== 'archived');
    return {
      generatedAt: new Date().toISOString(),
      totals: {
        groups: live.length,
        activeGroups: live.filter((i) => i.status === 'active').length,
        members: live.reduce((a, i) => a + Number(i.members), 0),
        newMembers90Days: live.reduce((a, i) => a + Number(i.newMembers90Days), 0),
        meetings90Days: live.reduce((a, i) => a + Number(i.meetings90Days), 0),
        activities90Days: live.reduce((a, i) => a + Number(i.activities90Days), 0),
      },
      items,
    };
  }

  /** Church-level finance oversight: fund requests and balances of every group. */
  async churchFinance(organizationId: string, userId: string) {
    const actor = await this.access.actor(organizationId, userId);
    const orgId = this.oid(organizationId, 'Organization ID');
    const groups = (await this.m.group.find({ organizationId: orgId, deletedAt: null }).select('name groupSettings leaderIds organizationId createdByUserId isArchived groupStatus').lean().exec()) as LeanGroup[];
    const allowed: LeanGroup[] = [];
    for (const g of groups) {
      if (actor.canCreate) allowed.push(g);
      else {
        const r = await this.access.rights(organizationId, userId, g, actor);
        if (r.canViewFinance) allowed.push(g);
      }
    }
    if (!allowed.length) throw new ForbiddenException('Group finances are available to group leaders, treasurers and church leadership.');
    const rows: Record<string, unknown>[] = [];
    for (const g of allowed) {
      const s = this.access.settingsOf(g);
      rows.push({ groupId: String(g._id), groupName: g.name, ...(await this.computeSummary(g, s.currency, s.annualBudget)) });
    }
    const pending = actor.canReview
      ? ((await this.m.tx.find({ organizationId: orgId, kind: 'fund_request', status: { $in: ['submitted', 'under_review', 'approved'] } }).sort({ createdAt: 1 }).limit(200).lean().exec()) as Array<Record<string, any>>)
      : [];
    const names = new Map(groups.map((g) => [String(g._id), g.name]));
    return {
      canApprove: actor.canReview,
      groups: rows,
      fundRequests: pending.map((t) => ({ ...this.txView(t, null, new Map()), personName: t.personName ?? '', groupId: String(t.groupId), groupName: names.get(String(t.groupId)) ?? '' })),
    };
  }
}
