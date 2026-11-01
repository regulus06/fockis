
import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import type { Request } from "express";

import { SavedJobsService } from "../services/saved-jobs.service";

import { JwtAuthGuard } from "../../auth/jwt-auth.guard";

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    sub?: string;
  };
}

/**
 * SAVED JOBS CONTROLLER
 *
 * GET    /careers/saved-jobs
 * POST   /careers/saved-jobs/:jobId
 * DELETE /careers/saved-jobs/:jobId
 * GET    /careers/saved-jobs/:jobId/status
 */
@Controller("careers/saved-jobs")
@UseGuards(JwtAuthGuard)
export class SavedJobsController {
  constructor(
    private readonly savedJobsService: SavedJobsService,
  ) {}

  /**
   * GET /careers/saved-jobs
   *
   * Retrieve the authenticated user's saved jobs.
   */
  @Get()
  async findMine(
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getUserId(req);

    return this.savedJobsService.findMine(userId);
  }

  /**
   * GET /careers/saved-jobs/:jobId/status
   *
   * Check whether a job is saved by the current user.
   */
  @Get(":jobId/status")
  async checkSavedStatus(
    @Req() req: AuthenticatedRequest,
    @Param("jobId") jobId: string,
  ) {
    const userId = this.getUserId(req);

    const saved = await this.savedJobsService.isSaved(
      userId,
      jobId,
    );

    return { saved };
  }

  /**
   * POST /careers/saved-jobs/:jobId
   *
   * Save a job for the authenticated user.
   */
  @Post(":jobId")
  async saveJob(
    @Req() req: AuthenticatedRequest,
    @Param("jobId") jobId: string,
  ) {
    const userId = this.getUserId(req);

    return this.savedJobsService.saveJob(
      userId,
      jobId,
    );
  }

  /**
   * DELETE /careers/saved-jobs/:jobId
   *
   * Remove a saved job.
   */
  @Delete(":jobId")
  async removeSavedJob(
    @Req() req: AuthenticatedRequest,
    @Param("jobId") jobId: string,
  ) {
    const userId = this.getUserId(req);

    return this.savedJobsService.removeSavedJob(
      userId,
      jobId,
    );
  }

  /**
   * Extract authenticated user ID from JWT.
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
        "You must be logged in to access saved jobs.",
      );
    }

    return userId;
  }
}
