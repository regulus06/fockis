/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { Types } from "mongoose";

import { InMemoryModel } from "./testing/in-memory-model";
import { ModerationEventsService } from "./services/moderation-events.service";
import { PostModerationService } from "./services/post-moderation.service";

function setup() {
  const posts = new InMemoryModel("Post");
  const users = new InMemoryModel("User");
  const cases = new InMemoryModel("ModerationCase");
  const holds = new InMemoryModel("LegalHold");
  const eventsModel = new InMemoryModel("ModerationEvent", [["seq"]]);
  const connection: any = { models: { Post: posts, User: users, ModerationCase: cases, LegalHold: holds } };
  const notifications = { create: jest.fn().mockResolvedValue({}) };
  const events = new ModerationEventsService(eventsModel as any, connection);
  const service = new PostModerationService(connection, events, notifications as any);
  return { service, events, posts, cases, holds, eventsModel, notifications };
}

const moderator = { _id: String(new Types.ObjectId()), role: "moderator" };
const superAdmin = { _id: String(new Types.ObjectId()), role: "super_admin" };

describe("PostModerationService", () => {
  it("hides without deleting, records who/when/why, and restores", async () => {
    const { service, posts, events, notifications } = setup();
    const author = String(new Types.ObjectId());
    const post = await posts.create({ user: author, content: "spam spam", type: "post" });
    const id = String(post._id);

    const hidden: any = await service.hide(moderator, id, "Spam links");
    expect(hidden.status).toBe("hidden");
    expect(hidden.reason).toBe("Spam links");
    expect(posts.docs).toHaveLength(1);
    expect(posts.docs[0].moderationStatus).toBe("removed");
    expect(posts.docs[0].moderationHiddenBy).toBe(moderator._id);
    expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ recipientId: author, link: "/moderation" }));
    await expect(service.hide(moderator, id, "again")).rejects.toBeInstanceOf(ConflictException);

    expect((await service.list({ status: "hidden" })).total).toBe(1);
    expect((await service.list({})).total).toBe(0);

    const restored: any = await service.restore(moderator, id, "Reviewed: not spam");
    expect(restored.status).toBe("visible");
    expect(posts.docs[0].moderationStatus).toBeNull();

    const history = await events.list({ targetType: "post", targetId: id });
    expect(history.items.map((e: any) => e.action)).toEqual(["restore_post", "hide_post"]);
    expect(history.items[1]).toMatchObject({ previousState: "visible", newState: "hidden", reason: "Spam links" });
  });

  it("only lets super admins remove permanently, after hiding, and never under a legal hold", async () => {
    const { service, posts, holds } = setup();
    const post = await posts.create({ user: String(new Types.ObjectId()), content: "x" });
    const id = String(post._id);
    await expect(service.purge(superAdmin, id, "illegal", "DELETE")).rejects.toBeInstanceOf(BadRequestException);
    await service.hide(moderator, id, "Illegal content");
    await expect(service.purge(moderator, id, "illegal", "DELETE")).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.purge(superAdmin, id, "illegal", "nope")).rejects.toBeInstanceOf(BadRequestException);

    await holds.create({ status: "active", records: [{ recordId: id }] });
    await expect(service.purge(superAdmin, id, "illegal", "DELETE")).rejects.toBeInstanceOf(ConflictException);
    holds.docs = [];

    await service.purge(superAdmin, id, "illegal", "DELETE");
    expect(posts.docs).toHaveLength(0);
  });

  it("escalation raises open report cases", async () => {
    const { service, posts, cases } = setup();
    const post = await posts.create({ user: String(new Types.ObjectId()), content: "x" });
    await cases.create({ targetType: "post", targetId: post._id, status: "pending", priority: "normal", totalReportCount: 3 });
    const escalated: any = await service.escalate(moderator, String(post._id), "Possible fraud ring");
    expect(escalated.escalatedAt).toBeTruthy();
    expect(escalated.reports).toBe(3);
    expect(cases.docs[0]).toMatchObject({ status: "escalated", priority: "high" });
  });
});

describe("ModerationEventsService", () => {
  it("hash-chains entries and detects tampering", async () => {
    const { events, eventsModel } = setup();
    for (let i = 0; i < 3; i += 1) {
      await events.record({ actorId: "a", action: "hide_post", targetType: "post", targetId: `p${i}`, reason: "r" });
    }
    expect(await events.verify()).toMatchObject({ intact: true, checked: 3 });

    eventsModel.docs[1].reason = "edited later";
    expect(await events.verify()).toMatchObject({ intact: false, brokenAt: 2 });

    eventsModel.docs[1].reason = "r";
    eventsModel.docs.splice(1, 1);
    expect(await events.verify()).toMatchObject({ intact: false });
  });
});
