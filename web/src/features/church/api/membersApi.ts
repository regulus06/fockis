/**
 * membersApi.ts
 * -----------------------------------------------------------------------------
 * FOCKIS CHURCH — MEMBER API
 *
 * Organization-neutral membership API.
 *
 * Membership lifecycle:
 *
 *   pending  -> active       = approve
 *   active   -> inactive     = disable
 *   inactive -> active       = enable
 *   pending  -> archived     = reject
 *   any      -> removed      = permanent membership removal
 *
 * IMPORTANT:
 *
 * MembershipStatus does NOT contain "rejected".
 *
 * Rejected membership requests are represented by:
 *
 *   MembershipStatus.Archived
 *
 * Authorization is enforced by the backend.
 *
 * The frontend only uses returned authorization information to control
 * visibility/usability of controls. The backend remains authoritative.
 * -----------------------------------------------------------------------------
 */

import {
  churchDelete,
  churchGet,
  churchPatch,
  churchPost,
  toPaginated,
  withFallback,
} from "./churchApi";

import {
  MembershipStatus,
  type AddMemberInput,
  type Member,
  type MemberRole,
  type MyMembership,
  type PageQuery,
  type PaginatedResult,
  type UpdateMemberInput,
} from "../types/church.types";

/* ============================================================================
 * QUERY TYPES
 * ========================================================================== */

export interface ListMembersQuery extends PageQuery {
  status?: MembershipStatus;
  role?: MemberRole;
  branchId?: string;
  departmentId?: string;
  groupId?: string;
}

/* ============================================================================
 * MY MEMBERSHIP RESPONSE
 * ========================================================================== */

/**
 * Server-computed membership authority information.
 *
 * The backend calculates these values.
 *
 * The frontend must NOT infer ownership or administrator access from the
 * member role alone.
 */
export interface MyMembershipResponse extends MyMembership {
  isOwner: boolean;
  isSelf: boolean;
  isAdmin: boolean;
  canApproveMembers: boolean;
  permissions: string[];
  departmentIds?: string[];
  groupIds?: string[];
  joinedAt?: string | null;
}

/**
 * Backend response envelope.
 *
 * GET:
 *
 * /organizations/:organizationId/members/me
 *
 * The backend may return:
 *
 * {
 *   membership: {...},
 *   isAdmin: true,
 *   canApproveMembers: true
 * }
 */
interface MyMembershipEnvelope {
  membership: MyMembershipResponse | null;
  isAdmin: boolean;
  canApproveMembers: boolean;
}

/* ============================================================================
 * MEMBER RECORD / UPDATE TYPES
 * ========================================================================== */

export interface MemberRecord {
  id: string;

  organizationId: string;

  memberId: string;

  type: string;

  title: string;

  description?: string | null;

  date?: string | null;

  location?: string | null;

  performedBy?: string | null;

  groupId?: string | null;

  departmentId?: string | null;

  metadata?: Record<string, unknown>;

  createdBy?: string | null;

  createdAt?: string;

  updatedAt?: string;
}

export interface CreateMemberRecordInput {
  organizationId: string;

  memberId: string;

  type: string;

  title: string;

  description?: string;

  date?: string;

  location?: string;

  performedBy?: string;

  groupId?: string;

  departmentId?: string;

  metadata?: Record<string, unknown>;
}

export interface UpdateMemberRecordInput {
  type?: string;

  title?: string;

  description?: string;

  date?: string | null;

  location?: string | null;

  performedBy?: string | null;

  groupId?: string | null;

  departmentId?: string | null;

  metadata?: Record<string, unknown>;
}

export interface ListMemberRecordsQuery extends PageQuery {
  type?: string;

  groupId?: string;

  departmentId?: string;

  fromDate?: string;

  toDate?: string;
}

/* ============================================================================
 * FALLBACK
 * ========================================================================== */

const FALLBACK_MEMBERS: Member[] = [];

const FALLBACK_MEMBER_RECORDS: MemberRecord[] = [];

/* ============================================================================
 * LIST MEMBERS
 * ========================================================================== */

export async function listMembers(
  organizationId: string,
  query: ListMembersQuery = {},
  signal?: AbortSignal,
): Promise<PaginatedResult<Member>> {
  return withFallback(
    () =>
      churchGet<PaginatedResult<Member>>(
        `/organizations/${encodeURIComponent(
          organizationId,
        )}/members`,
        {
          page: query.page,
          pageSize: query.pageSize,
          search: query.search,
          status: query.status,
          role: query.role,
          branchId: query.branchId,
          departmentId: query.departmentId,
          groupId: query.groupId,
        },
        signal,
      ),

    () =>
      toPaginated(
        FALLBACK_MEMBERS,
        query.page,
        query.pageSize,
      ),
  );
}

/* ============================================================================
 * GET MEMBER
 * ========================================================================== */

export async function getMember(
  organizationId: string,
  memberId: string,
  signal?: AbortSignal,
): Promise<Member> {
  return churchGet<Member>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/members/${encodeURIComponent(
      memberId,
    )}`,
    undefined,
    signal,
  );
}

/* ============================================================================
 * GET MY MEMBERSHIP
 * ========================================================================== */

/**
 * Get the authenticated user's membership.
 *
 * The backend may return either:
 *
 * Wrapped:
 *
 * {
 *   membership: {...},
 *   isAdmin: boolean,
 *   canApproveMembers: boolean
 * }
 *
 * or flattened:
 *
 * {
 *   id: "...",
 *   isOwner: true,
 *   isAdmin: true,
 *   ...
 * }
 *
 * This function normalizes both formats so the rest of the frontend always
 * receives the actual membership object.
 *
 * IMPORTANT:
 *
 * Owner status, administrator status, permissions, and approval authority
 * are calculated by the backend.
 */
export async function getMyMembership(
  organizationId: string,
  signal?: AbortSignal,
): Promise<MyMembershipResponse | null> {
  const response = await churchGet<
    MyMembershipEnvelope | MyMembershipResponse | null
  >(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/members/me`,
    undefined,
    signal,
  );

  if (!response) {
    return null;
  }

  /*
   * --------------------------------------------------------------------------
   * WRAPPED BACKEND RESPONSE
   * --------------------------------------------------------------------------
   */

  if (
    typeof response === "object" &&
    "membership" in response
  ) {
    const envelope =
      response as MyMembershipEnvelope;

    if (!envelope.membership) {
      return null;
    }

    const membership =
      envelope.membership;

    return {
      ...membership,

      /*
       * These values come from the backend.
       */
      isOwner:
        Boolean(
          membership.isOwner,
        ),

      isSelf:
        Boolean(
          membership.isSelf,
        ),

      isAdmin:
        Boolean(
          envelope.isAdmin,
        ),

      canApproveMembers:
        Boolean(
          envelope.canApproveMembers,
        ),

      permissions:
        Array.isArray(
          membership.permissions,
        )
          ? membership.permissions
          : [],
    };
  }

  /*
   * --------------------------------------------------------------------------
   * FLATTENED BACKEND RESPONSE
   * --------------------------------------------------------------------------
   */

  const membership =
    response as MyMembershipResponse;

  return {
    ...membership,

    isOwner:
      Boolean(
        membership.isOwner,
      ),

    isSelf:
      Boolean(
        membership.isSelf,
      ),

    isAdmin:
      Boolean(
        membership.isAdmin,
      ),

    canApproveMembers:
      Boolean(
        membership.canApproveMembers,
      ),

    permissions:
      Array.isArray(
        membership.permissions,
      )
        ? membership.permissions
        : [],
  };
}

/* ============================================================================
 * ADD MEMBER
 * ========================================================================== */

/**
 * Add an existing Fockis user to the organization.
 *
 * organizationId belongs to the URL and MUST NOT be sent as a DTO property.
 */
export async function addMember(
  input: AddMemberInput,
): Promise<Member> {
  const {
    organizationId,
    ...body
  } = input;

  return churchPost<Member>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/members`,
    body,
  );
}

/* ============================================================================
 * UPDATE MEMBER
 * ========================================================================== */

export async function updateMember(
  organizationId: string,
  memberId: string,
  input: UpdateMemberInput,
): Promise<Member> {
  return churchPatch<Member>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/members/${encodeURIComponent(
      memberId,
    )}`,
    input,
  );
}

/* ============================================================================
 * UPDATE MEMBERSHIP STATUS
 * ========================================================================== */

/**
 * Generic membership status update.
 *
 * Supported statuses:
 *
 *   pending
 *   active
 *   inactive
 *   archived
 *
 * Approval and rejection use their dedicated endpoints.
 */
export async function updateMembershipStatus(
  organizationId: string,
  memberId: string,
  status: MembershipStatus,
): Promise<Member> {
  return churchPatch<Member>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/members/${encodeURIComponent(
      memberId,
    )}/status`,
    {
      status,
    },
  );
}

/* ============================================================================
 * ENABLE MEMBER
 * ========================================================================== */

export async function enableMember(
  organizationId: string,
  memberId: string,
): Promise<Member> {
  return updateMembershipStatus(
    organizationId,
    memberId,
    MembershipStatus.Active,
  );
}

/* ============================================================================
 * DISABLE MEMBER
 * ========================================================================== */

export async function disableMember(
  organizationId: string,
  memberId: string,
): Promise<Member> {
  return updateMembershipStatus(
    organizationId,
    memberId,
    MembershipStatus.Inactive,
  );
}

/* ============================================================================
 * APPROVE MEMBERSHIP REQUEST
 * ========================================================================== */

/**
 * Approve:
 *
 *   pending -> active
 *
 * Uses the dedicated backend authorization endpoint.
 */
export async function approveMembershipRequest(
  organizationId: string,
  memberId: string,
): Promise<Member> {
  return churchPost<Member>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/members/${encodeURIComponent(
      memberId,
    )}/accept`,
    {},
  );
}

/* ============================================================================
 * REJECT MEMBERSHIP REQUEST
 * ========================================================================== */

/**
 * Reject:
 *
 *   pending -> archived
 *
 * There is no MembershipStatus.Rejected.
 */
export async function rejectMembershipRequest(
  organizationId: string,
  memberId: string,
): Promise<Member> {
  return churchPost<Member>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/members/${encodeURIComponent(
      memberId,
    )}/reject`,
    {},
  );
}

/* ============================================================================
 * UPDATE MEMBER ROLE
 * ========================================================================== */

/**
 * Change a member's organization role.
 *
 * Backend remains authoritative for:
 *
 *   - administrator management
 *   - member update permissions
 *   - owner protection
 *   - final administrator protection
 *   - self-promotion protection
 */
export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  role: MemberRole,
): Promise<Member> {
  return churchPatch<Member>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/members/${encodeURIComponent(
      memberId,
    )}/role`,
    {
      role,
    },
  );
}

/* ============================================================================
 * REMOVE MEMBER
 * ========================================================================== */

/**
 * Permanently remove a membership.
 *
 * The backend remains authoritative and must prevent removal of protected
 * organization owners.
 */
export async function removeMember(
  organizationId: string,
  memberId: string,
): Promise<void> {
  await churchDelete<void>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/members/${encodeURIComponent(
      memberId,
    )}`,
  );
}

/* ============================================================================
 * MEMBER RECORDS
 * ========================================================================== */

/**
 * List records belonging to a member.
 */
export async function listMemberRecords(
  organizationId: string,
  memberId: string,
  query: ListMemberRecordsQuery = {},
  signal?: AbortSignal,
): Promise<PaginatedResult<MemberRecord>> {
  return withFallback(
    () =>
      churchGet<PaginatedResult<MemberRecord>>(
        `/organizations/${encodeURIComponent(
          organizationId,
        )}/members/${encodeURIComponent(
          memberId,
        )}/records`,
        {
          page: query.page,
          pageSize: query.pageSize,
          search: query.search,
          type: query.type,
          groupId: query.groupId,
          departmentId: query.departmentId,
          fromDate: query.fromDate,
          toDate: query.toDate,
        },
        signal,
      ),

    () =>
      toPaginated(
        FALLBACK_MEMBER_RECORDS,
        query.page,
        query.pageSize,
      ),
  );
}

/**
 * Get a single member record.
 */
export async function getMemberRecord(
  organizationId: string,
  memberId: string,
  recordId: string,
  signal?: AbortSignal,
): Promise<MemberRecord> {
  return churchGet<MemberRecord>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/members/${encodeURIComponent(
      memberId,
    )}/records/${encodeURIComponent(
      recordId,
    )}`,
    undefined,
    signal,
  );
}

/**
 * Create a member record.
 *
 * organizationId and memberId are route parameters and therefore are removed
 * from the request body.
 */
export async function addMemberRecord(
  input: CreateMemberRecordInput,
): Promise<MemberRecord> {
  const {
    organizationId,
    memberId,
    ...body
  } = input;

  return churchPost<MemberRecord>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/members/${encodeURIComponent(
      memberId,
    )}/records`,
    body,
  );
}

/**
 * Update a member record.
 */
export async function updateMemberRecord(
  organizationId: string,
  memberId: string,
  recordId: string,
  input: UpdateMemberRecordInput,
): Promise<MemberRecord> {
  return churchPatch<MemberRecord>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/members/${encodeURIComponent(
      memberId,
    )}/records/${encodeURIComponent(
      recordId,
    )}`,
    input,
  );
}

/**
 * Delete a member record.
 */
export async function deleteMemberRecord(
  organizationId: string,
  memberId: string,
  recordId: string,
): Promise<void> {
  await churchDelete<void>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/members/${encodeURIComponent(
      memberId,
    )}/records/${encodeURIComponent(
      recordId,
    )}`,
  );
}

/* ============================================================================
 * CONVENIENCE HELPERS
 * ========================================================================== */

/**
 * Record a baptism milestone.
 */
export async function recordBaptism(
  organizationId: string,
  memberId: string,
  input: {
    date: string;
    location?: string;
    performedBy?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<MemberRecord> {
  return addMemberRecord({
    organizationId,
    memberId,
    type: "baptism",
    title: "Baptized",
    date: input.date,
    location: input.location,
    performedBy: input.performedBy,
    description: input.description,
    metadata: {
      ...(input.metadata ?? {}),

      baptismDate:
        input.date,

      baptismLocation:
        input.location ?? null,

      baptizedBy:
        input.performedBy ?? null,
    },
  });
}

/**
 * Record a general member milestone.
 */
export async function recordMemberMilestone(
  organizationId: string,
  memberId: string,
  input: {
    type: string;
    title: string;
    date?: string;
    description?: string;
    location?: string;
    performedBy?: string;
    groupId?: string;
    departmentId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<MemberRecord> {
  return addMemberRecord({
    organizationId,
    memberId,
    type: input.type,
    title: input.title,
    date: input.date,
    description: input.description,
    location: input.location,
    performedBy: input.performedBy,
    groupId: input.groupId,
    departmentId: input.departmentId,
    metadata: input.metadata,
  });
}

/* ============================================================================
 * MEMBERS API OBJECT
 * ========================================================================== */

export const membersApi = {
  /* Members */
  listMembers,
  getMember,
  getMyMembership,
  addMember,
  updateMember,

  /* Membership lifecycle */
  updateMembershipStatus,
  enableMember,
  disableMember,
  approveMembershipRequest,
  rejectMembershipRequest,

  /* Role */
  updateMemberRole,

  /* Removal */
  removeMember,

  /* Member records */
  listMemberRecords,
  getMemberRecord,
  addMemberRecord,
  updateMemberRecord,
  deleteMemberRecord,

  /* Convenience helpers */
  recordBaptism,
  recordMemberMilestone,
};

export default membersApi;