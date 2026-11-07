import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types, SchemaTypes } from "mongoose";

export type IssuedCertificateDocument = HydratedDocument<IssuedCertificate>;

export class RevocationEntry {
  action!: "revoked" | "restored";
  reason?: string;
  by!: Types.ObjectId;
  byName?: string;
  at!: Date;
}

/**
 * One certificate given to one person. Immutable snapshot: recipient name,
 * activity, instructor and the full template design are copied at issue time.
 */
@Schema({ timestamps: true, collection: "academy_issued_certificates" })
export class IssuedCertificate {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;

  /** Human-readable number printed on the certificate, e.g. FA-2026-7K3QX9. */
  @Prop({ required: true, unique: true, index: true })
  certificateNumber!: string;

  /** Long random id used in the QR code / verification URL. */
  @Prop({ required: true, unique: true, index: true })
  verificationId!: string;

  @Prop({ type: Types.ObjectId, ref: "CertificateTemplate", required: true })
  templateId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.Mixed, required: true })
  design!: Record<string, unknown>;

  /** Academy user id when the recipient has an account (course enrollments). */
  @Prop({ type: Types.ObjectId, ref: "AcademyUser", index: true })
  studentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Enrollment" })
  enrollmentId?: Types.ObjectId;

  /** The student's enrollment verification number, when issued from a course. */
  @Prop({ trim: true, index: true })
  enrollmentNumber?: string;

  @Prop({ required: true, trim: true })
  recipientName!: string;

  @Prop({ trim: true, lowercase: true, index: true })
  recipientEmail?: string;

  @Prop({ enum: ["course", "seminar", "workshop"], required: true })
  activityType!: "course" | "seminar" | "workshop";

  /** Course code or event id. */
  @Prop({ required: true, trim: true })
  activityRef!: string;

  @Prop({ required: true, trim: true })
  activityName!: string;

  @Prop({ type: Types.ObjectId, ref: "AcademyUser", required: true, index: true })
  instructorId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  instructorName!: string;

  @Prop({ trim: true })
  institutionName?: string;

  @Prop({ trim: true })
  duration?: string;

  @Prop({ trim: true })
  finalGrade?: string;

  @Prop({ required: true })
  completionDate!: Date;

  @Prop({ required: true })
  issuedAt!: Date;

  @Prop({ enum: ["valid", "revoked"], default: "valid", index: true })
  status!: "valid" | "revoked";

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  history!: RevocationEntry[];
}

export const IssuedCertificateSchema = SchemaFactory.createForClass(IssuedCertificate);

// One valid certificate per person per activity per template.
IssuedCertificateSchema.index({ activityType: 1, activityRef: 1, recipientEmail: 1, studentId: 1, templateId: 1 });
