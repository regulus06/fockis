import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

/**
 * EMPLOYER INTERVIEW
 *
 * An interview scheduled by an employer for one application.
 */
export type EmployerInterviewDocument =
  HydratedDocument<EmployerInterview>;

export const INTERVIEW_TYPES = ["video", "phone", "onsite"] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const INTERVIEW_RECOMMENDATIONS = [
  "strong_yes",
  "yes",
  "no",
  "strong_no",
] as const;

@Schema({ _id: false })
export class InterviewFeedback {
  @Prop({ type: Number, min: 1, max: 5, required: true })
  rating!: number;

  @Prop({ type: String, enum: INTERVIEW_RECOMMENDATIONS, required: true })
  recommendation!: (typeof INTERVIEW_RECOMMENDATIONS)[number];

  @Prop({ type: String, trim: true, maxlength: 5000 })
  comments?: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  submittedBy!: Types.ObjectId;

  @Prop({ type: Date, required: true })
  submittedAt!: Date;
}

@Schema({
  timestamps: true,
  collection: "employer_interviews",
})
export class EmployerInterview {
  /** Employer account that owns the job. */
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  ownerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Application", required: true, index: true })
  applicationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Job", required: true, index: true })
  jobId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  candidateUserId?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  candidateName!: string;

  @Prop({ type: String, trim: true, maxlength: 254 })
  candidateEmail?: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  jobTitle!: string;

  @Prop({ type: Date, required: true, index: true })
  startsAt!: Date;

  @Prop({ type: Number, min: 5, max: 600, default: 30 })
  durationMinutes!: number;

  @Prop({ type: String, trim: true, maxlength: 100, default: "UTC" })
  timezone!: string;

  @Prop({ type: String, enum: INTERVIEW_TYPES, required: true })
  type!: InterviewType;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  meetingUrl?: string;

  @Prop({ type: String, trim: true, maxlength: 300 })
  location?: string;

  @Prop({ type: String, trim: true, maxlength: 2000 })
  notes?: string;

  @Prop({ type: String, enum: INTERVIEW_STATUSES, default: "scheduled", index: true })
  status!: InterviewStatus;

  @Prop({ type: InterviewFeedback })
  feedback?: InterviewFeedback;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy!: Types.ObjectId;
}

export const EmployerInterviewSchema =
  SchemaFactory.createForClass(EmployerInterview);

EmployerInterviewSchema.index({ ownerId: 1, startsAt: 1 });
