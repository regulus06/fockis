import { api } from "../../../api/api";
import type { ReviewPerson } from "./addressAdminApi";

/* ============================================================================
   PLACES ADDED TO THE MAP — admin API (apps/api/src/map/places/
   public-places.controller.ts). Same permissions as address verification:
   map.addresses.view to read, map.addresses.verify to decide.
============================================================================ */

export type PublicPlaceStatus = "pending" | "approved" | "rejected" | "removed";
export type PublicReviewAction = "approve" | "reject" | "remove";

export interface PublicPlaceItem {
  id: string;
  name: string;
  category: string;
  description: string;
  phone: string;
  website: string;
  openingHours: string;
  addressText: string;
  countryCode: string;
  department: string;
  commune: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  status: PublicPlaceStatus;
  reviewNote: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  addedBy: ReviewPerson | null;
}

export interface PublicPlaceDetail extends PublicPlaceItem {
  addedByApprovedCount: number;
  history: { action: string; at: string | null; note: string; by: ReviewPerson | null }[];
  nearby: { id: string; name: string; category: string; status: PublicPlaceStatus; latitude: number; longitude: number; distanceM: number; sameName: boolean }[];
}

export type PublicPlaceCounts = Record<PublicPlaceStatus, number>;

export const publicPlacesAdminApi = {
  list: async (params: { status?: PublicPlaceStatus | ""; q?: string; country?: string; page?: number }) =>
    (
      await api.get<{ items: PublicPlaceItem[]; page: number; total: number; hasMore: boolean; counts: PublicPlaceCounts }>("/admin/map/public-places", {
        params: {
          status: params.status || undefined,
          q: params.q || undefined,
          country: params.country || undefined,
          page: params.page && params.page > 1 ? params.page : undefined,
        },
      })
    ).data,
  detail: async (id: string) => (await api.get<PublicPlaceDetail>(`/admin/map/public-places/${encodeURIComponent(id)}`)).data,
  review: async (id: string, action: PublicReviewAction, note?: string) =>
    (await api.post<PublicPlaceDetail>(`/admin/map/public-places/${encodeURIComponent(id)}/review`, { action, note: note || undefined })).data,
};
