
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import type { Request } from "express";

import { ApplicationsService } from "../services/applications.service";
import { EmployerService } from "../services/employer.service";
import { CreateApplicationDto } from "../dto/create-application.dto";
import { UpdateApplicationStatusDto } from "../dto/update-application-status.dto";

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    sub?: string;
    email?: string;
    username?: string;
  };
}

@Controller("careers/applications")
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly employerService: EmployerService,
  ) {}

  /**
   * GET /careers/applications
   *
   * Retrieve applications submitted by the current user.
   */
  @Get()
  async findMine(
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getUserId(req);

    return this.applicationsService.findAllForUser(userId);
  }

  /**
   * GET /careers/applications/:id
   *
   * Retrieve one application.
   * The service must verify access permissions.
   */
  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getUserId(req);

    return this.applicationsService.findOne(
      id,
      userId,
    );
  }

  /**
   * POST /careers/applications
   *
   * Submit a job application.
   *
   * The applicant ID is obtained from authentication,
   * not from the request body.
   */
  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateApplicationDto,
  ) {
    const userId = this.getUserId(req);

    return this.applicationsService.create(
      userId,
      dto,
    );
  }

  /**
   * PATCH /careers/applications/:id/status
   *
   * Employer-only application status update.
   *
   * The employer account is resolved from the JWT (owner or an
   * accepted team member) and ApplicationsService verifies that
   * this employer owns the job behind the application.
   */
  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateApplicationStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getUserId(req);

    const context = await this.employerService.resolveContext({
      userId,
      email: req.user?.email,
      username: req.user?.username,
    });

    this.employerService.assertCan(context, "manageApplicants");

    return this.applicationsService.updateStatus(
      id,
      context.ownerId,
      dto,
      userId,
    );
  }

  /**
   * Extract the authenticated user ID.
   *
   * Supports JWT payloads that use either id or sub.
   */
  private getUserId(
    req: AuthenticatedRequest,
  ): string {
    const userId = req.user?.id ?? req.user?.sub;

    if (
      typeof userId !== "string" ||
      !userId.trim()
    ) {
      throw new UnauthorizedException(
        "Authentication is required to access applications.",
      );
    }

    return userId;
  }
}
