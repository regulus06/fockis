/**
 * groupsApi.ts
 * -----------------------------------------------------------------------------
 * FOCKIS CHURCH — GROUP API
 *
 * Matches:
 *   apps/api/src/church/.../church-groups.controller.ts
 *
 * Backend routes:
 *
 *   GET    /organizations/:organizationId/groups
 *   GET    /organizations/:organizationId/groups/:groupId
 *   POST   /organizations/:organizationId/groups
 *   PATCH  /organizations/:organizationId/groups/:groupId
 *   DELETE /organizations/:organizationId/groups/:groupId
 *   POST   /organizations/:organizationId/groups/:groupId/join
 *   POST   /organizations/:organizationId/groups/:groupId/leave
 *
 * IMPORTANT:
 * - organizationId belongs in the URL.
 * - organizationId must NOT be sent in the request body.
 * - organizationId must NOT be sent in the query string.
 * -----------------------------------------------------------------------------
 */

import {
  churchDelete,
  churchGet,
  churchPatch,
  churchPost,
} from "./churchApi";

import type {
  ChurchGroup,
  CreateGroupInput,
  PageQuery,
  PaginatedResult,
  UpdateGroupInput,
  Member,
} from "../types/church.types";

import {
  GroupType,
} from "../types/church.types";

/* ============================================================================
 * GROUP QUERIES
 * ========================================================================== */

/**
 * Query parameters accepted by the Church Groups endpoint.
 *
 * Supported:
 *   page
 *   pageSize
 *   search
 *   departmentId
 *   groupType
 *
 * organizationId is intentionally NOT included here because it belongs
 * exclusively in the URL.
 */
export interface ListGroupsQuery
  extends PageQuery {
  /**
   * Optional department filter.
   */
  departmentId?: string;

  /**
   * Optional group type filter.
   *
   * Examples:
   *   bible_study
   *   small_group
   *   prayer_group
   *   custom
   *
   * The actual values come from GroupType.
   */
  groupType?: GroupType;
}

/* ============================================================================
 * GROUP MEMBER TYPES
 * ========================================================================== */

/**
 * Query for listing members belonging to a group.
 */
export interface ListGroupMembersQuery
  extends PageQuery {}

/**
 * Add an existing church member to a group.
 *
 * At least one of userId or email must be supplied.
 */
export interface AddGroupMemberInput {
  userId?: string;
  email?: string;
}

/* ============================================================================
 * INTERNAL URL HELPERS
 * ========================================================================== */

/**
 * Build the organization groups URL.
 *
 * organizationId is encoded and placed ONLY in the URL.
 */
function groupsPath(
  organizationId: string,
): string {
  const id = String(
    organizationId ?? "",
  ).trim();

  if (!id) {
    throw new Error(
      "A church organizationId is required.",
    );
  }

  return `/organizations/${encodeURIComponent(
    id,
  )}/groups`;
}

/**
 * Build the URL for a specific group.
 */
function groupPath(
  organizationId: string,
  groupId: string,
): string {
  const group = String(
    groupId ?? "",
  ).trim();

  if (!group) {
    throw new Error(
      "A church groupId is required.",
    );
  }

  return `${groupsPath(
    organizationId,
  )}/${encodeURIComponent(group)}`;
}

/* ============================================================================
 * GROUPS
 * ========================================================================== */

/**
 * List groups for an organization.
 *
 * Backend:
 *
 * GET /organizations/:organizationId/groups
 *
 * Supported query parameters:
 *
 *   page
 *   pageSize
 *   search
 *   departmentId
 *   groupType
 *
 * organizationId is NOT included in the query.
 */
export async function listGroups(
  organizationId: string,
  query: ListGroupsQuery = {},
  signal?: AbortSignal,
): Promise<
  PaginatedResult<ChurchGroup>
> {
  return churchGet<
    PaginatedResult<ChurchGroup>
  >(
    groupsPath(organizationId),
    {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      departmentId:
        query.departmentId,
      groupType:
        query.groupType,
    },
    signal,
  );
}

/**
 * Get a single group.
 *
 * Backend:
 *
 * GET /organizations/:organizationId/groups/:groupId
 */
export async function getGroup(
  organizationId: string,
  groupId: string,
  signal?: AbortSignal,
): Promise<ChurchGroup> {
  return churchGet<ChurchGroup>(
    groupPath(
      organizationId,
      groupId,
    ),
    undefined,
    signal,
  );
}

/**
 * Create a group.
 *
 * Backend:
 *
 * POST /organizations/:organizationId/groups
 *
 * IMPORTANT:
 *
 * organizationId is extracted from the URL.
 *
 * It is NOT sent inside the request body.
 *
 * Therefore the CreateGroupInput's organizationId
 * field is removed before sending the DTO.
 */
export async function createGroup(
  input: CreateGroupInput,
): Promise<ChurchGroup> {
  const {
    organizationId,
    ...groupInput
  } = input;

  if (
    !String(
      organizationId ?? "",
    ).trim()
  ) {
    throw new Error(
      "A church organizationId is required to create a group.",
    );
  }

  return churchPost<ChurchGroup>(
    groupsPath(organizationId),
    groupInput,
  );
}

/**
 * Update a group.
 *
 * Backend:
 *
 * PATCH /organizations/:organizationId/groups/:groupId
 *
 * organizationId and groupId are URL parameters.
 * Neither is added to the body by this API function.
 */
export async function updateGroup(
  organizationId: string,
  groupId: string,
  input: UpdateGroupInput,
): Promise<ChurchGroup> {
  return churchPatch<ChurchGroup>(
    groupPath(
      organizationId,
      groupId,
    ),
    input,
  );
}

/**
 * Delete/archive a group.
 *
 * Backend:
 *
 * DELETE /organizations/:organizationId/groups/:groupId
 */
export async function deleteGroup(
  organizationId: string,
  groupId: string,
): Promise<void> {
  await churchDelete<void>(
    groupPath(
      organizationId,
      groupId,
    ),
  );
}

/* ============================================================================
 * SELF MEMBERSHIP
 * ========================================================================== */

/**
 * Join a group as the authenticated user.
 *
 * Backend:
 *
 * POST /organizations/:organizationId/groups/:groupId/join
 */
export async function joinGroup(
  organizationId: string,
  groupId: string,
): Promise<void> {
  await churchPost<void>(
    `${groupPath(
      organizationId,
      groupId,
    )}/join`,
  );
}

/**
 * Leave a group as the authenticated user.
 *
 * Backend:
 *
 * POST /organizations/:organizationId/groups/:groupId/leave
 */
export async function leaveGroup(
  organizationId: string,
  groupId: string,
): Promise<void> {
  await churchPost<void>(
    `${groupPath(
      organizationId,
      groupId,
    )}/leave`,
  );
}

/* ============================================================================
 * GROUP MEMBER MANAGEMENT
 * ========================================================================== */

/**
 * List members of a group.
 *
 * Backend:
 *
 * GET /organizations/:organizationId/groups/:groupId/members
 */
export async function listGroupMembers(
  organizationId: string,
  groupId: string,
  query: ListGroupMembersQuery = {},
  signal?: AbortSignal,
): Promise<
  PaginatedResult<Member>
> {
  return churchGet<
    PaginatedResult<Member>
  >(
    `${groupPath(
      organizationId,
      groupId,
    )}/members`,
    {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
    },
    signal,
  );
}

/**
 * Add an existing organization member to a group.
 *
 * Backend expected route:
 *
 * POST /organizations/:organizationId/groups/:groupId/members
 */
export async function addGroupMember(
  organizationId: string,
  groupId: string,
  input: AddGroupMemberInput,
): Promise<Member> {
  const userId =
    input.userId?.trim();

  const email =
    input.email?.trim();

  if (!userId && !email) {
    throw new Error(
      "A userId or email is required to add a group member.",
    );
  }

  return churchPost<Member>(
    `${groupPath(
      organizationId,
      groupId,
    )}/members`,
    {
      ...(userId
        ? { userId }
        : {}),
      ...(email
        ? { email }
        : {}),
    },
  );
}

/**
 * Remove a member from a group.
 *
 * memberId should be the church membership ID returned
 * by the group-members endpoint.
 *
 * Backend:
 *
 * DELETE
 * /organizations/:organizationId/groups/:groupId/members/:memberId
 */
export async function removeGroupMember(
  organizationId: string,
  groupId: string,
  memberId: string,
): Promise<void> {
  await churchDelete<void>(
    `${groupPath(
      organizationId,
      groupId,
    )}/members/${encodeURIComponent(
      memberId,
    )}`,
  );
}

/* ============================================================================
 * DEFAULT API OBJECT
 * ========================================================================== */

export const groupsApi = {
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,

  joinGroup,
  leaveGroup,

  listGroupMembers,
  addGroupMember,
  removeGroupMember,
};

export default groupsApi;