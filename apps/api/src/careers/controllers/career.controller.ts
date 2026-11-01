
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import type { Request } from "express";

import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { CareerService } from "../services/career.service";
import { CreateJobDto } from "../dto/create-job.dto";
import { UpdateJobDto } from "../dto/update-job.dto";

interface AuthenticatedUser {
  [key: string]: unknown;
  id?: string;
  _id?: string;
  userId?: string;
  sub?: string;
}

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

interface FindJobsQuery {
  search?: string;
  country?: string;
  city?: string;
  type?: string;
  workplaceType?: string;
  remote?: boolean;
}

@Controller("careers")
export class CareerController {
  constructor(
    private readonly careerService: CareerService,
  ) {}

  /**
   * GET /careers
   * Public job search.
   */
  @Get()
  async findAll(
    @Query("search") search?: string,
    @Query("country") country?: string,
    @Query("city") city?: string,
    @Query("type") type?: string,
    @Query("workplaceType") workplaceType?: string,
    @Query("remote") remote?: string,
  ) {
    const filters: FindJobsQuery = {
      search: search?.trim() || undefined,
      country: country?.trim() || undefined,
      city: city?.trim() || undefined,
      type: type?.trim() || undefined,
      workplaceType: workplaceType?.trim() || undefined,
    };

    if (remote !== undefined) {
      const normalizedRemote = remote.trim().toLowerCase();

      if (
        normalizedRemote !== "true" &&
        normalizedRemote !== "false"
      ) {
        throw new BadRequestException(
          'The "remote" parameter must be true or false.',
        );
      }

      filters.remote = normalizedRemote === "true";
    }

    return this.careerService.findAll(filters);
  }

  /**
   * GET /careers/my-jobs
   * Authenticated employer's jobs.
   */
  @UseGuards(JwtAuthGuard)
  @Get("my-jobs")
  async findMine(
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getAuthenticatedUserId(req);

    return this.careerService.findMine(userId);
  }

  /**
   * GET /careers/:id
   * Public job details.
   */
  @Get(":id")
  async findOne(
    @Param("id") id: string,
  ) {
    return this.careerService.findOne(id);
  }

  /**
   * POST /careers
   * Create a job using the authenticated user's identity.
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateJobDto,
  ) {
    const userId = this.getAuthenticatedUserId(req);

    return this.careerService.create(userId, dto);
  }

  /**
   * PATCH /careers/:id
   * Update an employer's own job.
   */
  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateJobDto,
  ) {
    const userId = this.getAuthenticatedUserId(req);

    return this.careerService.update(id, userId, dto);
  }

  /**
   * DELETE /careers/:id
   * Delete an employer's own job.
   */
  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    const userId = this.getAuthenticatedUserId(req);

    return this.careerService.remove(id, userId);
  }

  /**
   * Resolve the authenticated user's ID from the JWT payload.
   */
  private getAuthenticatedUserId(
    req: AuthenticatedRequest,
  ): string {
    const user = req.user;

    const possibleId =
      user?.id ??
      user?._id ??
      user?.userId ??
      user?.sub;

    if (
      typeof possibleId !== "string" ||
      !possibleId.trim()
    ) {
      throw new UnauthorizedException(
        "You must be logged in to perform this action.",
      );
    }

    return possibleId.trim();
  }
}
