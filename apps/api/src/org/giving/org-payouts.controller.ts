/**
 * org-payouts.controller.ts
 * -----------------------------------------------------------------------------
 * /church/organizations/:organizationId/payouts   (organization dashboard)
 *
 *   GET  /               overview: Stripe status, balances, schedule, history
 *   GET  /cover-quote    public: extra a giver adds to cover the fee (?amount=)
 *   POST /refresh        re-read the Stripe account after onboarding
 *   POST /connect        owner: create / continue the Stripe account → { url }
 *   POST /dashboard      owner: Stripe Express dashboard link → { url }
 *   PUT  /schedule       owner: how often to be paid + minimum amount
 *   POST /pay-now        owner: pay out everything that is ready now
 *
 * Permissions are enforced in OrgPayoutsService (owner acts; owner,
 * administrators / pastors and "manage settings" members can view).
 * -----------------------------------------------------------------------------
 */

import { Body, Controller, Get, Param, Post, Put, Query, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Types } from "mongoose";

import { Public } from "../../auth/public.decorator";
import { userIdOf } from "../communities/communities.controller";
import { OrgPayoutsService } from "../../payouts/organization-payouts/org-payouts.service";

type Payload = Record<string, unknown>;

@Controller("organizations/:organizationId/payouts")
export class OrgPayoutsController {
  constructor(
    private readonly payouts: OrgPayoutsService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Get()
  overview(@Param("organizationId") organizationId: string, @Req() req: Request) {
    return this.payouts.overview(organizationId, userIdOf(req));
  }

  @Public()
  @Get("cover-quote")
  async coverQuote(@Param("organizationId") organizationId: string, @Query("amount") amount: string) {
    if (!Types.ObjectId.isValid(organizationId)) return { enabled: false, cover: 0, currency: "USD" };
    const giving = (await this.connection
      .collection("church_giving_settings")
      .findOne({ organizationId: new Types.ObjectId(organizationId) }, { projection: { currency: 1 } })) as { currency?: string } | null;
    const n = Number(amount);
    return this.payouts.coverQuote(organizationId, Number.isFinite(n) ? n : 0, String(giving?.currency ?? "USD"));
  }

  @Post("refresh")
  refresh(@Param("organizationId") organizationId: string, @Req() req: Request) {
    return this.payouts.refreshStripe(organizationId, userIdOf(req));
  }

  @Throttle({ default: { limit: 10, ttl: 10 * 60 * 1000 } })
  @Post("connect")
  connect(@Param("organizationId") organizationId: string, @Body() body: Payload, @Req() req: Request) {
    return this.payouts.connect(organizationId, userIdOf(req), String(body?.country ?? ""));
  }

  @Post("dashboard")
  dashboard(@Param("organizationId") organizationId: string, @Req() req: Request) {
    return this.payouts.dashboardLink(organizationId, userIdOf(req));
  }

  @Put("schedule")
  schedule(@Param("organizationId") organizationId: string, @Body() body: Payload, @Req() req: Request) {
    return this.payouts.saveSchedule(organizationId, userIdOf(req), body ?? {});
  }

  @Throttle({ default: { limit: 5, ttl: 10 * 60 * 1000 } })
  @Post("pay-now")
  payNow(@Param("organizationId") organizationId: string, @Req() req: Request) {
    return this.payouts.payoutNow(organizationId, userIdOf(req));
  }
}
