import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import type {
  Request,
} from "express";

import {
  MessagesService,
} from "./messages.service";

import {
  QueryMessagesDto,
} from "./dto/query-messages.dto";

import {
  JwtAuthGuard,
} from "../auth/jwt-auth.guard";

@Controller(
  "messages/conversations",
)
@UseGuards(JwtAuthGuard)
export class ConversationMessagesController {
  constructor(
    private readonly messagesService:
      MessagesService,
  ) {}

  @Get(":conversationId/messages")
  list(
    @Req() req: Request,

    @Param("conversationId")
    conversationId: string,

    @Query()
    query: QueryMessagesDto,
  ) {
    const userId =
      String(
        (req as any).user?.id ||
          (req as any).user?.userId ||
          (req as any).user?.sub,
      );

    return this.messagesService.list(
      conversationId,
      userId,
      query,
    );
  }

  @Get(":conversationId/search")
  searchConversation(
    @Req() req: Request,

    @Param("conversationId")
    conversationId: string,

    @Query("q")
    query: string,
  ) {
    const userId =
      String(
        (req as any).user?.id ||
          (req as any).user?.userId ||
          (req as any).user?.sub,
      );

    return this.messagesService.search(
      query,
      userId,
      conversationId,
    );
  }
}