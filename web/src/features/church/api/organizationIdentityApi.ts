/**
 * organizationIdentityApi.ts
 * -----------------------------------------------------------------------------
 * Fockis Organization Identity API
 *
 * Handles organization-owned Fockis domains.
 *
 * Domain hierarchy:
 *
 *   Organization
 *       │
 *       └── Base domain
 *             springfieldchurch.fockis.com
 *
 *                   │
 *                   ├── john.springfieldchurch.fockis.com
 *                   ├── mary.springfieldchurch.fockis.com
 *                   └── david.springfieldchurch.fockis.com
 *
 * The backend remains authoritative for:
 * - administrator permissions
 * - domain ownership
 * - Fockis-only domains
 * - uniqueness
 * - member/user assignments
 * - parent/child relationships
 * -----------------------------------------------------------------------------
 */

import {
  churchDelete,
  churchGet,
  churchPost,
} from "./churchApi";

// ============================================================================
// TYPES
// ============================================================================

export type OrganizationDomainType =
  | "base"
  | "member";

export interface OrganizationDomain {
  id: string;

  organizationId: string;

  domain: string;

  domainType: OrganizationDomainType;

  parentDomainId?: string | null;

  assignedUserId?: string | null;

  assignedMembershipId?: string | null;

  verified?: boolean;

  verificationStatus?: string;

  verificationToken?: string | null;

  createdAt?: string;

  updatedAt?: string;
}

export interface CreateBaseDomainInput {
  domain: string;

  domainType: "base";
}

export interface CreateMemberDomainInput {
  domain: string;

  domainType: "member";

  parentDomainId: string;

  assignedUserId: string;

  assignedMembershipId: string;
}

export interface CheckDomainAvailabilityResult {
  available: boolean;

  domain?: string;

  domainType?: OrganizationDomainType;

  parentDomainId?: string | null;

  reason?: string;

  message?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function validateOrganizationId(
  organizationId: string,
): string {
  const value = organizationId?.trim();

  if (
    !value ||
    value === "YOUR_ORG_ID" ||
    value === "undefined" ||
    value === "null"
  ) {
    throw new Error(
      "A valid Church organization ID is required.",
    );
  }

  return value;
}

function normalizeDomain(
  domain: string,
): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

// ============================================================================
// LIST DOMAINS
// ============================================================================

export async function listOrganizationDomains(
  organizationId: string,
  options?: {
    domainType?: OrganizationDomainType;
    parentDomainId?: string;
  },
  signal?: AbortSignal,
): Promise<OrganizationDomain[]> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  const response =
    await churchGet<
      OrganizationDomain[] |
      {
        items?: OrganizationDomain[];
        data?: OrganizationDomain[];
      }
    >(
      `/organizations/${encodeURIComponent(
        id,
      )}/identity/domains`,
      {
        domainType:
          options?.domainType,
        parentDomainId:
          options?.parentDomainId,
      },
      signal,
    );

  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

// ============================================================================
// GET BASE DOMAIN
// ============================================================================

export async function getBaseOrganizationDomain(
  organizationId: string,
  signal?: AbortSignal,
): Promise<OrganizationDomain | null> {
  const domains =
    await listOrganizationDomains(
      organizationId,
      {
        domainType: "base",
      },
      signal,
    );

  return domains[0] ?? null;
}

// ============================================================================
// GET MEMBER DOMAINS
// ============================================================================

export async function getMemberOrganizationDomains(
  organizationId: string,
  parentDomainId?: string,
  signal?: AbortSignal,
): Promise<OrganizationDomain[]> {
  return listOrganizationDomains(
    organizationId,
    {
      domainType: "member",
      parentDomainId,
    },
    signal,
  );
}

// ============================================================================
// CHECK AVAILABILITY
// ============================================================================

export async function checkOrganizationDomainAvailability(
  organizationId: string,
  domain: string,
  signal?: AbortSignal,
): Promise<CheckDomainAvailabilityResult> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  const normalized =
    normalizeDomain(domain);

  if (!normalized) {
    throw new Error(
      "A domain is required.",
    );
  }

  return churchGet<CheckDomainAvailabilityResult>(
    `/organizations/${encodeURIComponent(
      id,
    )}/identity/domains/check-availability`,
    {
      domain: normalized,
    },
    signal,
  );
}

// ============================================================================
// CREATE BASE DOMAIN
// ============================================================================

export async function createBaseOrganizationDomain(
  organizationId: string,
  domain: string,
): Promise<OrganizationDomain> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  const normalized =
    normalizeDomain(domain);

  if (!normalized) {
    throw new Error(
      "A base domain is required.",
    );
  }

  return churchPost<OrganizationDomain>(
    `/organizations/${encodeURIComponent(
      id,
    )}/identity/domains`,
    {
      domain: normalized,
      domainType: "base",
    } satisfies CreateBaseDomainInput,
  );
}

// ============================================================================
// CREATE MEMBER DOMAIN
// ============================================================================

export async function createMemberOrganizationDomain(
  organizationId: string,
  input: {
    domain: string;

    parentDomainId: string;

    assignedUserId: string;

    assignedMembershipId: string;
  },
): Promise<OrganizationDomain> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  const normalized =
    normalizeDomain(input.domain);

  if (!normalized) {
    throw new Error(
      "A member domain is required.",
    );
  }

  if (!input.parentDomainId) {
    throw new Error(
      "The parent organization domain is required.",
    );
  }

  if (!input.assignedUserId) {
    throw new Error(
      "The member user ID is required.",
    );
  }

  if (!input.assignedMembershipId) {
    throw new Error(
      "The member membership ID is required.",
    );
  }

  return churchPost<OrganizationDomain>(
    `/organizations/${encodeURIComponent(
      id,
    )}/identity/domains`,
    {
      domain: normalized,
      domainType: "member",
      parentDomainId:
        input.parentDomainId,
      assignedUserId:
        input.assignedUserId,
      assignedMembershipId:
        input.assignedMembershipId,
    } satisfies CreateMemberDomainInput,
  );
}

// ============================================================================
// VERIFY DOMAIN
// ============================================================================

export async function verifyOrganizationDomain(
  organizationId: string,
  domainId: string,
): Promise<OrganizationDomain> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  if (!domainId) {
    throw new Error(
      "A domain ID is required.",
    );
  }

  return churchPost<OrganizationDomain>(
    `/organizations/${encodeURIComponent(
      id,
    )}/identity/domains/${encodeURIComponent(
      domainId,
    )}/verify`,
  );
}

// ============================================================================
// DELETE DOMAIN
// ============================================================================

export async function deleteOrganizationDomain(
  organizationId: string,
  domainId: string,
): Promise<void> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  if (!domainId) {
    throw new Error(
      "A domain ID is required.",
    );
  }

  await churchDelete<void>(
    `/organizations/${encodeURIComponent(
      id,
    )}/identity/domains/${encodeURIComponent(
      domainId,
    )}`,
  );
}