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
  JobDocument,
} from "../schemas/job.schema";

@Injectable()
export class SavedJobsService {
  constructor(
    @InjectModel(SavedJob.name)
    private readonly savedJobModel: Model<SavedJobDocument>,

    @InjectModel("FockisCareerJob")
    private readonly jobModel: Model<JobDocument>,
  ) {}

  /**
   * GET MY SAVED JOBS
   *
   * Returns the authenticated user's saved jobs.
   */
  async findMine(userId: string) {
    this.validateUserId(userId);

    return this.savedJobModel
      .find({
        userId: new Types.ObjectId(userId),
      })
      .populate("jobId")
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  /**
   * SAVE JOB
   *
   * Only active and approved jobs can be saved.
   */
  async saveJob(
    userId: string,
    jobId: string,
  ) {
    this.validateUserId(userId);
    this.validateJobId(jobId);

    const userObjectId = new Types.ObjectId(userId);
    const jobObjectId = new Types.ObjectId(jobId);

    // Verify that the job exists and is publicly available.
    const job = await this.jobModel
      .findOne({
        _id: jobObjectId,
        isActive: true,
        isApproved: true,
      })
      .exec();

    if (!job) {
      throw new NotFoundException(
        "Job not found or is not available",
      );
    }

    // Prevent duplicate saves.
    const existing = await this.savedJobModel
      .exists({
        userId: userObjectId,
        jobId: jobObjectId,
      })
      .exec();

    if (existing) {
      throw new ConflictException(
        "Job is already saved",
      );
    }

    try {
      const savedJob = await this.savedJobModel.create({
        userId: userObjectId,
        jobId: jobObjectId,
      });

      return this.savedJobModel
        .findById(savedJob._id)
        .populate("jobId")
        .exec();
    } catch (error: unknown) {
      // Handle MongoDB duplicate-key errors caused by
      // simultaneous save requests.
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        throw new ConflictException(
          "Job is already saved",
        );
      }

      throw error;
    }
  }

  /**
   * REMOVE SAVED JOB
   */
  async removeSavedJob(
    userId: string,
    jobId: string,
  ) {
    this.validateUserId(userId);
    this.validateJobId(jobId);

    const deleted = await this.savedJobModel
      .findOneAndDelete({
        userId: new Types.ObjectId(userId),
        jobId: new Types.ObjectId(jobId),
      })
      .exec();

    if (!deleted) {
      throw new NotFoundException(
        "Saved job not found",
      );
    }

    return {
      message: "Job removed from saved jobs",
    };
  }

  /**
   * CHECK WHETHER JOB IS SAVED
   */
  async isSaved(
    userId: string,
    jobId: string,
  ): Promise<boolean> {
    this.validateUserId(userId);
    this.validateJobId(jobId);

    const saved = await this.savedJobModel
      .exists({
        userId: new Types.ObjectId(userId),
        jobId: new Types.ObjectId(jobId),
      })
      .exec();

    return Boolean(saved);
  }

  /**
   * VALIDATE USER ID
   */
  private validateUserId(userId: string): void {
    if (
      typeof userId !== "string" ||
      !Types.ObjectId.isValid(userId)
    ) {
      throw new BadRequestException(
        "Invalid user ID",
      );
    }
  }

  /**
   * VALIDATE JOB ID
   */
  private validateJobId(jobId: string): void {
    if (
      typeof jobId !== "string" ||
      !Types.ObjectId.isValid(jobId)
    ) {
      throw new BadRequestException(
        "Invalid job ID",
      );
    }
  }
}
