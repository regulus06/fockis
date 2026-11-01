
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
 * JOB DOCUMENT
 */
export type JobDocument = HydratedDocument<Job>;

/**
 * JOB TYPE
 */
export enum JobType {
  JOB = "job",
  INTERNSHIP = "internship",
  COOP = "coop",
}

/**
 * WORKPLACE TYPE
 */
export enum WorkplaceType {
  REMOTE = "remote",
  HYBRID = "hybrid",
  ONSITE = "onsite",
}

/** Optional employment arrangement (shown as Full-time, Part-time…). */
export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "temporary"] as const;

/** Optional seniority used by the job-seeker experience filter. */
export const EXPERIENCE_LEVELS = ["entry", "mid", "senior"] as const;

/**
 * APPLICATION METHOD
 *
 * fockis   -> candidates apply inside Fockis (existing internal flow)
 * external -> candidates are redirected to applicationUrl
 */
export enum ApplicationMethod {
  FOCKIS = "fockis",
  EXTERNAL = "external",
}

/**
 * JOB SCHEMA
 */
@Schema({
  timestamps: true,
})
export class Job {
  /**
   * JOB INFORMATION
   */
  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 150,
  })
  title!: string;

  /**
   * EMPLOYER
   */
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  employerId!: Types.ObjectId;

  /**
   * COMPANY INFORMATION
   */
  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 150,
  })
  company!: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 3000,
  })
  companyDescription?: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 2048,
  })
  companyWebsite?: string;

  /**
   * INTERNATIONAL LOCATION
   */
  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true,
  })
  country!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true,
  })
  city!: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 100,
  })
  stateProvince?: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 200,
  })
  location?: string;

  /**
   * JOB TYPE
   */
  @Prop({
    type: String,
    required: true,
    enum: Object.values(JobType),
    index: true,
  })
  type!: JobType;

  /**
   * WORKPLACE TYPE
   */
  @Prop({
    type: String,
    required: true,
    enum: Object.values(WorkplaceType),
    default: WorkplaceType.ONSITE,
    index: true,
  })
  workplaceType!: WorkplaceType;

  /**
   * JOB DESCRIPTION
   */
  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 20,
    maxlength: 20000,
  })
  description!: string;

  /**
   * SALARY
   */
  @Prop({
    type: String,
    trim: true,
    maxlength: 100,
  })
  salary?: string;

  @Prop({
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 10,
  })
  currency?: string;

  @Prop({
    type: String,
    trim: true,
    lowercase: true,
    enum: [
      "hourly",
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "negotiable",
    ],
  })
  salaryPeriod?: string;

  @Prop({
    type: Number,
    min: 0,
  })
  salaryMin?: number;

  @Prop({
    type: Number,
    min: 0,
  })
  salaryMax?: number;

  @Prop({ type: String, enum: EMPLOYMENT_TYPES, index: true })
  employmentType?: (typeof EMPLOYMENT_TYPES)[number];

  @Prop({ type: String, enum: EXPERIENCE_LEVELS, index: true })
  experienceLevel?: (typeof EXPERIENCE_LEVELS)[number];

  /**
   * HOW CANDIDATES APPLY
   *
   * Defaults to the internal Fockis flow so existing jobs
   * keep working without a migration.
   */
  @Prop({
    type: String,
    enum: Object.values(ApplicationMethod),
    default: ApplicationMethod.FOCKIS,
    index: true,
  })
  applicationMethod!: ApplicationMethod;

  /**
   * EXTERNAL APPLICATION URL
   *
   * Required when applicationMethod is "external".
   */
  @Prop({
    type: String,
    trim: true,
    maxlength: 2048,
  })
  applicationUrl?: string;

  /**
   * PUBLIC DETAIL-PAGE VIEWS
   */
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  viewCount!: number;

  /**
   * REMOTE FLAG
   *
   * Kept for compatibility with existing API/frontend.
   */
  @Prop({
    type: Boolean,
    default: false,
  })
  remote!: boolean;

  /**
   * APPLICATION DEADLINE
   */
  @Prop({
    type: Date,
  })
  applicationDeadline?: Date;

  /**
   * REQUIRED SKILLS
   */
  @Prop({
    type: [String],
    default: [],
  })
  skills!: string[];

  /**
   * BENEFITS
   */
  @Prop({
    type: [String],
    default: [],
  })
  benefits!: string[];

  /**
   * JOB VISIBILITY
   */
  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive!: boolean;

  /**
   * ADMINISTRATOR APPROVAL
   *
   * Jobs remain private until approved.
   */
  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isApproved!: boolean;
}

/**
 * CREATE MONGOOSE SCHEMA
 */
export const JobSchema =
  SchemaFactory.createForClass(Job);

/**
 * TEXT SEARCH INDEX
 */
JobSchema.index({
  title: "text",
  company: "text",
  description: "text",
  skills: "text",
});

/**
 * INTERNATIONAL JOB SEARCH INDEX
 */
JobSchema.index({
  country: 1,
  city: 1,
  type: 1,
  workplaceType: 1,
});

/**
 * PUBLIC JOB DISCOVERY INDEX
 */
JobSchema.index({
  isActive: 1,
  isApproved: 1,
  createdAt: -1,
});

/**
 * EMPLOYER JOB MANAGEMENT INDEX
 */
JobSchema.index({
  employerId: 1,
  createdAt: -1,
});
