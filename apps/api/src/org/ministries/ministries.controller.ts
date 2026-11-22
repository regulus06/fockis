/**
 * ministries.controller.ts
 * -----------------------------------------------------------------------------
 * /church/organizations/:organizationId/ministries/…
 *
 * Ministries themselves are still created, edited, archived, joined and
 * staffed through the departments API (/organizations/:id/departments);
 * this controller adds what departments did not have. Every route needs a
 * signed-in user (global JwtAuthGuard); permissions are checked in
 * MinistriesService / MinistryAccessService.
 *
 *   GET    dashboard                         stats + ministries for the viewer
 *   GET    activities?when=upcoming|past     ministry events
 *   GET    policy | PUT policy               who can create (owner edits)
 *   GET    proposals | POST proposals
 *   PATCH  proposals/:id                     edit draft / answer "more info"
 *   POST   proposals/:id/review              under_review|more_info|approved|rejected
 *   POST   proposals/:id/convert             approved → ministry
 *   DELETE proposals/:id                     withdraw
 *   GET    applications                      to review + my own
 *   POST   applications/:id/review           approve | reject
 *   POST   applications/:id/withdraw
 *   GET    reports                           church-wide ministry report
 *   GET    :ministryId/access                what the viewer may do here
 *   POST   :ministryId/apply                 rate limited
 *   GET    :ministryId/members | candidates
 *   GET/POST :ministryId/teams, PATCH/DELETE :ministryId/teams/:teamId
 *   GET/POST :ministryId/finances, POST :ministryId/finances/:id/status
 *   GET    :ministryId/documents, POST :ministryId/documents (multipart),
 *   DELETE :ministryId/documents/:documentId
 *   GET    :ministryId/report | :ministryId/audit
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
  Put,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
import type { Request } from 'express';

import { MEDIA_UPLOAD_ROOT, MEDIA_UPLOAD_TYPES } from '../media/services/church-media.service';
import { ChurchMediaType } from '../media/schemas/church-media.schema';
import { MinistriesService } from './ministries.service';
import { MinistryAccessService } from './ministry-access.service';

const INCOMING = join(MEDIA_UPLOAD_ROOT, '_incoming');
const DOCUMENT_MAX_BYTES = 50 * 1024 * 1024;

function userIdOf(req: Request): string {
  const u = req.user as { id?: string; _id?: string; userId?: string } | undefined;
  const id = u?.id ?? u?.userId ?? u?._id;
  if (!id) throw new UnauthorizedException('Sign in to continue.');
  return String(id);
}

type Payload = Record<string, unknown>;

@Controller('organizations/:organizationId/ministries')
export class MinistriesController {
  constructor(
    private readonly ministries: MinistriesService,
    private readonly access: MinistryAccessService,
  ) {}

  /* ------------------------------------------------------------ dashboard */

  @Get('dashboard')
  dashboard(@Param('organizationId') org: string, @Req() req: Request) {
    return this.ministries.dashboard(org, userIdOf(req));
  }

  @Get('activities')
  activities(@Param('organizationId') org: string, @Query() q: { when?: string; ministryId?: string }, @Req() req: Request) {
    return this.ministries.activities(org, userIdOf(req), q ?? {});
  }

  @Get('reports')
  reports(@Param('organizationId') org: string, @Req() req: Request) {
    return this.ministries.churchReport(org, userIdOf(req));
  }

  /* --------------------------------------------------------------- policy */

  @Get('policy')
  async policy(@Param('organizationId') org: string, @Req() req: Request) {
    const actor = await this.access.actor(org, userIdOf(req));
    return { ...(await this.access.policy(org)), canConfigure: actor.canConfigure };
  }

  @Put('policy')
  savePolicy(@Param('organizationId') org: string, @Body() body: Payload, @Req() req: Request) {
    return this.access.savePolicy(org, userIdOf(req), {
      roles: (body?.roles ?? {}) as Record<string, string>,
      allowProposals: body?.allowProposals as boolean | undefined,
      defaults: (body?.defaults ?? {}) as Record<string, unknown>,
    });
  }

  /* ------------------------------------------------------------ proposals */

  @Get('proposals')
  proposals(@Param('organizationId') org: string, @Query() q: { status?: string; scope?: string }, @Req() req: Request) {
    return this.ministries.listProposals(org, userIdOf(req), q ?? {});
  }

  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } })
  @Post('proposals')
  propose(@Param('organizationId') org: string, @Body() body: Payload, @Req() req: Request) {
    return this.ministries.createProposal(org, userIdOf(req), body ?? {});
  }

  @Patch('proposals/:proposalId')
  updateProposal(@Param('organizationId') org: string, @Param('proposalId') id: string, @Body() body: Payload, @Req() req: Request) {
    return this.ministries.updateProposal(org, userIdOf(req), id, body ?? {});
  }

  @Post('proposals/:proposalId/review')
  reviewProposal(@Param('organizationId') org: string, @Param('proposalId') id: string, @Body() body: Payload, @Req() req: Request) {
    return this.ministries.reviewProposal(org, userIdOf(req), id, { status: String(body?.status ?? ''), note: String(body?.note ?? '') });
  }

  @Post('proposals/:proposalId/convert')
  convertProposal(@Param('organizationId') org: string, @Param('proposalId') id: string, @Body() body: Payload, @Req() req: Request) {
    return this.ministries.convertProposal(org, userIdOf(req), id, { publish: body?.publish !== false });
  }

  @Delete('proposals/:proposalId')
  withdrawProposal(@Param('organizationId') org: string, @Param('proposalId') id: string, @Req() req: Request) {
    return this.ministries.withdrawProposal(org, userIdOf(req), id);
  }

  /* --------------------------------------------------------- applications */

  @Get('applications')
  applications(@Param('organizationId') org: string, @Query() q: { ministryId?: string; status?: string; scope?: string }, @Req() req: Request) {
    return this.ministries.listApplications(org, userIdOf(req), q ?? {});
  }

  @Post('applications/:applicationId/review')
  reviewApplication(@Param('organizationId') org: string, @Param('applicationId') id: string, @Body() body: Payload, @Req() req: Request) {
    return this.ministries.reviewApplication(org, userIdOf(req), id, { decision: String(body?.decision ?? ''), note: String(body?.note ?? '') });
  }

  @Post('applications/:applicationId/withdraw')
  withdrawApplication(@Param('organizationId') org: string, @Param('applicationId') id: string, @Req() req: Request) {
    return this.ministries.withdrawApplication(org, userIdOf(req), id);
  }

  /* --------------------------------------------------------- one ministry */

  @Get(':ministryId/access')
  myAccess(@Param('organizationId') org: string, @Param('ministryId') mid: string, @Req() req: Request) {
    return this.ministries.myAccess(org, userIdOf(req), mid);
  }

  @Throttle({ default: { limit: 5, ttl: 10 * 60 * 1000 } })
  @Post(':ministryId/apply')
  apply(@Param('organizationId') org: string, @Param('ministryId') mid: string, @Body() body: Payload, @Req() req: Request) {
    return this.ministries.apply(org, userIdOf(req), mid, { message: String(body?.message ?? '') });
  }

  @Get(':ministryId/members')
  members(@Param('organizationId') org: string, @Param('ministryId') mid: string, @Req() req: Request) {
    return this.ministries.members(org, userIdOf(req), mid);
  }

  @Get(':ministryId/candidates')
  candidates(@Param('organizationId') org: string, @Param('ministryId') mid: string, @Query('search') search: string, @Req() req: Request) {
    return this.ministries.candidates(org, userIdOf(req), mid, search ?? '');
  }

  @Get(':ministryId/teams')
  teams(@Param('organizationId') org: string, @Param('ministryId') mid: string, @Req() req: Request) {
    return this.ministries.listTeams(org, userIdOf(req), mid);
  }

  @Post(':ministryId/teams')
  createTeam(@Param('organizationId') org: string, @Param('ministryId') mid: string, @Body() body: Payload, @Req() req: Request) {
    return this.ministries.saveTeam(org, userIdOf(req), mid, null, body ?? {});
  }

  @Patch(':ministryId/teams/:teamId')
  updateTeam(@Param('organizationId') org: string, @Param('ministryId') mid: string, @Param('teamId') tid: string, @Body() body: Payload, @Req() req: Request) {
    return this.ministries.saveTeam(org, userIdOf(req), mid, tid, body ?? {});
  }

  @Delete(':ministryId/teams/:teamId')
  deleteTeam(@Param('organizationId') org: string, @Param('ministryId') mid: string, @Param('teamId') tid: string, @Req() req: Request) {
    return this.ministries.deleteTeam(org, userIdOf(req), mid, tid);
  }

  @Get(':ministryId/finances')
  finances(@Param('organizationId') org: string, @Param('ministryId') mid: string, @Req() req: Request) {
    return this.ministries.finances(org, userIdOf(req), mid);
  }

  @Throttle({ default: { limit: 20, ttl: 60 * 60 * 1000 } })
  @Post(':ministryId/finances')
  requestFunds(@Param('organizationId') org: string, @Param('ministryId') mid: string, @Body() body: Payload, @Req() req: Request) {
    return this.ministries.createFinanceRequest(org, userIdOf(req), mid, body ?? {});
  }

  @Post(':ministryId/finances/:requestId/status')
  financeStatus(@Param('organizationId') org: string, @Param('ministryId') mid: string, @Param('requestId') rid: string, @Body() body: Payload, @Req() req: Request) {
    return this.ministries.reviewFinanceRequest(org, userIdOf(req), mid, rid, { status: String(body?.status ?? ''), note: String(body?.note ?? '') });
  }

  @Get(':ministryId/documents')
  documents(@Param('organizationId') org: string, @Param('ministryId') mid: string, @Req() req: Request) {
    return this.ministries.documents(org, userIdOf(req), mid);
  }

  @Throttle({ default: { limit: 30, ttl: 60 * 60 * 1000 } })
  @Post(':ministryId/documents')
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
          const kind = MEDIA_UPLOAD_TYPES[String(file.mimetype ?? '').toLowerCase()];
          if (!/^[a-f0-9]{24}$/i.test(orgId) || !kind) {
            cb(new Error('This file cannot be uploaded.'), '');
            return;
          }
          cb(null, `${orgId.toLowerCase()}-${Date.now()}-${randomBytes(4).toString('hex')}.${kind.ext}`);
        },
      }),
      limits: { fileSize: DOCUMENT_MAX_BYTES, files: 1 },
      fileFilter: (_req, file, cb) => {
        const kind = MEDIA_UPLOAD_TYPES[String(file.mimetype ?? '').toLowerCase()];
        cb(null, Boolean(kind && kind.type === ChurchMediaType.Document));
      },
    }),
  )
  uploadDocument(
    @Param('organizationId') org: string,
    @Param('ministryId') mid: string,
    @UploadedFile() file: any,
    @Body() body: Payload,
    @Req() req: Request,
  ) {
    return this.ministries.uploadDocument(org, userIdOf(req), mid, file, { title: String(body?.title ?? ''), description: String(body?.description ?? '') });
  }

  @Delete(':ministryId/documents/:documentId')
  deleteDocument(@Param('organizationId') org: string, @Param('ministryId') mid: string, @Param('documentId') did: string, @Req() req: Request) {
    return this.ministries.deleteDocument(org, userIdOf(req), mid, did);
  }

  @Get(':ministryId/report')
  report(@Param('organizationId') org: string, @Param('ministryId') mid: string, @Req() req: Request) {
    return this.ministries.ministryReport(org, userIdOf(req), mid);
  }

  @Get(':ministryId/audit')
  audit(@Param('organizationId') org: string, @Param('ministryId') mid: string, @Req() req: Request) {
    return this.ministries.auditLog(org, userIdOf(req), mid);
  }
}
