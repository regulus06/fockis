import { Logger, OnModuleInit } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectConnection } from "@nestjs/mongoose";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Connection, Types } from "mongoose";
import { Server, Socket } from "socket.io";

import { RedisService } from "../../redis/redis.service";
import { effectivePermissions } from "./admin-recipients.service";
import { SESSIONS_REVOKED_EVENT } from "./admin-notification.types";

// ============================================================================
// ADMIN NOTIFICATIONS — REAL-TIME DELIVERY
//
// Namespace /admin-notifications. A socket is accepted only with a valid,
// unrevoked access token of an active account that holds administrative
// permissions; it joins only its own room (admin:<userId>). The client never
// chooses a room. Payloads are signals; the browser re-reads its
// notifications over the authenticated REST API, which applies the
// permission filter again.
//
// With Redis available, deliveries go through a channel so every API
// instance pushes to its own connected sockets.
// ============================================================================

const CHANNEL = "admin-notifications:deliver";

const NON_ACCESS_TOKEN_TYPES = new Set([
  "mfa_setup",
  "mfa_challenge",
  "reauth",
  "login_verification",
]);

export interface AdminSocketSignal {
  kind: "notification" | "changed";
  alert?: boolean;
  priority?: string;
  category?: string;
  title?: string;
  link?: string;
}

function room(userId: string): string {
  return `admin:${userId}`;
}

@WebSocketGateway({
  namespace: "/admin-notifications",
  cors: { origin: true, credentials: false },
})
export class AdminNotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(AdminNotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  private readonly expiryTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  onModuleInit(): void {
    this.redis.subscribe(CHANNEL, (message: any) => {
      if (message && typeof message.userId === "string" && message.signal) {
        this.emitLocal(message.userId, message.signal);
      }
    });
  }

  /** Returns the user id when the handshake carries a usable admin token. */
  async authenticate(client: Socket): Promise<{ userId: string; exp: number | null } | null> {
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

    if (
      NON_ACCESS_TOKEN_TYPES.has(String(payload?.tokenType ?? "")) ||
      NON_ACCESS_TOKEN_TYPES.has(String(payload?.purpose ?? ""))
    ) {
      return null;
    }

    const user = await this.connection.collection("users").findOne(
      { _id: new Types.ObjectId(userId) },
      {
        projection: {
          isActive: 1,
          role: 1,
          isSuperAdmin: 1,
          permissions: 1,
          adminRoleId: 1,
          sessionsRevokedAt: 1,
          sessionRevocationExemptIat: 1,
          lockedUntil: 1,
        },
      },
    );

    if (!user || user.isActive === false) return null;

    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) return null;

    if (user.sessionsRevokedAt && typeof payload.iat === "number") {
      const revokedAt = Math.floor(new Date(user.sessionsRevokedAt).getTime() / 1000);
      const exempt = Number(user.sessionRevocationExemptIat);

      if (payload.iat < revokedAt && !(exempt > 0 && payload.iat === exempt)) return null;
    }

    let rolePermissions: unknown = [];

    if (user.adminRoleId && Types.ObjectId.isValid(String(user.adminRoleId))) {
      const role = await this.connection
        .collection("admin_roles")
        .findOne(
          { _id: new Types.ObjectId(String(user.adminRoleId)), isActive: true },
          { projection: { permissions: 1 } },
        );
      rolePermissions = role?.permissions ?? [];
    }

    const effective = effectivePermissions(user as any, rolePermissions);

    if (!effective.isSuperAdmin && effective.permissions.length === 0) return null;

    return { userId, exp: typeof payload.exp === "number" ? payload.exp : null };
  }

  async handleConnection(client: Socket): Promise<void> {
    let identity: { userId: string; exp: number | null } | null = null;

    try {
      identity = await this.authenticate(client);
    } catch (error) {
      this.logger.warn(`Admin notification socket auth failed: ${String(error)}`);
    }

    if (!identity) {
      client.emit("admin-notifications:error", { message: "Unauthorized" });
      client.disconnect(true);
      return;
    }

    (client.data as any).userId = identity.userId;
    await client.join(room(identity.userId));
    client.emit("admin-notifications:ready", { ok: true });

    // Disconnect when the access token expires; the client reconnects with
    // a fresh token (or not at all once signed out).
    if (identity.exp) {
      const ms = identity.exp * 1000 - Date.now();
      const timer = setTimeout(() => client.disconnect(true), Math.max(1000, Math.min(ms, 2 ** 31 - 1)));
      this.expiryTimers.set(client.id, timer);
    }
  }

  handleDisconnect(client: Socket): void {
    const timer = this.expiryTimers.get(client.id);

    if (timer) clearTimeout(timer);

    this.expiryTimers.delete(client.id);
  }

  /** Push a signal to one administrator (all API instances). */
  deliver(userId: string, signal: AdminSocketSignal): void {
    if (!Types.ObjectId.isValid(userId)) return;

    void this.redis
      .publish(CHANNEL, { userId, signal })
      .then((receivers) => {
        if (!receivers) this.emitLocal(userId, signal);
      })
      .catch(() => this.emitLocal(userId, signal));
  }

  private emitLocal(userId: string, signal: AdminSocketSignal): void {
    if (!this.server) return;

    this.server.to(room(userId)).emit("admin-notification", signal);
  }

  @OnEvent(SESSIONS_REVOKED_EVENT)
  onSessionsRevoked(event: { userId?: string }): void {
    if (event?.userId) this.disconnectUser(String(event.userId));
  }

  /** Sign a user's sockets out (e.g. sessions revoked). */
  disconnectUser(userId: string): void {
    if (!this.server) return;

    this.server.in(room(userId)).disconnectSockets(true);
  }
}
