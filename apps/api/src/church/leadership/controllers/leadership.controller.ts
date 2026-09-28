/**
 * leadership.controller.ts
 * -----------------------------------------------------------------------------
 * REST surface for Leadership management, mounted under
 * /organizations/:organizationId/leadership.
 *
 * The web feature's organizationsApi.getOrganization() embeds this list
 * directly in the Organization response, so these routes are primarily
 * available for the Church admin console.
 * -----------------------------------------------------------------------------
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';

import { LeadershipService } from '../services/leadership.service';
import { AssignLeaderDto } from '../dto/assign-leader.dto';
import { UpdateLeaderDto } from '../dto/update-leader.dto';
import type { AuthUser } from '../../members/services/members.service';

/**
 * Only the authenticated user is needed by this controller.
 *
 * Do NOT extend Express Request here.
 * The application's AuthUser type does not satisfy the Express Request.user
 * index-signature type used by the current Express typings.
 */
type AuthenticatedRequest = {
  user?: AuthUser;
};

@Controller('organizations/:organizationId/leadership')
export class LeadershipController {
  constructor(
    private readonly leadershipService: LeadershipService,
  ) {}

  /* ==========================================================================
     LIST
  ========================================================================== */

  @Get()
  list(
    @Param('organizationId') organizationId: string,
  ) {
    return this.leadershipService.listByOrganization(
      organizationId,
    );
  }

  /* ==========================================================================
     ASSIGN
  ========================================================================== */

  @Post()
  assign(
    @Param('organizationId') organizationId: string,
    @Body() dto: AssignLeaderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.leadershipService.assign(
      organizationId,
      dto,
      req.user!.id,
    );
  }

  /* ==========================================================================
     UPDATE
  ========================================================================== */

  @Patch(':leadershipId')
  update(
    @Param('organizationId') organizationId: string,
    @Param('leadershipId') leadershipId: string,
    @Body() dto: UpdateLeaderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.leadershipService.update(
      organizationId,
      leadershipId,
      dto,
      req.user!.id,
    );
  }

  /* ==========================================================================
     DELETE
  ========================================================================== */

  @Delete(':leadershipId')
  remove(
    @Param('organizationId') organizationId: string,
    @Param('leadershipId') leadershipId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.leadershipService.remove(
      organizationId,
      leadershipId,
      req.user!.id,
    );
  }
}