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

import { JwtService } from "@nestjs/jwt";

import {
  Server,
  Socket,
} from "socket.io";

import { MeetingsService } from "../services/meetings.service";

interface AuthenticatedUser {
  sub: string;
  username?: string;
  email?: string;
}

interface MeetingSocket extends Socket {
  data: {
    user?: AuthenticatedUser;
    meetingIds?: Set<string>;
    waitingMeetings?: Set<string>;
  };
}

@WebSocketGateway({
  namespace: "/meetings",

  cors: {
    origin:
      process.env.WEB_ORIGIN ||
      "http://localhost:5173",

    credentials: true,
  },
})
@Injectable()
export class MeetingsGateway {
  @WebSocketServer()
  server!: Server;

  private readonly logger =
    new Logger(MeetingsGateway.name);

  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly jwtService: JwtService,
  ) {}

  // ============================================================
  // AUTHENTICATION
  // ============================================================

  private authenticate(
    socket: MeetingSocket,
  ): AuthenticatedUser | null {
    const authToken =
      socket.handshake.auth?.token;

    const header =
      socket.handshake.headers.authorization;

    const token =
      typeof authToken === "string" &&
      authToken.trim()
        ? authToken.trim()
        : typeof header === "string"
          ? header
              .replace(/^Bearer\s+/i, "")
              .trim()
          : "";

    if (!token) {
      return null;
    }

    try {
      const user =
        this.jwtService.verify<AuthenticatedUser>(
          token,
        );

      if (!user?.sub) {
        return null;
      }

      return {
        ...user,
        sub: String(user.sub),
      };
    } catch {
      return null;
    }
  }

  private isAuthenticated(
    socket: MeetingSocket,
  ): boolean {
    return Boolean(socket.data.user?.sub);
  }

  // ============================================================
  // MEETING STATE
  // ============================================================

  private hasJoinedMeeting(
    socket: MeetingSocket,
    meetingId: string,
  ): boolean {
    return Boolean(
      socket.data.meetingIds?.has(meetingId),
    );
  }

  private rememberMeeting(
    socket: MeetingSocket,
    meetingId: string,
  ): void {
    if (!socket.data.meetingIds) {
      socket.data.meetingIds =
        new Set<string>();
    }

    socket.data.meetingIds.add(meetingId);

    socket.data.waitingMeetings?.delete(
      meetingId,
    );
  }

  private rememberWaiting(
    socket: MeetingSocket,
    meetingId: string,
  ): void {
    if (!socket.data.waitingMeetings) {
      socket.data.waitingMeetings =
        new Set<string>();
    }

    socket.data.waitingMeetings.add(
      meetingId,
    );
  }

  private forgetMeeting(
    socket: MeetingSocket,
    meetingId: string,
  ): void {
    socket.data.meetingIds?.delete(
      meetingId,
    );

    socket.data.waitingMeetings?.delete(
      meetingId,
    );
  }

  private normalizeMeetingId(
    value: unknown,
  ): string {
    return String(value ?? "").trim();
  }

  // ============================================================
  // CONNECTION
  // ============================================================

  async handleConnection(
    socket: MeetingSocket,
  ): Promise<void> {
    const user =
      this.authenticate(socket);

    if (!user?.sub) {
      socket.emit("meeting:error", {
        message:
          "Authentication required",
      });

      socket.disconnect(true);

      return;
    }

    socket.data.user = user;

    socket.data.meetingIds =
      new Set<string>();

    socket.data.waitingMeetings =
      new Set<string>();

    this.logger.log(
      `Meeting socket connected: ${user.sub} (${socket.id})`,
    );
  }

  // ============================================================
  // DISCONNECT
  // ============================================================

  async handleDisconnect(
    socket: MeetingSocket,
  ): Promise<void> {
    const userId =
      socket.data.user?.sub;

    const meetingIds =
      Array.from(
        socket.data.meetingIds ?? [],
      );

    if (userId) {
      for (const meetingId of meetingIds) {
        try {
          await this.meetingsService.leave(
            meetingId,
            userId,
          );

          this.server
            .to(`meeting:${meetingId}`)
            .emit("participant:left", {
              userId,
            });
        } catch {
          // Meeting may already be ended/deleted.
        }
      }
    }

    this.logger.log(
      `Meeting socket disconnected: ${socket.id}`,
    );
  }

  // ============================================================
  // JOIN MEETING
  // ============================================================

  @SubscribeMessage("meeting:join")
  async joinMeeting(
    @ConnectedSocket()
    socket: MeetingSocket,

    @MessageBody()
    body: {
      meetingId: string;
      /**
       * Kept for backwards compatibility with older clients.
       *
       * IMPORTANT:
       * The Socket.IO layer intentionally does NOT validate or
       * consume the meeting passcode anymore.
       *
       * Passcode validation happens once through:
       * POST /meetings/:meetingId/join
       *
       * That HTTP request creates/updates the participant admission
       * record. The realtime connection then verifies that admission.
       */
      passcode?: string;
    },
  ) {
    const user =
      socket.data.user;

    if (!user?.sub) {
      return {
        admitted: false,
        message:
          "Authentication required",
      };
    }

    const meetingId =
      this.normalizeMeetingId(
        body?.meetingId,
      );

    if (!meetingId) {
      return {
        admitted: false,
        message:
          "Meeting ID is required",
      };
    }

    const displayName =
      user.username ||
      user.email ||
      "Fockis User";

    try {
      /*
       * IMPORTANT SECURITY FLOW
       * ---------------------------------------------------------------
       *
       * The REST /join endpoint is the authoritative admission step.
       * It validates the meeting passcode and writes the participant
       * record.
       *
       * Do NOT call meetingsService.join() here.
       *
       * Calling join() again would require the passcode a second time
       * and was the cause of:
       *
       *   "Invalid meeting passcode"
       *
       * Instead, verify the participant that was already admitted by
       * the HTTP /join request.
       */
      const participant =
        await this.meetingsService.ensureParticipant(
          meetingId,
          user.sub,
        );

      const resolvedMeetingId =
        String(
          meetingId,
        );

      const room =
        `meeting:${resolvedMeetingId}`;

      await socket.join(room);

      this.rememberMeeting(
        socket,
        resolvedMeetingId,
      );

      /*
       * Build the realtime participant object from the persisted
       * participant record rather than assuming default media state.
       */
      const realtimeParticipant = {
        id: user.sub,

        user: {
          id: user.sub,
          displayName:
            participant.displayName ||
            displayName,
        },

        role:
          participant.role ||
          "participant",

        micOn:
          participant.micOn !== false,

        cameraOn:
          participant.cameraOn !== false,

        handRaised:
          Boolean(
            participant.handRaised,
          ),

        isSpeaking:
          Boolean(
            participant.isSpeaking,
          ),

        screenSharing:
          Boolean(
            participant.screenSharing,
          ),

        connectionQuality:
          "good",

        joinedAt:
          participant.joinedAt
            ? new Date(
                participant.joinedAt,
              ).toISOString()
            : new Date().toISOString(),
      };

      /*
       * Notify everyone already inside the room.
       */
      socket
        .to(room)
        .emit(
          "participant:joined",
          realtimeParticipant,
        );

      /*
       * The REST admission already succeeded, so the socket is now
       * fully admitted. We intentionally do not expose the meeting
       * passcode here.
       */
      const result = {
        admitted: true,
        waiting: false,
        meetingId:
          resolvedMeetingId,
        message:
          "Connected to meeting",
      };

      socket.emit(
        "meeting:admitted",
        result,
      );

      return result;
    } catch (error: any) {
      const message =
        error?.response?.message ||
        error?.message ||
        "You have not been admitted to this meeting";

      /*
       * A participant who has not passed the HTTP admission step
       * cannot enter the realtime meeting room.
       */
      socket.emit(
        "meeting:error",
        {
          meetingId,
          message,
        },
      );

      return {
        admitted: false,
        meetingId,
        message,
      };
    }
  }

  // ============================================================
  // LEAVE MEETING
  // ============================================================

  @SubscribeMessage("meeting:leave")
  async leaveMeeting(
    @ConnectedSocket()
    socket: MeetingSocket,

    @MessageBody()
    body: {
      meetingId: string;
    },
  ) {
    const user =
      socket.data.user;

    if (!user?.sub) {
      return {
        success: false,
        message:
          "Authentication required",
      };
    }

    const meetingId =
      this.normalizeMeetingId(
        body?.meetingId,
      );

    if (!meetingId) {
      return {
        success: false,
        message:
          "Meeting ID is required",
      };
    }

    const room =
      `meeting:${meetingId}`;

    try {
      await this.meetingsService.leave(
        meetingId,
        user.sub,
      );
    } catch {
      // Continue with socket cleanup.
    }

    await socket.leave(room);

    this.forgetMeeting(
      socket,
      meetingId,
    );

    this.server
      .to(room)
      .emit(
        "participant:left",
        {
          userId: user.sub,
        },
      );

    return {
      success: true,
      meetingId,
    };
  }

  // ============================================================
  // CHAT
  // ============================================================

  @SubscribeMessage("meeting:chat")
  async chat(
    @ConnectedSocket()
    socket: MeetingSocket,

    @MessageBody()
    body: {
      meetingId: string;
      body: string;
    },
  ) {
    const user =
      socket.data.user;

    if (!user?.sub) {
      return {
        success: false,
        message:
          "Authentication required",
      };
    }

    const meetingId =
      this.normalizeMeetingId(
        body?.meetingId,
      );

    if (
      !meetingId ||
      !this.hasJoinedMeeting(
        socket,
        meetingId,
      )
    ) {
      return {
        success: false,
        message:
          "You are not admitted to this meeting",
      };
    }

    const text =
      String(body?.body ?? "").trim();

    if (!text) {
      return {
        success: false,
        message:
          "Message cannot be empty",
      };
    }

    const message =
      await this.meetingsService.addMessage(
        meetingId,
        user.sub,
        user.username ||
          user.email ||
          "Fockis User",
        {
          body: text,
        },
      );

    this.server
      .to(`meeting:${meetingId}`)
      .emit(
        "chat:message",
        message,
      );

    return message;
  }

  // ============================================================
  // RAISE HAND
  // ============================================================

  @SubscribeMessage("participant:hand")
  async hand(
    @ConnectedSocket()
    socket: MeetingSocket,

    @MessageBody()
    body: {
      meetingId: string;
      raised: boolean;
    },
  ) {
    const user =
      socket.data.user;

    if (!user?.sub) {
      return {
        success: false,
        message:
          "Authentication required",
      };
    }

    const meetingId =
      this.normalizeMeetingId(
        body?.meetingId,
      );

    if (
      !this.hasJoinedMeeting(
        socket,
        meetingId,
      )
    ) {
      return {
        success: false,
        message:
          "You are not admitted to this meeting",
      };
    }

    this.server
      .to(`meeting:${meetingId}`)
      .emit(
        "participant:hand",
        {
          userId: user.sub,

          displayName:
            user.username ||
            user.email ||
            "Fockis User",

          raised:
            Boolean(body?.raised),
        },
      );

    return {
      success: true,
    };
  }

  // ============================================================
  // MEDIA
  // ============================================================

  @SubscribeMessage("participant:media")
  async media(
    @ConnectedSocket()
    socket: MeetingSocket,

    @MessageBody()
    body: {
      meetingId: string;
      micOn?: boolean;
      cameraOn?: boolean;
      screenSharing?: boolean;
    },
  ) {
    const user =
      socket.data.user;

    if (!user?.sub) {
      return {
        success: false,
        message:
          "Authentication required",
      };
    }

    const meetingId =
      this.normalizeMeetingId(
        body?.meetingId,
      );

    if (
      !this.hasJoinedMeeting(
        socket,
        meetingId,
      )
    ) {
      return {
        success: false,
        message:
          "You are not admitted to this meeting",
      };
    }

    this.server
      .to(`meeting:${meetingId}`)
      .emit(
        "participant:media",
        {
          userId: user.sub,

          displayName:
            user.username ||
            user.email ||
            "Fockis User",

          micOn:
            body?.micOn,

          cameraOn:
            body?.cameraOn,

          screenSharing:
            body?.screenSharing,
        },
      );

    return {
      success: true,
    };
  }

  // ============================================================
  // SPEAKING
  // ============================================================

  @SubscribeMessage("participant:speaking")
  async speaking(
    @ConnectedSocket()
    socket: MeetingSocket,

    @MessageBody()
    body: {
      meetingId: string;
      speaking: boolean;
    },
  ) {
    const user =
      socket.data.user;

    if (!user?.sub) {
      return {
        success: false,
        message:
          "Authentication required",
      };
    }

    const meetingId =
      this.normalizeMeetingId(
        body?.meetingId,
      );

    if (
      !this.hasJoinedMeeting(
        socket,
        meetingId,
      )
    ) {
      return {
        success: false,
        message:
          "You are not admitted to this meeting",
      };
    }

    this.server
      .to(`meeting:${meetingId}`)
      .emit(
        "participant:speaking",
        {
          userId: user.sub,

          displayName:
            user.username ||
            user.email ||
            "Fockis User",

          speaking:
            Boolean(
              body?.speaking,
            ),
        },
      );

    return {
      success: true,
    };
  }

  // ============================================================
  // ADMIT WAITING PARTICIPANT
  // ============================================================

  @SubscribeMessage("meeting:admit")
  async admitParticipant(
    @ConnectedSocket()
    socket: MeetingSocket,

    @MessageBody()
    body: {
      meetingId: string;
      userId: string;
    },
  ) {
    const host =
      socket.data.user;

    if (!host?.sub) {
      return {
        success: false,
        message:
          "Authentication required",
      };
    }

    const meetingId =
      this.normalizeMeetingId(
        body?.meetingId,
      );

    const participantUserId =
      this.normalizeMeetingId(
        body?.userId,
      );

    if (
      !meetingId ||
      !participantUserId
    ) {
      return {
        success: false,
        message:
          "Meeting ID and participant user ID are required",
      };
    }

    const result =
      await this.meetingsService.admitParticipant(
        meetingId,
        host.sub,
        participantUserId,
      );

    const room =
      `meeting:${meetingId}`;

    // Find the waiting participant's socket.
    const sockets =
      Array.from(
        this.server.sockets.sockets.values(),
      );

    for (const participantSocket of sockets) {
      const participant =
        participantSocket.data
          ?.user as
          | AuthenticatedUser
          | undefined;

      const waitingMeetings =
        participantSocket.data
          ?.waitingMeetings;

      if (
        participant?.sub ===
          participantUserId &&
        waitingMeetings?.has(
          meetingId,
        )
      ) {
        await participantSocket.join(
          room,
        );

        const typedSocket =
          participantSocket as MeetingSocket;

        this.rememberMeeting(
          typedSocket,
          meetingId,
        );

        participantSocket.emit(
          "meeting:admitted",
          {
            ...result,
            meetingId,
          },
        );

        participantSocket
          .to(room)
          .emit(
            "participant:joined",
            {
              id: participantUserId,

              user: {
                id: participantUserId,

                displayName:
                  participantSocket
                    .data
                    .user
                    ?.username ||
                  participantSocket
                    .data
                    .user
                    ?.email ||
                  "Fockis User",
              },

              role:
                "participant",

              micOn: true,
              cameraOn: true,
              handRaised: false,
              isSpeaking: false,
              screenSharing: false,

              connectionQuality:
                "good",

              joinedAt:
                new Date().toISOString(),
            },
          );
      }
    }

    this.server
      .to(room)
      .emit(
        "meeting:participant-admitted",
        result,
      );

    return result;
  }

  // ============================================================
  // REJECT WAITING PARTICIPANT
  // ============================================================

  @SubscribeMessage("meeting:reject")
  async rejectParticipant(
    @ConnectedSocket()
    socket: MeetingSocket,

    @MessageBody()
    body: {
      meetingId: string;
      userId: string;
    },
  ) {
    const host =
      socket.data.user;

    if (!host?.sub) {
      return {
        success: false,
        message:
          "Authentication required",
      };
    }

    const meetingId =
      this.normalizeMeetingId(
        body?.meetingId,
      );

    const participantUserId =
      this.normalizeMeetingId(
        body?.userId,
      );

    if (
      !meetingId ||
      !participantUserId
    ) {
      return {
        success: false,
        message:
          "Meeting ID and participant user ID are required",
      };
    }

    const result =
      await this.meetingsService.rejectParticipant(
        meetingId,
        host.sub,
        participantUserId,
      );

    const sockets =
      Array.from(
        this.server.sockets.sockets.values(),
      );

    for (const participantSocket of sockets) {
      const participant =
        participantSocket.data
          ?.user as
          | AuthenticatedUser
          | undefined;

      if (
        participant?.sub ===
        participantUserId
      ) {
        participantSocket.data
          .waitingMeetings
          ?.delete(meetingId);

        participantSocket.emit(
          "meeting:rejected",
          {
            ...result,
            meetingId,
          },
        );
      }
    }

    this.server
      .to(`meeting:${meetingId}`)
      .emit(
        "meeting:participant-rejected",
        result,
      );

    return result;
  }
}