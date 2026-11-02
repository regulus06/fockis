import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { createHash, randomUUID } from "crypto";
import * as jwt from "jsonwebtoken";
import { Model, Types } from "mongoose";

import { isInteractionAllowed } from "../../policy-center/privacy-enforcement";
import { NotificationsService } from "../../notifications/notifications.service";
import { LiveTokenService } from "../../my-live/services/live-token.service";
import { User } from "../../users/user.schema";
import { MessagesService } from "../messages.service";
import {
  CallMediaType,
  CallRecord,
  CallRecordDocument,
  CallState,
  FINAL_CALL_STATES,
  UserDevice,
  UserDeviceDocument,
} from "./call.schemas";
import { CallPushService } from "./call-push.service";
import { RegisterDeviceDto } from "./calls.dto";

/* ============================================================================
   CALLS

   One lifecycle for every surface (web tab, Android, iPhone):

     start ──► ringing ──► accepted ──► ended
                  │
                  ├─► rejected   (receiver declined)
                  ├─► canceled   (caller hung up first)
                  ├─► missed     (nobody answered within RING_TIMEOUT_MS)
                  └─► busy       (receiver already in another call)

   Socket.IO delivers events to open apps; CallPushService rings phones that
   are closed or locked. Media goes through LiveKit; only the two people in
   the call can get a token for its room, and only after it was accepted.
============================================================================ */

export const RING_TIMEOUT_MS = 45_000;
/** How long an accepted call survives with one side fully disconnected. */
export const DISCONNECT_GRACE_MS = 30_000;

/** What the service needs from the Socket.IO gateway. */
export interface CallSignals {
  notifyUser(userId: string, event: string, payload: unknown): boolean;
  hasConnectedSocket(userId: string): boolean;
  broadcastNewMessage(message: any, senderId: string): Promise<void>;
}

export interface CallParty {
  id: string;
  username: string;
  name: string;
  avatar: string;
}

export interface CallView {
  callId: string;
  callerId: string;
  receiverId: string;
  type: CallMediaType;
  status: CallState;
  direction: "outgoing" | "incoming";
  peer: CallParty | null;
  caller: CallParty | null;
  receiver: CallParty | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  endedAt: string | null;
  endReason: string;
  durationSec: number;
  missed: boolean;
}

const oid = (id: string) => new Types.ObjectId(id);
const iso = (d?: Date | string | null) => (d ? new Date(d).toISOString() : null);

@Injectable()
export class CallsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CallsService.name);
  private signals: CallSignals | null = null;
  private sweeper: NodeJS.Timeout | null = null;
  private readonly ringTimers = new Map<string, NodeJS.Timeout>();
  private readonly graceTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectModel(CallRecord.name) private readonly calls: Model<CallRecordDocument>,
    @InjectModel(UserDevice.name) private readonly devices: Model<UserDeviceDocument>,
    @InjectModel(User.name) private readonly users: Model<any>,
    private readonly messages: MessagesService,
    private readonly push: CallPushService,
    private readonly liveTokens: LiveTokenService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  /** Called by the gateway once it exists (avoids a circular provider). */
  bindSignals(signals: CallSignals) {
    this.signals = signals;
  }

  onModuleInit() {
    if (process.env.NODE_ENV === "test") return;
    // Safety net for missed calls when a timer was lost (restart, other instance).
    this.sweeper = setInterval(() => void this.expireOverdue().catch((e) => this.logger.warn(String(e))), 10_000);
    this.sweeper.unref?.();
  }

  onModuleDestroy() {
    if (this.sweeper) clearInterval(this.sweeper);
    for (const t of [...this.ringTimers.values(), ...this.graceTimers.values()]) clearTimeout(t);
  }

  /* ======================================================================
     HELPERS
  ====================================================================== */

  private emit(userId: string, event: string, payload: unknown) {
    return this.signals?.notifyUser(String(userId), event, payload) ?? false;
  }

  private online(userId: string) {
    return this.signals?.hasConnectedSocket(String(userId)) ?? false;
  }

  private async parties(ids: string[]): Promise<Map<string, CallParty>> {
    const valid = [...new Set(ids.filter((id) => Types.ObjectId.isValid(id)))];
    const rows = valid.length
      ? ((await this.users
          .find({ _id: { $in: valid.map(oid) } })
          .select("username firstName lastName profilePicture")
          .lean()
          .exec()) as any[])
      : [];
    const map = new Map<string, CallParty>();
    for (const u of rows) {
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.username || "Fockis user";
      map.set(String(u._id), { id: String(u._id), username: u.username ?? "", name, avatar: u.profilePicture ?? "" });
    }
    return map;
  }

  private view(record: any, viewerId: string, people: Map<string, CallParty>): CallView {
    const callerId = String(record.callerId);
    const receiverId = String(record.receiverId);
    const outgoing = callerId === String(viewerId);
    return {
      callId: record.callId,
      callerId,
      receiverId,
      type: record.type,
      status: record.status,
      direction: outgoing ? "outgoing" : "incoming",
      peer: people.get(outgoing ? receiverId : callerId) ?? null,
      caller: people.get(callerId) ?? null,
      receiver: people.get(receiverId) ?? null,
      createdAt: iso(record.createdAt) ?? new Date().toISOString(),
      expiresAt: iso(record.ringingUntil) ?? "",
      acceptedAt: iso(record.acceptedAt),
      endedAt: iso(record.endedAt),
      endReason: record.endReason ?? "",
      durationSec: Number(record.durationSec ?? 0),
      missed: !outgoing && ["missed", "busy"].includes(record.status),
    };
  }

  private async viewFor(record: any, viewerId: string) {
    const people = await this.parties([String(record.callerId), String(record.receiverId)]);
    return this.view(record, viewerId, people);
  }

  private async findForParticipant(callId: string, userId: string) {
    if (typeof callId !== "string" || !callId || callId.length > 64) throw new BadRequestException("Call ID is required.");
    const record = (await this.calls.findOne({ callId }).lean().exec()) as any;
    if (!record) throw new NotFoundException("Call not found.");
    if (String(record.callerId) !== String(userId) && String(record.receiverId) !== String(userId)) {
      // Same answer as "not found": don't reveal other people's calls.
      throw new NotFoundException("Call not found.");
    }
    return record;
  }

  private async isBlocked(a: string, b: string) {
    const model = this.users.db?.models?.["Friendship"];
    if (!model) return false;
    return Boolean(
      await model
        .exists({ status: "blocked", $or: [{ requester: oid(a), receiver: oid(b) }, { requester: oid(b), receiver: oid(a) }] })
        .exec()
        .catch(() => null),
    );
  }

  private label(type: CallMediaType, status: CallState, durationSec: number) {
    const kind = type === "video" ? "video call" : "voice call";
    if (status === "ended" && durationSec > 0) {
      const m = Math.floor(durationSec / 60);
      const s = String(durationSec % 60).padStart(2, "0");
      return `${kind[0].toUpperCase()}${kind.slice(1)} · ${m}:${s}`;
    }
    if (status === "rejected") return `Declined ${kind}`;
    if (status === "failed") return `${kind[0].toUpperCase()}${kind.slice(1)} failed`;
    return `Missed ${kind}`;
  }

  private clearTimers(callId: string) {
    const ring = this.ringTimers.get(callId);
    if (ring) clearTimeout(ring);
    this.ringTimers.delete(callId);
    for (const [key, timer] of this.graceTimers) {
      if (key.startsWith(`${callId}:`)) {
        clearTimeout(timer);
        this.graceTimers.delete(key);
      }
    }
  }

  /* ======================================================================
     START
  ====================================================================== */

  async start(callerId: string, receiverId: string, type: CallMediaType, deviceId = "") {
    if (!Types.ObjectId.isValid(callerId)) throw new ForbiddenException("Sign in to make calls.");
    if (!Types.ObjectId.isValid(receiverId)) throw new BadRequestException("Choose who to call.");
    if (type !== "voice" && type !== "video") throw new BadRequestException("Invalid call type.");
    if (String(callerId) === String(receiverId)) throw new BadRequestException("You cannot call yourself.");

    const receiverExists = await this.users.exists({ _id: oid(receiverId) }).exec();
    if (!receiverExists) throw new NotFoundException("This account is not available.");
    if (await this.isBlocked(callerId, receiverId)) throw new ForbiddenException("You can't call this account.");
    if (!(await isInteractionAllowed(this.users.db, "messaging", callerId, receiverId))) {
      throw new ForbiddenException("This person isn't accepting calls from you.");
    }

    const now = new Date();
    const liveStatuses: CallState[] = ["ringing", "accepted"];
    const live = { status: { $in: liveStatuses } };

    // Already calling each other? Hand back the existing call instead of a second one.
    const samePair = (await this.calls
      .findOne({
        ...live,
        $or: [
          { callerId: oid(callerId), receiverId: oid(receiverId) },
          { callerId: oid(receiverId), receiverId: oid(callerId) },
        ],
      })
      .lean()
      .exec()) as any;
    if (samePair && (samePair.status === "accepted" || new Date(samePair.ringingUntil) > now)) {
      throw new ConflictException({ message: "A call is already active between you two.", callId: samePair.callId });
    }

    const callerBusy = await this.calls
      .exists({ status: "accepted", $or: [{ callerId: oid(callerId) }, { receiverId: oid(callerId) }] })
      .exec();
    if (callerBusy) throw new ConflictException("End your current call first.");

    const callId = randomUUID();
    const ringingUntil = new Date(now.getTime() + RING_TIMEOUT_MS);
    const receiverBusy = await this.calls
      .exists({
        $or: [
          { status: "accepted", $or: [{ callerId: oid(receiverId) }, { receiverId: oid(receiverId) }] },
          { status: "ringing", ringingUntil: { $gt: now }, $or: [{ callerId: oid(receiverId) }, { receiverId: oid(receiverId) }] },
        ],
      })
      .exec();

    await this.calls.create({
      callId,
      callerId: oid(callerId),
      receiverId: oid(receiverId),
      type,
      status: receiverBusy ? "busy" : "ringing",
      ringingUntil,
      acceptedAt: null,
      acceptedDeviceId: "",
      endedAt: receiverBusy ? now : null,
      endedBy: null,
      endReason: receiverBusy ? "busy" : "",
      durationSec: 0,
      roomName: `fockis-call-${callId}`,
      notifiedDevices: [],
      missedSeen: false,
    });

    let record = (await this.calls.findOne({ callId }).lean().exec()) as any;
    const people = await this.parties([callerId, receiverId]);

    if (receiverBusy) {
      await this.afterFinal(record, people);
      return { ...this.view(record, callerId, people), delivered: { socket: false, push: 0 } };
    }

    const caller = people.get(String(callerId));
    const incoming = {
      ...this.view(record, receiverId, people),
      // Fields the existing web client already reads.
      createdAt: iso(record.createdAt) ?? now.toISOString(),
    };

    const socketDelivered = this.emit(receiverId, "call:incoming", incoming);
    // The caller's other tabs/devices show "Calling …" too.
    this.emit(callerId, "call:outgoing", { ...this.view(record, callerId, people), originDeviceId: deviceId });

    const pushed = await this.push
      .sendIncomingCall(
        receiverId,
        {
          callId,
          callerId: String(callerId),
          callerName: caller?.name ?? "Fockis user",
          callerAvatar: caller?.avatar ?? "",
          type,
          expiresAt: ringingUntil.toISOString(),
          actionToken: this.actionToken(callId, receiverId),
        },
        record.notifiedDevices ?? [],
      )
      .catch((error) => {
        this.logger.warn(`Incoming-call push failed: ${String(error)}`);
        return [] as string[];
      });
    if (pushed.length) {
      await this.calls.updateOne({ callId }, { $addToSet: { notifiedDevices: { $each: pushed } } }).exec();
      record = { ...record, notifiedDevices: [...(record.notifiedDevices ?? []), ...pushed] };
    }

    const timer = setTimeout(() => void this.expire(callId).catch((e) => this.logger.warn(String(e))), RING_TIMEOUT_MS + 250);
    timer.unref?.();
    this.ringTimers.set(callId, timer);

    this.logger.log(`[FOCKIS CALL] ringing call=${callId} type=${type} socket=${socketDelivered} push=${pushed.length}`);
    return { ...this.view(record, callerId, people), delivered: { socket: socketDelivered, push: pushed.length } };
  }

  /* ======================================================================
     ACCEPT / DECLINE / END
  ====================================================================== */

  async accept(userId: string, callId: string, deviceId = "") {
    const record = await this.findForParticipant(callId, userId);
    if (String(record.receiverId) !== String(userId)) throw new ForbiddenException("Only the person being called can answer.");

    const now = new Date();
    const updated = (await this.calls
      .findOneAndUpdate(
        { callId, status: "ringing", ringingUntil: { $gt: now } },
        { $set: { status: "accepted", acceptedAt: now, acceptedDeviceId: String(deviceId ?? "").slice(0, 100) } },
        { new: true },
      )
      .lean()
      .exec()) as any;

    if (!updated) {
      const current = (await this.calls.findOne({ callId }).lean().exec()) as any;
      if (current?.status === "accepted") throw new ConflictException("This call was answered on another device.");
      if (current?.status === "ringing") await this.expire(callId);
      throw new ConflictException("This call has already ended.");
    }

    const ring = this.ringTimers.get(callId);
    if (ring) clearTimeout(ring);
    this.ringTimers.delete(callId);

    const people = await this.parties([String(updated.callerId), String(updated.receiverId)]);
    const callerView = this.view(updated, String(updated.callerId), people);
    this.emit(String(updated.callerId), "call:accepted", { ...callerView, callerId: callerView.callerId, receiverId: callerView.receiverId });
    // Every receiver device: the one that answered keeps going, the rest stop ringing.
    this.emit(String(updated.receiverId), "call:answered-elsewhere", {
      ...this.view(updated, String(updated.receiverId), people),
      acceptedDeviceId: updated.acceptedDeviceId,
    });
    void this.push.sendCallEnded(String(updated.receiverId), callId, "answered_elsewhere", updated.acceptedDeviceId).catch(() => undefined);

    this.logger.log(`[FOCKIS CALL] accepted call=${callId}`);
    return this.view(updated, userId, people);
  }

  /** Receiver declines, or the caller cancels while it's still ringing. */
  async decline(userId: string, callId: string) {
    const record = await this.findForParticipant(callId, userId);
    if (record.status === "accepted") return this.end(userId, callId);
    const isCaller = String(record.callerId) === String(userId);
    const status: CallState = isCaller ? "canceled" : "rejected";
    return this.finish(callId, { status, by: userId, reason: isCaller ? "caller_canceled" : "declined", from: ["ringing"] }, userId);
  }

  async end(userId: string, callId: string, reason = "hangup") {
    const record = await this.findForParticipant(callId, userId);
    if (record.status === "ringing") return this.decline(userId, callId);
    return this.finish(callId, { status: "ended", by: userId, reason, from: ["accepted"] }, userId);
  }

  /** Ringing that ran out → missed. */
  async expire(callId: string) {
    this.ringTimers.delete(callId);
    const record = (await this.calls.findOne({ callId }).lean().exec()) as any;
    if (!record || record.status !== "ringing") return null;
    if (new Date(record.ringingUntil).getTime() > Date.now() + 500) return null;
    return this.finish(callId, { status: "missed", by: null, reason: "no_answer", from: ["ringing"] }, String(record.callerId));
  }

  async expireOverdue() {
    const overdue = (await this.calls
      .find({ status: "ringing", ringingUntil: { $lt: new Date() } })
      .select("callId")
      .limit(100)
      .lean()
      .exec()) as any[];
    for (const row of overdue) await this.expire(row.callId);
    return overdue.length;
  }

  /**
   * Moves a call into a final state exactly once (the conditional update
   * guarantees a single winner across sockets, devices and instances),
   * then tells both sides, stops ringing phones, and writes the chat log.
   */
  private async finish(
    callId: string,
    change: { status: CallState; by: string | null; reason: string; from: CallState[] },
    viewerId: string,
  ) {
    const now = new Date();
    const before = (await this.calls.findOne({ callId }).lean().exec()) as any;
    if (!before) throw new NotFoundException("Call not found.");
    if (!change.from.includes(before.status)) {
      if (FINAL_CALL_STATES.includes(before.status)) return this.viewFor(before, viewerId);
      throw new ConflictException("This call can't be changed right now.");
    }

    const durationSec = before.acceptedAt ? Math.max(0, Math.round((now.getTime() - new Date(before.acceptedAt).getTime()) / 1000)) : 0;
    const updated = (await this.calls
      .findOneAndUpdate(
        { callId, status: before.status },
        {
          $set: {
            status: change.status,
            endedAt: now,
            endedBy: change.by && Types.ObjectId.isValid(change.by) ? oid(change.by) : null,
            endReason: change.reason,
            durationSec,
          },
        },
        { new: true },
      )
      .lean()
      .exec()) as any;

    if (!updated) {
      // Someone else finished it a moment earlier.
      const current = (await this.calls.findOne({ callId }).lean().exec()) as any;
      return this.viewFor(current ?? before, viewerId);
    }

    this.clearTimers(callId);
    const people = await this.parties([String(updated.callerId), String(updated.receiverId)]);
    await this.afterFinal(updated, people, before.status === "ringing");
    this.logger.log(`[FOCKIS CALL] ${change.status} call=${callId} reason=${change.reason} duration=${durationSec}s`);
    return this.view(updated, viewerId, people);
  }

  private async afterFinal(record: any, people: Map<string, CallParty>, wasRinging = false) {
    const callerId = String(record.callerId);
    const receiverId = String(record.receiverId);
    const endedAt = iso(record.endedAt) ?? new Date().toISOString();

    for (const userId of [callerId, receiverId]) {
      this.emit(userId, "call:ended", {
        ...this.view(record, userId, people),
        // Fields the existing web client already reads.
        userId: record.endedBy ? String(record.endedBy) : null,
        endedAt,
        reason: record.endReason,
      });
    }
    if (record.status === "rejected") {
      this.emit(callerId, "call:rejected", { callId: record.callId, callerId, receiverId, rejectedAt: endedAt });
    }

    if (wasRinging || record.status === "busy") {
      void this.push.sendCallEnded(receiverId, record.callId, record.status).catch(() => undefined);
    }

    if (record.status === "missed" || record.status === "busy") {
      const caller = people.get(callerId);
      void this.push
        .sendMissedCall(receiverId, {
          callId: record.callId,
          callerId,
          callerName: caller?.name ?? "Fockis user",
          callerAvatar: caller?.avatar ?? "",
          type: record.type,
        })
        .catch(() => undefined);
      await this.notifications
        ?.create({
          recipientId: receiverId,
          senderId: callerId,
          type: "missed_call",
          title: record.type === "video" ? "Missed video call" : "Missed voice call",
          message: `You missed a ${record.type} call from ${caller?.name ?? "someone"}.`,
          entityId: record.callId,
          entityType: "call",
        } as any)
        .catch((error: unknown) => this.logger.warn(`Missed-call notification failed: ${String(error)}`));
    }

    if (record.status !== "canceled" || record.acceptedAt) {
      await this.writeLog(record);
    } else {
      // A canceled call still shows up for the receiver as missed.
      await this.writeLog({ ...record, status: "missed" });
    }
  }

  private async writeLog(record: any) {
    try {
      const message = await this.messages.createCallLog({
        callerId: String(record.callerId),
        receiverId: String(record.receiverId),
        callId: record.callId,
        label: this.label(record.type, record.status, Number(record.durationSec ?? 0)),
      });
      if (message) await this.signals?.broadcastNewMessage(message, String(record.callerId));
    } catch (error) {
      // Privacy settings may forbid creating a conversation; the call record remains.
      this.logger.debug(`Call log skipped for ${record.callId}: ${String(error)}`);
    }
  }

  /* ======================================================================
     ACTIONS FROM A PUSH NOTIFICATION (no login token on the phone)
  ====================================================================== */

  /**
   * A short-lived token that only allows declining (or checking) one call as its receiver.
   * Signed with a key derived from JWT_SECRET (never valid as a login token).
   */
  private actionKey() {
    return createHash("sha256")
      .update(`${process.env.JWT_SECRET || "secretKey123"}:fockis-call-actions`)
      .digest();
  }

  actionToken(callId: string, receiverId: string) {
    return jwt.sign({ cid: callId, uid: String(receiverId), act: "push" }, this.actionKey(), {
      algorithm: "HS256",
      expiresIn: Math.ceil(RING_TIMEOUT_MS / 1000) + 30,
    });
  }

  private verifyPushToken(callId: string, token: string): string {
    let claims: any;
    try {
      // A little leeway so the phone can still learn that the call ended.
      claims = jwt.verify(String(token ?? ""), this.actionKey(), { algorithms: ["HS256"], clockTolerance: 120 });
    } catch {
      throw new ForbiddenException("This call action has expired.");
    }
    if (claims?.act !== "push" || claims?.cid !== callId || !Types.ObjectId.isValid(String(claims?.uid))) {
      throw new ForbiddenException("This call action isn't valid.");
    }
    return String(claims.uid);
  }

  async declineFromPush(callId: string, token: string) {
    const uid = this.verifyPushToken(callId, token);
    const view = await this.decline(uid, callId);
    return { callId: view.callId, status: view.status };
  }

  /** Lets a ringing phone find out the call was answered elsewhere, canceled or missed. */
  async statusFromPush(callId: string, token: string) {
    const uid = this.verifyPushToken(callId, token);
    const view = await this.get(uid, callId);
    return { callId: view.callId, status: view.status, answeredElsewhere: view.status === "accepted" };
  }

  /* ======================================================================
     CONNECTION LOSS (called by the gateway)
  ====================================================================== */

  /** A user has no sockets left. Their accepted calls end if they don't come back. */
  async handleUserOffline(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return;
    const active = (await this.calls
      .find({ status: { $in: ["accepted", "ringing"] }, $or: [{ callerId: oid(userId) }, { receiverId: oid(userId) }] })
      .lean()
      .exec()) as any[];
    for (const call of active) {
      // A ringing receiver may answer from a push notification: don't cancel.
      if (call.status === "ringing" && String(call.receiverId) === String(userId)) continue;
      const key = `${call.callId}:${userId}`;
      if (this.graceTimers.has(key)) continue;
      const timer = setTimeout(() => {
        this.graceTimers.delete(key);
        if (this.online(userId)) return;
        void this.finish(
          call.callId,
          { status: call.status === "ringing" ? "canceled" : "ended", by: userId, reason: "connection_lost", from: [call.status] },
          userId,
        ).catch(() => undefined);
      }, DISCONNECT_GRACE_MS);
      timer.unref?.();
      this.graceTimers.set(key, timer);
    }
  }

  handleUserOnline(userId: string) {
    for (const [key, timer] of this.graceTimers) {
      if (key.endsWith(`:${userId}`)) {
        clearTimeout(timer);
        this.graceTimers.delete(key);
      }
    }
  }

  /* ======================================================================
     QUERIES
  ====================================================================== */

  async get(userId: string, callId: string) {
    const record = await this.findForParticipant(callId, userId);
    if (record.status === "ringing" && new Date(record.ringingUntil) <= new Date()) {
      await this.expire(callId);
      return this.viewFor((await this.calls.findOne({ callId }).lean().exec()) as any, userId);
    }
    return this.viewFor(record, userId);
  }

  /** Calls that are ringing for this user right now (used when an app opens from a push). */
  async pending(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return [];
    const rows = (await this.calls
      .find({ receiverId: oid(userId), status: "ringing", ringingUntil: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
      .exec()) as any[];
    const people = await this.parties(rows.flatMap((r) => [String(r.callerId), String(r.receiverId)]));
    return rows.map((r) => this.view(r, userId, people));
  }

  async history(userId: string, options: { filter?: string; before?: string; limit?: number } = {}) {
    if (!Types.ObjectId.isValid(userId)) return { items: [], nextCursor: null };
    const me = oid(userId);
    const limit = Math.min(Math.max(Number(options.limit) || 30, 1), 100);
    const filter: any =
      options.filter === "missed"
        ? { receiverId: me, status: { $in: ["missed", "busy"] } }
        : options.filter === "outgoing"
          ? { callerId: me }
          : options.filter === "incoming"
            ? { receiverId: me }
            : { $or: [{ callerId: me }, { receiverId: me }] };
    if (options.before) {
      const before = new Date(options.before);
      if (!Number.isNaN(before.getTime())) filter.createdAt = { $lt: before };
    }
    const rows = (await this.calls.find(filter).sort({ createdAt: -1 }).limit(limit + 1).lean().exec()) as any[];
    const page = rows.slice(0, limit);
    const people = await this.parties(page.flatMap((r) => [String(r.callerId), String(r.receiverId)]));
    return {
      items: page.map((r) => this.view(r, userId, people)),
      nextCursor: rows.length > limit ? iso(page[page.length - 1]?.createdAt) : null,
    };
  }

  async missedCount(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return { count: 0 };
    const count = await this.calls
      .countDocuments({ receiverId: oid(userId), status: { $in: ["missed", "busy"] }, missedSeen: { $ne: true } })
      .exec();
    return { count };
  }

  async markMissedSeen(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return { count: 0 };
    await this.calls
      .updateMany({ receiverId: oid(userId), status: { $in: ["missed", "busy"] }, missedSeen: { $ne: true } }, { $set: { missedSeen: true } })
      .exec();
    return { count: 0 };
  }

  /* ======================================================================
     LIVEKIT
  ====================================================================== */

  async mediaToken(userId: string, callId: string) {
    const record = await this.findForParticipant(callId, userId);
    if (record.status !== "accepted") {
      throw new ConflictException(record.status === "ringing" ? "The call hasn't been answered yet." : "This call has ended.");
    }
    const url = process.env.LIVEKIT_URL?.trim();
    if (!url) throw new ConflictException("Calling isn't configured on the server (LIVEKIT_URL).");
    const people = await this.parties([String(userId)]);
    const token = await this.liveTokens.createToken({
      userId: String(userId),
      userName: people.get(String(userId))?.name,
      roomName: record.roomName,
      canPublish: true,
      canSubscribe: true,
    });
    return { token, url, roomName: record.roomName, callId };
  }

  /* ======================================================================
     DEVICES
  ====================================================================== */

  private deviceView(d: any) {
    return {
      deviceId: d.deviceId,
      platform: d.platform,
      deviceName: d.deviceName ?? "",
      appVersion: d.appVersion ?? "",
      lastSeenAt: iso(d.lastSeenAt),
      createdAt: iso(d.createdAt),
      pushEnabled: !d.disabledAt,
    };
  }

  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    if (!Types.ObjectId.isValid(userId)) throw new ForbiddenException("Sign in first.");
    if (dto.platform === "android" && !dto.pushToken) throw new BadRequestException("An FCM token is required for Android.");
    if (dto.platform === "ios" && !dto.voipToken && !dto.pushToken) throw new BadRequestException("A VoIP token is required for iOS.");

    // A token belongs to one account at a time (shared phone, sign-out/in).
    const tokenOwners: any[] = [];
    if (dto.pushToken) tokenOwners.push({ pushToken: dto.pushToken });
    if (dto.voipToken) tokenOwners.push({ voipToken: dto.voipToken });
    if (tokenOwners.length) {
      await this.devices
        .updateMany({ $or: tokenOwners, userId: { $ne: oid(userId) } }, { $set: { disabledAt: new Date(), pushToken: "", voipToken: "" } })
        .exec();
    }

    const set: Record<string, unknown> = {
      platform: dto.platform,
      deviceName: dto.deviceName ?? "",
      appVersion: dto.appVersion ?? "",
      lastSeenAt: new Date(),
      disabledAt: null,
    };
    if (dto.pushToken !== undefined) set.pushToken = dto.pushToken;
    if (dto.voipToken !== undefined) set.voipToken = dto.voipToken;

    const device = (await this.devices
      .findOneAndUpdate(
        { userId: oid(userId), deviceId: dto.deviceId },
        { $set: set, $setOnInsert: { userId: oid(userId), deviceId: dto.deviceId } },
        { upsert: true, new: true },
      )
      .lean()
      .exec()) as any;
    return this.deviceView(device);
  }

  async listDevices(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return [];
    const rows = (await this.devices.find({ userId: oid(userId) }).sort({ lastSeenAt: -1 }).lean().exec()) as any[];
    return rows.map((d) => this.deviceView(d));
  }

  async removeDevice(userId: string, deviceId: string) {
    if (!Types.ObjectId.isValid(userId)) throw new ForbiddenException("Sign in first.");
    const result = await this.devices.deleteOne({ userId: oid(userId), deviceId: String(deviceId) }).exec();
    if (!(result as any)?.deletedCount) throw new NotFoundException("Device not found.");
    return { removed: true };
  }
}
