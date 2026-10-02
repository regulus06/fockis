import { apiClient } from "../../../careers/services/apiClient";

import type {
  CreateDomainAuthorizationPayload,
  CreateDomainCampaignPayload,
  DomainAdminOverview,
  DomainAuthorization,
  DomainCampaign,
  DomainListParams,
  DomainPolicy,
  DomainStats,
  ManagedDomain,
  UpdateDomainPolicyPayload,
} from "../types/domainAdmin.types";

const BASE = "/admin/domains";

// ============================================================================
// QUERY BUILDER
// ============================================================================

function buildQuery(
  params: DomainListParams = {},
): string {
  const search = new URLSearchParams();

  if (params.search?.trim()) {
    search.set(
      "search",
      params.search.trim(),
    );
  }

  if (params.status) {
    search.set(
      "status",
      params.status,
    );
  }

  if (params.assignmentType) {
    search.set(
      "assignmentType",
      params.assignmentType,
    );
  }

  if (params.ownerType) {
    search.set(
      "ownerType",
      params.ownerType,
    );
  }

  if (params.page) {
    search.set(
      "page",
      String(params.page),
    );
  }

  if (params.limit) {
    search.set(
      "limit",
      String(params.limit),
    );
  }

  const value = search.toString();

  return value
    ? `?${value}`
    : "";
}

// ============================================================================
// DOMAIN ADMIN API
// ============================================================================

const domainAdminApi = {

  // ========================================================================
  // OVERVIEW
  // ========================================================================

  async getOverview(): Promise<DomainAdminOverview> {
    return apiClient.get<DomainAdminOverview>(
      `${BASE}/overview`,
    );
  },

  // ========================================================================
  // STATS
  // ========================================================================

  async getStats(): Promise<DomainStats> {
    return apiClient.get<DomainStats>(
      `${BASE}/stats`,
    );
  },

  // ========================================================================
  // POLICY
  // ========================================================================

  async getPolicy(): Promise<DomainPolicy> {
    return apiClient.get<DomainPolicy>(
      `${BASE}/policy`,
    );
  },

  async updatePolicy(
    payload: UpdateDomainPolicyPayload,
  ): Promise<DomainPolicy> {
    return apiClient.patch<DomainPolicy>(
      `${BASE}/policy`,
      payload,
    );
  },

  // ========================================================================
  // CAMPAIGNS
  // ========================================================================

  async getCampaigns(): Promise<DomainCampaign[]> {
    const result =
      await apiClient.get<
        DomainCampaign[] | {
          campaigns?: DomainCampaign[];
        }
      >(
        `${BASE}/campaigns`,
      );

    if (Array.isArray(result)) {
      return result;
    }

    return Array.isArray(
      result?.campaigns,
    )
      ? result.campaigns
      : [];
  },

  async createCampaign(
    payload: CreateDomainCampaignPayload,
  ): Promise<DomainCampaign> {
    return apiClient.post<DomainCampaign>(
      `${BASE}/campaigns`,
      payload,
    );
  },

  async updateCampaign(
    campaignId: string,
    payload: Partial<CreateDomainCampaignPayload>,
  ): Promise<DomainCampaign> {
    return apiClient.patch<DomainCampaign>(
      `${BASE}/campaigns/${encodeURIComponent(
        campaignId,
      )}`,
      payload,
    );
  },

  async pauseCampaign(
    campaignId: string,
  ): Promise<DomainCampaign> {
    return apiClient.post<DomainCampaign>(
      `${BASE}/campaigns/${encodeURIComponent(
        campaignId,
      )}/pause`,
      {},
    );
  },

  async activateCampaign(
    campaignId: string,
  ): Promise<DomainCampaign> {
    return apiClient.post<DomainCampaign>(
      `${BASE}/campaigns/${encodeURIComponent(
        campaignId,
      )}/activate`,
      {},
    );
  },

  async deleteCampaign(
    campaignId: string,
  ): Promise<void> {
    await apiClient.delete(
      `${BASE}/campaigns/${encodeURIComponent(
        campaignId,
      )}`,
    );
  },

  // ========================================================================
  // AUTHORIZATIONS
  // ========================================================================

  async getAuthorizations(): Promise<
    DomainAuthorization[]
  > {
    const result =
      await apiClient.get<
        DomainAuthorization[] | {
          authorizations?: DomainAuthorization[];
        }
      >(
        `${BASE}/authorizations`,
      );

    if (Array.isArray(result)) {
      return result;
    }

    return Array.isArray(
      result?.authorizations,
    )
      ? result.authorizations
      : [];
  },

  async createAuthorization(
    payload: CreateDomainAuthorizationPayload,
  ): Promise<DomainAuthorization> {
    return apiClient.post<DomainAuthorization>(
      `${BASE}/authorizations`,
      payload,
    );
  },

  async revokeAuthorization(
    authorizationId: string,
  ): Promise<void> {
    await apiClient.delete(
      `${BASE}/authorizations/${encodeURIComponent(
        authorizationId,
      )}`,
    );
  },

  // ========================================================================
  // DOMAIN MANAGEMENT
  // ========================================================================

  async getDomains(
    params: DomainListParams = {},
  ): Promise<ManagedDomain[]> {
    const result =
      await apiClient.get<
        ManagedDomain[] | {
          domains?: ManagedDomain[];
        }
      >(
        `${BASE}${buildQuery(params)}`,
      );

    if (Array.isArray(result)) {
      return result;
    }

    return Array.isArray(
      result?.domains,
    )
      ? result.domains
      : [];
  },

  // ========================================================================
  // ASSIGN FREE DOMAIN
  // ========================================================================

  async assignFreeDomain(
    domainId: string,
    ownerType: "user" | "organization",
    ownerId: string,
  ): Promise<ManagedDomain> {
    return apiClient.post<ManagedDomain>(
      `${BASE}/${encodeURIComponent(
        domainId,
      )}/assign-free`,
      {
        ownerType,
        ownerId,
      },
    );
  },

  // ========================================================================
  // SUSPEND DOMAIN
  // ========================================================================

  async suspendDomain(
    domainId: string,
  ): Promise<ManagedDomain> {
    return apiClient.post<ManagedDomain>(
      `${BASE}/${encodeURIComponent(
        domainId,
      )}/suspend`,
      {},
    );
  },

  // ========================================================================
  // ACTIVATE DOMAIN
  // ========================================================================

  async activateDomain(
    domainId: string,
  ): Promise<ManagedDomain> {
    return apiClient.post<ManagedDomain>(
      `${BASE}/${encodeURIComponent(
        domainId,
      )}/activate`,
      {},
    );
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export default domainAdminApi;

export {
  domainAdminApi,
};