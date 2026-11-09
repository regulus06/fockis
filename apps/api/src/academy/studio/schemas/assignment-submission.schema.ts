import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

/* ============================================================================
   HOMEWORK — one learner's hand-in for one "assignment" lesson
   The learner writes an answer and/or attaches files; the class owner grades
   it (which completes the lesson) or returns it to be done again.
============================================================================ */

export const SUBMISSION_STATUSES = ["submitted", "returned", "graded"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

@Schema({ _id: false })
export class SubmissionFile {
  @Prop({ required: true, trim: true })
  storageKey!: string;

  @Prop({ required: true, trim: true })
  fileName!: string;

  @Prop({ trim: true })
  mimeType?: string;

  @Prop({ min: 0 })
  size?: number;
}
const SubmissionFileSchema = SchemaFactory.createForClass(SubmissionFile);

@Schema({ _id: false })
export class SubmissionEvent {
  @Prop({ required: true })
  action!: "submitted" | "returned" | "graded";

  @Prop({ required: true })
  at!: Date;

  @Prop({ trim: true })
  byName?: string;

  @Prop({ trim: true })
  grade?: string;

  @Prop({ trim: true })
  feedback?: string;
}
const SubmissionEventSchema = SchemaFactory.createForClass(SubmissionEvent);

@Schema({ timestamps: true, collection: "academy_submissions" })
export class AssignmentSubmission {
  _id!: Types.ObjectId;

  @Prop({ required: true, uppercase: true, trim: true, index: true })
  courseCode!: string;

  @Prop({ required: true, trim: true })
  lessonKey!: string;

  @Prop({ type: Types.ObjectId, ref: "AcademyUser", required: true, index: true })
  studentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Enrollment" })
  enrollmentId?: Types.ObjectId;

  /** The learner's written answer. */
  @Prop({ default: "", maxlength: 20000 })
  text!: string;

  @Prop({ type: [SubmissionFileSchema], default: [] })
  files!: SubmissionFile[];

  @Prop({ enum: SUBMISSION_STATUSES, default: "submitted", index: true })
  status!: SubmissionStatus;

  /** Free text, e.g. "18/20", "A-", "Pass". */
  @Prop({ trim: true, maxlength: 40 })
  grade?: string;

  @Prop({ trim: true, maxlength: 4000 })
  feedback?: string;

  @Prop({ default: 1, min: 1 })
  attempts!: number;

  @Prop({ required: true })
  submittedAt!: Date;

  @Prop()
  gradedAt?: Date;

  @Prop({ trim: true })
  gradedByName?: string;

  @Prop({ type: [SubmissionEventSchema], default: [] })
  history!: SubmissionEvent[];

  createdAt?: Date;
  updatedAt?: Date;
}

export type AssignmentSubmissionDocument = HydratedDocument<AssignmentSubmission>;
export const AssignmentSubmissionSchema = SchemaFactory.createForClass(AssignmentSubmission);
AssignmentSubmissionSchema.index({ courseCode: 1, lessonKey: 1, studentId: 1 }, { unique: true });
AssignmentSubmissionSchema.index({ courseCode: 1, status: 1, submittedAt: 1 });
