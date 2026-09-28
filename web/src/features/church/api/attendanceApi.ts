/**
 * attendanceApi.ts
 * -----------------------------------------------------------------------------
 * Attendance API functions connected directly to the NestJS Church backend.
 * -----------------------------------------------------------------------------
 */

import {
  churchGet,
  churchPost,
} from "./churchApi";

import type {
  AbsenceReport,
  AttendanceRecord,
  AttendanceSummary,
  AttendanceType,
  PageQuery,
  PaginatedResult,
  RecordAttendanceInput,
  SubmitAbsenceReportInput,
} from "../types/church.types";

export interface ListAttendanceQuery
  extends PageQuery {
  eventId?: string;
  memberId?: string;
  attendanceType?: AttendanceType;
  from?: string;
  to?: string;
}

function requireOrganizationId(
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

/**
 * Get attendance records for an organization.
 */
export async function getAttendance(
  organizationId: string,
  query: ListAttendanceQuery = {},
  signal?: AbortSignal,
): Promise<PaginatedResult<AttendanceRecord>> {
  const id =
    requireOrganizationId(organizationId);

  return churchGet<
    PaginatedResult<AttendanceRecord>
  >(
    `/organizations/${encodeURIComponent(id)}/attendance`,
    {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      eventId: query.eventId,
      memberId: query.memberId,
      attendanceType:
        query.attendanceType,
      from: query.from,
      to: query.to,
    },
    signal,
  );
}

/**
 * Get attendance summaries grouped by event.
 */
export async function getAttendanceSummaries(
  organizationId: string,
  query: Pick<
    ListAttendanceQuery,
    "from" | "to" | "page" | "pageSize"
  > = {},
  signal?: AbortSignal,
): Promise<
  PaginatedResult<AttendanceSummary>
> {
  const id =
    requireOrganizationId(organizationId);

  return churchGet<
    PaginatedResult<AttendanceSummary>
  >(
    `/organizations/${encodeURIComponent(id)}/attendance/summaries`,
    {
      page: query.page,
      pageSize: query.pageSize,
      from: query.from,
      to: query.to,
    },
    signal,
  );
}

/**
 * Record attendance.
 */
export async function recordAttendance(
  input: RecordAttendanceInput,
): Promise<AttendanceRecord> {
  const organizationId =
    requireOrganizationId(
      input.organizationId,
    );

  return churchPost<AttendanceRecord>(
    `/organizations/${encodeURIComponent(organizationId)}/attendance`,
    input,
  );
}

/**
 * Submit an absence report.
 */
export async function submitAbsenceReport(
  input: SubmitAbsenceReportInput,
): Promise<AbsenceReport> {
  const organizationId =
    requireOrganizationId(
      input.organizationId,
    );

  return churchPost<AbsenceReport>(
    `/organizations/${encodeURIComponent(organizationId)}/attendance/absence-reports`,
    input,
  );
}

/**
 * Get the current user's attendance history.
 */
export async function getMyAttendanceHistory(
  organizationId: string,
  query: Pick<
    ListAttendanceQuery,
    "page" | "pageSize" | "from" | "to"
  > = {},
  signal?: AbortSignal,
): Promise<
  PaginatedResult<AttendanceRecord>
> {
  const id =
    requireOrganizationId(organizationId);

  return churchGet<
    PaginatedResult<AttendanceRecord>
  >(
    `/organizations/${encodeURIComponent(id)}/attendance/me`,
    {
      page: query.page,
      pageSize: query.pageSize,
      from: query.from,
      to: query.to,
    },
    signal,
  );
}