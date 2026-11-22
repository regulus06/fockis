/**
 * communities.controller.ts
 * -----------------------------------------------------------------------------
 * Groups & Communities API: /church/organizations/:organizationId/communities/…
 *
 * A separate prefix from the existing /groups endpoints (which keep working).
 * Every route needs a signed-in user except the invitation-link preview;
 * permissions are enforced in the services.
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
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

import { Public } from '../../auth/public.decorator';
import { MEDIA_UPLOAD_ROOT, MEDIA_UPLOAD_TYPES, ChurchMediaService } from '../media/services/church-media.service';
import { CommunitiesService } from './communities.service';
import { CommunityAccessService } from './community-access.service';
import { CommunityContentService } from './community-content.service';
import { CommunityFinanceService } from './community-finance.service';

type Payload = Record<string, any>;
const INCOMING = join(MEDIA_UPLOAD_ROOT, '_incoming');

export function userIdOf(req: Request): string {
  const u = req.user as { id?: string; _id?: string; userId?: string } | undefined;
  const id = u?.id ?? u?.userId ?? u?._id;
  if (!id) throw new UnauthorizedException('Sign in to continue.');
  return String(id);
}

/** Same disk storage as the church media library (validated by type). */
export const groupUpload = (maxBytes: number) =>
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
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => cb(null, Boolean(MEDIA_UPLOAD_TYPES[String(file.mimetype ?? '').toLowerCase()])),
  });

@Controller('organizations/:organizationId/communities')
export class CommunitiesController {
  constructor(
    private readonly groups: CommunitiesService,
    private readonly access: CommunityAccessService,
    private readonly finance: CommunityFinanceService,
    private readonly media: ChurchMediaService,
  ) {}

  /* ---------------------------------------------------------- dashboard */

  @Get('dashboard')
  dashboard(@Param('organizationId') org: string, @Req() req: Request) {
    return this.groups.dashboard(org, userIdOf(req));
  }

  @Get('policy')
  async policy(@Param('organizationId') org: string, @Req() req: Request) {
    const actor = await this.access.actor(org, userIdOf(req));
    return { ...(await this.access.policy(org)), canConfigure: actor.canConfigure };
  }

  @Put('policy')
  savePolicy(@Param('organizationId') org: string, @Body() b: Payload, @Req() req: Request) {
    return this.access.savePolicy(org, userIdOf(req), { roles: b?.roles ?? {}, allowProposals: b?.allowProposals, defaults: b?.defaults ?? {} });
  }

  @Get('reports')
  reports(@Param('organizationId') org: string, @Req() req: Request) {
    return this.finance.churchReport(org, userIdOf(req));
  }

  @Get('finance')
  churchFinance(@Param('organizationId') org: string, @Req() req: Request) {
    return this.finance.churchFinance(org, userIdOf(req));
  }

  @Get('my-contributions')
  myContributions(@Param('organizationId') org: string, @Req() req: Request) {
    return this.finance.myContributions(org, userIdOf(req));
  }

  @Get('deleted')
  deleted(@Param('organizationId') org: string, @Req() req: Request) {
    return this.groups.deletedGroups(org, userIdOf(req));
  }

  /** Supporting documents for proposals (any active church member). */
  @Throttle({ default: { limit: 20, ttl: 60 * 60 * 1000 } })
  @Post('files')
  @UseInterceptors(groupUpload(25 * 1024 * 1024))
  async uploadFile(@Param('organizationId') org: string, @UploadedFile() file: any, @Req() req: Request) {
    const actor = await this.access.actor(org, userIdOf(req));
    if (!actor.active) throw new BadRequestException('Only active church members can upload files.');
    if (!file) throw new BadRequestException('This file type is not supported.');
    const kind = MEDIA_UPLOAD_TYPES[String(file.mimetype).toLowerCase()];
    const stored = (await this.media.storeAuthorizedUpload(org, file, kind.type)) as { fileUrl: string };
    return { fileUrl: stored.fileUrl, fileName: file.originalname ?? '' };
  }

  /* ---------------------------------------------------------- proposals */

  @Get('proposals')
  proposals(@Param('organizationId') org: string, @Query() q: Payload, @Req() req: Request) {
    return this.groups.listProposals(org, userIdOf(req), q ?? {});
  }

  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } })
  @Post('proposals')
  propose(@Param('organizationId') org: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.createProposal(org, userIdOf(req), b ?? {});
  }

  @Patch('proposals/:id')
  updateProposal(@Param('organizationId') org: string, @Param('id') id: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.updateProposal(org, userIdOf(req), id, b ?? {});
  }

  @Post('proposals/:id/review')
  reviewProposal(@Param('organizationId') org: string, @Param('id') id: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.reviewProposal(org, userIdOf(req), id, { status: String(b?.status ?? ''), note: String(b?.note ?? '') });
  }

  @Post('proposals/:id/convert')
  convertProposal(@Param('organizationId') org: string, @Param('id') id: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.convertProposal(org, userIdOf(req), id, { publish: b?.publish !== false, leaderMembershipId: b?.leaderMembershipId });
  }

  @Delete('proposals/:id')
  withdrawProposal(@Param('organizationId') org: string, @Param('id') id: string, @Req() req: Request) {
    return this.groups.withdrawProposal(org, userIdOf(req), id);
  }

  /* ----------------------------------------------------------- requests */

  @Get('requests')
  requests(@Param('organizationId') org: string, @Query() q: Payload, @Req() req: Request) {
    return this.groups.listRequests(org, userIdOf(req), q ?? {});
  }

  @Post('requests/:id/review')
  reviewRequest(@Param('organizationId') org: string, @Param('id') id: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.reviewRequest(org, userIdOf(req), id, { decision: String(b?.decision ?? ''), note: String(b?.note ?? '') });
  }

  @Post('requests/:id/withdraw')
  withdrawRequest(@Param('organizationId') org: string, @Param('id') id: string, @Req() req: Request) {
    return this.groups.withdrawRequest(org, userIdOf(req), id);
  }

  /* -------------------------------------------------------- invitations */

  @Get('invitations')
  invitations(@Param('organizationId') org: string, @Query() q: Payload, @Req() req: Request) {
    return this.groups.listInvitations(org, userIdOf(req), q ?? {});
  }

  @Post('invitations/:id/respond')
  respond(@Param('organizationId') org: string, @Param('id') id: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.respondInvitation(org, userIdOf(req), id, b?.accept === true);
  }

  @Post('invitations/:id/revoke')
  revoke(@Param('organizationId') org: string, @Param('id') id: string, @Req() req: Request) {
    return this.groups.revokeInvitation(org, userIdOf(req), id);
  }

  /** Invitation link preview (works before signing in). */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60 * 1000 } })
  @Get('invitation-links/:token')
  invitationLink(@Param('organizationId') org: string, @Param('token') token: string) {
    return this.groups.invitationByToken(org, token);
  }

  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  @Post('invitation-links/:token')
  respondLink(@Param('organizationId') org: string, @Param('token') token: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.acceptByToken(org, userIdOf(req), token, b?.accept !== false);
  }

  /* -------------------------------------------------------------- groups */

  @Post('groups')
  create(@Param('organizationId') org: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.create(org, userIdOf(req), b ?? {});
  }

  @Get('groups/:groupId')
  profile(@Param('organizationId') org: string, @Param('groupId') gid: string, @Req() req: Request) {
    return this.groups.profile(org, userIdOf(req), gid);
  }

  @Patch('groups/:groupId')
  update(@Param('organizationId') org: string, @Param('groupId') gid: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.update(org, userIdOf(req), gid, b ?? {});
  }

  @Post('groups/:groupId/archive')
  archive(@Param('organizationId') org: string, @Param('groupId') gid: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.archive(org, userIdOf(req), gid, b?.restore === true);
  }

  @Post('groups/:groupId/delete')
  softDelete(@Param('organizationId') org: string, @Param('groupId') gid: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.softDelete(org, userIdOf(req), gid, b?.undo === true);
  }

  @Throttle({ default: { limit: 10, ttl: 10 * 60 * 1000 } })
  @Post('groups/:groupId/join')
  join(@Param('organizationId') org: string, @Param('groupId') gid: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.join(org, userIdOf(req), gid, { message: b?.message });
  }

  @Post('groups/:groupId/leave')
  leave(@Param('organizationId') org: string, @Param('groupId') gid: string, @Req() req: Request) {
    return this.groups.leave(org, userIdOf(req), gid);
  }

  @Throttle({ default: { limit: 20, ttl: 60 * 60 * 1000 } })
  @Post('groups/:groupId/invitations')
  invite(@Param('organizationId') org: string, @Param('groupId') gid: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.invite(org, userIdOf(req), gid, b ?? {});
  }

  @Get('groups/:groupId/members')
  members(@Param('organizationId') org: string, @Param('groupId') gid: string, @Query() q: Payload, @Req() req: Request) {
    return this.groups.members(org, userIdOf(req), gid, q ?? {});
  }

  @Get('groups/:groupId/candidates')
  candidates(@Param('organizationId') org: string, @Param('groupId') gid: string, @Query('search') s: string, @Req() req: Request) {
    return this.groups.candidates(org, userIdOf(req), gid, s ?? '');
  }

  @Post('groups/:groupId/members')
  addMember(@Param('organizationId') org: string, @Param('groupId') gid: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.addMember(org, userIdOf(req), gid, String(b?.membershipId ?? ''));
  }

  @Patch('groups/:groupId/members/:membershipId')
  updateMember(@Param('organizationId') org: string, @Param('groupId') gid: string, @Param('membershipId') mid: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.updateMember(org, userIdOf(req), gid, mid, b ?? {});
  }

  @Delete('groups/:groupId/members/:membershipId')
  removeMember(@Param('organizationId') org: string, @Param('groupId') gid: string, @Param('membershipId') mid: string, @Req() req: Request) {
    return this.groups.removeMember(org, userIdOf(req), gid, mid);
  }

  @Get('groups/:groupId/members/:membershipId/history')
  history(@Param('organizationId') org: string, @Param('groupId') gid: string, @Param('membershipId') mid: string, @Req() req: Request) {
    return this.groups.memberHistory(org, userIdOf(req), gid, mid);
  }

  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } })
  @Post('groups/:groupId/message')
  message(@Param('organizationId') org: string, @Param('groupId') gid: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.messageMembers(org, userIdOf(req), gid, b ?? {});
  }

  @Get('groups/:groupId/teams')
  teams(@Param('organizationId') org: string, @Param('groupId') gid: string, @Req() req: Request) {
    return this.groups.teams(org, userIdOf(req), gid);
  }

  @Post('groups/:groupId/teams')
  createTeam(@Param('organizationId') org: string, @Param('groupId') gid: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.saveTeam(org, userIdOf(req), gid, null, b ?? {});
  }

  @Patch('groups/:groupId/teams/:teamId')
  updateTeam(@Param('organizationId') org: string, @Param('groupId') gid: string, @Param('teamId') tid: string, @Body() b: Payload, @Req() req: Request) {
    return this.groups.saveTeam(org, userIdOf(req), gid, tid, b ?? {});
  }

  @Delete('groups/:groupId/teams/:teamId')
  deleteTeam(@Param('organizationId') org: string, @Param('groupId') gid: string, @Param('teamId') tid: string, @Req() req: Request) {
    return this.groups.deleteTeam(org, userIdOf(req), gid, tid);
  }

  @Get('groups/:groupId/audit')
  audit(@Param('organizationId') org: string, @Param('groupId') gid: string, @Req() req: Request) {
    return this.groups.auditLog(org, userIdOf(req), gid);
  }
}

/* ============================================================================
 * Content and finance inside one group
 * ========================================================================== */

@Controller('organizations/:organizationId/communities/groups/:groupId')
export class GroupContentController {
  constructor(
    private readonly content: CommunityContentService,
    private readonly finance: CommunityFinanceService,
    private readonly access: CommunityAccessService,
    private readonly media: ChurchMediaService,
  ) {}

  /* posts */
  @Get('posts')
  posts(@Param('organizationId') o: string, @Param('groupId') g: string, @Query('kind') kind: string, @Req() req: Request) {
    return this.content.posts(o, userIdOf(req), g, kind ?? 'announcement');
  }

  @Throttle({ default: { limit: 30, ttl: 60 * 60 * 1000 } })
  @Post('posts')
  createPost(@Param('organizationId') o: string, @Param('groupId') g: string, @Body() b: Payload, @Req() req: Request) {
    return this.content.createPost(o, userIdOf(req), g, b ?? {});
  }

  @Post('posts/:postId/comments')
  comment(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('postId') p: string, @Body() b: Payload, @Req() req: Request) {
    return this.content.comment(o, userIdOf(req), g, p, String(b?.body ?? ''));
  }

  @Delete('posts/:postId')
  deletePost(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('postId') p: string, @Req() req: Request) {
    return this.content.deletePost(o, userIdOf(req), g, p);
  }

  @Delete('posts/:postId/comments/:commentId')
  deleteComment(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('postId') p: string, @Param('commentId') c: string, @Req() req: Request) {
    return this.content.deletePost(o, userIdOf(req), g, p, c);
  }

  /* Bible study */
  @Get('lessons')
  lessons(@Param('organizationId') o: string, @Param('groupId') g: string, @Req() req: Request) {
    return this.content.lessons(o, userIdOf(req), g);
  }

  @Post('lessons')
  createLesson(@Param('organizationId') o: string, @Param('groupId') g: string, @Body() b: Payload, @Req() req: Request) {
    return this.content.saveLesson(o, userIdOf(req), g, null, b ?? {});
  }

  @Patch('lessons/:lessonId')
  updateLesson(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('lessonId') l: string, @Body() b: Payload, @Req() req: Request) {
    return this.content.saveLesson(o, userIdOf(req), g, l, b ?? {});
  }

  @Delete('lessons/:lessonId')
  deleteLesson(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('lessonId') l: string, @Req() req: Request) {
    return this.content.deleteLesson(o, userIdOf(req), g, l);
  }

  @Put('lessons/:lessonId/note')
  saveNote(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('lessonId') l: string, @Body() b: Payload, @Req() req: Request) {
    return this.content.saveLessonNote(o, userIdOf(req), g, l, b ?? {});
  }

  @Get('lessons/:lessonId/answers')
  answers(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('lessonId') l: string, @Req() req: Request) {
    return this.content.lessonAnswers(o, userIdOf(req), g, l);
  }

  /* prayer */
  @Get('prayers')
  prayers(@Param('organizationId') o: string, @Param('groupId') g: string, @Query() q: Payload, @Req() req: Request) {
    return this.content.prayers(o, userIdOf(req), g, q ?? {});
  }

  @Throttle({ default: { limit: 20, ttl: 60 * 60 * 1000 } })
  @Post('prayers')
  createPrayer(@Param('organizationId') o: string, @Param('groupId') g: string, @Body() b: Payload, @Req() req: Request) {
    return this.content.createPrayer(o, userIdOf(req), g, b ?? {});
  }

  @Patch('prayers/:prayerId')
  updatePrayer(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('prayerId') p: string, @Body() b: Payload, @Req() req: Request) {
    return this.content.updatePrayer(o, userIdOf(req), g, p, { status: b?.status, response: b?.response });
  }

  /* meetings */
  @Get('meetings')
  meetings(@Param('organizationId') o: string, @Param('groupId') g: string, @Query() q: Payload, @Req() req: Request) {
    return this.content.meetings(o, userIdOf(req), g, q ?? {});
  }

  @Post('meetings')
  createMeeting(@Param('organizationId') o: string, @Param('groupId') g: string, @Body() b: Payload, @Req() req: Request) {
    return this.content.saveMeeting(o, userIdOf(req), g, null, b ?? {});
  }

  @Patch('meetings/:meetingId')
  updateMeeting(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('meetingId') m: string, @Body() b: Payload, @Req() req: Request) {
    return this.content.saveMeeting(o, userIdOf(req), g, m, b ?? {});
  }

  @Delete('meetings/:meetingId')
  deleteMeeting(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('meetingId') m: string, @Req() req: Request) {
    return this.content.deleteMeeting(o, userIdOf(req), g, m);
  }

  @Post('meetings/:meetingId/register')
  register(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('meetingId') m: string, @Body() b: Payload, @Req() req: Request) {
    return this.content.registerMeeting(o, userIdOf(req), g, m, b?.register !== false);
  }

  /* activities */
  @Get('activities')
  activities(@Param('organizationId') o: string, @Param('groupId') g: string, @Query() q: Payload, @Req() req: Request) {
    return this.content.activities(o, userIdOf(req), g, q ?? {});
  }

  @Post('activities')
  createActivity(@Param('organizationId') o: string, @Param('groupId') g: string, @Body() b: Payload, @Req() req: Request) {
    return this.content.saveActivity(o, userIdOf(req), g, null, b ?? {});
  }

  @Patch('activities/:eventId')
  updateActivity(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('eventId') e: string, @Body() b: Payload, @Req() req: Request) {
    return this.content.saveActivity(o, userIdOf(req), g, e, b ?? {});
  }

  @Delete('activities/:eventId')
  deleteActivity(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('eventId') e: string, @Req() req: Request) {
    return this.content.deleteActivity(o, userIdOf(req), g, e);
  }

  @Post('activities/:eventId/rsvp')
  rsvp(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('eventId') e: string, @Body() b: Payload, @Req() req: Request) {
    return this.content.rsvpActivity(o, userIdOf(req), g, e, String(b?.status ?? ''));
  }

  @Get('calendar')
  calendar(@Param('organizationId') o: string, @Param('groupId') g: string, @Query() q: Payload, @Req() req: Request) {
    return this.content.calendar(o, userIdOf(req), g, q ?? {});
  }

  /* attendance */
  @Get('attendance')
  attendance(@Param('organizationId') o: string, @Param('groupId') g: string, @Req() req: Request) {
    return this.content.attendanceSummary(o, userIdOf(req), g);
  }

  @Get('attendance/sheet')
  sheet(@Param('organizationId') o: string, @Param('groupId') g: string, @Query() q: Payload, @Req() req: Request) {
    return this.content.attendanceSheet(o, userIdOf(req), g, q ?? {});
  }

  @Post('attendance')
  record(@Param('organizationId') o: string, @Param('groupId') g: string, @Body() b: Payload, @Req() req: Request) {
    return this.content.recordAttendance(o, userIdOf(req), g, b ?? {});
  }

  /* tasks */
  @Get('tasks')
  tasks(@Param('organizationId') o: string, @Param('groupId') g: string, @Query() q: Payload, @Req() req: Request) {
    return this.content.tasks(o, userIdOf(req), g, q ?? {});
  }

  @Post('tasks')
  createTask(@Param('organizationId') o: string, @Param('groupId') g: string, @Body() b: Payload, @Req() req: Request) {
    return this.content.saveTask(o, userIdOf(req), g, null, b ?? {});
  }

  @Patch('tasks/:taskId')
  updateTask(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('taskId') t: string, @Body() b: Payload, @Req() req: Request) {
    return this.content.saveTask(o, userIdOf(req), g, t, b ?? {});
  }

  @Delete('tasks/:taskId')
  deleteTask(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('taskId') t: string, @Req() req: Request) {
    return this.content.deleteTask(o, userIdOf(req), g, t);
  }

  /* documents */
  @Get('documents')
  documents(@Param('organizationId') o: string, @Param('groupId') g: string, @Req() req: Request) {
    return this.content.documents(o, userIdOf(req), g);
  }

  @Throttle({ default: { limit: 40, ttl: 60 * 60 * 1000 } })
  @Post('documents')
  @UseInterceptors(groupUpload(100 * 1024 * 1024))
  upload(@Param('organizationId') o: string, @Param('groupId') g: string, @UploadedFile() file: any, @Body() b: Payload, @Req() req: Request) {
    return this.content.uploadDocument(o, userIdOf(req), g, file, { title: b?.title, category: b?.category, access: b?.access });
  }

  @Delete('documents/:documentId')
  deleteDocument(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('documentId') d: string, @Req() req: Request) {
    return this.content.deleteDocument(o, userIdOf(req), g, d);
  }

  /** Attachments: receipts, prayer attachments, task files, campaign covers (group members). */
  @Throttle({ default: { limit: 40, ttl: 60 * 60 * 1000 } })
  @Post('files')
  @UseInterceptors(groupUpload(25 * 1024 * 1024))
  async attach(@Param('organizationId') o: string, @Param('groupId') g: string, @UploadedFile() file: any, @Req() req: Request) {
    await this.access.requireMember(o, userIdOf(req), g);
    if (!file) throw new BadRequestException('This file type is not supported.');
    const kind = MEDIA_UPLOAD_TYPES[String(file.mimetype).toLowerCase()];
    const stored = (await this.media.storeAuthorizedUpload(o, file, kind.type)) as { fileUrl: string };
    return { fileUrl: stored.fileUrl, fileName: file.originalname ?? '' };
  }

  /* finance */
  @Get('finance')
  financeSummary(@Param('organizationId') o: string, @Param('groupId') g: string, @Req() req: Request) {
    return this.finance.summary(o, userIdOf(req), g);
  }

  @Get('finance/transactions')
  transactions(@Param('organizationId') o: string, @Param('groupId') g: string, @Query() q: Payload, @Req() req: Request) {
    return this.finance.transactions(o, userIdOf(req), g, q ?? {});
  }

  @Post('finance/records')
  createRecord(@Param('organizationId') o: string, @Param('groupId') g: string, @Body() b: Payload, @Req() req: Request) {
    return this.finance.createRecord(o, userIdOf(req), g, b ?? {});
  }

  @Post('finance/records/:txId/decide')
  decide(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('txId') t: string, @Body() b: Payload, @Req() req: Request) {
    return this.finance.decide(o, userIdOf(req), g, t, { action: b?.action, note: b?.note });
  }

  @Throttle({ default: { limit: 10, ttl: 10 * 60 * 1000 } })
  @Post('contributions')
  contribute(@Param('organizationId') o: string, @Param('groupId') g: string, @Body() b: Payload, @Req() req: Request) {
    return this.finance.startContribution(o, userIdOf(req), g, b ?? {});
  }

  @Post('contributions/:txId/confirm')
  confirm(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('txId') t: string, @Body() b: Payload, @Req() req: Request) {
    return this.finance.confirmContribution(o, userIdOf(req), g, t, String(b?.paymentIntentId ?? ''));
  }

  @Get('campaigns')
  campaigns(@Param('organizationId') o: string, @Param('groupId') g: string, @Req() req: Request) {
    return this.finance.campaigns(o, userIdOf(req), g);
  }

  @Post('campaigns')
  createCampaign(@Param('organizationId') o: string, @Param('groupId') g: string, @Body() b: Payload, @Req() req: Request) {
    return this.finance.saveCampaign(o, userIdOf(req), g, null, b ?? {});
  }

  @Patch('campaigns/:campaignId')
  updateCampaign(@Param('organizationId') o: string, @Param('groupId') g: string, @Param('campaignId') c: string, @Body() b: Payload, @Req() req: Request) {
    return this.finance.saveCampaign(o, userIdOf(req), g, c, b ?? {});
  }

  @Get('report')
  report(@Param('organizationId') o: string, @Param('groupId') g: string, @Req() req: Request) {
    return this.finance.groupReport(o, userIdOf(req), g);
  }
}
