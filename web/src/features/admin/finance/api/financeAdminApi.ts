import type {
  CoinBalance,
  FinanceOverview,
  FinanceTransaction,
  FinancialReport,
  FeeSummary,
  Invoice,
  RevenuePoint,
  ShopOrderFinance,
  Wallet,
} from "../types/finance.types";

const BASE = "/api/admin/finance";

/**
 * Fockis authentication token.
 *
 * The main Fockis login stores the JWT using the shared auth utility,
 * which currently uses the "token" localStorage key.
 *
 * Keep the fallback keys because other parts of the application
 * support these legacy authentication keys.
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("fockis_token")
  );
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();

  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();

    let message = body;

    try {
      const parsed = JSON.parse(body);

      if (typeof parsed?.message === "string") {
        message = parsed.message;
      }
    } catch {
      // Response was not JSON; use the raw response body.
    }

    throw new Error(
      message || `Finance API error: ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const financeAdminApi = {
  // ============================================================
  // OVERVIEW
  // ============================================================

  getOverview: (period = "30d") =>
    request<FinanceOverview>(
      `/overview?period=${encodeURIComponent(period)}`,
    ),

  // ============================================================
  // TRANSACTIONS
  // ============================================================

  getTransactions: (query = "") =>
    request<FinanceTransaction[]>(
      `/transactions${query ? `?${query}` : ""}`,
    ),

  // ============================================================
  // SHOP ORDER FINANCE
  // ============================================================

  getShopOrderFinance: (orderId: string) =>
    request<ShopOrderFinance>(
      `/shop/orders/${encodeURIComponent(orderId)}/finance`,
    ),

  // ============================================================
  // REVENUE
  // ============================================================

  getRevenue: (period = "30d") =>
    request<RevenuePoint[]>(
      `/revenue?period=${encodeURIComponent(period)}`,
    ),

  // ============================================================
  // FEES
  // ============================================================

  getFees: (period = "30d") =>
    request<FeeSummary[]>(
      `/fees?period=${encodeURIComponent(period)}`,
    ),

  // ============================================================
  // INVOICES
  // ============================================================

  getInvoices: (query = "") =>
    request<Invoice[]>(
      `/invoices${query ? `?${query}` : ""}`,
    ),

  // ============================================================
  // WALLETS
  // ============================================================

  getWallets: (query = "") =>
    request<Wallet[]>(
      `/wallets${query ? `?${query}` : ""}`,
    ),

  // ============================================================
  // COINS
  // ============================================================

  getCoins: (query = "") =>
    request<CoinBalance[]>(
      `/coins${query ? `?${query}` : ""}`,
    ),

  // ============================================================
  // REPORTS
  // ============================================================

  getReports: () =>
    request<FinancialReport[]>("/reports"),
};