import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

/* ============================================================
   JOB DOCUMENT
============================================================ */

export type JobDocument =
  HydratedDocument<Job>;

/* ============================================================
   JOB TYPE
============================================================ */

export enum JobType {
  JOB = "job",
  INTERNSHIP = "internship",
  COOP = "coop",
}

/* ============================================================
   WORKPLACE TYPE
============================================================ */

export enum WorkplaceType {
  REMOTE = "remote",
  HYBRID = "hybrid",
  ONSITE = "onsite",
}

/* ============================================================
   JOB SCHEMA
============================================================ */

@Schema({
  timestamps: true,
})
export class Job {
  /* ==========================================================
     JOB INFORMATION
  ========================================================== */

  @Prop({
    required: true,
    trim: true,
  })
  title!: string;

  /* ==========================================================
     EMPLOYER
     
     User who created the job.
  ========================================================== */

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  employerId!: Types.ObjectId;

  /* ==========================================================
     COMPANY INFORMATION
     
     Stored directly on the job so historical listings
     remain accurate if the employer later changes
     their company profile.
  ========================================================== */

  @Prop({
    required: true,
    trim: true,
  })
  company!: string;

  @Prop({
    trim: true,
  })
  companyDescription?: string;

  @Prop({
    trim: true,
  })
  companyWebsite?: string;

  /* ==========================================================
     INTERNATIONAL LOCATION
  ========================================================== */

  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  country!: string;

  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  city!: string;

  @Prop({
    trim: true,
  })
  stateProvince?: string;

  /*
   * Optional human-readable location.
   *
   * Example:
   * Columbus, Ohio
   */
  @Prop({
    trim: true,
  })
  location?: string;

  /* ==========================================================
     JOB TYPE
     
     job
     internship
     coop
  ========================================================== */

  @Prop({
    required: true,
    enum: Object.values(JobType),
    index: true,
  })
  type!: JobType;

  /* ==========================================================
     WORKPLACE TYPE
     
     remote
     hybrid
     onsite
  ========================================================== */

  @Prop({
    required: true,
    enum: Object.values(WorkplaceType),
    default: WorkplaceType.ONSITE,
    index: true,
  })
  workplaceType!: WorkplaceType;

  /* ==========================================================
     DESCRIPTION
  ========================================================== */

  @Prop({
    required: true,
    trim: true,
  })
  description!: string;

  /* ==========================================================
     SALARY
  ========================================================== */

  @Prop({
    trim: true,
  })
  salary?: string;

  /*
   * Examples:
   * USD
   * HTG
   * CAD
   * DOP
   * EUR
   */

  @Prop({
    trim: true,
    uppercase: true,
  })
  currency?: string;

  /*
   * Examples:
   * hourly
   * monthly
   * yearly
  */

  @Prop({
    trim: true,
  })
  salaryPeriod?: string;

  /* ==========================================================
     REMOTE FLAG
     
     Kept for compatibility with existing frontend/API data.
     workplaceType should normally be the primary source.
  ========================================================== */

  @Prop({
    default: false,
  })
  remote!: boolean;

  /* ==========================================================
     APPLICATION DEADLINE
  ========================================================== */

  @Prop()
  applicationDeadline?: Date;

  /* ==========================================================
     REQUIRED SKILLS
  ========================================================== */

  @Prop({
    type: [String],
    default: [],
  })
  skills!: string[];

  /* ==========================================================
     BENEFITS
  ========================================================== */

  @Prop({
    type: [String],
    default: [],
  })
  benefits!: string[];

  /* ==========================================================
     JOB VISIBILITY
     
     Active jobs can be shown to candidates.
  ========================================================== */

  @Prop({
    default: true,
    index: true,
  })
  isActive!: boolean;

  /* ==========================================================
     MODERATION
     
     Allows an admin/moderator to approve jobs before
     they become publicly visible.
  ========================================================== */

  @Prop({
    default: false,
    index: true,
  })
  isApproved!: boolean;
}

/* ============================================================
   SCHEMA FACTORY
============================================================ */

export const JobSchema =
  SchemaFactory.createForClass(Job);

/* ============================================================
   TEXT SEARCH INDEX
============================================================ */

JobSchema.index({
  title: "text",
  company: "text",
  description: "text",
  skills: "text",
});

/* ============================================================
   INTERNATIONAL JOB SEARCH INDEX
============================================================ */

JobSchema.index({
  country: 1,
  city: 1,
  type: 1,
  workplaceType: 1,
});

/* ============================================================
   EMPLOYER JOB MANAGEMENT INDEX
============================================================ */

JobSchema.index({
  employerId: 1,
  createdAt: -1,
});