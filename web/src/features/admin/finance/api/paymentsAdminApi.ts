import type { Payment } from "../types/finance.types";
import { financeAdminApi } from "./financeAdminApi";

export const paymentsAdminApi = {
  list: (query = "") => financeAdminApi.getTransactions(`type=SHOP_PAYMENT&${query}`),
  get: async (paymentId: string) => {
    const rows = await financeAdminApi.getTransactions(`referenceId=${encodeURIComponent(paymentId)}`);
    return rows.find((row) => row.id === paymentId);
  },
  refund: async (paymentId: string, amount?: number, reason?: string) => {
    const response = await fetch(`/api/admin/finance/payments/${paymentId}/refund`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, reason }),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json() as Promise<Payment>;
  },
};
