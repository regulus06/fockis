import type { ShopOrderFinance } from "../types/finance.types";

/**
 * Financial invariant for a Shop order:
 *
 * customer payment = seller payout + Fockis fee
 *
 * This is intentionally kept as a pure function so both UI and backend
 * integration tests can use the same conceptual reconciliation rule.
 */
export function reconcileShopOrder(order: ShopOrderFinance) {
  const expected = order.sellerPayout.amount + order.fockisFee.amount;
  const actual = order.total.amount;
  return {
    balanced: Math.abs(actual - expected) < 0.01,
    difference: Number((actual - expected).toFixed(2)),
  };
}

export function calculateSellerPayout(total: number, fockisFee: number) {
  return Number((total - fockisFee).toFixed(2));
}
