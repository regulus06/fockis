import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type ApplicationDocument =
  HydratedDocument<Application>;

/* ============================================================
   APPLICATION STATUS
============================================================ */

export enum ApplicationStatus {
  APPLIED = "applied",
  VIEWED = "viewed",
  SHORTLISTED = "shortlisted",
  INTERVIEW = "interview",
  OFFER = "offer",
  REJECTED = "rejected",
}

/* ============================================================
   APPLICATION SCHEMA
============================================================ */

@Schema({
  timestamps: true,
})
export class Application {
  /* ==========================================================
     JOB
  ========================================================== */

  @Prop({
    type: Types.ObjectId,
    ref: "Job",
    required: true,
    index: true,
  })
  jobId!: Types.ObjectId;

  /* ==========================================================
     CANDIDATE / USER
  ========================================================== */

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  /* ==========================================================
     CANDIDATE INFORMATION
  ========================================================== */

  @Prop({
    required: true,
    trim: true,
  })
  fullName!: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({
    required: true,
    trim: true,
  })
  phone!: string;

  @Prop({
    required: true,
    trim: true,
  })
  location!: string;

  /* ==========================================================
     PROFESSIONAL LINKS / RESUME
  ========================================================== */

  @Prop({
    trim: true,
  })
  linkedInUrl?: string;

  @Prop({
    trim: true,
  })
  resumeFileName?: string;

  @Prop({
    trim: true,
  })
  resumeUrl?: string;

  /* ==========================================================
     EDUCATION
  ========================================================== */

  @Prop({
    type: {
      school: {
        type: String,
        required: true,
      },
      major: {
        type: String,
        required: true,
      },
      graduationDate: {
        type: String,
        required: true,
      },
    },
    required: true,
  })
  education!: {
    school: string;
    major: string;
    graduationDate: string;
  };

  /* ==========================================================
     EXPERIENCE
  ========================================================== */

  @Prop({
    type: {
      roleTitle: {
        type: String,
        required: true,
      },
      company: {
        type: String,
      },
      description: {
        type: String,
        required: true,
      },
    },
  })
  experience?: {
    roleTitle: string;
    company?: string;
    description: string;
  };

  /* ==========================================================
     SKILLS
  ========================================================== */

  @Prop({
    type: [String],
    default: [],
  })
  skills!: string[];

  /* ==========================================================
     COVER LETTER
  ========================================================== */

  @Prop()
  coverLetter?: string;

  /* ==========================================================
     WORK AUTHORIZATION
  ========================================================== */

  @Prop({
    required: true,
  })
  workAuthorized!: boolean;

  /* ==========================================================
     AVAILABILITY
  ========================================================== */

  @Prop()
  availableStartDate?: string;

  /* ==========================================================
     CUSTOM APPLICATION QUESTIONS
  ========================================================== */

  @Prop({
    type: Object,
    default: {},
  })
  answers?: Record<string, string>;

  /* ==========================================================
     APPLICATION STATUS
  ========================================================== */

  @Prop({
    type: String,
    enum: Object.values(ApplicationStatus),
    default: ApplicationStatus.APPLIED,
    index: true,
  })
  status!: ApplicationStatus;
}

/* ============================================================
   SCHEMA FACTORY
============================================================ */

export const ApplicationSchema =
  SchemaFactory.createForClass(Application);

/* ============================================================
   INDEXES
============================================================ */

ApplicationSchema.index({
  userId: 1,
  createdAt: -1,
});

ApplicationSchema.index({
  jobId: 1,
  createdAt: -1,
});