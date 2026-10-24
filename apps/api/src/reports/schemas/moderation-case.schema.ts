import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

import {
  AlertLevel,
  AppealStatus,
  CasePriority,
  CaseStatus,
  ModerationConsequence,
  ReportTargetType,
} from "../reports.constants";

export type ModerationCaseDocument = HydratedDocument<ModerationCase>;

/**
 * All open reports about one target are grouped into one case. Counters
 * are maintained with atomic $inc; alert levels only move up via a
 * conditional update, so concurrent reports cannot double-notify.
 *
 * openKey is "open" while the case is open (unique per target) and the
 * case id once it is resolved or dismissed; a later report then opens a
 * new case and the history of old ones is kept.
 */
@Schema({ collection: "moderation_cases", timestamps: true, versionKey: false })
export class ModerationCase {
  @Prop({ type: String, enum: Object.values(ReportTargetType), required: true })
  targetType!: ReportTargetType;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  targetId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  postId?: Types.ObjectId | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
  reportedUserId!: Types.ObjectId;

  @Prop({ type: String, required: true, default: "open" })
  openKey!: string;

  @Prop({ type: String, enum: Object.values(CaseStatus), default: CaseStatus.PENDING })
  status!: CaseStatus;

  @Prop({ type: String, enum: Object.values(CasePriority), default: CasePriority.LOW })
  priority!: CasePriority;

  @Prop({ type: Number, default: 0 })
  priorityRank!: number;

  @Prop({ type: String, enum: Object.values(AlertLevel), default: AlertLevel.NONE })
  alertLevel!: AlertLevel;

  @Prop({ type: Number, default: 0 })
  alertRank!: number;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  alertHistory!: Array<{ level: AlertLevel; reason: string; at: Date }>;

  /** Unique reporters whose reports are still eligible. */
  @Prop({ type: Number })
  eligibleReporterCount!: number;

  /** All reports ever attached (including ones later marked invalid). */
  @Prop({ type: Number })
  totalReportCount!: number;

  /** Eligible reports with an urgent reason. */
  @Prop({ type: Number })
  urgentReportCount!: number;

  @Prop({ type: MongooseSchema.Types.Mixed })
  reasonCounts!: Record<string, number>;

  @Prop({ type: String, default: "" })
  topReason!: string;

  @Prop({ type: Date, default: null })
  firstReportAt?: Date | null;

  @Prop({ type: Date, default: null })
  latestReportAt?: Date | null;

  /** Latest snapshot of the target (post text/media or account profile). */
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  targetSnapshot!: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", default: null })
  assignedTo?: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  assignedAt?: Date | null;

  /** Internal moderator notes. Never returned by user-facing endpoints. */
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  notes!: Array<{ id: string; authorId: string; body: string; at: Date }>;

  /** Case audit trail (who did what, when and why). */
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  history!: Array<{
    action: string;
    actorId: string | null;
    from?: string;
    to?: string;
    reason?: string;
    at: Date;
    metadata?: Record<string, unknown>;
  }>;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  decision?: {
    outcome: "violation" | "no_violation";
    rule: string;
    ruleLabel: string;
    consequences: ModerationConsequence[];
    restrictionUntil: Date | null;
    userMessage: string;
    reason: string;
    decidedBy: string;
    decidedAt: Date;
    userNotified: boolean;
    reversedAt?: Date | null;
    reversedBy?: string | null;
    reversalReason?: string | null;
  } | null;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  appeal?: {
    status: AppealStatus;
    message: string;
    submittedAt: Date;
    reviewedBy?: string | null;
    reviewedAt?: Date | null;
    outcomeNote?: string | null;
  } | null;

  @Prop({ type: String, enum: Object.values(AppealStatus), default: AppealStatus.NONE })
  appealStatus!: AppealStatus;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  resolution?: { reason: string; resolvedBy: string; resolvedAt: Date } | null;
}

export const ModerationCaseSchema = SchemaFactory.createForClass(ModerationCase);

ModerationCaseSchema.index(
  { targetType: 1, targetId: 1, openKey: 1 },
  { unique: true, name: "case_one_open_per_target" },
);
ModerationCaseSchema.index({ status: 1, priorityRank: -1, latestReportAt: -1 });
ModerationCaseSchema.index({ reportedUserId: 1, createdAt: -1 });
ModerationCaseSchema.index({ assignedTo: 1, status: 1 });
ModerationCaseSchema.index({ appealStatus: 1, updatedAt: -1 });
ModerationCaseSchema.index({ topReason: 1, status: 1 });
