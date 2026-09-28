import type { Subscription } from "../types/finance.types";

const BASE = "/api/admin/finance/subscriptions";

async function request<T>(path = "", options: RequestInit = {}) {
  const response = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error((await response.text()) || `Subscription API error: ${response.status}`);
  return response.json() as Promise<T>;
}

export const subscriptionsAdminApi = {
  list: (query = "") => request<Subscription[]>(query ? `?${query}` : ""),
  get: (id: string) => request<Subscription>(`/${id}`),
  cancel: (id: string) => request<Subscription>(`/${id}/cancel`, { method: "POST" }),
  reactivate: (id: string) => request<Subscription>(`/${id}/reactivate`, { method: "POST" }),
};
