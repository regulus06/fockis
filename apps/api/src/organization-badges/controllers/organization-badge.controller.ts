/**
 * organization-badge.controller.ts
 * -----------------------------------------------------------------------------
 * Fockis Organization Badge API (member ID cards with photo, number and QR).
 *
 * Signed in:
 *   GET  /organizations/:organizationId/badges/me                          my badge
 *   GET  /organizations/:organizationId/badges/design                      template + options
 *   PUT  /organizations/:organizationId/badges/design                      (admin) choose template
 *   GET  /organizations/:organizationId/badges?q=&page=&pageSize=          (admin) all badges, for printing
 *   POST /organizations/:organizationId/badges/issue-all                   (admin) make badges for every active member
 *   GET  /organizations/:organizationId/badges/members/:membershipId       (admin or that member)
 *   POST /organizations/:organizationId/badges/members/:membershipId/rebuild (admin)
 *   POST   /organizations/:organizationId/badges/members/:membershipId/photo  (that member or admin) upload photo, field "file"
 *   DELETE /organizations/:organizationId/badges/members/:membershipId/photo  (that member or admin) remove photo
 *
 * Public (what a QR scan opens):
 *   GET  /badges/verify/:token
 *   GET  /badges/photos/:filename   badge photo (random file name)
 *
 * Badges are still created automatically when a membership becomes active
 * (MembersService → OrganizationBadgeService.createOrUpdateForMembership).
 * -----------------------------------------------------------------------------
 */

import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { createReadStream } from 'fs';
import { memoryStorage } from 'multer';

import {
  MAX_BADGE_PHOTO_BYTES,
  OrganizationBadgeService,
  UploadedBadgePhoto,
} from '../services/organization-badge.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    _id?: string;
    userId?: string;
    sub?: string;
  };
}

function actorUserId(req: AuthenticatedRequest): string {
  const user = req.user;
  const userId = user?.id ?? user?._id ?? user?.userId ?? user?.sub;
  if (!userId) {
    throw new ForbiddenException('Authenticated request does not contain a user ID.');
  }
  return String(userId);
}

@Controller('organizations/:organizationId/badges')
@UseGuards(AuthGuard('jwt'))
export class OrganizationBadgeController {
  constructor(private readonly badgeService: OrganizationBadgeService) {}

  @Get('me')
  getMyBadge(@Param('organizationId') organizationId: string, @Req() req: AuthenticatedRequest) {
    return this.badgeService.getMyBadge(organizationId, actorUserId(req));
  }

  @Get('design')
  getDesign(@Param('organizationId') organizationId: string, @Req() req: AuthenticatedRequest) {
    return this.badgeService.getDesign(organizationId, actorUserId(req));
  }

  @Put('design')
  saveDesign(
    @Param('organizationId') organizationId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.badgeService.saveDesign(organizationId, actorUserId(req), body ?? {});
  }

  @Get()
  list(
    @Param('organizationId') organizationId: string,
    @Query('q') q: string | undefined,
    @Query('page') page: string | undefined,
    @Query('pageSize') pageSize: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.badgeService.listBadges(organizationId, actorUserId(req), {
      q,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post('issue-all')
  issueAll(@Param('organizationId') organizationId: string, @Req() req: AuthenticatedRequest) {
    return this.badgeService.issueAll(organizationId, actorUserId(req));
  }

  @Get('members/:membershipId')
  getMemberBadge(
    @Param('organizationId') organizationId: string,
    @Param('membershipId') membershipId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.badgeService.getMemberBadgeFor(organizationId, membershipId, actorUserId(req));
  }

  @Post('members/:membershipId/rebuild')
  rebuildBadge(
    @Param('organizationId') organizationId: string,
    @Param('membershipId') membershipId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.badgeService.rebuildBadgeFor(organizationId, membershipId, actorUserId(req));
  }

  @Post('members/:membershipId/photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_BADGE_PHOTO_BYTES, files: 1 },
    }),
  )
  uploadPhoto(
    @Param('organizationId') organizationId: string,
    @Param('membershipId') membershipId: string,
    @UploadedFile() file: UploadedBadgePhoto | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.badgeService.uploadPhoto(organizationId, membershipId, actorUserId(req), file);
  }

  @Delete('members/:membershipId/photo')
  removePhoto(
    @Param('organizationId') organizationId: string,
    @Param('membershipId') membershipId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.badgeService.removePhoto(organizationId, membershipId, actorUserId(req));
  }
}

/** No sign-in needed: anyone who scans a badge can check it. */
@Controller('badges')
export class BadgeVerifyController {
  constructor(private readonly badgeService: OrganizationBadgeService) {}

  @Get('verify/:token')
  verify(@Param('token') token: string) {
    return this.badgeService.verify(token);
  }

  @Get('photos/:filename')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('X-Content-Type-Options', 'nosniff')
  photo(@Param('filename') filename: string) {
    const found = this.badgeService.badgePhotoPath(filename);
    if (!found) throw new NotFoundException('Photo not found.');
    return new StreamableFile(createReadStream(found.path), { type: found.mimeType });
  }
}
