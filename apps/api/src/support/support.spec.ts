/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";

import { InMemoryModel } from "../reports/testing/in-memory-model";
import { MAX_ACTIVE_TICKETS_PER_USER } from "./support.constants";
import { HelpArticlesService } from "./services/help-articles.service";
import { SupportAttachmentsService } from "./services/support-attachments.service";
import { SupportDashboardService } from "./services/support-dashboard.service";
import { SupportFeedbackService } from "./services/support-feedback.service";
import { SupportStaffService } from "./services/support-staff.service";
import { SupportService } from "./services/support.service";

const oid = () => String(new Types.ObjectId());

function setup(options: { ping?: () => Promise<unknown>; readyState?: number } = {}) {
  const tickets = new InMemoryModel("SupportTicket", [["number"]]);
  const settings = new InMemoryModel("SupportSettings", [["key"]]);
  const feedbackModel = new InMemoryModel("SupportFeedback", [["number"]]);
  const articles = new InMemoryModel("HelpArticle", [["slug"]]);
  const users = new InMemoryModel("User");
  const posts = new InMemoryModel("Post");
  const notifications = { create: jest.fn().mockResolvedValue({}) };
  const storage = { uploadBuffer: jest.fn().mockResolvedValue({}), getSignedUrl: jest.fn().mockResolvedValue("https://signed.example/file") };
  const connection: any = {
    readyState: options.readyState ?? 1,
    db: { admin: () => ({ ping: options.ping ?? (() => Promise.resolve({ ok: 1 })) }) },
    models: { User: users, SupportFeedback: feedbackModel, Post: posts },
  };
  const staff = new SupportStaffService(connection, notifications as any);
  const files = new SupportAttachmentsService(storage as any);
  const service = new SupportService(tickets as any, settings as any, connection, files, staff);
  const feedback = new SupportFeedbackService(feedbackModel as any, files, staff);
  const help = new HelpArticlesService(articles as any);
  const dashboard = new SupportDashboardService(tickets as any, connection, service, feedback, staff);
  return { service, feedback, help, dashboard, files, tickets, users, posts, notifications, storage, articles };
}

const question = (overrides: Record<string, unknown> = {}) => ({
  kind: "question" as const,
  category: "account" as const,
  subject: "Cannot change my email",
  message: "The save button does nothing when I change my email.",
  ...overrides,
});

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

describe("SupportService (user side)", () => {
  it("creates a ticket owned by the caller with a reference number", async () => {
    const { service } = setup();
    const ticket: any = await service.create(oid(), question());
    expect(ticket.number).toMatch(/^FK-[2-9A-Z]{6}$/);
    expect(ticket.status).toBe("open");
    expect(ticket.priority).toBe("normal");
    expect(ticket.messages[0].author).toBe("user");
    expect(ticket.notes).toBeUndefined();
  });

  it("only lets the owner read, reply to or close a ticket", async () => {
    const { service } = setup();
    const owner = oid();
    const stranger = oid();
    const ticket: any = await service.create(owner, question());
    await expect(service.getMine(stranger, ticket.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.reply(stranger, ticket.id, { body: "hello" })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.closeMine(stranger, ticket.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.fileLink(stranger, ticket.id, "x")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("keeps one live chat per user and appends to it", async () => {
    const { service } = setup();
    const user = oid();
    const first: any = await service.create(user, question({ kind: "chat", subject: "Live chat", message: "hi" }));
    const second: any = await service.create(user, question({ kind: "chat", subject: "Live chat", message: "Are you there?" }));
    expect(second.id).toBe(first.id);
    expect(second.messages).toHaveLength(2);
  });

  it("needs a real description for questions", async () => {
    const { service } = setup();
    await expect(service.create(oid(), question({ message: "help" }))).rejects.toThrow(/10 characters/);
  });

  it("limits how many requests one account can have open", async () => {
    const { service } = setup();
    const user = oid();
    for (let i = 0; i < MAX_ACTIVE_TICKETS_PER_USER; i += 1) await service.create(user, question({ subject: `Issue ${i}` }));
    await expect(service.create(user, question())).rejects.toBeInstanceOf(ConflictException);
  });

  it("lets the owner reopen a resolved or closed ticket", async () => {
    const { service } = setup();
    const user = oid();
    const ticket: any = await service.create(user, question());
    await service.closeMine(user, ticket.id);
    const reopened: any = await service.reopenMine(user, ticket.id);
    expect(reopened.status).toBe("open");
  });

  it("refuses attachments the user didn't upload", async () => {
    const { service } = setup();
    const user = oid();
    const someoneElse = `support/u/${oid()}/a.png`;
    await expect(
      service.create(user, question({ attachments: [{ key: someoneElse, name: "a.png", mimeType: "image/png", size: 10 }] })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("uploads files under the owner's private prefix and signs links only for files on the ticket", async () => {
    const { service, files, storage } = setup();
    const user = oid();
    const file = await files.upload(user, { buffer: png, mimetype: "image/png", size: png.length, originalname: "screen shot.png" });
    expect(file.key.startsWith(`support/u/${user}/`)).toBe(true);
    const ticket: any = await service.create(user, question({ attachments: [file] }));
    const link = await service.fileLink(user, ticket.id, file.key);
    expect(link.url).toBe("https://signed.example/file");
    expect(storage.getSignedUrl).toHaveBeenCalledWith(file.key, expect.objectContaining({ expiresInSeconds: 900 }));
    await expect(service.fileLink(user, ticket.id, `support/u/${user}/other.png`)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects files whose contents don't match their type", async () => {
    const { files } = setup();
    await expect(files.upload(oid(), { buffer: Buffer.from("not an image"), mimetype: "image/png", size: 12 })).rejects.toThrow(/match/);
    await expect(files.upload(oid(), { buffer: png, mimetype: "application/zip", size: png.length })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("SupportService (staff side)", () => {
  it("marks replies unread for the user, records first response and notifies them", async () => {
    const { service, notifications } = setup();
    const user = oid();
    const agent = oid();
    const ticket: any = await service.create(user, question());
    const updated: any = await service.replyAsAgent(agent, ticket.id, { body: "Can you send a screenshot?" });
    expect(updated.status).toBe("awaiting_user");
    expect(updated.firstResponseAt).toBeTruthy();
    expect(updated.assignedTo.id).toBe(agent);
    expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ recipientId: user, link: `/help/tickets/${ticket.id}` }));
    expect((await service.overview(user)).unreadTickets).toBe(1);
  });

  it("keeps internal notes away from the user", async () => {
    const { service } = setup();
    const user = oid();
    const ticket: any = await service.create(user, question());
    await service.addNote(oid(), ticket.id, "Possible duplicate of FK-ABCDEF");
    const staffView: any = await service.getForAgent(ticket.id);
    expect(staffView.notes).toHaveLength(1);
    const userView: any = await service.getMine(user, ticket.id);
    expect(userView.notes).toBeUndefined();
  });

  it("escalates to at least high priority", async () => {
    const { service } = setup();
    const ticket: any = await service.create(oid(), question());
    const escalated: any = await service.escalate(oid(), ticket.id, "Payment issue affecting many users");
    expect(escalated.status).toBe("escalated");
    expect(escalated.priority).toBe("high");
  });

  it("only assigns support staff", async () => {
    const { service, users } = setup();
    const ticket: any = await service.create(oid(), question());
    const regular = await users.create({ username: "joe", role: "user" });
    await expect(service.assign(oid(), ticket.id, String(regular._id))).rejects.toBeInstanceOf(BadRequestException);
    const agent = await users.create({ username: "ana", role: "admin" });
    const assigned: any = await service.assign(oid(), ticket.id, String(agent._id));
    expect(assigned.assignedTo.username).toBe("ana");
    expect(assigned.status).toBe("in_progress");
  });

  it("stores the live chat switch used by the Online now badge", async () => {
    const { service } = setup();
    expect((await service.overview(oid())).liveChatOnline).toBe(false);
    await service.updateSettings(oid(), true);
    expect((await service.overview(oid())).liveChatOnline).toBe(true);
  });

  it("reports operational only when the database answers", async () => {
    expect((await setup().service.status()).status).toBe("operational");
    expect((await setup({ readyState: 0 }).service.status()).status).toBe("outage");
    expect((await setup({ ping: () => Promise.reject(new Error("down")) }).service.status()).status).toBe("outage");
  });
});

describe("SupportFeedbackService", () => {
  const idea = { category: "feature_request" as const, subject: "Dark mode", description: "Please add a dark mode for the feed." };

  it("lets users send feedback and see staff responses and status changes", async () => {
    const { feedback, notifications } = setup();
    const user = oid();
    const agent = oid();
    const created: any = await feedback.create(user, idea);
    expect(created.number).toMatch(/^FB-/);
    expect(created.status).toBe("new");
    await feedback.respond(agent, created.id, { body: "Thanks! We're looking into it.", status: "planned" });
    const mine: any = await feedback.getMine(user, created.id);
    expect(mine.status).toBe("planned");
    expect(mine.responses[0].body).toMatch(/looking into it/);
    expect(mine.notes).toBeUndefined();
    expect(mine.statusHistory.map((h: any) => h.status)).toEqual(["new", "planned"]);
    expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ recipientId: user }));
  });

  it("hides other people's feedback", async () => {
    const { feedback } = setup();
    const created: any = await feedback.create(oid(), idea);
    await expect(feedback.getMine(oid(), created.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("filters the inbox and archives", async () => {
    const { feedback } = setup();
    const a: any = await feedback.create(oid(), idea);
    await feedback.create(oid(), { ...idea, category: "bug_report", subject: "Crash on upload" });
    expect((await feedback.list(oid(), {})).total).toBe(2);
    expect((await feedback.list(oid(), { category: "bug_report" })).total).toBe(1);
    await feedback.archive(a.id, true);
    expect((await feedback.list(oid(), {})).total).toBe(1);
    expect((await feedback.list(oid(), { archived: true })).total).toBe(1);
  });
});

describe("HelpArticlesService", () => {
  it("seeds the Help Center once and only shows published items", async () => {
    const { help } = setup();
    await help.onModuleInit();
    const seeded = (await help.published()).items.length;
    expect(seeded).toBeGreaterThan(20);
    await help.onModuleInit();
    expect((await help.published()).items.length).toBe(seeded);

    const editor = oid();
    const draft: any = await help.create(editor, { slug: "new-guide", kind: "article", topic: "account", title: "New guide", body: [{ text: "Step one." }] });
    expect(draft.status).toBe("draft");
    await expect(help.publishedBySlug("new-guide")).rejects.toBeInstanceOf(NotFoundException);
    await help.setStatus(editor, draft.id, "published");
    expect((await help.publishedBySlug("new-guide")).title).toBe("New guide");
    await expect(help.remove(draft.id)).rejects.toBeInstanceOf(ConflictException);
    await expect(help.create(editor, { slug: "new-guide", kind: "faq", topic: "account", title: "Dup", summary: "x" })).rejects.toBeInstanceOf(ConflictException);
  });
});

describe("SupportDashboardService", () => {
  it("counts real records", async () => {
    const { service, feedback, dashboard, posts } = setup();
    await service.create(oid(), question());
    const t: any = await service.create(oid(), question({ subject: "Second" }));
    await service.setStatus(t.id, "resolved");
    await feedback.create(oid(), { category: "general", subject: "Nice app", description: "Really enjoying Fockis so far." });
    await posts.create({ user: oid(), content: "x", moderationStatus: "removed" });
    const o = await dashboard.overview();
    expect(o.openTickets).toBe(1);
    expect(o.newFeedback).toBe(1);
    expect(o.hiddenPosts).toBe(1);
    expect(o.resolved).toBe(1);
    expect((await dashboard.recent()).items.length).toBe(3);
  });
});
