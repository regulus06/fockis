import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { memoryStorage } from "multer";

import { Public } from "../../auth/public.decorator";
import { actorId } from "../../reports/utils/actor";
import type { Actor } from "../../reports/utils/actor";
import { ATTACHMENT_MAX_BYTES } from "../support.constants";
import { CreateFeedbackDto, CreateTicketDto, ListMyTicketsQueryDto, TicketMessageDto } from "../dto/support.dto";
import { HelpArticlesService } from "../services/help-articles.service";
import { SupportAttachmentsService, type UploadedSupportFile } from "../services/support-attachments.service";
import { SupportFeedbackService } from "../services/support-feedback.service";
import { SupportService } from "../services/support.service";

type AuthenticatedRequest = Omit<Request, "user"> & { user?: Actor };

/**
 * Help & Support for signed-in users. The owner of every ticket and piece
 * of feedback is always the authenticated user from the JWT.
 */
@Controller("support")
export class SupportController {
  constructor(
    private readonly support: SupportService,
    private readonly feedback: SupportFeedbackService,
    private readonly articles: HelpArticlesService,
    private readonly files: SupportAttachmentsService,
  ) {}

  private userId(req: AuthenticatedRequest): string {
    const id = actorId(req.user);
    if (!id) throw new BadRequestException("Authenticated user ID was not found.");
    return id;
  }

  /* ---------------- public ---------------- */

  /** Live check of the API and database for the System Status panel. */
  @Public()
  @Get("status")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  status() {
    return this.support.status();
  }

  /** Published Help Center articles and FAQs. */
  @Public()
  @Get("help/articles")
  helpArticles() {
    return this.articles.published();
  }

  @Public()
  @Get("help/articles/:slug")
  helpArticle(@Param("slug") slug: string) {
    return this.articles.publishedBySlug(slug);
  }

  /* ---------------- overview & files ---------------- */

  @Get("overview")
  overview(@Req() req: AuthenticatedRequest) {
    return this.support.overview(this.userId(req));
  }

  /** Upload a screenshot, video, PDF or text file to attach to a message. */
  @Post("attachments")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: ATTACHMENT_MAX_BYTES, files: 1 } }))
  upload(@Req() req: AuthenticatedRequest, @UploadedFile() file?: UploadedSupportFile) {
    return this.files.upload(this.userId(req), file);
  }

  /* ---------------- tickets ---------------- */

  @Post("tickets")
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateTicketDto) {
    return this.support.create(this.userId(req), dto);
  }

  @Get("tickets")
  mine(@Req() req: AuthenticatedRequest, @Query() query: ListMyTicketsQueryDto) {
    return this.support.listMine(this.userId(req), query);
  }

  @Get("chat")
  chat(@Req() req: AuthenticatedRequest) {
    return this.support.activeChat(this.userId(req));
  }

  @Get("tickets/:id")
  one(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.support.getMine(this.userId(req), id);
  }

  @Get("tickets/:id/file")
  ticketFile(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Query("key") key: string) {
    return this.support.fileLink(this.userId(req), id, String(key ?? ""));
  }

  @Post("tickets/:id/messages")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  reply(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: TicketMessageDto) {
    return this.support.reply(this.userId(req), id, dto);
  }

  @Post("tickets/:id/reopen")
  @HttpCode(200)
  reopen(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.support.reopenMine(this.userId(req), id);
  }

  @Post("tickets/:id/close")
  @HttpCode(200)
  close(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.support.closeMine(this.userId(req), id);
  }

  /* ---------------- feedback ---------------- */

  @Post("feedback")
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  sendFeedback(@Req() req: AuthenticatedRequest, @Body() dto: CreateFeedbackDto) {
    return this.feedback.create(this.userId(req), dto);
  }

  @Get("feedback")
  myFeedback(@Req() req: AuthenticatedRequest, @Query("page") page?: string) {
    return this.feedback.listMine(this.userId(req), Math.max(1, Number(page) || 1));
  }

  @Get("feedback/:id")
  oneFeedback(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.feedback.getMine(this.userId(req), id);
  }

  @Get("feedback/:id/file")
  feedbackFile(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Query("key") key: string) {
    return this.feedback.mineFileLink(this.userId(req), id, String(key ?? ""));
  }
}
