import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";

import { CreateReportDto } from "../dto/create-report.dto";
import { SubmitAppealDto } from "../dto/moderation.dto";
import { ReportsService } from "../services/reports.service";
import { actorId } from "../utils/actor";
import type { Actor } from "../utils/actor";

/**
 * Avoid conflicting with Express's existing Request.user type.
 * The authenticated user is optional on the request type, and
 * userId() validates that a usable ID exists before processing.
 */
type AuthenticatedRequest = Omit<Request, "user"> & {
  user?: Actor;
};

/**
 * User-facing reporting endpoints. The reporter is ALWAYS the
 * authenticated user from the JWT; the DTO has no reporter field and the
 * global ValidationPipe rejects unknown properties.
 */
@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  private userId(req: AuthenticatedRequest): string {
    const id = actorId(req.user);

    if (!id) {
      throw new BadRequestException(
        "Authenticated user ID was not found.",
      );
    }

    return id;
  }

  @Post("reports")
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  submit(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateReportDto,
  ) {
    return this.reports.submit(this.userId(req), dto);
  }

  @Get("reports/mine")
  mine(
    @Req() req: AuthenticatedRequest,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.reports.myReports(
      this.userId(req),
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Get("moderation/my-decisions")
  myDecisions(@Req() req: AuthenticatedRequest) {
    return this.reports.myDecisions(this.userId(req));
  }

  @Post("moderation/decisions/:caseId/appeal")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  appeal(
    @Req() req: AuthenticatedRequest,
    @Param("caseId") caseId: string,
    @Body() dto: SubmitAppealDto,
  ) {
    return this.reports.submitAppeal(
      this.userId(req),
      caseId,
      dto,
    );
  }
}