import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import type {
  Request,
} from "express";

import {
  ConversationsService,
} from "./conversations.service";

import {
  JwtAuthGuard,
} from "../auth/jwt-auth.guard";

import {
  CreateConversationDto,
} from "./dto/create-conversation.dto";
import {
  ConversationFlagDto,
  MuteConversationDto,
} from "./dto/message-actions.dto";
import {
  MessagesService,
} from "./messages.service";
import {
  MessagesGateway,
} from "./gateway/messages.gateway";

@Controller("messages/conversations")
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(
    private readonly conversationsService:
      ConversationsService,
    private readonly messagesService:
      MessagesService,
    private readonly messagesGateway:
      MessagesGateway,
  ) {}

  private userId(req: Request): string {
    return String(
      (req as any).user?.id ||
        (req as any).user?.userId ||
        (req as any).user?.sub,
    );
  }

  @Get()
  list(
    @Req() req: Request,
  ) {
    return this.conversationsService.list(
      this.userId(req),
    );
  }

  @Post()
  create(
    @Req() req: Request,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationsService.create(
      this.userId(req),
      dto,
    );
  }

  /* ==========================================================================
     ONE CONVERSATION
     GET /messages/conversations/:id
  ========================================================================== */

  @Get(":id")
  getOne(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return this.conversationsService.getById(
      id,
      this.userId(req),
    );
  }

  /* ==========================================================================
     PINNED MESSAGES
     GET /messages/conversations/:id/pinned
  ========================================================================== */

  @Get(":id/pinned")
  pinned(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return this.messagesService.listPinned(
      id,
      this.userId(req),
    );
  }

  /* ==========================================================================
     PER-USER FLAGS
     PATCH /messages/conversations/:id/(mute|pin|archive|unread)
  ========================================================================== */

  @Patch(":id/mute")
  async mute(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: MuteConversationDto,
  ) {
    return this.flag(req, id, "mutedBy", dto.muted);
  }

  @Patch(":id/pin")
  pin(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: ConversationFlagDto,
  ) {
    return this.flag(req, id, "pinnedBy", dto.value);
  }

  @Patch(":id/archive")
  archive(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: ConversationFlagDto,
  ) {
    return this.flag(req, id, "archivedBy", dto.value);
  }

  @Patch(":id/unread")
  unread(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: ConversationFlagDto,
  ) {
    return this.flag(req, id, "markedUnreadBy", dto.value);
  }

  /** Accept a message request from someone who isn't a friend. */
  @Patch(":id/accept-request")
  acceptRequest(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return this.flag(req, id, "requestAcceptedBy", true);
  }

  private async flag(
    req: Request,
    id: string,
    flag: "mutedBy" | "pinnedBy" | "archivedBy" | "markedUnreadBy" | "requestAcceptedBy",
    value: boolean,
  ) {
    const userId = this.userId(req);
    const conversation = await this.conversationsService.setFlag(
      id,
      userId,
      flag,
      value,
    );
    // Keep the user's other tabs and devices in step.
    this.messagesGateway.notifyUser(
      userId,
      "conversation:updated",
      { conversation },
    );
    return conversation;
  }

  /* ==========================================================================
     CLEAR CHAT (for me)
     POST /messages/conversations/:id/clear
  ========================================================================== */

  @Post(":id/clear")
  async clear(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const userId = this.userId(req);
    const result = await this.messagesService.clearConversation(
      id,
      userId,
    );
    this.messagesGateway.notifyUser(
      userId,
      "conversation:cleared",
      { conversationId: id },
    );
    return result;
  }
}