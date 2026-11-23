/**
 * church-giving.controller.ts
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/giving
 *
 *   GET    /                     public: is giving on, funds, currency (any visitor)
 *   POST   /                     start a gift (signed in) → Stripe client secret
 *   POST   /:giftId/confirm      after Stripe confirms the card (signed in)
 *   POST   /guest                public: start a gift without a Fockis account
 *                                (name + email; church can turn this off)
 *   POST   /:giftId/guest-confirm  public: confirm it with the one-time key
 *   GET    /qr?fund=             public: QR code that opens the giving form
 *   GET    /mine                 my own gifts to this church (signed in)
 *   GET    /admin                settings, totals and gifts (giving managers)
 *   PUT    /admin/settings       save settings (giving managers)
 *   POST   /admin/gifts/:id/refund   owner: refund a gift before it is paid out
 *   POST   /:giftId/refund-request   giver: ask the church for a refund
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

  /**
   * Giving without a Fockis account. Limited per device/network here (a
   * whole congregation can share one church Wi-Fi address, so this is not
   * tight) and per email address in the service; guests also have a higher
   * minimum and Stripe screens every card.
   */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60 * 60 * 1000 } })
  @Post('guest')
  startGuest(@Param('organizationId') organizationId: string, @Body() body: Payload) {
    return this.giving.startGuestGift(organizationId, body ?? {});
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60 * 60 * 1000 } })
  @Post(':giftId/guest-confirm')
  confirmGuest(@Param('organizationId') organizationId: string, @Param('giftId') giftId: string, @Body() body: Payload) {
    return this.giving.confirmGuestGift(organizationId, giftId, String(body?.paymentIntentId ?? ''), String(body?.guestKey ?? ''));
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60 * 1000 } })
  @Get('qr')
  qr(@Param('organizationId') organizationId: string, @Query('fund') fund?: string) {
    return this.giving.givingQr(organizationId, typeof fund === 'string' ? fund.slice(0, 60) : undefined);
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

  /** Owner only: refund a gift in full before it has been paid out to the church. */
  @Throttle({ default: { limit: 10, ttl: 10 * 60 * 1000 } })
  @Post('admin/gifts/:giftId/refund')
  refund(@Param('organizationId') organizationId: string, @Param('giftId') giftId: string, @Body() body: Payload, @Req() req: Request) {
    return this.giving.refundGift(organizationId, userIdOf(req), giftId, body?.reason);
  }

  /** The giver asks the church for a refund. */
  @Throttle({ default: { limit: 5, ttl: 10 * 60 * 1000 } })
  @Post(':giftId/refund-request')
  requestRefund(@Param('organizationId') organizationId: string, @Param('giftId') giftId: string, @Body() body: Payload, @Req() req: Request) {
    return this.giving.requestRefund(organizationId, userIdOf(req), giftId, body?.reason);
  }

  @Post(':giftId/confirm')
  confirm(@Param('organizationId') organizationId: string, @Param('giftId') giftId: string, @Body() body: Payload, @Req() req: Request) {
    return this.giving.confirmGift(organizationId, userIdOf(req), giftId, String(body?.paymentIntentId ?? ''));
  }
}
