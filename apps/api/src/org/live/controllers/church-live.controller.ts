/**
 * church-live.controller.ts
 * -----------------------------------------------------------------------------
 * Organization livestreams, mounted under
 *   /church/organizations/:organizationId/live
 * (ChurchModule is prefixed with "church" by RouterModule).
 *
 * Public (signed-in viewers get more):
 *   GET  /                    list the viewer may see   ?tab&search&visibility&status&page&pageSize
 *   GET  /current             the live broadcast, if any
 *   GET  /upcoming            scheduled ones
 *   GET  /public              public organization page (public + locked previews)
 *   GET  /:liveEventId        one livestream (no links or private details)
 *   POST /:liveEventId/join   access check, then where to watch + viewing session
 *   POST /:liveEventId/heartbeat | /leave   viewing session
 * Signed in:
 *   GET  /mine                member portal (live, upcoming, invitations, recordings)
 *   POST /:liveEventId/request-access
 *   POST /:liveEventId/invitations/accept   { token }
 *   POST /invitations/:invitationId/accept | /decline   (invitations addressed to me)
 * Managers (owner, administrators, Manage live permission):
 *   GET  /stats  GET /analytics?from&to  GET /:liveEventId/attendance
 *   POST /  PATCH /:liveEventId  PATCH /:liveEventId/state  DELETE /:liveEventId
 *   POST /:liveEventId/archive | /restore
 *   POST /upload (image)  POST /validate-meeting
 *   GET  /:liveEventId/invitations   POST /:liveEventId/invitations
 *   POST /invitations/:invitationId/resend | /revoke | /approve | /deny
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { randomBytes } from 'crypto';
import { mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { diskStorage } from 'multer';
import { join } from 'path';

import { Public } from '../../../auth/public.decorator';
import { OptionalJwtAuthGuard } from '../../../auth/optional-jwt-auth.guard';
import { ChurchMediaService, MEDIA_UPLOAD_ROOT } from '../../media/services/church-media.service';
import { ChurchMediaType } from '../../media/schemas/church-media.schema';
import { CreateLiveEventDto } from '../dto/create-live-event.dto';
import { ChurchLiveService, LiveEventState, type ListLiveEventsQuery } from '../services/church-live.service';

class UpdateLiveStateDto {
  @IsEnum(LiveEventState)
  state!: LiveEventState;
}

class JoinLiveEventDto {
  @IsOptional() @IsString() @MaxLength(64) visitorKey?: string;
  @IsOptional() @IsBoolean() replay?: boolean;
  /** Legacy field of the old join endpoint (ignored: invitations are account-bound). */
  @IsOptional() @IsString() guestEmail?: string;
}

class ViewSessionDto {
  @IsString() @MaxLength(24) viewId!: string;
  @IsOptional() @IsString() @MaxLength(64) visitorKey?: string;
}

class ValidateMeetingDto {
  @IsString() @MaxLength(2000) url!: string;
  @IsOptional() @IsString() visibility?: string;
}

class CreateInvitationsDto {
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) userIds?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) emails?: string[];
  @IsOptional() @IsBoolean() link?: boolean;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsString() @MaxLength(500) message?: string;
}

class AcceptInvitationDto {
  @IsString() @MaxLength(100) token!: string;
}

class RequestAccessDto {
  @IsOptional() @IsString() @MaxLength(500) message?: string;
}

const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const INCOMING = join(MEDIA_UPLOAD_ROOT, '_incoming');

type AuthedRequest = { user?: { id?: string; _id?: string; userId?: string } };

function userIdOf(req: AuthedRequest): string | undefined {
  const id = req.user?.id ?? req.user?.userId ?? req.user?._id;
  return id ? String(id) : undefined;
}

function requireUser(req: AuthedRequest): string {
  const id = userIdOf(req);
  if (!id) throw new ForbiddenException('Please sign in.');
  return id;
}

@Controller('organizations/:organizationId/live')
export class ChurchLiveController {
  constructor(
    private readonly liveService: ChurchLiveService,
    private readonly mediaService: ChurchMediaService,
  ) {}

  /* ----------------------------------------------------------------- lists */

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Param('organizationId') organizationId: string, @Query() query: ListLiveEventsQuery, @Req() req: AuthedRequest) {
    return this.liveService.listByOrganization(organizationId, query, userIdOf(req));
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('current')
  @Header('Cache-Control', 'no-store')
  getCurrent(@Param('organizationId') organizationId: string, @Req() req: AuthedRequest) {
    return this.liveService.getCurrent(organizationId, userIdOf(req));
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('upcoming')
  @Header('Cache-Control', 'no-store')
  getUpcoming(@Param('organizationId') organizationId: string, @Query() query: ListLiveEventsQuery, @Req() req: AuthedRequest) {
    return this.liveService.getUpcoming(organizationId, query, userIdOf(req));
  }

  @Public()
  @Get('public')
  publicListing(@Param('organizationId') organizationId: string, @Query('past') past?: string) {
    return this.liveService.publicListing(organizationId, past === '1' || past === 'true');
  }

  @Get('mine')
  @Header('Cache-Control', 'no-store')
  mine(@Param('organizationId') organizationId: string, @Req() req: AuthedRequest) {
    return this.liveService.mine(organizationId, requireUser(req));
  }

  /* ------------------------------------------------------------ managers */

  @Get('stats')
  @Header('Cache-Control', 'no-store')
  stats(@Param('organizationId') organizationId: string, @Req() req: AuthedRequest) {
    return this.liveService.stats(organizationId, requireUser(req));
  }

  @Get('analytics')
  @Header('Cache-Control', 'no-store')
  analytics(@Param('organizationId') organizationId: string, @Query('from') from: string, @Query('to') to: string, @Req() req: AuthedRequest) {
    return this.liveService.analytics(organizationId, requireUser(req), from, to);
  }

  @Post('validate-meeting')
  @HttpCode(200)
  validateMeeting(@Param('organizationId') organizationId: string, @Body() dto: ValidateMeetingDto, @Req() req: AuthedRequest) {
    return this.liveService.validateMeeting(organizationId, requireUser(req), dto.url, dto.visibility);
  }

  /** Thumbnail / cover upload into the organization's media library (existing storage). */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          try {
            mkdirSync(INCOMING, { recursive: true });
            cb(null, INCOMING);
          } catch (error) {
            cb(error as Error, INCOMING);
          }
        },
        filename: (req, file, cb) => {
          const orgId = String((req.params as Record<string, string>).organizationId ?? '');
          const ext = IMAGE_TYPES[String(file.mimetype ?? '').toLowerCase()];
          if (!/^[a-f0-9]{24}$/i.test(orgId) || !ext) {
            cb(new BadRequestException('This image cannot be uploaded.'), '');
            return;
          }
          cb(null, `${orgId.toLowerCase()}-${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (!IMAGE_TYPES[String(file.mimetype ?? '').toLowerCase()]) {
          cb(new BadRequestException('Choose a JPG, PNG, WebP or GIF image.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async upload(@Param('organizationId') organizationId: string, @UploadedFile() file: Express.Multer.File, @Req() req: AuthedRequest) {
    try {
      await this.liveService.assertManager(organizationId, userIdOf(req));
    } catch (error) {
      if (file?.path) await unlink(file.path).catch(() => undefined);
      throw error;
    }
    const stored = await this.mediaService.storeAuthorizedUpload(organizationId, file, ChurchMediaType.Photo);
    return { fileUrl: stored.fileUrl };
  }

  @Post()
  create(@Param('organizationId') organizationId: string, @Body() dto: CreateLiveEventDto, @Req() req: AuthedRequest) {
    return this.liveService.create(organizationId, dto, requireUser(req));
  }

  /* -------------------------------------------------------- invitations */

  @Post('invitations/:invitationId/resend')
  @HttpCode(200)
  resend(@Param('organizationId') organizationId: string, @Param('invitationId') invitationId: string, @Req() req: AuthedRequest) {
    return this.liveService.resendInvitation(organizationId, invitationId, requireUser(req));
  }

  @Post('invitations/:invitationId/revoke')
  @HttpCode(200)
  revoke(@Param('organizationId') organizationId: string, @Param('invitationId') invitationId: string, @Req() req: AuthedRequest) {
    return this.liveService.revokeInvitation(organizationId, invitationId, requireUser(req));
  }

  @Post('invitations/:invitationId/approve')
  @HttpCode(200)
  approve(@Param('organizationId') organizationId: string, @Param('invitationId') invitationId: string, @Req() req: AuthedRequest) {
    return this.liveService.respondToRequest(organizationId, invitationId, requireUser(req), true);
  }

  @Post('invitations/:invitationId/deny')
  @HttpCode(200)
  deny(@Param('organizationId') organizationId: string, @Param('invitationId') invitationId: string, @Req() req: AuthedRequest) {
    return this.liveService.respondToRequest(organizationId, invitationId, requireUser(req), false);
  }

  @Post('invitations/:invitationId/accept')
  @HttpCode(200)
  acceptMine(@Param('organizationId') organizationId: string, @Param('invitationId') invitationId: string, @Req() req: AuthedRequest) {
    return this.liveService.acceptMine(organizationId, invitationId, requireUser(req));
  }

  @Post('invitations/:invitationId/decline')
  @HttpCode(200)
  decline(@Param('organizationId') organizationId: string, @Param('invitationId') invitationId: string, @Req() req: AuthedRequest) {
    return this.liveService.declineInvitation(organizationId, invitationId, requireUser(req));
  }

  /* ---------------------------------------------------------- one stream */

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':liveEventId')
  @Header('Cache-Control', 'no-store')
  getOne(@Param('organizationId') organizationId: string, @Param('liveEventId') liveEventId: string, @Req() req: AuthedRequest) {
    return this.liveService.getOne(organizationId, liveEventId, userIdOf(req));
  }

  @Patch(':liveEventId')
  update(@Param('organizationId') organizationId: string, @Param('liveEventId') liveEventId: string, @Body() dto: CreateLiveEventDto, @Req() req: AuthedRequest) {
    return this.liveService.update(organizationId, liveEventId, dto, requireUser(req));
  }

  @Patch(':liveEventId/state')
  updateState(@Param('organizationId') organizationId: string, @Param('liveEventId') liveEventId: string, @Body() dto: UpdateLiveStateDto, @Req() req: AuthedRequest) {
    return this.liveService.updateState(organizationId, liveEventId, dto.state, requireUser(req));
  }

  @Delete(':liveEventId')
  remove(@Param('organizationId') organizationId: string, @Param('liveEventId') liveEventId: string, @Req() req: AuthedRequest) {
    return this.liveService.remove(organizationId, liveEventId, requireUser(req));
  }

  @Post(':liveEventId/archive')
  @HttpCode(200)
  archive(@Param('organizationId') organizationId: string, @Param('liveEventId') liveEventId: string, @Req() req: AuthedRequest) {
    return this.liveService.setArchived(organizationId, liveEventId, requireUser(req), true);
  }

  @Post(':liveEventId/restore')
  @HttpCode(200)
  restore(@Param('organizationId') organizationId: string, @Param('liveEventId') liveEventId: string, @Req() req: AuthedRequest) {
    return this.liveService.setArchived(organizationId, liveEventId, requireUser(req), false);
  }

  @Get(':liveEventId/attendance')
  @Header('Cache-Control', 'no-store')
  attendance(@Param('organizationId') organizationId: string, @Param('liveEventId') liveEventId: string, @Req() req: AuthedRequest) {
    return this.liveService.attendance(organizationId, liveEventId, requireUser(req));
  }

  @Get(':liveEventId/invitations')
  @Header('Cache-Control', 'no-store')
  invitations(@Param('organizationId') organizationId: string, @Param('liveEventId') liveEventId: string, @Req() req: AuthedRequest) {
    return this.liveService.listInvitations(organizationId, liveEventId, requireUser(req));
  }

  @Post(':liveEventId/invitations')
  createInvitations(@Param('organizationId') organizationId: string, @Param('liveEventId') liveEventId: string, @Body() dto: CreateInvitationsDto, @Req() req: AuthedRequest) {
    return this.liveService.createInvitations(organizationId, liveEventId, requireUser(req), dto);
  }

  @Post(':liveEventId/invitations/accept')
  @HttpCode(200)
  accept(@Param('organizationId') organizationId: string, @Param('liveEventId') liveEventId: string, @Body() dto: AcceptInvitationDto, @Req() req: AuthedRequest) {
    return this.liveService.acceptInvitation(organizationId, liveEventId, requireUser(req), dto.token);
  }

  @Post(':liveEventId/request-access')
  @HttpCode(200)
  requestAccess(@Param('organizationId') organizationId: string, @Param('liveEventId') liveEventId: string, @Body() dto: RequestAccessDto, @Req() req: AuthedRequest) {
    return this.liveService.requestAccess(organizationId, liveEventId, requireUser(req), dto.message);
  }

  /* ------------------------------------------------------------- viewers */

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post(':liveEventId/join')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  join(@Param('organizationId') organizationId: string, @Param('liveEventId') liveEventId: string, @Body() dto: JoinLiveEventDto, @Req() req: AuthedRequest) {
    return this.liveService.join(organizationId, liveEventId, userIdOf(req), { visitorKey: dto.visitorKey, replay: dto.replay });
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post(':liveEventId/heartbeat')
  @HttpCode(200)
  heartbeat(@Param('organizationId') organizationId: string, @Param('liveEventId') liveEventId: string, @Body() dto: ViewSessionDto, @Req() req: AuthedRequest) {
    return this.liveService.heartbeat(organizationId, liveEventId, dto.viewId, userIdOf(req), dto.visitorKey);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post(':liveEventId/leave')
  @HttpCode(200)
  leave(@Param('organizationId') organizationId: string, @Param('liveEventId') liveEventId: string, @Body() dto: ViewSessionDto, @Req() req: AuthedRequest) {
    return this.liveService.heartbeat(organizationId, liveEventId, dto.viewId, userIdOf(req), dto.visitorKey, true);
  }
}
