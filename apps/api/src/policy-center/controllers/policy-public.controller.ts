import { Body, Controller, Delete, Get, Param, Patch, Post, Req, BadRequestException } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";

import { Public } from "../../auth/public.decorator";
import { actorId, type Actor } from "../../reports/utils/actor";
import { AcceptPolicyDto, CorrectionRequestDto, MuteDto, UpdateConsentDto, UpdatePrivacyDto } from "../dto/policy.dto";
import { DataRequestsService } from "../services/data-requests.service";
import { PoliciesService } from "../services/policies.service";
import { PolicyAcceptanceService } from "../services/policy-acceptance.service";
import { UserActivityService } from "../services/user-activity.service";
import { UserCenterService } from "../services/user-center.service";

type AuthedRequest = Omit<Request, "user"> & { user: Actor };

/** Published policies for everyone (signed in or not). Only published text — no drafts or notes. */
@Controller("policies")
export class PublicPoliciesController {
  constructor(private readonly policies: PoliciesService) {}

  @Public()
  @Get()
  async list() {
    return { items: await this.policies.publicList() };
  }

  @Public()
  @Get(":slug")
  get(@Param("slug") slug: string) {
    return this.policies.publicGet(slug);
  }

  @Public()
  @Get(":slug/versions")
  async versions(@Param("slug") slug: string) {
    return { items: await this.policies.publicVersions(slug) };
  }
}

/**
 * Settings → Policy, Privacy & Safety. Every route works on the signed-in
 * user's own data only (the user ID comes from the token, never the URL).
 */
@Controller("policy-center")
export class PolicyCenterController {
  constructor(
    private readonly center: UserCenterService,
    private readonly acceptance: PolicyAcceptanceService,
    private readonly activity: UserActivityService,
    private readonly dataRequests: DataRequestsService,
  ) {}

  private me(req: AuthedRequest) {
    const id = actorId(req.user);
    if (!id) throw new BadRequestException("Sign in again to continue.");
    return id;
  }

  @Get("overview")
  overview(@Req() req: AuthedRequest) {
    return this.center.overview(this.me(req));
  }

  @Get("policies")
  async policies(@Req() req: AuthedRequest) {
    return { items: await this.acceptance.forUser(this.me(req)) };
  }

  @Post("policies/:slug/accept")
  accept(@Req() req: AuthedRequest, @Param("slug") slug: string, @Body() dto: AcceptPolicyDto) {
    return this.acceptance.accept(this.me(req), slug, dto.versionId);
  }

  @Get("history")
  async history(@Req() req: AuthedRequest) {
    return { items: await this.acceptance.history(this.me(req)) };
  }

  @Get("activity")
  async recent(@Req() req: AuthedRequest) {
    return { items: await this.activity.list(this.me(req), 30) };
  }

  @Get("privacy")
  privacy(@Req() req: AuthedRequest) {
    return this.center.getPrivacy(this.me(req));
  }

  @Patch("privacy")
  updatePrivacy(@Req() req: AuthedRequest, @Body() dto: UpdatePrivacyDto) {
    return this.center.updatePrivacy(this.me(req), dto);
  }

  @Get("muted")
  async muted(@Req() req: AuthedRequest) {
    return { items: await this.center.muted(this.me(req)) };
  }

  @Post("muted")
  async mute(@Req() req: AuthedRequest, @Body() dto: MuteDto) {
    return { items: await this.center.mute(this.me(req), dto.user) };
  }

  @Delete("muted/:userId")
  async unmute(@Req() req: AuthedRequest, @Param("userId") userId: string) {
    return { items: await this.center.unmute(this.me(req), userId) };
  }

  @Get("consent")
  consent(@Req() req: AuthedRequest) {
    return this.center.getConsent(this.me(req));
  }

  @Patch("consent")
  updateConsent(@Req() req: AuthedRequest, @Body() dto: UpdateConsentDto) {
    return this.center.updateConsent(this.me(req), dto);
  }

  @Get("security")
  security(@Req() req: AuthedRequest) {
    return this.center.security(this.me(req));
  }

  @Post("security/check")
  securityCheck(@Req() req: AuthedRequest) {
    return this.center.security(this.me(req), true);
  }

  @Get("my-information")
  info(@Req() req: AuthedRequest) {
    return this.center.myInformation(this.me(req));
  }

  @Get("data-requests")
  async requests(@Req() req: AuthedRequest) {
    return { items: await this.dataRequests.mine(this.me(req)) };
  }

  @Post("data-requests/export")
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  exportData(@Req() req: AuthedRequest) {
    return this.dataRequests.requestExport(this.me(req));
  }

  @Post("data-requests/correction")
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  correction(@Req() req: AuthedRequest, @Body() dto: CorrectionRequestDto) {
    return this.dataRequests.requestCorrection(this.me(req), dto);
  }

  @Get("data-requests/:id/download")
  download(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.dataRequests.downloadLink(this.me(req), id);
  }
}
