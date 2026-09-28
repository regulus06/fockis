import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

import {
  ProducerTeamService,
} from '../services/producer-team.service';

@Controller('music/producer/team')
@UseGuards(JwtAuthGuard)
export class ProducerTeamController {
  constructor(
    private readonly producerTeamService:
      ProducerTeamService,
  ) {}

  // ==========================================================================
  // GET TEAM
  // ==========================================================================

  /**
   * GET /music/producer/team
   */
  @Get()
  async getTeam(
    @Req() req: any,
  ) {
    return this.producerTeamService.getTeam(
      req.user.id,
    );
  }

  // ==========================================================================
  // INVITE
  // ==========================================================================

  /**
   * POST /music/producer/team/invite
   */
  @Post('invite')
  async invite(
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.producerTeamService.inviteTeamMember(
      req.user.id,
      body,
    );
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  /**
   * PATCH /music/producer/team/:memberId
   */
  @Patch(':memberId')
  async update(
    @Req() req: any,
    @Param('memberId')
    memberId: string,
    @Body() body: any,
  ) {
    return this.producerTeamService.updateTeamMember(
      req.user.id,
      memberId,
      body,
    );
  }

  // ==========================================================================
  // SUSPEND
  // ==========================================================================

  /**
   * POST /music/producer/team/:memberId/suspend
   */
  @Post(':memberId/suspend')
  async suspend(
    @Req() req: any,
    @Param('memberId')
    memberId: string,
  ) {
    return this.producerTeamService.suspendTeamMember(
      req.user.id,
      memberId,
    );
  }

  // ==========================================================================
  // RESTORE
  // ==========================================================================

  /**
   * POST /music/producer/team/:memberId/restore
   */
  @Post(':memberId/restore')
  async restore(
    @Req() req: any,
    @Param('memberId')
    memberId: string,
  ) {
    return this.producerTeamService.restoreTeamMember(
      req.user.id,
      memberId,
    );
  }

  // ==========================================================================
  // REMOVE
  // ==========================================================================

  /**
   * DELETE /music/producer/team/:memberId
   */
  @Delete(':memberId')
  async remove(
    @Req() req: any,
    @Param('memberId')
    memberId: string,
  ) {
    return this.producerTeamService.removeTeamMember(
      req.user.id,
      memberId,
    );
  }
}