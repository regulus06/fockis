import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { SavedJobsService } from "../services/saved-jobs.service";

import { JwtAuthGuard } from "../../auth/jwt-auth.guard";

/* ============================================================
   SAVED JOBS CONTROLLER

   Routes:

   GET    /careers/saved-jobs
   POST   /careers/saved-jobs/:jobId
   DELETE /careers/saved-jobs/:jobId
   GET    /careers/saved-jobs/:jobId/status
============================================================ */

@Controller("careers/saved-jobs")
@UseGuards(JwtAuthGuard)
export class SavedJobsController {
  constructor(
    private readonly savedJobsService: SavedJobsService,
  ) {}

  /* ==========================================================
     GET MY SAVED JOBS

     GET /careers/saved-jobs

     The user ID comes from the authenticated JWT.
  ========================================================== */

  @Get()
  findMine(@Req() req: any) {
    return this.savedJobsService.findMine(
      req.user.id,
    );
  }

  /* ==========================================================
     CHECK SAVED STATUS

     GET /careers/saved-jobs/:jobId/status

     Returns:

     {
       saved: true
     }

     or:

     {
       saved: false
     }
  ========================================================== */

  @Get(":jobId/status")
  async checkSavedStatus(
    @Req() req: any,
    @Param("jobId") jobId: string,
  ) {
    const saved =
      await this.savedJobsService.isSaved(
        req.user.id,
        jobId,
      );

    return {
      saved,
    };
  }

  /* ==========================================================
     SAVE JOB

     POST /careers/saved-jobs/:jobId
  ========================================================== */

  @Post(":jobId")
  saveJob(
    @Req() req: any,
    @Param("jobId") jobId: string,
  ) {
    return this.savedJobsService.saveJob(
      req.user.id,
      jobId,
    );
  }

  /* ==========================================================
     REMOVE SAVED JOB

     DELETE /careers/saved-jobs/:jobId
  ========================================================== */

  @Delete(":jobId")
  removeSavedJob(
    @Req() req: any,
    @Param("jobId") jobId: string,
  ) {
    return this.savedJobsService.removeSavedJob(
      req.user.id,
      jobId,
    );
  }
}