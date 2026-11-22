/**
 * church-requests.controller.ts
 * -----------------------------------------------------------------------------
 * Requests & Inquiries, under the module prefix /church:
 *
 *   POST   /church/organizations/:id/requests/submit            anyone (public form; rate limited)
 *   GET    /church/organizations/:id/requests/mine              signed in: my requests + replies
 *
 *   GET    /church/organizations/:id/requests                   staff: list (tab, q, type, status, sort, page, pageSize)
 *   GET    /church/organizations/:id/requests/staff             staff: people and ministries to assign to
 *   GET    /church/organizations/:id/requests/members?q=        staff: members to link a new request to
 *   GET    /church/organizations/:id/requests/reports           owner / administrators / pastors
 *   POST   /church/organizations/:id/requests                   administrators: create a request
 *   GET    /church/organizations/:id/requests/:requestId        staff
 *   PATCH  /church/organizations/:id/requests/:requestId        staff: status, priority, assignee, ministry, due date
 *   POST   /church/organizations/:id/requests/:requestId/replies  staff: { channel: "email" | "fockis", body }
 *   POST   /church/organizations/:id/requests/:requestId/notes    staff: { body, visibility: "staff" | "pastoral" }
 *   POST   /church/organizations/:id/requests/:requestId/archive  administrators
 *   POST   /church/organizations/:id/requests/:requestId/restore  administrators
 *   DELETE /church/organizations/:id/requests/:requestId        owner / administrator
 *
 * Every permission check is in ChurchRequestsService.
 * -----------------------------------------------------------------------------
 */

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { Public } from '../../auth/public.decorator';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import { ChurchRequestsService } from './church-requests.service';

function userIdOf(req: Request): string | null {
  const u = (req as any).user as { id?: string; _id?: string; userId?: string; sub?: string } | undefined;
  const id = u?.id ?? u?._id ?? u?.userId ?? u?.sub;
  return id ? String(id) : null;
}

function requireUser(req: Request): string {
  const id = userIdOf(req);
  if (!id) throw new UnauthorizedException('Sign in to continue.');
  return id;
}

@Controller('organizations/:organizationId/requests')
export class ChurchRequestsController {
  constructor(private readonly requests: ChurchRequestsService) {}

  /* ------------------------------------------------------------ public */

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 10 * 60 * 1000 } })
  @Post('submit')
  submit(@Param('organizationId') organizationId: string, @Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.requests.submit(organizationId, body ?? {}, userIdOf(req));
  }

  @Get('mine')
  mine(@Param('organizationId') organizationId: string, @Req() req: Request) {
    return this.requests.mine(organizationId, requireUser(req));
  }

  /* ------------------------------------------------------------ staff */

  @Get()
  list(@Param('organizationId') organizationId: string, @Query() query: Record<string, unknown>, @Req() req: Request) {
    return this.requests.list(organizationId, requireUser(req), query ?? {});
  }

  @Get('staff')
  staff(@Param('organizationId') organizationId: string, @Req() req: Request) {
    return this.requests.staff(organizationId, requireUser(req));
  }

  @Get('members')
  members(@Param('organizationId') organizationId: string, @Query('q') q: string | undefined, @Req() req: Request) {
    return this.requests.searchMembers(organizationId, requireUser(req), q ?? '');
  }

  @Get('reports')
  reports(@Param('organizationId') organizationId: string, @Req() req: Request) {
    return this.requests.reports(organizationId, requireUser(req));
  }

  @Post()
  create(@Param('organizationId') organizationId: string, @Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.requests.create(organizationId, requireUser(req), body ?? {});
  }

  @Get(':requestId')
  get(@Param('organizationId') organizationId: string, @Param('requestId') requestId: string, @Req() req: Request) {
    return this.requests.get(organizationId, requireUser(req), requestId);
  }

  @Patch(':requestId')
  update(
    @Param('organizationId') organizationId: string,
    @Param('requestId') requestId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    return this.requests.update(organizationId, requireUser(req), requestId, body ?? {});
  }

  @Throttle({ default: { limit: 20, ttl: 60 * 1000 } })
  @Post(':requestId/replies')
  reply(
    @Param('organizationId') organizationId: string,
    @Param('requestId') requestId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    return this.requests.reply(organizationId, requireUser(req), requestId, body ?? {});
  }

  @Post(':requestId/notes')
  note(
    @Param('organizationId') organizationId: string,
    @Param('requestId') requestId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    return this.requests.addNote(organizationId, requireUser(req), requestId, body ?? {});
  }

  @Post(':requestId/archive')
  archive(@Param('organizationId') organizationId: string, @Param('requestId') requestId: string, @Req() req: Request) {
    return this.requests.archive(organizationId, requireUser(req), requestId, false);
  }

  @Post(':requestId/restore')
  restore(@Param('organizationId') organizationId: string, @Param('requestId') requestId: string, @Req() req: Request) {
    return this.requests.archive(organizationId, requireUser(req), requestId, true);
  }

  @Delete(':requestId')
  remove(@Param('organizationId') organizationId: string, @Param('requestId') requestId: string, @Req() req: Request) {
    return this.requests.remove(organizationId, requireUser(req), requestId);
  }
}
