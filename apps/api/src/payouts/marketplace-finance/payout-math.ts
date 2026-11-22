/**
 * Payout math. Pure functions, integer cents only, so results are the same
 * every time and easy to test.
 *
 * Rounding: half up on whole cents (amounts are never negative).
 */

export interface FeeRules {
  percentBps: number;
  fixedCents: number;
  minFeeCents: number;
  maxFeeCents: number | null;
  tiers?: Array<{ upToCents: number | null; percentBps: number; fixedCents: number }>;
}

export interface FeeBreakdown {
  grossCents: number;
  percentBps: number;
  percentFeeCents: number;
  fixedCents: number;
  /** Fee before min/max rules. */
  rawFeeCents: number;
  minFeeCents: number;
  maxFeeCents: number | null;
  feeCents: number;
  netCents: number;
  tierUpToCents: number | null;
}

/** amount × bps / 10 000, rounded half up. */
export function percentOf(amountCents: number, bps: number): number {
  return Math.floor((amountCents * bps + 5000) / 10000);
}

/** Picks the first tier whose limit covers the amount (tiers sorted by limit, "no limit" last). */
export function pickTier(rules: FeeRules, grossCents: number) {
  const tiers = [...(rules.tiers ?? [])].sort((a, b) => {
    if (a.upToCents === null) return 1;
    if (b.upToCents === null) return -1;
    return a.upToCents - b.upToCents;
  });
  return tiers.find((tier) => tier.upToCents === null || grossCents <= tier.upToCents) ?? null;
}

export function calculateFee(rules: FeeRules, grossCents: number): FeeBreakdown {
  if (!Number.isSafeInteger(grossCents) || grossCents < 0) {
    throw new Error("grossCents must be a non-negative whole number of cents.");
  }
  const tier = pickTier(rules, grossCents);
  const percentBps = tier ? tier.percentBps : rules.percentBps;
  const fixedCents = tier ? tier.fixedCents : rules.fixedCents;

  const percentFeeCents = percentOf(grossCents, percentBps);
  const rawFeeCents = percentFeeCents + fixedCents;

  let feeCents = Math.max(rawFeeCents, rules.minFeeCents);
  if (rules.maxFeeCents !== null && rules.maxFeeCents !== undefined) {
    feeCents = Math.min(feeCents, rules.maxFeeCents);
  }
  feeCents = Math.min(feeCents, grossCents);

  return {
    grossCents,
    percentBps,
    percentFeeCents,
    fixedCents,
    rawFeeCents,
    minFeeCents: rules.minFeeCents,
    maxFeeCents: rules.maxFeeCents ?? null,
    feeCents,
    netCents: grossCents - feeCents,
    tierUpToCents: tier ? tier.upToCents : null,
  };
}

/**
 * Splits a fee across items in proportion to their amounts
 * (largest remainder method), so the parts always add up exactly.
 */
export function splitProportionally(totalCents: number, amounts: number[]): number[] {
  const sum = amounts.reduce((a, b) => a + b, 0);
  if (sum <= 0 || totalCents <= 0) return amounts.map(() => 0);

  const exact = amounts.map((amount) => (totalCents * amount) / sum);
  const parts = exact.map(Math.floor);
  let left = totalCents - parts.reduce((a, b) => a + b, 0);

  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (let i = 0; left > 0; i = (i + 1) % order.length, left -= 1) {
    parts[order[i].index] += 1;
  }
  return parts;
}

/** Commission on an amount: percent (bps) plus fixed, kept within min/max and the amount itself. */
export function calculateCommission(
  subtotalCents: number,
  rule: { percentBps: number; fixedCents: number; minCents: number; maxCents: number | null },
): number {
  let cents = percentOf(subtotalCents, rule.percentBps) + rule.fixedCents;
  cents = Math.max(cents, rule.minCents);
  if (rule.maxCents !== null) cents = Math.min(cents, rule.maxCents);
  return Math.min(Math.max(cents, 0), subtotalCents);
}
