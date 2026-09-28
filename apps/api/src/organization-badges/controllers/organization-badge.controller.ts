/**
 * organization-badge.controller.ts
 * -----------------------------------------------------------------------------
 * Generic Fockis Organization Badge API.
 * -----------------------------------------------------------------------------
 */

import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';

import { Request } from 'express';

import {
  OrganizationBadgeService,
} from '../services/organization-badge.service';

interface AuthenticatedRequest
  extends Request {
  user?: {
    id?: string;
    _id?: string;
    userId?: string;
    sub?: string;
  };
}

@Controller(
  'organizations/:organizationId/badges',
)
@UseGuards(
  AuthGuard('jwt'),
)
export class OrganizationBadgeController {
  constructor(
    private readonly badgeService:
      OrganizationBadgeService,
  ) {}

  /* ==========================================================================
     AUTH USER
     ========================================================================== */

  private getActorUserId(
    req: AuthenticatedRequest,
  ): string {
    const user =
      req.user;

    const userId =
      user?.id ??
      user?._id ??
      user?.userId ??
      user?.sub;

    if (!userId) {
      throw new ForbiddenException(
        'Authenticated request does not contain a user ID.',
      );
    }

    return String(userId);
  }

  /* ==========================================================================
     MY BADGE
     ========================================================================== */

  @Get('me')
  async getMyBadge(
    @Param('organizationId')
    organizationId: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    const userId =
      this.getActorUserId(
        req,
      );

    return this.badgeService.getMyBadge(
      organizationId,
      userId,
    );
  }

  /* ==========================================================================
     MEMBER BADGE
     ========================================================================== */

  @Get(
    'members/:membershipId',
  )
  async getMemberBadge(
    @Param('organizationId')
    organizationId: string,

    @Param('membershipId')
    membershipId: string,
  ) {
    return this.badgeService.getMemberBadge(
      organizationId,
      membershipId,
    );
  }

  /* ==========================================================================
     REBUILD
     ========================================================================== */

  @Post(
    'members/:membershipId/rebuild',
  )
  async rebuildBadge(
    @Param('membershipId')
    membershipId: string,
  ) {
    return this.badgeService.rebuildBadge(
      membershipId,
    );
  }
}