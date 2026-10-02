import type { AddressRequest, FockisAddress } from "./types";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ??
  "http://localhost:3000"
).replace(/\/+$/, "");

function authHeaders(): HeadersInit {
  const token =
    localStorage.getItem("access_token") ??
    localStorage.getItem("accessToken") ??
    localStorage.getItem("token") ??
    localStorage.getItem("jwt") ??
    localStorage.getItem("authToken") ??
    localStorage.getItem("fockis_token");

  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed: ${response.status}`);
  }

  return response.json();
}

export const fockisMapApi = {
  listAddresses(params: { countryCode?: string; q?: string } = {}) {
    const search = new URLSearchParams();
    if (params.countryCode) search.set("countryCode", params.countryCode);
    if (params.q) search.set("q", params.q);
    return request<FockisAddress[]>(
      `/map/addresses${search.toString() ? `?${search}` : ""}`,
    );
  },

  getAddress(id: string) {
    return request<FockisAddress>(`/map/addresses/${encodeURIComponent(id)}`);
  },

  createAddress(payload: Record<string, unknown>) {
    return request<FockisAddress>("/map/addresses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateAddress(id: string, payload: Record<string, unknown>) {
    return request<FockisAddress>(`/map/addresses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deactivateAddress(id: string) {
    return request<FockisAddress>(
      `/map/addresses/${encodeURIComponent(id)}/deactivate`,
      { method: "POST" },
    );
  },

  addUnit(addressId: string, unitNumber: string, unitType = "APARTMENT") {
    return request<FockisAddress>(
      `/map/addresses/${encodeURIComponent(addressId)}/units`,
      {
        method: "POST",
        body: JSON.stringify({ unitNumber, unitType }),
      },
    );
  },

  requestUnit(addressId: string, unitId: string, note?: string) {
    return request<AddressRequest>("/map/address-requests", {
      method: "POST",
      body: JSON.stringify({ addressId, unitId, note }),
    });
  },

  myAddressRequests() {
    return request<AddressRequest[]>("/map/address-requests/me");
  },
};
