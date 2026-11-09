/**
 * organization-follow.controller.ts
 *   GET    /church/organizations/:organizationId/follow   follower count (+ "following" when signed in)
 *   POST   /church/organizations/:organizationId/follow   follow
 *   DELETE /church/organizations/:organizationId/follow   unfollow
 */

import { Controller, Delete, Get, Param, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import { OrganizationFollowService } from './organization-follow.service';

function optionalUserId(req: Request): string | undefined {
  const user = (req as any).user as { id?: string; _id?: string; userId?: string } | undefined;
  const id = user?.id ?? user?._id ?? user?.userId;
  return id ? String(id) : undefined;
}

function requiredUserId(req: Request): string {
  const id = optionalUserId(req);
  if (!id) throw new UnauthorizedException('Sign in to follow organizations.');
  return id;
}

@Controller('organizations/:organizationId/follow')
export class OrganizationFollowController {
  constructor(private readonly follows: OrganizationFollowService) {}

  @Get()
  status(@Param('organizationId') organizationId: string, @Req() req: Request) {
    return this.follows.status(organizationId, optionalUserId(req));
  }

  @Post()
  follow(@Param('organizationId') organizationId: string, @Req() req: Request) {
    return this.follows.follow(organizationId, requiredUserId(req));
  }

  @Delete()
  unfollow(@Param('organizationId') organizationId: string, @Req() req: Request) {
    return this.follows.unfollow(organizationId, requiredUserId(req));
  }
}
