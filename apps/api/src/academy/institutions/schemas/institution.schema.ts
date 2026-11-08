import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, SchemaTypes, Types } from "mongoose";

export type InstitutionDocument = HydratedDocument<AcademyInstitution>;

export const INSTITUTION_TYPES = ["school", "university", "college", "training_center", "business", "church", "nonprofit", "other"] as const;
export type InstitutionType = (typeof INSTITUTION_TYPES)[number];
export type InstitutionStatus = "pending" | "approved" | "rejected" | "blocked";

export interface InstitutionStaff {
  userId: Types.ObjectId;
  role: "admin" | "staff";
  addedAt: Date;
}

/** A teacher of the school. Doesn't need a Fockis account; classes point to it by `key`. */
export interface InstitutionTeacher {
  key: string;
  name: string;
  title?: string;
  department?: string;
  bio?: string;
  photoUrl?: string;
  /** Internal email — school staff only. */
  email?: string;
  /** Staff switch: may enrolled students see the contact details below? */
  contactEnabled?: boolean;
  contactEmail?: string;
  contactPhone?: string;
  /** e.g. "Tuesdays 3–5 pm" */
  officeHours?: string;
  /** Fockis Meetings link for virtual sessions, office hours or student presentations. */
  meetingUrl?: string;
}

/** One paid (or admin-recorded) period of the school's Fockis domain. */
export interface InstitutionBillingEntry {
  method: "stripe" | "manual" | "exempt" | "unexempt";
  amount?: number;
  currency?: string;
  /** Covered period; `to` is empty for a one-time (lifetime) fee. */
  from?: Date;
  to?: Date;
  paymentIntentId?: string;
  paymentId?: string;
  referenceId?: string;
  note?: string;
  byName?: string;
  at: Date;
}

export interface InstitutionHistory {
  action: "submitted" | "resubmitted" | "approved" | "rejected" | "blocked" | "unblocked";
  reason?: string;
  by?: Types.ObjectId;
  byName?: string;
  at: Date;
}

/**
 * A school, university, training center or business registered on Fockis
 * Academy. Fockis Academy administrators approve, reject, block and unblock it.
 * Approved institutions get the login domain `<slug>.fockis.com`, used for the
 * student accounts their staff create (e.g. amara.j@bellbakery.fockis.com).
 */
@Schema({ timestamps: true, collection: "academy_institutions" })
export class AcademyInstitution {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({ required: true, trim: true, maxlength: 160 })
  name!: string;

  /** Sub-domain label: `bellbakery` → bellbakery.fockis.com */
  @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
  slug!: string;

  @Prop({ enum: INSTITUTION_TYPES, default: "school" })
  type!: InstitutionType;

  @Prop({ trim: true, maxlength: 4000 })
  description?: string;

  @Prop({ trim: true }) country?: string;
  @Prop({ trim: true }) city?: string;
  @Prop({ trim: true }) address?: string;
  @Prop({ trim: true }) website?: string;
  @Prop({ trim: true }) phone?: string;
  @Prop({ trim: true, lowercase: true }) contactEmail?: string;

  /** Official registration / accreditation / business number. */
  @Prop({ trim: true }) registrationNumber?: string;

  /** Public logo (Studio upload, served by /uploads/media). */
  @Prop({ trim: true }) logoUrl?: string;

  /** Proof document (PDF) for the review, private — admins open it through a signed link. */
  @Prop({ trim: true }) proofStorageKey?: string;
  @Prop({ trim: true }) proofFileName?: string;

  @Prop({ type: Types.ObjectId, ref: "AcademyUser", required: true, index: true })
  ownerId!: Types.ObjectId;

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  staff!: InstitutionStaff[];

  @Prop({ enum: ["pending", "approved", "rejected", "blocked"], default: "pending", index: true })
  status!: InstitutionStatus;

  /** Reason shown to the institution for a rejection or block. */
  @Prop({ trim: true }) statusReason?: string;

  @Prop({ type: Types.ObjectId, ref: "AcademyUser" }) reviewedBy?: Types.ObjectId;
  @Prop() reviewedAt?: Date;

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  history!: InstitutionHistory[];

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  teachers!: InstitutionTeacher[];

  // ---------------------------------------------------------------- domain billing
  // Price, period and grace days are set by Fockis admins (AcademyDomainPricing).

  /** First approval (start of the "pay to activate" step). */
  @Prop() approvedAt?: Date;

  /** The domain is paid up to this moment. */
  @Prop({ index: true }) paidUntil?: Date;

  /** A one-time (lifetime) domain fee was paid. */
  @Prop({ default: false }) paidForever!: boolean;

  /** Fockis admins let this organization use its domain without paying. */
  @Prop({ default: false, index: true }) billingExempt!: boolean;
  @Prop({ trim: true }) billingExemptReason?: string;

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  billing!: InstitutionBillingEntry[];

  /** Students can apply from the public school page. */
  @Prop({ default: true })
  allowApplications!: boolean;
}

export const AcademyInstitutionSchema = SchemaFactory.createForClass(AcademyInstitution);
AcademyInstitutionSchema.index({ "staff.userId": 1 });
