/**
 * organization-visits.controller.ts
 * -----------------------------------------------------------------------------
 * Under the module prefix /church:
 *
 *   POST  /church/organizations/:organizationId/visits            anyone: send a visit request
 *   GET   /church/organizations/:organizationId/visits            admins (view members)
 *   PATCH /church/organizations/:organizationId/visits/:visitId   admins (update member): { status?, staffNote?, note? }
 *
 *   GET   /church/me/visits?organizationId=                       signed in: my visit requests
 *   POST  /church/me/visits/:visitId/cancel                       signed in: cancel my request
 * -----------------------------------------------------------------------------
 */

import { Body, Controller, Get, Param, Patch, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import { OrganizationVisitsService, type SubmitVisitInput } from '../services/organization-visits.service';

type ReqUser = { id?: string; _id?: string; displayName?: string; name?: string; username?: string };

function optionalUser(req: Request): ReqUser | null {
  const user = (req as any).user as ReqUser | undefined;
  const id = user?.id ?? user?._id;
  return id ? { ...user, id: String(id) } : null;
}

function requireUser(req: Request): ReqUser & { id: string } {
  const user = optionalUser(req);
  if (!user?.id) throw new UnauthorizedException('Sign in to continue.');
  return user as ReqUser & { id: string };
}

@Controller('organizations/:organizationId/visits')
export class OrganizationVisitsController {
  constructor(private readonly visits: OrganizationVisitsService) {}

  @Post()
  submit(@Param('organizationId') organizationId: string, @Body() body: SubmitVisitInput, @Req() req: Request) {
    return this.visits.submit(organizationId, body ?? {}, optionalUser(req)?.id);
  }

  @Get()
  list(
    @Param('organizationId') organizationId: string,
    @Query('status') status: string | undefined,
    @Query('q') q: string | undefined,
    @Req() req: Request,
  ) {
    return this.visits.listForAdmin(organizationId, requireUser(req).id, { status, q });
  }

  @Patch(':visitId')
  update(
    @Param('organizationId') organizationId: string,
    @Param('visitId') visitId: string,
    @Body() body: { status?: unknown; staffNote?: unknown; note?: unknown },
    @Req() req: Request,
  ) {
    const user = requireUser(req);
    return this.visits.update(organizationId, visitId, user.id, body ?? {}, user.displayName || user.name || user.username || '');
  }
}

@Controller('me/visits')
export class MyVisitsController {
  constructor(private readonly visits: OrganizationVisitsService) {}

  @Get()
  mine(@Query('organizationId') organizationId: string | undefined, @Req() req: Request) {
    return this.visits.mine(requireUser(req).id, organizationId || undefined);
  }

  @Post(':visitId/cancel')
  cancel(@Param('visitId') visitId: string, @Req() req: Request) {
    return this.visits.cancelMine(requireUser(req).id, visitId);
  }
}
