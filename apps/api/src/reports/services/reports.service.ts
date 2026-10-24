import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";

import { Report, ReportDocument } from "../schemas/report.schema";
import { ModerationCase, ModerationCaseDocument } from "../schemas/moderation-case.schema";
import { CreateReportDto } from "../dto/create-report.dto";
import { SubmitAppealDto } from "../dto/moderation.dto";
import {
  ALERT_RANK,
  AlertLevel,
  AppealStatus,
  CasePriority,
  CaseStatus,
  OPEN_CASE_STATUSES,
  PRIORITY_RANK,
  REASON_LABELS,
  REASONS_BY_TARGET,
  ReportReason,
  ReportTargetType,
} from "../reports.constants";
import { evaluateAlert, OPEN_KEY } from "../utils/report-policy";
import { ModerationSettingsService } from "./moderation-settings.service";
import { ModerationNotifierService } from "./moderation-notifier.service";

const DAY_MS = 86_400_000;

function isDuplicateKey(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as { code?: number }).code === 11000);
}

function priorityLabel(rank: number): CasePriority {
  return (
    (Object.entries(PRIORITY_RANK).find(([, value]) => value === rank)?.[0] as CasePriority) ??
    CasePriority.LOW
  );
}

interface ResolvedTarget {
  reportedUserId: string;
  postId: string | null;
  evidence: Record<string, unknown>;
}

/**
 * User-facing side of reporting: submit a report, see your own reports,
 * see moderation decisions about you, appeal them.
 *
 * Nothing here ever reveals who reported whom or how many reports a
 * target has.
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,

    @InjectModel(ModerationCase.name)
    private readonly caseModel: Model<ModerationCaseDocument>,

    @InjectConnection()
    private readonly connection: Connection,

    private readonly settings: ModerationSettingsService,
    private readonly notifier: ModerationNotifierService,
  ) {}

  /* ==========================================================================
     TARGET RESOLUTION
  ========================================================================== */

  private async areFriends(a: string, b: string): Promise<boolean> {
    const friendship = this.connection.models["Friendship"];

    if (!friendship) return false;

    const row = await friendship
      .findOne({
        status: "accepted",
        $or: [
          { requester: new Types.ObjectId(a), receiver: new Types.ObjectId(b) },
          { requester: new Types.ObjectId(b), receiver: new Types.ObjectId(a) },
        ],
      })
      .select("_id")
      .lean()
      .exec();

    return Boolean(row);
  }

  private async resolvePost(reporterId: string, postId: string): Promise<ResolvedTarget> {
    const postModel = this.connection.models["Post"];

    if (!postModel) {
      throw new InternalServerErrorException("Posts are unavailable right now.");
    }

    const post: any = await postModel.findById(postId).lean().exec();

    // Deleted, removed by moderation, or never existed.
    if (!post || post.moderationStatus === "removed") {
      throw new NotFoundException("This post is no longer available.");
    }

    const ownerId = String(post.user ?? "");

    if (!Types.ObjectId.isValid(ownerId)) {
      throw new NotFoundException("This post is no longer available.");
    }

    if (ownerId === reporterId) {
      throw new BadRequestException("You can't report your own post.");
    }

    // Only content the reporter is allowed to see can be reported.
    const audience = String(post.audience ?? "public");

    if (audience === "private" || (audience === "friends" && !(await this.areFriends(reporterId, ownerId)))) {
      throw new NotFoundException("This post is no longer available.");
    }

    return {
      reportedUserId: ownerId,
      postId,
      evidence: {
        kind: "post",
        authorId: ownerId,
        authorUsername: String(post.username ?? ""),
        content: String(post.content ?? "").slice(0, 5000),
        media: post.media ? String(post.media) : "",
        mediaType: String(post.mediaType ?? post.type ?? ""),
        audience,
        postCreatedAt: post.createdAt ?? null,
        capturedAt: new Date(),
      },
    };
  }

  private async resolveAccount(reporterId: string, userId: string): Promise<ResolvedTarget> {
    if (userId === reporterId) {
      throw new BadRequestException("You can't report your own account.");
    }

    const userModel = this.connection.models["User"];

    if (!userModel) {
      throw new InternalServerErrorException("Accounts are unavailable right now.");
    }

    const user: any = await userModel
      .findById(userId)
      .select("username firstName lastName profilePicture bio isActive createdAt")
      .lean()
      .exec();

    if (!user || user.isActive === false) {
      throw new NotFoundException("This account is no longer available.");
    }

    return {
      reportedUserId: userId,
      postId: null,
      evidence: {
        kind: "account",
        username: String(user.username ?? ""),
        name: [user.firstName, user.lastName].filter(Boolean).join(" "),
        profilePicture: String(user.profilePicture ?? ""),
        bio: String(user.bio ?? "").slice(0, 1000),
        accountCreatedAt: user.createdAt ?? null,
        capturedAt: new Date(),
      },
    };
  }

  /* ==========================================================================
     SUBMIT
  ========================================================================== */

  /**
   * reporterId always comes from the authenticated principal (controller),
   * never from the request body.
   */
  async submit(reporterId: string, dto: CreateReportDto) {
    if (!Types.ObjectId.isValid(reporterId)) {
      throw new BadRequestException("Authenticated user is invalid.");
    }

    if (!REASONS_BY_TARGET[dto.targetType]?.includes(dto.reason)) {
      throw new BadRequestException("That reason doesn't apply to this kind of report.");
    }

    const description = (dto.description ?? "").trim();

    if (dto.reason === ReportReason.OTHER && description.length < 5) {
      throw new BadRequestException("Please describe the problem when choosing “Other”.");
    }

    const target =
      dto.targetType === ReportTargetType.POST
        ? await this.resolvePost(reporterId, dto.targetId)
        : await this.resolveAccount(reporterId, dto.targetId);

    const thresholds = await this.settings.get();
    const reporter = new Types.ObjectId(reporterId);

    const recent = await this.reportModel
      .countDocuments({ reporterId: reporter, createdAt: { $gte: new Date(Date.now() - DAY_MS) } })
      .exec();

    if (recent >= thresholds.maxReportsPerDay) {
      throw new HttpException(
        "You've sent a lot of reports today. Please try again tomorrow.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const targetId = new Types.ObjectId(dto.targetId);

    // 1. The report itself. The unique index rejects a second open report
    //    from the same reporter about the same target.
    let report: ReportDocument;

    try {
      report = await this.reportModel.create({
        reporterId: reporter,
        targetType: dto.targetType,
        type: dto.targetType,
        targetId,
        postId: target.postId ? new Types.ObjectId(target.postId) : null,
        reportedUserId: new Types.ObjectId(target.reportedUserId),
        reason: dto.reason,
        description,
        evidence: target.evidence,
        status: CaseStatus.PENDING,
        priority: CasePriority.LOW,
        eligible: true,
        caseId: null,
        dedupeKey: OPEN_KEY,
      });
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new ConflictException(
          dto.targetType === ReportTargetType.POST
            ? "You've already reported this post. Our team will review it."
            : "You've already reported this account. Our team will review it.",
        );
      }

      throw error;
    }

    // 2. Attach to the target's open case and count the reporter once.
    try {
      const moderationCase = await this.attachToCase(report, target, thresholds.urgentReasons.includes(dto.reason));

      await this.reportModel
        .updateOne(
          { _id: report._id },
          {
            $set: {
              caseId: moderationCase._id,
              status: moderationCase.status,
              priority: priorityLabel(moderationCase.priorityRank ?? 0),
            },
          },
        )
        .exec();

      // 3. Raise the case's alert level if a threshold was crossed.
      await this.raiseAlert(moderationCase, thresholds);
    } catch (error) {
      // Never keep a report that isn't counted in a case.
      await this.reportModel.deleteOne({ _id: report._id }).exec().catch(() => undefined);
      this.logger.error(`Report attach failed: ${String(error)}`);
      throw new InternalServerErrorException("We couldn't submit your report. Please try again.");
    }

    return {
      success: true,
      reportId: String(report._id),
      message: "Thanks for letting us know. Our team will review your report.",
    };
  }

  private async attachToCase(report: ReportDocument, target: ResolvedTarget, urgent: boolean) {
    const now = new Date();
    const filter = { targetType: report.targetType, targetId: report.targetId, openKey: OPEN_KEY };
    const update = {
      $inc: {
        eligibleReporterCount: 1,
        totalReportCount: 1,
        urgentReportCount: urgent ? 1 : 0,
        [`reasonCounts.${report.reason}`]: 1,
      },
      $set: { latestReportAt: now, targetSnapshot: target.evidence },
      $setOnInsert: {
        postId: report.postId ?? null,
        reportedUserId: report.reportedUserId,
        status: CaseStatus.PENDING,
        priority: CasePriority.LOW,
        priorityRank: 0,
        alertLevel: AlertLevel.NONE,
        alertRank: 0,
        firstReportAt: now,
        appealStatus: AppealStatus.NONE,
      },
    };

    // Two first reports racing: one upsert inserts, the other hits the
    // unique index and simply retries as an update.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const doc = await this.caseModel
          .findOneAndUpdate(filter, update, { upsert: true, returnDocument: "after" })
          .lean()
          .exec();

        if (doc) {
          await this.refreshTopReason(doc);
          return doc;
        }
      } catch (error) {
        if (!isDuplicateKey(error) || attempt === 2) throw error;
      }
    }

    throw new Error("Could not attach report to a case.");
  }

  private async refreshTopReason(doc: { _id: Types.ObjectId; reasonCounts?: Record<string, number>; topReason?: string }) {
    const entries = Object.entries(doc.reasonCounts ?? {}).sort((a, b) => b[1] - a[1]);
    const top = entries[0]?.[0] ?? "";

    if (top && top !== doc.topReason) {
      await this.caseModel.updateOne({ _id: doc._id }, { $set: { topReason: top } }).exec();
      doc.topReason = top;
    }
  }

  /**
   * Moves the case's alert level up (never down). The conditional update
   * on alertRank means that when several reports arrive together exactly
   * one request wins each level, so moderators are notified once per level.
   * Reaching a threshold flags the case for REVIEW only.
   */
  private async raiseAlert(
    moderationCase: { _id: Types.ObjectId; eligibleReporterCount?: number; urgentReportCount?: number; alertRank?: number; status?: CaseStatus; targetType: ReportTargetType; topReason?: string },
    thresholds: Awaited<ReturnType<ModerationSettingsService["get"]>>,
  ) {
    if (!OPEN_CASE_STATUSES.includes(moderationCase.status ?? CaseStatus.PENDING)) return;

    const decision = evaluateAlert(
      moderationCase.eligibleReporterCount ?? 0,
      (moderationCase.urgentReportCount ?? 0) > 0,
      thresholds,
    );

    if (decision.rank <= (moderationCase.alertRank ?? 0)) return;

    const now = new Date();
    const priorityRank = PRIORITY_RANK[decision.priority];

    const raised = await this.caseModel
      .findOneAndUpdate(
        { _id: moderationCase._id, alertRank: { $lt: decision.rank } },
        {
          $set: { alertLevel: decision.level, alertRank: decision.rank },
          $max: { priorityRank },
          $push: {
            alertHistory: { level: decision.level, reason: decision.reason, at: now },
            history: { action: "alert_raised", actorId: null, to: decision.level, reason: decision.reason, at: now },
          },
        },
        { returnDocument: "after" },
      )
      .lean()
      .exec();

    if (!raised) return; // Another request already raised it.

    const label = priorityLabel(raised.priorityRank ?? 0);

    await this.caseModel.updateOne({ _id: raised._id }, { $set: { priority: label } }).exec();
    await this.reportModel.updateMany({ caseId: raised._id }, { $set: { priority: label } }).exec();

    if (decision.level === AlertLevel.URGENT) {
      await this.caseModel
        .updateOne(
          { _id: raised._id, status: CaseStatus.PENDING },
          { $set: { status: CaseStatus.ESCALATED }, $push: { history: { action: "auto_escalated", actorId: null, from: CaseStatus.PENDING, to: CaseStatus.ESCALATED, reason: decision.reason, at: now } } },
        )
        .exec();
    }

    if (decision.level === AlertLevel.NEW && !thresholds.notifyOnNewCase) return;

    await this.notifier.caseAlert(raised, decision.level, decision.reason);
  }

  /* ==========================================================================
     REPORTER: MY REPORTS
  ========================================================================== */

  async myReports(reporterId: string, page = 1, limit = 20) {
    const reporter = new Types.ObjectId(reporterId);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * safeLimit;

    const [rows, total] = await Promise.all([
      this.reportModel
        .find({ reporterId: reporter })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .select("targetType targetId reason status createdAt evidence")
        .lean()
        .exec(),
      this.reportModel.countDocuments({ reporterId: reporter }).exec(),
    ]);

    return {
      items: rows.map((row: any) => ({
        id: String(row._id),
        targetType: row.targetType,
        targetId: String(row.targetId),
        reason: row.reason,
        reasonLabel: REASON_LABELS[row.reason as ReportReason] ?? row.reason,
        // Reporters only learn whether their report was reviewed.
        status: OPEN_CASE_STATUSES.includes(row.status) ? "received" : "reviewed",
        targetLabel:
          row.targetType === ReportTargetType.POST
            ? `Post by @${row.evidence?.authorUsername ?? "user"}`
            : `@${row.evidence?.username ?? "user"}`,
        createdAt: row.createdAt,
      })),
      page: Math.max(1, page),
      limit: safeLimit,
      total,
      hasMore: skip + rows.length < total,
    };
  }

  /* ==========================================================================
     ACCOUNT OWNER: DECISIONS + APPEALS
  ========================================================================== */

  private serializeDecision(doc: any) {
    const decision = doc.decision ?? {};
    const appeal = doc.appeal ?? null;

    return {
      caseId: String(doc._id),
      targetType: doc.targetType,
      rule: decision.rule,
      ruleLabel: decision.ruleLabel,
      consequences: decision.consequences ?? [],
      restrictionUntil: decision.restrictionUntil ?? null,
      message: decision.userMessage ?? "",
      decidedAt: decision.decidedAt ?? null,
      reversed: Boolean(decision.reversedAt),
      reversedAt: decision.reversedAt ?? null,
      contentPreview:
        doc.targetType === ReportTargetType.POST ? String(doc.targetSnapshot?.content ?? "").slice(0, 280) : "",
      appeal: {
        status: doc.appealStatus ?? AppealStatus.NONE,
        message: appeal?.message ?? "",
        submittedAt: appeal?.submittedAt ?? null,
        reviewedAt: appeal?.reviewedAt ?? null,
        outcomeNote: appeal?.outcomeNote ?? null,
      },
      canAppeal: !decision.reversedAt && (doc.appealStatus ?? AppealStatus.NONE) === AppealStatus.NONE,
    };
  }

  /** Confirmed decisions about the signed-in user (no reporters, no notes). */
  async myDecisions(userId: string) {
    const docs = await this.caseModel
      .find({ reportedUserId: new Types.ObjectId(userId), "decision.outcome": "violation" })
      .sort({ "decision.decidedAt": -1 })
      .limit(100)
      .select("targetType targetSnapshot decision appeal appealStatus")
      .lean()
      .exec();

    return { items: docs.map((doc) => this.serializeDecision(doc)) };
  }

  async submitAppeal(userId: string, caseId: string, dto: SubmitAppealDto) {
    if (!Types.ObjectId.isValid(caseId)) {
      throw new BadRequestException("Invalid decision ID.");
    }

    const now = new Date();
    const updated = await this.caseModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(caseId),
          reportedUserId: new Types.ObjectId(userId),
          "decision.outcome": "violation",
          "decision.reversedAt": { $in: [null] },
          appealStatus: AppealStatus.NONE,
        },
        {
          $set: {
            appealStatus: AppealStatus.PENDING,
            appeal: { status: AppealStatus.PENDING, message: dto.message.trim(), submittedAt: now },
          },
          $push: { history: { action: "appeal_submitted", actorId: userId, at: now } },
        },
        { returnDocument: "after" },
      )
      .lean()
      .exec();

    if (!updated) {
      const exists = await this.caseModel
        .findOne({ _id: new Types.ObjectId(caseId), reportedUserId: new Types.ObjectId(userId), "decision.outcome": "violation" })
        .select("_id")
        .lean()
        .exec();

      if (!exists) throw new NotFoundException("Decision not found.");

      throw new ConflictException("This decision can no longer be appealed.");
    }

    await this.notifier.appealFiled(
      caseId,
      [updated.decision?.decidedBy ?? "", updated.assignedTo ? String(updated.assignedTo) : ""],
    );

    return { success: true, decision: this.serializeDecision(updated) };
  }

  /* exposed for tests */
  static readonly ALERT_RANK = ALERT_RANK;
}
