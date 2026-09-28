/**
 * church-communication.controller.ts
 * -----------------------------------------------------------------------------
 * REST surface for the Communication area, mounted under
 * /organizations/:organizationId.
 *
 * This controller intentionally does not extend Express Request with a custom
 * AuthUser type. The application's authentication guard already provides
 * req.user, and extending Express Request here causes a TypeScript conflict
 * with the existing Express Request.user declaration.
 * -----------------------------------------------------------------------------
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';

import type { Request } from 'express';

import {
  ChurchCommunicationService,
  type PageQuery,
} from '../services/church-communication.service';

import { CreateAnnouncementDto } from '../dto/create-announcement.dto';

/**
 * Minimal request shape needed by this controller.
 *
 * We intentionally avoid `interface extends Request` because the project's
 * Express typings already define `Request.user` with a different shape.
 */
type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    _id?: string;
    userId?: string;
    sub?: string;
  };
};

function getUserId(req: AuthenticatedRequest): string {
  const userId =
    req.user?.id ??
    req.user?.userId ??
    req.user?.sub ??
    req.user?._id;

  if (!userId) {
    throw new Error('Authenticated user ID is missing.');
  }

  return String(userId);
}

@Controller('organizations/:organizationId')
export class ChurchCommunicationController {
  constructor(
    private readonly communicationService: ChurchCommunicationService,
  ) {}

  /* ==========================================================================
     ANNOUNCEMENTS
  ========================================================================== */

  @Get('announcements')
  listAnnouncements(
    @Param('organizationId') organizationId: string,
    @Query() query: PageQuery,
  ) {
    return this.communicationService.listAnnouncements(
      organizationId,
      {
        page: query.page
          ? Number(query.page)
          : undefined,

        pageSize: query.pageSize
          ? Number(query.pageSize)
          : undefined,
      },
    );
  }

  @Post('announcements')
  createAnnouncement(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateAnnouncementDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.communicationService.createAnnouncement(
      organizationId,
      dto,
      getUserId(req),
    );
  }

  @Delete('announcements/:announcementId')
  deleteAnnouncement(
    @Param('organizationId') organizationId: string,
    @Param('announcementId') announcementId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.communicationService.deleteAnnouncement(
      organizationId,
      announcementId,
      getUserId(req),
    );
  }

  /* ==========================================================================
     MESSAGES
  ========================================================================== */

  @Get('messages')
  listMessages(
    @Param('organizationId') organizationId: string,
    @Query() query: PageQuery,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.communicationService.listMessages(
      organizationId,
      getUserId(req),
      {
        page: query.page
          ? Number(query.page)
          : undefined,

        pageSize: query.pageSize
          ? Number(query.pageSize)
          : undefined,
      },
    );
  }

  /* ==========================================================================
     DEPARTMENT MESSAGES
  ========================================================================== */

  @Get('department-messages')
  listDepartmentMessages(
    @Param('organizationId') organizationId: string,
    @Query() query: PageQuery,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.communicationService.listDepartmentMessages(
      organizationId,
      getUserId(req),
      {
        page: query.page
          ? Number(query.page)
          : undefined,

        pageSize: query.pageSize
          ? Number(query.pageSize)
          : undefined,
      },
    );
  }

  /* ==========================================================================
     NOTIFICATIONS
  ========================================================================== */

  @Get('notifications')
  listNotifications(
    @Param('organizationId') organizationId: string,
    @Query() query: PageQuery,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.communicationService.listNotifications(
      organizationId,
      getUserId(req),
      {
        page: query.page
          ? Number(query.page)
          : undefined,

        pageSize: query.pageSize
          ? Number(query.pageSize)
          : undefined,
      },
    );
  }

  @Post('notifications/:notificationId/read')
  markNotificationRead(
    @Param('organizationId') organizationId: string,
    @Param('notificationId') notificationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.communicationService.markNotificationRead(
      organizationId,
      notificationId,
      getUserId(req),
    );
  }
}