import { Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { JwtService } from "@nestjs/jwt";
import { InjectConnection } from "@nestjs/mongoose";
import {
  ConnectedSocket,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Connection, Types } from "mongoose";
import { Server, Socket } from "socket.io";

import { SESSIONS_REVOKED_EVENT } from "../../admin/notifications/admin-notification.types";

// ============================================================================
// USER NOTIFICATIONS — REAL-TIME DELIVERY
//
// The socket joins the room of the account in its access token. Earlier the
// room came from a client-supplied userId, which let anyone listen to anyone
// else's notifications.
// ============================================================================

const NON_ACCESS_TOKEN_TYPES = new Set(["mfa_setup", "mfa_challenge", "reauth", "login_verification"]);

@WebSocketGateway({
  cors: { origin: true, credentials: false },
  namespace: "notifications",
})
export class NotificationsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private async userIdFor(client: Socket): Promise<string | null> {
    const raw =
      (client.handshake.auth as any)?.token ??
      String(client.handshake.headers?.authorization ?? "").replace(/^Bearer\s+/i, "");
    const token = typeof raw === "string" ? raw.trim() : "";

    if (!token) return null;

    let payload: any;

    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      return null;
    }

    const userId = String(payload?.sub ?? payload?.userId ?? payload?.id ?? "");

    if (!Types.ObjectId.isValid(userId)) return null;
    if (NON_ACCESS_TOKEN_TYPES.has(String(payload?.tokenType ?? "")) || NON_ACCESS_TOKEN_TYPES.has(String(payload?.purpose ?? ""))) {
      return null;
    }

    const user = await this.connection
      .collection("users")
      .findOne(
        { _id: new Types.ObjectId(userId) },
        { projection: { isActive: 1, sessionsRevokedAt: 1, sessionRevocationExemptIat: 1 } },
      );

    if (!user || user.isActive === false) return null;

    if (user.sessionsRevokedAt && typeof payload.iat === "number") {
      const revokedAt = Math.floor(new Date(user.sessionsRevokedAt).getTime() / 1000);
      const exempt = Number(user.sessionRevocationExemptIat);

      if (payload.iat < revokedAt && !(exempt > 0 && payload.iat === exempt)) return null;
    }

    return userId;
  }

  async handleConnection(client: Socket) {
    let userId: string | null = null;

    try {
      userId = await this.userIdFor(client);
    } catch (error) {
      this.logger.warn(`Notification socket auth failed: ${String(error)}`);
    }

    if (!userId) {
      client.disconnect(true);
      return;
    }

    (client.data as any).userId = userId;
    await client.join(`user_${userId}`);
  }

  @OnEvent(SESSIONS_REVOKED_EVENT)
  onSessionsRevoked(event: { userId?: string }) {
    if (event?.userId && this.server) {
      this.server.in(`user_${event.userId}`).disconnectSockets(true);
    }
  }

  sendNotification(userId: string, notification: any) {
    if (!this.server) return;

    this.server.to(`user_${userId}`).emit("notification", notification);
  }

  @SubscribeMessage("ping")
  ping(@ConnectedSocket() client: Socket) {
    client.emit("pong", { message: "notification server active" });
  }
}
