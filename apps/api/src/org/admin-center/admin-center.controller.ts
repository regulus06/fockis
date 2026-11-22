/**
 * admin-center.controller.ts — Settings & Roles
 * /organizations/:organizationId/admin-center
 *
 *   GET    /                         overview (administrators)
 *   GET    /public                   public display switches (anyone)
 *   PUT    /preferences              general, currency, notification and visibility settings
 *   PATCH  /quick                    Quick Settings switches
 *   PATCH  /profile                  name / organization type (audited)
 *   POST   /status                   archive / reactivate (audited)
 *   GET    /exchange-rates           rates for the accepted currencies
 *   GET    /team                     team, pending requests, role history
 *   PATCH  /team/:memberId/role      change role
 *   PUT    /team/:memberId/permissions  replace permissions
 *   DELETE /team/:memberId/access    remove administrative access
 *   POST   /transfer-ownership       owner only
 *   GET    /audit                    audit log (read-only)
 *
 * Every rule is enforced in AdminCenterService / MembersService.
 */

import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { Public } from '../../auth/public.decorator';
import { userIdOf } from '../communities/communities.controller';
import { AdminCenterService } from './admin-center.service';

type Payload = Record<string, unknown>;

@Controller('organizations/:organizationId/admin-center')
export class AdminCenterController {
  constructor(private readonly center: AdminCenterService) {}

  @Get()
  overview(@Param('organizationId') id: string, @Req() req: Request) {
    return this.center.overview(id, userIdOf(req));
  }

  @Public()
  @Get('public')
  publicSettings(@Param('organizationId') id: string) {
    return this.center.publicSettings(id);
  }

  @Put('preferences')
  savePreferences(@Param('organizationId') id: string, @Body() body: Payload, @Req() req: Request) {
    return this.center.savePreferences(id, userIdOf(req), body ?? {});
  }

  @Patch('quick')
  saveQuick(@Param('organizationId') id: string, @Body() body: Payload, @Req() req: Request) {
    return this.center.saveQuick(id, userIdOf(req), body ?? {});
  }

  @Patch('profile')
  updateProfile(@Param('organizationId') id: string, @Body() body: Payload, @Req() req: Request) {
    return this.center.updateProfile(id, userIdOf(req), body ?? {});
  }

  @Post('status')
  setStatus(@Param('organizationId') id: string, @Body() body: Payload, @Req() req: Request) {
    return this.center.setStatus(id, userIdOf(req), body?.status);
  }

  @Throttle({ default: { limit: 30, ttl: 60 * 1000 } })
  @Get('exchange-rates')
  rates(@Param('organizationId') id: string, @Query('base') base: string, @Req() req: Request) {
    return this.center.rates(id, userIdOf(req), base);
  }

  @Get('team')
  team(@Param('organizationId') id: string, @Req() req: Request) {
    return this.center.team(id, userIdOf(req));
  }

  @Patch('team/:memberId/role')
  changeRole(@Param('organizationId') id: string, @Param('memberId') memberId: string, @Body() body: Payload, @Req() req: Request) {
    return this.center.changeRole(id, userIdOf(req), memberId, body?.role);
  }

  @Put('team/:memberId/permissions')
  setPermissions(@Param('organizationId') id: string, @Param('memberId') memberId: string, @Body() body: Payload, @Req() req: Request) {
    return this.center.setPermissions(id, userIdOf(req), memberId, body?.permissions);
  }

  @Delete('team/:memberId/access')
  removeAccess(@Param('organizationId') id: string, @Param('memberId') memberId: string, @Req() req: Request) {
    return this.center.removeAccess(id, userIdOf(req), memberId);
  }

  @Throttle({ default: { limit: 5, ttl: 10 * 60 * 1000 } })
  @Post('transfer-ownership')
  transfer(@Param('organizationId') id: string, @Body() body: Payload, @Req() req: Request) {
    return this.center.transferOwnership(id, userIdOf(req), body ?? {});
  }

  @Get('audit')
  audit(@Param('organizationId') id: string, @Query() query: Payload, @Req() req: Request) {
    return this.center.auditLog(id, userIdOf(req), query ?? {});
  }
}
