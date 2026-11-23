/**
 * org-payout-math.ts — pure functions for organization payouts.
 * Integer cents only. Reuses the marketplace fee calculator.
 */

import { calculateFee } from "../marketplace-finance/payout-math";

export interface OrgFeeRuleInput {
  percentBps: number;
  fixedCents: number;
  minFeeCents: number;
  maxFeeCents: number | null;
}

export interface OrgSchedule {
  interval: "manual" | "daily" | "weekly" | "monthly";
  weeklyDay: number;
  monthlyDay: number;
}

/** Scheduled payouts run at this hour (UTC) on their day: 9 AM New York in winter. */
export const RUN_HOUR_UTC = 14;

/**
 * Fockis fee for one gift. The fixed / minimum / maximum amounts are in the
 * fee currency; when the money arrived in another currency only the
 * percentage applies (an amount in one currency can't be used in another).
 */
export function orgFee(rules: OrgFeeRuleInput, grossCents: number, sameCurrency: boolean): number {
  const r = sameCurrency
    ? rules
    : { percentBps: rules.percentBps, fixedCents: 0, minFeeCents: 0, maxFeeCents: null };
  return calculateFee(
    {
      percentBps: r.percentBps,
      fixedCents: r.fixedCents,
      minFeeCents: r.minFeeCents,
      maxFeeCents: r.maxFeeCents,
      tiers: [],
    },
    grossCents,
  ).feeCents;
}

/**
 * Amount a giver adds so that, after the fee on the larger total, the
 * organization still receives the full gift. Smallest such amount.
 */
export function coverAmount(rules: OrgFeeRuleInput, giftCents: number, sameCurrency: boolean): number {
  if (!Number.isSafeInteger(giftCents) || giftCents <= 0) return 0;
  let extra = orgFee(rules, giftCents, sameCurrency);
  for (let i = 0; i < 20; i += 1) {
    const total = giftCents + extra;
    const net = total - orgFee(rules, total, sameCurrency);
    if (net >= giftCents) {
      // Step back while a smaller extra still works (percent fees round).
      while (extra > 0) {
        const t = giftCents + extra - 1;
        if (t - orgFee(rules, t, sameCurrency) >= giftCents) extra -= 1;
        else break;
      }
      return extra;
    }
    extra += giftCents - net;
  }
  return extra;
}

/** The first scheduled run strictly after `after`, or null for manual payouts. */
export function nextRunAt(schedule: OrgSchedule, after: Date): Date | null {
  if (schedule.interval === "manual") return null;
  const start = new Date(Date.UTC(after.getUTCFullYear(), after.getUTCMonth(), after.getUTCDate(), RUN_HOUR_UTC, 0, 0));

  if (schedule.interval === "daily") {
    return start > after ? start : new Date(start.getTime() + 86_400_000);
  }

  if (schedule.interval === "weekly") {
    const day = clamp(schedule.weeklyDay, 0, 6);
    for (let i = 0; i <= 7; i += 1) {
      const d = new Date(start.getTime() + i * 86_400_000);
      if (d.getUTCDay() === day && d > after) return d;
    }
  }

  // monthly
  const dom = clamp(schedule.monthlyDay, 1, 28);
  for (let m = 0; m <= 2; m += 1) {
    const d = new Date(Date.UTC(after.getUTCFullYear(), after.getUTCMonth() + m, dom, RUN_HOUR_UTC, 0, 0));
    if (d > after) return d;
  }
  return null;
}

/**
 * How much of an income line to take back for refunds so far.
 * Returns the extra (negative) amounts to record now, given what was
 * already reversed for this payment.
 */
export function refundReversal(
  income: { grossCents: number; feeCents: number; netCents: number },
  refundedChargedCents: number,
  chargedTotalCents: number,
  alreadyReversed: { grossCents: number; feeCents: number; netCents: number },
): { grossCents: number; feeCents: number; netCents: number } {
  if (chargedTotalCents <= 0) return { grossCents: 0, feeCents: 0, netCents: 0 };
  const ratio = Math.min(1, Math.max(0, refundedChargedCents / chargedTotalCents));
  const target = {
    grossCents: -Math.round(income.grossCents * ratio),
    netCents: -Math.round(income.netCents * ratio),
  };
  const targetFee = target.grossCents - target.netCents;
  return {
    grossCents: target.grossCents - alreadyReversed.grossCents,
    feeCents: targetFee - alreadyReversed.feeCents,
    netCents: target.netCents - alreadyReversed.netCents,
  };
}

/** Percent (e.g. 3.5) ↔ basis points (350). */
export const pctToBps = (pct: number) => Math.round(Number(pct) * 100);

function clamp(n: number, lo: number, hi: number) {
  const v = Math.trunc(Number(n));
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
}
