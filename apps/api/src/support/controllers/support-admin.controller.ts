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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { memoryStorage } from "multer";

import { RbacGuard } from "../../admin/rbac/rbac.guard";
import { Permissions } from "../../admin/rbac/permissions.decorator";
import { Permission } from "../../admin/rbac/permissions.enum";
import { actorId, hasPermission } from "../../reports/utils/actor";
import type { Actor } from "../../reports/utils/actor";
import { ATTACHMENT_MAX_BYTES, HELP_IMAGE_MAX_BYTES } from "../support.constants";
import {
  AgentReplyDto,
  ArchiveDto,
  ArticleStatusDto,
  AssignDto,
  FeedbackResponseDto,
  FeedbackStatusDto,
  ListArticlesQueryDto,
  ListFeedbackQueryDto,
  ListTicketsQueryDto,
  NoteDto,
  SaveArticleDto,
  SetPriorityDto,
  SetStatusDto,
  UpdateSupportSettingsDto,
} from "../dto/support.dto";
import { HelpArticlesService } from "../services/help-articles.service";
import { SupportAttachmentsService, type UploadedSupportFile } from "../services/support-attachments.service";
import { SupportDashboardService } from "../services/support-dashboard.service";
import { SupportFeedbackService } from "../services/support-feedback.service";
import { SupportStaffService } from "../services/support-staff.service";
import { SupportService } from "../services/support.service";

type AuthenticatedRequest = Omit<Request, "user"> & { user: Actor };

const P = Permission;

/**
 * Admin Center → Support & Moderation (support side). Every route is
 * checked by RbacGuard with the support.* permissions:
 *   support.view     read inboxes, tickets, chats and the dashboard
 *   support.respond  reply and add internal notes
 *   support.assign   assign, transfer, escalate
 *   support.resolve  status, priority, close / reopen, archive
 *   support.settings live chat availability
 *   help.content.manage  Help Articles Manager
 */
@Controller("admin/support")
@UseGuards(RbacGuard)
export class SupportAdminController {
  constructor(
    private readonly support: SupportService,
    private readonly feedback: SupportFeedbackService,
    private readonly articles: HelpArticlesService,
    private readonly dashboard: SupportDashboardService,
    private readonly staff: SupportStaffService,
    private readonly files: SupportAttachmentsService,
  ) {}

  private agentId(req: AuthenticatedRequest): string {
    const id = actorId(req.user);
    if (!id) throw new BadRequestException("Authenticated user ID was not found.");
    return id;
  }

  /* ---------------- dashboard ---------------- */

  @Get("dashboard")
  @Permissions(P.SUPPORT_VIEW)
  overview() {
    return this.dashboard.overview();
  }

  @Get("recent")
  @Permissions(P.SUPPORT_VIEW)
  recent(@Req() req: AuthenticatedRequest) {
    // Report rows quote reported content, so only moderators get them.
    return this.dashboard.recent(12, hasPermission(req.user, P.MODERATION_VIEW));
  }

  @Get("stats")
  @Permissions(P.SUPPORT_VIEW)
  stats() {
    return this.support.stats();
  }

  @Get("staff")
  @Permissions(P.SUPPORT_VIEW)
  async staffList() {
    return { items: await this.staff.list() };
  }

  @Post("attachments")
  @Permissions(P.SUPPORT_RESPOND)
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: ATTACHMENT_MAX_BYTES, files: 1 } }))
  upload(@Req() req: AuthenticatedRequest, @UploadedFile() file?: UploadedSupportFile) {
    return this.files.upload(this.agentId(req), file, true);
  }

  /* ---------------- tickets & chats ---------------- */

  @Get("tickets")
  @Permissions(P.SUPPORT_VIEW)
  list(@Req() req: AuthenticatedRequest, @Query() query: ListTicketsQueryDto) {
    return this.support.list(this.agentId(req), query);
  }

  @Get("tickets/:id")
  @Permissions(P.SUPPORT_VIEW)
  one(@Param("id") id: string) {
    return this.support.getForAgent(id);
  }

  @Get("tickets/:id/file")
  @Permissions(P.SUPPORT_VIEW)
  ticketFile(@Param("id") id: string, @Query("key") key: string) {
    return this.support.agentFileLink(id, String(key ?? ""));
  }

  @Post("tickets/:id/messages")
  @Permissions(P.SUPPORT_VIEW, P.SUPPORT_RESPOND)
  reply(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: AgentReplyDto) {
    return this.support.replyAsAgent(this.agentId(req), id, dto);
  }

  @Post("tickets/:id/notes")
  @Permissions(P.SUPPORT_VIEW, P.SUPPORT_RESPOND)
  ticketNote(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: NoteDto) {
    return this.support.addNote(this.agentId(req), id, dto.body);
  }

  @Patch("tickets/:id/status")
  @Permissions(P.SUPPORT_VIEW, P.SUPPORT_RESOLVE)
  setStatus(@Param("id") id: string, @Body() dto: SetStatusDto) {
    return this.support.setStatus(id, dto.status);
  }

  @Patch("tickets/:id/priority")
  @Permissions(P.SUPPORT_VIEW, P.SUPPORT_RESOLVE)
  setPriority(@Param("id") id: string, @Body() dto: SetPriorityDto) {
    return this.support.setPriority(id, dto.priority);
  }

  /** Assign, accept (assign to yourself) or transfer a ticket or chat. */
  @Patch("tickets/:id/assign")
  @Permissions(P.SUPPORT_VIEW, P.SUPPORT_ASSIGN)
  assign(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: AssignDto) {
    return this.support.assign(this.agentId(req), id, dto.assigneeId ?? null);
  }

  @Post("tickets/:id/escalate")
  @Permissions(P.SUPPORT_VIEW, P.SUPPORT_ASSIGN)
  escalate(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: NoteDto) {
    return this.support.escalate(this.agentId(req), id, dto.body);
  }

  @Get("settings")
  @Permissions(P.SUPPORT_VIEW)
  settings() {
    return this.support.getSettings();
  }

  @Patch("settings")
  @Permissions(P.SUPPORT_SETTINGS)
  updateSettings(@Req() req: AuthenticatedRequest, @Body() dto: UpdateSupportSettingsDto) {
    return this.support.updateSettings(this.agentId(req), dto.liveChatOnline);
  }

  /* ---------------- feedback ---------------- */

  @Get("feedback")
  @Permissions(P.SUPPORT_VIEW)
  feedbackList(@Req() req: AuthenticatedRequest, @Query() query: ListFeedbackQueryDto) {
    return this.feedback.list(this.agentId(req), query);
  }

  @Get("feedback/:id")
  @Permissions(P.SUPPORT_VIEW)
  feedbackOne(@Param("id") id: string) {
    return this.feedback.get(id);
  }

  @Get("feedback/:id/file")
  @Permissions(P.SUPPORT_VIEW)
  feedbackFile(@Param("id") id: string, @Query("key") key: string) {
    return this.feedback.fileLink(id, String(key ?? ""));
  }

  @Post("feedback/:id/responses")
  @Permissions(P.SUPPORT_VIEW, P.SUPPORT_RESPOND)
  feedbackRespond(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: FeedbackResponseDto) {
    return this.feedback.respond(this.agentId(req), id, dto);
  }

  @Post("feedback/:id/notes")
  @Permissions(P.SUPPORT_VIEW, P.SUPPORT_RESPOND)
  feedbackNote(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: NoteDto) {
    return this.feedback.addNote(this.agentId(req), id, dto.body);
  }

  @Patch("feedback/:id/status")
  @Permissions(P.SUPPORT_VIEW, P.SUPPORT_RESOLVE)
  feedbackStatus(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: FeedbackStatusDto) {
    return this.feedback.setStatus(this.agentId(req), id, dto.status);
  }

  @Patch("feedback/:id/assign")
  @Permissions(P.SUPPORT_VIEW, P.SUPPORT_ASSIGN)
  feedbackAssign(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: AssignDto) {
    return this.feedback.assign(this.agentId(req), id, dto.assigneeId ?? null);
  }

  @Patch("feedback/:id/archive")
  @Permissions(P.SUPPORT_VIEW, P.SUPPORT_RESOLVE)
  feedbackArchive(@Param("id") id: string, @Body() dto: ArchiveDto) {
    return this.feedback.archive(id, dto.archived);
  }

  /* ---------------- help articles ---------------- */

  @Get("articles")
  @Permissions(P.HELP_CONTENT_MANAGE)
  articleList(@Query() query: ListArticlesQueryDto) {
    return this.articles.list(query);
  }

  @Get("articles/:id")
  @Permissions(P.HELP_CONTENT_MANAGE)
  articleOne(@Param("id") id: string) {
    return this.articles.get(id);
  }

  @Post("articles")
  @Permissions(P.HELP_CONTENT_MANAGE)
  articleCreate(@Req() req: AuthenticatedRequest, @Body() dto: SaveArticleDto) {
    return this.articles.create(this.agentId(req), dto);
  }

  @Put("articles/:id")
  @Permissions(P.HELP_CONTENT_MANAGE)
  articleUpdate(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: SaveArticleDto) {
    return this.articles.update(this.agentId(req), id, dto);
  }

  @Patch("articles/:id/status")
  @Permissions(P.HELP_CONTENT_MANAGE)
  articleStatus(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ArticleStatusDto) {
    return this.articles.setStatus(this.agentId(req), id, dto.status);
  }

  @Delete("articles/:id")
  @Permissions(P.HELP_CONTENT_MANAGE)
  articleDelete(@Param("id") id: string) {
    return this.articles.remove(id);
  }

  @Post("articles/images")
  @Permissions(P.HELP_CONTENT_MANAGE)
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: HELP_IMAGE_MAX_BYTES, files: 1 } }))
  articleImage(@UploadedFile() file?: UploadedSupportFile) {
    return this.files.uploadHelpImage(file);
  }
}
