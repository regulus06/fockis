import {
  Controller,
  Get,
  Param,
  Query,
  Req,
} from "@nestjs/common";

import type { Request } from "express";

import {
  MeetingTranscriptService,
} from "../services/meeting-transcript.service";

@Controller("meetings")
export class MeetingTranscriptController {
  constructor(
    private readonly transcriptService: MeetingTranscriptService,
  ) {}

  // ==========================================================================
  // GET FULL TRANSCRIPT
  // GET /meetings/:meetingId/transcript
  // ==========================================================================

  @Get(":meetingId/transcript")
  getTranscript(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
  ) {
    const user = (req as any).user;

    const userId =
      user?.id ||
      user?.userId ||
      user?.sub;

    return this.transcriptService.getFullTranscript(
      meetingId,
      userId,
    );
  }

  // ==========================================================================
  // SEARCH TRANSCRIPT
  // GET /meetings/:meetingId/transcript/search?q=...
  // ==========================================================================

  @Get(":meetingId/transcript/search")
  search(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
    @Query("q") query: string,
  ) {
    const user = (req as any).user;

    const userId =
      user?.id ||
      user?.userId ||
      user?.sub;

    return this.transcriptService.searchTranscript(
      meetingId,
      userId,
      query,
    );
  }
}