import type { Payout } from "../types/finance.types";

const BASE = "/api/admin/finance/payouts";

async function request<T>(path = "", options: RequestInit = {}) {
  const response = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error((await response.text()) || `Payout API error: ${response.status}`);
  return response.json() as Promise<T>;
}

export const payoutsAdminApi = {
  list: (query = "") => request<Payout[]>(query ? `?${query}` : ""),
  get: (id: string) => request<Payout>(`/${id}`),
  approve: (id: string) => request<Payout>(`/${id}/approve`, { method: "POST" }),
  cancel: (id: string) => request<Payout>(`/${id}/cancel`, { method: "POST" }),
};
