/**
 * organizationsApi.ts
 * -----------------------------------------------------------------------------
 * Fockis Church — Organization API
 *
 * Includes:
 * - List organizations
 * - List current user's organizations
 * - Get organization
 * - Get viewer authorization
 * - Create organization
 * - Update organization
 * - Update organization settings
 * - Archive organization
 * - Delete organization
 * - Join organization
 * - Leave organization
 * - Recover organization owner membership
 * - Update administrator permissions
 * - Grant administrator permission
 * - Revoke administrator permission
 *
 * Member Management:
 * - Create member
 * - Required Fockis member domain
 *
 * Organization Cover Media:
 * - Upload photo
 * - Upload video
 * - Replace uploaded cover
 * - Set external image/video URL
 * - Delete cover
 *
 * IMPORTANT
 * -----------------------------------------------------------------------------
 *
 * Organization ownership is determined by the backend.
 *
 * The frontend MUST NOT infer ownership from:
 *
 *   role === "administrator"
 *
 * The dedicated authorization endpoint is the authoritative source for:
 *
 *   - authentication
 *   - active membership
 *   - owner status
 *   - permissions
 *
 * Organization-specific endpoints require a real MongoDB ObjectId.
 * -----------------------------------------------------------------------------
 */

import {
  churchDelete,
  churchGet,
  churchPatch,
  churchPost,
  churchUpload,
  toPaginated,
  withFallback,
} from "./churchApi";

import type {
  ChurchPermissions,
  CreateOrganizationInput,
  Organization,
  OrganizationSummary,
  OrganizationType,
  PageQuery,
  PaginatedResult,
  UpdateOrganizationInput,
} from "../types/church.types";

import {
  OrganizationStatus,
} from "../types/church.types";

/* ============================================================================
   TYPES
   ========================================================================== */

/**
 * Organization discovery/list query.
 */
export interface ListOrganizationsQuery
  extends PageQuery {
  organizationType?: OrganizationType;

  /**
   * When true, return organizations associated
   * with the authenticated user.
   */
  mine?: boolean;
}

/**
 * Viewer information returned by the
 * organization authorization endpoint.
 */
export interface OrganizationViewer {
  isAuthenticated?: boolean;

  isActiveMember?: boolean;

  isOwner?: boolean;

  permissions?:
    | ChurchPermissions
    | null;
}

/**
 * Backend authorization response.
 *
 * Supports both direct and nested viewer response
 * structures so the frontend remains compatible
 * with the backend serializer.
 */
export interface OrganizationAuthorization {
  organizationId?: string;

  isAuthenticated?: boolean;

  isActiveMember?: boolean;

  isOwner?: boolean;

  currentUserIsOwner?: boolean;

  currentUserMembershipStatus?:
    | string
    | null;

  currentUserRole?:
    | string
    | null;

  permissions?:
    | ChurchPermissions
    | null;

  viewer?:
    | OrganizationViewer
    | null;
}

/**
 * Organization settings update.
 */
export interface UpdateOrganizationSettingsInput {
  isDiscoverable?: boolean;

  requireApproval?: boolean;
}

/**
 * Complete administrator permission update.
 */
export interface AdminPermissionsInput {
  userId: string;

  permissions: ChurchPermissions;
}

/**
 * Grant one permission to an administrator.
 */
export interface GrantPermissionInput {
  userId: string;

  permission: string;
}

/**
 * Revoke one permission from an administrator.
 */
export interface RevokePermissionInput {
  userId: string;

  permission: string;
}

/* ============================================================================
   MEMBER TYPES
   ========================================================================== */

/**
 * Supported member role values.
 *
 * This intentionally remains a string at the API boundary so this file
 * does not need to duplicate the backend MemberRole enum.
 */
export type OrganizationMemberRole =
  | string;

/**
 * Member profile information.
 */
export interface CreateOrganizationMemberProfile {
  displayName: string;

  avatarUrl?: string;
}

/**
 * Payload for creating an organization member.
 *
 * IMPORTANT:
 *
 * `domain` is the COMPLETE Fockis member domain.
 *
 * Example:
 *
 *   john.springfieldchurch.fockis.com
 */
export interface CreateOrganizationMemberInput {
  /**
   * Existing Fockis platform user.
   */
  userId?: string;

  /**
   * Email used for an invitation or existing account.
   */
  email?: string;

  /**
   * REQUIRED complete Fockis member domain.
   *
   * Example:
   *
   *   john.springfieldchurch.fockis.com
   */
  domain: string;

  /**
   * Optional branch.
   */
  branchId?: string;

  /**
   * Optional member role.
   */
  role?: OrganizationMemberRole;

  /**
   * Member profile.
   */
  profile: CreateOrganizationMemberProfile;
}

/**
 * Generic organization member response.
 *
 * The exact backend membership response can contain additional fields,
 * therefore this interface intentionally describes the important fields
 * while allowing compatible backend additions.
 */
export interface OrganizationMember {
  id: string;

  userId: string;

  organizationId?: string;

  domain: string;

  role?: string;

  status?: string;

  isAdmin?: boolean;

  canApproveMembers?: boolean;

  profile?: {
    displayName?: string;

    avatarUrl?: string | null;
  };

  createdAt?: string;

  updatedAt?: string;

  [key: string]: unknown;
}

/* ============================================================================
   FOCKIS DOMAIN CONFIGURATION
   ========================================================================== */

/**
 * Supported Fockis organization namespace suffixes.
 *
 * Every organization domain must use one of these namespaces.
 */
export const FOCKIS_DOMAIN_SUFFIX_OPTIONS = [
  ".fockis.com",
  ".fockis.org",
  ".fockis.net",
  ".fockis.edu",
  ".fockis.church",
  ".fockis.co",
  ".fockis.io",
] as const;

export type FockisDomainSuffix =
  typeof FOCKIS_DOMAIN_SUFFIX_OPTIONS[number];

/**
 * Organization domain pattern.
 *
 * Examples:
 *
 *   springfieldchurch.fockis.com
 *   springfieldchurch.fockis.org
 *   springfieldchurch.fockis.church
 */
export const FOCKIS_ORGANIZATION_DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.fockis\.(?:com|org|net|edu|church|co|io)$/i;

/**
 * Member domain pattern.
 *
 * Structure:
 *
 *   <member-prefix>.<organization-domain>
 *
 * Example:
 *
 *   john.springfieldchurch.fockis.com
 */
export const FOCKIS_MEMBER_DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.fockis\.(?:com|org|net|edu|church|co|io)$/i;

/* ============================================================================
   FALLBACK
   ========================================================================== */

const FALLBACK_ORGANIZATIONS:
  OrganizationSummary[] = [];

/* ============================================================================
   ORGANIZATION ID VALIDATION
   ========================================================================== */

/**
 * Organization-specific backend endpoints require
 * a real MongoDB ObjectId.
 *
 * Placeholder values are deliberately rejected.
 */
function validateOrganizationId(
  value: string,
): string {
  const organizationId =
    value?.trim();

  if (
    !organizationId ||
    organizationId === "YOUR_ORG_ID" ||
    organizationId === "undefined" ||
    organizationId === "null"
  ) {
    throw new Error(
      "A valid Church organization ID is required.",
    );
  }

  if (
    !/^[a-fA-F0-9]{24}$/.test(
      organizationId,
    )
  ) {
    throw new Error(
      "The Church organization ID is invalid.",
    );
  }

  return organizationId;
}

/* ============================================================================
   DOMAIN NORMALIZATION
   ========================================================================== */

/**
 * Normalize a domain before sending it to the backend.
 *
 * Handles:
 *
 *   HTTP/HTTPS
 *   www.
 *   trailing dot
 *   paths
 *   uppercase characters
 */
function normalizeDomain(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/\.$/, "");
}

/**
 * Validate a Fockis organization domain.
 */
export function isValidFockisOrganizationDomain(
  value: string,
): boolean {
  const domain =
    normalizeDomain(value);

  return (
    domain.length <= 253 &&
    FOCKIS_ORGANIZATION_DOMAIN_PATTERN.test(
      domain,
    )
  );
}

/**
 * Validate and normalize a Fockis organization domain.
 */
export function validateFockisOrganizationDomain(
  value: string,
): string {
  const domain =
    normalizeDomain(value);

  if (!domain) {
    throw new Error(
      "Organization domain is required.",
    );
  }

  if (
    domain === "fockis.com" ||
    domain === "fockis.org" ||
    domain === "fockis.net" ||
    domain === "fockis.edu" ||
    domain === "fockis.church" ||
    domain === "fockis.co" ||
    domain === "fockis.io"
  ) {
    throw new Error(
      "A Fockis organization domain must include an organization name.",
    );
  }

  if (
    !isValidFockisOrganizationDomain(
      domain,
    )
  ) {
    throw new Error(
      "Organization domain must be a valid Fockis domain such as springfieldchurch.fockis.com.",
    );
  }

  return domain;
}

/**
 * Validate a complete Fockis member domain.
 *
 * This checks the SHAPE of the domain.
 *
 * MembersService performs the more important backend check that the member
 * domain actually belongs to the requested organization.
 */
export function isValidFockisMemberDomain(
  value: string,
): boolean {
  const domain =
    normalizeDomain(value);

  return (
    domain.length <= 253 &&
    FOCKIS_MEMBER_DOMAIN_PATTERN.test(
      domain,
    )
  );
}

/**
 * Validate and normalize a complete Fockis member domain.
 */
export function validateFockisMemberDomain(
  value: string,
): string {
  const domain =
    normalizeDomain(value);

  if (!domain) {
    throw new Error(
      "Member domain is required.",
    );
  }

  if (
    !isValidFockisMemberDomain(
      domain,
    )
  ) {
    throw new Error(
      "Member domain must be a valid Fockis member domain such as john.springfieldchurch.fockis.com.",
    );
  }

  return domain;
}

/**
 * Build a complete member domain from:
 *
 *   member prefix
 *   +
 *   organization domain
 *
 * Example:
 *
 *   john
 *   +
 *   springfieldchurch.fockis.com
 *
 *   =
 *
 *   john.springfieldchurch.fockis.com
 */
export function buildFockisMemberDomain(
  memberPrefix: string,
  organizationDomain: string,
): string {
  const prefix =
    normalizeDomainLabel(
      memberPrefix,
    );

  const baseDomain =
    validateFockisOrganizationDomain(
      organizationDomain,
    );

  if (!prefix) {
    throw new Error(
      "Member domain prefix is required.",
    );
  }

  if (
    prefix.length < 2 ||
    prefix.length > 63
  ) {
    throw new Error(
      "Member domain prefix must contain between 2 and 63 characters.",
    );
  }

  const domain =
    `${prefix}.${baseDomain}`;

  return validateFockisMemberDomain(
    domain,
  );
}

/**
 * Normalize a member-domain label.
 *
 * This is useful for UI input such as:
 *
 *   John Doe
 *
 * becoming:
 *
 *   john-doe
 */
export function normalizeDomainLabel(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 63);
}

/**
 * Extract the member prefix from a complete member domain.
 *
 * Example:
 *
 *   john.springfieldchurch.fockis.com
 *
 * returns:
 *
 *   john
 */
export function getFockisMemberDomainPrefix(
  memberDomain: string,
  organizationDomain: string,
): string {
  const member =
    validateFockisMemberDomain(
      memberDomain,
    );

  const organization =
    validateFockisOrganizationDomain(
      organizationDomain,
    );

  const expectedSuffix =
    `.${organization}`;

  if (
    !member.endsWith(
      expectedSuffix,
    )
  ) {
    throw new Error(
      `Member domain must belong to ${organization}.`,
    );
  }

  const prefix =
    member.slice(
      0,
      -expectedSuffix.length,
    );

  if (
    !prefix ||
    prefix.includes(".")
  ) {
    throw new Error(
      `Member domain must use the format <member>.<organization-domain>.`,
    );
  }

  return prefix;
}

/* ============================================================================
   COVER FILE VALIDATION
   ========================================================================== */

/**
 * Maximum organization cover upload size.
 *
 * The backend MUST enforce its own limit as well.
 */
const MAX_COVER_FILE_SIZE =
  100 * 1024 * 1024;

/**
 * Validate an organization cover file before upload.
 *
 * Supported:
 * - image/*
 * - video/*
 */
function validateOrganizationCoverFile(
  file: File,
): OrganizationCoverMediaType {
  if (!file) {
    throw new Error(
      "Please select an organization cover photo or video.",
    );
  }

  const mimeType =
    file.type?.toLowerCase() || "";

  const isImage =
    mimeType.startsWith("image/");

  const isVideo =
    mimeType.startsWith("video/");

  if (!isImage && !isVideo) {
    throw new Error(
      "Organization cover must be an image or video file.",
    );
  }

  if (
    file.size >
    MAX_COVER_FILE_SIZE
  ) {
    throw new Error(
      "Organization cover files cannot be larger than 100 MB.",
    );
  }

  return isVideo
    ? "video"
    : "image";
}

/* ============================================================================
   LIST ORGANIZATIONS
   ========================================================================== */

/**
 * List organizations available for discovery.
 *
 * Backend:
 *
 *   GET /church/organizations
 */
export async function listOrganizations(
  query: ListOrganizationsQuery = {},
  signal?: AbortSignal,
): Promise<
  PaginatedResult<OrganizationSummary>
> {
  return withFallback(
    () =>
      churchGet<
        PaginatedResult<OrganizationSummary>
      >(
        "/organizations",
        {
          page:
            query.page,

          pageSize:
            query.pageSize,

          search:
            query.search,

          organizationType:
            query.organizationType,

          mine:
            query.mine,
        },
        signal,
      ),

    () =>
      toPaginated(
        FALLBACK_ORGANIZATIONS,
        query.page,
        query.pageSize,
      ),
  );
}

/* ============================================================================
   MY ORGANIZATIONS
   ========================================================================== */

/**
 * Get organizations associated with the
 * currently authenticated user.
 */
export async function getMyOrganizations(
  signal?: AbortSignal,
): Promise<
  PaginatedResult<OrganizationSummary>
> {
  return listOrganizations(
    {
      page: 1,
      pageSize: 100,
      mine: true,
    },
    signal,
  );
}

/* ============================================================================
   GET ORGANIZATION
   ========================================================================== */

/**
 * Fetch one organization by ID or slug.
 */
export async function getOrganization(
  organizationIdOrSlug: string,
  signal?: AbortSignal,
): Promise<Organization> {
  const value =
    organizationIdOrSlug?.trim();

  if (
    !value ||
    value === "YOUR_ORG_ID" ||
    value === "undefined" ||
    value === "null"
  ) {
    throw new Error(
      "A valid Church organization ID or slug is required.",
    );
  }

  return churchGet<Organization>(
    `/organizations/${encodeURIComponent(
      value,
    )}`,
    undefined,
    signal,
  );
}

/* ============================================================================
   GET VIEWER AUTHORIZATION
   ========================================================================== */

/**
 * Get the current user's authorization for an organization.
 */
export async function getOrganizationAuthorization(
  organizationId: string,
  signal?: AbortSignal,
): Promise<OrganizationAuthorization> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  return churchGet<
    OrganizationAuthorization
  >(
    `/organizations/${encodeURIComponent(
      id,
    )}/authorization`,
    undefined,
    signal,
  );
}

/* ============================================================================
   CREATE ORGANIZATION
   ========================================================================== */

/**
 * Create a new organization.
 *
 * The organization domain is required by the backend DTO.
 *
 * Example:
 *
 *   {
 *     name: "Springfield Church",
 *     domain: "springfieldchurch.fockis.com"
 *   }
 *
 * The authenticated creator becomes the permanent organization owner.
 */
export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<Organization> {
  const payload = {
    ...input,
  };

  /**
   * Validate the domain if the current Church type includes it.
   *
   * We intentionally use a runtime check here so this API remains compatible
   * with older generated/local TypeScript types while the backend contract is
   * being updated.
   */
  const domain =
    (input as CreateOrganizationInput & {
      domain?: string;
    }).domain;

  if (!domain?.trim()) {
    throw new Error(
      "A Fockis organization domain is required.",
    );
  }

  (
    payload as CreateOrganizationInput & {
      domain: string;
    }
  ).domain =
    validateFockisOrganizationDomain(
      domain,
    );

  return churchPost<Organization>(
    "/organizations",
    payload,
  );
}

/* ============================================================================
   UPDATE ORGANIZATION
   ========================================================================== */

/**
 * Update organization profile information.
 *
 * IMPORTANT:
 *
 * The organization domain is a namespace identity and should not be changed
 * through the normal profile update endpoint.
 */
export async function updateOrganization(
  organizationId: string,
  input: UpdateOrganizationInput,
): Promise<Organization> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  /**
   * Prevent accidental domain changes through this endpoint.
   *
   * Domain changes, if ever supported, should have a dedicated backend
   * workflow because changing the organization namespace affects member
   * domains and identity references.
   */
  if (
    "domain" in
    (input as Record<string, unknown>)
  ) {
    throw new Error(
      "Organization domain cannot be changed through the normal profile update endpoint.",
    );
  }

  return churchPatch<Organization>(
    `/organizations/${encodeURIComponent(
      id,
    )}`,
    input,
  );
}

/* ============================================================================
   UPDATE SETTINGS
   ========================================================================== */

/**
 * Update organization settings.
 */
export async function updateOrganizationSettings(
  organizationId: string,
  input: UpdateOrganizationSettingsInput,
): Promise<Organization> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  return churchPatch<Organization>(
    `/organizations/${encodeURIComponent(
      id,
    )}/settings`,
    input,
  );
}

/* ============================================================================
   CREATE ORGANIZATION MEMBER
   ========================================================================== */

/**
 * Create a member inside an organization.
 *
 * Backend:
 *
 *   POST /church/organizations/:organizationId/members
 *
 * REQUIRED:
 *
 *   input.domain
 *
 * Example:
 *
 *   john.springfieldchurch.fockis.com
 *
 * IMPORTANT:
 *
 * The frontend validates the member-domain shape.
 *
 * The backend MembersService MUST additionally verify that:
 *
 *   john.springfieldchurch.fockis.com
 *
 * actually belongs to:
 *
 *   springfieldchurch.fockis.com
 *
 * for the supplied organizationId.
 */
export async function createOrganizationMember(
  organizationId: string,
  input: CreateOrganizationMemberInput,
): Promise<OrganizationMember> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  if (!input) {
    throw new Error(
      "Member information is required.",
    );
  }

  if (
    !input.userId?.trim() &&
    !input.email?.trim()
  ) {
    throw new Error(
      "A member user ID or email address is required.",
    );
  }

  if (!input.profile) {
    throw new Error(
      "Member profile information is required.",
    );
  }

  if (
    !input.profile.displayName?.trim()
  ) {
    throw new Error(
      "Member display name is required.",
    );
  }

  /**
   * Validate the COMPLETE member domain.
   *
   * Example:
   *
   *   john.springfieldchurch.fockis.com
   */
  const domain =
    validateFockisMemberDomain(
      input.domain,
    );

  const payload: CreateOrganizationMemberInput =
    {
      ...input,

      domain,

      userId:
        input.userId?.trim() ||
        undefined,

      email:
        input.email?.trim() ||
        undefined,

      branchId:
        input.branchId?.trim() ||
        undefined,

      profile: {
        ...input.profile,

        displayName:
          input.profile.displayName.trim(),

        avatarUrl:
          input.profile.avatarUrl?.trim() ||
          undefined,
      },
    };

  return churchPost<OrganizationMember>(
    `/organizations/${encodeURIComponent(
      id,
    )}/members`,
    payload,
  );
}

/* ============================================================================
   ORGANIZATION COVER — UPLOAD
   ========================================================================== */

/**
 * Supported organization cover media.
 */
export type OrganizationCoverMediaType =
  | "image"
  | "video";

/**
 * How the cover was stored.
 */
export type OrganizationCoverMediaSource =
  | "upload"
  | "url";

/**
 * Response returned by the cover endpoints.
 */
export interface OrganizationCoverResponse {
  organization?: Organization | null;

  bannerUrl:
    | string
    | null;

  bannerMediaType:
    | OrganizationCoverMediaType
    | null;

  bannerMediaSource:
    | OrganizationCoverMediaSource
    | null;
}

/**
 * External cover URL input.
 */
export interface SetOrganizationCoverUrlInput {
  url: string;

  mediaType:
    | OrganizationCoverMediaType;
}

/**
 * Upload a photo or video as the organization cover.
 */
export async function uploadOrganizationCover(
  organizationId: string,
  file: File,
  signal?: AbortSignal,
): Promise<OrganizationCoverResponse> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  validateOrganizationCoverFile(
    file,
  );

  const formData =
    new FormData();

  formData.append(
    "file",
    file,
    file.name,
  );

  return churchUpload<
    OrganizationCoverResponse
  >(
    `/organizations/${encodeURIComponent(
      id,
    )}/cover`,
    formData,
    signal,
  );
}

/* ============================================================================
   ORGANIZATION COVER — SET URL
   ========================================================================== */

/**
 * Set an external image/video URL as the organization cover.
 */
export async function setOrganizationCoverUrl(
  organizationId: string,
  input: SetOrganizationCoverUrlInput,
  signal?: AbortSignal,
): Promise<OrganizationCoverResponse> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  const url =
    input.url?.trim();

  if (!url) {
    throw new Error(
      "A cover URL is required.",
    );
  }

  if (
    input.mediaType !== "image" &&
    input.mediaType !== "video"
  ) {
    throw new Error(
      "Cover media type must be image or video.",
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl =
      new URL(url);
  } catch {
    throw new Error(
      "Please enter a valid cover URL.",
    );
  }

  if (
    parsedUrl.protocol !== "http:" &&
    parsedUrl.protocol !== "https:"
  ) {
    throw new Error(
      "Cover URL must use HTTP or HTTPS.",
    );
  }

  return churchPatch<
    OrganizationCoverResponse
  >(
    `/organizations/${encodeURIComponent(
      id,
    )}/cover`,
    {
      url,
      mediaType:
        input.mediaType,
    },
    signal,
  );
}

/* ============================================================================
   ORGANIZATION COVER — DELETE
   ========================================================================== */

/**
 * Delete the current organization cover.
 */
export async function deleteOrganizationCover(
  organizationId: string,
  signal?: AbortSignal,
): Promise<OrganizationCoverResponse> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  return churchDelete<
    OrganizationCoverResponse
  >(
    `/organizations/${encodeURIComponent(
      id,
    )}/cover`,
    signal,
  );
}

/* ============================================================================
   ARCHIVE
   ========================================================================== */

/**
 * Archive an organization.
 */
export async function archiveOrganization(
  organizationId: string,
): Promise<Organization> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  return churchPatch<Organization>(
    `/organizations/${encodeURIComponent(
      id,
    )}/status`,
    {
      status:
        OrganizationStatus.Archived,
    },
  );
}

/* ============================================================================
   DELETE
   ========================================================================== */

/**
 * Permanently delete an organization.
 */
export async function deleteOrganization(
  organizationId: string,
): Promise<void> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  await churchDelete<void>(
    `/organizations/${encodeURIComponent(
      id,
    )}`,
  );
}

/* ============================================================================
   JOIN
   ========================================================================== */

/**
 * Request membership in an organization.
 */
export async function joinOrganization(
  organizationId: string,
): Promise<{
  membershipStatus: string;
}> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  return churchPost<{
    membershipStatus: string;
  }>(
    `/organizations/${encodeURIComponent(
      id,
    )}/join`,
  );
}

/* ============================================================================
   LEAVE
   ========================================================================== */

/**
 * Leave an organization.
 *
 * The backend must reject this for the permanent owner.
 */
export async function leaveOrganization(
  organizationId: string,
): Promise<void> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  await churchPost<void>(
    `/organizations/${encodeURIComponent(
      id,
    )}/leave`,
  );
}

/* ============================================================================
   OWNER RECOVERY
   ========================================================================== */

/**
 * Restore the authenticated creator's owner membership.
 */
export async function recoverOrganizationOwner(
  organizationId: string,
): Promise<unknown> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  return churchPost<unknown>(
    `/organizations/${encodeURIComponent(
      id,
    )}/recover-owner`,
  );
}

/* ============================================================================
   ADMIN PERMISSIONS
   ========================================================================== */

/**
 * Replace the complete permission set for an administrator.
 */
export async function updateAdminPermissions(
  organizationId: string,
  input: AdminPermissionsInput,
): Promise<unknown> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  if (!input.userId?.trim()) {
    throw new Error(
      "A valid administrator user ID is required.",
    );
  }

  return churchPatch<unknown>(
    `/organizations/${encodeURIComponent(
      id,
    )}/admin-permissions`,
    {
      userId:
        input.userId.trim(),

      permissions:
        input.permissions,
    },
  );
}

/* ============================================================================
   GRANT PERMISSION
   ========================================================================== */

/**
 * Grant one permission to a target administrator.
 */
export async function grantPermission(
  organizationId: string,
  input: GrantPermissionInput,
): Promise<unknown> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  const userId =
    input.userId?.trim();

  const permission =
    input.permission?.trim();

  if (!userId) {
    throw new Error(
      "A valid administrator user ID is required.",
    );
  }

  if (!permission) {
    throw new Error(
      "A valid Church permission is required.",
    );
  }

  return churchPost<unknown>(
    `/organizations/${encodeURIComponent(
      id,
    )}/admin-permissions/grant`,
    {
      userId,
      permission,
    },
  );
}

/* ============================================================================
   REVOKE PERMISSION
   ========================================================================== */

/**
 * Revoke one permission from a target administrator.
 */
export async function revokePermission(
  organizationId: string,
  input: RevokePermissionInput,
): Promise<unknown> {
  const id =
    validateOrganizationId(
      organizationId,
    );

  const userId =
    input.userId?.trim();

  const permission =
    input.permission?.trim();

  if (!userId) {
    throw new Error(
      "A valid administrator user ID is required.",
    );
  }

  if (!permission) {
    throw new Error(
      "A valid Church permission is required.",
    );
  }

  return churchPost<unknown>(
    `/organizations/${encodeURIComponent(
      id,
    )}/admin-permissions/revoke`,
    {
      userId,
      permission,
    },
  );
}