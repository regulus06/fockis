import {
  Body,
  Controller,
  Post,
  Req,
} from "@nestjs/common";

import type {
  Request,
} from "express";

import {
  VideoAdEventDto,
} from "../dto/video-ad-event.dto";

import {
  MarketingService,
} from "../services/marketing.service";

/* ============================================================================
   VIDEO AD EVENTS CONTROLLER

   POST /marketing/video-ads/event

   Records:

     IMPRESSION
     CLICK
     CLOSE
     SKIP

   The authenticated user is read from req.user when available.
============================================================================ */

@Controller(
  "marketing/video-ads",
)
export class VideoAdEventsController {
  constructor(
    private readonly marketingService: MarketingService,
  ) {}

  /* ==========================================================================
     TRACK EVENT
  ========================================================================== */

  @Post("event")
  async event(
    @Body()
    dto: VideoAdEventDto,

    @Req()
    req: Request,
  ) {
    const user =
      (req as any).user;

    const userId =
      user?.userId ??
      user?.sub ??
      undefined;

    /*
     * VideoAdEventDto uses campaignId.
     *
     * Convert through unknown so the service's flexible
     * VideoAdEventInput type can accept the DTO without
     * requiring an index signature on the DTO.
     */

    const eventData =
      dto as unknown as Record<
        string,
        unknown
      >;

    return this.marketingService.recordVideoAdEvent(
      eventData,
      userId,
    );
  }
}