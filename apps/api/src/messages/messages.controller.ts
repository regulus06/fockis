import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { BulkDeleteMessagesDto } from "./dto/message-actions.dto";

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
  async react(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: ReactionDto,
  ) {
    const userId =
      this.userId(req);
    const message =
      await this.messagesService.react(
        id,
        userId,
        dto.emoji,
      );
    await this.messagesGateway.broadcastMessageUpdated(
      message,
      userId,
    );
    return message;
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
  async forward(
    @Req() req: Request,
    @Body() dto: ForwardMessageDto,
  ) {
    const userId =
      this.userId(req);
    const created =
      await this.messagesService.forward(
        userId,
        dto.messageId,
        dto.conversationIds,
        dto.caption,
      );
    for (const message of Array.isArray(created) ? created : []) {
      await this.messagesGateway.broadcastNewMessage(
        message,
        userId,
      );
    }
    return created;
  }

  /* ============================================================
     STARRED
     GET /messages/starred
  ============================================================ */

  @Get("starred")
  starred(
    @Req() req: Request,
    @Query("limit") limit?: string,
  ) {
    return this.messagesService.listStarred(
      this.userId(req),
      Number(limit) || 100,
    );
  }

  /* ============================================================
     PIN / UNPIN
     POST /messages/:id/pin
  ============================================================ */

  @Post(":id/pin")
  async togglePin(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const userId =
      this.userId(req);
    const message =
      await this.messagesService.togglePin(
        id,
        userId,
      );
    await this.messagesGateway.broadcastMessageUpdated(
      message,
      userId,
    );
    return message;
  }

  /* ============================================================
     DELETE SEVERAL
     POST /messages/bulk-delete
  ============================================================ */

  @Post("bulk-delete")
  async bulkDelete(
    @Req() req: Request,
    @Body() dto: BulkDeleteMessagesDto,
  ) {
    const userId =
      this.userId(req);
    const result =
      await this.messagesService.bulkDelete(
        userId,
        dto.messageIds,
        dto.scope,
      );
    if (dto.scope === "everyone") {
      for (const message of result.messages) {
        await this.messagesGateway.broadcastMessageDeletedForEveryone(
          message,
        );
      }
    } else {
      this.messagesGateway.notifyUser(
        userId,
        "message:deleted-for-me",
        { messageIds: result.deletedIds },
      );
    }
    return result;
  }
}