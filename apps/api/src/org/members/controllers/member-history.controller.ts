/**
 * member-history.controller.ts
 *
 *   GET /church/organizations/:organizationId/members/me/history
 *
 * The signed-in person's own history in one organization (member portal).
 */

import { Controller, Get, Param, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import { MemberHistoryService } from '../services/member-history.service';

@Controller('organizations/:organizationId/members/me/history')
export class MemberHistoryController {
  constructor(private readonly history: MemberHistoryService) {}

  @Get()
  mine(@Param('organizationId') organizationId: string, @Req() req: Request) {
    const user = (req as any).user as { id?: string; _id?: string } | undefined;
    const id = user?.id ?? user?._id;
    if (!id) throw new UnauthorizedException('Sign in to continue.');
    return this.history.forMe(organizationId, String(id));
  }
}
