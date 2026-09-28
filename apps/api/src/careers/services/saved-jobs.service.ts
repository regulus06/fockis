import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  SavedJob,
  SavedJobDocument,
} from "../schemas/saved-job.schema";

import {
  Job,
  JobDocument,
} from "../schemas/job.schema";

/* ============================================================
   SAVED JOBS SERVICE
============================================================ */

@Injectable()
export class SavedJobsService {
  constructor(
    @InjectModel(SavedJob.name)
    private readonly savedJobModel:
      Model<SavedJobDocument>,

    @InjectModel(Job.name)
    private readonly jobModel:
      Model<JobDocument>,
  ) {}

  /* ==========================================================
     GET MY SAVED JOBS

     Returns the current user's saved jobs.

     The Job document is populated so the frontend receives
     the actual job information.
  ========================================================== */

  async findMine(
    userId: string,
  ) {
    this.validateUserId(userId);

    return this.savedJobModel
      .find({
        userId: new Types.ObjectId(
          userId,
        ),
      })
      .populate("jobId")
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  /* ==========================================================
     SAVE JOB
  ========================================================== */

  async saveJob(
    userId: string,
    jobId: string,
  ) {
    this.validateUserId(userId);
    this.validateJobId(jobId);

    const userObjectId =
      new Types.ObjectId(userId);

    const jobObjectId =
      new Types.ObjectId(jobId);

    /* ========================================================
       VERIFY JOB EXISTS
    ======================================================== */

    const job =
      await this.jobModel.findById(
        jobObjectId,
      );

    if (!job) {
      throw new NotFoundException(
        `Job ${jobId} not found`,
      );
    }

    /* ========================================================
       CHECK EXISTING SAVE

       This gives the API a clean error instead of relying
       only on the MongoDB unique index.
    ======================================================== */

    const existing =
      await this.savedJobModel.findOne({
        userId: userObjectId,
        jobId: jobObjectId,
      });

    if (existing) {
      throw new ConflictException(
        "Job is already saved",
      );
    }

    /* ========================================================
       CREATE SAVE
    ======================================================== */

    try {
      const savedJob =
        await this.savedJobModel.create({
          userId: userObjectId,
          jobId: jobObjectId,
        });

      return savedJob;
    } catch (error: any) {
      /*
       * MongoDB duplicate-key protection.
       */

      if (error?.code === 11000) {
        throw new ConflictException(
          "Job is already saved",
        );
      }

      throw error;
    }
  }

  /* ==========================================================
     REMOVE SAVED JOB
  ========================================================== */

  async removeSavedJob(
    userId: string,
    jobId: string,
  ) {
    this.validateUserId(userId);
    this.validateJobId(jobId);

    const deleted =
      await this.savedJobModel.findOneAndDelete({
        userId:
          new Types.ObjectId(userId),

        jobId:
          new Types.ObjectId(jobId),
      });

    if (!deleted) {
      throw new NotFoundException(
        "Saved job not found",
      );
    }

    return {
      message:
        "Job removed from saved jobs",
    };
  }

  /* ==========================================================
     CHECK WHETHER JOB IS SAVED
  ========================================================== */

  async isSaved(
    userId: string,
    jobId: string,
  ): Promise<boolean> {
    this.validateUserId(userId);
    this.validateJobId(jobId);

    const saved =
      await this.savedJobModel.exists({
        userId:
          new Types.ObjectId(userId),

        jobId:
          new Types.ObjectId(jobId),
      });

    return !!saved;
  }

  /* ==========================================================
     VALIDATE USER ID
  ========================================================== */

  private validateUserId(
    userId: string,
  ): void {
    if (
      !Types.ObjectId.isValid(userId)
    ) {
      throw new BadRequestException(
        "Invalid user ID",
      );
    }
  }

  /* ==========================================================
     VALIDATE JOB ID
  ========================================================== */

  private validateJobId(
    jobId: string,
  ): void {
    if (
      !Types.ObjectId.isValid(jobId)
    ) {
      throw new BadRequestException(
        "Invalid job ID",
      );
    }
  }
}