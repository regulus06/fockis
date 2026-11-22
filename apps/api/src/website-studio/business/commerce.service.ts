import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { SiteContent } from '../content/content.types';
import { RequestUser, oid } from '../common/request-user';
import { WS_MODEL, WebsiteDocument, WebsiteOrderDocument } from '../schemas/website-studio.schemas';
import { WebsitesService } from '../websites/websites.service';
import { UniversalPaymentService } from '../../payments/services/payment.service';
import { PaymentPurpose } from '../../payments/constants/payment-purpose.constants';

interface CartLineInput {
  key?: string;
  kind?: string;
  productId?: string;
  name?: string;
  quantity?: number;
  options?: Record<string, string>;
}

const ORDER_STATUSES = new Set(['paid', 'processing', 'ready', 'shipped', 'completed', 'cancelled']);
const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Website storefront: server-side pricing, orders and payments.
 * Payments go through the EXISTING Fockis UniversalPaymentService (Stripe),
 * so every website on the platform uses the Fockis payment system.
 */
@Injectable()
export class CommerceService {
  private readonly logger = new Logger('WebsiteStudioCommerce');

  constructor(
    @InjectModel(WS_MODEL.order) private readonly orders: Model<WebsiteOrderDocument>,
    @InjectModel(WS_MODEL.website) private readonly websites: Model<WebsiteDocument>,
    private readonly sites: WebsitesService,
    private readonly payments: UniversalPaymentService,
  ) {}

  /* ===================================================================== */
  /* PRICING — never trusts prices sent by the browser                     */
  /* ===================================================================== */
  price(w: WebsiteDocument, input: { items: CartLineInput[]; fulfillment?: { method?: string }; couponCode?: string }) {
    const content = w.publishedContent as SiteContent;
    const s = content.settings;
    const currency = (s.currency || 'USD').toUpperCase();
    if (!Array.isArray(input.items) || !input.items.length) throw new BadRequestException('Your cart is empty.');
    if (input.items.length > 100) throw new BadRequestException('Too many items in cart.');

    const lines = input.items.map((raw, i) => {
      const quantity = Math.floor(Number(raw.quantity));
      if (!quantity || quantity < 1 || quantity > 99) throw new BadRequestException('Invalid quantity.');
      const key = String(raw.key ?? i).slice(0, 200);

      if (raw.kind === 'custom-cake') {
        if (!s.features.customCakes) throw new BadRequestException('Custom cake orders are not enabled.');
        const o = raw.options ?? {};
        const size = s.cakeOptions.sizes.find((x) => x.label === o.Size);
        if (!size) throw new BadRequestException('Choose a valid cake size.');
        for (const [field, list] of [['Flavor', s.cakeOptions.flavors], ['Filling', s.cakeOptions.fillings], ['Frosting', s.cakeOptions.frostings]] as const) {
          if (o[field] && !list.includes(o[field])) throw new BadRequestException(`Invalid cake ${field.toLowerCase()}.`);
        }
        const decoration = String(o.Decoration ?? '').trim();
        const unitPrice = round(size.price + (decoration ? s.cakeOptions.decorationFee : 0));
        return {
          key, kind: 'custom-cake', productId: null, name: `Custom Cake (${size.label})`, quantity, unitPrice,
          total: round(unitPrice * quantity), available: true,
          options: { Size: size.label, Flavor: String(o.Flavor ?? '').slice(0, 60), Filling: String(o.Filling ?? '').slice(0, 60), Frosting: String(o.Frosting ?? '').slice(0, 60), Message: String(o.Message ?? '').slice(0, 60), Decoration: decoration.slice(0, 500) },
        };
      }

      const p = content.catalog.products.find((x) => x.id === raw.productId && x.active !== false);
      if (!p) return { key, kind: 'product', productId: raw.productId ?? null, name: String(raw.name ?? 'Item').slice(0, 120), quantity, unitPrice: 0, total: 0, available: false, message: 'No longer available', options: {} };
      const options: Record<string, string> = {};
      for (const v of p.variants ?? []) {
        const chosen = raw.options?.[v.name];
        if (!chosen || !v.options.includes(chosen)) throw new BadRequestException(`Choose a ${v.name} for ${p.name}.`);
        options[v.name] = chosen;
      }
      const stock = p.inventory;
      const available = stock === null || stock === undefined || stock >= quantity;
      return {
        key, kind: 'product', productId: p.id, name: p.name, quantity, unitPrice: p.price, total: round(p.price * quantity),
        available, message: available ? undefined : stock && stock > 0 ? `Only ${stock} left` : 'Out of stock', options,
      };
    });

    const subtotal = round(lines.reduce((n, l) => n + (l.available ? l.total : 0), 0));

    let discount = 0;
    let couponApplied: string | null = null;
    let couponMessage: string | null = null;
    const code = String(input.couponCode ?? '').trim().toUpperCase();
    if (code) {
      const c = w.coupons.find((x) => x.code === code && x.active);
      if (!c) couponMessage = 'This coupon code is not valid.';
      else {
        discount = c.type === 'percent' ? round((subtotal * Math.min(100, c.value)) / 100) : round(Math.min(subtotal, c.value));
        couponApplied = c.code;
        couponMessage = `Coupon ${c.code} applied.`;
      }
    }

    const method = String(input.fulfillment?.method ?? 'pickup');
    const f = s.features;
    let shipping = 0;
    if (method === 'shipping') {
      if (!f.shipping) throw new BadRequestException('Shipping is not available.');
      shipping = subtotal - discount >= (s.shipping.freeOver || Infinity) ? 0 : round(s.shipping.flatRate || 0);
    } else if (method === 'delivery') {
      if (!f.delivery) throw new BadRequestException('Delivery is not available.');
      shipping = round(s.shipping.deliveryFee || 0);
    } else if (method === 'pickup') {
      if (!f.pickup && (f.shipping || f.delivery)) throw new BadRequestException('Pickup is not available.');
    } else throw new BadRequestException('Choose pickup, delivery or shipping.');

    const taxRate = Math.max(0, Math.min(30, Number(s.shipping.taxRate) || 0));
    const tax = round(((subtotal - discount + shipping) * taxRate) / 100);
    const total = round(Math.max(0, subtotal - discount + shipping + tax));
    return { currency, lines, subtotal, discount, couponApplied, couponMessage, shipping, tax, total, method };
  }

  async quote(websiteId: string, input: any) {
    const w = await this.sites.publishedById(websiteId);
    if (!(w.publishedContent as SiteContent).settings.features.cart) throw new BadRequestException('This website does not sell online.');
    const q = this.price(w, input);
    return { currency: q.currency, lines: q.lines.map(({ options, kind, productId, ...rest }) => rest), subtotal: q.subtotal, discount: q.discount, couponApplied: q.couponApplied, couponMessage: q.couponMessage, shipping: q.shipping, tax: q.tax, total: q.total };
  }

  /* ===================================================================== */
  /* CHECKOUT                                                               */
  /* ===================================================================== */
  async checkout(websiteId: string, user: RequestUser, input: any) {
    const w = await this.sites.publishedById(websiteId);
    const content = w.publishedContent as SiteContent;
    if (!content.settings.features.cart) throw new BadRequestException('This website does not sell online.');
    const q = this.price(w, input);
    if (q.lines.some((l) => !l.available)) throw new BadRequestException('Some items are no longer available. Please review your cart.');
    if (q.total < 0.5) throw new BadRequestException('The order total is too low to process a card payment.');

    const customer = input?.customer ?? {};
    const name = String(customer.name ?? '').trim().slice(0, 120);
    const email = String(customer.email ?? '').trim().slice(0, 200);
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email)) throw new BadRequestException('Name and a valid email are required.');
    const ful = input?.fulfillment ?? {};
    const fulfillment = {
      method: q.method,
      date: ful.date ? String(ful.date).slice(0, 10) : undefined,
      time: ful.time ? String(ful.time).slice(0, 5) : undefined,
      address: ful.address ? String(ful.address).slice(0, 500) : undefined,
    };
    if (q.method !== 'pickup' && (!fulfillment.address || fulfillment.address.length < 5)) throw new BadRequestException('An address is required.');
    if (q.lines.some((l) => l.kind === 'custom-cake') && fulfillment.date) {
      const min = new Date(Date.now() + (content.settings.cakeOptions.leadTimeDays || 0) * 86400000).toISOString().slice(0, 10);
      if (fulfillment.date < min) throw new BadRequestException(`Custom cakes need at least ${content.settings.cakeOptions.leadTimeDays} days notice.`);
    }

    const counter = await this.websites.findOneAndUpdate({ _id: w._id }, { $inc: { orderCounter: 1 } }, { new: true }).select('orderCounter').lean();
    const orderNumber = `${String(w.slug).slice(0, 3).toUpperCase()}-${String(1000 + (counter?.orderCounter ?? 1))}`;
    const order = await this.orders.create({
      websiteId: w._id,
      orderNumber,
      customerUserId: oid(user.id),
      items: q.lines.map((l) => ({ productId: l.productId, kind: l.kind, name: l.name, quantity: l.quantity, unitPrice: l.unitPrice, options: l.options })),
      fulfillment,
      customer: { name, email, phone: String(customer.phone ?? '').slice(0, 40) },
      subtotal: q.subtotal,
      discount: q.discount,
      shipping: q.shipping,
      tax: q.tax,
      total: q.total,
      currency: q.currency,
      couponCode: q.couponApplied,
      notes: String(input?.notes ?? '').slice(0, 1000),
      status: 'pending_payment',
    });

    // Create the payment with the existing Fockis payment system.
    const payment = await this.payments.createPayment(user.id, {
      purpose: PaymentPurpose.WEBSITE_ORDER,
      referenceId: String(order._id),
      baseAmount: q.total,
      baseCurrency: q.currency,
      country: /^[A-Z]{2}$/i.test(String(input?.country ?? '')) ? String(input.country).toUpperCase() : (content.settings.country || 'US'),
      idempotencyKey: `website-order-${String(order._id)}`,
      metadata: { websiteId: String(w._id), orderNumber, source: 'website-studio' },
    } as any);

    order.paymentId = payment.paymentId;
    order.paymentIntentId = payment.stripePaymentIntentId;
    order.paymentStatus = payment.status;
    await order.save();

    return {
      orderId: String(order._id),
      orderNumber,
      clientSecret: payment.clientSecret,
      paymentIntentId: payment.stripePaymentIntentId,
      quote: { currency: q.currency, lines: q.lines, subtotal: q.subtotal, discount: q.discount, couponApplied: q.couponApplied, couponMessage: q.couponMessage, shipping: q.shipping, tax: q.tax, total: q.total },
    };
  }

  /** Called after Stripe confirms the card on the client. The backend re-verifies with Stripe. */
  async confirm(orderId: string, user: RequestUser, paymentIntentId: string) {
    if (!Types.ObjectId.isValid(orderId)) throw new NotFoundException('Order not found.');
    const order = await this.orders.findById(orderId);
    if (!order || String(order.customerUserId) !== user.id) throw new NotFoundException('Order not found.');
    if (!order.paymentIntentId || order.paymentIntentId !== paymentIntentId) throw new BadRequestException('Payment does not match this order.');
    if (order.status === 'pending_payment') {
      const result: any = await this.payments.confirmPayment(user.id, paymentIntentId);
      order.paymentStatus = result.status;
      await order.save();
      if (result.status === 'paid') await this.markPaid(order._id);
    }
    return this.view((await this.orders.findById(orderId).lean())!);
  }

  /** Idempotent: marks an order paid, decrements inventory and counts coupon usage exactly once. */
  async markPaid(orderId: Types.ObjectId) {
    const order = await this.orders.findOneAndUpdate(
      { _id: orderId, status: 'pending_payment' },
      { $set: { status: 'paid', paymentStatus: 'paid', paidAt: new Date() } },
      { new: true },
    );
    if (!order || order.inventoryApplied) return;
    const w = await this.websites.findById(order.websiteId);
    if (w) {
      for (const item of order.items) {
        if (item.kind !== 'product' || !item.productId) continue;
        for (const key of ['draftContent', 'publishedContent'] as const) {
          const content = (w as any)[key] as SiteContent | null;
          const p = content?.catalog.products.find((x) => x.id === item.productId);
          if (p && p.inventory !== null && p.inventory !== undefined) p.inventory = Math.max(0, p.inventory - item.quantity);
        }
      }
      if (order.couponCode) {
        const c = w.coupons.find((x) => x.code === order.couponCode);
        if (c) c.usageCount += 1;
      }
      w.markModified('draftContent');
      w.markModified('publishedContent');
      await w.save();
    }
    order.inventoryApplied = true;
    await order.save();
  }

  /** Webhook path: the existing payment service emits this event for successful payments. */
  @OnEvent('payments.succeeded', { async: true })
  async onPaymentSucceeded(evt: { purpose?: string; referenceId?: string }) {
    try {
      if (evt?.purpose !== PaymentPurpose.WEBSITE_ORDER || !evt.referenceId || !Types.ObjectId.isValid(evt.referenceId)) return;
      await this.markPaid(new Types.ObjectId(evt.referenceId));
    } catch (err) {
      this.logger.error('Failed to fulfil website order from payment webhook', err instanceof Error ? err.stack : String(err));
    }
  }

  /* ===================================================================== */
  /* ORDER MANAGEMENT                                                       */
  /* ===================================================================== */
  view(o: any) {
    return {
      id: String(o._id), orderNumber: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus, items: o.items,
      fulfillment: o.fulfillment, customer: o.customer, subtotal: o.subtotal, discount: o.discount, shipping: o.shipping,
      tax: o.tax, total: o.total, currency: o.currency, trackingNumber: o.trackingNumber, createdAt: o.createdAt,
    };
  }

  async listForOwner(user: RequestUser, websiteId: string) {
    const { website } = await this.sites.getAccessible(user, websiteId, 'view');
    const list = await this.orders.find({ websiteId: website._id }).sort({ createdAt: -1 }).limit(500).lean();
    return list.map((o) => this.view(o));
  }

  async updateForOwner(user: RequestUser, websiteId: string, orderId: string, dto: { status?: string; trackingNumber?: string }) {
    const { website } = await this.sites.getAccessible(user, websiteId, 'edit');
    if (!Types.ObjectId.isValid(orderId)) throw new NotFoundException('Order not found.');
    const o = await this.orders.findOne({ _id: orderId, websiteId: website._id });
    if (!o) throw new NotFoundException('Order not found.');
    if (dto.status !== undefined) {
      if (!ORDER_STATUSES.has(dto.status)) throw new BadRequestException('Invalid status.');
      if (o.status === 'pending_payment' && dto.status !== 'cancelled') throw new ForbiddenException('Unpaid orders can only be cancelled.');
      o.status = dto.status;
    }
    if (dto.trackingNumber !== undefined) o.trackingNumber = String(dto.trackingNumber).slice(0, 120);
    await o.save();
    return this.view(o.toObject());
  }

  async myOrders(websiteId: string, user: RequestUser) {
    if (!Types.ObjectId.isValid(websiteId)) return [];
    const list = await this.orders.find({ websiteId: oid(websiteId), customerUserId: oid(user.id) }).sort({ createdAt: -1 }).limit(100).lean();
    return list.map((o) => this.view(o));
  }

  /* ---------------- coupons ---------------- */
  async coupons(user: RequestUser, websiteId: string) {
    const { website } = await this.sites.getAccessible(user, websiteId, 'view');
    return website.coupons.map((c) => ({ code: c.code, type: c.type, value: c.value, active: c.active, usageCount: c.usageCount }));
  }

  async saveCoupons(user: RequestUser, websiteId: string, list: any[]) {
    const { website } = await this.sites.getAccessible(user, websiteId, 'publish');
    if (!Array.isArray(list) || list.length > 100) throw new BadRequestException('Invalid coupons.');
    const seen = new Set<string>();
    website.coupons = list.map((c) => {
      const code = String(c?.code ?? '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40);
      if (!code || seen.has(code)) throw new BadRequestException('Coupon codes must be unique and not empty.');
      seen.add(code);
      const type = c?.type === 'fixed' ? 'fixed' : 'percent';
      const value = Number(c?.value);
      if (!Number.isFinite(value) || value <= 0 || (type === 'percent' && value > 100)) throw new BadRequestException(`Invalid value for coupon ${code}.`);
      const prev = website.coupons.find((x) => x.code === code);
      return { code, type, value, active: c?.active !== false, usageCount: prev?.usageCount ?? 0 };
    }) as any;
    await website.save();
    return this.coupons(user, websiteId);
  }
}
