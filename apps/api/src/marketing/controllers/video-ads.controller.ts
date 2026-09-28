import {
  Controller,
  Get,
  Query,
  Req,
} from "@nestjs/common";

import type { Request } from "express";

import { MarketingService } from "../services/marketing.service";

@Controller("marketing/video-ads")
export class VideoAdsController {
  constructor(
    private readonly marketingService: MarketingService,
  ) {}

  /* ==========================================================================
     GET NEXT VIDEO AD

     GET /marketing/video-ads/next
     GET /marketing/video-ads/next?videoId=VIDEO_ID

     The authenticated user is taken from the JWT when available.
  ========================================================================== */

  @Get("next")
  async getNextVideoAd(
    @Req() req: Request,
    @Query("videoId") videoId?: string,
  ) {
    const user = (req as any).user;

    const userId =
      user?.userId ||
      user?.sub ||
      undefined;

    return this.marketingService.getNextVideoAd({
      videoId:
        videoId?.trim() || undefined,

      userId,
    });
  }
}