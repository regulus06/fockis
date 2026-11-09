/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConflictException, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";

import { InMemoryModel } from "../../reports/testing/in-memory-model";
import { ConversationsService } from "../conversations.service";
import { MessagesService } from "../messages.service";
import { CallsService, RING_TIMEOUT_MS } from "./calls.service";

function setup() {
  const messages = new InMemoryModel("Message");
  const conversations = new InMemoryModel("Conversation");
  const users = new InMemoryModel("User");
  const calls = new InMemoryModel("CallRecord", [["callId"]]);
  const devices = new InMemoryModel("UserDevice", [["userId", "deviceId"]]);
  const convService = new ConversationsService(conversations as any, messages as any, users as any);
  const messagesService = new MessagesService(messages as any, conversations as any, users as any, convService);
  const push = {
    sendIncomingCall: jest.fn(async () => ["phone-1"]),
    sendCallEnded: jest.fn(async () => undefined),
    sendMissedCall: jest.fn(async () => undefined),
  };
  const liveTokens = { createToken: jest.fn(async () => "lk-token") };
  const notifications = { create: jest.fn(async () => ({})) };
  const service = new CallsService(calls as any, devices as any, users as any, messagesService, push as any, liveTokens as any, notifications as any);

  const events: Array<{ userId: string; event: string; payload: any }> = [];
  const online = new Set<string>();
  service.bindSignals({
    notifyUser: (userId, event, payload) => {
      events.push({ userId, event, payload });
      return online.has(userId);
    },
    hasConnectedSocket: (userId) => online.has(userId),
    broadcastNewMessage: async () => undefined,
  });

  return { messages, calls, devices, users, service, push, liveTokens, notifications, events, online };
}

async function people(ctx: ReturnType<typeof setup>) {
  const mk = (username: string) => ctx.users.create({ username, firstName: username[0].toUpperCase() + username.slice(1), lastName: "", profilePicture: "" });
  const a: any = await mk("amara");
  const b: any = await mk("bilal");
  const c: any = await mk("chen");
  return { a: String(a._id), b: String(b._id), c: String(c._id) };
}

afterEach(() => jest.useRealTimers());

describe("CallsService lifecycle", () => {
  it("rings the receiver over socket and push, then connects on accept", async () => {
    const ctx = setup();
    const { a, b } = await people(ctx);
    ctx.online.add(b);

    const started: any = await ctx.service.start(a, b, "video");
    expect(started.status).toBe("ringing");
    expect(started.delivered).toEqual({ socket: true, push: 1 });
    expect(ctx.events.find((e) => e.event === "call:incoming")?.userId).toBe(b);
    expect(ctx.events.find((e) => e.event === "call:incoming")?.payload.caller.name).toBe("Amara");

    // Media tokens only after the call is answered.
    await expect(ctx.service.mediaToken(a, started.callId)).rejects.toBeInstanceOf(ConflictException);

    const accepted = await ctx.service.accept(b, started.callId, "phone-1");
    expect(accepted.status).toBe("accepted");
    expect(ctx.events.some((e) => e.event === "call:accepted" && e.userId === a)).toBe(true);
    expect(ctx.events.some((e) => e.event === "call:answered-elsewhere" && e.userId === b)).toBe(true);
    expect(ctx.push.sendCallEnded).toHaveBeenCalledWith(b, started.callId, "answered_elsewhere", "phone-1");

    process.env.LIVEKIT_URL = "wss://livekit.example";
    const token = await ctx.service.mediaToken(a, started.callId);
    expect(token).toMatchObject({ token: "lk-token", roomName: `fockis-call-${started.callId}` });
  });

  it("refuses a second answer and outsiders", async () => {
    const ctx = setup();
    const { a, b, c } = await people(ctx);
    const started: any = await ctx.service.start(a, b, "voice");
    await ctx.service.accept(b, started.callId, "phone-1");
    await expect(ctx.service.accept(b, started.callId, "tablet")).rejects.toBeInstanceOf(ConflictException);
    await expect(ctx.service.get(c, started.callId)).rejects.toBeInstanceOf(NotFoundException);
    await expect(ctx.service.mediaToken(c, started.callId)).rejects.toBeInstanceOf(NotFoundException);
    await expect(ctx.service.accept(a, started.callId)).rejects.toBeTruthy();
  });

  it("records a decline and can't be answered afterwards", async () => {
    const ctx = setup();
    const { a, b } = await people(ctx);
    const started: any = await ctx.service.start(a, b, "voice");
    const declined = await ctx.service.decline(b, started.callId);
    expect(declined.status).toBe("rejected");
    expect(ctx.events.some((e) => e.event === "call:rejected" && e.userId === a)).toBe(true);
    await expect(ctx.service.accept(b, started.callId)).rejects.toBeInstanceOf(ConflictException);
    const log: any = ctx.messages.docs.find((m: any) => m.callId === started.callId);
    expect(log.systemLabel).toBe("Declined voice call");
  });

  it("turns unanswered calls into missed calls exactly once", async () => {
    const ctx = setup();
    const { a, b } = await people(ctx);
    const started: any = await ctx.service.start(a, b, "video");
    await ctx.calls.updateOne({ callId: started.callId }, { $set: { ringingUntil: new Date(Date.now() - RING_TIMEOUT_MS) } });

    await Promise.all([ctx.service.expireOverdue(), ctx.service.expire(started.callId)]);
    const record: any = ctx.calls.docs[0];
    expect(record.status).toBe("missed");
    expect(ctx.notifications.create).toHaveBeenCalledTimes(1);
    expect(ctx.messages.docs.filter((m: any) => m.callId === started.callId)).toHaveLength(1);
    expect((await ctx.service.missedCount(b)).count).toBe(1);
    await ctx.service.markMissedSeen(b);
    expect((await ctx.service.missedCount(b)).count).toBe(0);
    await expect(ctx.service.accept(b, started.callId)).rejects.toBeInstanceOf(ConflictException);
  });

  it("ends an accepted call with its duration and lists it in history", async () => {
    const ctx = setup();
    const { a, b } = await people(ctx);
    const started: any = await ctx.service.start(a, b, "voice");
    await ctx.service.accept(b, started.callId);
    await ctx.calls.updateOne({ callId: started.callId }, { $set: { acceptedAt: new Date(Date.now() - 125_000) } });
    const ended = await ctx.service.end(a, started.callId);
    expect(ended.status).toBe("ended");
    expect(ended.durationSec).toBeGreaterThanOrEqual(125);
    const log: any = ctx.messages.docs.find((m: any) => m.callId === started.callId);
    expect(log.systemLabel).toMatch(/^Voice call · 2:0\d$/);

    const history = await ctx.service.history(b);
    expect(history.items).toHaveLength(1);
    expect(history.items[0]).toMatchObject({ direction: "incoming", status: "ended" });
    expect(history.items[0].peer?.username).toBe("amara");
  });

  it("marks calls to someone already in a call as busy, and prevents duplicate calls", async () => {
    const ctx = setup();
    const { a, b, c } = await people(ctx);
    const first: any = await ctx.service.start(a, b, "voice");
    await expect(ctx.service.start(a, b, "voice")).rejects.toBeInstanceOf(ConflictException);
    await expect(ctx.service.start(b, a, "voice")).rejects.toBeInstanceOf(ConflictException);
    await ctx.service.accept(b, first.callId);
    const busy: any = await ctx.service.start(c, b, "video");
    expect(busy.status).toBe("busy");
    expect(ctx.notifications.create).toHaveBeenCalledTimes(1);
  });

  it("ends an accepted call when a participant stays offline past the grace period", async () => {
    jest.useFakeTimers();
    const ctx = setup();
    const { a, b } = await people(ctx);
    const started: any = await ctx.service.start(a, b, "voice");
    await ctx.service.accept(b, started.callId);
    await ctx.service.handleUserOffline(a);
    await jest.advanceTimersByTimeAsync(31_000);
    expect((ctx.calls.docs[0] as any).status).toBe("ended");
    expect((ctx.calls.docs[0] as any).endReason).toBe("connection_lost");
  });

  it("keeps the call if the user reconnects in time", async () => {
    jest.useFakeTimers();
    const ctx = setup();
    const { a, b } = await people(ctx);
    const started: any = await ctx.service.start(a, b, "voice");
    await ctx.service.accept(b, started.callId);
    await ctx.service.handleUserOffline(a);
    ctx.service.handleUserOnline(a);
    await jest.advanceTimersByTimeAsync(31_000);
    expect((ctx.calls.docs[0] as any).status).toBe("accepted");
    await ctx.service.end(a, started.callId);
  });
});

describe("Device registration", () => {
  it("stores tokens without returning them and moves a token between accounts", async () => {
    const ctx = setup();
    const { a, b } = await people(ctx);
    const view: any = await ctx.service.registerDevice(a, { deviceId: "android-device-1", platform: "android", pushToken: "fcm-token-xyz", deviceName: "Pixel" });
    expect(view).toMatchObject({ deviceId: "android-device-1", platform: "android", pushEnabled: true });
    expect(JSON.stringify(view)).not.toContain("fcm-token-xyz");

    await ctx.service.registerDevice(b, { deviceId: "android-device-2", platform: "android", pushToken: "fcm-token-xyz" });
    const old: any = ctx.devices.docs.find((d: any) => d.deviceId === "android-device-1");
    expect(old.disabledAt).toBeInstanceOf(Date);
    expect(old.pushToken).toBe("");

    // Re-registering updates the same row.
    await ctx.service.registerDevice(a, { deviceId: "android-device-1", platform: "android", pushToken: "fcm-token-new" });
    expect(ctx.devices.docs.filter((d: any) => String(d.userId) === a)).toHaveLength(1);
    expect((await ctx.service.listDevices(a))[0].pushEnabled).toBe(true);

    await ctx.service.removeDevice(a, "android-device-1");
    await expect(ctx.service.removeDevice(a, "android-device-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(Types.ObjectId.isValid(a)).toBe(true);
  });
});

describe("Push actions", () => {
  it("declines with a valid per-call token and refuses others", async () => {
    const ctx = setup();
    const { a, b } = await people(ctx);
    const started: any = await ctx.service.start(a, b, "voice");
    const pushed = (ctx.push.sendIncomingCall as jest.Mock).mock.calls[0][1];
    expect(typeof pushed.actionToken).toBe("string");
    await expect(ctx.service.declineFromPush("other-call", pushed.actionToken)).rejects.toBeTruthy();
    await expect(ctx.service.declineFromPush(started.callId, "garbage")).rejects.toBeTruthy();
    const declined = await ctx.service.declineFromPush(started.callId, pushed.actionToken);
    expect(declined.status).toBe("rejected");
  });
});
