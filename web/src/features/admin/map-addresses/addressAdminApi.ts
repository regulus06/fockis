import { api } from "../../../api/api";

/* ============================================================================
   ADDRESS VERIFICATION — admin API (apps/api/src/map/places/
   address-verification.controller.ts). Needs map.addresses.view to read and
   map.addresses.verify to decide.
============================================================================ */

export type AddressStatus = "pending" | "verified" | "needs_info" | "rejected";
export type ReviewAction = "verify" | "needs_info" | "reject";

export interface ReviewPerson {
  id: string;
  username: string;
  name: string;
  avatar: string;
}

export interface AddressItem {
  id: string;
  label: string;
  kind: string;
  smartAddressId: string;
  plusCode: string;
  latitude: number;
  longitude: number;
  country: string;
  countryCode: string;
  department: string;
  commune: string;
  neighborhood: string;
  locality: string;
  streetAddress: string;
  captureMethod: "gps" | "pin" | "search" | "building";
  accuracyM: number;
  hasBuilding: boolean;
  status: AddressStatus;
  requestedAt: string | null;
  reviewedAt: string | null;
  owner: ReviewPerson | null;
}

export interface AddressDetail extends AddressItem {
  communalSection: string;
  building: { source: "osm" | "pin"; osmId?: string; footprint?: { type: "Polygon"; coordinates: number[][][] } | null };
  landmarks: { name: string; relation: string }[];
  directions: string;
  note: string;
  reviewedBy: ReviewPerson | null;
  createdAt: string | null;
  updatedAt: string | null;
  ownerStats: { memberSince: string | null; addresses: number; verified: number; rejected: number };
  nearby: { id: string; smartAddressId: string; label: string; status: AddressStatus; distanceM: number; sameOwner: boolean; latitude: number; longitude: number }[];
  history: { action: string; at: string | null; note: string; by: ReviewPerson | null }[];
}

export type AddressCounts = Record<AddressStatus, number>;

export interface AddressPage {
  items: AddressItem[];
  page: number;
  total: number;
  hasMore: boolean;
  counts: AddressCounts;
}

export const addressAdminApi = {
  list: async (params: { status?: AddressStatus | ""; q?: string; country?: string; page?: number }) =>
    (
      await api.get<AddressPage>("/admin/map/addresses", {
        params: {
          status: params.status || undefined,
          q: params.q || undefined,
          country: params.country || undefined,
          page: params.page && params.page > 1 ? params.page : undefined,
        },
      })
    ).data,
  counts: async () => (await api.get<AddressCounts>("/admin/map/addresses/counts")).data,
  detail: async (id: string) => (await api.get<AddressDetail>(`/admin/map/addresses/${encodeURIComponent(id)}`)).data,
  review: async (id: string, action: ReviewAction, note?: string) =>
    (await api.post<AddressDetail>(`/admin/map/addresses/${encodeURIComponent(id)}/review`, { action, note: note || undefined })).data,
};
