import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type JobApplicationStatus =
  | "submitted"
  | "reviewing"
  | "interview"
  | "rejected"
  | "hired";

@Schema({
  timestamps: true,
})
export class JobApplication extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: "Job",
    required: true,
    index: true,
  })
  jobId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "AcademyUser",
    required: false,
    index: true,
  })
  applicantId?: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  applicantName!: string;

  @Prop({
    trim: true,
    lowercase: true,
  })
  applicantEmail?: string;

  @Prop({
    default: "submitted",
    enum: [
      "submitted",
      "reviewing",
      "interview",
      "rejected",
      "hired",
    ],
    index: true,
  })
  status!: JobApplicationStatus;
}

export const JobApplicationSchema =
  SchemaFactory.createForClass(JobApplication);