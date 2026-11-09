/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { Types } from "mongoose";

import { InMemoryModel } from "../reports/testing/in-memory-model";
import { AccountDeletionService } from "./services/account-deletion.service";
import { EvidenceExportService } from "./services/evidence-export.service";
import { EvidenceService, mediaKey } from "./services/evidence.service";
import { LegalAuditService } from "./services/legal-audit.service";
import { LegalCommonService } from "./services/legal-common.service";
import { LegalHoldsService } from "./services/legal-holds.service";
import { LegalRequestsService } from "./services/legal-requests.service";
import { RetentionService } from "./services/retention.service";

const oid = () => String(new Types.ObjectId());
const DAY = 86_400_000;

function setup() {
  const counters = new InMemoryModel("LegalCounter", [["_id"]]);
  const holdsModel = new InMemoryModel("LegalHold", [["number"]]);
  const requestsModel = new InMemoryModel("LegalRequest", [["number"]]);
  const recordsModel = new InMemoryModel("EvidenceRecord", [["number"]]);
  const exportsModel = new InMemoryModel("EvidenceExport", [["number"]]);
  const logs = new InMemoryModel("EvidenceAccessLog", [["seq"]]);
  const policies = new InMemoryModel("RetentionPolicy", [["recordType", "jurisdiction"]]);
  const deletionsModel = new InMemoryModel("AccountDeletion", [["number"]]);
  const users = new InMemoryModel("User");
  const posts = new InMemoryModel("Post");
  const comments = new InMemoryModel("Comment");
  const cases = new InMemoryModel("ModerationCase");
  const connection: any = { models: { User: users, Post: posts, Comment: comments, ModerationCase: cases, LegalHold: holdsModel } };
  const storage = {
    uploadBuffer: jest.fn().mockResolvedValue("key"),
    getSignedUrl: jest.fn().mockResolvedValue("https://signed.example/x"),
    objectExists: jest.fn().mockResolvedValue(false),
    deleteObject: jest.fn().mockResolvedValue(undefined),
  };
  const notifications = { create: jest.fn().mockResolvedValue({}) };
  const common = new LegalCommonService(counters as any, connection, storage as any, notifications as any);
  const audit = new LegalAuditService(logs as any, common);
  const holds = new LegalHoldsService(holdsModel as any, requestsModel as any, common, audit);
  const requests = new LegalRequestsService(requestsModel as any, common, audit);
  const evidence = new EvidenceService(recordsModel as any, holdsModel as any, connection, common, audit, requests);
  const exportsService = new EvidenceExportService(exportsModel as any, evidence, requests, common, audit);
  const retention = new RetentionService(policies as any, recordsModel as any, exportsModel as any, deletionsModel as any, requestsModel as any, holdsModel as any, counters as any, connection, common, audit);
  const deletion = new AccountDeletionService(deletionsModel as any, holdsModel as any, connection, common, audit);
  return { common, audit, holds, requests, evidence, exportsService, retention, deletion, users, posts, comments, logs, recordsModel, exportsModel, deletionsModel, holdsModel, storage, notifications };
}

async function seedUser(users: InMemoryModel, extra: Record<string, unknown> = {}) {
  const user: any = await users.create({ username: `user${Math.floor(Math.random() * 1e6)}`, password: bcrypt.hashSync("secret-pass", 4), role: "user", isActive: true, ...extra });
  return String(user._id);
}

describe("Legal holds", () => {
  it("needs at least one account or record and numbers holds per year", async () => {
    const { holds, users } = setup();
    const staff = oid();
    await expect(holds.create(staff, { caseReference: "CASE-1", title: "Fraud ring", legalBasis: "fraud_investigation" } as any)).rejects.toBeInstanceOf(BadRequestException);
    const subject = await seedUser(users, { username: "bako07" });
    const hold: any = await holds.create(staff, { caseReference: "CASE-1", title: "Fraud ring", legalBasis: "fraud_investigation", subjects: ["@bako07"] } as any);
    expect(hold.number).toBe(`LH-${new Date().getFullYear()}-0001`);
    expect(hold.status).toBe("active");
    expect(hold.subjects[0].id).toBe(subject);
    expect((await holds.activeForUser(subject)).length).toBe(1);
  });

  it("logs creation and release, and can't be released twice", async () => {
    const { holds, audit } = setup();
    const staff = oid();
    const hold: any = await holds.create(staff, { caseReference: "C-2", title: "Threat", legalBasis: "safety_investigation", records: [{ recordType: "post", recordId: oid() }] } as any);
    const released: any = await holds.release(staff, hold.id, "Investigation closed by counsel");
    expect(released.status).toBe("released");
    await expect(holds.release(staff, hold.id, "again please")).rejects.toBeInstanceOf(ConflictException);
    const log = await audit.list({});
    expect(log.items.map((e: any) => e.action)).toEqual(["hold_released", "hold_created"]);
  });
});

describe("Legal requests", () => {
  it("can't approve disclosure before verification, and needs a decision before completion", async () => {
    const { requests } = setup();
    const staff = oid();
    const r: any = await requests.create(staff, { authority: "Metro Police", requestType: "subpoena", requestedRecords: "Posts by account X in March" } as any);
    expect(r.verificationStatus).toBe("pending");
    await expect(requests.approve(staff, r.id, { status: "approved", note: "looks fine" })).rejects.toBeInstanceOf(ConflictException);
    await requests.verify(staff, r.id, { status: "verified", note: "Called the issuing court" });
    await expect(requests.update(staff, r.id, { completionStatus: "completed" })).rejects.toBeInstanceOf(ConflictException);
    const decided: any = await requests.approve(staff, r.id, { status: "partially_approved", note: "Only basic subscriber info" });
    expect(decided.approvalStatus).toBe("partially_approved");
    const done: any = await requests.update(staff, r.id, { completionStatus: "completed" });
    expect(done.completionStatus).toBe("completed");
  });
});

describe("Evidence archive", () => {
  async function preservedPost() {
    const ctx = setup();
    const staff = oid();
    const author = await seedUser(ctx.users, { username: "maryj" });
    const post: any = await ctx.posts.create({ user: author, content: "Buy followers", type: "post", password: "should-not-leak" });
    const hold: any = await ctx.holds.create(staff, { caseReference: "LH-CASE", title: "Spam ring", legalBasis: "fraud_investigation", subjects: [author] } as any);
    const record: any = await ctx.evidence.preserve(staff, { recordType: "post", recordId: String(post._id), holdId: hold.id, reason: "Preserve for fraud case" } as any);
    return { ...ctx, staff, author, post, hold, record };
  }

  it("needs a hold or verified request to preserve", async () => {
    const { evidence, posts } = setup();
    const post: any = await posts.create({ user: oid(), content: "x" });
    await expect(evidence.preserve(oid(), { recordType: "post", recordId: String(post._id), reason: "just because" } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("snapshots without secrets, hashes, covers the record by the hold and refuses duplicates", async () => {
    const { record, evidence, staff, post, hold, holds } = await preservedPost();
    expect(record.number).toMatch(/^EV-\d{4}-0001$/);
    expect(record.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
    const opened: any = await evidence.open(staff, record.id, "Reviewing for court filing");
    expect(opened.snapshot.content).toBe("Buy followers");
    expect(opened.snapshot.password).toBeUndefined();
    expect(opened.integrity).toBe(true);
    expect((await holds.get(hold.id)).records.some((r: any) => r.recordId === String(post._id))).toBe(true);
    await expect(evidence.preserve(staff, { recordType: "post", recordId: String(post._id), holdId: hold.id, reason: "again" } as any)).rejects.toBeInstanceOf(ConflictException);
  });

  it("lists metadata only and logs every opening with its reason", async () => {
    const { evidence, staff, record, audit } = await preservedPost();
    const list: any = await evidence.list({ search: "maryj" } as any);
    expect(list.items).toHaveLength(1);
    expect(list.items[0].snapshot).toBeUndefined();
    await evidence.open(staff, record.id, "Checking context for counsel");
    const log: any = await audit.list({ action: "evidence_viewed" });
    expect(log.items[0].reason).toBe("Checking context for counsel");
    expect(log.items[0].caseReference).toBe("LH-CASE");
  });

  it("exports with hashes and chain of custody; request exports need approval", async () => {
    const { exportsService, requests, staff, record, storage } = await preservedPost();
    const pkg: any = await exportsService.create(staff, { caseReference: "LH-CASE", recordIds: [record.id], reason: "Package for counsel" } as any);
    expect(pkg.packageSha256).toMatch(/^[a-f0-9]{64}$/);
    const written = JSON.parse(storage.uploadBuffer.mock.calls[0][0].toString("utf8"));
    expect(written.records[0].snapshotSha256).toBe(record.snapshotHash);
    expect(written.chainOfCustody.map((c: any) => c.action)).toContain("evidence_preserved");
    expect(storage.uploadBuffer.mock.calls[0][1]).toMatch(/^evidence\/exports\//);

    const r: any = await requests.create(staff, { authority: "Court", requestType: "court_order", requestedRecords: "the post" } as any);
    await expect(exportsService.create(staff, { caseReference: "X", recordIds: [record.id], requestId: r.id, reason: "disclosure" } as any)).rejects.toBeInstanceOf(ConflictException);
  });

  it("reads storage keys from the forms post media is saved in", () => {
    expect(mediaKey("https://fockis.onrender.com/uploads/media/posts/a%20b.jpg")).toBe("posts/a b.jpg");
    expect(mediaKey("posts/videos/x.mp4")).toBe("posts/videos/x.mp4");
    expect(mediaKey("https://storage.googleapis.com/bucket/posts/y.png?x=1")).toBe("posts/y.png");
    expect(mediaKey("https://example.com/z.png")).toBe("");
  });
});

describe("Account deletion", () => {
  it("checks the password and refuses staff accounts", async () => {
    const { deletion, users } = setup();
    const user = await seedUser(users);
    await expect(deletion.requestOwnDeletion(user, "wrong")).rejects.toBeInstanceOf(UnauthorizedException);
    const admin = await seedUser(users, { role: "admin" });
    await expect(deletion.requestOwnDeletion(admin, "secret-pass")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("deletes the account and its content when nothing is held", async () => {
    const { deletion, users, posts, comments, deletionsModel } = setup();
    const user = await seedUser(users);
    await posts.create({ user, content: "a" });
    await comments.create({ userId: user, content: "b" });
    const result = await deletion.requestOwnDeletion(user, "secret-pass");
    expect(result.status).toBe("completed");
    expect(users.docs).toHaveLength(0);
    expect(posts.docs).toHaveLength(0);
    expect(comments.docs).toHaveLength(0);
    expect(deletionsModel.docs[0].summary).toMatchObject({ postsDeleted: 1, commentsDeleted: 1, accountDeleted: 1 });
  });

  it("keeps held records hidden and the account deactivated under a hold", async () => {
    const { deletion, holds, users, posts, notifications } = setup();
    await seedUser(users, { role: "super_admin" });
    const user = await seedUser(users);
    await posts.create({ user, content: "evidence" });
    await holds.create(oid(), { caseReference: "C-9", title: "Hold", legalBasis: "court_order", subjects: [user] } as any);
    notifications.create.mockClear();
    const result = await deletion.process(user, "user", user);
    expect(result.status).toBe("completed_with_hold");
    expect(users.docs.find((u: any) => String(u._id) === user).isActive).toBe(false);
    expect(posts.docs[0].moderationStatus).toBe("removed");
    expect(notifications.create).toHaveBeenCalled();
  });
});

describe("Retention", () => {
  it("expires old evidence not under hold, keeps held evidence, removes old packages", async () => {
    const { retention, recordsModel, exportsModel, holds, storage } = setup();
    await retention.seed();
    // Nothing runs until a period is set and the rule is switched on.
    expect((await retention.run("system")).affected.evidence_record).toBeUndefined();
    await retention.update("admin", "evidence_record", { retentionDays: 730, enabled: true, reason: "Set by compliance" } as any);
    await retention.update("admin", "evidence_export", { retentionDays: 365, enabled: true, reason: "Set by compliance" } as any);
    const old = new Date(Date.now() - 800 * DAY);
    const active: any = await holds.create(oid(), { caseReference: "K", title: "keep", legalBasis: "litigation", records: [{ recordType: "post", recordId: "held-post" }] } as any);
    await recordsModel.create({ number: "EV-1", recordType: "post", recordId: "free-post", preservedAt: old, status: "preserved", snapshot: { a: 1 }, files: [{ key: "evidence/EV-1/x" }], caseReference: "Z", holdId: null, userId: "" });
    await recordsModel.create({ number: "EV-2", recordType: "post", recordId: "held-post", preservedAt: old, status: "preserved", snapshot: { a: 2 }, files: [], caseReference: "K", holdId: new Types.ObjectId(active.id), userId: "" });
    await exportsModel.create({ number: "EX-1", exportedAt: old, packageKey: "evidence/exports/EX-1.json", packageRemovedAt: null, caseReference: "Z" });
    const run: any = await retention.run("system");
    expect(run.affected.evidence_record).toBe(1);
    expect(recordsModel.docs.find((d: any) => d.number === "EV-1").status).toBe("expired");
    expect(recordsModel.docs.find((d: any) => d.number === "EV-1").snapshot).toEqual({});
    expect(recordsModel.docs.find((d: any) => d.number === "EV-2").status).toBe("preserved");
    expect(exportsModel.docs[0].packageRemovedAt).toBeInstanceOf(Date);
    expect(storage.deleteObject).toHaveBeenCalledWith("evidence/exports/EX-1.json");
  });

  it("starts with no periods, cannot enable without one, and keeps change history", async () => {
    const { retention } = setup();
    await retention.seed();
    await retention.seed();
    const rows = await retention.list();
    expect(rows.length).toBeGreaterThan(5);
    expect(new Set(rows.map((r: any) => r.recordType)).size).toBe(rows.length);
    expect(rows.every((r: any) => r.retentionDays === null && !r.enabled)).toBe(true);
    const off: any = await retention.update("admin", "policy_acceptance", { enabled: true, reason: "try" } as any);
    expect(off.enabled).toBe(false);
    expect(off.status).toBe("needs_configuration");
    const on: any = await retention.update("admin", "policy_acceptance", { retentionDays: 100, enabled: true, reason: "set" } as any);
    expect(on.enabled).toBe(true);
    expect(on.history.length).toBe(2);
    const eu: any = await retention.createJurisdictionRule("admin", { recordType: "policy_acceptance", jurisdiction: "eu", reason: "EU rule" } as any);
    expect(eu.jurisdiction).toBe("EU");
    await expect(retention.createJurisdictionRule("admin", { recordType: "policy_acceptance", jurisdiction: "EU", reason: "dup" } as any)).rejects.toThrow();
  });

  it("clears pre-filled periods from earlier releases but keeps staff-set ones", async () => {
    const { retention } = setup();
    const policies: any = (retention as any).policies;
    await policies.create({ recordType: "evidence_record", label: "Old", retentionDays: 730, action: "delete", enabled: true, history: [] });
    await policies.create({ recordType: "evidence_export", label: "Old", retentionDays: 90, action: "delete", enabled: true, updatedBy: "staff", history: [] });
    await retention.migrateLegacy();
    await retention.seed();
    const rows = await retention.list();
    const ev: any = rows.find((r: any) => r.recordType === "evidence_record");
    const ex: any = rows.find((r: any) => r.recordType === "evidence_export");
    expect(ev).toMatchObject({ jurisdiction: "global", retentionDays: null, enabled: false });
    expect(ev.history[0].reason).toMatch(/Pre-filled/);
    expect(ex).toMatchObject({ retentionDays: 90, enabled: true });
    expect(rows.filter((r: any) => r.recordType === "evidence_record").length).toBe(1);
  });

  it("deactivates a deleted account that comes back", async () => {
    const { retention, users, deletionsModel } = setup();
    const id = await seedUser(users);
    await deletionsModel.create({ number: "DA-1", userId: id, status: "completed", requestedAt: new Date() });
    expect(await retention.reapplyTombstones("system")).toBe(1);
    expect(users.docs.find((u: any) => String(u._id) === id).isActive).toBe(false);
  });
});

describe("Evidence access log", () => {
  it("detects an edited entry", async () => {
    const { audit, logs } = setup();
    await audit.record({ actorId: "a", action: "x", targetType: "t" });
    await audit.record({ actorId: "a", action: "y", targetType: "t" });
    expect((await audit.verify()).intact).toBe(true);
    logs.docs[0].reason = "rewritten";
    expect(await audit.verify()).toMatchObject({ intact: false, brokenAt: 1 });
  });
});
