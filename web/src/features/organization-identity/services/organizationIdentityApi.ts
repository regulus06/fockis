import { apiClient } from "../../careers/services/apiClient";

import type {
  CreateDomainPayload,
  CreateManagedUserPayload,
  OrganizationDomain,
  OrganizationIdentity,
  OrganizationIdentityActionResponse,
  OrganizationIdentityStats,
  SecurityPolicy,
  UpdateManagedUserPayload,
} from "../types/organizationIdentity.types";

// ============================================================================
// TYPES
// ============================================================================

export type OrganizationDomainType =
  | "organization"
  | "member";

export interface DomainAvailabilityResponse {
  available: boolean;
  domain: string;
  message: string;
}

export interface CreateOrganizationDomainPayload
  extends CreateDomainPayload {
  /**
   * organization:
   *   springfieldchurch.fockis.com
   *
   * member:
   *   john.springfieldchurch.fockis.com
   */
  domainType?: OrganizationDomainType;

  /**
   * Required for member domains.
   *
   * Example:
   * springfieldchurch.fockis.com
   */
  parentDomainId?: string | null;

  /**
   * Optional member assignment.
   */
  assignedUserId?: string | null;

  /**
   * Optional membership assignment.
   */
  assignedMembershipId?: string | null;
}

export interface AssignDomainToMemberPayload {
  assignedUserId: string;
  assignedMembershipId?: string | null;
}

export interface UpdateDomainAssignmentPayload {
  assignedUserId?: string | null;
  assignedMembershipId?: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

function requireId(
  value: string,
  label: string,
): string {
  const id = value?.trim();

  if (!id) {
    throw new Error(`${label} is required.`);
  }

  return id;
}

/**
 * Build the organization identity API base.
 */
function identityBase(
  organizationId: string,
): string {
  const id = requireId(
    organizationId,
    "Organization ID",
  );

  return `/organizations/${encodeURIComponent(
    id,
  )}/identity`;
}

/**
 * Build user endpoint.
 */
function userPath(
  organizationId: string,
  userId: string,
): string {
  return `${identityBase(
    organizationId,
  )}/users/${encodeURIComponent(
    requireId(userId, "User ID"),
  )}`;
}

/**
 * Build domain endpoint.
 */
function domainPath(
  organizationId: string,
  domainId: string,
): string {
  return `${identityBase(
    organizationId,
  )}/domains/${encodeURIComponent(
    requireId(domainId, "Domain ID"),
  )}`;
}

/**
 * Normalize a Fockis domain.
 *
 * Examples:
 *
 * https://www.john.fockis.com/
 *      ↓
 * john.fockis.com
 */
function normalizeDomain(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

/**
 * Validate a Fockis domain on the frontend.
 *
 * The backend remains authoritative.
 */
function validateFockisDomain(
  domain: string,
): string {
  const normalized =
    normalizeDomain(domain);

  if (!normalized) {
    throw new Error(
      "Domain is required.",
    );
  }

  if (
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+fockis\.com$/.test(
      normalized,
    )
  ) {
    throw new Error(
      "Only Fockis domains ending in .fockis.com are allowed.",
    );
  }

  return normalized;
}

/**
 * Remove undefined values before sending payloads.
 */
function cleanPayload<
  T extends Record<string, unknown>,
>(
  payload: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) =>
        value !== undefined,
    ),
  ) as Partial<T>;
}

// ============================================================================
// API
// ============================================================================

const organizationIdentityApi = {
  // ==========================================================================
  // STATS
  // ==========================================================================

  async getStats(
    organizationId: string,
  ): Promise<OrganizationIdentityStats> {
    return apiClient.get<OrganizationIdentityStats>(
      `${identityBase(
        organizationId,
      )}/stats`,
    );
  },

  // ==========================================================================
  // USERS
  // ==========================================================================

  async getUsers(
    organizationId: string,
  ): Promise<OrganizationIdentity[]> {
    const result =
      await apiClient.get<
        | OrganizationIdentity[]
        | {
            users?: OrganizationIdentity[];
          }
      >(
        `${identityBase(
          organizationId,
        )}/users`,
      );

    if (Array.isArray(result)) {
      return result;
    }

    return Array.isArray(
      result?.users,
    )
      ? result.users
      : [];
  },

  // ==========================================================================

  async getUser(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationIdentity> {
    return apiClient.get<OrganizationIdentity>(
      userPath(
        organizationId,
        userId,
      ),
    );
  },

  // ==========================================================================

  async createUser(
    organizationId: string,
    payload: CreateManagedUserPayload,
  ): Promise<OrganizationIdentity> {
    return apiClient.post<OrganizationIdentity>(
      `${identityBase(
        organizationId,
      )}/users`,
      payload,
    );
  },

  // ==========================================================================

  async updateUser(
    organizationId: string,
    userId: string,
    payload: UpdateManagedUserPayload,
  ): Promise<OrganizationIdentity> {
    return apiClient.patch<OrganizationIdentity>(
      userPath(
        organizationId,
        userId,
      ),
      payload,
    );
  },

  // ==========================================================================

  async suspendUser(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationIdentity> {
    return apiClient.post<OrganizationIdentity>(
      `${userPath(
        organizationId,
        userId,
      )}/suspend`,
    );
  },

  // ==========================================================================

  async restoreUser(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationIdentity> {
    return apiClient.post<OrganizationIdentity>(
      `${userPath(
        organizationId,
        userId,
      )}/restore`,
    );
  },

  // ==========================================================================

  async resetPassword(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationIdentityActionResponse> {
    return apiClient.post<OrganizationIdentityActionResponse>(
      `${userPath(
        organizationId,
        userId,
      )}/reset-password`,
    );
  },

  // ==========================================================================

  async resendActivation(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationIdentityActionResponse> {
    return apiClient.post<OrganizationIdentityActionResponse>(
      `${userPath(
        organizationId,
        userId,
      )}/resend-activation`,
    );
  },

  // ==========================================================================

  async removeUser(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationIdentityActionResponse> {
    return apiClient.delete<OrganizationIdentityActionResponse>(
      userPath(
        organizationId,
        userId,
      ),
    );
  },

  // ==========================================================================
  // DOMAINS
  // ==========================================================================

  /**
   * Get every domain belonging to the organization.
   *
   * This includes:
   *
   * organization domains
   * member domains
   */
  async getDomains(
    organizationId: string,
  ): Promise<OrganizationDomain[]> {
    const result =
      await apiClient.get<
        | OrganizationDomain[]
        | {
            domains?: OrganizationDomain[];
          }
      >(
        `${identityBase(
          organizationId,
        )}/domains`,
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

  // ==========================================================================
  // GET SINGLE DOMAIN
  // ==========================================================================

  async getDomain(
    organizationId: string,
    domainId: string,
  ): Promise<OrganizationDomain> {
    return apiClient.get<OrganizationDomain>(
      domainPath(
        organizationId,
        domainId,
      ),
    );
  },

  // ==========================================================================
  // CHECK DOMAIN AVAILABILITY
  // ==========================================================================

  /**
   * Checks whether a Fockis domain can be used.
   *
   * The backend is authoritative.
   */
  async checkDomainAvailability(
    organizationId: string,
    domain: string,
  ): Promise<DomainAvailabilityResponse> {
    const normalizedDomain =
      validateFockisDomain(domain);

    const params =
      new URLSearchParams();

    params.set(
      "domain",
      normalizedDomain,
    );

    return apiClient.get<DomainAvailabilityResponse>(
      `${identityBase(
        organizationId,
      )}/domains/check-availability?${params.toString()}`,
    );
  },

  // ==========================================================================
  // ADD ORGANIZATION / MEMBER DOMAIN
  // ==========================================================================

  /**
   * Create a domain for the organization.
   *
   * Organization domain:
   *
   *   springfieldchurch.fockis.com
   *
   * Member domain:
   *
   *   john.springfieldchurch.fockis.com
   *
   * Member domains should specify parentDomainId.
   */
  async addDomain(
    organizationId: string,
    payload: CreateOrganizationDomainPayload,
  ): Promise<OrganizationDomain> {
    const domain =
      validateFockisDomain(
        payload.domain,
      );

    const body = cleanPayload({
      domain,

      domainType:
        payload.domainType ??
        "member",

      parentDomainId:
        payload.parentDomainId ??
        null,

      assignedUserId:
        payload.assignedUserId ??
        null,

      assignedMembershipId:
        payload.assignedMembershipId ??
        null,
    });

    return apiClient.post<OrganizationDomain>(
      `${identityBase(
        organizationId,
      )}/domains`,
      body,
    );
  },

  // ==========================================================================
  // CREATE ORGANIZATION BASE DOMAIN
  // ==========================================================================

  /**
   * Convenience method for creating the organization's
   * primary/base domain.
   *
   * Example:
   *
   * springfieldchurch.fockis.com
   */
  async createOrganizationDomain(
    organizationId: string,
    domain: string,
  ): Promise<OrganizationDomain> {
    return this.addDomain(
      organizationId,
      {
        domain,
        domainType:
          "organization",
        parentDomainId: null,
        assignedUserId: null,
        assignedMembershipId: null,
      },
    );
  },

  // ==========================================================================
  // CREATE MEMBER DOMAIN
  // ==========================================================================

  /**
   * Create a domain for one organization member.
   *
   * Example:
   *
   * Base:
   *   springfieldchurch.fockis.com
   *
   * Member:
   *   john.springfieldchurch.fockis.com
   */
  async createMemberDomain(
    organizationId: string,
    payload: {
      domain: string;
      parentDomainId: string;
      assignedUserId: string;
      assignedMembershipId?: string | null;
    },
  ): Promise<OrganizationDomain> {
    return this.addDomain(
      organizationId,
      {
        domain:
          payload.domain,

        domainType:
          "member",

        parentDomainId:
          payload.parentDomainId,

        assignedUserId:
          payload.assignedUserId,

        assignedMembershipId:
          payload.assignedMembershipId ??
          null,
      },
    );
  },

  // ==========================================================================
  // ASSIGN EXISTING DOMAIN TO MEMBER
  // ==========================================================================

  /**
   * Assign an existing domain to an organization member.
   */
  async assignDomainToMember(
    organizationId: string,
    domainId: string,
    payload: AssignDomainToMemberPayload,
  ): Promise<OrganizationDomain> {
    const assignedUserId =
      requireId(
        payload.assignedUserId,
        "Assigned User ID",
      );

    return apiClient.patch<OrganizationDomain>(
      domainPath(
        organizationId,
        domainId,
      ),
      cleanPayload({
        assignedUserId,
        assignedMembershipId:
          payload.assignedMembershipId ??
          null,
      }),
    );
  },

  // ==========================================================================
  // UPDATE DOMAIN ASSIGNMENT
  // ==========================================================================

  /**
   * Change or remove the member assigned to a domain.
   */
  async updateDomainAssignment(
    organizationId: string,
    domainId: string,
    payload: UpdateDomainAssignmentPayload,
  ): Promise<OrganizationDomain> {
    return apiClient.patch<OrganizationDomain>(
      domainPath(
        organizationId,
        domainId,
      ),
      cleanPayload({
        assignedUserId:
          payload.assignedUserId,

        assignedMembershipId:
          payload.assignedMembershipId,
      }),
    );
  },

  // ==========================================================================
  // VERIFY DOMAIN
  // ==========================================================================

  async verifyDomain(
    organizationId: string,
    domainId: string,
  ): Promise<OrganizationDomain> {
    return apiClient.post<OrganizationDomain>(
      `${domainPath(
        organizationId,
        domainId,
      )}/verify`,
    );
  },

  // ==========================================================================
  // REMOVE DOMAIN
  // ==========================================================================

  async removeDomain(
    organizationId: string,
    domainId: string,
  ): Promise<OrganizationIdentityActionResponse> {
    return apiClient.delete<OrganizationIdentityActionResponse>(
      domainPath(
        organizationId,
        domainId,
      ),
    );
  },

  // ==========================================================================
  // SECURITY
  // ==========================================================================

  async getSecurityPolicy(
    organizationId: string,
  ): Promise<SecurityPolicy> {
    return apiClient.get<SecurityPolicy>(
      `${identityBase(
        organizationId,
      )}/security`,
    );
  },

  // ==========================================================================

  async updateSecurityPolicy(
    organizationId: string,
    payload: Partial<SecurityPolicy>,
  ): Promise<SecurityPolicy> {
    return apiClient.patch<SecurityPolicy>(
      `${identityBase(
        organizationId,
      )}/security`,
      payload,
    );
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export default organizationIdentityApi;

export {
  organizationIdentityApi,
};