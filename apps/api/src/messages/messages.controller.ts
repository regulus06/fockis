import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import type { Request } from "express";

import { MessagesService } from "./messages.service";
import { MessagesGateway } from "./gateway/messages.gateway";

import { CreateMessageDto } from "./dto/create-message.dto";
import { UpdateMessageDto } from "./dto/update-message.dto";
import { ReactionDto } from "./dto/reaction.dto";
import { ForwardMessageDto } from "./dto/forward-message.dto";
import { SearchMessagesDto } from "./dto/search-messages.dto";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("messages")
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly messagesGateway: MessagesGateway,
  ) {}

  /* ============================================================
     AUTHENTICATED USER ID
  ============================================================ */

  private userId(req: Request): string {
    return String(
      (req as any).user?.id ||
        (req as any).user?.userId ||
        (req as any).user?.sub ||
        "",
    );
  }

  /* ============================================================
     CREATE

     POST /messages
  ============================================================ */

  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateMessageDto,
  ) {
    const userId =
      this.userId(req);

    const message =
      await this.messagesService.create(
        userId,
        dto,
      );

    /*
     * Broadcast REST-created messages to Socket.IO clients.
     *
     * This keeps REST and Socket.IO message creation synchronized.
     */
    await this.messagesGateway.broadcastNewMessage(
      message,
      userId,
    );

    return message;
  }

  /* ============================================================
     EDIT

     PATCH /messages/:id

     Only the sender is allowed to edit.
     MessagesService enforces ownership.
  ============================================================ */

  @Patch(":id")
  async edit(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: UpdateMessageDto,
  ) {
    const userId =
      this.userId(req);

    const message =
      await this.messagesService.edit(
        id,
        userId,
        dto.text,
      );

    /*
     * Notify the sender's other devices and the other
     * conversation participants in real time.
     */
    await this.messagesGateway.broadcastMessageEdited(
      message,
    );

    return message;
  }

  /* ============================================================
     DELETE FOR ME

     DELETE /messages/:id

     This action is private to the requesting user.

     It does NOT delete the message for the other participant.

     It does NOT broadcast a deletion to the conversation.

     The gateway's Socket.IO delete-for-me event handles
     notifying the user's other tabs/devices when the action
     originates through Socket.IO.
  ============================================================ */

  @Delete(":id")
  async deleteForMe(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const userId =
      this.userId(req);

    const result =
      await this.messagesService.deleteForMe(
        id,
        userId,
      );

    return result;
  }

  /* ============================================================
     DELETE FOR EVERYONE

     DELETE /messages/:id/everyone

     Only the original sender can perform this action.

     MessagesService enforces sender ownership.

     The gateway broadcasts the deleted state to:
       - sender's other devices
       - receiver's devices
       - conversation room participants
  ============================================================ */

  @Delete(":id/everyone")
  async deleteForEveryone(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const userId =
      this.userId(req);

    const message =
      await this.messagesService.deleteForEveryone(
        id,
        userId,
      );

    await this.messagesGateway.broadcastMessageDeletedForEveryone(
      message,
    );

    return message;
  }

  /* ============================================================
     STAR

     POST /messages/:id/star
  ============================================================ */

  @Post(":id/star")
  toggleStar(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return this.messagesService.toggleStar(
      id,
      this.userId(req),
    );
  }

  /* ============================================================
     REACTION

     POST /messages/:id/reactions
  ============================================================ */

  @Post(":id/reactions")
  react(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: ReactionDto,
  ) {
    return this.messagesService.react(
      id,
      this.userId(req),
      dto.emoji,
    );
  }

  /* ============================================================
     DELIVERED

     PATCH /messages/:id/delivered
  ============================================================ */

  @Patch(":id/delivered")
  delivered(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return this.messagesService.markDelivered(
      id,
      this.userId(req),
    );
  }

  /* ============================================================
     READ

     PATCH /messages/conversations/:conversationId/read
  ============================================================ */

  @Patch(
    "conversations/:conversationId/read",
  )
  readConversation(
    @Req() req: Request,
    @Param("conversationId")
    conversationId: string,
  ) {
    return this.messagesService.markRead(
      conversationId,
      this.userId(req),
    );
  }

  /* ============================================================
     SEARCH

     POST /messages/search
  ============================================================ */

  @Post("search")
  search(
    @Req() req: Request,
    @Body() dto: SearchMessagesDto,
  ) {
    return this.messagesService.search(
      dto.query,
      this.userId(req),
      dto.conversationId,
    );
  }

  /* ============================================================
     FORWARD

     POST /messages/forward
  ============================================================ */

  @Post("forward")
  forward(
    @Req() req: Request,
    @Body() dto: ForwardMessageDto,
  ) {
    return this.messagesService.forward(
      this.userId(req),
      dto.messageId,
      dto.conversationIds,
      dto.caption,
    );
  }
}