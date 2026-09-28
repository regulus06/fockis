import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";

import {
  Injectable,
  Logger,
} from "@nestjs/common";

import {
  JwtService,
} from "@nestjs/jwt";

import {
  Server,
  Socket,
} from "socket.io";

import {
  randomUUID,
} from "crypto";

import {
  MessagesService,
} from "../messages.service";

import {
  ConversationsService,
} from "../conversations.service";

/* ============================================================================
   FOCKIS MESSAGES GATEWAY

   Responsibilities:

   - Authenticate Socket.IO connections with JWT
   - Track every socket belonging to every user
   - Put every authenticated socket into a private user room
   - Allow users to join conversation rooms
   - Validate conversation membership
   - Send messages through MessagesService
   - Deliver messages directly to recipient users
   - Broadcast REST/socket-created messages
   - Broadcast message edits
   - Broadcast message deletion-for-everyone
   - Support deletion-for-me
   - Support typing indicators
   - Support delivered/read events

   CALL SYSTEM:

   - call:start
   - call:incoming
   - call:accept
   - call:accepted
   - call:reject
   - call:rejected
   - call:end
   - call:ended

   WEBRTC SIGNALING:

   - webrtc:offer
   - webrtc:answer
   - webrtc:ice-candidate

   IMPORTANT:

   This gateway does NOT carry video/audio.

   Actual media travels browser-to-browser through WebRTC.

   Socket.IO is only the signaling channel.
============================================================================ */

type CallType =
  | "voice"
  | "video";

interface ActiveCall {
  callId: string;
  callerId: string;
  receiverId: string;
  type: CallType;
  createdAt: string;
  acceptedAt?: string;
}

/* ============================================================================
   WEBRTC PAYLOADS
============================================================================ */

interface WebRTCOfferPayload {
  callId: string;

  receiverId: string;

  offer: {
    type: string;
    sdp?: string;
  };
}

interface WebRTCAnswerPayload {
  callId: string;

  callerId: string;

  answer: {
    type: string;
    sdp?: string;
  };
}

interface WebRTCICECandidatePayload {
  callId: string;

  targetUserId: string;

  candidate: unknown;
}

/* ============================================================================
   MESSAGE PAYLOADS
============================================================================ */

interface ConversationPayload {
  conversationId: string;
}

interface EditMessagePayload {
  messageId: string;
  conversationId: string;
  text: string;
}

interface DeleteMessagePayload {
  messageId: string;
  conversationId: string;
}

/* ============================================================================
   GATEWAY
============================================================================ */

@WebSocketGateway({
  namespace: "/messages",

  cors: {
    origin: true,
    credentials: true,
  },
})
@Injectable()
export class MessagesGateway {
  private readonly logger =
    new Logger(MessagesGateway.name);

  @WebSocketServer()
  server!: Server;

  /* ==========================================================================
     USER SOCKET REGISTRY

     userId -> socket IDs

     Supports:

     - multiple tabs
     - desktop + mobile
     - multiple browsers
     - multiple devices
  ========================================================================== */

  private readonly users =
    new Map<
      string,
      Set<string>
    >();

  /* ==========================================================================
     ACTIVE CALL REGISTRY
  ========================================================================== */

  private readonly activeCalls =
    new Map<
      string,
      ActiveCall
    >();

  constructor(
    private readonly jwtService:
      JwtService,

    private readonly messagesService:
      MessagesService,

    private readonly conversationsService:
      ConversationsService,
  ) {}

  /* ==========================================================================
     USER ROOM
  ========================================================================== */

  private userRoom(
    userId: string,
  ): string {
    return `user:${String(userId)}`;
  }

  /* ==========================================================================
     CONVERSATION ROOM
  ========================================================================== */

  private conversationRoom(
    conversationId: string,
  ): string {
    return `conversation:${String(conversationId)}`;
  }

  /* ==========================================================================
     JWT AUTHENTICATION
  ========================================================================== */

  private authenticate(
    client: Socket,
  ): string | null {
    try {
      const authToken =
        client.handshake.auth?.token;

      const authorization =
        client.handshake.headers?.authorization;

      const headerToken =
        authorization?.startsWith(
          "Bearer ",
        )
          ? authorization.substring(7)
          : null;

      const token =
        authToken ||
        headerToken;

      if (!token) {
        this.logger.warn(
          `Socket ${client.id} rejected: no JWT token`,
        );

        return null;
      }

      const payload =
        this.jwtService.verify(
          token,
          {
            secret:
              process.env.JWT_SECRET ||
              "secretKey123",
          },
        );

      const userId =
        payload?.sub ||
        payload?.userId ||
        payload?.id;

      if (!userId) {
        this.logger.warn(
          `Socket ${client.id} rejected: JWT contains no user ID`,
        );

        return null;
      }

      return String(userId);
    } catch {
      this.logger.warn(
        `Socket ${client.id} rejected: invalid JWT`,
      );

      return null;
    }
  }

  /* ==========================================================================
     ADD USER SOCKET
  ========================================================================== */

  private addUserSocket(
    userId: string,
    socketId: string,
  ): void {
    const normalizedUserId =
      String(userId);

    let sockets =
      this.users.get(
        normalizedUserId,
      );

    if (!sockets) {
      sockets =
        new Set<string>();

      this.users.set(
        normalizedUserId,
        sockets,
      );
    }

    sockets.add(
      socketId,
    );

    this.logger.debug(
      `Registered socket ${socketId} for user ${normalizedUserId}. Total sockets: ${sockets.size}`,
    );
  }

  /* ==========================================================================
     REMOVE USER SOCKET
  ========================================================================== */

  private removeUserSocket(
    userId: string,
    socketId: string,
  ): void {
    const normalizedUserId =
      String(userId);

    const sockets =
      this.users.get(
        normalizedUserId,
      );

    if (!sockets) {
      return;
    }

    sockets.delete(
      socketId,
    );

    if (sockets.size === 0) {
      this.users.delete(
        normalizedUserId,
      );

      if (this.server) {
        this.server.emit(
          "presence:update",
          {
            userId:
              normalizedUserId,

            presence:
              "offline",

            lastSeen:
              new Date().toISOString(),
          },
        );
      }

      this.logger.debug(
        `User ${normalizedUserId} is now offline`,
      );
    } else {
      this.logger.debug(
        `Removed socket ${socketId} for user ${normalizedUserId}. Remaining sockets: ${sockets.size}`,
      );
    }
  }

  /* ==========================================================================
     CHECK USER ONLINE
  ========================================================================== */

  private isUserOnline(
    userId: string,
  ): boolean {
    const sockets =
      this.users.get(
        String(userId),
      );

    return Boolean(
      sockets &&
      sockets.size > 0,
    );
  }

  /* ==========================================================================
     GET USER SOCKET IDS
  ========================================================================== */

  private getUserSocketIds(
    userId: string,
  ): string[] {
    const sockets =
      this.users.get(
        String(userId),
      );

    if (!sockets) {
      return [];
    }

    return Array.from(
      sockets,
    );
  }

  /* ==========================================================================
     EMIT TO USER

     The private user room is authoritative.

     Every authenticated socket for the user joins:

       user:<userId>

     Therefore all devices/tabs receive the event.
  ========================================================================== */

  private emitToUser(
    userId: string,
    event: string,
    payload: unknown,
  ): boolean {
    const normalizedUserId =
      String(userId);

    const socketIds =
      this.getUserSocketIds(
        normalizedUserId,
      );

    if (socketIds.length === 0) {
      this.logger.debug(
        `[FOCKIS SOCKET] Cannot deliver ${event}: user ${normalizedUserId} has no registered sockets`,
      );

      return false;
    }

    const room =
      this.userRoom(
        normalizedUserId,
      );

    this.logger.debug(
      `[FOCKIS SOCKET] Delivering ${event} to user ${normalizedUserId} | sockets=${socketIds.join(",")}`,
    );

    this.server
      .to(room)
      .emit(
        event,
        payload,
      );

    return true;
  }

  /* ==========================================================================
     GET CONVERSATION PARTICIPANTS
  ========================================================================== */

  private async getOtherParticipants(
    conversationId: string,
    senderId: string,
  ): Promise<string[]> {
    const conversation =
      await this.conversationsService
        .getParticipantIds(
          String(conversationId),
        );

    return conversation.filter(
      (participantId) =>
        String(participantId) !==
        String(senderId),
    );
  }

  /* ==========================================================================
     BROADCAST NEW MESSAGE
  ========================================================================== */

  async broadcastNewMessage(
    message: any,
    senderId: string,
  ): Promise<void> {
    if (
      !message ||
      !message.conversationId
    ) {
      this.logger.warn(
        "Cannot broadcast message without conversationId",
      );

      return;
    }

    const conversationId =
      String(
        message.conversationId,
      );

    const normalizedSenderId =
      String(senderId);

    const recipients =
      await this.getOtherParticipants(
        conversationId,
        normalizedSenderId,
      );

    this.server
      .to(
        this.conversationRoom(
          conversationId,
        ),
      )
      .emit(
        "message:new",
        {
          message,
        },
      );

    for (
      const recipientId
      of recipients
    ) {
      this.emitToUser(
        String(recipientId),
        "message:new",
        {
          message,
        },
      );
    }

    this.logger.debug(
      `Broadcasted message ${String(message._id || message.id)} in conversation ${conversationId} to ${recipients.length} recipient(s)`,
    );
  }

  /* ==========================================================================
     BROADCAST MESSAGE EDIT
  ========================================================================== */

  async broadcastMessageEdited(
    message: any,
  ): Promise<void> {
    if (
      !message ||
      !message.conversationId
    ) {
      this.logger.warn(
        "Cannot broadcast edited message without conversationId",
      );

      return;
    }

    const conversationId =
      String(
        message.conversationId,
      );

    const senderId =
      String(
        message.senderId,
      );

    const recipients =
      await this.getOtherParticipants(
        conversationId,
        senderId,
      );

    const payload = {
      message,
    };

    this.server
      .to(
        this.conversationRoom(
          conversationId,
        ),
      )
      .emit(
        "message:edited",
        payload,
      );

    for (
      const recipientId
      of recipients
    ) {
      this.emitToUser(
        String(recipientId),
        "message:edited",
        payload,
      );
    }

    this.emitToUser(
      senderId,
      "message:edited",
      payload,
    );

    this.logger.debug(
      `Broadcasted message edit ${String(message._id || message.id)} in conversation ${conversationId}`,
    );
  }

  /* ==========================================================================
     BROADCAST MESSAGE DELETED FOR EVERYONE
  ========================================================================== */

  async broadcastMessageDeletedForEveryone(
    message: any,
  ): Promise<void> {
    if (
      !message ||
      !message.conversationId
    ) {
      this.logger.warn(
        "Cannot broadcast deleted message without conversationId",
      );

      return;
    }

    const conversationId =
      String(
        message.conversationId,
      );

    const senderId =
      String(
        message.senderId,
      );

    const recipients =
      await this.getOtherParticipants(
        conversationId,
        senderId,
      );

    const payload = {
      message,

      messageId:
        String(
          message._id ||
          message.id,
        ),

      conversationId,

      deletedForEveryone:
        true,
    };

    this.server
      .to(
        this.conversationRoom(
          conversationId,
        ),
      )
      .emit(
        "message:deleted",
        payload,
      );

    for (
      const recipientId
      of recipients
    ) {
      this.emitToUser(
        String(recipientId),
        "message:deleted",
        payload,
      );
    }

    this.emitToUser(
      senderId,
      "message:deleted",
      payload,
    );

    this.logger.debug(
      `Broadcasted delete-for-everyone for message ${payload.messageId} in conversation ${conversationId}`,
    );
  }

  /* ==========================================================================
     CONNECTION
  ========================================================================== */

  handleConnection(
    client: Socket,
  ): void {
    const userId =
      this.authenticate(
        client,
      );

    if (!userId) {
      this.logger.warn(
        `Rejected unauthenticated message socket: ${client.id}`,
      );

      client.disconnect(
        true,
      );

      return;
    }

    const normalizedUserId =
      String(userId);

    client.data.userId =
      normalizedUserId;

    this.addUserSocket(
      normalizedUserId,
      client.id,
    );

    const room =
      this.userRoom(
        normalizedUserId,
      );

    void client.join(
      room,
    );

    this.logger.log(
      `[FOCKIS SOCKET] User ${normalizedUserId} joined private room ${room}`,
    );

    this.server.emit(
      "presence:update",
      {
        userId:
          normalizedUserId,

        presence:
          "online",

        lastSeen:
          new Date().toISOString(),
      },
    );

    this.logger.log(
      `[FOCKIS SOCKET] Message socket connected: user=${normalizedUserId} socket=${client.id}`,
    );

    this.logger.log(
      `[FOCKIS SOCKET] User ${normalizedUserId} online sockets=${this.getUserSocketSocketSummary(normalizedUserId)}`,
    );
  }

  /* ==========================================================================
     SOCKET SUMMARY
  ========================================================================== */

  private getUserSocketSocketSummary(
    userId: string,
  ): string {
    return this
      .getUserSocketIds(userId)
      .join(",");
  }

  /* ==========================================================================
     DISCONNECT
  ========================================================================== */

  handleDisconnect(
    client: Socket,
  ): void {
    const userId =
      client.data?.userId;

    if (!userId) {
      return;
    }

    const normalizedUserId =
      String(userId);

    this.removeUserSocket(
      normalizedUserId,
      client.id,
    );

    if (
      !this.isUserOnline(
        normalizedUserId,
      )
    ) {
      this.endCallsForDisconnectedUser(
        normalizedUserId,
      );
    }

    this.logger.log(
      `[FOCKIS SOCKET] Message socket disconnected: user=${normalizedUserId} socket=${client.id}`,
    );
  }

  /* ==========================================================================
     END CALLS FOR DISCONNECTED USER
  ========================================================================== */

  private endCallsForDisconnectedUser(
    userId: string,
  ): void {
    const normalizedUserId =
      String(userId);

    for (
      const call
      of this.activeCalls.values()
    ) {
      const participant =
        call.callerId ===
          normalizedUserId ||
        call.receiverId ===
          normalizedUserId;

      if (!participant) {
        continue;
      }

      const otherUserId =
        call.callerId ===
          normalizedUserId
          ? call.receiverId
          : call.callerId;

      this.emitToUser(
        otherUserId,
        "call:ended",
        {
          callId:
            call.callId,

          userId:
            normalizedUserId,

          endedAt:
            new Date().toISOString(),

          reason:
            "participant_disconnected",
        },
      );

      this.activeCalls.delete(
        call.callId,
      );

      this.logger.log(
        `[FOCKIS CALL] Call ${call.callId} ended because user ${normalizedUserId} disconnected`,
      );
    }
  }

  /* ==========================================================================
     JOIN CONVERSATION
  ========================================================================== */

  @SubscribeMessage(
    "conversation:join",
  )
  async joinConversation(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    payload: ConversationPayload,
  ): Promise<void> {
    const userId =
      client.data?.userId;

    if (
      !userId ||
      !payload?.conversationId
    ) {
      return;
    }

    const conversationId =
      String(
        payload.conversationId,
      );

    const allowed =
      await this.conversationsService
        .isParticipant(
          conversationId,
          String(userId),
        );

    if (!allowed) {
      this.logger.warn(
        `Unauthorized conversation join attempt by ${userId}`,
      );

      return;
    }

    await client.join(
      this.conversationRoom(
        conversationId,
      ),
    );

    this.logger.debug(
      `User ${userId} joined conversation ${conversationId}`,
    );
  }

  /* ==========================================================================
     LEAVE CONVERSATION
  ========================================================================== */

  @SubscribeMessage(
    "conversation:leave",
  )
  async leaveConversation(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    payload: ConversationPayload,
  ): Promise<void> {
    if (
      !payload?.conversationId
    ) {
      return;
    }

    await client.leave(
      this.conversationRoom(
        payload.conversationId,
      ),
    );
  }

  /* ==========================================================================
     TYPING START
  ========================================================================== */

  @SubscribeMessage(
    "typing:start",
  )
  async typingStart(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    payload: ConversationPayload,
  ): Promise<void> {
    const userId =
      client.data?.userId;

    if (
      !userId ||
      !payload?.conversationId
    ) {
      return;
    }

    const conversationId =
      String(
        payload.conversationId,
      );

    const allowed =
      await this.conversationsService
        .isParticipant(
          conversationId,
          String(userId),
        );

    if (!allowed) {
      return;
    }

    client
      .to(
        this.conversationRoom(
          conversationId,
        ),
      )
      .emit(
        "typing:start",
        {
          conversationId,

          userId:
            String(userId),
        },
      );
  }

  /* ==========================================================================
     TYPING STOP
  ========================================================================== */

  @SubscribeMessage(
    "typing:stop",
  )
  async typingStop(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    payload: ConversationPayload,
  ): Promise<void> {
    const userId =
      client.data?.userId;

    if (
      !userId ||
      !payload?.conversationId
    ) {
      return;
    }

    const conversationId =
      String(
        payload.conversationId,
      );

    const allowed =
      await this.conversationsService
        .isParticipant(
          conversationId,
          String(userId),
        );

    if (!allowed) {
      return;
    }

    client
      .to(
        this.conversationRoom(
          conversationId,
        ),
      )
      .emit(
        "typing:stop",
        {
          conversationId,

          userId:
            String(userId),
        },
      );
  }

  /* ==========================================================================
     SEND MESSAGE
  ========================================================================== */

  @SubscribeMessage(
    "message:send",
  )
  async sendMessage(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    payload: any,
  ) {
    const userId =
      client.data?.userId;

    if (!userId) {
      return {
        success: false,

        message:
          "Unauthorized",
      };
    }

    if (
      !payload?.conversationId
    ) {
      return {
        success: false,

        message:
          "Conversation ID is required",
      };
    }

    const conversationId =
      String(
        payload.conversationId,
      );

    const allowed =
      await this.conversationsService
        .isParticipant(
          conversationId,
          String(userId),
        );

    if (!allowed) {
      return {
        success: false,

        message:
          "You are not a participant in this conversation",
      };
    }

    const message =
      await this.messagesService.create(
        String(userId),
        payload,
      );

    await this.broadcastNewMessage(
      message,
      String(userId),
    );

    return {
      success: true,

      message,
    };
  }

  /* ==========================================================================
     EDIT MESSAGE
  ========================================================================== */

  @SubscribeMessage(
    "message:edit",
  )
  async editMessage(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    payload: EditMessagePayload,
  ) {
    const userId =
      client.data?.userId;

    if (!userId) {
      return {
        success: false,

        message:
          "Unauthorized",
      };
    }

    if (
      !payload?.messageId ||
      !payload?.conversationId
    ) {
      return {
        success: false,

        message:
          "Message ID and conversation ID are required",
      };
    }

    if (
      typeof payload.text !==
        "string" ||
      !payload.text.trim()
    ) {
      return {
        success: false,

        message:
          "Message text cannot be empty",
      };
    }

    const conversationId =
      String(
        payload.conversationId,
      );

    const allowed =
      await this.conversationsService
        .isParticipant(
          conversationId,
          String(userId),
        );

    if (!allowed) {
      return {
        success: false,

        message:
          "You are not a participant in this conversation",
      };
    }

    try {
      const message =
        await this.messagesService.edit(
          String(
            payload.messageId,
          ),
          String(userId),
          payload.text,
        );

      await this.broadcastMessageEdited(
        message,
      );

      return {
        success: true,

        message,
      };
    } catch (error: any) {
      this.logger.warn(
        `[FOCKIS MESSAGE] Edit failed for message ${payload.messageId}: ${error?.message || "Unknown error"}`,
      );

      return {
        success: false,

        message:
          error?.message ||
          "Unable to edit message",
      };
    }
  }

  /* ==========================================================================
     DELETE MESSAGE FOR ME

     Important:

     This does NOT broadcast deletion to the other participant.

     It only removes the message from the requesting user's view.

     MessagesService.deleteForMe() records the requesting user's ID in
     deletedForMeBy.
  ========================================================================== */

  @SubscribeMessage(
    "message:delete:me",
  )
  async deleteMessageForMe(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    payload: DeleteMessagePayload,
  ) {
    const userId =
      client.data?.userId;

    if (!userId) {
      return {
        success: false,

        message:
          "Unauthorized",
      };
    }

    if (
      !payload?.messageId ||
      !payload?.conversationId
    ) {
      return {
        success: false,

        message:
          "Message ID and conversation ID are required",
      };
    }

    const conversationId =
      String(
        payload.conversationId,
      );

    const allowed =
      await this.conversationsService
        .isParticipant(
          conversationId,
          String(userId),
        );

    if (!allowed) {
      return {
        success: false,

        message:
          "You are not a participant in this conversation",
      };
    }

    try {
      const result =
        await this.messagesService.deleteForMe(
          String(
            payload.messageId,
          ),
          String(userId),
        );

      /*
       * Tell only this user's connected devices/tabs to remove the message.
       *
       * Other participants receive nothing.
       */

      this.emitToUser(
        String(userId),
        "message:deleted:me",
        {
          messageId:
            String(
              payload.messageId,
            ),

          conversationId,

          deletedForMe:
            true,
        },
      );

      /*
       * IMPORTANT:
       *
       * Do not write:
       *
       * {
       *   success: true,
       *   ...result,
       * }
       *
       * because MessagesService.deleteForMe() already returns success.
       *
       * Returning result directly also preserves the complete service
       * response without triggering TS2783.
       */

      return result;
    } catch (error: any) {
      this.logger.warn(
        `[FOCKIS MESSAGE] Delete-for-me failed for message ${payload.messageId}: ${error?.message || "Unknown error"}`,
      );

      return {
        success: false,

        message:
          error?.message ||
          "Unable to delete message",
      };
    }
  }

  /* ==========================================================================
     DELETE MESSAGE FOR EVERYONE

     Only the sender can perform this action.

     MessagesService.deleteForEveryone() enforces sender ownership.

     After deletion:

       - sender sees "This message was deleted"
       - receiver sees "This message was deleted"
       - message remains in conversation history
       - original text is removed
       - attachments are removed
       - deletedForEveryone = true
  ========================================================================== */

  @SubscribeMessage(
    "message:delete:everyone",
  )
  async deleteMessageForEveryone(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    payload: DeleteMessagePayload,
  ) {
    const userId =
      client.data?.userId;

    if (!userId) {
      return {
        success: false,

        message:
          "Unauthorized",
      };
    }

    if (
      !payload?.messageId ||
      !payload?.conversationId
    ) {
      return {
        success: false,

        message:
          "Message ID and conversation ID are required",
      };
    }

    const conversationId =
      String(
        payload.conversationId,
      );

    const allowed =
      await this.conversationsService
        .isParticipant(
          conversationId,
          String(userId),
        );

    if (!allowed) {
      return {
        success: false,

        message:
          "You are not a participant in this conversation",
      };
    }

    try {
      const message =
        await this.messagesService
          .deleteForEveryone(
            String(
              payload.messageId,
            ),
            String(userId),
          );

      await this.broadcastMessageDeletedForEveryone(
        message,
      );

      return {
        success: true,

        message,
      };
    } catch (error: any) {
      this.logger.warn(
        `[FOCKIS MESSAGE] Delete-for-everyone failed for message ${payload.messageId}: ${error?.message || "Unknown error"}`,
      );

      return {
        success: false,

        message:
          error?.message ||
          "Unable to delete message for everyone",
      };
    }
  }

  /* ==========================================================================
     MESSAGE DELIVERED
  ========================================================================== */

  @SubscribeMessage(
    "message:delivered",
  )
  async delivered(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    payload: {
      messageId: string;
      conversationId: string;
    },
  ): Promise<void> {
    const userId =
      client.data?.userId;

    if (
      !userId ||
      !payload?.messageId ||
      !payload?.conversationId
    ) {
      return;
    }

    const conversationId =
      String(
        payload.conversationId,
      );

    const allowed =
      await this.conversationsService
        .isParticipant(
          conversationId,
          String(userId),
        );

    if (!allowed) {
      return;
    }

    await this.messagesService.markDelivered(
      payload.messageId,
      String(userId),
    );

    client
      .to(
        this.conversationRoom(
          conversationId,
        ),
      )
      .emit(
        "message:delivered",
        {
          messageId:
            payload.messageId,

          conversationId,

          userId:
            String(userId),
        },
      );
  }

  /* ==========================================================================
     MESSAGE READ
  ========================================================================== */

  @SubscribeMessage(
    "message:read",
  )
  async read(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    payload: {
      messageId: string;
      conversationId: string;
    },
  ): Promise<void> {
    const userId =
      client.data?.userId;

    if (
      !userId ||
      !payload?.conversationId
    ) {
      return;
    }

    const conversationId =
      String(
        payload.conversationId,
      );

    const allowed =
      await this.conversationsService
        .isParticipant(
          conversationId,
          String(userId),
        );

    if (!allowed) {
      return;
    }

    await this.messagesService.markRead(
      conversationId,
      String(userId),
    );

    client
      .to(
        this.conversationRoom(
          conversationId,
        ),
      )
      .emit(
        "message:read",
        {
          messageId:
            payload.messageId,

          conversationId,

          userId:
            String(userId),
        },
      );
  }

  /* ==========================================================================
     START VOICE / VIDEO CALL
  ========================================================================== */

  @SubscribeMessage(
    "call:start",
  )
  async startCall(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    payload: {
      receiverId: string;

      type:
        | "voice"
        | "video";
    },
  ): Promise<{
    success: boolean;
    callId?: string;
    message?: string;
  }> {
    const callerId =
      client.data?.userId;

    if (!callerId) {
      return {
        success: false,

        message:
          "Unauthorized",
      };
    }

    if (
      !payload?.receiverId
    ) {
      return {
        success: false,

        message:
          "Receiver ID is required",
      };
    }

    if (
      payload.type !== "voice" &&
      payload.type !== "video"
    ) {
      return {
        success: false,

        message:
          "Invalid call type",
      };
    }

    const normalizedCallerId =
      String(callerId);

    const receiverId =
      String(
        payload.receiverId,
      );

    if (
      receiverId ===
      normalizedCallerId
    ) {
      return {
        success: false,

        message:
          "You cannot call yourself",
      };
    }

    const receiverSockets =
      this.getUserSocketIds(
        receiverId,
      );

    if (
      receiverSockets.length === 0
    ) {
      this.logger.warn(
        `[FOCKIS CALL] Call rejected: receiver ${receiverId} has no sockets`,
      );

      return {
        success: false,

        message:
          "The user is currently offline",
      };
    }

    this.logger.log(
      `[FOCKIS CALL] Receiver ${receiverId} is online on socket(s): ${receiverSockets.join(", ")}`,
    );

    for (
      const existingCall
      of this.activeCalls.values()
    ) {
      const samePair =
        (
          existingCall.callerId ===
            normalizedCallerId &&
          existingCall.receiverId ===
            receiverId
        ) ||
        (
          existingCall.callerId ===
            receiverId &&
          existingCall.receiverId ===
            normalizedCallerId
        );

      if (samePair) {
        return {
          success: false,

          callId:
            existingCall.callId,

          message:
            "A call is already active between these users",
        };
      }
    }

    const callId =
      randomUUID();

    const createdAt =
      new Date().toISOString();

    const call: ActiveCall = {
      callId,

      callerId:
        normalizedCallerId,

      receiverId,

      type:
        payload.type,

      createdAt,
    };

    this.activeCalls.set(
      callId,
      call,
    );

    const delivered =
      this.emitToUser(
        receiverId,

        "call:incoming",

        {
          callId,

          callerId:
            normalizedCallerId,

          receiverId,

          type:
            payload.type,

          createdAt,
        },
      );

    if (!delivered) {
      this.activeCalls.delete(
        callId,
      );

      return {
        success: false,

        message:
          "The receiver went offline before the call could be delivered",
      };
    }

    this.logger.log(
      `[FOCKIS CALL] INCOMING CALL DELIVERED | call=${callId} | caller=${normalizedCallerId} | receiver=${receiverId} | type=${payload.type}`,
    );

    return {
      success: true,

      callId,
    };
  }

  /* ==========================================================================
     ACCEPT CALL
  ========================================================================== */

  @SubscribeMessage(
    "call:accept",
  )
  async acceptCall(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    payload: {
      callId: string;
      callerId?: string;
    },
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    const receiverId =
      client.data?.userId;

    if (!receiverId) {
      return {
        success: false,

        message:
          "Unauthorized",
      };
    }

    if (
      !payload?.callId
    ) {
      return {
        success: false,

        message:
          "Call ID is required",
      };
    }

    const call =
      this.activeCalls.get(
        String(payload.callId),
      );

    if (!call) {
      return {
        success: false,

        message:
          "Call no longer exists",
      };
    }

    if (
      call.receiverId !==
      String(receiverId)
    ) {
      return {
        success: false,

        message:
          "You are not the receiver of this call",
      };
    }

    if (
      payload.callerId &&
      String(payload.callerId) !==
        call.callerId
    ) {
      return {
        success: false,

        message:
          "Caller does not match this call",
      };
    }

    call.acceptedAt =
      new Date().toISOString();

    this.activeCalls.set(
      call.callId,
      call,
    );

    this.emitToUser(
      call.callerId,

      "call:accepted",

      {
        callId:
          call.callId,

        callerId:
          call.callerId,

        receiverId:
          call.receiverId,

        type:
          call.type,

        acceptedAt:
          call.acceptedAt,
      },
    );

    this.logger.log(
      `[FOCKIS CALL] ACCEPTED | call=${call.callId} | caller=${call.callerId} | receiver=${call.receiverId}`,
    );

    return {
      success: true,
    };
  }

  /* ==========================================================================
     REJECT CALL
  ========================================================================== */

  @SubscribeMessage(
    "call:reject",
  )
  async rejectCall(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    payload: {
      callId: string;
      callerId?: string;
    },
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    const receiverId =
      client.data?.userId;

    if (!receiverId) {
      return {
        success: false,

        message:
          "Unauthorized",
      };
    }

    if (
      !payload?.callId
    ) {
      return {
        success: false,

        message:
          "Call ID is required",
      };
    }

    const call =
      this.activeCalls.get(
        String(payload.callId),
      );

    if (!call) {
      return {
        success: false,

        message:
          "Call no longer exists",
      };
    }

    if (
      call.receiverId !==
      String(receiverId)
    ) {
      return {
        success: false,

        message:
          "You are not the receiver of this call",
      };
    }

    this.emitToUser(
      call.callerId,

      "call:rejected",

      {
        callId:
          call.callId,

        callerId:
          call.callerId,

        receiverId:
          call.receiverId,

        rejectedAt:
          new Date().toISOString(),
      },
    );

    this.activeCalls.delete(
      call.callId,
    );

    this.logger.log(
      `[FOCKIS CALL] REJECTED | call=${call.callId}`,
    );

    return {
      success: true,
    };
  }

  /* ==========================================================================
     WEBRTC OFFER
  ========================================================================== */

  @SubscribeMessage(
    "webrtc:offer",
  )
  async sendWebRTCOffer(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    payload: WebRTCOfferPayload,
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    const senderId =
      client.data?.userId;

    if (!senderId) {
      return {
        success: false,

        message:
          "Unauthorized",
      };
    }

    if (
      !payload?.callId ||
      !payload?.receiverId ||
      !payload?.offer
    ) {
      return {
        success: false,

        message:
          "Invalid WebRTC offer payload",
      };
    }

    const call =
      this.activeCalls.get(
        String(payload.callId),
      );

    if (!call) {
      return {
        success: false,

        message:
          "Call no longer exists",
      };
    }

    const normalizedSenderId =
      String(senderId);

    const receiverId =
      String(
        payload.receiverId,
      );

    const validPair =
      (
        call.callerId ===
          normalizedSenderId &&
        call.receiverId ===
          receiverId
      ) ||
      (
        call.receiverId ===
          normalizedSenderId &&
        call.callerId ===
          receiverId
      );

    if (!validPair) {
      return {
        success: false,

        message:
          "WebRTC offer participants do not match the call",
      };
    }

    if (!call.acceptedAt) {
      return {
        success: false,

        message:
          "Call has not been accepted",
      };
    }

    const delivered =
      this.emitToUser(
        receiverId,

        "webrtc:offer",

        {
          callId:
            call.callId,

          senderId:
            normalizedSenderId,

          offer:
            payload.offer,
        },
      );

    if (!delivered) {
      return {
        success: false,

        message:
          "WebRTC offer receiver is offline",
      };
    }

    this.logger.debug(
      `[FOCKIS WEBRTC] Offer relayed | call=${call.callId} | ${normalizedSenderId} -> ${receiverId}`,
    );

    return {
      success: true,
    };
  }

  /* ==========================================================================
     WEBRTC ANSWER
  ========================================================================== */

  @SubscribeMessage(
    "webrtc:answer",
  )
  async sendWebRTCAnswer(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    payload: WebRTCAnswerPayload,
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    const senderId =
      client.data?.userId;

    if (!senderId) {
      return {
        success: false,

        message:
          "Unauthorized",
      };
    }

    if (
      !payload?.callId ||
      !payload?.callerId ||
      !payload?.answer
    ) {
      return {
        success: false,

        message:
          "Invalid WebRTC answer payload",
      };
    }

    const call =
      this.activeCalls.get(
        String(payload.callId),
      );

    if (!call) {
      return {
        success: false,

        message:
          "Call no longer exists",
      };
    }

    const normalizedSenderId =
      String(senderId);

    const callerId =
      String(
        payload.callerId,
      );

    if (
      call.receiverId !==
      normalizedSenderId
    ) {
      return {
        success: false,

        message:
          "Only the receiver can send the WebRTC answer",
      };
    }

    if (
      call.callerId !==
      callerId
    ) {
      return {
        success: false,

        message:
          "Caller does not match this call",
      };
    }

    if (!call.acceptedAt) {
      return {
        success: false,

        message:
          "Call has not been accepted",
      };
    }

    const delivered =
      this.emitToUser(
        callerId,

        "webrtc:answer",

        {
          callId:
            call.callId,

          senderId:
            normalizedSenderId,

          answer:
            payload.answer,
        },
      );

    if (!delivered) {
      return {
        success: false,

        message:
          "WebRTC answer receiver is offline",
      };
    }

    this.logger.debug(
      `[FOCKIS WEBRTC] Answer relayed | call=${call.callId} | ${normalizedSenderId} -> ${callerId}`,
    );

    return {
      success: true,
    };
  }

  /* ==========================================================================
     WEBRTC ICE CANDIDATE
  ========================================================================== */

  @SubscribeMessage(
    "webrtc:ice-candidate",
  )
  async sendWebRTCICECandidate(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    payload: WebRTCICECandidatePayload,
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    const senderId =
      client.data?.userId;

    if (!senderId) {
      return {
        success: false,

        message:
          "Unauthorized",
      };
    }

    if (
      !payload?.callId ||
      !payload?.targetUserId ||
      !payload?.candidate
    ) {
      return {
        success: false,

        message:
          "Invalid ICE candidate payload",
      };
    }

    const call =
      this.activeCalls.get(
        String(payload.callId),
      );

    if (!call) {
      return {
        success: false,

        message:
          "Call no longer exists",
      };
    }

    const normalizedSenderId =
      String(senderId);

    const targetUserId =
      String(
        payload.targetUserId,
      );

    const validPair =
      (
        call.callerId ===
          normalizedSenderId &&
        call.receiverId ===
          targetUserId
      ) ||
      (
        call.receiverId ===
          normalizedSenderId &&
        call.callerId ===
          targetUserId
      );

    if (!validPair) {
      return {
        success: false,

        message:
          "ICE candidate participants do not match the call",
      };
    }

    if (!call.acceptedAt) {
      return {
        success: false,

        message:
          "Call has not been accepted",
      };
    }

    const delivered =
      this.emitToUser(
        targetUserId,

        "webrtc:ice-candidate",

        {
          callId:
            call.callId,

          senderId:
            normalizedSenderId,

          candidate:
            payload.candidate,
        },
      );

    if (!delivered) {
      return {
        success: false,

        message:
          "ICE candidate receiver is offline",
      };
    }

    return {
      success: true,
    };
  }

  /* ==========================================================================
     END CALL
  ========================================================================== */

  @SubscribeMessage(
    "call:end",
  )
  async endCall(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    payload: {
      callId: string;
      userId?: string;
    },
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    const participantId =
      client.data?.userId;

    if (!participantId) {
      return {
        success: false,

        message:
          "Unauthorized",
      };
    }

    if (
      !payload?.callId
    ) {
      return {
        success: false,

        message:
          "Call ID is required",
      };
    }

    const call =
      this.activeCalls.get(
        String(payload.callId),
      );

    if (!call) {
      return {
        success: false,

        message:
          "Call no longer exists",
      };
    }

    const normalizedParticipantId =
      String(participantId);

    const isParticipant =
      call.callerId ===
        normalizedParticipantId ||
      call.receiverId ===
        normalizedParticipantId;

    if (!isParticipant) {
      return {
        success: false,

        message:
          "You are not a participant in this call",
      };
    }

    const otherUserId =
      call.callerId ===
        normalizedParticipantId
        ? call.receiverId
        : call.callerId;

    this.emitToUser(
      otherUserId,

      "call:ended",

      {
        callId:
          call.callId,

        userId:
          normalizedParticipantId,

        endedAt:
          new Date().toISOString(),
      },
    );

    this.activeCalls.delete(
      call.callId,
    );

    this.logger.log(
      `[FOCKIS CALL] ENDED | call=${call.callId} | by=${normalizedParticipantId}`,
    );

    return {
      success: true,
    };
  }
}