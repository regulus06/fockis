import type {
  Campaign,
  CampaignFilters,
} from "../types/fockis-mail.types";

import { campaignsApi } from "../services/campaignsApi";
import { useAsync } from "./useAsync";

export function useCampaigns(
  filters: CampaignFilters = {},
) {
  return useAsync<Campaign[]>(
    () => campaignsApi.list(filters),
    [
      filters.status,
      filters.type,
      filters.audienceId,
      filters.search,
      filters.performance,
    ],
  );
}

export function useCampaign(
  id: string | undefined,
) {
  return useAsync<Campaign>(
    () =>
      id
        ? campaignsApi.get(id)
        : Promise.reject(
            new Error(
              "No campaign selected.",
            ),
          ),
    [id],
  );
}