import type { Subscription } from "../types/finance.types";

const BASE = "/api/admin/finance/subscriptions";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("fockis_token")
  );
}

async function request<T>(path = "", options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

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
      if (typeof parsed?.message === "string") message = parsed.message;
    } catch {
      // Use plain response text.
    }
    throw new Error(message || `Subscription API error: ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type SubscriptionHistoryEvent = {
  id: string;
  subscriptionId: string;
  userId: string;
  event: string;
  fromPlan?: string;
  toPlan?: string;
  fromStatus?: string;
  toStatus?: string;
  amount?: { amount: number; currency: string };
  billingInterval?: string;
  note?: string;
  source?: string;
  createdAt: string;
};

export type SubscriptionHistoryResponse = {
  subscription: Subscription;
  history: SubscriptionHistoryEvent[];
};

export const subscriptionsAdminApi = {
  list: (query = "") => request<Subscription[]>(query ? `?${query}` : ""),
  get: (id: string) => request<Subscription>(`/${encodeURIComponent(id)}`),
  history: (id: string) =>
    request<SubscriptionHistoryResponse>(`/${encodeURIComponent(id)}/history`),
  cancel: (id: string) =>
    request<Subscription>(`/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
  reactivate: (id: string) =>
    request<Subscription>(`/${encodeURIComponent(id)}/reactivate`, { method: "POST" }),
};
