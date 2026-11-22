/**
 * church-giving.controller.ts
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/giving
 *
 *   GET    /                     public: is giving on, funds, currency (any visitor)
 *   POST   /                     start a gift (signed in) → Stripe client secret
 *   POST   /:giftId/confirm      after Stripe confirms the card (signed in)
 *   GET    /mine                 my own gifts to this church (signed in)
 *   GET    /admin                settings, totals and gifts (giving managers)
 *   PUT    /admin/settings       save settings (giving managers)
 *
 * Permissions are enforced in ChurchGivingService; organization IDs come from
 * the URL and are always checked against the stored gift / membership.
 * -----------------------------------------------------------------------------
 */

import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { Public } from '../../auth/public.decorator';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import { userIdOf } from '../communities/communities.controller';
import { ChurchGivingService } from './church-giving.service';

type Payload = Record<string, unknown>;

function viewerOf(req: Request): string | null {
  const u = req.user as { id?: string; _id?: string; userId?: string } | undefined;
  const id = u?.id ?? u?.userId ?? u?._id;
  return id ? String(id) : null;
}

@Controller('organizations/:organizationId/giving')
export class ChurchGivingController {
  constructor(private readonly giving: ChurchGivingService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  info(@Param('organizationId') organizationId: string, @Req() req: Request) {
    return this.giving.publicInfo(organizationId, viewerOf(req));
  }

  @Throttle({ default: { limit: 10, ttl: 10 * 60 * 1000 } })
  @Post()
  start(@Param('organizationId') organizationId: string, @Body() body: Payload, @Req() req: Request) {
    return this.giving.startGift(organizationId, userIdOf(req), body ?? {});
  }

  @Get('mine')
  mine(@Param('organizationId') organizationId: string, @Req() req: Request) {
    return this.giving.myGifts(organizationId, userIdOf(req));
  }

  @Get('admin')
  admin(@Param('organizationId') organizationId: string, @Query() query: Payload, @Req() req: Request) {
    return this.giving.adminOverview(organizationId, userIdOf(req), query ?? {});
  }

  @Put('admin/settings')
  saveSettings(@Param('organizationId') organizationId: string, @Body() body: Payload, @Req() req: Request) {
    return this.giving.saveSettings(organizationId, userIdOf(req), body ?? {});
  }

  @Post(':giftId/confirm')
  confirm(@Param('organizationId') organizationId: string, @Param('giftId') giftId: string, @Body() body: Payload, @Req() req: Request) {
    return this.giving.confirmGift(organizationId, userIdOf(req), giftId, String(body?.paymentIntentId ?? ''));
  }
}
