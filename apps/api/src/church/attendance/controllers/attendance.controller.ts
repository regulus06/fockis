/**
 * attendance.controller.ts
 * -----------------------------------------------------------------------------
 * REST surface for Attendance, mounted under:
 *
 * /organizations/:organizationId/attendance
 *
 * Matches the Fockis Church frontend attendance API contract.
 * -----------------------------------------------------------------------------
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";

import type { Request } from "express";

import {
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";

import {
  AttendanceService,
  type ListAttendanceQuery,
  type ListSummariesQuery,
} from "../services/attendance.service";

import { RecordAttendanceDto } from "../dto/record-attendance.dto";

import {
  AbsenceReasonCategory,
} from "../schemas/attendance.schema";

import { AttendanceType } from "../../enums/attendance-type.enum";

import type {
  AuthUser,
} from "../../members/services/members.service";

/* ============================================================================
   INLINE DTO
   ============================================================================ */

class SubmitAbsenceReportDto {
  @IsString()
  eventId!: string;

  @IsEnum(AbsenceReasonCategory)
  reasonCategory!: AbsenceReasonCategory;

  @IsOptional()
  @IsString()
  note?: string;
}

/* ============================================================================
   AUTHENTICATION HELPER
   ============================================================================ */

/**
 * AuthUser exposes the authenticated user's ID through `id`.
 *
 * Do not check `_id`, `userId`, or `sub` here because those properties are
 * not part of the application's AuthUser type.
 */
function getAuthenticatedUserId(req: Request): string {
  const user = req.user as AuthUser | undefined;
  const userId = user?.id;

  if (!userId) {
    throw new Error("Authenticated user ID is required.");
  }

  return userId;
}

/* ============================================================================
   CONTROLLER
   ============================================================================ */

@Controller("organizations/:organizationId/attendance")
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
  ) {}

  /* ==========================================================================
     LIST ATTENDANCE
     ========================================================================== */

  @Get()
  list(
    @Param("organizationId")
    organizationId: string,

    @Query()
    query: ListAttendanceQuery & {
      attendanceType?: AttendanceType;
    },
  ) {
    return this.attendanceService.listAttendance(
      organizationId,
      {
        page: query.page
          ? Number(query.page)
          : undefined,

        pageSize: query.pageSize
          ? Number(query.pageSize)
          : undefined,

        eventId: query.eventId,

        memberId: query.memberId,

        attendanceType: query.attendanceType,

        from: query.from,

        to: query.to,
      },
    );
  }

  /* ==========================================================================
     ATTENDANCE SUMMARIES
     ========================================================================== */

  @Get("summaries")
  getSummaries(
    @Param("organizationId")
    organizationId: string,

    @Query()
    query: ListSummariesQuery,
  ) {
    return this.attendanceService.getSummaries(
      organizationId,
      {
        page: query.page
          ? Number(query.page)
          : undefined,

        pageSize: query.pageSize
          ? Number(query.pageSize)
          : undefined,

        from: query.from,

        to: query.to,
      },
    );
  }

  /* ==========================================================================
     MY ATTENDANCE HISTORY
     ========================================================================== */

  @Get("me")
  getMyHistory(
    @Param("organizationId")
    organizationId: string,

    @Query()
    query: ListAttendanceQuery,

    @Req()
    req: Request,
  ) {
    const userId = getAuthenticatedUserId(req);

    return this.attendanceService.getMyAttendanceHistory(
      organizationId,
      userId,
      {
        page: query.page
          ? Number(query.page)
          : undefined,

        pageSize: query.pageSize
          ? Number(query.pageSize)
          : undefined,

        from: query.from,

        to: query.to,
      },
    );
  }

  /* ==========================================================================
     RECORD ATTENDANCE
     ========================================================================== */

  @Post()
  record(
    @Param("organizationId")
    organizationId: string,

    @Body()
    dto: RecordAttendanceDto,

    @Req()
    req: Request,
  ) {
    const userId = getAuthenticatedUserId(req);

    return this.attendanceService.recordAttendance(
      organizationId,
      dto,
      userId,
    );
  }

  /* ==========================================================================
     ABSENCE REPORT
     ========================================================================== */

  @Post("absence-reports")
  submitAbsenceReport(
    @Param("organizationId")
    organizationId: string,

    @Body()
    dto: SubmitAbsenceReportDto,

    @Req()
    req: Request,
  ) {
    const userId = getAuthenticatedUserId(req);

    return this.attendanceService.submitAbsenceReport(
      organizationId,
      dto.eventId,
      dto.reasonCategory,
      dto.note,
      userId,
    );
  }
}