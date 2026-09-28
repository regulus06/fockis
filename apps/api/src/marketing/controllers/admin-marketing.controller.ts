import {
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";

import { CampaignsService } from "../services/campaign.service";

import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { RbacGuard } from "../../admin/rbac/rbac.guard";

/* ============================================================
   MARKETING ADMIN CONTROLLER

   Admin-only campaign moderation.

   Routes:

   GET   /marketing/admin/campaigns/pending-review
   PATCH /marketing/admin/campaigns/:id/approve
   PATCH /marketing/admin/campaigns/:id/reject

   Authentication:
   - JwtAuthGuard
   - RbacGuard

   Campaign state flow:

   PENDING_REVIEW
        │
        ├── APPROVE → ACTIVE
        │
        └── REJECT  → REJECTED
============================================================ */

@Controller("marketing/admin/campaigns")
@UseGuards(
  JwtAuthGuard,
  RbacGuard,
)
export class MarketingAdminController {
  constructor(
    private readonly campaignsService: CampaignsService,
  ) {}

  /* ============================================================
     GET PENDING CAMPAIGNS

     GET /marketing/admin/campaigns/pending-review

     Returns every campaign currently waiting
     for App Manager / Marketing Admin review.
  ============================================================ */

  @Get("pending-review")
  async getPendingReview() {
    return this.campaignsService.findPending();
  }

  /* ============================================================
     APPROVE CAMPAIGN

     PATCH /marketing/admin/campaigns/:id/approve

     PENDING_REVIEW → ACTIVE
  ============================================================ */

  @Patch(":id/approve")
  async approve(
    @Param("id") campaignId: string,
  ) {
    return this.campaignsService.approve(
      campaignId,
    );
  }

  /* ============================================================
     REJECT CAMPAIGN

     PATCH /marketing/admin/campaigns/:id/reject

     PENDING_REVIEW → REJECTED
  ============================================================ */

  @Patch(":id/reject")
  async reject(
    @Param("id") campaignId: string,
  ) {
    return this.campaignsService.reject(
      campaignId,
    );
  }
}