import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { Db, ObjectId } from "mongodb";

@Injectable()
export class FinanceAdminService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  private get db(): Db {
    const db = this.connection.db;
    if (!db) {
      throw new Error("MongoDB database connection is not ready.");
    }
    return db;
  }
  private money(amount: unknown, currency = "USD") {
    const n = Number(amount ?? 0);
    return { amount: Number.isFinite(n) ? Number(n.toFixed(2)) : 0, currency: String(currency || "USD") };
  }
  private id(value: any) { return value == null ? "" : String(value); }
  private date(value: any) { return value ? new Date(value).toISOString() : new Date().toISOString(); }
  private number(value: any, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
  private oid(value: string) {
    return ObjectId.isValid(value) ? new ObjectId(value) : null;
  }
  private async docs(name: string, filter: any = {}, limit = 250) {
    try { return await this.db.collection(name).find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit).toArray(); }
    catch { return []; }
  }
  private async one(name: string, id: string) {
    const c = this.db.collection(name);
    const oid = this.oid(id);
    return oid
      ? await c.findOne({ _id: oid } as any)
      : await c.findOne({ $or: [{ id }, { _id: id }] } as any);
  }
  private async users(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return new Map<string, any>();
    const oid: ObjectId[] = unique
      .map((x) => this.oid(x))
      .filter((value): value is ObjectId => value !== null);
    const filters: any[] = [{ id: { $in: unique } }];
    if (oid.length) filters.push({ _id: { $in: oid } });
    const rows = await this.db.collection("users")
      .find({ $or: filters } as any)
      .limit(1000)
      .toArray()
      .catch(() => []);
    const map = new Map<string, any>();
    for (const u of rows) {
      const key = this.id(u._id);
      const alt = this.id(u.id);
      if (key) map.set(key, u);
      if (alt) map.set(alt, u);
    }
    return map;
  }
  private userName(user: any) {
    if (!user) return "Unknown";
    return user.name || user.displayName || user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.email || "Unknown";
  }
  private periodDays(period: string) {
    const m = /^([0-9]+)([dwmy])$/i.exec(String(period || "30d"));
    if (!m) return 30;
    const n = Math.max(1, Number(m[1]));
    const unit = m[2].toLowerCase();
    return unit === "w" ? n * 7 : unit === "m" ? n * 30 : unit === "y" ? n * 365 : n;
  }
  private since(period: string) { return new Date(Date.now() - this.periodDays(period) * 86400000); }
  private status(raw: any): string {
    const s = String(raw || "PENDING").toUpperCase();
    if (["SUCCEEDED", "PAID", "COMPLETED", "SUCCESS"].includes(s)) return "COMPLETED";
    if (["REFUNDED"].includes(s)) return "REFUNDED";
    if (["PARTIALLY_REFUNDED"].includes(s)) return "PARTIALLY_REFUNDED";
    if (["CANCELED", "CANCELLED"].includes(s)) return "CANCELLED";
    if (["FAILED", "PAYMENT_FAILED"].includes(s)) return "FAILED";
    if (["PROCESSING"].includes(s)) return "PROCESSING";
    if (["PAST_DUE"].includes(s)) return "PAST_DUE";
    return "PENDING";
  }
  private paymentAmount(p: any) { return this.number(p.chargedAmount ?? p.amount ?? p.baseAmount ?? p.totalAmount); }
  private paymentCurrency(p: any) { return String(p.chargedCurrency ?? p.currency ?? p.baseCurrency ?? "USD"); }

  async overview(period = "30d") {
    const since = this.since(period);
    const payments = await this.docs("payments", { createdAt: { $gte: since } }, 5000);
    const payouts = await this.docs("payouts", { createdAt: { $gte: since } }, 5000);
    const refunds = await this.docs("refunds", { createdAt: { $gte: since } }, 5000);
    const completedPayments = payments.filter((p) => ["PAID", "SUCCEEDED", "COMPLETED"].includes(String(p.status).toUpperCase()));
    const gross = completedPayments.reduce((s, p) => s + this.paymentAmount(p), 0);
    const refundTotal = refunds.reduce((s, r) => s + this.number(r.amount ?? r.refundAmount), 0) || payments.reduce((s, p) => s + this.number(p.refundedAmount), 0);
    const payoutTotal = payouts.reduce((s, p) => s + this.number(p.netAmount ?? p.amount ?? p.payoutAmount), 0);
    const feeTotal = completedPayments.reduce((s, p) => s + this.number(p.metadata?.fockisFee ?? p.fockisFee ?? p.platformFee), 0);
    const activeSubscriptions = await this.db.collection("subscriptions").countDocuments({ status: { $in: ["ACTIVE", "active", "TRIAL", "trial"] } }).catch(() => 0);
    return {
      grossRevenue: this.money(gross),
      netRevenue: this.money(gross - refundTotal - payoutTotal),
      platformFees: this.money(feeTotal),
      totalPayments: this.money(gross),
      totalPayouts: this.money(payoutTotal),
      totalRefunds: this.money(refundTotal),
      pendingPayouts: this.money(payouts.filter((p) => ["PENDING", "PROCESSING"].includes(String(p.status).toUpperCase())).reduce((s, p) => s + this.number(p.netAmount ?? p.amount), 0)),
      activeSubscriptions,
      transactionCount: payments.length + payouts.length + refunds.length,
      period,
    };
  }

  async transactions(query: Record<string, string> = {}) {
    const limit = Math.min(500, Math.max(1, Number(query.limit || 250)));
    const [payments, payouts, refunds, subscriptions] = await Promise.all([
      this.docs("payments", {}, limit), this.docs("payouts", {}, limit), this.docs("refunds", {}, limit), this.docs("subscriptions", {}, limit),
    ]);
    const rows: any[] = [];
    const users = await this.users([...payments, ...payouts, ...refunds, ...subscriptions].map((x) => this.id(x.userId ?? x.customerId ?? x.ownerId)));
    for (const p of payments) {
      const purpose = String(p.purpose || "").toUpperCase();
      const type = purpose.includes("COIN") ? "COIN_PURCHASE" : purpose.includes("GIFT") ? "GIFT_PURCHASE" : purpose.includes("SUB") ? "SUBSCRIPTION" : purpose.includes("TRAVEL") ? "TRAVEL_PAYMENT" : purpose.includes("AD") ? "AD_PAYMENT" : purpose.includes("AI") ? "AI_CREDIT_PURCHASE" : purpose.includes("REAL") ? "REAL_ESTATE_FEE" : "SHOP_PAYMENT";
      rows.push({ id: this.id(p.id || p._id), type, referenceId: this.id(p.referenceId), referenceNumber: this.id(p.referenceNumber), userId: this.id(p.userId), userName: this.userName(users.get(this.id(p.userId))), merchantId: this.id(p.merchantId ?? p.sellerId), merchantName: this.userName(users.get(this.id(p.merchantId ?? p.sellerId))), amount: this.money(this.paymentAmount(p), this.paymentCurrency(p)), status: this.status(p.status), description: p.description || p.purpose || "Payment", createdAt: this.date(p.createdAt) });
    }
    for (const p of payouts) rows.push({ id: this.id(p.id || p._id), type: "SELLER_PAYOUT", referenceId: this.id(p.orderId), userId: this.id(p.sellerId), userName: p.sellerName || this.userName(users.get(this.id(p.sellerId))), amount: this.money(p.netAmount ?? p.amount ?? p.payoutAmount, p.currency), status: this.status(p.status), description: "Seller payout", createdAt: this.date(p.createdAt) });
    for (const r of refunds) rows.push({ id: this.id(r.id || r._id), type: "REFUND", referenceId: this.id(r.paymentId), userId: this.id(r.customerId ?? r.userId), userName: r.customerName || this.userName(users.get(this.id(r.customerId ?? r.userId))), amount: this.money(r.amount ?? r.refundAmount, r.currency), status: this.status(r.status), description: r.reason || "Refund", createdAt: this.date(r.createdAt) });
    for (const s of subscriptions) rows.push({ id: this.id(s.id || s._id), type: "SUBSCRIPTION", referenceId: this.id(s._id), userId: this.id(s.userId), userName: s.userName || this.userName(users.get(this.id(s.userId))), amount: this.money(s.amount ?? s.price, s.currency), status: this.status(s.status), description: s.plan || "Subscription", createdAt: this.date(s.createdAt) });
    const filtered = rows.filter((r) => (!query.type || r.type === query.type) && (!query.referenceId || r.referenceId === query.referenceId) && (!query.status || r.status === String(query.status).toUpperCase()) && (!query.userId || r.userId === query.userId));
    return filtered.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, limit);
  }

  async revenue(period = "30d") {
    const since = this.since(period);
    const payments = await this.docs("payments", { createdAt: { $gte: since } }, 5000);
    const refunds = await this.docs("refunds", { createdAt: { $gte: since } }, 5000);
    const map = new Map<string, { gross: number; fees: number; refunds: number }>();
    for (const p of payments.filter((x) => ["PAID", "SUCCEEDED", "COMPLETED"].includes(String(x.status).toUpperCase()))) {
      const d = this.date(p.createdAt).slice(0, 10); const v = map.get(d) || { gross: 0, fees: 0, refunds: 0 }; v.gross += this.paymentAmount(p); v.fees += this.number(p.metadata?.fockisFee ?? p.fockisFee ?? p.platformFee); map.set(d, v);
    }
    for (const r of refunds) { const d = this.date(r.createdAt).slice(0, 10); const v = map.get(d) || { gross: 0, fees: 0, refunds: 0 }; v.refunds += this.number(r.amount ?? r.refundAmount); map.set(d, v); }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, gross: this.money(v.gross), fees: this.money(v.fees), refunds: this.money(v.refunds), net: this.money(v.gross - v.refunds) }));
  }

  async fees(period = "30d") {
    const since = this.since(period); const payments = await this.docs("payments", { createdAt: { $gte: since } }, 5000); const groups = new Map<string, any>();
    for (const p of payments) { const source = String(p.purpose || "SHOP_PAYMENT"); const gross = this.paymentAmount(p); const fees = this.number(p.metadata?.fockisFee ?? p.fockisFee ?? p.platformFee); const g = groups.get(source) || { transactionCount: 0, gross: 0, fees: 0 }; g.transactionCount++; g.gross += gross; g.fees += fees; groups.set(source, g); }
    return [...groups.entries()].map(([source, v]) => ({ source, transactionCount: v.transactionCount, gross: this.money(v.gross), fees: this.money(v.fees), net: this.money(v.gross - v.fees) }));
  }

  async invoices(query: Record<string, string> = {}) {
    const rows = await this.docs("invoices", {}, Math.min(500, Number(query.limit || 250))); const users = await this.users(rows.map((x) => this.id(x.customerId ?? x.userId)));
    return rows.map((x) => ({ id: this.id(x.id || x._id), invoiceNumber: x.invoiceNumber || x.number || `INV-${this.id(x._id).slice(-8)}`, customerId: this.id(x.customerId ?? x.userId), customerName: x.customerName || this.userName(users.get(this.id(x.customerId ?? x.userId))), source: String(x.source || "OTHER").toUpperCase(), amount: this.money(x.amount ?? x.total ?? x.totalAmount, x.currency), status: String(x.status || "OPEN").toUpperCase(), dueAt: x.dueAt ? this.date(x.dueAt) : undefined, paidAt: x.paidAt ? this.date(x.paidAt) : undefined, createdAt: this.date(x.createdAt) }));
  }

  async wallets(query: Record<string, string> = {}) {
    const rows = await this.docs("wallets", {}, Math.min(500, Number(query.limit || 250))); const users = await this.users(rows.map((x) => this.id(x.ownerId ?? x.userId)));
    return rows.map((x) => ({ id: this.id(x.id || x._id), ownerId: this.id(x.ownerId ?? x.userId), ownerName: x.ownerName || this.userName(users.get(this.id(x.ownerId ?? x.userId))), type: String(x.type || "USER").toUpperCase(), available: this.money(x.available ?? x.balance, x.currency), pending: this.money(x.pending ?? x.pendingBalance, x.currency), lifetimeIn: this.money(x.lifetimeIn ?? x.totalIn, x.currency), lifetimeOut: this.money(x.lifetimeOut ?? x.totalOut, x.currency), status: String(x.status || "ACTIVE").toUpperCase() }));
  }

  async coins(query: Record<string, string> = {}) {
    const rows = await this.docs("coinbalances", {}, Math.min(500, Number(query.limit || 250))).then(async (x) => x.length ? x : this.docs("coin_balances", {}, Math.min(500, Number(query.limit || 250))));
    const users = await this.users(rows.map((x) => this.id(x.userId)));
    return rows.map((x) => ({ userId: this.id(x.userId), userName: x.userName || this.userName(users.get(this.id(x.userId))), balance: this.number(x.balance ?? x.coins), purchased: this.number(x.purchased), spent: this.number(x.spent), gifted: this.number(x.gifted), updatedAt: this.date(x.updatedAt ?? x.updatedAt) }));
  }

  async reports() {
    const periods = ["7d", "30d", "90d", "365d"];
    const out: any[] = [];
    for (const period of periods) { const o = await this.overview(period); out.push({ id: `finance-${period}`, name: `Finance report (${period})`, period, gross: o.grossRevenue, fees: o.platformFees, refunds: o.totalRefunds, payouts: o.totalPayouts, net: o.netRevenue, createdAt: new Date().toISOString() }); }
    return out;
  }

  async shopOrderFinance(orderId: string) {
    const oid = this.oid(orderId); const order = oid ? await this.db.collection("orders").findOne({ _id: oid }) : await this.db.collection("orders").findOne({ $or: [{ id: orderId }, { orderId }] });
    if (!order) throw new NotFoundException("Shop order not found");
    const subtotal = this.number(order.subtotal ?? order.itemsSubtotal ?? order.subTotal); const shipping = this.number(order.shipping ?? order.shippingAmount ?? order.shippingCost); const tax = this.number(order.tax ?? order.taxAmount); const discount = this.number(order.discount ?? order.discountAmount); const total = this.number(order.total ?? order.totalAmount ?? order.grandTotal, subtotal + shipping + tax - discount);
    const payment = await this.db.collection("payments").findOne({ $or: [{ referenceId: orderId }, { orderId }, { referenceId: this.id(order._id) }] });
    const payout = await this.db.collection("payouts").findOne({ $or: [{ orderId }, { orderId: this.id(order._id) }] });
    const fee = this.number(order.fockisFee ?? order.platformFee ?? order.fee ?? payment?.metadata?.fockisFee ?? payment?.fockisFee, Math.max(0, total - this.number(payout?.netAmount ?? payout?.amount, total)));
    const sellerPayout = this.number(payout?.netAmount ?? payout?.amount, Math.max(0, total - fee));
    const ids = await this.users([this.id(order.customerId ?? order.userId), this.id(order.sellerId ?? order.merchantId)]);
    return { orderId: this.id(order.id || order._id), orderNumber: order.orderNumber || order.number || `ORDER-${this.id(order._id).slice(-8)}`, customerId: this.id(order.customerId ?? order.userId), customerName: this.userName(ids.get(this.id(order.customerId ?? order.userId))), sellerId: this.id(order.sellerId ?? order.merchantId), sellerName: order.sellerName || this.userName(ids.get(this.id(order.sellerId ?? order.merchantId))), subtotal: this.money(subtotal), shipping: this.money(shipping), tax: this.money(tax), discount: this.money(discount), total: this.money(total), paymentStatus: this.status(payment?.status ?? order.paymentStatus), paymentId: this.id(payment?.id || payment?._id), sellerPayoutId: this.id(payout?.id || payout?._id), fockisFee: this.money(fee), sellerPayout: this.money(sellerPayout), createdAt: this.date(order.createdAt) };
  }

  async payouts(query: Record<string, string> = {}) { const rows = await this.docs("payouts", {}, Math.min(500, Number(query.limit || 250))); return rows.map((p) => this.payoutDto(p)); }
  async payout(id: string) { const p = await this.one("payouts", id); if (!p) throw new NotFoundException("Payout not found"); return this.payoutDto(p); }
  private payoutDto(p: any) { return { id: this.id(p.id || p._id), sellerId: this.id(p.sellerId), sellerName: p.sellerName || "Unknown", orderId: this.id(p.orderId), orderNumber: p.orderNumber, grossAmount: this.money(p.grossAmount ?? p.gross ?? p.amount, p.currency), fockisFee: this.money(p.fockisFee ?? p.fee ?? p.platformFee, p.currency), netAmount: this.money(p.netAmount ?? p.net ?? p.amount, p.currency), status: this.status(p.status), scheduledAt: p.scheduledAt ? this.date(p.scheduledAt) : undefined, paidAt: p.paidAt ? this.date(p.paidAt) : undefined, createdAt: this.date(p.createdAt) }; }
  async approvePayout(id: string) { return this.updateStatus("payouts", id, "COMPLETED", { paidAt: new Date() }, "Payout not found").then(this.payoutDto.bind(this)); }
  async cancelPayout(id: string) { return this.updateStatus("payouts", id, "CANCELLED", {}, "Payout not found").then(this.payoutDto.bind(this)); }

  async refunds(query: Record<string, string> = {}) { const rows = await this.docs("refunds", {}, Math.min(500, Number(query.limit || 250))); return rows.map((r) => this.refundDto(r)); }
  async refund(id: string) { const r = await this.one("refunds", id); if (!r) throw new NotFoundException("Refund not found"); return this.refundDto(r); }
  private refundDto(r: any) { return { id: this.id(r.id || r._id), paymentId: this.id(r.paymentId), orderId: this.id(r.orderId), orderNumber: r.orderNumber, customerId: this.id(r.customerId ?? r.userId), customerName: r.customerName || "Unknown", amount: this.money(r.amount ?? r.refundAmount, r.currency), reason: r.reason, status: this.status(r.status), createdAt: this.date(r.createdAt) }; }
  async approveRefund(id: string) { return this.updateStatus("refunds", id, "COMPLETED", { approvedAt: new Date() }, "Refund not found").then(this.refundDto.bind(this)); }
  async rejectRefund(id: string, reason?: string) { return this.updateStatus("refunds", id, "CANCELLED", { rejectedAt: new Date(), rejectionReason: reason || "Rejected by admin" }, "Refund not found").then(this.refundDto.bind(this)); }

  async subscriptions(query: Record<string, string> = {}) { const rows = await this.docs("subscriptions", {}, Math.min(500, Number(query.limit || 250))); const users = await this.users(rows.map((x) => this.id(x.userId))); return rows.map((s) => ({ id: this.id(s.id || s._id), userId: this.id(s.userId), userName: s.userName || this.userName(users.get(this.id(s.userId))), plan: s.plan || s.planName || "Subscription", amount: this.money(s.amount ?? s.price, s.currency), status: String(s.status || "ACTIVE").toUpperCase(), renewsAt: s.renewsAt || s.currentPeriodEnd ? this.date(s.renewsAt || s.currentPeriodEnd) : undefined, createdAt: this.date(s.createdAt) })); }
  async subscription(id: string) { const rows = await this.subscriptions({}); const row = rows.find((x) => x.id === id); if (!row) throw new NotFoundException("Subscription not found"); return row; }
  async cancelSubscription(id: string) { return this.updateStatus("subscriptions", id, "CANCELLED", { cancelledAt: new Date() }, "Subscription not found").then(() => this.subscription(id)); }
  async reactivateSubscription(id: string) { return this.updateStatus("subscriptions", id, "ACTIVE", { cancelledAt: null }, "Subscription not found").then(() => this.subscription(id)); }

  async requestPaymentRefund(paymentId: string, amount?: number, reason?: string) {
    const payment = await this.one("payments", paymentId); if (!payment) throw new NotFoundException("Payment not found");
    const max = Math.max(0, this.paymentAmount(payment) - this.number(payment.refundedAmount)); const requested = amount == null ? max : this.number(amount);
    if (requested <= 0 || requested > max + 0.0001) throw new BadRequestException(`Refund amount must be between 0 and ${max.toFixed(2)}.`);
    const result = await this.db.collection("refunds").insertOne({ paymentId: this.id(payment.id || payment._id), userId: payment.userId, customerId: payment.userId, amount: requested, currency: this.paymentCurrency(payment), reason: reason || "Admin refund request", status: "PENDING", createdAt: new Date(), updatedAt: new Date() });
    return this.refundDto({ _id: result.insertedId, paymentId: this.id(payment.id || payment._id), userId: payment.userId, amount: requested, currency: this.paymentCurrency(payment), reason: reason || "Admin refund request", status: "PENDING", createdAt: new Date() });
  }

  private async updateStatus(collection: string, id: string, status: string, extra: any, message: string) {
    const c = this.db.collection(collection);
    const oid = this.oid(id);
    const filter: any = oid ? { _id: oid } : { $or: [{ id }, { _id: id }] };
    const result = await c.findOneAndUpdate(
      filter,
      { $set: { status, updatedAt: new Date(), ...extra } },
      { returnDocument: "after" },
    );
    const doc = (result as any)?.value ?? result;
    if (!doc) throw new NotFoundException(message);
    return doc;
  }
}
