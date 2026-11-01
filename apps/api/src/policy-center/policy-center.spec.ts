/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { Types } from "mongoose";

import { InMemoryModel } from "../reports/testing/in-memory-model";
import { isInteractionAllowed, mutedUserIds, unsearchableUserIds } from "./privacy-enforcement";
import { compareVersions, PoliciesService } from "./services/policies.service";
import { PolicyAcceptanceService } from "./services/policy-acceptance.service";
import { PolicyAuditService } from "./services/policy-audit.service";
import { PolicyCommonService } from "./services/policy-common.service";
import { UserActivityService } from "./services/user-activity.service";
import { UserCenterService } from "./services/user-center.service";

const editor = { id: String(new Types.ObjectId()), actor: { role: "admin", permissions: ["policy.edit"] } as any };
const approver = { id: String(new Types.ObjectId()), actor: { role: "admin", permissions: ["policy.review"] } as any };
const future = () => new Date(Date.now() + 2 * 86_400_000).toISOString();

function setup() {
  const policies = new InMemoryModel("Policy", [["slug"]]);
  const versions = new InMemoryModel("PolicyVersion", [["policyId", "version"]]);
  const acceptances = new InMemoryModel("PolicyAcceptance", [["userId", "versionId"]]);
  const settings = new InMemoryModel("PolicySettings", [["key"]]);
  const events = new InMemoryModel("PolicyAuditEvent", [["seq"]]);
  const privacy = new InMemoryModel("UserPrivacySettings", [["userId"]]);
  const consents = new InMemoryModel("UserConsent");
  const consentEvents = new InMemoryModel("UserConsentEvent");
  const dataRequests = new InMemoryModel("UserDataRequest");
  const activityModel = new InMemoryModel("UserPolicyActivity");
  const users = new InMemoryModel("User");
  const follows = new InMemoryModel("Follow");
  const friendships = new InMemoryModel("Friendship");
  const connection: any = { models: { User: users, UserPrivacySettings: privacy, Follow: follows, Friendship: friendships } };
  const notifications = { create: jest.fn().mockResolvedValue({}) };
  const common = new PolicyCommonService(connection, notifications as any);
  const audit = new PolicyAuditService(events as any, common);
  const service = new PoliciesService(policies as any, versions as any, acceptances as any, settings as any, common, audit);
  const activity = new UserActivityService(activityModel as any);
  const acceptance = new PolicyAcceptanceService(acceptances as any, versions as any, service, common, audit, activity);
  const center = new UserCenterService(privacy as any, consents as any, consentEvents as any, dataRequests as any, acceptance, common, activity);
  return { service, acceptance, center, audit, policies, versions, events, users, privacy, follows, friendships, connection, notifications };
}

async function newPolicy(service: PoliciesService) {
  return service.create(editor, {
    title: "Cookie Policy Test",
    slug: "cookie-test",
    category: "privacy",
    version: "1.0",
    sections: [{ heading: "Cookies", body: "We use essential cookies." }],
    changeSummary: "First version",
    effectiveDate: future(),
    requiredAcceptance: true,
  } as any) as Promise<any>;
}

describe("Policy seed", () => {
  it("is idempotent and keeps the old Shop slug working", async () => {
    const { service, policies, versions } = setup();
    await service.seed();
    const count = policies.docs.length;
    await service.seed();
    expect(policies.docs.length).toBe(count);
    expect(versions.docs.length).toBe(count);
    const shop: any = await service.publicGet("shop-advertising");
    expect(shop.title).toBe("Fockis Shop Policy");
    expect(shop.slug).toBe("fockis-shop");
  });

  it("shows only published policies to the public", async () => {
    const { service } = setup();
    await service.seed();
    const list = await service.publicList();
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((p: any) => p.version)).toBe(true);
    expect(list.find((p: any) => p.slug === "cookie-policy")).toBeUndefined();
    await expect(service.publicGet("cookie-policy")).rejects.toThrow();
    const one: any = await service.publicGet("terms");
    expect(one).not.toHaveProperty("review");
    expect(Object.keys(one)).not.toContain("internalNotes");
  });
});

describe("Policy workflow", () => {
  it("draft → review → approve → publish, with independent approval and notes on rejection", async () => {
    const { service } = setup();
    const p = await newPolicy(service);
    expect((await service.publicList()).length).toBe(0);
    await service.submit(editor, p.id, "please review");
    await expect(service.approve(editor, p.id)).rejects.toBeInstanceOf(ForbiddenException);
    await service.reject(approver, p.id, "Fix wording", true);
    await service.saveDraft(editor, p.id, { sections: [{ heading: "Cookies", body: "Updated text." }] } as any);
    await service.submit(editor, p.id);
    await service.approve(approver, p.id, "ok");
    await service.publish(approver, p.id);
    const pub: any = await service.publicGet("cookie-test");
    expect(pub.version).toBe("1.0");
    expect(pub.sections[0].body).toBe("Updated text.");
  });

  it("won't submit without text, summary or date, and a new version must be higher", async () => {
    const { service } = setup();
    const p = await service.create(editor, { title: "Empty one", slug: "empty-one", category: "privacy", version: "1.0", sections: [] } as any) as any;
    await expect(service.submit(editor, p.id)).rejects.toBeInstanceOf(BadRequestException);
    const q = await newPolicy(service);
    await service.submit(editor, q.id);
    await service.approve(approver, q.id);
    await service.publish(approver, q.id);
    await expect(service.saveDraft(editor, q.id, { version: "1.0" } as any)).rejects.toBeInstanceOf(BadRequestException);
    await service.saveDraft(editor, q.id, { version: "1.1", changeSummary: "Tweak", effectiveDate: future() } as any);
    await expect(service.saveDraft(editor, q.id, { version: "1.2" } as any)).resolves.toBeTruthy();
    await service.submit(editor, q.id);
    await expect(service.saveDraft(editor, q.id, { title: "Changed" } as any)).rejects.toBeInstanceOf(ConflictException);
  });

  it("restoring an old version creates a new draft and keeps history", async () => {
    const { service, versions } = setup();
    const p = await newPolicy(service);
    await service.submit(editor, p.id);
    await service.approve(approver, p.id);
    await service.publish(approver, p.id);
    const v1: any = versions.docs[0];
    await service.saveDraft(editor, p.id, { version: "2.0", sections: [{ heading: "New", body: "Changed" }], changeSummary: "Rewrite", effectiveDate: future() } as any);
    await service.submit(editor, p.id);
    await service.approve(approver, p.id);
    await service.publish(approver, p.id);
    expect(versions.docs.find((v: any) => v.version === "1.0").status).toBe("superseded");
    await service.restoreVersion(editor, String(v1._id), { newVersion: "2.1", changeSummary: "Back to original" } as any);
    expect(versions.docs.length).toBe(3);
    const restored: any = versions.docs.find((v: any) => v.version === "2.1");
    expect(restored).toMatchObject({ status: "draft", restoredFrom: "1.0" });
    expect((await service.publicGet("cookie-test") as any).version).toBe("2.0");
  });

  it("records an audit trail that detects tampering", async () => {
    const { service, audit, events } = setup();
    await newPolicy(service);
    expect((await audit.verify() as any).intact).toBe(true);
    events.docs[0].summary = "edited";
    expect((await audit.verify() as any).intact).toBe(false);
  });

  it("compares versions numerically", () => {
    expect(compareVersions("1.10", "1.9")).toBeGreaterThan(0);
    expect(compareVersions("2.0", "2.0.0")).toBe(0);
  });
});

describe("Acceptance", () => {
  it("needs acceptance after a required update, and records it once", async () => {
    const { service, acceptance, users } = setup();
    const user: any = await users.create({ username: "u1", isActive: true });
    const p = await newPolicy(service);
    await service.submit(editor, p.id);
    await service.approve(approver, p.id);
    await service.publish(approver, p.id);
    const before: any[] = await acceptance.forUser(String(user._id)) as any;
    expect(before.find((x: any) => x.slug === "cookie-test").status).toBe("action_needed");
    const pub: any = await service.publicGet("cookie-test");
    await acceptance.accept(String(user._id), "cookie-test", pub.versionId);
    await acceptance.accept(String(user._id), "cookie-test", pub.versionId);
    const after: any[] = await acceptance.forUser(String(user._id)) as any;
    expect(after.find((x: any) => x.slug === "cookie-test").status).toBe("accepted");
    expect((await acceptance.history(String(user._id)) as any[]).length).toBe(1);
  });
});

describe("Sign-up acceptance", () => {
  it("counts the versions shown at sign-up and asks again after an update", async () => {
    const { service, acceptance, users } = setup();
    await service.seed();
    const user: any = await users.create({ username: "new", isActive: true, acceptedPolicies: ["terms", "privacy", "shop-advertising"], policyAcceptanceVersion: "2026-10-17", policyAcceptedAt: new Date() });
    const mine: any[] = await acceptance.forUser(String(user._id)) as any;
    expect(mine.find((p) => p.slug === "terms").status).toBe("accepted");
    expect(mine.find((p) => p.slug === "fockis-shop").status).toBe("accepted");
    expect(mine.find((p) => p.slug === "copyright").status).toBe("action_needed");
    const terms: any = await service.publicGet("terms");
    await service.saveDraft(editor, terms.id, { version: "1.1", changeSummary: "Update", effectiveDate: future() } as any);
    await service.submit(editor, terms.id);
    await service.approve(approver, terms.id);
    await service.publish(approver, terms.id);
    const after: any[] = await acceptance.forUser(String(user._id)) as any;
    expect(after.find((p) => p.slug === "terms")).toMatchObject({ status: "action_needed", previouslyAccepted: { version: "1.0" } });
  });
});

describe("Privacy controls", () => {
  it("are saved on the server and enforced for messages and comments", async () => {
    const { center, users, connection, follows } = setup();
    const owner: any = await users.create({ username: "owner", isActive: true, isPrivate: false });
    const other: any = await users.create({ username: "other", isActive: true });
    const a = String(owner._id);
    const b = String(other._id);
    expect(await isInteractionAllowed(connection, "messaging", b, a)).toBe(true);
    await center.updatePrivacy(a, { messaging: "nobody", comments: "followers", searchable: false, profileVisibility: "private" } as any);
    expect((await center.getPrivacy(a)).messaging).toBe("nobody");
    expect(users.docs.find((u: any) => String(u._id) === a).isPrivate).toBe(true);
    expect(await isInteractionAllowed(connection, "messaging", b, a)).toBe(false);
    expect(await isInteractionAllowed(connection, "comments", b, a)).toBe(false);
    await follows.create({ followerId: new Types.ObjectId(b), followingId: new Types.ObjectId(a) });
    expect(await isInteractionAllowed(connection, "comments", b, a)).toBe(true);
    expect((await unsearchableUserIds(connection, [a, b])).has(a)).toBe(true);
    await expect(center.updatePrivacy(a, {} as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("mutes and unmutes accounts", async () => {
    const { center, users, connection } = setup();
    const me: any = await users.create({ username: "me", isActive: true });
    const them: any = await users.create({ username: "them", isActive: true });
    await center.mute(String(me._id), "them");
    expect(await mutedUserIds(connection, String(me._id))).toEqual([String(them._id)]);
    await center.unmute(String(me._id), String(them._id));
    expect(await mutedUserIds(connection, String(me._id))).toEqual([]);
  });
});
