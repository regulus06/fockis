/**
 * church-giving.service.ts
 * -----------------------------------------------------------------------------
 * "Give Online" on the church website: tithes, offerings and special gifts.
 *
 *  - Payments go through the existing universal Fockis payment service
 *    (one Stripe integration), purpose "church", referenceId
 *    "church-gift:<giftId>". Group contributions use the same purpose with
 *    their own "group-tx:" prefix, so the two never touch each other's records.
 *  - A gift is marked paid only after the stored payment record is "paid" and
 *    matches the gift (giver, amount and currency). The webhook event
 *    ("payments.succeeded") and the giver's confirm call both run the same
 *    idempotent check, so a gift is never counted twice.
 *  - Who manages giving (settings, the list of gifts): the church owner,
 *    administrators / pastors, and members granted "manage settings".
 *    Everyone else only ever sees their own gifts.
 *  - Nothing here claims a gift is tax-deductible.
 * -----------------------------------------------------------------------------
 */

import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { Connection, Model, Types } from 'mongoose';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import * as QRCode from 'qrcode';

import { Organization, OrganizationDocument } from '../organizations/schemas/organization.schema';
import { Membership, MembershipDocument } from '../members/schemas/membership.schema';
import { MembersService } from '../members/services/members.service';
import { ChurchPermission } from '../enums/permission.enum';
import { MembershipStatus } from '../enums/membership-status.enum';
import { NotificationsService } from '../../notifications/notifications.service';
import { UniversalPaymentService } from '../../payments/services/payment.service';
import { PaymentPurpose } from '../../payments/constants/payment-purpose.constants';
import { PaymentReceiptService } from '../../payments/services/payment-receipt.service';
import { OrgPayoutsService } from '../../payouts/organization-payouts/org-payouts.service';
import { ChurchGift, ChurchGiftDocument, ChurchGivingSettings, ChurchGivingSettingsDocument } from './church-giving.schemas';
import { OrganizationPreferences, OrganizationPreferencesDocument } from '../admin-center/admin-center.schemas';
import { OrganizationHandlesService } from '../organizations/services/organization-handles.service';

type Lean = Record<string, any>;

const REF_PREFIX = 'church-gift:';
/** Same as Requests & Inquiries: these roles are church administrators. */
const ADMIN_ROLES = ['administrator', 'pastor_director'];
/** Currencies a church can receive gifts in (two-decimal currencies Stripe supports). */
export const GIVING_CURRENCIES = ['USD', 'HTG', 'CAD', 'EUR', 'GBP', 'DOP', 'MXN', 'BRL', 'CHF', 'AUD'];
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 100_000;
/** Guests (no Fockis account) give at least this much: small charges are how stolen cards get tested. */
const GUEST_MIN_AMOUNT = 5;
/** Guest gift attempts allowed per email address per hour (on top of the per-device limit in the controller). */
const GUEST_ATTEMPTS_PER_EMAIL_PER_HOUR = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

export const DEFAULT_FUNDS = [
  { key: 'tithe', label: 'Tithe', description: '', active: true },
  { key: 'offering', label: 'Offering', description: '', active: true },
  { key: 'special_gift', label: 'Special gift', description: '', active: true },
];
const DEFAULT_SUGGESTED = [10, 25, 50, 100];

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d ? new Date(String(d)).toISOString() : null);
const round2 = (n: number) => Math.round(n * 100) / 100;
const money2 = (n: number, currency: string) => `${round2(n).toFixed(2)} ${String(currency).toUpperCase()}`;
const sameId = (a: unknown, b: unknown) => a != null && b != null && String(a) === String(b);
const slugKey = (v: string) =>
  v
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

interface PaymentRecord {
  id: string;
  userId: Types.ObjectId | null;
  payerEmail?: string | null;
  purpose: string;
  referenceId: string;
  status: string;
  baseAmount: number;
  baseCurrency: string;
  chargedAmount: number;
  chargedCurrency: string;
  stripePaymentIntentId: string | null;
}

@Injectable()
export class ChurchGivingService {
  private readonly logger = new Logger('ChurchGiving');

  constructor(
    @InjectModel(ChurchGivingSettings.name) private readonly settingsModel: Model<ChurchGivingSettingsDocument>,
    @InjectModel(ChurchGift.name) private readonly giftModel: Model<ChurchGiftDocument>,
    @InjectModel(Organization.name) private readonly organizationModel: Model<OrganizationDocument>,
    @InjectModel(Membership.name) private readonly membershipModel: Model<MembershipDocument>,
    @InjectModel(OrganizationPreferences.name) private readonly prefsModel: Model<OrganizationPreferencesDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly members: MembersService,
    private readonly notifications: NotificationsService,
    private readonly payments: UniversalPaymentService,
    /** Emails the giver's receipt (with the church's thank-you message). */
    @Optional() private readonly receipts?: PaymentReceiptService,
    /** Records what the church is owed (after the Fockis fee) for payouts. */
    @Optional() private readonly orgPayouts?: OrgPayoutsService,
    /** Public link name (fockis.com/o/<name>) used in the giving QR code. */
    @Optional() private readonly handles?: OrganizationHandlesService,
  ) {}

  /* ======================================================================
     Helpers
     ====================================================================== */

  private oid(v: unknown, label: string) {
    const s = String(v ?? '');
    if (!Types.ObjectId.isValid(s) || !/^[a-f0-9]{24}$/i.test(s)) throw new BadRequestException(`${label} is not valid.`);
    return new Types.ObjectId(s);
  }

  private async organization(organizationId: string): Promise<Lean> {
    const org = (await this.organizationModel
      .findById(this.oid(organizationId, 'Organization ID'))
      .select('name status createdByUserId')
      .lean()
      .exec()) as Lean | null;
    if (!org) throw new NotFoundException('Organization not found.');
    return org;
  }

  private async settingsOf(orgId: Types.ObjectId): Promise<Lean> {
    const s = (await this.settingsModel.findOne({ organizationId: orgId }).lean().exec()) as Lean | null;
    return {
      enabled: Boolean(s?.enabled),
      currency: GIVING_CURRENCIES.includes(String(s?.currency)) ? String(s?.currency) : 'USD',
      funds: Array.isArray(s?.funds) && s!.funds.length ? s!.funds : DEFAULT_FUNDS,
      suggestedAmounts: Array.isArray(s?.suggestedAmounts) && s!.suggestedAmounts.length ? s!.suggestedAmounts : DEFAULT_SUGGESTED,
      message: s?.message ?? '',
      thankYouMessage: s?.thankYouMessage ?? '',
      allowGuests: s?.allowGuests !== false,
      updatedAt: iso(s?.updatedAt),
      saved: Boolean(s),
    };
  }

  /** Owner, administrators / pastors, or members with "manage settings". */
  async canManage(organizationId: string, userId: string | null): Promise<boolean> {
    if (!userId) return false;
    if (await this.members.isOrganizationOwner(organizationId, userId)) return true;
    const m = (await this.members.getMembershipOrNull(organizationId, userId)) as unknown as Lean | null;
    if (!m || m.status !== MembershipStatus.Active) return false;
    if (ADMIN_ROLES.includes(String(m.role ?? ''))) return true;
    return this.members.hasPermission(organizationId, userId, ChurchPermission.ManageSettings);
  }

  private async requireManager(organizationId: string, userId: string) {
    if (!(await this.canManage(organizationId, userId))) throw new ForbiddenException('Only church administrators can manage giving.');
  }

  private async userName(userId: string): Promise<string> {
    const User = this.connection.models['User'];
    if (!User || !Types.ObjectId.isValid(userId)) return '';
    const u = (await User.findById(userId).select('name fullName username displayName').lean().exec()) as Lean | null;
    return String(u?.name || u?.fullName || u?.displayName || u?.username || '');
  }

  private async bell(userIds: string[], title: string, message: string, link: string, entityId: string) {
    for (const id of [...new Set(userIds)]) {
      if (!Types.ObjectId.isValid(id)) continue;
      await this.notifications
        .create({ recipientId: id, type: 'SYSTEM', title, message: message.slice(0, 300), entityId, entityType: 'church_gift', link } as any)
        .catch((e) => this.logger.warn(`Notification not sent: ${e?.message ?? e}`));
    }
  }

  private async managerIds(orgId: Types.ObjectId, ownerId: unknown): Promise<string[]> {
    const filter: Lean = { organizationId: orgId, status: MembershipStatus.Active, $or: [{ role: { $in: ADMIN_ROLES } }, { permissions: ChurchPermission.ManageSettings }] };
    const staff = (await this.membershipModel
      .find(filter)
      .select('userId')
      .limit(50)
      .lean()
      .exec()) as Lean[];
    const ids = staff.map((m) => String(m.userId)).filter(Boolean);
    if (ownerId) ids.push(String(ownerId));
    return [...new Set(ids)];
  }

  private amountOf(v: unknown): number {
    const n = round2(Number(v));
    if (!Number.isFinite(n) || n < MIN_AMOUNT) throw new BadRequestException(`The minimum gift is ${MIN_AMOUNT.toFixed(2)}.`);
    if (n > MAX_AMOUNT) throw new BadRequestException(`For gifts over ${MAX_AMOUNT.toLocaleString('en-US')}, please contact the church.`);
    return n;
  }

  private receiptNumber() {
    return `CG-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
  }

  private giftView(g: Lean, forStaff: boolean) {
    return {
      id: String(g._id),
      fundKey: g.fundKey,
      fundLabel: g.fundLabel,
      amount: g.amount,
      currency: g.currency,
      note: g.note ?? '',
      status: g.status,
      receiptNumber: g.receiptNumber ?? '',
      coverFee: Number(g.coverFee ?? 0),
      refundedAmount: Number(g.refundedAmount ?? 0),
      refundedAt: iso(g.refundedAt),
      refundRequested: Boolean(g.refundRequest?.at),
      refundRequestReason: forStaff ? String(g.refundRequest?.reason ?? '') : '',
      anonymous: Boolean(g.anonymous),
      /** Given without a Fockis account (their email is never shown to staff). */
      guest: !g.userId,
      giverName: forStaff && g.anonymous ? '' : (g.giverName ?? ''),
      createdAt: iso(g.createdAt),
      paidAt: iso(g.paidAt),
    };
  }

  /* ======================================================================
     Public: what the Give Online card needs
     ====================================================================== */

  async publicInfo(organizationId: string, viewerId: string | null) {
    const org = await this.organization(organizationId);
    const s = await this.settingsOf(org._id);
    const active = String(org.status ?? 'active') === 'active';
    return {
      organization: { id: String(org._id), name: org.name },
      enabled: s.enabled && active,
      currency: s.currency,
      funds: s.funds.filter((f: Lean) => f.active !== false).map((f: Lean) => ({ key: f.key, label: f.label, description: f.description ?? '' })),
      suggestedAmounts: s.suggestedAmounts,
      message: s.message,
      minAmount: MIN_AMOUNT,
      /** People without a Fockis account can give (name + email). */
      allowGuests: s.allowGuests,
      guestMinAmount: GUEST_MIN_AMOUNT,
      signedIn: Boolean(viewerId),
      canManage: await this.canManage(organizationId, viewerId),
    };
  }

  /* ======================================================================
     QR code that opens the giving form (print it, or show it on a screen)
     ====================================================================== */

  /**
   * The link is built here from the organization's own public address, never
   * from anything the caller sends. An optional fund key is accepted only if
   * it is one of the church's active funds. Public: it encodes a public link.
   */
  async givingQr(organizationId: string, fundInput?: string) {
    const org = (await this.organizationModel
      .findById(this.oid(organizationId, 'Organization ID'))
      .select('name status domain handle logoUrl')
      .lean()
      .exec()) as Lean | null;
    if (!org || String(org.status ?? 'active') !== 'active') throw new NotFoundException('Organization not found.');
    const s = await this.settingsOf(org._id);

    const key = String(fundInput ?? '').trim();
    const fund = key ? s.funds.find((f: Lean) => f.active !== false && f.key === key) : null;
    if (key && !fund) throw new BadRequestException('This fund is not available.');

    const site = String(process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || 'https://www.fockis.com').trim().replace(/\/+$/, '');
    let page = `${site}/organizations/${String(org._id)}`;
    if (this.handles) {
      try {
        page = this.handles.publicUrl(await this.handles.ensureHandle(org));
      } catch (err) {
        this.logger.warn(`Giving QR: no public name for ${String(org._id)}: ${(err as Error).message}`);
      }
    }
    const url = `${page}?give=1${fund ? `&fund=${encodeURIComponent(String(fund.key))}` : ''}`;

    const options = { errorCorrectionLevel: 'M' as const, margin: 2 };
    const [svg, png] = await Promise.all([
      QRCode.toString(url, { ...options, type: 'svg' }),
      QRCode.toDataURL(url, { ...options, width: 1024 }),
    ]);

    return {
      url,
      svg,
      png,
      organizationName: String(org.name ?? ''),
      fund: fund ? { key: String(fund.key), label: String(fund.label ?? '') } : null,
      givingEnabled: s.enabled,
    };
  }

  /* ======================================================================
     Giver: start → pay with Stripe → confirm
     ====================================================================== */

  async startGift(organizationId: string, userId: string, input: Lean) {
    return this.beginGift(organizationId, input, { userId });
  }

  /**
   * A gift from someone without a Fockis account (e.g. scanned the church's
   * QR code). Needs a name and an email (for the receipt), a higher minimum,
   * and is limited per email here and per device in the controller. Returns
   * a one-time key the browser sends back to confirm this gift only.
   */
  async startGuestGift(organizationId: string, input: Lean) {
    const name = str(input.name, 120);
    const email = str(input.email, 254).toLowerCase();
    if (name.length < 2) throw new BadRequestException('Enter your name.');
    if (!EMAIL_RE.test(email)) throw new BadRequestException('Enter a valid email address for your receipt.');
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.giftModel.countDocuments({ guestEmail: email, createdAt: { $gte: since } }).exec();
    if (recent >= GUEST_ATTEMPTS_PER_EMAIL_PER_HOUR) {
      throw new BadRequestException('Too many attempts with this email. Please try again in an hour, or sign in to Fockis to give.');
    }
    return this.beginGift(organizationId, input, { guest: { name, email } });
  }

  private async beginGift(organizationId: string, input: Lean, giver: { userId?: string; guest?: { name: string; email: string } }) {
    const org = await this.organization(organizationId);
    if (String(org.status ?? 'active') !== 'active') throw new BadRequestException('This church is not receiving gifts right now.');
    const s = await this.settingsOf(org._id);
    if (!s.enabled) throw new BadRequestException('Online giving is not turned on for this church.');
    if (giver.guest && !s.allowGuests) throw new BadRequestException('Please sign in to Fockis to give to this church.');
    const fund = s.funds.find((f: Lean) => f.active !== false && f.key === String(input.fundKey ?? ''));
    if (!fund) throw new BadRequestException('Choose what your gift is for.');
    const amount = this.amountOf(input.amount);
    if (giver.guest && amount < GUEST_MIN_AMOUNT) {
      throw new BadRequestException(`The minimum gift without a Fockis account is ${GUEST_MIN_AMOUNT.toFixed(2)}. Sign in to give a smaller amount.`);
    }
    const currency = s.currency;
    // Optional: the giver adds the Fockis fee so the church receives the full gift.
    let coverFee = 0;
    if (input.coverFee === true && this.orgPayouts) {
      const quote = await this.orgPayouts.coverQuote(organizationId, amount, currency);
      if (quote.enabled) coverFee = round2(quote.cover);
    }

    const userId = giver.userId ?? null;
    const membership = userId ? ((await this.members.getMembershipOrNull(organizationId, userId)) as unknown as Lean | null) : null;
    const giverName = giver.guest
      ? giver.guest.name
      : str(membership?.profile?.displayName, 120) || (await this.userName(String(userId)));
    const guestKey = giver.guest ? randomBytes(24).toString('base64url') : null;

    const gift = await this.giftModel.create({
      organizationId: org._id,
      userId: userId ? new Types.ObjectId(userId) : null,
      guestEmail: giver.guest?.email ?? null,
      guestKeyHash: guestKey ? sha256(guestKey) : null,
      membershipId: membership?._id ?? null,
      giverName,
      anonymous: Boolean(input.anonymous),
      fundKey: fund.key,
      fundLabel: fund.label,
      amount,
      coverFee,
      currency,
      note: str(input.note, 300),
      status: 'pending',
    });

    const paymentInput = {
      purpose: PaymentPurpose.CHURCH,
      referenceId: `${REF_PREFIX}${String(gift._id)}`,
      baseAmount: round2(amount + coverFee),
      baseCurrency: currency,
      country: /^[A-Za-z]{2}$/.test(String(input.country ?? '')) ? String(input.country).toUpperCase() : 'US',
      idempotencyKey: `church-gift-${String(gift._id)}`,
      metadata: { organizationId: String(org._id), giftId: String(gift._id), fund: fund.key },
    } as never;
    type Started = { paymentId: string; clientSecret: string | null; stripePaymentIntentId?: string | null; chargedAmount: number; chargedCurrency: string };
    let res: Started | null = null;
    try {
      res = (giver.guest
        ? await this.payments.createGuestPayment(giver.guest, paymentInput)
        : await this.payments.createPayment(String(userId), paymentInput)) as Started;
    } finally {
      if (!res?.clientSecret) await this.giftModel.updateOne({ _id: gift._id }, { $set: { status: 'failed' } }).exec();
    }
    if (!res?.clientSecret) throw new BadRequestException('The secure payment could not be started. Please try again.');
    await this.giftModel.updateOne({ _id: gift._id }, { $set: { paymentId: res.paymentId, paymentIntentId: res.stripePaymentIntentId ?? null } }).exec();
    return {
      giftId: String(gift._id),
      clientSecret: res.clientSecret,
      paymentIntentId: res.stripePaymentIntentId ?? null,
      amount: res.chargedAmount,
      currency: res.chargedCurrency,
      fundLabel: fund.label,
      giftAmount: amount,
      coverFee,
      ...(guestKey ? { guestKey } : {}),
    };
  }

  /** Called by the giver after Stripe confirms the card; the server re-checks with Stripe. */
  async confirmGift(organizationId: string, userId: string, giftId: string, paymentIntentId: string) {
    const gift = (await this.giftModel
      .findOne({ _id: this.oid(giftId, 'Gift ID'), organizationId: this.oid(organizationId, 'Organization ID') })
      .lean()
      .exec()) as Lean | null;
    if (!gift || !sameId(gift.userId, userId)) throw new NotFoundException('Gift not found.');
    return this.finishConfirm(gift, paymentIntentId, () => this.payments.confirmPayment(userId, str(paymentIntentId, 200)));
  }

  /** Guest version: proven by the one-time key returned when the gift started. */
  async confirmGuestGift(organizationId: string, giftId: string, paymentIntentId: string, guestKey: string) {
    const gift = (await this.giftModel
      .findOne({ _id: this.oid(giftId, 'Gift ID'), organizationId: this.oid(organizationId, 'Organization ID'), userId: null })
      .select('+guestKeyHash')
      .lean()
      .exec()) as Lean | null;
    const key = str(guestKey, 100);
    const expected = Buffer.from(String(gift?.guestKeyHash ?? ''), 'utf8');
    const given = Buffer.from(key ? sha256(key) : '', 'utf8');
    if (!gift || !key || expected.length !== given.length || !timingSafeEqual(expected, given)) throw new NotFoundException('Gift not found.');
    return this.finishConfirm(gift, paymentIntentId, () => this.payments.confirmGuestPayment(str(paymentIntentId, 200)));
  }

  private async finishConfirm(gift: Lean, paymentIntentId: string, confirm: () => Promise<unknown>) {
    const intent = str(paymentIntentId, 200);
    if (!intent) throw new BadRequestException('The payment could not be verified.');
    if (gift.status !== 'paid') {
      await confirm();
      const record = (await this.connection.collection('payments').findOne({ stripePaymentIntentId: intent })) as unknown as PaymentRecord | null;
      if (!record || record.referenceId !== `${REF_PREFIX}${String(gift._id)}`) throw new BadRequestException("This payment doesn't belong to this gift.");
      await this.fulfill(record);
    }
    const fresh = (await this.giftModel.findById(gift._id).lean().exec()) as Lean;
    if (fresh.status !== 'paid') throw new BadRequestException("The payment hasn't completed yet. If you were charged, it will update automatically.");
    const s = await this.settingsOf(fresh.organizationId);
    return { ...this.giftView(fresh, false), thankYouMessage: s.thankYouMessage };
  }

  @OnEvent('payments.succeeded')
  async onPaymentSucceeded(payload: { paymentId?: string; purpose?: string; referenceId?: string }) {
    if (payload?.purpose !== PaymentPurpose.CHURCH || !String(payload.referenceId ?? '').startsWith(REF_PREFIX) || !payload.paymentId) return;
    try {
      const record = (await this.connection.collection('payments').findOne({ id: payload.paymentId })) as unknown as PaymentRecord | null;
      if (record) await this.fulfill(record);
    } catch (err) {
      this.logger.error(`Church gift payment ${payload.paymentId} could not be applied: ${String(err)}`);
    }
  }

  /** Idempotent: marks the gift paid once the verified payment matches it. */
  private async fulfill(record: PaymentRecord) {
    if (record.purpose !== PaymentPurpose.CHURCH || record.status !== 'paid' || !String(record.referenceId).startsWith(REF_PREFIX)) return;
    const id = record.referenceId.slice(REF_PREFIX.length);
    if (!Types.ObjectId.isValid(id)) return;
    const gift = (await this.giftModel.findById(id).lean().exec()) as Lean | null;
    if (!gift || gift.status === 'paid') return;
    const amount = Number(record.baseAmount ?? record.chargedAmount);
    const currency = String(record.baseCurrency ?? record.chargedCurrency).toUpperCase();
    // Member gift: same account. Guest gift: no account on either side and the same email.
    const sameGiver = gift.userId
      ? sameId(gift.userId, record.userId)
      : !record.userId && Boolean(gift.guestEmail) && String(record.payerEmail ?? '').toLowerCase() === String(gift.guestEmail).toLowerCase();
    if (!sameGiver || currency !== String(gift.currency).toUpperCase() || Math.abs(amount - round2(Number(gift.amount) + Number(gift.coverFee ?? 0))) > 0.005) {
      this.logger.error(`Payment ${record.id} does not match church gift ${id}.`);
      return;
    }
    const updated = (await this.giftModel
      .findOneAndUpdate(
        { _id: gift._id, status: { $ne: 'paid' } },
        {
          $set: {
            status: 'paid',
            paidAt: new Date(),
            paymentId: record.id,
            paymentIntentId: record.stripePaymentIntentId,
            chargedAmount: record.chargedAmount,
            chargedCurrency: record.chargedCurrency,
            receiptNumber: this.receiptNumber(),
          },
        },
        { new: true },
      )
      .lean()
      .exec()) as Lean | null;
    if (!updated) return;

    const org = (await this.organizationModel.findById(gift.organizationId).select('name createdByUserId').lean().exec()) as Lean | null;
    if (!org) return;
    const orgId = String(org._id);
    const amountText = `${Number(gift.amount).toFixed(2)} ${gift.currency}`;
    await this.bell(
      [String(gift.userId)],
      `Thank you for your gift to ${org.name}`,
      `${gift.fundLabel}: ${amountText} received. Receipt ${updated.receiptNumber}.`,
      `/organizations/${orgId}#give`,
      String(gift._id),
    );
    // What the church is owed after the Fockis fee (paid out on its schedule).
    await this.orgPayouts
      ?.recordIncome({
        organizationId: orgId,
        sourceType: 'church_gift',
        sourceId: String(gift._id),
        paymentId: record.id,
        description: `${gift.fundLabel} — ${gift.anonymous ? 'Anonymous' : gift.giverName || 'Giver'}`,
        coveredFee: Number(gift.coverFee ?? 0),
      })
      .catch((e) => this.logger.error(`Gift ${String(gift._id)} could not be added to payouts: ${e?.message ?? e}`));
    // Email receipt + thank-you (the notification above is the in-app one).
    const givingSettings = await this.settingsOf(org._id);
    await this.receipts
      ?.sendReceipt(record.id, {
        receiptNumber: String(updated.receiptNumber ?? ''),
        description: `${gift.fundLabel} — ${org.name}`,
        payeeName: String(org.name ?? ''),
        thankYou: String(givingSettings.thankYouMessage ?? ''),
        link: `/organizations/${orgId}#give`,
        notify: false,
      })
      .catch((e) => this.logger.warn(`Gift receipt email not sent: ${e?.message ?? e}`));
    // Settings & Roles → Notifications → Donation notifications (on unless turned off).
    const prefs = (await this.prefsModel.findOne({ organizationId: org._id }).select('notifications').lean().exec()) as Lean | null;
    if (prefs?.notifications?.donations === false) return;
    const managers = (await this.managerIds(org._id, org.createdByUserId)).filter((u) => u !== String(gift.userId));
    await this.bell(
      managers,
      'New gift received',
      `${gift.fundLabel}: ${amountText} from ${gift.anonymous ? 'an anonymous giver' : gift.giverName || 'a giver'}.`,
      `/organizations/${orgId}/admin/giving`,
      String(gift._id),
    );
  }

  /** The signed-in person's own gifts to this church. */
  async myGifts(organizationId: string, userId: string) {
    const rows = (await this.giftModel
      .find({ organizationId: this.oid(organizationId, 'Organization ID'), userId: new Types.ObjectId(userId), status: { $in: ['paid', 'refunded'] } })
      .sort({ paidAt: -1 })
      .limit(200)
      .lean()
      .exec()) as Lean[];
    return { items: rows.map((g) => this.giftView(g, false)) };
  }

  /* ======================================================================
     Administration
     ====================================================================== */

  async adminOverview(organizationId: string, userId: string, query: Lean) {
    await this.requireManager(organizationId, userId);
    const org = await this.organization(organizationId);
    const settings = await this.settingsOf(org._id);

    const filter: Lean = { organizationId: org._id, status: 'paid' };
    const fund = str(query.fund, 40);
    if (fund) filter.fundKey = fund;
    const from = /^\d{4}-\d{2}-\d{2}$/.test(String(query.from ?? '')) ? new Date(`${query.from}T00:00:00.000Z`) : null;
    const to = /^\d{4}-\d{2}-\d{2}$/.test(String(query.to ?? '')) ? new Date(`${query.to}T23:59:59.999Z`) : null;
    if (from || to) filter.paidAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const base = { organizationId: org._id, status: 'paid' };
    const sum = async (match: Lean) =>
      (await this.giftModel.aggregate([{ $match: match }, { $group: { _id: '$currency', total: { $sum: '$amount' }, count: { $sum: 1 } } }]).exec()).map((r: Lean) => ({
        currency: r._id,
        total: round2(r.total),
        count: r.count,
      }));

    const [thisMonth, thisYear, allTime, byFund, rows] = await Promise.all([
      sum({ ...base, paidAt: { $gte: monthStart } }),
      sum({ ...base, paidAt: { $gte: yearStart } }),
      sum(base),
      this.giftModel
        .aggregate([{ $match: filter }, { $group: { _id: { fund: '$fundKey', label: '$fundLabel', currency: '$currency' }, total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }])
        .exec(),
      this.giftModel.find({ ...filter, status: { $in: ['paid', 'refunded'] } }).sort({ paidAt: -1 }).limit(500).lean().exec() as Promise<Lean[]>,
    ]);

    return {
      organization: { id: String(org._id), name: org.name },
      settings,
      currencies: GIVING_CURRENCIES,
      summary: {
        thisMonth,
        thisYear,
        allTime,
        byFund: byFund.map((r: Lean) => ({ fundKey: r._id.fund, fundLabel: r._id.label, currency: r._id.currency, total: round2(r.total), count: r.count })),
      },
      items: rows.map((g) => this.giftView(g, true)),
      truncated: rows.length >= 500,
      /** Only the owner can refund gifts (before they are paid out). */
      canRefund: sameId(org.createdByUserId, userId),
    };
  }

  /* ======================================================================
     Refunds
       - The giver can ask for a refund (the church is notified).
       - The church owner can refund a gift in full until it has been sent to
         the church's bank account (payouts). After that, Fockis support
         handles it and the amount is taken from the church's next payout.
       - Refunds made by Fockis admins or in Stripe arrive through
         "payments.refunded" and update the gift the same way.
     ====================================================================== */

  async requestRefund(organizationId: string, userId: string, giftId: string, reasonInput: unknown) {
    const gift = (await this.giftModel
      .findOne({ _id: this.oid(giftId, 'Gift ID'), organizationId: this.oid(organizationId, 'Organization ID') })
      .lean()
      .exec()) as Lean | null;
    if (!gift || !sameId(gift.userId, userId)) throw new NotFoundException('Gift not found.');
    if (gift.status !== 'paid') throw new BadRequestException('Only a received gift can be refunded.');
    if (gift.refundRequest?.at) throw new BadRequestException('You already asked for a refund of this gift.');
    const reason = str(reasonInput, 300);
    if (reason.length < 3) throw new BadRequestException('Tell the church why you are asking for a refund.');
    await this.giftModel.updateOne({ _id: gift._id }, { $set: { refundRequest: { at: new Date(), reason } } }).exec();

    const org = (await this.organizationModel.findById(gift.organizationId).select('name createdByUserId').lean().exec()) as Lean | null;
    if (org) {
      const managers = await this.managerIds(org._id, org.createdByUserId);
      await this.bell(
        managers,
        'Refund requested',
        `${gift.anonymous ? 'A giver' : gift.giverName || 'A giver'} asked for a refund of ${Number(gift.amount).toFixed(2)} ${gift.currency} (${gift.fundLabel}): ${reason}`,
        `/organizations/${String(org._id)}/admin/giving`,
        String(gift._id),
      );
    }
    const fresh = (await this.giftModel.findById(gift._id).lean().exec()) as Lean;
    return this.giftView(fresh, false);
  }

  async refundGift(organizationId: string, userId: string, giftId: string, reasonInput: unknown) {
    const org = await this.organization(organizationId);
    if (!sameId(org.createdByUserId, userId)) throw new ForbiddenException("Only the church's owner can refund gifts.");
    const gift = (await this.giftModel.findOne({ _id: this.oid(giftId, 'Gift ID'), organizationId: org._id }).lean().exec()) as Lean | null;
    if (!gift) throw new NotFoundException('Gift not found.');
    if (gift.status !== 'paid' || !gift.paymentId) throw new BadRequestException('Only a received gift can be refunded.');
    const reason = str(reasonInput, 300) || 'Refunded by the church';

    // The gift must not have been sent to the church's bank yet.
    let reserved = false;
    if (this.orgPayouts) {
      const state = await this.orgPayouts.reserveForRefund(String(gift.paymentId));
      if (state === 'paid_out') {
        throw new BadRequestException('This gift was already sent to your bank account. Contact Fockis support to refund it; the amount will be taken from your next payout.');
      }
      reserved = state === 'reserved';
      if (state === 'no_line') {
        const days = Number((await this.orgPayouts.getConfig()).holdDays ?? 7);
        const paidAt = gift.paidAt ? new Date(gift.paidAt).getTime() : 0;
        if (Date.now() - paidAt > days * 86_400_000) {
          throw new BadRequestException(`Gifts can be refunded here within ${days} days. Contact Fockis support for older gifts.`);
        }
      }
    }

    try {
      await this.payments.refundAsPlatform(String(gift.paymentId), undefined, userId, reason);
    } catch (e) {
      if (reserved) await this.orgPayouts?.releaseReservation(String(gift.paymentId));
      throw e;
    }
    // The "payments.refunded" event updates the gift and the payout ledger;
    // apply it here too so the response is up to date.
    await this.applyRefund(String(gift.paymentId));
    const fresh = (await this.giftModel.findById(gift._id).lean().exec()) as Lean;
    return this.giftView(fresh, true);
  }

  @OnEvent('payments.refunded')
  async onPaymentRefunded(payload: { paymentId?: string; purpose?: string; referenceId?: string }) {
    if (payload?.purpose !== PaymentPurpose.CHURCH || !String(payload.referenceId ?? '').startsWith(REF_PREFIX) || !payload.paymentId) return;
    try {
      await this.applyRefund(payload.paymentId);
    } catch (err) {
      this.logger.error(`Refund of church gift payment ${payload.paymentId} could not be applied: ${String(err)}`);
    }
  }

  /** Mirrors the payment's refunded total on the gift (idempotent). */
  private async applyRefund(paymentId: string) {
    const record = (await this.connection.collection('payments').findOne({ id: paymentId })) as Lean | null;
    if (!record || !String(record.referenceId).startsWith(REF_PREFIX)) return;
    const id = String(record.referenceId).slice(REF_PREFIX.length);
    if (!Types.ObjectId.isValid(id)) return;
    const gift = (await this.giftModel.findById(id).lean().exec()) as Lean | null;
    if (!gift || (gift.status !== 'paid' && gift.status !== 'refunded')) return;

    const charged = Number(record.chargedAmount ?? 0);
    const refunded = Number(record.refundedAmount ?? 0);
    if (charged <= 0 || refunded <= 0) return;
    const full = refunded >= charged - 0.000001;
    const giftTotal = round2(Number(gift.amount) + Number(gift.coverFee ?? 0));
    const refundedInGiftCurrency = full ? giftTotal : round2((giftTotal * refunded) / charged);
    if (refundedInGiftCurrency <= Number(gift.refundedAmount ?? 0) && (!full || gift.status === 'refunded')) return;

    const updated = (await this.giftModel
      .findOneAndUpdate(
        { _id: gift._id, refundedAmount: { $lt: refundedInGiftCurrency } },
        { $set: { refundedAmount: refundedInGiftCurrency, ...(full ? { status: 'refunded', refundedAt: new Date() } : {}) } },
        { new: true },
      )
      .lean()
      .exec()) as Lean | null;
    if (!updated) return;

    const org = (await this.organizationModel.findById(gift.organizationId).select('name').lean().exec()) as Lean | null;
    await this.bell(
      [String(gift.userId)],
      full ? 'Your gift was refunded' : 'Part of your gift was refunded',
      `${money2(refundedInGiftCurrency - Number(gift.refundedAmount ?? 0), gift.currency)} for ${gift.fundLabel}${org?.name ? ` to ${org.name}` : ''} is being returned to your card. It can take 5–10 business days to appear.`,
      `/organizations/${String(gift.organizationId)}#give`,
      String(gift._id),
    );
  }

  async saveSettings(organizationId: string, userId: string, input: Lean) {
    await this.requireManager(organizationId, userId);
    const org = await this.organization(organizationId);
    const current = await this.settingsOf(org._id);
    const set: Lean = { updatedByUserId: new Types.ObjectId(userId) };

    if (input.enabled !== undefined) set.enabled = Boolean(input.enabled);
    if (input.allowGuests !== undefined) set.allowGuests = Boolean(input.allowGuests);
    if (input.currency !== undefined) {
      const c = String(input.currency).toUpperCase();
      if (!GIVING_CURRENCIES.includes(c)) throw new BadRequestException('Choose a supported currency.');
      set.currency = c;
    }
    if (input.message !== undefined) set.message = str(input.message, 600);
    if (input.thankYouMessage !== undefined) set.thankYouMessage = str(input.thankYouMessage, 400);
    if (input.suggestedAmounts !== undefined) {
      const list = (Array.isArray(input.suggestedAmounts) ? input.suggestedAmounts : [])
        .map((n: unknown) => round2(Number(n)))
        .filter((n: number) => Number.isFinite(n) && n >= MIN_AMOUNT && n <= MAX_AMOUNT);
      set.suggestedAmounts = [...new Set(list)].slice(0, 6);
    }
    if (input.funds !== undefined) {
      if (!Array.isArray(input.funds)) throw new BadRequestException('Funds must be a list.');
      const seen = new Set<string>();
      const funds: Lean[] = [];
      for (const raw of input.funds.slice(0, 12)) {
        const label = str(raw?.label, 60);
        if (!label) continue;
        // Existing funds keep their key so past gifts stay grouped; new funds get one from the label.
        let key = slugKey(str(raw?.key, 40)) || slugKey(label) || `fund_${funds.length + 1}`;
        while (seen.has(key)) key = `${key.slice(0, 36)}_${funds.length + 1}`;
        seen.add(key);
        funds.push({ key, label, description: str(raw?.description, 200), active: raw?.active !== false });
      }
      if (!funds.some((f) => f.active)) throw new BadRequestException('Keep at least one fund available for giving.');
      set.funds = funds;
    }
    const enabling = set.enabled === true || (set.enabled === undefined && current.enabled);
    const fundsAfter = (set.funds ?? current.funds) as Lean[];
    if (enabling && !fundsAfter.some((f) => f.active !== false)) throw new BadRequestException('Add at least one fund before turning on online giving.');

    await this.settingsModel.updateOne({ organizationId: org._id }, { $set: set, $setOnInsert: { organizationId: org._id } }, { upsert: true }).exec();
    return this.settingsOf(org._id);
  }
}
