// Pure credit helpers shared by billing pages, the composer, and agency views.

import type { CreditBalance, CreditChannel, CreditCheck, CreditLevel, CreditThresholds, MarketingPlan, Money } from "../types/platform.types";

export function remainingOf(b: CreditBalance, ch: CreditChannel): number {
  return ch === "email" ? b.emailCreditsRemaining : b.smsCreditsRemaining;
}

export function includedOf(b: CreditBalance, ch: CreditChannel): number {
  return ch === "email" ? b.emailCreditsIncluded + b.emailCreditsBonus : b.smsCreditsIncluded + b.smsCreditsBonus;
}

export function usedOf(b: CreditBalance, ch: CreditChannel): number {
  return ch === "email" ? b.emailCreditsUsed : b.smsCreditsUsed;
}

export function creditLevel(remaining: number, included: number, ch: CreditChannel, t: CreditThresholds): CreditLevel {
  if (remaining <= 0) return "critical";
  if (remaining <= t.lowAbsolute[ch] || (included > 0 && remaining / included <= t.lowFraction)) return "low";
  return "normal";
}

export function levelOf(b: CreditBalance, ch: CreditChannel, t: CreditThresholds): CreditLevel {
  return creditLevel(remainingOf(b, ch), includedOf(b, ch), ch, t);
}

export function checkCredits(b: CreditBalance, ch: CreditChannel, required: number, t: CreditThresholds): CreditCheck {
  const remaining = remainingOf(b, ch);
  return {
    channel: ch,
    required,
    remaining,
    shortfall: Math.max(0, required - remaining),
    sufficient: required <= remaining,
    level: levelOf(b, ch, t),
  };
}

/** SMS segments: 160 GSM chars (153 when split), 70 Unicode chars (67 when split). */
export function smsSegments(text: string): { chars: number; parts: number; unicode: boolean } {
  // eslint-disable-next-line no-control-regex
  const unicode = /[^\u0000-\u007F]/.test(text);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  const chars = text.length;
  return { chars, unicode, parts: chars === 0 ? 0 : chars <= single ? 1 : Math.ceil(chars / multi) };
}

export function formatMoney(m: Money | null | undefined, fallback = "Contact us"): string {
  if (!m) return fallback;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: m.currency, maximumFractionDigits: m.amount % 100 ? 2 : 0 }).format(m.amount / 100);
}

export function planCredits(p: MarketingPlan, ch: CreditChannel): string {
  const n = (ch === "email" ? p.emailCreditsIncluded : p.smsCreditsIncluded).toLocaleString("en-US");
  return p.creditsAreMinimum ? `${n}+` : n;
}

export const CHANNEL_NAME: Record<CreditChannel, string> = { email: "Email", sms: "SMS" };
