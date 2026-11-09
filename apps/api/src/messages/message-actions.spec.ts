/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Types } from "mongoose";

import { InMemoryModel } from "../reports/testing/in-memory-model";
import { ConversationsService } from "./conversations.service";
import { mapConversation } from "./mappers/conversation.mapper";
import { MessagesService } from "./messages.service";

const id = () => new Types.ObjectId();

function setup() {
  const messages = new InMemoryModel("Message");
  const conversations = new InMemoryModel("Conversation");
  const users = new InMemoryModel("User");
  const convService = new ConversationsService(conversations as any, messages as any, users as any);
  const service = new MessagesService(messages as any, conversations as any, users as any, convService);
  const a = id();
  const b = id();
  const outsider = id();
  return { messages, conversations, users, convService, service, a, b, outsider };
}

async function seed(ctx: ReturnType<typeof setup>) {
  const conv: any = await ctx.conversations.create({ participantIds: [ctx.a, ctx.b], isGroup: false, unreadCounts: {}, pinnedBy: {}, mutedBy: {}, archivedBy: {}, markedUnreadBy: {} });
  const mk = (sender: Types.ObjectId, text: string, extra: Record<string, unknown> = {}) =>
    ctx.messages.create({ conversationId: conv._id, senderId: sender, type: "text", text, attachments: [], reactions: [], deliveredTo: [sender], readBy: [sender], starredBy: [], deletedForMeBy: [], deletedForEveryone: false, pinned: false, createdAt: new Date(), ...extra });
  const m1: any = await mk(ctx.a, "hello");
  const m2: any = await mk(ctx.b, "hi there");
  const m3: any = await mk(ctx.a, "plans?");
  return { conv, m1, m2, m3 };
}

describe("Message pinning", () => {
  it("pins and unpins for everyone and lists pinned messages", async () => {
    const ctx = setup();
    const { conv, m2 } = await seed(ctx);
    const pinned: any = await ctx.service.togglePin(String(m2._id), String(ctx.a));
    expect(pinned.pinned).toBe(true);
    const list = await ctx.service.listPinned(String(conv._id), String(ctx.b));
    expect(list.map((m: any) => m.id)).toEqual([String(m2._id)]);
    const unpinned: any = await ctx.service.togglePin(String(m2._id), String(ctx.b));
    expect(unpinned.pinned).toBe(false);
  });

  it("refuses outsiders and deleted messages", async () => {
    const ctx = setup();
    const { m1 } = await seed(ctx);
    await expect(ctx.service.togglePin(String(m1._id), String(ctx.outsider))).rejects.toBeInstanceOf(ForbiddenException);
    await ctx.messages.updateOne({ _id: m1._id }, { $set: { deletedForEveryone: true } });
    await expect(ctx.service.togglePin(String(m1._id), String(ctx.a))).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("Bulk delete", () => {
  it("hides any selected message for me only", async () => {
    const ctx = setup();
    const { conv, m1, m2 } = await seed(ctx);
    const result: any = await ctx.service.bulkDelete(String(ctx.a), [String(m1._id), String(m2._id)], "me");
    expect(result.deletedIds.sort()).toEqual([String(m1._id), String(m2._id)].sort());
    const mine = await ctx.service.list(String(conv._id), String(ctx.a));
    const theirs = await ctx.service.list(String(conv._id), String(ctx.b));
    expect(mine.length).toBe(1);
    expect(theirs.length).toBe(3);
  });

  it("deletes for everyone only the user's own messages", async () => {
    const ctx = setup();
    const { m1, m2, m3 } = await seed(ctx);
    const spy = jest.spyOn(ctx.service, "deleteForEveryone").mockImplementation(async (mid: string) => ({ id: mid, deletedForEveryone: true }) as any);
    const result: any = await ctx.service.bulkDelete(String(ctx.a), [String(m1._id), String(m2._id), String(m3._id)], "everyone");
    expect(spy).toHaveBeenCalledTimes(2);
    expect(result.skippedIds).toEqual([String(m2._id)]);
  });

  it("ignores messages from conversations the user is not in", async () => {
    const ctx = setup();
    const { m1 } = await seed(ctx);
    const result: any = await ctx.service.bulkDelete(String(ctx.outsider), [String(m1._id)], "me");
    expect(result.deletedIds).toEqual([]);
  });
});

describe("Clear, star and conversation flags", () => {
  it("clears the chat only for the requesting user", async () => {
    const ctx = setup();
    const { conv } = await seed(ctx);
    const res: any = await ctx.service.clearConversation(String(conv._id), String(ctx.b));
    expect(res.cleared).toBe(3);
    expect((await ctx.service.list(String(conv._id), String(ctx.b))).length).toBe(0);
    expect((await ctx.service.list(String(conv._id), String(ctx.a))).length).toBe(3);
  });

  it("lists only my starred messages", async () => {
    const ctx = setup();
    const { m2 } = await seed(ctx);
    await ctx.messages.updateOne({ _id: m2._id }, { $set: { starredBy: [ctx.a] } });
    expect((await ctx.service.listStarred(String(ctx.a))).map((m: any) => m.id)).toEqual([String(m2._id)]);
    expect(await ctx.service.listStarred(String(ctx.b))).toEqual([]);
  });

  it("archives, pins and marks unread per user", async () => {
    const ctx = setup();
    const { conv } = await seed(ctx);
    jest.spyOn(ctx.convService, "getById").mockImplementation(async (cid: string, uid: string) => mapConversation(ctx.conversations.docs.find((d: any) => String(d._id) === cid), uid) as any);
    const archived: any = await ctx.convService.setFlag(String(conv._id), String(ctx.a), "archivedBy", true);
    expect(archived.archived).toBe(true);
    const forB: any = mapConversation(ctx.conversations.docs[0], String(ctx.b));
    expect(forB.archived).toBe(false);
    const unread: any = await ctx.convService.setFlag(String(conv._id), String(ctx.a), "markedUnreadBy", true);
    expect(unread.markedUnread).toBe(true);
    await expect(ctx.convService.setFlag(String(conv._id), String(ctx.outsider), "pinnedBy", true)).rejects.toThrow();
  });
});

describe("Conversation preview", () => {
  it("summarizes the last message and hides it when deleted for me", () => {
    const a = String(id());
    const last = { _id: id(), senderId: a, type: "image", text: "", attachments: [{ kind: "image" }], readBy: [a, String(id())], deliveredTo: [], deletedForMeBy: [], createdAt: new Date() };
    const mapped: any = mapConversation({ _id: id(), participantIds: [], lastMessageId: last, updatedAt: new Date() }, a);
    expect(mapped.lastMessage).toMatchObject({ type: "image", attachmentKind: "image", status: "read" });
    const hidden: any = mapConversation({ _id: id(), participantIds: [], lastMessageId: { ...last, deletedForMeBy: [a] }, updatedAt: new Date() }, a);
    expect(hidden.lastMessage).toBeUndefined();
  });
});
