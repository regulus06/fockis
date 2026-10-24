import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import Stripe from "stripe";

import { Public } from "../auth/public.decorator";
import { PayoutsService } from "./payouts.service";

type AuthenticatedRequest = Request & {
  user?: {
    _id?: string | { toString(): string };
    id?: string | { toString(): string };
    userId?: string;
    sub?: string;
  };
};

function currentUserId(req: AuthenticatedRequest): string {
  const user = req.user;
  const id = user?.id ?? user?.userId ?? user?._id ?? user?.sub;
  const value = id ? String(id).trim() : "";

  if (!value) {
    throw new UnauthorizedException("Sign in to manage payouts.");
  }

  return value;
}

/**
 * Seller payout endpoints.
 * Protected by the global JwtAuthGuard registered in AppModule.
 */
@Controller("payouts")
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  /** POST /payouts/onboard?storeId=... → { url } (redirect the seller there) */
  @Post("onboard")
  onboard(
    @Req() req: AuthenticatedRequest,
    @Query("storeId") storeId: string,
  ) {
    return this.payoutsService.createOnboardingLink(currentUserId(req), storeId);
  }

  /** GET /payouts/status?storeId=... → payout readiness for the dashboard */
  @Get("status")
  status(
    @Req() req: AuthenticatedRequest,
    @Query("storeId") storeId: string,
  ) {
    return this.payoutsService.getStatus(currentUserId(req), storeId);
  }

  /** POST /payouts/dashboard?storeId=... → { url } to the seller's Stripe dashboard */
  @Post("dashboard")
  dashboard(
    @Req() req: AuthenticatedRequest,
    @Query("storeId") storeId: string,
  ) {
    return this.payoutsService.createDashboardLink(currentUserId(req), storeId);
  }
}

/**
 * Stripe Connect webhook. Public because Stripe calls it directly;
 * it is verified with STRIPE_CONNECT_WEBHOOK_SECRET instead.
 * Relies on rawBody: true in main.ts (already enabled).
 */
@Public()
@Controller("payouts/webhooks/stripe")
export class PayoutsWebhookController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ) {
    if (!req.rawBody || !signature) {
      throw new BadRequestException("Missing raw body or Stripe signature.");
    }

    const event = this.payoutsService.constructWebhookEvent(
      req.rawBody,
      signature,
    );

    if (event.type === "account.updated") {
      await this.payoutsService.handleAccountUpdated(
        (event.data.object as Stripe.Account).id,
      );
    }

    return { received: true };
  }
}
