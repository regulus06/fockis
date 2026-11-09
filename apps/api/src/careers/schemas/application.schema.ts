
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
 * APPLICATION DOCUMENT
 */
export type ApplicationDocument =
  HydratedDocument<Application>;

/**
 * APPLICATION STATUS
 */
export enum ApplicationStatus {
  APPLIED = "applied",
  VIEWED = "viewed",
  SHORTLISTED = "shortlisted",
  INTERVIEW = "interview",
  OFFER = "offer",
  REJECTED = "rejected",
}

/**
 * APPLICATION SCHEMA
 */
@Schema({
  timestamps: true,
  versionKey: false,
})
export class Application {
  /**
   * JOB REFERENCE
   */
  @Prop({
    type: Types.ObjectId,
    ref: "Job",
    required: true,
    index: true,
  })
  jobId!: Types.ObjectId;

  /**
   * CANDIDATE / USER REFERENCE
   */
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  /**
   * CANDIDATE INFORMATION
   */
  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 150,
  })
  fullName!: string;

  @Prop({
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
  })
  email!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 30,
  })
  phone!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  })
  location!: string;

  /**
   * PROFESSIONAL LINKS / RESUME
   */
  @Prop({
    type: String,
    trim: true,
    maxlength: 2048,
  })
  linkedInUrl?: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 255,
  })
  resumeFileName?: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 2048,
  })
  resumeUrl?: string;

  /**
   * Private Cloud Storage key of the resume copied from the
   * applicant's career profile. Never exposed to clients.
   */
  @Prop({
    type: String,
    trim: true,
    maxlength: 500,
    select: false,
  })
  resumeStorageKey?: string;

  /**
   * EDUCATION
   */
  @Prop({
    type: {
      school: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },
      major: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },
      graduationDate: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
      },
    },
    required: true,
    _id: false,
  })
  education!: {
    school: string;
    major: string;
    graduationDate: string;
  };

  /**
   * EXPERIENCE
   */
  @Prop({
    type: {
      roleTitle: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },
      company: {
        type: String,
        trim: true,
        maxlength: 150,
      },
      description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000,
      },
    },
    required: false,
    _id: false,
  })
  experience?: {
    roleTitle: string;
    company?: string;
    description: string;
  };

  /**
   * SKILLS
   */
  @Prop({
    type: [String],
    default: [],
  })
  skills!: string[];

  /**
   * COVER LETTER
   */
  @Prop({
    type: String,
    trim: true,
    maxlength: 10000,
  })
  coverLetter?: string;

  /**
   * WORK AUTHORIZATION
   */
  @Prop({
    type: Boolean,
    required: true,
  })
  workAuthorized!: boolean;

  /**
   * AVAILABILITY
   */
  @Prop({
    type: String,
    trim: true,
    maxlength: 50,
  })
  availableStartDate?: string;

  /**
   * CUSTOM APPLICATION QUESTIONS
   */
  @Prop({
    type: Object,
    default: {},
  })
  answers?: Record<string, string>;

  /**
   * APPLICATION STATUS
   */
  @Prop({
    type: String,
    enum: Object.values(ApplicationStatus),
    default: ApplicationStatus.APPLIED,
    required: true,
    index: true,
  })
  status!: ApplicationStatus;

  /**
   * STATUS HISTORY
   *
   * Drives the employer application timeline and hiring funnel.
   */
  @Prop({
    type: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, required: true },
        changedBy: { type: Types.ObjectId, ref: "User" },
        _id: false,
      },
    ],
    default: [],
  })
  statusHistory!: {
    status: string;
    changedAt: Date;
    changedBy?: Types.ObjectId;
  }[];

  /**
   * PRIVATE RECRUITER NOTES
   *
   * Visible only to the employer that owns the job.
   */
  @Prop({
    type: [
      {
        body: { type: String, required: true, maxlength: 5000 },
        authorId: { type: Types.ObjectId, ref: "User", required: true },
        authorName: { type: String, maxlength: 150 },
        createdAt: { type: Date, required: true },
      },
    ],
    default: [],
  })
  employerNotes!: {
    _id?: Types.ObjectId;
    body: string;
    authorId: Types.ObjectId;
    authorName?: string;
    createdAt: Date;
  }[];
}

/**
 * CREATE MONGOOSE SCHEMA
 */
export const ApplicationSchema =
  SchemaFactory.createForClass(Application);

/**
 * DATABASE INDEXES
 */

// Applicant dashboard: newest applications first.
ApplicationSchema.index({
  userId: 1,
  createdAt: -1,
});

// Employer dashboard: applications for a job.
ApplicationSchema.index({
  jobId: 1,
  createdAt: -1,
});

// Prevent duplicate applications from the same user
// for the same job.
ApplicationSchema.index(
  {
    userId: 1,
    jobId: 1,
  },
  {
    unique: true,
    name: "unique_user_job_application",
  },
);
