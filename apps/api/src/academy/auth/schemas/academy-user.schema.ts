import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type AcademyRole =
  | "student"
  | "instructor"
  | "advisor"
  | "admissions"
  | "employer"
  | "staff"
  | "administrator";

export type AcademyUserDocument =
  HydratedDocument<AcademyUser>;

export interface AcademySession {
  id: string;
  device?: string;
  browser?: string;
  ipAddress?: string;
  location?: string;
  createdAt?: Date;
  lastActiveAt?: Date;
  current?: boolean;
}

export interface AcademyLoginHistoryItem {
  id: string;
  email?: string;
  ipAddress?: string;
  device?: string;
  browser?: string;
  success: boolean;
  createdAt?: Date;
}

export interface AcademySecurityEvent {
  id: string;
  type: string;
  description?: string;
  ipAddress?: string;
  createdAt?: Date;
}

@Schema({
  _id: false,
})
export class AcademySessionSchemaClass {
  @Prop({
    required: true,
  })
  id!: string;

  @Prop()
  device?: string;

  @Prop()
  browser?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  location?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  lastActiveAt?: Date;

  @Prop({
    default: false,
  })
  current?: boolean;
}

@Schema({
  _id: false,
})
export class AcademyLoginHistorySchemaClass {
  @Prop({
    required: true,
  })
  id!: string;

  @Prop()
  email?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  device?: string;

  @Prop()
  browser?: string;

  @Prop({
    required: true,
  })
  success!: boolean;

  @Prop()
  createdAt?: Date;
}

@Schema({
  _id: false,
})
export class AcademySecurityEventSchemaClass {
  @Prop({
    required: true,
  })
  id!: string;

  @Prop({
    required: true,
  })
  type!: string;

  @Prop()
  description?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  createdAt?: Date;
}

@Schema({
  timestamps: true,
})
export class AcademyUser {
  _id!: Types.ObjectId;

  createdAt!: Date;

  updatedAt!: Date;

  @Prop({
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({
    required: true,
    select: false,
  })
  passwordHash!: string;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    default: "student",
    enum: [
      "student",
      "instructor",
      "advisor",
      "admissions",
      "employer",
      "staff",
      "administrator",
    ],
    index: true,
  })
  role!: AcademyRole;

  @Prop({
    required: false,
    trim: true,
    index: true,
  })
  studentSlug?: string;

  @Prop({
    default: true,
    index: true,
  })
  isActive!: boolean;

  // --------------------------------------------------------------------------
  // SCHOOL ACCOUNTS
  // Students created by an approved school get a login like
  // amara.j@bellbakery.fockis.com (stored in `email`) and a temporary password
  // they must change at first sign-in.
  // --------------------------------------------------------------------------
  @Prop({ type: Types.ObjectId, ref: "AcademyInstitution", index: true })
  institutionId?: Types.ObjectId;

  /** Account created and managed by a school (not self-registered). */
  @Prop({ default: false })
  managed!: boolean;

  @Prop({ default: false })
  mustChangePassword!: boolean;

  /** The student's own email, used to send credentials once email delivery is connected. */
  @Prop({ trim: true, lowercase: true })
  personalEmail?: string;

  /** Why a school suspended this account (shown on sign-in). */
  @Prop({ trim: true })
  suspendedReason?: string;

  // ---------------------------------------------------------------- creators
  /**
   * Permission to publish classes, seminars, workshops and live classes in
   * Creator Studio. People apply; Fockis administrators approve, reject or
   * suspend. (Owners/staff of an approved school can always teach as that school.)
   */
  @Prop({ enum: ["none", "pending", "approved", "rejected", "suspended"], default: "none", index: true })
  creatorStatus!: "none" | "pending" | "approved" | "rejected" | "suspended";

  /** What the applicant told us: who they are and what they want to teach. */
  @Prop({ type: Object })
  creatorProfile?: {
    kind: "person" | "business";
    displayName: string;
    businessName?: string;
    phone?: string;
    country?: string;
    city?: string;
    website?: string;
    topics?: string;
    about: string;
    experience?: string;
    sampleUrl?: string;
  };

  /** Reason given by Fockis when rejecting or suspending (shown to the creator). */
  @Prop({ trim: true })
  creatorReason?: string;

  @Prop()
  creatorAppliedAt?: Date;

  @Prop()
  creatorReviewedAt?: Date;

  @Prop({ trim: true })
  creatorReviewedBy?: string;

  @Prop({ type: [Object], default: [] })
  creatorHistory!: { action: string; reason?: string; byName?: string; at: Date }[];

  @Prop({
    default: false,
  })
  twoFactorEnabled!: boolean;

  @Prop({
    select: false,
  })
  twoFactorSecret?: string;

  @Prop({
    type: [AcademySessionSchemaClass],
    default: [],
  })
  sessions!: AcademySession[];

  @Prop({
    type: [AcademyLoginHistorySchemaClass],
    default: [],
  })
  loginHistory!: AcademyLoginHistoryItem[];

  @Prop({
    type: [AcademySecurityEventSchemaClass],
    default: [],
  })
  securityEvents!: AcademySecurityEvent[];
}

export const AcademyUserSchema =
  SchemaFactory.createForClass(
    AcademyUser,
  );