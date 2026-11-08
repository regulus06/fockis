import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  SchemaTypes,
  Types,
} from "mongoose";

/**
 * EMPLOYER COMPANY
 *
 * One record per employer account (the user who owns the jobs).
 * Holds the public company profile plus private Employer Center
 * data: verification, team, saved candidates, settings and plan.
 */
export type EmployerCompanyDocument =
  HydratedDocument<EmployerCompany>;

export const EMPLOYER_TEAM_ROLES = [
  "admin",
  "recruiter",
  "hiring_manager",
] as const;

export type EmployerTeamRole =
  (typeof EMPLOYER_TEAM_ROLES)[number];

export type EmployerRole = "owner" | EmployerTeamRole;

export const VERIFICATION_STATUSES = [
  "not_submitted",
  "pending",
  "approved",
  "rejected",
] as const;

export type VerificationStatus =
  (typeof VERIFICATION_STATUSES)[number];

@Schema({ _id: false })
export class CompanySocialLinks {
  @Prop({ type: String, trim: true, maxlength: 2048 })
  linkedin?: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  x?: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  facebook?: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  instagram?: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  youtube?: string;
}

@Schema()
export class CompanyMediaItem {
  @Prop({ type: String, required: true, trim: true, maxlength: 2048 })
  url!: string;

  @Prop({ type: String, trim: true, maxlength: 300 })
  caption?: string;

  @Prop({ type: Date, default: () => new Date() })
  addedAt!: Date;
}

@Schema({ _id: false })
export class VerificationDocumentRef {
  @Prop({ type: String, required: true, trim: true, maxlength: 255 })
  name!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 2048 })
  url!: string;
}

@Schema({ _id: false })
export class CompanyVerification {
  @Prop({
    type: String,
    enum: VERIFICATION_STATUSES,
    default: "not_submitted",
  })
  status!: VerificationStatus;

  @Prop({ type: String, trim: true, maxlength: 200 })
  legalName?: string;

  @Prop({ type: String, trim: true, lowercase: true, maxlength: 254 })
  businessEmail?: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  website?: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  registrationNumber?: string;

  @Prop({ type: [VerificationDocumentRef], default: [] })
  documents!: VerificationDocumentRef[];

  @Prop({ type: Date })
  submittedAt?: Date;

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop({ type: String, trim: true, maxlength: 2000 })
  reviewerNote?: string;
}

@Schema({ _id: false })
export class VerificationHistoryEntry {
  @Prop({ type: String, required: true })
  status!: string;

  @Prop({ type: String, trim: true, maxlength: 2000 })
  note?: string;

  @Prop({ type: Date, required: true })
  at!: Date;
}

@Schema()
export class EmployerTeamMember {
  @Prop({ type: String, required: true, trim: true, lowercase: true, maxlength: 254 })
  email!: string;

  @Prop({ type: String, trim: true, maxlength: 150 })
  name?: string;

  @Prop({ type: String, enum: EMPLOYER_TEAM_ROLES, required: true })
  role!: EmployerTeamRole;

  @Prop({ type: String, enum: ["invited", "active"], default: "invited" })
  status!: "invited" | "active";

  @Prop({ type: Types.ObjectId, ref: "User" })
  userId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  invitedBy!: Types.ObjectId;

  @Prop({ type: Date, default: () => new Date() })
  invitedAt!: Date;

  @Prop({ type: Date })
  joinedAt?: Date;
}

@Schema({ _id: false })
export class EmployerNotificationSettings {
  @Prop({ type: Boolean, default: true })
  newApplications!: boolean;

  @Prop({ type: Boolean, default: true })
  applicationStatusChanges!: boolean;

  @Prop({ type: Boolean, default: true })
  interviewReminders!: boolean;

  @Prop({ type: Boolean, default: false })
  weeklySummary!: boolean;

  @Prop({ type: Boolean, default: false })
  productUpdates!: boolean;
}

@Schema({ _id: false })
export class EmployerSettings {
  @Prop({ type: String, trim: true, maxlength: 100, default: "UTC" })
  timezone!: string;

  @Prop({ type: String, trim: true, lowercase: true, maxlength: 254 })
  contactEmail?: string;

  @Prop({ type: EmployerNotificationSettings, default: () => ({}) })
  notifications!: EmployerNotificationSettings;
}

@Schema({ _id: false })
export class UpgradeRequest {
  @Prop({ type: String, required: true, trim: true, maxlength: 50 })
  plan!: string;

  @Prop({ type: String, enum: ["requested", "cancelled"], default: "requested" })
  status!: "requested" | "cancelled";

  @Prop({ type: Date, required: true })
  requestedAt!: Date;

  @Prop({ type: Date })
  cancelledAt?: Date;
}

@Schema({ _id: false })
export class EmployerBillingState {
  /**
   * No payment provider is wired to employer plans yet,
   * so every company starts (and stays) on "free" until
   * Fockis staff change it.
   */
  @Prop({ type: String, default: "free", trim: true, maxlength: 50 })
  plan!: string;

  @Prop({ type: [UpgradeRequest], default: [] })
  upgradeRequests!: UpgradeRequest[];

  // ---------------------------------------------------------------- paid plans
  // Prices and limits are set by Fockis admins (EmployerPlanSettings).

  /** The plan is paid up to this moment (paid plans only). */
  @Prop({ type: Date })
  paidUntil?: Date;

  /** Fockis admins gave this employer its plan without payment. */
  @Prop({ type: Boolean, default: false })
  exempt!: boolean;

  @Prop({ type: String, trim: true, maxlength: 500 })
  exemptReason?: string;

  /** Prices quoted to the employer; a payment must match one of these. */
  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  quotes!: EmployerPlanQuote[];

  /** Payments, admin-recorded payments and plan changes. */
  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  entries!: EmployerBillingEntry[];
}

export interface EmployerPlanQuote {
  referenceId: string;
  plan: string;
  amount: number;
  currency: string;
  periodMonths: number;
  createdAt: Date;
}

export interface EmployerBillingEntry {
  method: "stripe" | "manual" | "plan_change" | "exempt" | "unexempt" | "cleared";
  plan?: string;
  amount?: number;
  currency?: string;
  from?: Date;
  to?: Date;
  paymentIntentId?: string;
  paymentId?: string;
  referenceId?: string;
  note?: string;
  byName?: string;
  at: Date;
}

/** Fockis admin actions on an employer (approve, reject, block…). */
@Schema({ _id: false })
export class EmployerAdminAction {
  @Prop({ type: String, required: true })
  action!: string;

  @Prop({ type: String, trim: true, maxlength: 2000 })
  reason?: string;

  @Prop({ type: String, trim: true, maxlength: 200 })
  byName?: string;

  @Prop({ type: Date, required: true })
  at!: Date;
}

@Schema({
  timestamps: true,
  collection: "employer_companies",
})
export class EmployerCompany {
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  })
  ownerId!: Types.ObjectId;

  @Prop({ type: String, trim: true, maxlength: 150, default: "" })
  companyName!: string;

  @Prop({ type: String, trim: true, maxlength: 120 })
  industry?: string;

  @Prop({ type: String, trim: true, maxlength: 50 })
  companySize?: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  website?: string;

  @Prop({ type: Number, min: 1800, max: 2100 })
  foundedYear?: number;

  @Prop({ type: String, trim: true, maxlength: 100 })
  country?: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  city?: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  stateProvince?: string;

  @Prop({ type: String, trim: true, maxlength: 300 })
  tagline?: string;

  @Prop({ type: String, trim: true, maxlength: 5000 })
  about?: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  logoUrl?: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  coverImageUrl?: string;

  @Prop({ type: CompanySocialLinks, default: () => ({}) })
  socialLinks!: CompanySocialLinks;

  @Prop({ type: [CompanyMediaItem], default: [] })
  media!: (CompanyMediaItem & { _id: Types.ObjectId })[];

  @Prop({ type: CompanyVerification, default: () => ({}) })
  verification!: CompanyVerification;

  @Prop({ type: [VerificationHistoryEntry], default: [] })
  verificationHistory!: VerificationHistoryEntry[];

  @Prop({ type: [EmployerTeamMember], default: [] })
  team!: (EmployerTeamMember & { _id: Types.ObjectId })[];

  @Prop({ type: [{ type: Types.ObjectId, ref: "User" }], default: [] })
  savedCandidates!: Types.ObjectId[];

  @Prop({ type: EmployerSettings, default: () => ({}) })
  settings!: EmployerSettings;

  @Prop({ type: EmployerBillingState, default: () => ({}) })
  billing!: EmployerBillingState;

  // ---------------------------------------------------------------- Fockis admin

  /** Blocked by Fockis: can't post, and none of its jobs show on Careers. */
  @Prop({ type: Boolean, default: false, index: true })
  blocked!: boolean;

  @Prop({ type: String, trim: true, maxlength: 2000 })
  blockedReason?: string;

  @Prop({ type: Date })
  blockedAt?: Date;

  @Prop({ type: [EmployerAdminAction], default: [] })
  adminHistory!: EmployerAdminAction[];
}

export const EmployerCompanySchema =
  SchemaFactory.createForClass(EmployerCompany);

EmployerCompanySchema.index({ "team.email": 1 });
EmployerCompanySchema.index({ "team.userId": 1 });
