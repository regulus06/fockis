import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AuthGuard } from "@nestjs/passport";

import {
  DomainAdminService,
} from "./domain-admin.service";

import {
  UpdateDomainPolicyDto,
} from "./dto/update-domain-policy.dto";

import {
  CreateDomainCampaignDto,
} from "./dto/create-domain-campaign.dto";

import {
  UpdateDomainCampaignDto,
} from "./dto/update-domain-campaign.dto";

import {
  CreateDomainAuthorizationDto,
} from "./dto/create-domain-authorization.dto";

import {
  SuperAdminGuard,
} from "../safety/super-admin.guard";

// ============================================================================
// DOMAIN ADMIN CONTROLLER
// ============================================================================
//
// All Domain Administration endpoints require:
//
// 1. A valid JWT
// 2. Super App Admin privileges
//
// SuperAdminGuard checks:
//
//   request.user.isSuperAdmin === true
//
// Therefore normal users, organization admins, moderators, and regular
// administrators cannot access these endpoints.
//
// ============================================================================

@Controller("admin/domains")
@UseGuards(
  AuthGuard("jwt"),
  SuperAdminGuard,
)
export class DomainAdminController {
  constructor(
    private readonly domainAdminService: DomainAdminService,
  ) {}

  // ========================================================================
  // OVERVIEW
  // ========================================================================

  @Get("overview")
  async getOverview() {
    return this.domainAdminService.getOverview();
  }

  // ========================================================================
  // STATS
  // ========================================================================

  @Get("stats")
  async getStats() {
    return this.domainAdminService.getStats();
  }

  // ========================================================================
  // POLICY
  // ========================================================================

  @Get("policy")
  async getPolicy() {
    return this.domainAdminService.getPolicy();
  }

  @Patch("policy")
  async updatePolicy(
    @Body()
    dto: UpdateDomainPolicyDto,
  ) {
    return this.domainAdminService.updatePolicy(
      dto,
    );
  }

  // ========================================================================
  // CAMPAIGNS
  // ========================================================================

  @Get("campaigns")
  async getCampaigns() {
    return this.domainAdminService.getCampaigns();
  }

  @Post("campaigns")
  async createCampaign(
    @Body()
    dto: CreateDomainCampaignDto,
  ) {
    return this.domainAdminService.createCampaign(
      dto,
    );
  }

  @Patch("campaigns/:campaignId")
  async updateCampaign(
    @Param("campaignId")
    campaignId: string,

    @Body()
    dto: UpdateDomainCampaignDto,
  ) {
    return this.domainAdminService.updateCampaign(
      campaignId,
      dto,
    );
  }

  @Post(
    "campaigns/:campaignId/pause",
  )
  async pauseCampaign(
    @Param("campaignId")
    campaignId: string,
  ) {
    return this.domainAdminService.pauseCampaign(
      campaignId,
    );
  }

  @Post(
    "campaigns/:campaignId/activate",
  )
  async activateCampaign(
    @Param("campaignId")
    campaignId: string,
  ) {
    return this.domainAdminService.activateCampaign(
      campaignId,
    );
  }

  @Delete(
    "campaigns/:campaignId",
  )
  async deleteCampaign(
    @Param("campaignId")
    campaignId: string,
  ) {
    return this.domainAdminService.deleteCampaign(
      campaignId,
    );
  }

  // ========================================================================
  // AUTHORIZATIONS
  // ========================================================================

  @Get("authorizations")
  async getAuthorizations() {
    return this.domainAdminService.getAuthorizations();
  }

  @Post("authorizations")
  async createAuthorization(
    @Body()
    dto: CreateDomainAuthorizationDto,

    @Req()
    req: any,
  ) {
    const adminUserId =
      this.getUserId(req);

    return this.domainAdminService.createAuthorization(
      dto,
      adminUserId,
    );
  }

  @Delete(
    "authorizations/:authorizationId",
  )
  async revokeAuthorization(
    @Param("authorizationId")
    authorizationId: string,
  ) {
    return this.domainAdminService.revokeAuthorization(
      authorizationId,
    );
  }

  // ========================================================================
  // DOMAINS
  // ========================================================================

  @Get()
  async getDomains(
    @Query("search")
    search?: string,

    @Query("status")
    status?: string,

    @Query("assignmentType")
    assignmentType?: string,

    @Query("ownerType")
    ownerType?: string,

    @Query("page")
    page?: string,

    @Query("limit")
    limit?: string,
  ) {
    return this.domainAdminService.getDomains({
      search,
      status,
      assignmentType,
      ownerType,

      page: page
        ? Number(page)
        : undefined,

      limit: limit
        ? Number(limit)
        : undefined,
    });
  }

  // ========================================================================
  // ASSIGN FREE
  // ========================================================================

  @Post(":domainId/assign-free")
  async assignFreeDomain(
    @Param("domainId")
    domainId: string,

    @Body()
    body: {
      ownerType:
        | "user"
        | "organization";

      ownerId: string;
    },

    @Req()
    req: any,
  ) {
    const adminUserId =
      this.getUserId(req);

    return this.domainAdminService.assignFreeDomain(
      domainId,
      body.ownerType,
      body.ownerId,
      adminUserId,
    );
  }

  // ========================================================================
  // SUSPEND
  // ========================================================================

  @Post(":domainId/suspend")
  async suspendDomain(
    @Param("domainId")
    domainId: string,
  ) {
    return this.domainAdminService.suspendDomain(
      domainId,
    );
  }

  // ========================================================================
  // ACTIVATE
  // ========================================================================

  @Post(":domainId/activate")
  async activateDomain(
    @Param("domainId")
    domainId: string,
  ) {
    return this.domainAdminService.activateDomain(
      domainId,
    );
  }

  // ========================================================================
  // AUTHENTICATED USER ID
  // ========================================================================

  private getUserId(
    req: any,
  ): string {
    const user =
      req?.user;

    const id =
      user?.userId ??
      user?.id ??
      user?._id ??
      user?.sub;

    if (!id) {
      throw new Error(
        "Authenticated user ID was not found.",
      );
    }

    return String(id);
  }
}