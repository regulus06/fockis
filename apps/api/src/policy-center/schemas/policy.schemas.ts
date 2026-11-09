import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

/* ============================================================================
   Policies and versions (shared by the user Policy Center and the Admin
   Center). A policy row describes the policy; its text lives in versions.
   Published versions are never edited: every change is a new version.
============================================================================ */

@Schema({ _id: false })
export class PolicySection {
  @Prop({ type: String, default: "" })
  heading!: string;

  /** Plain text with light formatting: "- " bullets, "1. " numbers, **bold**. */
  @Prop({ type: String, default: "" })
  body!: string;
}
export const PolicySectionSchema = SchemaFactory.createForClass(PolicySection);

@Schema({ _id: false })
export class PolicyDocumentRef {
  @Prop({ type: String, required: true })
  label!: string;

  /** A Fockis path or https link to a supporting document. */
  @Prop({ type: String, required: true })
  url!: string;
}
export const PolicyDocumentRefSchema = SchemaFactory.createForClass(PolicyDocumentRef);

@Schema({ collection: "policies", timestamps: true })
export class Policy {
  @Prop({ type: String, required: true, unique: true })
  slug!: string;

  /** Old public URLs that still open this policy (e.g. shop-advertising). */
  @Prop({ type: [String], default: [], index: true })
  legacySlugs!: string[];

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true, index: true })
  category!: string;

  @Prop({ type: String, default: "" })
  description!: string;

  @Prop({ type: String, default: "everyone" })
  audience!: string;

  @Prop({ type: Boolean, default: false })
  requiredAcceptance!: boolean;

  /** Overall status (drives the library and what users can see). */
  @Prop({ type: String, default: "draft", index: true })
  status!: string;

  /** The version users see (null until first publication). */
  @Prop({ type: Types.ObjectId, default: null })
  publishedVersionId!: Types.ObjectId | null;

  @Prop({ type: String, default: "" })
  publishedVersion!: string;

  @Prop({ type: Date, default: null })
  publishedAt!: Date | null;

  @Prop({ type: Date, default: null })
  effectiveDate!: Date | null;

  /** The version admins are working on, if any. */
  @Prop({ type: Types.ObjectId, default: null })
  workingVersionId!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reviewDate!: Date | null;

  @Prop({ type: Number, default: 100 })
  order!: number;

  @Prop({ type: [PolicyDocumentRefSchema], default: [] })
  documents!: PolicyDocumentRef[];

  @Prop({ type: String, default: "" })
  createdBy!: string;

  @Prop({ type: String, default: "" })
  updatedBy!: string;

  @Prop({ type: Date, default: null })
  archivedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}
export type PolicyDocument = HydratedDocument<Policy>;
export const PolicySchema = SchemaFactory.createForClass(Policy);
PolicySchema.index({ status: 1, order: 1 });

@Schema({ _id: false })
export class ReviewEntry {
  @Prop({ type: String, required: true })
  action!: string;

  @Prop({ type: String, default: "" })
  actorId!: string;

  /** Internal note — never shown to users. */
  @Prop({ type: String, default: "" })
  note!: string;

  @Prop({ type: Date, default: () => new Date() })
  at!: Date;
}
export const ReviewEntrySchema = SchemaFactory.createForClass(ReviewEntry);

@Schema({ collection: "policy_versions", timestamps: true })
export class PolicyVersion {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  policyId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  version!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, default: "" })
  description!: string;

  @Prop({ type: [PolicySectionSchema], default: [] })
  sections!: PolicySection[];

  @Prop({ type: String, default: "" })
  changeSummary!: string;

  @Prop({ type: String, required: true, index: true })
  status!: string;

  @Prop({ type: Boolean, default: false })
  requiredAcceptance!: boolean;

  @Prop({ type: Date, default: null })
  effectiveDate!: Date | null;

  @Prop({ type: Date, default: null, index: true })
  scheduledFor!: Date | null;

  @Prop({ type: Date, default: null })
  approvalDeadline!: Date | null;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String, default: "" })
  submittedBy!: string;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  @Prop({ type: String, default: "" })
  approvedBy!: string;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: String, default: "" })
  rejectedBy!: string;

  @Prop({ type: Date, default: null })
  rejectedAt!: Date | null;

  @Prop({ type: String, default: "" })
  publishedBy!: string;

  @Prop({ type: Date, default: null })
  publishedAt!: Date | null;

  @Prop({ type: Date, default: null })
  supersededAt!: Date | null;

  /** Version this one was restored from, if any. */
  @Prop({ type: String, default: "" })
  restoredFrom!: string;

  @Prop({ type: [ReviewEntrySchema], default: [] })
  review!: ReviewEntry[];

  createdAt!: Date;
  updatedAt!: Date;
}
export type PolicyVersionDocument = HydratedDocument<PolicyVersion>;
export const PolicyVersionSchema = SchemaFactory.createForClass(PolicyVersion);
PolicyVersionSchema.index({ policyId: 1, version: 1 }, { unique: true });
PolicyVersionSchema.index({ status: 1, submittedAt: -1 });

/* ============================================================================
   Operational rules
============================================================================ */

@Schema({ _id: false })
export class RuleRevision {
  @Prop({ type: Number, required: true })
  version!: number;

  @Prop({ type: String, default: "" })
  content!: string;

  @Prop({ type: String, default: "" })
  changeSummary!: string;

  @Prop({ type: String, default: "" })
  publishedBy!: string;

  @Prop({ type: Date, default: null })
  publishedAt!: Date | null;
}
export const RuleRevisionSchema = SchemaFactory.createForClass(RuleRevision);

@Schema({ collection: "operational_rules", timestamps: true })
export class OperationalRule {
  @Prop({ type: String, required: true, unique: true })
  slug!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, default: "" })
  description!: string;

  @Prop({ type: String, required: true })
  category!: string;

  @Prop({ type: String, required: true, index: true })
  module!: string;

  /** Draft text being edited. */
  @Prop({ type: String, default: "" })
  content!: string;

  @Prop({ type: String, default: "" })
  changeSummary!: string;

  @Prop({ type: String, default: "draft", index: true })
  status!: string;

  /** Published revision number (0 = never published). */
  @Prop({ type: Number, default: 0 })
  version!: number;

  @Prop({ type: Date, default: null })
  effectiveDate!: Date | null;

  /** How the rule is applied. Rules never change authorization or business logic on their own. */
  @Prop({ type: String, default: "informational" })
  enforcement!: string;

  @Prop({ type: String, default: "" })
  enforcementNotes!: string;

  @Prop({ type: [RuleRevisionSchema], default: [] })
  revisions!: RuleRevision[];

  @Prop({ type: [ReviewEntrySchema], default: [] })
  review!: ReviewEntry[];

  @Prop({ type: String, default: "" })
  createdBy!: string;

  @Prop({ type: String, default: "" })
  submittedBy!: string;

  createdAt!: Date;
  updatedAt!: Date;
}
export type OperationalRuleDocument = HydratedDocument<OperationalRule>;
export const OperationalRuleSchema = SchemaFactory.createForClass(OperationalRule);

/* ============================================================================
   Acceptance records
============================================================================ */

@Schema({ collection: "policy_acceptances", timestamps: false, versionKey: false })
export class PolicyAcceptance {
  @Prop({ type: String, required: true, index: true })
  userId!: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  policyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  versionId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  slug!: string;

  @Prop({ type: String, required: true })
  version!: string;

  @Prop({ type: Date, required: true, index: true })
  acceptedAt!: Date;

  /** registration | policy_center | update_prompt */
  @Prop({ type: String, required: true })
  source!: string;

  @Prop({ type: String, default: "required_policy" })
  consentType!: string;

  /** Only when collected lawfully (e.g. country chosen at sign-up). */
  @Prop({ type: String, default: "" })
  jurisdiction!: string;
}
export type PolicyAcceptanceDocument = HydratedDocument<PolicyAcceptance>;
export const PolicyAcceptanceSchema = SchemaFactory.createForClass(PolicyAcceptance);
PolicyAcceptanceSchema.index({ userId: 1, versionId: 1 }, { unique: true });
PolicyAcceptanceSchema.index({ policyId: 1, acceptedAt: -1 });

/* ============================================================================
   Audit events (append-only, hash-chained)
============================================================================ */

@Schema({ collection: "policy_audit_events", timestamps: false, versionKey: false })
export class PolicyAuditEvent {
  @Prop({ type: Number, required: true, unique: true })
  seq!: number;

  @Prop({ type: String, required: true, index: true })
  actorId!: string;

  @Prop({ type: String, default: "" })
  actorRole!: string;

  @Prop({ type: String, required: true, index: true })
  action!: string;

  @Prop({ type: String, required: true })
  targetType!: string;

  @Prop({ type: String, default: "", index: true })
  targetId!: string;

  @Prop({ type: String, default: "" })
  targetLabel!: string;

  @Prop({ type: String, default: "" })
  summary!: string;

  /** e.g. { ip, userAgent } — never passwords, tokens or payment data. */
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  context!: Record<string, unknown>;

  @Prop({ type: Boolean, default: false, index: true })
  sensitive!: boolean;

  @Prop({ type: Date, required: true, index: true })
  at!: Date;

  @Prop({ type: String, default: "" })
  prevHash!: string;

  @Prop({ type: String, required: true })
  hash!: string;
}
export type PolicyAuditEventDocument = HydratedDocument<PolicyAuditEvent>;
export const PolicyAuditEventSchema = SchemaFactory.createForClass(PolicyAuditEvent);
for (const op of ["updateOne", "updateMany", "findOneAndUpdate", "replaceOne", "deleteOne", "deleteMany", "findOneAndDelete"] as const) {
  PolicyAuditEventSchema.pre(op, function () {
    throw new Error("The policy audit log is append-only.");
  });
}

/* ============================================================================
   Admin settings (single document)
============================================================================ */

@Schema({ collection: "policy_settings", timestamps: true })
export class PolicySettings {
  @Prop({ type: String, required: true, unique: true, default: "global" })
  key!: string;

  @Prop({ type: Number, default: 365 })
  defaultReviewDays!: number;

  /** Approver must be someone other than the submitter (super admins exempt). */
  @Prop({ type: Boolean, default: true })
  requireIndependentApproval!: boolean;

  @Prop({ type: Number, default: 7 })
  approvalDeadlineDays!: number;

  /** In-app notification to users when a required policy changes. */
  @Prop({ type: Boolean, default: true })
  notifyUsersOnRequiredUpdate!: boolean;

  /** Notify policy staff when something is submitted for approval. */
  @Prop({ type: Boolean, default: true })
  notifyApprovers!: boolean;

  /** Days users have to accept an updated required policy before it is flagged. */
  @Prop({ type: Number, default: 30 })
  acceptanceGraceDays!: number;

  @Prop({ type: String, default: "" })
  updatedBy!: string;
}
export type PolicySettingsDocument = HydratedDocument<PolicySettings>;
export const PolicySettingsSchema = SchemaFactory.createForClass(PolicySettings);

/* ============================================================================
   User privacy, consent, data requests, activity
============================================================================ */

@Schema({ collection: "user_privacy_settings", timestamps: true })
export class UserPrivacySettings {
  @Prop({ type: String, required: true, unique: true })
  userId!: string;

  @Prop({ type: String, default: "everyone" })
  messaging!: string;

  @Prop({ type: String, default: "everyone" })
  comments!: string;

  /** Appear in people search. */
  @Prop({ type: Boolean, default: true })
  searchable!: boolean;

  /** Muted accounts: their posts are left out of this user's feed. */
  @Prop({ type: [String], default: [] })
  mutedUserIds!: string[];

  updatedAt!: Date;
}
export type UserPrivacySettingsDocument = HydratedDocument<UserPrivacySettings>;
export const UserPrivacySettingsSchema = SchemaFactory.createForClass(UserPrivacySettings);

@Schema({ collection: "user_consents", timestamps: true })
export class UserConsent {
  @Prop({ type: String, required: true, unique: true })
  userId!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  choices!: Record<string, boolean>;

  @Prop({ type: String, default: "" })
  consentVersion!: string;

  updatedAt!: Date;
}
export type UserConsentDocument = HydratedDocument<UserConsent>;
export const UserConsentSchema = SchemaFactory.createForClass(UserConsent);

@Schema({ collection: "user_consent_events", timestamps: false, versionKey: false })
export class UserConsentEvent {
  @Prop({ type: String, required: true, index: true })
  userId!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  changes!: Record<string, boolean>;

  @Prop({ type: String, required: true })
  consentVersion!: string;

  @Prop({ type: Date, required: true })
  at!: Date;
}
export type UserConsentEventDocument = HydratedDocument<UserConsentEvent>;
export const UserConsentEventSchema = SchemaFactory.createForClass(UserConsentEvent);

@Schema({ collection: "user_data_requests", timestamps: true })
export class UserDataRequest {
  @Prop({ type: String, required: true, unique: true })
  number!: string;

  @Prop({ type: String, required: true, index: true })
  userId!: string;

  @Prop({ type: String, required: true })
  type!: string;

  @Prop({ type: String, default: "pending", index: true })
  status!: string;

  /** Correction: which field and what should change. */
  @Prop({ type: String, default: "" })
  field!: string;

  @Prop({ type: String, default: "" })
  details!: string;

  /** Message shown to the user (e.g. why a correction was declined). */
  @Prop({ type: String, default: "" })
  response!: string;

  /** Restricted storage key of the export file. */
  @Prop({ type: String, default: "" })
  fileKey!: string;

  @Prop({ type: Number, default: 0 })
  fileBytes!: number;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;

  @Prop({ type: Date, default: null })
  expiresAt!: Date | null;

  @Prop({ type: String, default: "" })
  handledBy!: string;

  createdAt!: Date;
  updatedAt!: Date;
}
export type UserDataRequestDocument = HydratedDocument<UserDataRequest>;
export const UserDataRequestSchema = SchemaFactory.createForClass(UserDataRequest);
UserDataRequestSchema.index({ type: 1, status: 1, createdAt: -1 });

@Schema({ collection: "user_policy_activity", timestamps: false, versionKey: false })
export class UserPolicyActivity {
  @Prop({ type: String, required: true, index: true })
  userId!: string;

  @Prop({ type: String, required: true })
  type!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, default: "" })
  description!: string;

  @Prop({ type: Date, required: true, index: true })
  at!: Date;
}
export type UserPolicyActivityDocument = HydratedDocument<UserPolicyActivity>;
export const UserPolicyActivitySchema = SchemaFactory.createForClass(UserPolicyActivity);
UserPolicyActivitySchema.index({ userId: 1, at: -1 });
