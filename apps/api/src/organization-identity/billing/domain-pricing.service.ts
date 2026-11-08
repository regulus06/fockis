import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { FockisDomainPricing, type FockisDomainPricingDocument } from "./fockis-domain-pricing.schema";
import { DOMAIN_PRICE_TYPES, DOMAIN_PRICE_TYPE_KEYS, periodLabel } from "./domain-price-types";

export interface DomainPricingInput {
  enabled?: boolean;
  currency?: string;
  periodMonths?: number;
  graceDays?: number;
  note?: string;
  prices?: Record<string, number>;
  memberDomainPrice?: number;
  personalDomainPrice?: number;
}

/**
 * The one price list for every Fockis domain. Read by Organization Identity
 * (church / organization domains) and Fockis Academy (school domains); edited
 * only from the Admin Center.
 */
@Injectable()
export class DomainPricingService {
  private readonly logger = new Logger(DomainPricingService.name);
  private listeners: Array<() => void> = [];

  constructor(@InjectModel(FockisDomainPricing.name) private readonly model: Model<FockisDomainPricing>) {}

  /** Billing services drop their caches when prices change. */
  onChange(fn: () => void) {
    this.listeners.push(fn);
  }

  async pricing(): Promise<FockisDomainPricingDocument> {
    const found = await this.model.findOne({ key: "default" }).exec();
    if (found) return found;

    // First run: carry over Academy-only prices saved before the shared list existed.
    const legacy = (await this.model.db
      .collection("academy_domain_pricing")
      .findOne({ key: "default" })
      .catch(() => null)) as Partial<FockisDomainPricing> | null;
    try {
      return await this.model.create({
        key: "default",
        enabled: legacy?.enabled ?? false,
        enabledAt: legacy?.enabledAt,
        currency: legacy?.currency ?? "USD",
        periodMonths: legacy?.periodMonths ?? 12,
        graceDays: legacy?.graceDays ?? 14,
        prices: legacy?.prices ?? {},
        memberDomainPrice: 0,
        personalDomainPrice: 0,
        note: legacy?.note,
        history: legacy ? [{ summary: "Prices carried over from Academy domain pricing", at: new Date() }] : [],
      });
    } catch {
      return (await this.model.findOne({ key: "default" }).exec())!;
    }
  }

  priceFor(p: Pick<FockisDomainPricing, "prices">, type?: string | null) {
    const v = p.prices?.[type ?? "other"];
    return Number(v ?? p.prices?.other ?? 0) || 0;
  }

  /** Admin Center editor. */
  async view() {
    const p = await this.pricing();
    return {
      enabled: p.enabled,
      enabledAt: p.enabledAt ?? null,
      currency: p.currency,
      periodMonths: p.periodMonths,
      periodLabel: periodLabel(p.periodMonths),
      graceDays: p.graceDays,
      memberDomainPrice: Number(p.memberDomainPrice ?? 0),
      personalDomainPrice: Number(p.personalDomainPrice ?? 0),
      note: p.note ?? "",
      prices: Object.fromEntries(DOMAIN_PRICE_TYPE_KEYS.map((t) => [t, Number(p.prices?.[t] ?? 0)])),
      types: DOMAIN_PRICE_TYPES,
      updatedAt: (p as unknown as { updatedAt?: Date }).updatedAt ?? null,
      history: [...(p.history ?? [])].reverse().slice(0, 50),
    };
  }

  /** What organizations see before they pay. */
  async publicView() {
    const v = await this.view();
    return {
      enabled: v.enabled,
      currency: v.currency,
      periodMonths: v.periodMonths,
      periodLabel: v.periodLabel,
      graceDays: v.graceDays,
      memberDomainPrice: v.enabled ? v.memberDomainPrice : 0,
      personalDomainPrice: v.enabled ? v.personalDomainPrice : 0,
      note: v.note,
      prices: v.enabled ? v.prices : {},
    };
  }

  async save(dto: DomainPricingInput, byName: string) {
    const p = await this.pricing();
    const changes: string[] = [];
    const money = (n: number, c: string) => `${c} ${n.toFixed(2)}`;
    const amount = (raw: unknown, what: string) => {
      const v = Math.round(Number(raw) * 100) / 100;
      if (!Number.isFinite(v) || v < 0 || v > 1_000_000) throw new BadRequestException(`${what} must be 0 or more.`);
      return v;
    };

    if (dto.currency !== undefined) {
      const c = String(dto.currency).trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(c)) throw new BadRequestException("Currency must be a 3-letter code such as USD or HTG.");
      if (c !== p.currency) changes.push(`currency ${p.currency} → ${c}`);
      p.currency = c;
    }
    if (dto.periodMonths !== undefined) {
      const m = Math.round(Number(dto.periodMonths));
      if (!Number.isFinite(m) || m < 0 || m > 60) throw new BadRequestException("Billing period must be 0 (one-time) to 60 months.");
      if (m !== p.periodMonths) changes.push(`period ${periodLabel(p.periodMonths)} → ${periodLabel(m)}`);
      p.periodMonths = m;
    }
    if (dto.graceDays !== undefined) {
      const g = Math.round(Number(dto.graceDays));
      if (!Number.isFinite(g) || g < 0 || g > 180) throw new BadRequestException("Grace period must be 0 to 180 days.");
      if (g !== p.graceDays) changes.push(`grace ${p.graceDays} → ${g} days`);
      p.graceDays = g;
    }
    if (dto.memberDomainPrice !== undefined) {
      const v = amount(dto.memberDomainPrice, "Member domain price");
      if (v !== Number(p.memberDomainPrice ?? 0)) changes.push(`member domain ${money(Number(p.memberDomainPrice ?? 0), p.currency)} → ${money(v, p.currency)}`);
      p.memberDomainPrice = v;
    }
    if (dto.personalDomainPrice !== undefined) {
      const v = amount(dto.personalDomainPrice, "Personal domain price");
      if (v !== Number(p.personalDomainPrice ?? 0)) changes.push(`personal domain ${money(Number(p.personalDomainPrice ?? 0), p.currency)} → ${money(v, p.currency)}`);
      p.personalDomainPrice = v;
    }
    if (dto.note !== undefined) {
      const n = String(dto.note).trim().slice(0, 600);
      if (n !== (p.note ?? "")) changes.push("note updated");
      p.note = n || undefined;
    }
    if (dto.prices) {
      const next: Record<string, number> = { ...(p.prices ?? {}) };
      for (const t of DOMAIN_PRICE_TYPES) {
        if (dto.prices[t.key] === undefined) continue;
        const v = amount(dto.prices[t.key], `Price for ${t.label}`);
        if (v !== Number(next[t.key] ?? 0)) changes.push(`${t.label} ${money(Number(next[t.key] ?? 0), p.currency)} → ${money(v, p.currency)}`);
        next[t.key] = v;
      }
      p.prices = next;
      p.markModified("prices");
    }
    if (dto.enabled !== undefined && dto.enabled !== p.enabled) {
      changes.push(dto.enabled ? "charging turned ON" : "charging turned OFF");
      p.enabled = dto.enabled;
      if (dto.enabled) p.enabledAt = new Date();
    }
    if (!changes.length) return this.view();
    p.history = [...(p.history ?? []), { summary: changes.join(" · "), byName, at: new Date() }].slice(-200);
    p.markModified("history");
    await p.save();
    this.listeners.forEach((fn) => fn());
    this.logger.log(`Domain pricing changed by ${byName}: ${changes.join("; ")}`);
    return this.view();
  }
}
