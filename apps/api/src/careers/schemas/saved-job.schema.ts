
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
 * SAVED JOB DOCUMENT
 */
export type SavedJobDocument =
  HydratedDocument<SavedJob>;

/**
 * SAVED JOB SCHEMA
 */
@Schema({
  timestamps: true,
  versionKey: false,
})
export class SavedJob {
  /**
   * USER
   *
   * Candidate who saved the job.
   */
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
  })
  userId!: Types.ObjectId;

  /**
   * JOB
   *
   * Saved job reference.
   */
  @Prop({
    type: Types.ObjectId,
    ref: "Job",
    required: true,
  })
  jobId!: Types.ObjectId;
}

/**
 * CREATE MONGOOSE SCHEMA
 */
export const SavedJobSchema =
  SchemaFactory.createForClass(SavedJob);

/**
 * PREVENT DUPLICATE SAVES
 *
 * A user can save each job only once.
 */
SavedJobSchema.index(
  {
    userId: 1,
    jobId: 1,
  },
  {
    unique: true,
    name: "unique_user_saved_job",
  },
);

/**
 * USER SAVED-JOBS LOOKUP
 *
 * Supports retrieving saved jobs newest first.
 */
SavedJobSchema.index(
  {
    userId: 1,
    createdAt: -1,
  },
  {
    name: "user_saved_jobs_created_at",
  },
);

/**
 * JOB REFERENCE LOOKUP
 */
SavedJobSchema.index(
  {
    jobId: 1,
  },
  {
    name: "saved_job_reference",
  },
);
