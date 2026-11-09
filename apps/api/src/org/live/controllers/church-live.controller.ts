/**
 * church-live.controller.ts
 * -----------------------------------------------------------------------------
 * REST surface for Live streaming, mounted under
 * /organizations/:organizationId/live.
 *
 * Inline DTOs (UpdateLiveEventDto, UpdateLiveStateDto, JoinLiveEventDto)
 * live here rather than in dto/ files, since this module's given file list
 * only includes create-live-event.dto.ts.
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
  Query,
  Req,
} from '@nestjs/common';

import { PartialType } from '@nestjs/mapped-types';
import {
  IsEmail,
  IsEnum,
  IsOptional,
} from 'class-validator';

import {
  ChurchLiveService,
  LiveEventState,
  type ListLiveEventsQuery,
} from '../services/church-live.service';

import { CreateLiveEventDto } from '../dto/create-live-event.dto';
import type { AuthUser } from '../../members/services/members.service';

/**
 * Update DTO
 */
class UpdateLiveEventDto extends PartialType(CreateLiveEventDto) {}

/**
 * Update live-event state.
 */
class UpdateLiveStateDto {
  @IsEnum(LiveEventState)
  state!: LiveEventState;
}

/**
 * Guest join DTO.
 */
class JoinLiveEventDto {
  @IsOptional()
  @IsEmail()
  guestEmail?: string;
}

/**
 * Only the authenticated user is needed by this controller.
 *
 * Do NOT extend Express Request here because the application's AuthUser
 * type is not structurally compatible with the Express Request.user type.
 */
type AuthenticatedRequest = {
  user?: AuthUser;
};

@Controller('organizations/:organizationId/live')
export class ChurchLiveController {
  constructor(
    private readonly liveService: ChurchLiveService,
  ) {}

  /* ==========================================================================
     LIST
  ========================================================================== */

  @Get()
  list(
    @Param('organizationId') organizationId: string,
    @Query() query: ListLiveEventsQuery,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.liveService.listByOrganization(
      organizationId,
      {
        page: query.page
          ? Number(query.page)
          : undefined,

        pageSize: query.pageSize
          ? Number(query.pageSize)
          : undefined,

        search: query.search,
      },
      req.user?.id,
    );
  }

  /* ==========================================================================
     CURRENT
  ========================================================================== */

  @Get('current')
  getCurrent(
    @Param('organizationId') organizationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.liveService.getCurrent(
      organizationId,
      req.user?.id,
    );
  }

  /* ==========================================================================
     UPCOMING
  ========================================================================== */

  @Get('upcoming')
  getUpcoming(
    @Param('organizationId') organizationId: string,
    @Query() query: ListLiveEventsQuery,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.liveService.getUpcoming(
      organizationId,
      {
        page: query.page
          ? Number(query.page)
          : undefined,

        pageSize: query.pageSize
          ? Number(query.pageSize)
          : undefined,

        search: query.search,
      },
      req.user?.id,
    );
  }

  /* ==========================================================================
     CREATE
  ========================================================================== */

  @Post()
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateLiveEventDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.liveService.create(
      organizationId,
      dto,
      req.user!.id,
    );
  }

  /* ==========================================================================
     UPDATE
  ========================================================================== */

  @Patch(':liveEventId')
  update(
    @Param('organizationId') organizationId: string,
    @Param('liveEventId') liveEventId: string,
    @Body() dto: UpdateLiveEventDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.liveService.update(
      organizationId,
      liveEventId,
      dto,
      req.user!.id,
    );
  }

  /* ==========================================================================
     UPDATE STATE
  ========================================================================== */

  @Patch(':liveEventId/state')
  updateState(
    @Param('organizationId') organizationId: string,
    @Param('liveEventId') liveEventId: string,
    @Body() dto: UpdateLiveStateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.liveService.updateState(
      organizationId,
      liveEventId,
      dto.state,
      req.user!.id,
    );
  }

  /* ==========================================================================
     DELETE
  ========================================================================== */

  @Delete(':liveEventId')
  remove(
    @Param('organizationId') organizationId: string,
    @Param('liveEventId') liveEventId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.liveService.remove(
      organizationId,
      liveEventId,
      req.user!.id,
    );
  }

  /* ==========================================================================
     JOIN
  ========================================================================== */

  @Post(':liveEventId/join')
  join(
    @Param('organizationId') organizationId: string,
    @Param('liveEventId') liveEventId: string,
    @Body() dto: JoinLiveEventDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.liveService.join(
      organizationId,
      liveEventId,
      req.user?.id,
      {
        guestEmail: dto.guestEmail,
      },
    );
  }
}