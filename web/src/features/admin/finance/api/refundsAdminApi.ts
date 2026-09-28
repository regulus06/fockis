import type { Refund } from "../types/finance.types";

const BASE = "/api/admin/finance/refunds";

async function request<T>(path = "", options: RequestInit = {}) {
  const response = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error((await response.text()) || `Refund API error: ${response.status}`);
  return response.json() as Promise<T>;
}

export const refundsAdminApi = {
  list: (query = "") => request<Refund[]>(query ? `?${query}` : ""),
  get: (id: string) => request<Refund>(`/${id}`),
  approve: (id: string) => request<Refund>(`/${id}/approve`, { method: "POST" }),
  reject: (id: string, reason: string) =>
    request<Refund>(`/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
};
