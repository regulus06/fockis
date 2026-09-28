import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import type {
  Request,
} from "express";

import {
  CampaignsService,
} from "../services/campaign.service";

import {
  CreateCampaignDto,
} from "../dto/create-campaign.dto";

import {
  UpdateCampaignDto,
} from "../dto/update-campaign.dto";

import {
  JwtAuthGuard,
} from "../../auth/jwt-auth.guard";


/* ============================================================================
   AUTHENTICATED USER
============================================================================ */

interface AuthenticatedUser {
  id?: string;
  _id?: string;
  userId?: string;
  sub?: string;
}


type MarketingRequest =
  Request & {
    user?: AuthenticatedUser;
  };


/* ============================================================================
   CAMPAIGNS CONTROLLER

   Advertiser campaign management.

   Routes:

   POST   /marketing/campaigns
   GET    /marketing/campaigns
   GET    /marketing/campaigns/:id
   PATCH  /marketing/campaigns/:id
   DELETE /marketing/campaigns/:id

   POST   /marketing/campaigns/:id/submit
   POST   /marketing/campaigns/:id/pause
   POST   /marketing/campaigns/:id/resume
============================================================================ */

@Controller(
  "marketing/campaigns",
)
@UseGuards(
  JwtAuthGuard,
)
export class CampaignsController {

  constructor(
    private readonly campaignsService:
      CampaignsService,
  ) {}


  /* ==========================================================================
     CREATE CAMPAIGN

     POST /marketing/campaigns
  ========================================================================== */

  @Post()
  async create(
    @Req() req: MarketingRequest,
    @Body() dto: CreateCampaignDto,
  ) {

    const advertiserId =
      this.getAuthenticatedUserId(
        req,
      );


    return this.campaignsService.create(
      advertiserId,
      dto,
    );

  }


  /* ==========================================================================
     GET MY CAMPAIGNS

     GET /marketing/campaigns
  ========================================================================== */

  @Get()
  async findMine(
    @Req() req: MarketingRequest,
  ) {

    const advertiserId =
      this.getAuthenticatedUserId(
        req,
      );


    return this.campaignsService.findAll(
      advertiserId,
    );

  }


  /* ==========================================================================
     GET ONE CAMPAIGN

     GET /marketing/campaigns/:id
  ========================================================================== */

  @Get(":id")
  async findOne(
    @Req() req: MarketingRequest,
    @Param("id") campaignId: string,
  ) {

    const advertiserId =
      this.getAuthenticatedUserId(
        req,
      );


    return this.campaignsService.findOne(
      advertiserId,
      campaignId,
    );

  }


  /* ==========================================================================
     UPDATE CAMPAIGN

     PATCH /marketing/campaigns/:id
  ========================================================================== */

  @Patch(":id")
  async update(
    @Req() req: MarketingRequest,
    @Param("id") campaignId: string,
    @Body() dto: UpdateCampaignDto,
  ) {

    const advertiserId =
      this.getAuthenticatedUserId(
        req,
      );


    return this.campaignsService.update(
      advertiserId,
      campaignId,
      dto,
    );

  }


  /* ==========================================================================
     DELETE CAMPAIGN

     DELETE /marketing/campaigns/:id

     The advertiser can delete:
       - DRAFT
       - REJECTED
       - PAUSED

     The service prevents deletion of:
       - ACTIVE
       - PENDING_REVIEW
  ========================================================================== */

  @Delete(":id")
  async remove(
    @Req() req: MarketingRequest,
    @Param("id") campaignId: string,
  ) {

    const advertiserId =
      this.getAuthenticatedUserId(
        req,
      );


    return this.campaignsService.remove(
      advertiserId,
      campaignId,
    );

  }


  /* ==========================================================================
     SUBMIT FOR REVIEW

     POST /marketing/campaigns/:id/submit
  ========================================================================== */

  @Post(":id/submit")
  async submitForReview(
    @Req() req: MarketingRequest,
    @Param("id") campaignId: string,
  ) {

    const advertiserId =
      this.getAuthenticatedUserId(
        req,
      );


    return this.campaignsService.submitForReview(
      advertiserId,
      campaignId,
    );

  }


  /* ==========================================================================
     PAUSE

     POST /marketing/campaigns/:id/pause
  ========================================================================== */

  @Post(":id/pause")
  async pause(
    @Req() req: MarketingRequest,
    @Param("id") campaignId: string,
  ) {

    const advertiserId =
      this.getAuthenticatedUserId(
        req,
      );


    return this.campaignsService.pause(
      advertiserId,
      campaignId,
    );

  }


  /* ==========================================================================
     RESUME

     POST /marketing/campaigns/:id/resume
  ========================================================================== */

  @Post(":id/resume")
  async resume(
    @Req() req: MarketingRequest,
    @Param("id") campaignId: string,
  ) {

    const advertiserId =
      this.getAuthenticatedUserId(
        req,
      );


    return this.campaignsService.resume(
      advertiserId,
      campaignId,
    );

  }


  /* ==========================================================================
     AUTHENTICATED USER ID
  ========================================================================== */

  private getAuthenticatedUserId(
    req: MarketingRequest,
  ): string {

    const user =
      req.user;


    const userId =
      user?.id ??
      user?._id ??
      user?.userId ??
      user?.sub;


    if (!userId) {

      throw new Error(
        "Authenticated user ID is missing from the request.",
      );

    }


    return String(
      userId,
    );

  }

}