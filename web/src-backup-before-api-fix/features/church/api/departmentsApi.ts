/**
 * departmentsApi.ts
 * -----------------------------------------------------------------------------
 * Department API functions connected directly to the NestJS backend.
 * -----------------------------------------------------------------------------
 */

import {
  churchDelete,
  churchGet,
  churchPatch,
  churchPost,
} from "./churchApi";

import type {
  CreateDepartmentInput,
  Department,
  DepartmentType,
  PageQuery,
  PaginatedResult,
  UpdateDepartmentInput,
} from "../types/church.types";

export interface ListDepartmentsQuery
  extends PageQuery {
  departmentType?: DepartmentType;
  branchId?: string;

  /**
   * Normal callers should leave this undefined/false.
   *
   * Administrators can request archived departments.
   */
  includeArchived?: boolean;
}

/* ============================================================================
   LIST
   ========================================================================== */

export async function listDepartments(
  organizationId: string,
  query: ListDepartmentsQuery = {},
  signal?: AbortSignal,
): Promise<
  PaginatedResult<Department>
> {
  return churchGet<
    PaginatedResult<Department>
  >(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/departments`,
    {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      departmentType:
        query.departmentType,
      branchId: query.branchId,
      includeArchived:
        query.includeArchived,
    },
    signal,
  );
}

/* ============================================================================
   GET ONE
   ========================================================================== */

export async function getDepartment(
  organizationId: string,
  departmentId: string,
  signal?: AbortSignal,
): Promise<Department> {
  return churchGet<Department>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/departments/${encodeURIComponent(
      departmentId,
    )}`,
    undefined,
    signal,
  );
}

/* ============================================================================
   CREATE
   ========================================================================== */

export async function createDepartment(
  input: CreateDepartmentInput,
): Promise<Department> {
  const {
    organizationId,
    name,
    departmentType,
    description,
    branchId,
    photoUrl,
    leaderIds,
  } = input;

  /**
   * organizationId belongs in the URL.
   * It is intentionally NOT sent in the body.
   *
   * createdByUserId is also intentionally NOT sent.
   * The backend determines the creator from JWT.
   */
  return churchPost<Department>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/departments`,
    {
      name,
      departmentType,

      ...(description !==
      undefined
        ? {
            description,
          }
        : {}),

      ...(branchId !==
        undefined &&
      branchId !== ""
        ? {
            branchId,
          }
        : {}),

      ...(photoUrl !==
        undefined &&
      photoUrl !== ""
        ? {
            photoUrl,
          }
        : {}),

      ...(leaderIds !==
      undefined
        ? {
            leaderIds,
          }
        : {}),
    },
  );
}

/* ============================================================================
   UPDATE
   ========================================================================== */

export async function updateDepartment(
  organizationId: string,
  departmentId: string,
  input: UpdateDepartmentInput,
): Promise<Department> {
  const {
    name,
    departmentType,
    description,
    branchId,
    photoUrl,
    leaderIds,
  } = input;

  /**
   * organizationId and departmentId are URL parameters.
   */
  return churchPatch<Department>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/departments/${encodeURIComponent(
      departmentId,
    )}`,
    {
      ...(name !== undefined
        ? {
            name,
          }
        : {}),

      ...(departmentType !==
      undefined
        ? {
            departmentType,
          }
        : {}),

      ...(description !==
      undefined
        ? {
            description,
          }
        : {}),

      ...(branchId !== undefined
        ? {
            branchId,
          }
        : {}),

      ...(photoUrl !== undefined
        ? {
            photoUrl,
          }
        : {}),

      ...(leaderIds !== undefined
        ? {
            leaderIds,
          }
        : {}),
    },
  );
}

/* ============================================================================
   ARCHIVE
   ========================================================================== */

/**
 * Archive department.
 *
 * Backend performs a SOFT DELETE.
 *
 * The department document, creator, leaders and members remain intact.
 */
export async function deleteDepartment(
  organizationId: string,
  departmentId: string,
): Promise<void> {
  await churchDelete<void>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/departments/${encodeURIComponent(
      departmentId,
    )}`,
  );
}

/**
 * Explicit alias that makes the frontend intent clearer.
 */
export async function archiveDepartment(
  organizationId: string,
  departmentId: string,
): Promise<void> {
  return deleteDepartment(
    organizationId,
    departmentId,
  );
}

/* ============================================================================
   RESTORE
   ========================================================================== */

export async function restoreDepartment(
  organizationId: string,
  departmentId: string,
): Promise<Department> {
  return churchPost<Department>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/departments/${encodeURIComponent(
      departmentId,
    )}/restore`,
  );
}

/* ============================================================================
   JOIN
   ========================================================================== */

export async function joinDepartment(
  organizationId: string,
  departmentId: string,
): Promise<void> {
  await churchPost<void>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/departments/${encodeURIComponent(
      departmentId,
    )}/join`,
  );
}

/* ============================================================================
   LEAVE
   ========================================================================== */

export async function leaveDepartment(
  organizationId: string,
  departmentId: string,
): Promise<void> {
  await churchPost<void>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/departments/${encodeURIComponent(
      departmentId,
    )}/leave`,
  );
}

/* ============================================================================
   ADD MEMBER
   ========================================================================== */

export async function addDepartmentMember(
  organizationId: string,
  departmentId: string,
  memberId: string,
): Promise<void> {
  await churchPost<void>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/departments/${encodeURIComponent(
      departmentId,
    )}/members`,
    {
      memberId,
    },
  );
}

/* ============================================================================
   REMOVE MEMBER
   ========================================================================== */

export async function removeDepartmentMember(
  organizationId: string,
  departmentId: string,
  memberId: string,
): Promise<void> {
  await churchDelete<void>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/departments/${encodeURIComponent(
      departmentId,
    )}/members/${encodeURIComponent(
      memberId,
    )}`,
  );
}