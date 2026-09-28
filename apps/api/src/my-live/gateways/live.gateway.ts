import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";

import {
  Server,
  Socket,
} from "socket.io";

import {
  JwtService,
} from "@nestjs/jwt";

import {
  LiveCommentService,
} from "../services/live-comment.service";

import {
  LiveLikeService,
} from "../services/live-like.service";

import {
  LiveViewerService,
} from "../services/live-viewer.service";

import {
  LiveService,
} from "../services/live.service";

import {
  LiveGuestService,
} from "../services/live-guest.service";

/* ============================================================================
   TYPES
============================================================================ */

interface LiveSocketData {
  userId: string;
  name: string;
  username?: string;
  avatar?: string;
}

interface LiveSocket extends Socket {
  data: LiveSocketData;
}

interface RateState {
  count: number;
  resetAt: number;
}

interface JwtPayload {
  id?: string;
  _id?: string;
  sub?: string;

  userId?: string;

  name?: string;
  username?: string;
  avatar?: string;

  [key: string]: unknown;
}

/* ============================================================================
   GATEWAY
============================================================================ */

@WebSocketGateway({
  namespace: "/live",

  cors: {
    origin: (
      process.env.FRONTEND_URL ||
      "*"
    )
      .split(",")
      .map(
        (value) =>
          value.trim(),
      )
      .filter(Boolean),

    credentials: true,
  },

  transports: [
    "websocket",
    "polling",
  ],

  pingInterval: 25000,

  pingTimeout: 20000,

  maxHttpBufferSize:
    1e6,
})
export class LiveGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly rateLimits =
    new Map<
      string,
      Map<string, RateState>
    >();

  constructor(
    private readonly jwtService: JwtService,

    private readonly commentService: LiveCommentService,

    private readonly likeService: LiveLikeService,

    private readonly viewerService: LiveViewerService,

    private readonly liveService: LiveService,

    private readonly liveGuestService: LiveGuestService,
  ) {}

  /* ==========================================================================
     CONNECTION
  ========================================================================== */

  async handleConnection(
    socket: Socket,
  ): Promise<void> {
    try {
      console.log(
        "[LiveGateway] Socket connection:",
        {
          socketId: socket.id,
          namespace:
            socket.nsp?.name,
        },
      );

      const token =
        this.extractToken(
          socket,
        );

      if (!token) {
        console.error(
          "[LiveGateway] No JWT token provided.",
          {
            socketId:
              socket.id,
          },
        );

        socket.emit(
          "live:error",
          {
            code:
              "AUTH_REQUIRED",
            message:
              "Authentication required.",
          },
        );

        socket.disconnect(
          true,
        );

        return;
      }

      /*
       * IMPORTANT:
       *
       * Do NOT pass process.env.JWT_SECRET here.
       *
       * JwtService already has the JWT configuration
       * supplied by JwtModule in the NestJS application.
       *
       * Passing a second secret here can cause the socket
       * authentication to use a different secret than the
       * normal REST authentication system.
       */
      const payload =
        (await this.jwtService.verifyAsync(
          token,
        )) as JwtPayload;

      console.log(
        "[LiveGateway] JWT verified successfully.",
        {
          socketId:
            socket.id,

          payloadKeys:
            Object.keys(
              payload || {},
            ),
        },
      );

      const userId =
        this.extractUserId(
          payload,
        );

      if (!userId) {
        console.error(
          "[LiveGateway] JWT does not contain a user ID.",
          {
            socketId:
              socket.id,
            payloadKeys:
              Object.keys(
                payload || {},
              ),
          },
        );

        throw new Error(
          "JWT does not contain a user ID.",
        );
      }

      const liveSocket =
        socket as LiveSocket;

      liveSocket.data = {
        userId,

        name:
          this.cleanString(
            payload?.name,
            payload?.username,
            "Fockis User",
            150,
          ),

        username:
          this.optionalString(
            payload?.username,
            150,
          ),

        avatar:
          this.optionalString(
            payload?.avatar,
            2000,
          ),
      };

      // Private room used for guest invitations and guest updates.
      await socket.join(
        `live:user:${userId}`,
      );

      console.log(
        "[LiveGateway] Socket authenticated.",
        {
          socketId:
            socket.id,

          userId,

          name:
            liveSocket.data
              .name,
        },
      );

      socket.emit(
        "live:authenticated",
        {
          userId,
        },
      );
    } catch (error) {
      console.error(
        "[LiveGateway] Socket authentication failed:",
        {
          socketId:
            socket.id,

          error:
            error instanceof Error
              ? error.message
              : error,
        },
      );

      socket.emit(
        "live:error",
        {
          code:
            "INVALID_AUTH",

          message:
            "Invalid or expired authentication token.",
        },
      );

      socket.disconnect(
        true,
      );
    }
  }

  /* ==========================================================================
     DISCONNECT
  ========================================================================== */

  async handleDisconnect(
    socket: Socket,
  ): Promise<void> {
    try {
      console.log(
        "[LiveGateway] Socket disconnected:",
        {
          socketId:
            socket.id,
        },
      );

      const affected =
        await this.viewerService.removeSocket(
          socket.id,
        );

      for (
        const item of affected
      ) {
        await this.liveService.setViewerCount(
          item.streamId,
          item.viewerCount,
        );

        this.server
          .to(
            this.room(
              item.streamId,
            ),
          )
          .emit(
            "live:viewer-count",
            {
              streamId:
                item.streamId,

              viewerCount:
                item.viewerCount,
            },
          );
      }
    } catch (error) {
      console.error(
        "[LiveGateway] Disconnect cleanup failed:",
        error,
      );
    } finally {
      this.rateLimits.delete(
        socket.id,
      );
    }
  }

  /* ==========================================================================
     JOIN
  ========================================================================== */

  @SubscribeMessage(
    "live:join",
  )
  async join(
    @ConnectedSocket()
    socket: LiveSocket,

    @MessageBody()
    payload: {
      streamId: string;
    },
  ) {
    const user =
      this.requireUser(
        socket,
      );

    const streamId =
      this.cleanId(
        payload?.streamId,
      );

    if (!streamId) {
      throw new WsException(
        "A valid stream ID is required.",
      );
    }

    this.checkRateLimit(
      socket.id,
      "join",
      10,
      60_000,
    );

    const stream =
      await this.liveService.getLiveStreamDocument(
        streamId,
      );

    if (
      stream.status !==
      "live"
    ) {
      throw new WsException(
        "This LIVE stream is no longer live.",
      );
    }

    const room =
      this.room(
        streamId,
      );

    /*
     * A guest is a co-host, not a viewer.
     *
     * Guests still join the Socket.IO LIVE room so they
     * receive chat, hearts, likes, shares, and other LIVE
     * broadcasts, but they must not increase the persisted
     * viewer count.
     */
    const guestRecord =
      await this.liveGuestService.getGuestsForUser(
        user.userId,
        streamId,
      );

    const isGuest =
      Boolean(guestRecord);

    if (isGuest) {
      /*
       * This also makes reconnects safe:
       * - accepted -> connected
       * - connected -> connected
       */
      await this.liveGuestService.markConnected(
        user.userId,
        streamId,
      );
    }

    await socket.join(
      room,
    );

    let viewerCount =
      Number(stream.viewerCount || 0);

    if (!isGuest) {
      viewerCount =
        await this.viewerService.join(
          streamId,
          user.userId,
          socket.id,
        );

      await this.liveService.setViewerCount(
        streamId,
        viewerCount,
      );

      this.server
        .to(room)
        .emit(
          "live:viewer-count",
          {
            streamId,

            viewerCount,
          },
        );
    }

    socket.emit(
      "live:joined",
      {
        streamId,

        viewerCount,

        isGuest,

        roomName:
          stream.roomName,
      },
    );

    console.log(
      isGuest
        ? "[LiveGateway] Guest joined LIVE:"
        : "[LiveGateway] Viewer joined LIVE:",
      {
        socketId:
          socket.id,

        userId:
          user.userId,

        streamId,

        viewerCount,

        isGuest,
      },
    );

    return {
      success: true,

      streamId,

      viewerCount,

      isGuest,

      roomName:
        stream.roomName,
    };
  }

  /* ==========================================================================
     LEAVE
  ========================================================================== */

  @SubscribeMessage(
    "live:leave",
  )
  async leave(
    @ConnectedSocket()
    socket: LiveSocket,

    @MessageBody()
    payload: {
      streamId: string;
    },
  ) {
    const user =
      this.requireUser(
        socket,
      );

    const streamId =
      this.cleanId(
        payload?.streamId,
      );

    if (!streamId) {
      throw new WsException(
        "A valid stream ID is required.",
      );
    }

    const room =
      this.room(
        streamId,
      );

    const guestRecord =
      await this.liveGuestService.getGuestsForUser(
        user.userId,
        streamId,
      );

    const isGuest =
      Boolean(guestRecord);

    await socket.leave(
      room,
    );

    let viewerCount = 0;

    if (!isGuest) {
      const stream =
        await this.liveService.getLiveStreamDocument(
          streamId,
        );

      viewerCount =
        Number(stream.viewerCount || 0);
    }

    if (isGuest) {
      /*
       * Guests are co-hosts and are not part of the viewer
       * counter. Mark the guest as left so the host sees
       * the correct guest state. The invitation can still
       * be accepted again/reconnected through the normal
       * guest flow if the frontend requests it.
       */
      await this.liveGuestService.markLeft(
        user.userId,
        streamId,
      );
    } else {
      viewerCount =
        await this.viewerService.leave(
          streamId,
          user.userId,
          socket.id,
        );

      await this.liveService.setViewerCount(
        streamId,
        viewerCount,
      );

      this.server
        .to(room)
        .emit(
          "live:viewer-count",
          {
            streamId,

            viewerCount,
          },
        );
    }

    socket.emit(
      "live:left",
      {
        streamId,

        viewerCount,

        isGuest,
      },
    );

    return {
      success: true,

      streamId,

      viewerCount,

      isGuest,
    };
  }

  /* ==========================================================================
     COMMENT
  ========================================================================== */

  @SubscribeMessage(
    "live:comment",
  )
  async comment(
    @ConnectedSocket()
    socket: LiveSocket,

    @MessageBody()
    payload: {
      streamId: string;
      message: string;
    },
  ) {
    const user =
      this.requireUser(
        socket,
      );

    const streamId =
      this.cleanId(
        payload?.streamId,
      );

    const message =
      String(
        payload?.message ??
          "",
      )
        .trim()
        .replace(
          /\s+/g,
          " ",
        );

    if (!streamId) {
      throw new WsException(
        "A valid stream ID is required.",
      );
    }

    if (!message) {
      throw new WsException(
        "Comment cannot be empty.",
      );
    }

    if (
      message.length > 500
    ) {
      throw new WsException(
        "Comment is too long.",
      );
    }

    this.checkRateLimit(
      socket.id,
      "comment",
      10,
      10_000,
    );

    const stream =
      await this.liveService.getLiveStreamDocument(
        streamId,
      );

    if (
      stream.status !==
      "live"
    ) {
      throw new WsException(
        "Comments are closed for this LIVE stream.",
      );
    }

    const comment =
      await this.commentService.create(
        {
          streamId,

          userId:
            user.userId,

          message,

          userName:
            user.name ||
            user.username ||
            "Fockis User",

          userAvatar:
            user.avatar ||
            "",
        },
      );

    await this.liveService.incrementComment(
      streamId,
    );

    this.server
      .to(
        this.room(
          streamId,
        ),
      )
      .emit(
        "live:comment",
        comment,
      );

    return {
      success: true,

      comment,
    };
  }

  /* ==========================================================================
     LIKE
  ========================================================================== */

  @SubscribeMessage(
    "live:like",
  )
  async like(
    @ConnectedSocket()
    socket: LiveSocket,

    @MessageBody()
    payload: {
      streamId: string;
      liked?: boolean;
    },
  ) {
    const user =
      this.requireUser(
        socket,
      );

    const streamId =
      this.cleanId(
        payload?.streamId,
      );

    if (!streamId) {
      throw new WsException(
        "A valid stream ID is required.",
      );
    }

    this.checkRateLimit(
      socket.id,
      "like",
      30,
      10_000,
    );

    const stream =
      await this.liveService.getLiveStreamDocument(
        streamId,
      );

    if (
      stream.status !==
      "live"
    ) {
      throw new WsException(
        "This LIVE stream is no longer live.",
      );
    }

    /*
     * If liked is omitted, treat it as a LIKE.
     */
    const requestedLiked =
      typeof payload?.liked ===
      "boolean"
        ? payload.liked
        : true;

    let result: {
      liked: boolean;
      changed: boolean;
    };

    if (
      requestedLiked
    ) {
      const likeResult =
        await this.likeService.like(
          streamId,
          user.userId,
        );

      if (
        !likeResult.duplicate
      ) {
        await this.liveService.incrementLike(
          streamId,
          1,
        );
      }

      result = {
        liked: true,

        changed:
          !likeResult.duplicate,
      };
    } else {
      const unlikeResult =
        await this.likeService.unlike(
          streamId,
          user.userId,
        );

      if (
        unlikeResult.existed
      ) {
        await this.liveService.incrementLike(
          streamId,
          -1,
        );
      }

      result = {
        liked: false,

        changed:
          unlikeResult.existed,
      };
    }

    const likeCount =
      await this.likeService.count(
        streamId,
      );

    const event = {
      streamId,

      userId:
        user.userId,

      userName:
        user.name ||
        user.username ||
        "Fockis User",

      liked:
        result.liked,

      changed:
        result.changed,

      likeCount,

      createdAt:
        new Date().toISOString(),
    };

    /*
     * Broadcast to every viewer in the LIVE room,
     * including the user who performed the action.
     */
    this.server
      .to(
        this.room(
          streamId,
        ),
      )
      .emit(
        "live:like",
        event,
      );

    console.log(
      "[LiveGateway] LIVE like:",
      {
        streamId,

        userId:
          user.userId,

        liked:
          result.liked,

        changed:
          result.changed,

        likeCount,
      },
    );

    /*
     * Socket.IO acknowledgement.
     */
    return {
      success: true,

      ...result,

      likeCount,
    };
  }

  /* ==========================================================================
     UNLIKE
  ========================================================================== */

  @SubscribeMessage(
    "live:unlike",
  )
  async unlike(
    @ConnectedSocket()
    socket: LiveSocket,

    @MessageBody()
    payload: {
      streamId: string;
    },
  ) {
    return this.like(
      socket,
      {
        streamId:
          payload?.streamId,

        liked: false,
      },
    );
  }

  /* ==========================================================================
     SHARE
  ========================================================================== */

  @SubscribeMessage(
    "live:share",
  )
  async share(
    @ConnectedSocket()
    socket: LiveSocket,

    @MessageBody()
    payload: {
      streamId: string;
    },
  ) {
    this.requireUser(
      socket,
    );

    const streamId =
      this.cleanId(
        payload?.streamId,
      );

    if (!streamId) {
      throw new WsException(
        "A valid stream ID is required.",
      );
    }

    this.checkRateLimit(
      socket.id,
      "share",
      10,
      30_000,
    );

    const stream =
      await this.liveService.getLiveStreamDocument(
        streamId,
      );

    if (
      stream.status !==
      "live"
    ) {
      throw new WsException(
        "This LIVE stream is no longer live.",
      );
    }

    await this.liveService.incrementShare(
      streamId,
    );

    /*
     * Re-read the stream so the broadcast count
     * represents the persisted value instead of
     * relying on a potentially stale local value.
     */
    const updatedStream =
      await this.liveService.getLiveStreamDocument(
        streamId,
      );

    const shareCount =
      Number(
        updatedStream.shareCount ||
          0,
      );

    this.server
      .to(
        this.room(
          streamId,
        ),
      )
      .emit(
        "live:share-count",
        {
          streamId,

          shareCount,
        },
      );

    return {
      success: true,

      streamId,

      shareCount,
    };
  }

    /* ==========================================================================
     GUEST INVITATION
     ========================================================================== */

  @SubscribeMessage("live:guest-invite")
  async inviteGuest(
    @ConnectedSocket()
    socket: LiveSocket,

    @MessageBody()
    payload: {
      streamId: string;
      guestUserId: string;
      message?: string;
    },
  ) {
    const user =
      this.requireUser(socket);

    const streamId =
      this.cleanId(
        payload?.streamId,
      );

    const guestUserId =
      this.cleanId(
        payload?.guestUserId,
      );

    if (!streamId) {
      throw new WsException(
        "A valid stream ID is required.",
      );
    }

    if (!guestUserId) {
      throw new WsException(
        "A valid guest user ID is required.",
      );
    }

    if (
      guestUserId === user.userId
    ) {
      throw new WsException(
        "The host cannot invite themselves.",
      );
    }

    const invitation =
      await this.liveGuestService.invite(
        user.userId,
        streamId,
        {
          guestUserId,
          message:
            typeof payload?.message ===
            "string"
              ? payload.message
              : undefined,
        },
      );

    this.server
      .to(
        this.userRoom(
          guestUserId,
        ),
      )
      .emit(
        "live:guest-invited",
        invitation,
      );

    this.server
      .to(
        this.room(streamId),
      )
      .emit(
        "live:guest-invitation-created",
        invitation,
      );

    return {
      success: true,
      invitation,
    };
  }

  /* ==========================================================================
     GUEST INVITATION RESPONSE
     ========================================================================== */

  @SubscribeMessage("live:guest-response")
  async guestResponse(
    @ConnectedSocket()
    socket: LiveSocket,

    @MessageBody()
    payload: {
      invitationId: string;
      status:
        | "accepted"
        | "declined";
    },
  ) {
    const user =
      this.requireUser(socket);

    const invitationId =
      this.cleanId(
        payload?.invitationId,
      );

    if (!invitationId) {
      throw new WsException(
        "A valid invitation ID is required.",
      );
    }

    if (
      payload?.status !==
        "accepted" &&
      payload?.status !==
        "declined"
    ) {
      throw new WsException(
        "Invitation response must be accepted or declined.",
      );
    }

    const invitation =
      await this.liveGuestService.respond(
        user.userId,
        invitationId,
        payload.status,
      );

    this.server
      .to(
        this.userRoom(
          invitation.hostId,
        ),
      )
      .emit(
        "live:guest-response",
        invitation,
      );

    this.server
      .to(
        this.room(
          invitation.streamId,
        ),
      )
      .emit(
        "live:guest-response",
        invitation,
      );

    return {
      success: true,
      invitation,
    };
  }

  /* ==========================================================================
     GUEST REMOVE
     ========================================================================== */

  @SubscribeMessage("live:guest-remove")
  async removeGuest(
    @ConnectedSocket()
    socket: LiveSocket,

    @MessageBody()
    payload: {
      streamId: string;
      guestUserId: string;
    },
  ) {
    const user =
      this.requireUser(socket);

    const streamId =
      this.cleanId(
        payload?.streamId,
      );

    const guestUserId =
      this.cleanId(
        payload?.guestUserId,
      );

    if (!streamId) {
      throw new WsException(
        "A valid stream ID is required.",
      );
    }

    if (!guestUserId) {
      throw new WsException(
        "A valid guest user ID is required.",
      );
    }

    const invitation =
      await this.liveGuestService.remove(
        user.userId,
        streamId,
        guestUserId,
      );

    this.server
      .to(
        this.userRoom(
          guestUserId,
        ),
      )
      .emit(
        "live:guest-removed",
        invitation,
      );

    this.server
      .to(
        this.room(streamId),
      )
      .emit(
        "live:guest-removed",
        invitation,
      );

    return {
      success: true,
      invitation,
    };
  }

/* ==========================================================================
     HELPERS
  ========================================================================== */

  private requireUser(
    socket: LiveSocket,
  ): LiveSocketData {
    const user =
      socket.data;

    if (
      !user?.userId
    ) {
      throw new WsException(
        "Authentication required.",
      );
    }

    return user;
  }

  /* ==========================================================================
     JWT EXTRACTION
  ========================================================================== */

  private extractToken(
    socket: Socket,
  ): string | null {
    /*
     * Primary:
     *
     * socket.handshake.auth.token
     */
    const authToken =
      socket.handshake
        .auth?.token;

    if (
      typeof authToken ===
        "string" &&
      authToken.trim()
    ) {
      return authToken
        .replace(
          /^Bearer\s+/i,
          "",
        )
        .trim();
    }

    /*
     * Alternative:
     *
     * socket.handshake.headers.authorization
     */
    const authorization =
      socket.handshake
        .headers
        ?.authorization;

    if (
      typeof authorization ===
        "string" &&
      authorization.trim()
    ) {
      return authorization
        .replace(
          /^Bearer\s+/i,
          "",
        )
        .trim();
    }

    /*
     * Some Socket.IO clients send the token
     * through query.auth/token.
     *
     * This is kept as a fallback.
     */
    const queryToken =
      socket.handshake.query
        ?.token;

    if (
      typeof queryToken ===
        "string" &&
      queryToken.trim()
    ) {
      return queryToken
        .replace(
          /^Bearer\s+/i,
          "",
        )
        .trim();
    }

    return null;
  }

  /* ==========================================================================
     USER ID EXTRACTION
  ========================================================================== */

  private extractUserId(
    payload: JwtPayload,
  ): string {
    const candidates = [
      payload?.userId,
      payload?.id,
      payload?._id,
      payload?.sub,
    ];

    for (
      const candidate of
        candidates
    ) {
      if (
        candidate !==
          undefined &&
        candidate !==
          null
      ) {
        const value =
          String(
            candidate,
          ).trim();

        if (value) {
          return value;
        }
      }
    }

    return "";
  }

  /* ==========================================================================
     STRING HELPERS
  ========================================================================== */

  private cleanString(
    ...values: Array<
      unknown
    >
  ): string {
    const maxLength =
      typeof values[
        values.length - 1
      ] === "number"
        ? Number(
            values.pop(),
          )
        : 150;

    for (
      const value of values
    ) {
      if (
        typeof value ===
          "string" &&
        value.trim()
      ) {
        return value
          .trim()
          .substring(
            0,
            maxLength,
          );
      }
    }

    return "Fockis User";
  }

  private optionalString(
    value: unknown,
    maxLength: number,
  ): string | undefined {
    if (
      typeof value !==
        "string" ||
      !value.trim()
    ) {
      return undefined;
    }

    return value
      .trim()
      .substring(
        0,
        maxLength,
      );
  }

  /* ==========================================================================
     ID
  ========================================================================== */

  private cleanId(
    value: unknown,
  ): string {
    if (
      typeof value !==
      "string"
    ) {
      return "";
    }

    return value.trim();
  }

  /* ==========================================================================
     ROOM
  ========================================================================== */

  private room(
    streamId: string,
  ): string {
    return `live:${streamId}`;
  }

  private userRoom(
    userId: string,
  ): string {
    return `live:user:${userId}`;
  }

  /* ==========================================================================
     RATE LIMIT
  ========================================================================== */

  private checkRateLimit(
    socketId: string,
    action: string,
    max: number,
    windowMs: number,
  ): void {
    const now =
      Date.now();

    let socketLimits =
      this.rateLimits.get(
        socketId,
      );

    if (!socketLimits) {
      socketLimits =
        new Map<
          string,
          RateState
        >();

      this.rateLimits.set(
        socketId,
        socketLimits,
      );
    }

    let state =
      socketLimits.get(
        action,
      );

    if (
      !state ||
      now >=
        state.resetAt
    ) {
      state = {
        count: 0,

        resetAt:
          now + windowMs,
      };

      socketLimits.set(
        action,
        state,
      );
    }

    state.count += 1;

    if (
      state.count > max
    ) {
      throw new WsException(
        `Too many ${action} requests. Please slow down.`,
      );
    }
  }
  /* ==========================================================================
HEART REACTION

IMPORTANT:

This is intentionally DIFFERENT from "live:like".

live:like:
- persistent database like
- one user can like/unlike
- contributes to likeCount

live:heart:
- ephemeral LIVE reaction
- NOT stored in database
- every tap creates another heart
- can be sent repeatedly
- broadcast to everyone in the LIVE room

This is the behavior used for TikTok-style floating hearts.
========================================================================== */

@SubscribeMessage("live:heart")
async heart(
  @ConnectedSocket()
  socket: LiveSocket,

  @MessageBody()
  payload: {
    streamId: string;
  },
) {
  const user =
    this.requireUser(socket);

  const streamId =
    this.cleanId(
      payload?.streamId,
    );

  if (!streamId) {
    throw new WsException(
      "A valid stream ID is required.",
    );
  }

  /*
   * Allow repeated hearts.
   *
   * This is intentionally much higher
   * than the persistent LIKE limit.
   *
   * 40 hearts / second per socket is
   * enough for normal human tapping while
   * preventing an accidental infinite flood.
   */
  this.checkRateLimit(
    socket.id,
    "heart",
    40,
    1_000,
  );

  const stream =
    await this.liveService.getLiveStreamDocument(
      streamId,
    );

  if (
    stream.status !==
    "live"
  ) {
    throw new WsException(
      "This LIVE stream is no longer live.",
    );
  }

  /*
   * This event is intentionally NOT saved
   * to MongoDB.
   *
   * It only exists long enough to be
   * broadcast to viewers.
   */
  const event = {
    id:
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,

    streamId,

    userId:
      user.userId,

    userName:
      user.name ||
      user.username ||
      "Fockis User",

    avatar:
      user.avatar ||
      "",

    createdAt:
      new Date().toISOString(),
  };

  /*
   * Send the heart to EVERYONE watching
   * this LIVE, including the sender.
   */
  this.server
    .to(
      this.room(streamId),
    )
    .emit(
      "live:heart",
      event,
    );

  return {
    success: true,

    streamId,

    heart: event,
  };
}
}