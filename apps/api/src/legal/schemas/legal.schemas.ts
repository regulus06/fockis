import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

/* ============================================================================
   Shared sub-documents
============================================================================ */

/** A file kept in restricted storage (never under a public prefix). */
@Schema({ _id: false })
export class StoredFile {
  @Prop({ type: String, required: true })
  key!: string;

  @Prop({ type: String, default: "" })
  name!: string;

  @Prop({ type: String, default: "application/octet-stream" })
  mimeType!: string;

  @Prop({ type: Number, default: 0 })
  size!: number;

  /** sha256 of the stored bytes, or "" when the file was too large to hash. */
  @Prop({ type: String, default: "" })
  sha256!: string;

  @Prop({ type: Date, default: () => new Date() })
  addedAt!: Date;

  @Prop({ type: String, default: "" })
  addedBy!: string;
}
export const StoredFileSchema = SchemaFactory.createForClass(StoredFile);

@Schema({ _id: false })
export class HistoryEntry {
  @Prop({ type: String, required: true })
  action!: string;

  @Prop({ type: String, default: "" })
  actorId!: string;

  @Prop({ type: String, default: "" })
  note!: string;

  @Prop({ type: Date, default: () => new Date() })
  at!: Date;
}
export const HistoryEntrySchema = SchemaFactory.createForClass(HistoryEntry);

/* ============================================================================
   Reference counters (LH-2026-0001 …)
============================================================================ */

@Schema({ collection: "legal_counters", versionKey: false })
export class LegalCounter {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ type: Number, default: 0 })
  seq!: number;
}
export const LegalCounterSchema = SchemaFactory.createForClass(LegalCounter);

/* ============================================================================
   Legal holds
   (model name "LegalHold"; post purge and account deletion look holds up by
   records.recordId and subjects.userId)
============================================================================ */

@Schema({ _id: false })
export class HoldRecord {
  @Prop({ type: String, required: true })
  recordType!: string;

  @Prop({ type: String, required: true })
  recordId!: string;
}
export const HoldRecordSchema = SchemaFactory.createForClass(HoldRecord);

@Schema({ _id: false })
export class HoldSubject {
  @Prop({ type: String, required: true })
  userId!: string;
}
export const HoldSubjectSchema = SchemaFactory.createForClass(HoldSubject);

@Schema({ collection: "legal_holds", timestamps: true })
export class LegalHold {
  @Prop({ type: String, required: true, unique: true })
  number!: string;

  @Prop({ type: String, required: true })
  caseReference!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  legalBasis!: string;

  @Prop({ type: String, default: "" })
  basisDetails!: string;

  /** What the hold covers, in words. */
  @Prop({ type: String, default: "" })
  scope!: string;

  /** Accounts covered by the hold: their content may not be deleted. */
  @Prop({ type: [HoldSubjectSchema], default: [] })
  subjects!: HoldSubject[];

  /** Individual records covered by the hold. */
  @Prop({ type: [HoldRecordSchema], default: [] })
  records!: HoldRecord[];

  @Prop({ type: String, enum: ["active", "released"], default: "active", index: true })
  status!: "active" | "released";

  @Prop({ type: Types.ObjectId, default: null })
  requestId!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reviewAt!: Date | null;

  @Prop({ type: Date, default: null })
  expiresAt!: Date | null;

  @Prop({ type: [StoredFileSchema], default: [] })
  documents!: StoredFile[];

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String, default: "" })
  releasedBy!: string;

  @Prop({ type: Date, default: null })
  releasedAt!: Date | null;

  @Prop({ type: String, default: "" })
  releaseReason!: string;

  @Prop({ type: [HistoryEntrySchema], default: [] })
  history!: HistoryEntry[];

  createdAt!: Date;
  updatedAt!: Date;
}
export type LegalHoldDocument = HydratedDocument<LegalHold>;
export const LegalHoldSchema = SchemaFactory.createForClass(LegalHold);
LegalHoldSchema.index({ status: 1, "subjects.userId": 1 });
LegalHoldSchema.index({ status: 1, "records.recordId": 1 });
LegalHoldSchema.index({ caseReference: 1 });

/* ============================================================================
   Legal requests
============================================================================ */

@Schema({ collection: "legal_requests", timestamps: true })
export class LegalRequest {
  @Prop({ type: String, required: true, unique: true })
  number!: string;

  @Prop({ type: String, required: true })
  authority!: string;

  @Prop({ type: String, default: "" })
  authorityContact!: string;

  @Prop({ type: String, required: true })
  requestType!: string;

  @Prop({ type: String, default: "" })
  legalBasis!: string;

  @Prop({ type: String, default: "" })
  jurisdiction!: string;

  @Prop({ type: String, required: true })
  requestedRecords!: string;

  /** Accounts the request names (internal IDs). */
  @Prop({ type: [String], default: [] })
  subjectUserIds!: string[];

  @Prop({ type: String, enum: ["pending", "verified", "rejected"], default: "pending", index: true })
  verificationStatus!: string;

  @Prop({ type: String, default: "" })
  verificationNote!: string;

  @Prop({ type: String, default: "" })
  verifiedBy!: string;

  @Prop({ type: Date, default: null })
  verifiedAt!: Date | null;

  @Prop({ type: String, enum: ["not_requested", "pending", "preserved"], default: "not_requested" })
  preservationStatus!: string;

  @Prop({ type: String, enum: ["pending", "approved", "partially_approved", "denied"], default: "pending", index: true })
  approvalStatus!: string;

  @Prop({ type: String, default: "" })
  approvalNote!: string;

  @Prop({ type: String, default: "" })
  approvedBy!: string;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: String, enum: ["open", "in_progress", "completed", "closed"], default: "open", index: true })
  completionStatus!: string;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;

  @Prop({ type: Date, default: null, index: true })
  responseDeadline!: Date | null;

  @Prop({ type: Date, default: () => new Date() })
  receivedAt!: Date;

  @Prop({ type: String, default: "" })
  assignedTo!: string;

  @Prop({ type: Types.ObjectId, default: null })
  holdId!: Types.ObjectId | null;

  @Prop({ type: [StoredFileSchema], default: [] })
  documents!: StoredFile[];

  @Prop({ type: String, default: "" })
  notes!: string;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: Date, default: null })
  anonymizedAt!: Date | null;

  @Prop({ type: [HistoryEntrySchema], default: [] })
  history!: HistoryEntry[];

  createdAt!: Date;
  updatedAt!: Date;
}
export type LegalRequestDocument = HydratedDocument<LegalRequest>;
export const LegalRequestSchema = SchemaFactory.createForClass(LegalRequest);
LegalRequestSchema.index({ createdAt: -1 });

/* ============================================================================
   Evidence records (preserved snapshots)
============================================================================ */

@Schema({ collection: "evidence_records", timestamps: true })
export class EvidenceRecord {
  @Prop({ type: String, required: true, unique: true })
  number!: string;

  @Prop({ type: String, required: true, index: true })
  recordType!: string;

  /** ID of the original record (post ID, account ID…). */
  @Prop({ type: String, required: true, index: true })
  recordId!: string;

  /** Internal account the record belongs to, when known. */
  @Prop({ type: String, default: "", index: true })
  userId!: string;

  /** Username at preservation time, for search. */
  @Prop({ type: String, default: "" })
  username!: string;

  @Prop({ type: Date, default: null })
  originalCreatedAt!: Date | null;

  @Prop({ type: Date, required: true })
  preservedAt!: Date;

  @Prop({ type: String, required: true })
  preservedBy!: string;

  @Prop({ type: String, required: true, index: true })
  caseReference!: string;

  @Prop({ type: Types.ObjectId, default: null, index: true })
  holdId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  requestId!: Types.ObjectId | null;

  @Prop({ type: String, default: "" })
  reason!: string;

  /** Copy of the record at preservation time. Never edited afterwards. */
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  snapshot!: Record<string, unknown>;

  /** sha256 of the canonical snapshot JSON. */
  @Prop({ type: String, required: true })
  snapshotHash!: string;

  /** Media copied into restricted storage. */
  @Prop({ type: [StoredFileSchema], default: [] })
  files!: StoredFile[];

  @Prop({ type: [String], default: [] })
  reportIds!: string[];

  @Prop({ type: String, enum: ["preserved", "expired"], default: "preserved", index: true })
  status!: "preserved" | "expired";

  @Prop({ type: Date, default: null })
  expiredAt!: Date | null;

  createdAt!: Date;
}
export type EvidenceRecordDocument = HydratedDocument<EvidenceRecord>;
export const EvidenceRecordSchema = SchemaFactory.createForClass(EvidenceRecord);
EvidenceRecordSchema.index({ preservedAt: -1 });
EvidenceRecordSchema.index({ username: 1 });
// Preserved snapshots can't be edited; only the retention job may expire them.
for (const op of ["updateMany", "replaceOne", "findOneAndReplace"] as const) {
  EvidenceRecordSchema.pre(op, function () {
    throw new Error("Preserved evidence can't be modified.");
  });
}

/* ============================================================================
   Evidence exports
============================================================================ */

@Schema({ collection: "evidence_exports", timestamps: true })
export class EvidenceExport {
  @Prop({ type: String, required: true, unique: true })
  number!: string;

  @Prop({ type: String, required: true, index: true })
  caseReference!: string;

  @Prop({ type: Types.ObjectId, default: null })
  holdId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  requestId!: Types.ObjectId | null;

  @Prop({ type: [String], default: [] })
  recordNumbers!: string[];

  @Prop({ type: String, required: true })
  reason!: string;

  @Prop({ type: String, default: "" })
  packageKey!: string;

  @Prop({ type: String, default: "" })
  packageSha256!: string;

  @Prop({ type: Number, default: 0 })
  packageBytes!: number;

  @Prop({ type: String, required: true })
  exportedBy!: string;

  @Prop({ type: Date, required: true })
  exportedAt!: Date;

  @Prop({ type: Number, default: 0 })
  downloads!: number;

  @Prop({ type: Date, default: null })
  packageRemovedAt!: Date | null;

  createdAt!: Date;
}
export type EvidenceExportDocument = HydratedDocument<EvidenceExport>;
export const EvidenceExportSchema = SchemaFactory.createForClass(EvidenceExport);
EvidenceExportSchema.index({ exportedAt: -1 });

/* ============================================================================
   Evidence access log (append-only, hash-chained)
============================================================================ */

@Schema({ collection: "evidence_access_logs", timestamps: false, versionKey: false })
export class EvidenceAccessLog {
  @Prop({ type: Number, required: true, unique: true })
  seq!: number;

  @Prop({ type: String, required: true, index: true })
  actorId!: string;

  @Prop({ type: String, required: true, index: true })
  action!: string;

  /** e.g. evidence_record, legal_hold, legal_request, evidence_export, retention_policy, account_deletion */
  @Prop({ type: String, required: true })
  targetType!: string;

  @Prop({ type: String, default: "", index: true })
  targetId!: string;

  @Prop({ type: String, default: "" })
  targetLabel!: string;

  @Prop({ type: String, default: "" })
  reason!: string;

  @Prop({ type: String, default: "", index: true })
  caseReference!: string;

  @Prop({ type: String, default: "" })
  holdNumber!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata!: Record<string, unknown>;

  @Prop({ type: Date, required: true, index: true })
  at!: Date;

  @Prop({ type: String, default: "" })
  prevHash!: string;

  @Prop({ type: String, required: true })
  hash!: string;
}
export type EvidenceAccessLogDocument = HydratedDocument<EvidenceAccessLog>;
export const EvidenceAccessLogSchema = SchemaFactory.createForClass(EvidenceAccessLog);
for (const op of ["updateOne", "updateMany", "findOneAndUpdate", "replaceOne", "deleteOne", "deleteMany", "findOneAndDelete"] as const) {
  EvidenceAccessLogSchema.pre(op, function () {
    throw new Error("The evidence access log is append-only.");
  });
}

/* ============================================================================
   Retention policies
============================================================================ */

@Schema({ _id: false })
export class RetentionChange {
  @Prop({ type: Date, default: () => new Date() })
  at!: Date;

  @Prop({ type: String, default: "" })
  by!: string;

  @Prop({ type: String, default: "" })
  changes!: string;

  @Prop({ type: String, default: "" })
  reason!: string;
}
export const RetentionChangeSchema = SchemaFactory.createForClass(RetentionChange);

/**
 * One rule per record category and jurisdiction ("global" is the default
 * the automated job uses). A rule without a period never deletes anything.
 */
@Schema({ collection: "retention_policies", timestamps: true })
export class RetentionPolicy {
  @Prop({ type: String, required: true })
  recordType!: string;

  @Prop({ type: String, default: "global" })
  jurisdiction!: string;

  @Prop({ type: String, required: true })
  label!: string;

  /** null = not configured yet. Never pre-filled with an invented period. */
  @Prop({ type: Number, default: null, min: 1 })
  retentionDays!: number | null;

  @Prop({ type: String, enum: ["delete", "anonymize"], required: true })
  action!: "delete" | "anonymize";

  /** Applied by the job (only for automated categories with a period). */
  @Prop({ type: Boolean, default: false })
  enabled!: boolean;

  @Prop({ type: Boolean, default: false })
  automated!: boolean;

  @Prop({ type: String, default: "needs_configuration" })
  status!: string;

  @Prop({ type: String, default: "" })
  description!: string;

  @Prop({ type: String, default: "" })
  purpose!: string;

  @Prop({ type: String, default: "" })
  legalBasis!: string;

  @Prop({ type: String, default: "" })
  responsibleRole!: string;

  @Prop({ type: Date, default: null })
  effectiveDate!: Date | null;

  @Prop({ type: Date, default: null })
  nextReviewAt!: Date | null;

  @Prop({ type: String, default: "" })
  updatedBy!: string;

  @Prop({ type: Date, default: null })
  lastRunAt!: Date | null;

  @Prop({ type: Number, default: 0 })
  lastRunAffected!: number;

  /** Manual-review categories: how many records the last run flagged. */
  @Prop({ type: String, default: "" })
  lastRunNote!: string;

  @Prop({ type: [RetentionChangeSchema], default: [] })
  history!: RetentionChange[];

  updatedAt!: Date;
}
export type RetentionPolicyDocument = HydratedDocument<RetentionPolicy>;
export const RetentionPolicySchema = SchemaFactory.createForClass(RetentionPolicy);
RetentionPolicySchema.index({ recordType: 1, jurisdiction: 1 }, { unique: true });

/* ============================================================================
   Account deletions (minimal register)
============================================================================ */

@Schema({ collection: "account_deletions", timestamps: true })
export class AccountDeletion {
  @Prop({ type: String, required: true, unique: true })
  number!: string;

  /** Internal account ID; cleared when the record is anonymized. */
  @Prop({ type: String, default: "", index: true })
  userId!: string;

  @Prop({ type: String, enum: ["user", "admin"], required: true })
  source!: "user" | "admin";

  @Prop({ type: String, default: "" })
  requestedBy!: string;

  @Prop({ type: Date, required: true })
  requestedAt!: Date;

  @Prop({ type: String, enum: ["requested", "processing", "completed", "completed_with_hold", "failed"], default: "requested", index: true })
  status!: string;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;

  /** Holds that stopped some records from being deleted. */
  @Prop({ type: [String], default: [] })
  holdNumbers!: string[];

  /** Counts only — never content. */
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  summary!: Record<string, number>;

  @Prop({ type: String, default: "" })
  error!: string;

  @Prop({ type: Date, default: null })
  anonymizedAt!: Date | null;

  createdAt!: Date;
}
export type AccountDeletionDocument = HydratedDocument<AccountDeletion>;
export const AccountDeletionSchema = SchemaFactory.createForClass(AccountDeletion);
AccountDeletionSchema.index({ requestedAt: -1 });
