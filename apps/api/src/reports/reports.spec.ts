/* eslint-disable @typescript-eslint/no-explicit-any */
import "reflect-metadata";
import { Types } from "mongoose";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { InMemoryModel } from "./testing/in-memory-model";
import { ReportsService } from "./services/reports.service";
import { ModerationService } from "./services/moderation.service";
import { AccountRestrictionsService } from "./services/account-restrictions.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { DEFAULT_THRESHOLDS, evaluateAlert, resolveThresholds } from "./utils/report-policy";
import {
  AlertLevel,
  AppealStatus,
  CaseAction,
  CaseStatus,
  ModerationConsequence,
  ReportReason,
  ReportTargetType,
} from "./reports.constants";
import { RolePermissions } from "../admin/rbac/role-permissions";
import { Role } from "../admin/rbac/roles.enum";
import { Permission } from "../admin/rbac/permissions.enum";
import { ADMIN_PERMISSION_CATALOG } from "../admin/rbac/permission-catalog";

const oid = () => new Types.ObjectId();

function setup(thresholds = DEFAULT_THRESHOLDS) {
  const reportModel = new InMemoryModel("Report", [["reporterId", "targetType", "targetId", "dedupeKey"]]);
  const caseModel = new InMemoryModel("ModerationCase", [["targetType", "targetId", "openKey"]]);
  const restrictionModel = new InMemoryModel("AccountRestriction");
  const userModel = new InMemoryModel("User");
  const postModel = new InMemoryModel("Post");
  const friendshipModel = new InMemoryModel("Friendship");

  const connection: any = {
    models: { User: userModel, Post: postModel, Friendship: friendshipModel },
  };

  const settings: any = { get: jest.fn(async () => thresholds), update: jest.fn() };
  const notifier: any = {
    caseAlert: jest.fn(async () => undefined),
    assigned: jest.fn(async () => undefined),
    appealFiled: jest.fn(async () => undefined),
    userDecision: jest.fn(async () => undefined),
  };
  const audit: any = { log: jest.fn(async () => undefined) };

  const restrictions = new AccountRestrictionsService(restrictionModel as any, connection);
  const reports = new ReportsService(reportModel as any, caseModel as any, connection, settings, notifier);
  const moderation = new ModerationService(
    reportModel as any,
    caseModel as any,
    connection,
    restrictions,
    notifier,
    settings,
    audit,
  );

  async function user(extra: Record<string, unknown> = {}) {
    const created = await userModel.create({ username: `u${Math.random().toString(36).slice(2, 8)}`, isActive: true, role: "user", ...extra });
    return String(created._id);
  }

  async function post(owner: string, extra: Record<string, unknown> = {}) {
    const created = await postModel.create({ user: owner, username: "owner", content: "hello world", audience: "public", ...extra });
    return String(created._id);
  }

  return { reportModel, caseModel, restrictionModel, userModel, postModel, friendshipModel, settings, notifier, audit, restrictions, reports, moderation, user, post };
}

const moderator = (id: string, extra: string[] = []) => ({
  id,
  role: "moderator",
  permissions: [...RolePermissions[Role.MODERATOR], ...extra],
});
const admin = (id: string) => ({ id, role: "admin", permissions: RolePermissions[Role.ADMIN] });
const superAdmin = (id: string) => ({ id, role: "super_admin", isSuperAdmin: true, permissions: [] });

/* ============================================================================
   POLICY
============================================================================ */

describe("report policy", () => {
  it("uses 3 unique reporters for review and 5 for high priority", () => {
    expect(evaluateAlert(1, false, DEFAULT_THRESHOLDS).level).toBe(AlertLevel.NEW);
    expect(evaluateAlert(2, false, DEFAULT_THRESHOLDS).level).toBe(AlertLevel.NEW);
    expect(evaluateAlert(3, false, DEFAULT_THRESHOLDS).level).toBe(AlertLevel.REVIEW);
    expect(evaluateAlert(5, false, DEFAULT_THRESHOLDS).level).toBe(AlertLevel.HIGH);
    expect(evaluateAlert(1, true, DEFAULT_THRESHOLDS).level).toBe(AlertLevel.URGENT);
  });

  it("reads thresholds from config and never lets high < review", () => {
    const resolved = resolveThresholds(null, {
      MODERATION_REVIEW_THRESHOLD: "6",
      MODERATION_HIGH_PRIORITY_THRESHOLD: "4",
    } as any);

    expect(resolved.reviewThreshold).toBe(6);
    expect(resolved.highPriorityThreshold).toBeGreaterThanOrEqual(6);
  });
});

/* ============================================================================
   SUBMISSION
============================================================================ */

describe("ReportsService.submit", () => {
  it("rejects a reporterId supplied in the body (identity comes from the JWT)", async () => {
    const dto = plainToInstance(CreateReportDto, {
      targetType: "post",
      targetId: String(oid()),
      reason: "spam",
      reporterId: String(oid()),
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

    expect(errors.some((error) => error.property === "reporterId")).toBe(true);
  });

  it("validates the reason against the target type and requires details for Other", async () => {
    const t = setup();
    const reporter = await t.user();
    const owner = await t.user();
    const postId = await t.post(owner);

    await expect(
      t.reports.submit(reporter, { targetType: ReportTargetType.POST, targetId: postId, reason: ReportReason.OTHER }),
    ).rejects.toThrow(/describe/i);

    await expect(
      t.reports.submit(reporter, { targetType: ReportTargetType.POST, targetId: postId, reason: "nope" as any }),
    ).rejects.toThrow(/reason/i);
  });

  it("blocks self-reports, missing posts and posts the reporter can't see", async () => {
    const t = setup();
    const owner = await t.user();
    const other = await t.user();
    const ownPost = await t.post(owner);
    const privatePost = await t.post(owner, { audience: "private" });
    const friendsPost = await t.post(owner, { audience: "friends" });

    await expect(t.reports.submit(owner, { targetType: ReportTargetType.POST, targetId: ownPost, reason: ReportReason.SPAM })).rejects.toThrow(/own post/);
    await expect(t.reports.submit(owner, { targetType: ReportTargetType.ACCOUNT, targetId: owner, reason: ReportReason.SPAM })).rejects.toThrow(/own account/);
    await expect(t.reports.submit(other, { targetType: ReportTargetType.POST, targetId: String(oid()), reason: ReportReason.SPAM })).rejects.toThrow(/no longer available/);
    await expect(t.reports.submit(other, { targetType: ReportTargetType.POST, targetId: privatePost, reason: ReportReason.SPAM })).rejects.toThrow(/no longer available/);
    await expect(t.reports.submit(other, { targetType: ReportTargetType.POST, targetId: friendsPost, reason: ReportReason.SPAM })).rejects.toThrow(/no longer available/);

    expect(t.reportModel.docs).toHaveLength(0);
  });

  it("rejects a duplicate report from the same reporter with 409 and counts them once", async () => {
    const t = setup();
    const reporter = await t.user();
    const owner = await t.user();
    const postId = await t.post(owner);
    const dto = { targetType: ReportTargetType.POST, targetId: postId, reason: ReportReason.SPAM };

    await t.reports.submit(reporter, dto);
    await expect(t.reports.submit(reporter, { ...dto, reason: ReportReason.SCAM })).rejects.toMatchObject({ status: 409 });

    expect(t.reportModel.docs).toHaveLength(1);
    expect(t.caseModel.docs).toHaveLength(1);
    expect(t.caseModel.docs[0].eligibleReporterCount).toBe(1);
  });

  it("groups reports into one case, counts unique reporters and alerts once per level", async () => {
    const t = setup();
    const owner = await t.user();
    const postId = await t.post(owner);

    for (let i = 0; i < 6; i += 1) {
      await t.reports.submit(await t.user(), { targetType: ReportTargetType.POST, targetId: postId, reason: ReportReason.HARASSMENT });
    }

    expect(t.caseModel.docs).toHaveLength(1);
    const moderationCase = t.caseModel.docs[0];

    expect(moderationCase.eligibleReporterCount).toBe(6);
    expect(moderationCase.alertLevel).toBe(AlertLevel.HIGH);
    expect(moderationCase.priority).toBe("high");
    expect(moderationCase.topReason).toBe(ReportReason.HARASSMENT);

    const levels = t.notifier.caseAlert.mock.calls.map((call: any[]) => call[1]);
    expect(levels).toEqual([AlertLevel.NEW, AlertLevel.REVIEW, AlertLevel.HIGH]);
  });

  it("handles simultaneous reports: one case, exact count, one alert per level", async () => {
    const t = setup();
    const owner = await t.user();
    const postId = await t.post(owner);
    const reporters = await Promise.all(Array.from({ length: 8 }, () => t.user()));

    await Promise.all(
      reporters.map((reporter) =>
        t.reports.submit(reporter, { targetType: ReportTargetType.POST, targetId: postId, reason: ReportReason.SPAM }),
      ),
    );

    expect(t.caseModel.docs).toHaveLength(1);
    expect(t.caseModel.docs[0].eligibleReporterCount).toBe(8);

    const levels = t.notifier.caseAlert.mock.calls.map((call: any[]) => call[1]);
    expect(new Set(levels).size).toBe(levels.length);
  });

  it("escalates urgent reasons immediately", async () => {
    const t = setup();
    const owner = await t.user();
    const postId = await t.post(owner);

    await t.reports.submit(await t.user(), { targetType: ReportTargetType.POST, targetId: postId, reason: ReportReason.SELF_HARM });

    expect(t.caseModel.docs[0].alertLevel).toBe(AlertLevel.URGENT);
    expect(t.caseModel.docs[0].status).toBe(CaseStatus.ESCALATED);
  });

  it("never punishes automatically, however many reports arrive", async () => {
    const t = setup();
    const owner = await t.user();
    const postId = await t.post(owner);

    for (let i = 0; i < 12; i += 1) {
      await t.reports.submit(await t.user(), { targetType: ReportTargetType.POST, targetId: postId, reason: ReportReason.SPAM });
    }

    const ownerDoc = t.userModel.docs.find((doc) => String(doc._id) === owner)!;
    const postDoc = t.postModel.docs.find((doc) => String(doc._id) === postId)!;

    expect(ownerDoc.isActive).toBe(true);
    expect(ownerDoc.lockedUntil).toBeUndefined();
    expect(postDoc.moderationStatus).toBeUndefined();
    expect(t.restrictionModel.docs).toHaveLength(0);
    expect(t.notifier.userDecision).not.toHaveBeenCalled();
  });

  it("does not reveal reporters or counts to the reporter", async () => {
    const t = setup();
    const reporter = await t.user();
    const owner = await t.user();
    const postId = await t.post(owner);

    const result = await t.reports.submit(reporter, { targetType: ReportTargetType.POST, targetId: postId, reason: ReportReason.SPAM });

    expect(Object.keys(result).sort()).toEqual(["message", "reportId", "success"]);
  });
});

/* ============================================================================
   MODERATION
============================================================================ */

async function caseWithReports(t: ReturnType<typeof setup>, count = 3, extraOwner: Record<string, unknown> = {}) {
  const owner = await t.user(extraOwner);
  const postId = await t.post(owner);

  for (let i = 0; i < count; i += 1) {
    await t.reports.submit(await t.user(), { targetType: ReportTargetType.POST, targetId: postId, reason: ReportReason.SPAM });
  }

  return { owner, postId, caseId: String(t.caseModel.docs[0]._id) };
}

describe("ModerationService", () => {
  it("denies queue access without moderation.view", async () => {
    const t = setup();

    await expect(t.moderation.list({ id: String(oid()), role: "user", permissions: [] }, {} as any)).rejects.toMatchObject({ status: 403 });
  });

  it("denies suspension to moderators (needs moderation.suspend)", async () => {
    const t = setup();
    const { caseId } = await caseWithReports(t);
    const mod = moderator(await t.user({ role: "moderator" }));

    await expect(
      t.moderation.act(mod, caseId, {
        action: CaseAction.CONFIRM_VIOLATION,
        consequences: [ModerationConsequence.SUSPEND_PERMANENT],
        reason: "Repeated spam",
        confirm: true,
      } as any),
    ).rejects.toMatchObject({ status: 403 });

    expect(t.caseModel.docs[0].status).toBe(CaseStatus.PENDING);
  });

  it("requires a reason to dismiss and explicit confirmation for high-impact actions", async () => {
    const t = setup();
    const { caseId } = await caseWithReports(t);
    const mod = moderator(await t.user({ role: "moderator" }));

    await expect(t.moderation.act(mod, caseId, { action: CaseAction.DISMISS } as any)).rejects.toThrow(/why/i);
    await expect(
      t.moderation.act(mod, caseId, { action: CaseAction.CONFIRM_VIOLATION, consequences: [ModerationConsequence.REMOVE_POST], reason: "Spam" } as any),
    ).rejects.toThrow(/confirm/i);
  });

  it("forbids moderating your own case and protects admin accounts", async () => {
    const t = setup();
    const { owner, caseId } = await caseWithReports(t, 3, { role: "moderator" });

    await expect(
      t.moderation.act(moderator(owner), caseId, { action: CaseAction.DISMISS, reason: "fine" } as any),
    ).rejects.toMatchObject({ status: 403 });

    const t2 = setup();
    const adminCase = await caseWithReports(t2, 3, { role: "admin" });
    const otherAdmin = admin(await t2.user({ role: "admin" }));

    await expect(
      t2.moderation.act(otherAdmin, adminCase.caseId, {
        action: CaseAction.CONFIRM_VIOLATION,
        consequences: [ModerationConsequence.SUSPEND_TEMPORARY],
        durationDays: 3,
        reason: "x",
        confirm: true,
      } as any),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("applies consequences only after a confirmed violation, notifies once, and closes the case", async () => {
    const t = setup();
    const { owner, postId, caseId } = await caseWithReports(t);
    const actor = admin(await t.user({ role: "admin" }));

    await t.moderation.act(actor, caseId, {
      action: CaseAction.CONFIRM_VIOLATION,
      consequences: [ModerationConsequence.REMOVE_POST, ModerationConsequence.SUSPEND_TEMPORARY],
      durationDays: 7,
      reason: "Coordinated spam",
      confirm: true,
    } as any);

    const postDoc = t.postModel.docs.find((doc) => String(doc._id) === postId)!;
    const ownerDoc = t.userModel.docs.find((doc) => String(doc._id) === owner)!;
    const moderationCase = t.caseModel.docs[0];

    expect(postDoc.moderationStatus).toBe("removed");
    expect(ownerDoc.lockedUntil).toBeInstanceOf(Date);
    expect(moderationCase.status).toBe(CaseStatus.RESOLVED);
    expect(moderationCase.openKey).toBe(caseId);
    expect(moderationCase.decision.userNotified).toBe(true);
    expect(t.notifier.userDecision).toHaveBeenCalledTimes(1);
    expect(t.audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "MODERATION_VIOLATION_CONFIRMED", module: "moderation" }));

    // A second confirmation cannot apply consequences twice.
    await expect(
      t.moderation.act(actor, caseId, { action: CaseAction.CONFIRM_VIOLATION, consequences: [ModerationConsequence.WARN], reason: "again" } as any),
    ).rejects.toMatchObject({ status: 409 });

    // Reports are released so the post's owner can be reported in a new case later.
    expect(t.reportModel.docs.every((doc) => doc.dedupeKey === `closed:${caseId}`)).toBe(true);
  });

  it("restricts posting and blocks post creation until lifted by an overturned appeal", async () => {
    const t = setup();
    const { owner, caseId } = await caseWithReports(t);
    const mod = moderator(await t.user({ role: "moderator" }));

    await t.moderation.act(mod, caseId, {
      action: CaseAction.CONFIRM_VIOLATION,
      consequences: [ModerationConsequence.RESTRICT_POSTING],
      durationDays: 3,
      reason: "Spam",
      confirm: true,
    } as any);

    await expect(t.restrictions.assertCanPost(owner)).rejects.toMatchObject({ status: 403 });

    await t.reports.submitAppeal(owner, caseId, { message: "This was a mistake, please review." });
    expect(t.caseModel.docs[0].appealStatus).toBe(AppealStatus.PENDING);
    await expect(t.reports.submitAppeal(owner, caseId, { message: "Second appeal attempt here." })).rejects.toMatchObject({ status: 409 });

    const reviewer = admin(await t.user({ role: "admin" }));
    await t.moderation.decideAppeal(reviewer, caseId, { outcome: AppealStatus.OVERTURNED, note: "Context shows no spam", confirm: true } as any);

    await expect(t.restrictions.assertCanPost(owner)).resolves.toBeUndefined();
    expect(t.caseModel.docs[0].decision.reversedAt).toBeInstanceOf(Date);
  });

  it("reverses a post removal on restore", async () => {
    const t = setup();
    const { postId, caseId } = await caseWithReports(t);
    const actor = admin(await t.user({ role: "admin" }));

    await t.moderation.act(actor, caseId, {
      action: CaseAction.CONFIRM_VIOLATION,
      consequences: [ModerationConsequence.REMOVE_POST],
      reason: "Spam",
      confirm: true,
    } as any);
    await t.moderation.act(actor, caseId, { action: CaseAction.RESTORE, reason: "Mistake" } as any);

    expect(t.postModel.docs.find((doc) => String(doc._id) === postId)!.moderationStatus).toBeNull();
  });

  it("dismissing never touches the reported account", async () => {
    const t = setup();
    const { owner, caseId } = await caseWithReports(t);
    const mod = moderator(await t.user({ role: "moderator" }));

    await t.moderation.act(mod, caseId, { action: CaseAction.DISMISS, reason: "No violation" } as any);

    expect(t.caseModel.docs[0].status).toBe(CaseStatus.DISMISSED);
    expect(t.userModel.docs.find((doc) => String(doc._id) === owner)!.lockedUntil).toBeUndefined();
    expect(t.notifier.userDecision).not.toHaveBeenCalled();
  });

  it("invalid reports stop counting toward the case", async () => {
    const t = setup();
    const { caseId } = await caseWithReports(t, 3);
    const mod = moderator(await t.user({ role: "moderator" }));
    const reportId = String(t.reportModel.docs[0]._id);

    await t.moderation.setReportEligibility(mod, reportId, { eligible: false, reason: "Abusive report" });

    expect(t.caseModel.docs.find((doc) => String(doc._id) === caseId)!.eligibleReporterCount).toBe(2);
    await expect(t.moderation.setReportEligibility(mod, reportId, { eligible: false })).rejects.toMatchObject({ status: 409 });
  });

  it("super admins may act on admin accounts", async () => {
    const t = setup();
    const { owner, caseId } = await caseWithReports(t, 3, { role: "admin" });

    await t.moderation.act(superAdmin(await t.user({ role: "super_admin" })), caseId, {
      action: CaseAction.CONFIRM_VIOLATION,
      consequences: [ModerationConsequence.SUSPEND_PERMANENT],
      reason: "Abuse",
      confirm: true,
    } as any);

    expect(t.userModel.docs.find((doc) => String(doc._id) === owner)!.isActive).toBe(false);
  });
});

/* ============================================================================
   PERMISSIONS
============================================================================ */

describe("moderation permissions", () => {
  it("are all in the catalog", () => {
    const keys = new Set(ADMIN_PERMISSION_CATALOG.map((item) => item.key));

    Object.values(Permission)
      .filter((value) => value.startsWith("moderation."))
      .forEach((value) => expect(keys.has(value)).toBe(true));
  });

  it("keeps suspension and settings away from moderators", () => {
    expect(RolePermissions[Role.MODERATOR]).not.toContain(Permission.MODERATION_SUSPEND);
    expect(RolePermissions[Role.MODERATOR]).not.toContain(Permission.MODERATION_SETTINGS);
    expect(RolePermissions[Role.ADMIN]).toContain(Permission.MODERATION_SUSPEND);
  });
});
