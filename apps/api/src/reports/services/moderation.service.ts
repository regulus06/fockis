import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";
import { randomUUID } from "crypto";

import { Report, ReportDocument } from "../schemas/report.schema";
import { ModerationCase, ModerationCaseDocument } from "../schemas/moderation-case.schema";
import {
  AppealDecisionDto,
  AssignCaseDto,
  CaseActionDto,
  ListCasesQueryDto,
  SetReportEligibilityDto,
  UpdateModerationSettingsDto,
} from "../dto/moderation.dto";
import {
  AppealStatus,
  CaseAction,
  CasePriority,
  CaseStatus,
  ModerationConsequence,
  OPEN_CASE_STATUSES,
  PRIORITY_RANK,
  REASON_LABELS,
  ReportReason,
  ReportTargetType,
} from "../reports.constants";
import { Actor, actorId, hasPermission, isSuperAdmin, normalizeRole, STAFF_ROLES } from "../utils/actor";
import { MODERATION_PERMISSIONS as MP } from "../moderation.permissions";
import { AccountRestrictionsService } from "./account-restrictions.service";
import { ModerationNotifierService } from "./moderation-notifier.service";
import { ModerationSettingsService } from "./moderation-settings.service";
import { AuditService } from "../../admin/audit/audit.service";

type Lean<T> = T & { _id: Types.ObjectId; createdAt?: Date; updatedAt?: Date };
type CaseLean = Lean<ModerationCase>;

const DAY_MS = 86_400_000;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function priorityLabel(rank: number): CasePriority {
  return (
    (Object.entries(PRIORITY_RANK).find(([, value]) => value === rank)?.[0] as CasePriority) ??
    CasePriority.LOW
  );
}

const CONSEQUENCE_PERMISSION: Record<ModerationConsequence, string> = {
  [ModerationConsequence.REMOVE_POST]: MP.CONTENT_REMOVE,
  [ModerationConsequence.WARN]: MP.WARN,
  [ModerationConsequence.RESTRICT_POSTING]: MP.RESTRICT,
  [ModerationConsequence.SUSPEND_TEMPORARY]: MP.SUSPEND,
  [ModerationConsequence.SUSPEND_PERMANENT]: MP.SUSPEND,
};

const ACCOUNT_CONSEQUENCES = new Set([
  ModerationConsequence.RESTRICT_POSTING,
  ModerationConsequence.SUSPEND_TEMPORARY,
  ModerationConsequence.SUSPEND_PERMANENT,
]);

const HIGH_IMPACT = new Set([
  ModerationConsequence.REMOVE_POST,
  ModerationConsequence.RESTRICT_POSTING,
  ModerationConsequence.SUSPEND_TEMPORARY,
  ModerationConsequence.SUSPEND_PERMANENT,
]);

const CONSEQUENCE_TEXT: Record<ModerationConsequence, string> = {
  [ModerationConsequence.REMOVE_POST]: "your post was removed",
  [ModerationConsequence.WARN]: "a warning was added to your account",
  [ModerationConsequence.RESTRICT_POSTING]: "posting is restricted",
  [ModerationConsequence.SUSPEND_TEMPORARY]: "your account is temporarily suspended",
  [ModerationConsequence.SUSPEND_PERMANENT]: "your account is suspended",
};

/**
 * Staff-only moderation operations. Every method receives the
 * authenticated actor and checks the specific permission for what it does
 * (the controller additionally requires moderation.view). Each change is
 * recorded in the case history and in the admin AuditLog.
 */
@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,

    @InjectModel(ModerationCase.name)
    private readonly caseModel: Model<ModerationCaseDocument>,

    @InjectConnection()
    private readonly connection: Connection,

    private readonly restrictions: AccountRestrictionsService,
    private readonly notifier: ModerationNotifierService,
    private readonly settings: ModerationSettingsService,
    private readonly audit: AuditService,
  ) {}

  /* ==========================================================================
     HELPERS
  ========================================================================== */

  private require(actor: Actor, permission: string) {
    if (!hasPermission(actor, permission)) {
      throw new ForbiddenException("You don't have permission to do that.");
    }
  }

  private id(value: string, label = "case") {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ${label} ID.`);
    }

    return new Types.ObjectId(value);
  }

  private async loadCase(caseId: string): Promise<CaseLean> {
    const doc = await this.caseModel.findById(this.id(caseId)).lean<CaseLean>().exec();

    if (!doc) throw new NotFoundException("Case not found.");

    return doc;
  }

  private async log(actor: Actor, action: string, targetId: string, metadata: Record<string, unknown> = {}) {
    try {
      await this.audit.log({ userId: actorId(actor), action, module: "moderation", targetId, metadata });
    } catch (error) {
      this.logger.warn(`Audit log failed for ${action}: ${String(error)}`);
    }
  }

  private historyEntry(actor: Actor | null, action: string, extra: Record<string, unknown> = {}) {
    return { action, actorId: actor ? actorId(actor) : null, at: new Date(), ...extra };
  }

  private async usersById(ids: string[]) {
    const userModel = this.connection.models["User"];
    const valid = Array.from(new Set(ids.filter((id) => Types.ObjectId.isValid(id))));

    if (!userModel || !valid.length) return new Map<string, any>();

    const rows = await userModel
      .find({ _id: { $in: valid.map((id) => new Types.ObjectId(id)) } })
      .select("username firstName lastName profilePicture role isActive lockedUntil verified createdAt")
      .lean()
      .exec();

    return new Map(rows.map((row: any) => [String(row._id), row]));
  }

  private person(user: any) {
    if (!user) return null;

    return {
      id: String(user._id),
      username: String(user.username ?? ""),
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || String(user.username ?? ""),
      avatar: String(user.profilePicture ?? ""),
      role: normalizeRole(user.role) || "user",
    };
  }

  private summarize(doc: CaseLean, users: Map<string, any>) {
    return {
      id: String(doc._id),
      targetType: doc.targetType,
      targetId: String(doc.targetId),
      postId: doc.postId ? String(doc.postId) : null,
      reportedUser: this.person(users.get(String(doc.reportedUserId))) ?? {
        id: String(doc.reportedUserId),
        username: "",
        name: "Unknown user",
        avatar: "",
        role: "user",
      },
      status: doc.status,
      priority: priorityLabel(doc.priorityRank ?? 0),
      alertLevel: doc.alertLevel,
      topReason: doc.topReason || "",
      topReasonLabel: REASON_LABELS[doc.topReason as ReportReason] ?? "",
      reasonCounts: doc.reasonCounts ?? {},
      eligibleReporterCount: doc.eligibleReporterCount ?? 0,
      totalReportCount: doc.totalReportCount ?? 0,
      firstReportAt: doc.firstReportAt ?? null,
      latestReportAt: doc.latestReportAt ?? null,
      assignedTo: doc.assignedTo ? this.person(users.get(String(doc.assignedTo))) : null,
      appealStatus: doc.appealStatus ?? AppealStatus.NONE,
      preview:
        doc.targetType === ReportTargetType.POST
          ? String((doc.targetSnapshot as any)?.content ?? "").slice(0, 160)
          : `@${String((doc.targetSnapshot as any)?.username ?? "")}`,
      createdAt: doc.createdAt ?? null,
      updatedAt: doc.updatedAt ?? null,
    };
  }

  /* ==========================================================================
     QUEUE
  ========================================================================== */

  async list(actor: Actor, query: ListCasesQueryDto) {
    this.require(actor, MP.VIEW);

    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const filter: Record<string, any> = {};

    const status = query.status ?? "open";

    if (status === "open") filter.status = { $in: OPEN_CASE_STATUSES };
    else if (status !== "all") filter.status = status;

    if (query.targetType) filter.targetType = query.targetType;
    if (query.reason) filter[`reasonCounts.${query.reason}`] = { $gte: 1 };
    if (query.priority) filter.priorityRank = PRIORITY_RANK[query.priority];
    if (query.minReports) filter.eligibleReporterCount = { $gte: query.minReports };
    if (query.appealStatus) filter.appealStatus = query.appealStatus;

    if (query.from || query.to) {
      filter.latestReportAt = {
        ...(query.from ? { $gte: new Date(query.from) } : {}),
        ...(query.to ? { $lte: new Date(query.to) } : {}),
      };
    }

    if (query.assignedTo === "unassigned") filter.assignedTo = null;
    else if (query.assignedTo === "me") filter.assignedTo = this.id(actorId(actor), "moderator");
    else if (query.assignedTo) filter.assignedTo = this.id(query.assignedTo, "moderator");

    const q = query.q?.trim();

    if (q) {
      if (Types.ObjectId.isValid(q)) {
        const oid = new Types.ObjectId(q);

        filter.$or = [{ _id: oid }, { targetId: oid }, { reportedUserId: oid }];
      } else {
        const userModel = this.connection.models["User"];
        const users = userModel
          ? await userModel
              .find({ username: new RegExp(`^${escapeRegex(q.replace(/^@/, ""))}`, "i") })
              .select("_id")
              .limit(50)
              .lean()
              .exec()
          : [];

        filter.reportedUserId = { $in: users.map((user: any) => user._id) };
      }
    }

    const sort: Record<string, 1 | -1> =
      query.sort === "newest"
        ? { latestReportAt: -1, _id: -1 }
        : query.sort === "oldest"
          ? { firstReportAt: 1, _id: 1 }
          : query.sort === "reports"
            ? { eligibleReporterCount: -1, latestReportAt: -1, _id: -1 }
            : { priorityRank: -1, latestReportAt: -1, _id: -1 };

    const [docs, total] = await Promise.all([
      this.caseModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-notes -history -alertHistory")
        .lean<CaseLean[]>()
        .exec(),
      this.caseModel.countDocuments(filter).exec(),
    ]);

    const users = await this.usersById(
      docs.flatMap((doc) => [String(doc.reportedUserId), doc.assignedTo ? String(doc.assignedTo) : ""]),
    );

    return {
      items: docs.map((doc) => this.summarize(doc, users)),
      page,
      limit,
      total,
      hasMore: page * limit < total,
    };
  }

  /* ==========================================================================
     DASHBOARD
  ========================================================================== */

  async stats(actor: Actor) {
    this.require(actor, MP.VIEW);

    const [byStatus, highPriority, confirmed, reversed, pendingAppeals, totalReports, reports24h, restricted, activity] =
      await Promise.all([
        this.caseModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]).exec(),
        this.caseModel
          .countDocuments({ status: { $in: OPEN_CASE_STATUSES }, priorityRank: { $gte: PRIORITY_RANK[CasePriority.HIGH] } })
          .exec(),
        this.caseModel.countDocuments({ "decision.outcome": "violation" }).exec(),
        this.caseModel.countDocuments({ "decision.outcome": "violation", "decision.reversedAt": { $ne: null } }).exec(),
        this.caseModel.countDocuments({ appealStatus: AppealStatus.PENDING }).exec(),
        this.reportModel.estimatedDocumentCount().exec(),
        this.reportModel.countDocuments({ createdAt: { $gte: new Date(Date.now() - DAY_MS) } }).exec(),
        this.restrictions.countRestrictedAccounts(),
        this.caseModel
          .aggregate([
            { $match: { "history.0": { $exists: true } } },
            { $sort: { updatedAt: -1 } },
            { $limit: 50 },
            { $project: { targetType: 1, history: 1 } },
            { $unwind: "$history" },
            { $match: { "history.actorId": { $ne: null } } },
            { $sort: { "history.at": -1 } },
            { $limit: 12 },
          ])
          .exec(),
      ]);

    const statusCounts: Record<string, number> = {};

    for (const row of byStatus) statusCounts[String(row._id)] = Number(row.count) || 0;

    const users = await this.usersById(activity.map((row: any) => String(row.history?.actorId ?? "")));

    return {
      totalReports,
      reportsLast24h: reports24h,
      totalCases: Object.values(statusCounts).reduce((sum, value) => sum + value, 0),
      pending: statusCounts[CaseStatus.PENDING] ?? 0,
      underReview: statusCounts[CaseStatus.UNDER_REVIEW] ?? 0,
      actionRequired: statusCounts[CaseStatus.ACTION_REQUIRED] ?? 0,
      escalated: statusCounts[CaseStatus.ESCALATED] ?? 0,
      resolved: statusCounts[CaseStatus.RESOLVED] ?? 0,
      dismissed: statusCounts[CaseStatus.DISMISSED] ?? 0,
      highPriorityOpen: highPriority,
      confirmedViolations: confirmed - reversed,
      reversedDecisions: reversed,
      pendingAppeals,
      restrictedAccounts: restricted,
      recentActivity: activity.map((row: any) => ({
        caseId: String(row._id),
        targetType: row.targetType,
        action: row.history.action,
        to: row.history.to ?? null,
        reason: row.history.reason ?? null,
        at: row.history.at,
        actor: this.person(users.get(String(row.history.actorId))),
      })),
    };
  }

  /* ==========================================================================
     CASE DETAILS
  ========================================================================== */

  async details(actor: Actor, caseId: string) {
    this.require(actor, MP.VIEW);

    const doc = await this.loadCase(caseId);
    const [reports, previous, restrictions] = await Promise.all([
      this.reportModel.find({ caseId: doc._id }).sort({ createdAt: 1 }).limit(500).lean().exec(),
      this.caseModel
        .find({ reportedUserId: doc.reportedUserId, _id: { $ne: doc._id }, decision: { $ne: null } })
        .sort({ updatedAt: -1 })
        .limit(20)
        .select("targetType status decision appealStatus topReason updatedAt")
        .lean<CaseLean[]>()
        .exec(),
      this.restrictions.activeFor(String(doc.reportedUserId)),
    ]);

    const userIds = [
      String(doc.reportedUserId),
      doc.assignedTo ? String(doc.assignedTo) : "",
      ...reports.map((report: any) => String(report.reporterId)),
      ...(doc.notes ?? []).map((note) => note.authorId),
      ...(doc.history ?? []).map((entry) => entry.actorId ?? ""),
      doc.decision?.decidedBy ?? "",
    ];
    const users = await this.usersById(userIds);

    // Current state of the target (it may have changed since reports).
    let currentTarget: Record<string, unknown> | null = null;

    if (doc.targetType === ReportTargetType.POST) {
      const post: any = this.connection.models["Post"]
        ? await this.connection.models["Post"].findById(doc.targetId).lean().exec()
        : null;

      currentTarget = post
        ? {
            exists: true,
            content: String(post.content ?? ""),
            media: String(post.media ?? ""),
            audience: post.audience ?? "public",
            moderationStatus: post.moderationStatus ?? null,
            createdAt: post.createdAt ?? null,
          }
        : { exists: false };
    } else {
      const user = users.get(String(doc.reportedUserId));

      currentTarget = user
        ? {
            exists: true,
            isActive: user.isActive !== false,
            lockedUntil: user.lockedUntil ?? null,
            verified: Boolean(user.verified),
            createdAt: user.createdAt ?? null,
          }
        : { exists: false };
    }

    return {
      ...this.summarize(doc, users),
      targetSnapshot: doc.targetSnapshot ?? {},
      currentTarget,
      alertHistory: doc.alertHistory ?? [],
      reports: reports.map((report: any) => ({
        id: String(report._id),
        reporter: this.person(users.get(String(report.reporterId))),
        reason: report.reason,
        reasonLabel: REASON_LABELS[report.reason as ReportReason] ?? report.reason,
        description: report.description ?? "",
        eligible: report.eligible !== false,
        createdAt: report.createdAt,
      })),
      notes: (doc.notes ?? []).map((note) => ({ ...note, author: this.person(users.get(note.authorId)) })),
      history: (doc.history ?? [])
        .map((entry) => ({ ...entry, actor: entry.actorId ? this.person(users.get(entry.actorId)) : null }))
        .reverse(),
      decision: doc.decision
        ? { ...doc.decision, decidedByUser: this.person(users.get(doc.decision.decidedBy)) }
        : null,
      appeal: doc.appeal ?? null,
      resolution: doc.resolution ?? null,
      previousDecisions: previous.map((item) => ({
        id: String(item._id),
        targetType: item.targetType,
        status: item.status,
        outcome: item.decision?.outcome ?? null,
        ruleLabel: item.decision?.ruleLabel ?? "",
        consequences: item.decision?.consequences ?? [],
        reversed: Boolean(item.decision?.reversedAt),
        decidedAt: item.decision?.decidedAt ?? null,
      })),
      activeRestrictions: restrictions.map((item: any) => ({
        type: item.type,
        until: item.until ?? null,
        caseId: item.caseId ? String(item.caseId) : null,
      })),
    };
  }

  /* ==========================================================================
     ASSIGN / NOTES / REPORT ELIGIBILITY
  ========================================================================== */

  async staff(actor: Actor) {
    this.require(actor, MP.ASSIGN);

    const userModel = this.connection.models["User"];
    const rows = userModel
      ? await userModel
          .find({ isActive: { $ne: false }, $or: [{ role: { $in: STAFF_ROLES } }, { isSuperAdmin: true }] })
          .select("username firstName lastName profilePicture role")
          .limit(200)
          .lean()
          .exec()
      : [];

    return { items: rows.map((row: any) => this.person(row)) };
  }

  async assign(actor: Actor, caseId: string, dto: AssignCaseDto) {
    this.require(actor, MP.ASSIGN);

    const doc = await this.loadCase(caseId);
    let assignee: Types.ObjectId | null = null;

    if (dto.assigneeId) {
      const users = await this.usersById([dto.assigneeId]);
      const user = users.get(dto.assigneeId);

      if (!user || !(STAFF_ROLES.includes(normalizeRole(user.role)) || user.isSuperAdmin)) {
        throw new BadRequestException("Cases can only be assigned to moderators or administrators.");
      }

      if (String(doc.reportedUserId) === dto.assigneeId) {
        throw new BadRequestException("A case can't be assigned to the person it is about.");
      }

      assignee = new Types.ObjectId(dto.assigneeId);
    }

    await this.caseModel
      .updateOne(
        { _id: doc._id },
        {
          $set: { assignedTo: assignee, assignedAt: assignee ? new Date() : null },
          $push: { history: this.historyEntry(actor, assignee ? "assigned" : "unassigned", { to: dto.assigneeId ?? null }) },
        },
      )
      .exec();

    await this.log(actor, assignee ? "MODERATION_CASE_ASSIGNED" : "MODERATION_CASE_UNASSIGNED", caseId, {
      assigneeId: dto.assigneeId ?? null,
    });

    if (assignee && String(assignee) !== actorId(actor)) {
      await this.notifier.assigned(caseId, String(assignee));
    }

    return this.details(actor, caseId);
  }

  async addNote(actor: Actor, caseId: string, body: string) {
    this.require(actor, MP.REVIEW);

    const doc = await this.loadCase(caseId);
    const note = { id: randomUUID(), authorId: actorId(actor), body: body.trim(), at: new Date() };

    await this.caseModel
      .updateOne({ _id: doc._id }, { $push: { notes: note, history: this.historyEntry(actor, "note_added") } })
      .exec();

    await this.log(actor, "MODERATION_NOTE_ADDED", caseId);

    return this.details(actor, caseId);
  }

  /**
   * Marks one report invalid (e.g. abusive or mistaken) so it stops
   * counting toward the case's unique reporters, or restores it.
   */
  async setReportEligibility(actor: Actor, reportId: string, dto: SetReportEligibilityDto) {
    this.require(actor, MP.REVIEW);

    const updated: any = await this.reportModel
      .findOneAndUpdate(
        { _id: this.id(reportId, "report"), eligible: !dto.eligible },
        { $set: { eligible: dto.eligible } },
        { returnDocument: "after" },
      )
      .lean()
      .exec();

    if (!updated) {
      const exists = await this.reportModel.exists({ _id: this.id(reportId, "report") });

      if (!exists) throw new NotFoundException("Report not found.");

      throw new ConflictException(dto.eligible ? "This report already counts." : "This report is already marked invalid.");
    }

    if (updated.caseId) {
      const thresholds = await this.settings.get();
      const delta = dto.eligible ? 1 : -1;
      const urgent = thresholds.urgentReasons.includes(updated.reason);

      await this.caseModel
        .updateOne(
          { _id: updated.caseId },
          {
            $inc: {
              eligibleReporterCount: delta,
              urgentReportCount: urgent ? delta : 0,
              [`reasonCounts.${updated.reason}`]: delta,
            },
            $push: {
              history: this.historyEntry(actor, dto.eligible ? "report_restored" : "report_invalidated", {
                reason: dto.reason ?? null,
                metadata: { reportId },
              }),
            },
          },
        )
        .exec();
    }

    await this.log(actor, dto.eligible ? "MODERATION_REPORT_RESTORED" : "MODERATION_REPORT_INVALIDATED", reportId, {
      caseId: updated.caseId ? String(updated.caseId) : null,
      reason: dto.reason ?? null,
    });

    return updated.caseId ? this.details(actor, String(updated.caseId)) : { success: true };
  }

  /* ==========================================================================
     ACTIONS
  ========================================================================== */

  private assertCanActOn(actor: Actor, doc: CaseLean, reportedRole: string, accountImpact: boolean) {
    if (String(doc.reportedUserId) === actorId(actor)) {
      throw new ForbiddenException("You can't moderate a case about your own account or content.");
    }

    // Same rule the user-administration screens use for status changes.
    if (accountImpact && ["admin", "super_admin"].includes(reportedRole) && !isSuperAdmin(actor)) {
      throw new ForbiddenException("Only a Super Admin can restrict an administrator account.");
    }
  }

  private async setStatus(actor: Actor, doc: CaseLean, to: CaseStatus, action: string, reason?: string, extra: Record<string, unknown> = {}) {
    const updated = await this.caseModel
      .findOneAndUpdate(
        { _id: doc._id, status: doc.status },
        {
          $set: { status: to, ...extra },
          $push: { history: this.historyEntry(actor, action, { from: doc.status, to, reason: reason ?? null }) },
        },
        { returnDocument: "after" },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new ConflictException("This case changed while you were working on it. Reload and try again.");
    }

    await this.reportModel.updateMany({ caseId: doc._id }, { $set: { status: to } }).exec();

    return updated;
  }

  /** Closes the case so new reports about the target open a fresh case. */
  private async close(doc: CaseLean, actor: Actor, status: CaseStatus.RESOLVED | CaseStatus.DISMISSED, reason: string, decision: Record<string, unknown>) {
    const now = new Date();
    const closedKey = String(doc._id);

    const updated = await this.caseModel
      .findOneAndUpdate(
        { _id: doc._id, status: { $in: OPEN_CASE_STATUSES } },
        {
          $set: {
            status,
            openKey: closedKey,
            decision,
            resolution: { reason, resolvedBy: actorId(actor), resolvedAt: now },
          },
          $push: { history: this.historyEntry(actor, status === CaseStatus.DISMISSED ? "dismissed" : "violation_confirmed", { from: doc.status, to: status, reason }) },
        },
        { returnDocument: "after" },
      )
      .lean<CaseLean>()
      .exec();

    if (!updated) {
      throw new ConflictException("This case is already closed.");
    }

    // Reporters may report the target again after a decision.
    await this.reportModel
      .updateMany({ caseId: doc._id }, { $set: { status, dedupeKey: `closed:${closedKey}` } })
      .exec();

    return updated;
  }

  async act(actor: Actor, caseId: string, dto: CaseActionDto) {
    this.require(actor, MP.VIEW);

    const doc = await this.loadCase(caseId);
    const isOpen = OPEN_CASE_STATUSES.includes(doc.status);
    const users = await this.usersById([String(doc.reportedUserId)]);
    const reported = users.get(String(doc.reportedUserId));
    const reportedRole = normalizeRole(reported?.role) || "user";

    switch (dto.action) {
      case CaseAction.START_REVIEW:
      case CaseAction.REQUEST_REVIEW:
      case CaseAction.ESCALATE: {
        this.require(actor, MP.REVIEW);
        this.assertCanActOn(actor, doc, reportedRole, false);

        if (!isOpen) throw new ConflictException("This case is closed.");

        const to =
          dto.action === CaseAction.START_REVIEW
            ? CaseStatus.UNDER_REVIEW
            : dto.action === CaseAction.REQUEST_REVIEW
              ? CaseStatus.ACTION_REQUIRED
              : CaseStatus.ESCALATED;

        const extra: Record<string, unknown> = {};

        if (dto.action === CaseAction.START_REVIEW && !doc.assignedTo) {
          extra.assignedTo = new Types.ObjectId(actorId(actor));
          extra.assignedAt = new Date();
        }

        if (dto.action === CaseAction.ESCALATE) {
          extra.priorityRank = PRIORITY_RANK[CasePriority.URGENT];
          extra.priority = CasePriority.URGENT;
        }

        await this.setStatus(actor, doc, to, dto.action, dto.reason, extra);

        if (dto.action === CaseAction.ESCALATE) {
          await this.reportModel.updateMany({ caseId: doc._id }, { $set: { priority: CasePriority.URGENT } }).exec();
        }

        await this.log(actor, `MODERATION_${dto.action.toUpperCase()}`, caseId, { reason: dto.reason ?? null });
        break;
      }

      case CaseAction.DISMISS: {
        this.require(actor, MP.RESOLVE);
        this.assertCanActOn(actor, doc, reportedRole, false);

        if (!dto.reason?.trim()) throw new BadRequestException("Record why the reports are being dismissed.");

        await this.close(doc, actor, CaseStatus.DISMISSED, dto.reason.trim(), {
          outcome: "no_violation",
          rule: "",
          ruleLabel: "",
          consequences: [],
          restrictionUntil: null,
          userMessage: "",
          reason: dto.reason.trim(),
          decidedBy: actorId(actor),
          decidedAt: new Date(),
          userNotified: false,
        });

        await this.log(actor, "MODERATION_DISMISSED", caseId, { reason: dto.reason });
        break;
      }

      case CaseAction.CONFIRM_VIOLATION:
        await this.confirmViolation(actor, doc, dto, reportedRole);
        break;

      case CaseAction.RESTORE:
        this.require(actor, MP.RESTORE);
        this.assertCanActOn(actor, doc, reportedRole, false);
        await this.reverse(actor, doc, dto.reason?.trim() || "Decision reversed by moderator", "restored");
        break;

      default:
        throw new BadRequestException("Unknown action.");
    }

    return this.details(actor, caseId);
  }

  private async confirmViolation(actor: Actor, doc: CaseLean, dto: CaseActionDto, reportedRole: string) {
    this.require(actor, MP.RESOLVE);

    const consequences = Array.from(new Set(dto.consequences ?? []));

    if (!consequences.length) {
      throw new BadRequestException("Choose at least one action (for example, a warning).");
    }

    if (!dto.reason?.trim()) {
      throw new BadRequestException("Record why the violation was confirmed.");
    }

    for (const consequence of consequences) this.require(actor, CONSEQUENCE_PERMISSION[consequence]);

    const accountImpact = consequences.some((item) => ACCOUNT_CONSEQUENCES.has(item));

    this.assertCanActOn(actor, doc, reportedRole, accountImpact);

    if (consequences.some((item) => HIGH_IMPACT.has(item)) && dto.confirm !== true) {
      throw new BadRequestException("Confirm this action to continue.");
    }

    if (consequences.includes(ModerationConsequence.REMOVE_POST) && doc.targetType !== ReportTargetType.POST) {
      throw new BadRequestException("Only posts can be removed.");
    }

    if (
      consequences.includes(ModerationConsequence.SUSPEND_TEMPORARY) &&
      consequences.includes(ModerationConsequence.SUSPEND_PERMANENT)
    ) {
      throw new BadRequestException("Choose either a temporary or a permanent suspension.");
    }

    const needsDuration = consequences.some(
      (item) => item === ModerationConsequence.RESTRICT_POSTING || item === ModerationConsequence.SUSPEND_TEMPORARY,
    );

    if (needsDuration && !dto.durationDays) {
      throw new BadRequestException("Choose how many days the restriction lasts.");
    }

    if (!OPEN_CASE_STATUSES.includes(doc.status)) {
      throw new ConflictException("This case is already closed.");
    }

    const rule = dto.rule ?? (doc.topReason as ReportReason) ?? ReportReason.OTHER;
    const until = needsDuration ? new Date(Date.now() + (dto.durationDays ?? 0) * DAY_MS) : null;
    const reason = dto.reason.trim();

    // Close first: only one moderator can confirm a case.
    const closed = await this.close(doc, actor, CaseStatus.RESOLVED, reason, {
      outcome: "violation",
      rule,
      ruleLabel: REASON_LABELS[rule] ?? rule,
      consequences,
      restrictionUntil: until,
      userMessage: dto.userMessage?.trim() ?? "",
      reason,
      decidedBy: actorId(actor),
      decidedAt: new Date(),
      userNotified: false,
    });

    const caseId = String(doc._id);
    const userId = String(doc.reportedUserId);
    const applied: string[] = [];

    try {
      if (consequences.includes(ModerationConsequence.REMOVE_POST)) {
        const postModel = this.connection.models["Post"];

        if (postModel) {
          await postModel
            .updateOne(
              { _id: doc.targetId },
              { $set: { moderationStatus: "removed", moderationRemovedAt: new Date(), moderationCaseId: caseId } },
            )
            .exec();
          applied.push(ModerationConsequence.REMOVE_POST);
        }
      }

      if (consequences.includes(ModerationConsequence.RESTRICT_POSTING) && until) {
        await this.restrictions.restrictPosting(userId, until, caseId, actorId(actor), reason);
        applied.push(ModerationConsequence.RESTRICT_POSTING);
      }

      if (consequences.includes(ModerationConsequence.SUSPEND_TEMPORARY) && until) {
        await this.restrictions.suspend(userId, until, caseId, actorId(actor), reason);
        applied.push(ModerationConsequence.SUSPEND_TEMPORARY);
      }

      if (consequences.includes(ModerationConsequence.SUSPEND_PERMANENT)) {
        await this.restrictions.suspend(userId, null, caseId, actorId(actor), reason);
        applied.push(ModerationConsequence.SUSPEND_PERMANENT);
      }

      if (consequences.includes(ModerationConsequence.WARN)) applied.push(ModerationConsequence.WARN);
    } catch (error) {
      await this.caseModel
        .updateOne(
          { _id: doc._id },
          { $push: { history: this.historyEntry(actor, "action_failed", { reason: String(error), metadata: { applied } }) } },
        )
        .exec();
      await this.log(actor, "MODERATION_ACTION_FAILED", caseId, { applied, error: String(error) });
      throw new ConflictException(
        `The decision was recorded but not every action could be applied (${applied.join(", ") || "none"}). Check the case history.`,
      );
    }

    await this.log(actor, "MODERATION_VIOLATION_CONFIRMED", caseId, {
      rule,
      consequences: applied,
      until,
      reportedUserId: userId,
      reason,
    });

    // Notify the owner exactly once (atomic flag).
    const flagged = await this.caseModel
      .findOneAndUpdate(
        { _id: closed._id, "decision.userNotified": false },
        { $set: { "decision.userNotified": true } },
      )
      .exec();

    if (flagged) {
      const what = applied.map((item) => CONSEQUENCE_TEXT[item as ModerationConsequence]).join(", ");
      const duration = until ? ` until ${until.toDateString()}` : "";
      const subject = doc.targetType === ReportTargetType.POST ? "One of your posts" : "Your account";
      const custom = dto.userMessage?.trim() ? ` ${dto.userMessage.trim()}` : "";

      await this.notifier.userDecision(
        userId,
        caseId,
        "Moderation decision on your account",
        `${subject} broke the Community Guidelines (${REASON_LABELS[rule] ?? rule}). Action taken: ${what}${duration}.${custom} You can review the decision and appeal it.`,
      );
    }
  }

  /** Undo a confirmed decision: restore the post and lift restrictions. */
  private async reverse(actor: Actor, doc: CaseLean, reason: string, action: "restored" | "appeal_overturned") {
    if (doc.decision?.outcome !== "violation") {
      throw new ConflictException("Only confirmed violations can be reversed.");
    }

    const marked = await this.caseModel
      .findOneAndUpdate(
        { _id: doc._id, "decision.reversedAt": { $in: [null] } },
        {
          $set: { "decision.reversedAt": new Date(), "decision.reversedBy": actorId(actor), "decision.reversalReason": reason },
          $push: { history: this.historyEntry(actor, action, { reason }) },
        },
      )
      .exec();

    if (!marked) throw new ConflictException("This decision was already reversed.");

    const caseId = String(doc._id);

    if ((doc.decision.consequences ?? []).includes(ModerationConsequence.REMOVE_POST)) {
      const postModel = this.connection.models["Post"];

      await postModel
        ?.updateOne(
          { _id: doc.targetId, moderationCaseId: caseId },
          { $set: { moderationStatus: null, moderationRemovedAt: null, moderationCaseId: null } },
        )
        .exec();
    }

    const lifted = await this.restrictions.liftForCase(caseId, actorId(actor));

    await this.log(actor, action === "restored" ? "MODERATION_DECISION_REVERSED" : "MODERATION_APPEAL_OVERTURNED", caseId, {
      reason,
      lifted,
    });

    await this.notifier.userDecision(
      String(doc.reportedUserId),
      caseId,
      "A moderation decision was reversed",
      "We reviewed a decision on your account again and reversed it. Any removed content and restrictions from it have been restored.",
    );
  }

  /* ==========================================================================
     APPEALS
  ========================================================================== */

  async decideAppeal(actor: Actor, caseId: string, dto: AppealDecisionDto) {
    this.require(actor, MP.APPEALS);

    const doc = await this.loadCase(caseId);

    if (doc.appealStatus !== AppealStatus.PENDING) {
      throw new ConflictException("There is no pending appeal on this case.");
    }

    if (String(doc.reportedUserId) === actorId(actor)) {
      throw new ForbiddenException("You can't review an appeal about your own account.");
    }

    if (dto.outcome === AppealStatus.OVERTURNED && dto.confirm !== true) {
      throw new BadRequestException("Confirm this action to continue.");
    }

    const reviewed = await this.caseModel
      .findOneAndUpdate(
        { _id: doc._id, appealStatus: AppealStatus.PENDING },
        {
          $set: {
            appealStatus: dto.outcome,
            "appeal.status": dto.outcome,
            "appeal.reviewedBy": actorId(actor),
            "appeal.reviewedAt": new Date(),
            "appeal.outcomeNote": dto.note.trim(),
          },
          $push: { history: this.historyEntry(actor, `appeal_${dto.outcome}`, { reason: dto.note.trim() }) },
        },
      )
      .exec();

    if (!reviewed) throw new ConflictException("This appeal was already reviewed.");

    if (dto.outcome === AppealStatus.OVERTURNED) {
      await this.reverse(actor, doc, dto.note.trim(), "appeal_overturned");
    } else {
      await this.log(actor, "MODERATION_APPEAL_UPHELD", caseId, { note: dto.note.trim() });
      await this.notifier.userDecision(
        String(doc.reportedUserId),
        caseId,
        "Your appeal was reviewed",
        `We reviewed your appeal and the original decision stands. ${dto.note.trim()}`,
      );
    }

    return this.details(actor, caseId);
  }

  /* ==========================================================================
     SETTINGS
  ========================================================================== */

  async getSettings(actor: Actor) {
    this.require(actor, MP.VIEW);
    return this.settings.get();
  }

  async updateSettings(actor: Actor, dto: UpdateModerationSettingsDto) {
    this.require(actor, MP.SETTINGS);

    const value = await this.settings.update(dto, actorId(actor));

    await this.log(actor, "MODERATION_SETTINGS_UPDATED", "settings", { ...value });

    return value;
  }
}
