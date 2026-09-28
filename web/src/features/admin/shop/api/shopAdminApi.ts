const API_BASE = "/api/admin/shop";

function token() {
  return localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token") || "";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}`, ...(init.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || `Shop admin request failed (${response.status})`);
  return data as T;
}

export const shopAdminApi = {
  dashboard: () => request<any>("/dashboard"),
  products: (params = "") => request<any>(`/products${params ? `?${params}` : ""}`),
  productAction: (id: string, action: string, reason?: string) => request<any>(`/products/${id}/action`, { method: "POST", body: JSON.stringify({ action, reason }) }),
  sellers: (status?: string) => request<any[]>(`/sellers${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  sellerAction: (id: string, action: string) => request<any>(`/sellers/${id}/action`, { method: "POST", body: JSON.stringify({ action }) }),
  stores: (status?: string) => request<any[]>(`/stores${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  storeAction: (id: string, action: string) => request<any>(`/stores/${id}/action`, { method: "POST", body: JSON.stringify({ action }) }),
};
