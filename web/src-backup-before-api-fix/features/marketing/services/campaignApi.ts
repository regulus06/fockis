/* ============================================================================
   CAMPAIGN API
============================================================================ */

import type {
  Campaign,
  CreateCampaignPayload,
  UpdateCampaignPayload,
} from "../types/marketingTypes";

const API_URL = "http://localhost:3000";

/* ============================================================================
   AUTH
============================================================================ */

function getToken(): string | null {
  return localStorage.getItem("token");
}

/* ============================================================================
   REQUEST
============================================================================ */

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(
    options.headers,
  );

  /*
   * Only set JSON content type when
   * a request body is being sent.
   */
  if (options.body) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  const token = getToken();

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      headers,
    },
  );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      text ||
        `Request failed: ${response.status}`,
    );
  }

  /*
   * DELETE endpoints may return 204.
   */
  if (response.status === 204) {
    return undefined as T;
  }

  /*
   * Some endpoints may return
   * an empty response body.
   */
  const text =
    await response.text();

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

/* ============================================================================
   CAMPAIGN FUNCTIONS
============================================================================ */

/**
 * Get all campaigns.
 */
export async function getCampaigns(): Promise<
  Campaign[]
> {
  return request<Campaign[]>(
    "/marketing/campaigns",
  );
}

/**
 * Get one campaign by ID.
 */
export async function getCampaign(
  id: string,
): Promise<Campaign> {
  return request<Campaign>(
    `/marketing/campaigns/${id}`,
  );
}

/**
 * Create a campaign.
 */
export async function createCampaign(
  payload: CreateCampaignPayload,
): Promise<Campaign> {
  return request<Campaign>(
    "/marketing/campaigns",
    {
      method: "POST",
      body: JSON.stringify(
        payload,
      ),
    },
  );
}

/**
 * Update a campaign.
 */
export async function updateCampaign(
  id: string,
  payload: UpdateCampaignPayload,
): Promise<Campaign> {
  return request<Campaign>(
    `/marketing/campaigns/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(
        payload,
      ),
    },
  );
}

/**
 * Delete a campaign.
 */
export async function deleteCampaign(
  id: string,
): Promise<void> {
  return request<void>(
    `/marketing/campaigns/${id}`,
    {
      method: "DELETE",
    },
  );
}

/* ============================================================================
   CAMPAIGN ACTIONS
============================================================================ */

/**
 * Submit a campaign for review.
 */
export async function submitCampaign(
  id: string,
): Promise<Campaign> {
  return request<Campaign>(
    `/marketing/campaigns/${id}/submit`,
    {
      method: "POST",
    },
  );
}

/**
 * Pause an active campaign.
 */
export async function pauseCampaign(
  id: string,
): Promise<Campaign> {
  return request<Campaign>(
    `/marketing/campaigns/${id}/pause`,
    {
      method: "POST",
    },
  );
}

/**
 * Resume a paused campaign.
 */
export async function resumeCampaign(
  id: string,
): Promise<Campaign> {
  return request<Campaign>(
    `/marketing/campaigns/${id}/resume`,
    {
      method: "POST",
    },
  );
}

/* ============================================================================
   OBJECT API
============================================================================ */

/*
 * CampaignDetailsPage uses the shorter method names:
 *
 *   getById()
 *   submit()
 *   pause()
 *   resume()
 *   remove()
 *
 * Keep the original named functions above as well so
 * other marketing pages can continue using them.
 */

export const campaignApi = {
  /* Standard functions */
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,

  /* Campaign actions */
  submitCampaign,
  pauseCampaign,
  resumeCampaign,

  /* CampaignDetailsPage aliases */
  getById: getCampaign,
  submit: submitCampaign,
  pause: pauseCampaign,
  resume: resumeCampaign,
  remove: deleteCampaign,
};

/* ============================================================================
   DEFAULT EXPORT
============================================================================ */

export default campaignApi;