import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";

import type { Request } from "express";

import {
  MeetingSecretaryService,
} from "../services/meeting-secretary.service";

import {
  UpdateSecretaryDto,
} from "../dto/update-secretary.dto";

@Controller("meetings")
export class MeetingSecretaryController {
  constructor(
    private readonly secretaryService: MeetingSecretaryService,
  ) {}

  // ==========================================================================
  // GET SECRETARY CONFIGURATION
  // GET /meetings/:meetingId/secretary
  // ==========================================================================

  @Get(":meetingId/secretary")
  getConfig(
    @Param("meetingId")
    meetingId: string,
  ) {
    return this.secretaryService.getConfig(
      meetingId,
    );
  }

  // ==========================================================================
  // UPDATE SECRETARY CONFIGURATION
  // PATCH /meetings/:meetingId/secretary
  // ==========================================================================

  @Patch(":meetingId/secretary")
  updateConfig(
    @Param("meetingId")
    meetingId: string,

    @Body()
    dto: UpdateSecretaryDto,
  ) {
    return this.secretaryService.updateConfig(
      meetingId,
      dto,
    );
  }

  // ==========================================================================
  // GET SECRETARY STATUS
  // GET /meetings/:meetingId/secretary/status
  // ==========================================================================

  @Get(":meetingId/secretary/status")
  status(
    @Param("meetingId")
    meetingId: string,
  ) {
    return this.secretaryService.getStatus(
      meetingId,
    );
  }

  // ==========================================================================
  // GENERATE MEETING SUMMARY
  // POST /meetings/:meetingId/secretary/summary
  // ==========================================================================

  @Post(":meetingId/secretary/summary")
  generateSummary(
    @Req() req: Request,

    @Param("meetingId")
    meetingId: string,
  ) {
    const user = (req as any).user;

    const userId =
      user?.id ??
      user?.userId ??
      user?.sub;

    return this.secretaryService.generateSummary(
      meetingId,
      userId,
    );
  }
}