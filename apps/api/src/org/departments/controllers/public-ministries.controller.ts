/**
 * public-ministries.controller.ts
 * -----------------------------------------------------------------------------
 * GET /organizations/:organizationId/public-ministries
 * GET /organizations/:organizationId/public-ministries/:ministryId
 * GET /organizations/:organizationId/public-ministries/:ministryId/overview
 *
 * Used by the organization's public website (church template "Our Ministries"
 * and each ministry's page). No sign-in required. Returns only presentation
 * fields and public, published content — see DepartmentsService.listPublic,
 * getPublic and getPublicOverview. The members-only departments API
 * (/organizations/:organizationId/departments) is unchanged.
 * -----------------------------------------------------------------------------
 */

import { Controller, Get, Param, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { Public } from "../../../auth/public.decorator";
import { OptionalJwtAuthGuard } from "../../../auth/optional-jwt-auth.guard";
import { DepartmentsService } from "../services/departments.service";
import { MinistryAttendanceService } from "../../ministry-attendance/ministry-attendance.service";

// @Public(): skip the global JwtAuthGuard / RbacGuard — this data is meant for
// signed-out visitors and returns presentation fields only.
// OptionalJwtAuthGuard: signed-in members can also open members-only ministries.
function viewerOf(req: Request): string | null {
  const u = req.user as { id?: string; _id?: string; userId?: string } | undefined;
  const id = u?.id ?? u?.userId ?? u?._id;
  return id ? String(id) : null;
}

@Public()
@UseGuards(OptionalJwtAuthGuard)
@Controller("organizations/:organizationId/public-ministries")
export class PublicMinistriesController {
  constructor(
    private readonly departmentsService: DepartmentsService,
    private readonly attendance: MinistryAttendanceService,
  ) {}

  @Get()
  list(
    @Param("organizationId") organizationId: string,
    @Query("limit") limit?: string,
  ) {
    return this.departmentsService.listPublic(organizationId, limit ? Number(limit) : 12);
  }

  /** Everything the ministry page shows (public, published data only). */
  @Get(":ministryId/overview")
  async overview(
    @Param("organizationId") organizationId: string,
    @Param("ministryId") ministryId: string,
    @Req() req: Request,
  ) {
    const overview = await this.departmentsService.getPublicOverview(organizationId, ministryId, viewerOf(req));
    // Prefer finalized ministry attendance sessions for "Avg. Attendance".
    const rate = await this.attendance.averageRate(organizationId, ministryId).catch(() => null);
    if (rate !== null) overview.stats.averageAttendance = rate;
    return overview;
  }

  @Get(":ministryId")
  getOne(
    @Param("organizationId") organizationId: string,
    @Param("ministryId") ministryId: string,
    @Req() req: Request,
  ) {
    return this.departmentsService.getPublic(organizationId, ministryId, viewerOf(req));
  }
}
