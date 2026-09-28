import {
  Body,
  Controller,
  Get,
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

@Controller("messages/conversations")
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(
    private readonly conversationsService:
      ConversationsService,
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
}