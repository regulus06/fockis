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
   SAVED JOB DOCUMENT
============================================================ */

export type SavedJobDocument =
  HydratedDocument<SavedJob>;

/* ============================================================
   SAVED JOB SCHEMA
============================================================ */

@Schema({
  timestamps: true,
})
export class SavedJob {
  /* ==========================================================
     USER

     The candidate who saved the job.
  ========================================================== */

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  /* ==========================================================
     JOB

     The job being saved.
  ========================================================== */

  @Prop({
    type: Types.ObjectId,
    ref: "Job",
    required: true,
    index: true,
  })
  jobId!: Types.ObjectId;
}

/* ============================================================
   SCHEMA FACTORY
============================================================ */

export const SavedJobSchema =
  SchemaFactory.createForClass(
    SavedJob,
  );

/* ============================================================
   PREVENT DUPLICATE SAVES

   A user can save a particular job only once.
============================================================ */

SavedJobSchema.index(
  {
    userId: 1,
    jobId: 1,
  },
  {
    unique: true,
  },
);

/* ============================================================
   USER SAVED-JOBS LOOKUP
============================================================ */

SavedJobSchema.index({
  userId: 1,
  createdAt: -1,
});