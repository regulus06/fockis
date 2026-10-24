import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

import {
  CasePriority,
  CaseStatus,
  DESCRIPTION_MAX,
  ReportReason,
  ReportTargetType,
} from "../reports.constants";

export type ReportDocument = HydratedDocument<Report>;

/**
 * One user's report about one post or account.
 *
 * Model name "Report" is deliberate: the existing admin
 * UserReportsService (admin/users/reports) already reads a model with this
 * name and the fields reportedUserId / type / reason / description /
 * status / priority, so the user-details "Reports" tab works unchanged.
 *
 * Duplicate policy: a reporter can hold ONE open report per target. That
 * is enforced by the unique index on (reporterId, targetType, targetId,
 * dedupeKey): dedupeKey is "open" while the case is open and is set to the
 * report's own id when the case closes, so the reporter may report the
 * same target again after a decision.
 */
@Schema({ collection: "reports", timestamps: true, versionKey: false })
export class Report {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
  reporterId!: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(ReportTargetType), required: true })
  targetType!: ReportTargetType;

  /** Alias of targetType for the existing admin reports tab. */
  @Prop({ type: String, enum: Object.values(ReportTargetType), required: true })
  type!: ReportTargetType;

  /** Post id for post reports, user id for account reports. */
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  targetId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  postId?: Types.ObjectId | null;

  /** Owner of the reported post, or the reported account. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
  reportedUserId!: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(ReportReason), required: true })
  reason!: ReportReason;

  @Prop({ type: String, default: "", trim: true, maxlength: DESCRIPTION_MAX })
  description!: string;

  /**
   * What the reporter saw, captured at submission time so the evidence
   * survives later edits or deletion.
   */
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  evidence!: Record<string, unknown>;

  @Prop({ type: String, enum: Object.values(CaseStatus), default: CaseStatus.PENDING })
  status!: CaseStatus;

  @Prop({ type: String, enum: Object.values(CasePriority), default: CasePriority.LOW })
  priority!: CasePriority;

  /** False when a moderator marks the report invalid (stops counting). */
  @Prop({ type: Boolean, default: true })
  eligible!: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "ModerationCase", default: null })
  caseId?: Types.ObjectId | null;

  @Prop({ type: String, required: true, default: "open" })
  dedupeKey!: string;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

ReportSchema.index(
  { reporterId: 1, targetType: 1, targetId: 1, dedupeKey: 1 },
  { unique: true, name: "report_one_open_per_reporter_target" },
);
ReportSchema.index({ caseId: 1, createdAt: -1 });
ReportSchema.index({ reportedUserId: 1, createdAt: -1 });
ReportSchema.index({ reporterId: 1, createdAt: -1 });
ReportSchema.index({ status: 1, createdAt: -1 });
