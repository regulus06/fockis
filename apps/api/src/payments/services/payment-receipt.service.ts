/**
 * payment-receipt.service.ts
 * -----------------------------------------------------------------------------
 * One receipt for every successful Fockis payment: an email to the payer
 * (receipt + thank-you note) and one in-app notification.
 *
 *   - Triggered by "payments.paid" (emitted by UniversalPaymentService for
 *     every purpose, once Stripe reports the payment succeeded).
 *   - Sent at most once per payment: the payment record is claimed with
 *     receiptSentAt before sending (the success path can run more than once:
 *     /payments/confirm, the Stripe webhook and retries).
 *   - Modules that already have their own receipt details call sendReceipt()
 *     themselves (DELEGATED purposes), e.g. church gifts pass their receipt
 *     number and the church's own thank-you message.
 *   - Only the payer receives the email. Nothing secret is included (no card
 *     data, no tokens); amounts come from the stored payment record.
 *   - An email that cannot be sent never affects the payment; the claim is
 *     released so a later success event can retry it.
 * -----------------------------------------------------------------------------
 */

import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { Payment, PaymentDocument } from "../schemas/payment.schema";
import { User, UserDocument } from "../../users/user.schema";
import { PaymentPurpose } from "../constants/payment-purpose.constants";
import { PaymentStatus } from "../constants/payment-status.constants";
import { NotificationsService } from "../../notifications/notifications.service";
import { RegistrationMailer, escapeHtml } from "../../events/registrations/registration-mailer";

/** Purposes whose module sends the receipt itself through sendReceipt(). */
const DELEGATED = new Set<string>([PaymentPurpose.CHURCH]);

/** What the payment was for, as the payer would describe it. */
const PURPOSE_LABELS: Record<string, string> = {
  [PaymentPurpose.FOCKIS_ID]: "Fockis ID verification",
  [PaymentPurpose.MARKETPLACE_ORDER]: "Fockis Shop order",
  [PaymentPurpose.COIN_PURCHASE]: "Fockis coins",
  [PaymentPurpose.TRAVEL_BOOKING]: "Travel booking",
  [PaymentPurpose.MUSIC]: "Music purchase",
  [PaymentPurpose.EVENT]: "Event registration",
  [PaymentPurpose.MEETING]: "Meeting",
  [PaymentPurpose.CHURCH]: "Gift",
  [PaymentPurpose.ADVERTISING]: "Advertising",
  [PaymentPurpose.SUBSCRIPTION]: "Subscription",
  [PaymentPurpose.WEBSITE_ORDER]: "Website order",
  [PaymentPurpose.NEWS_DONATION]: "Donation",
  [PaymentPurpose.OTHER]: "Payment",
};

/** Purposes that are gifts rather than purchases (changes the thank-you wording). */
const GIFT_PURPOSES = new Set<string>([PaymentPurpose.CHURCH, PaymentPurpose.NEWS_DONATION]);

export interface ReceiptDetails {
  /** Shown as the receipt number (defaults to one derived from the payment). */
  receiptNumber?: string;
  /** Line describing what was paid for, e.g. "Tithe — Église Méthodiste". */
  description?: string;
  /** Who received the payment, e.g. the church name. */
  payeeName?: string;
  /** Personal thank-you note (e.g. the church's own message). */
  thankYou?: string;
  /** App path for the notification / email button, e.g. "/organizations/…#give". */
  link?: string;
  /** false when the caller already sent its own in-app notification. */
  notify?: boolean;
}

interface Lean {
  [key: string]: any;
}

@Injectable()
export class PaymentReceiptService {
  private readonly logger = new Logger(PaymentReceiptService.name);

  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly notifications: NotificationsService,
    private readonly mailer: RegistrationMailer,
  ) {}

  @OnEvent("payments.paid", { async: true })
  async onPaid(payload: { paymentId?: string; purpose?: string }): Promise<void> {
    if (!payload?.paymentId || DELEGATED.has(String(payload.purpose))) return;
    try {
      await this.sendReceipt(payload.paymentId);
    } catch (error) {
      this.logger.error(`Receipt for payment ${payload.paymentId} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Email + notify the payer once for a paid payment. Returns true when the
   * email was handed to the provider (false when already sent, not paid, or
   * the email could not be sent).
   */
  async sendReceipt(paymentId: string, details: ReceiptDetails = {}): Promise<boolean> {
    // Claim: only one caller gets past this for a given payment.
    const payment = (await this.paymentModel
      .findOneAndUpdate(
        { id: paymentId, status: PaymentStatus.PAID, receiptSentAt: null },
        { $set: { receiptSentAt: new Date() } },
        { new: true },
      )
      .lean()
      .exec()) as Lean | null;
    if (!payment) return false;

    const userId = String(payment.userId ?? "");
    const user = Types.ObjectId.isValid(userId)
      ? ((await this.userModel.findById(userId).select("email name fullName displayName username").lean().exec()) as Lean | null)
      : null;

    const purpose = String(payment.purpose ?? PaymentPurpose.OTHER);
    const label = PURPOSE_LABELS[purpose] ?? PURPOSE_LABELS[PaymentPurpose.OTHER];
    const description = (details.description || String(payment.metadata?.description ?? "") || label).slice(0, 160);
    const receiptNumber = details.receiptNumber || receiptNumberFor(String(payment.id));
    const isGift = GIFT_PURPOSES.has(purpose);
    const amount = formatAmount(payment.chargedAmount, payment.chargedCurrency);
    const baseDiffers =
      String(payment.baseCurrency ?? "").toUpperCase() !== String(payment.chargedCurrency ?? "").toUpperCase();
    const baseAmount = baseDiffers ? formatAmount(payment.baseAmount, payment.baseCurrency) : "";
    const paidAt = payment.paidAt ? new Date(payment.paidAt) : new Date();
    // Guest payments (no Fockis account) carry the payer's own name/email.
    const name = String(user?.name || user?.fullName || user?.displayName || user?.username || payment.payerName || "").trim();
    const thankYou =
      details.thankYou?.trim() ||
      (isGift
        ? `Thank you for your generosity${details.payeeName ? ` to ${details.payeeName}` : ""}. Your gift makes a real difference.`
        : "Thank you for your payment. We appreciate you choosing Fockis.");

    // In-app notification (one per payment).
    if (details.notify !== false && Types.ObjectId.isValid(userId)) {
      await this.notifications
        .create({
          recipientId: userId,
          type: "SYSTEM",
          title: isGift ? "Thank you for your gift" : "Payment received",
          message: `${description}: ${amount}. Receipt ${receiptNumber}.`.slice(0, 300),
          entityId: String(payment.id),
          entityType: "payment_receipt",
          ...(details.link ? { link: details.link } : {}),
        } as never)
        .catch((e: unknown) => this.logger.warn(`Receipt notification not sent: ${e instanceof Error ? e.message : String(e)}`));
    }

    // Email receipt.
    const email = String(user?.email ?? payment.payerEmail ?? "").trim();
    if (!email) {
      this.logger.warn(`Payment ${payment.id}: payer has no email address; receipt email skipped.`);
      return false;
    }

    const message = renderReceipt({
      name,
      heading: isGift ? "Thank you for your gift" : "Thank you for your payment",
      thankYou,
      receiptNumber,
      paymentReference: String(payment.id),
      description,
      payeeName: details.payeeName ?? "",
      amount,
      baseAmount,
      paidAt,
      link: details.link ? absoluteUrl(details.link) : "",
    });

    const sent = await this.mailer.send({
      to: email,
      subject: `${isGift ? "Thank you" : "Your receipt"} — ${description} (${receiptNumber})`.slice(0, 180),
      text: message.text,
      html: message.html,
    });

    if (!sent) {
      // Release the claim so the next success event (webhook retry) can try again.
      await this.paymentModel.updateOne({ id: payment.id }, { $set: { receiptSentAt: null } }).exec();
      this.logger.warn(`Payment ${payment.id}: receipt email could not be sent.`);
    }
    return sent;
  }
}

/* ------------------------------------------------------------------ helpers */

export function receiptNumberFor(paymentId: string): string {
  const compact = paymentId.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return `FK-${compact.slice(0, 10) || "RECEIPT"}`;
}

export function formatAmount(value: unknown, currency: unknown): string {
  const n = Number(value);
  const code = String(currency ?? "").toUpperCase();
  if (!Number.isFinite(n)) return code;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code || "USD" }).format(n);
  } catch {
    return `${n.toFixed(2)} ${code}`;
  }
}

function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = String(process.env.FRONTEND_URL ?? "").replace(/\/+$/, "");
  return base ? `${base}${path.startsWith("/") ? "" : "/"}${path}` : "";
}

export interface ReceiptView {
  name: string;
  heading: string;
  thankYou: string;
  receiptNumber: string;
  paymentReference: string;
  description: string;
  payeeName: string;
  amount: string;
  baseAmount: string;
  paidAt: Date;
  link: string;
}

export function renderReceipt(v: ReceiptView): { html: string; text: string } {
  const date = `${v.paidAt.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" })} UTC`;
  const rows: Array<[string, string]> = [
    ["Receipt number", v.receiptNumber],
    ["Date", date],
    ["For", v.description],
    ...(v.payeeName ? ([["Paid to", v.payeeName]] as Array<[string, string]>) : []),
    ["Amount paid", v.amount],
    ...(v.baseAmount ? ([["Original amount", v.baseAmount]] as Array<[string, string]>) : []),
    ["Payment reference", v.paymentReference],
  ];

  const greeting = v.name ? `Hi ${escapeHtml(v.name)},` : "Hello,";
  const tableRows = rows
    .map(
      ([k, val]) =>
        `<tr><td style="padding:8px 0;color:#64748b;font-size:14px;width:42%">${escapeHtml(k)}</td><td style="padding:8px 0;color:#0f1b3d;font-size:14px;font-weight:600;text-align:right">${escapeHtml(val)}</td></tr>`,
    )
    .join("");
  const button = v.link
    ? `<p style="margin:20px 0 0"><a href="${escapeHtml(v.link)}" style="display:inline-block;background:#1d6cf2;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">View on Fockis</a></p>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;background:#0b1530;padding:24px 12px;font-family:Segoe UI,Arial,sans-serif">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border-collapse:separate">
    <tr><td style="background:linear-gradient(135deg,#0b1f4d,#1d6cf2);border-radius:16px 16px 0 0;padding:20px 24px;color:#fff;font-size:20px;font-weight:800">Fockis</td></tr>
    <tr><td style="padding:24px">
      <h1 style="margin:0 0 14px;font-size:22px;color:#0f1b3d">${escapeHtml(v.heading)}</h1>
      <p style="margin:0 0 10px;font-size:15px;line-height:1.55;color:#1e293b">${greeting}</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#1e293b">${escapeHtml(v.thankYou)}</p>
      <table role="presentation" width="100%" style="border-collapse:collapse;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0">${tableRows}</table>
      ${button}
      <p style="margin:18px 0 0;font-size:12px;color:#64748b">Keep this email as your receipt. If you don't recognise this payment, reply to this email or contact Fockis support.</p>
    </td></tr></table></body></html>`;

  const text = [
    v.heading,
    "",
    v.name ? `Hi ${v.name},` : "Hello,",
    v.thankYou,
    "",
    ...rows.map(([k, val]) => `${k}: ${val}`),
    ...(v.link ? ["", `View on Fockis: ${v.link}`] : []),
    "",
    "Keep this email as your receipt. If you don't recognise this payment, contact Fockis support.",
  ].join("\n");

  return { html, text };
}
