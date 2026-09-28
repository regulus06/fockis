import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  AiJob,
  AiJobDocument,
  AiJobModel,
  AiJobType,
} from "../schemas/ai-job.schema";

@Injectable()
export class AiJobService {
  constructor(
    @InjectModel(AiJob.name)
    private readonly jobModel:
      Model<AiJobDocument>,
  ) {}

  // ============================================================
  // CREATE
  // ============================================================

  async create(data: {
    userId: string;

    type: AiJobType;

    prompt: string;

    model?: AiJobModel;

    options?: Record<
      string,
      unknown
    >;

    creditsReserved: number;
  }) {
    if (
      !Types.ObjectId.isValid(
        data.userId,
      )
    ) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    const job =
      new this.jobModel({
        userId:
          new Types.ObjectId(
            data.userId,
          ),

        type:
          data.type,

        prompt:
          data.prompt.trim(),

        model:
          data.model ??
          "auto",

        options:
          data.options ??
          {},

        status:
          "queued",

        creditsReserved:
          data.creditsReserved,

        creditsConsumed:
          0,

        attempts:
          0,

        progress: {
          phase:
            "queued",

          completedScenes:
            0,

          totalScenes:
            0,

          percentage:
            0,

          message:
            "Waiting for AI worker.",
        },

        result: {},
      });

    await job.save();

    return this.toResponse(
      job,
    );
  }

  // ============================================================
  // FIND JOBS FOR USER
  // ============================================================

  async findForUser(
    userId: string,
    limit = 50,
  ) {
    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new NotFoundException(
        "AI jobs not found.",
      );
    }

    const jobs =
      await this.jobModel
        .find({
          userId:
            new Types.ObjectId(
              userId,
            ),
        })
        .sort({
          createdAt: -1,
        })
        .limit(
          Math.min(
            Math.max(
              limit,
              1,
            ),
            100,
          ),
        )
        .lean();

    return jobs.map(
      (job) =>
        this.toResponse(
          job,
        ),
    );
  }

  // ============================================================
  // FIND ONE FOR USER
  // ============================================================

  async findOneForUser(
    userId: string,
    jobId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        jobId,
      )
    ) {
      throw new NotFoundException(
        "AI job not found.",
      );
    }

    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new NotFoundException(
        "AI job not found.",
      );
    }

    const job =
      await this.jobModel.findOne({
        _id:
          new Types.ObjectId(
            jobId,
          ),

        userId:
          new Types.ObjectId(
            userId,
          ),
      });

    if (!job) {
      throw new NotFoundException(
        "AI job not found.",
      );
    }

    return this.toResponse(
      job,
    );
  }

  // ============================================================
  // CLAIM
  // ============================================================

  async claim(
    jobId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        jobId,
      )
    ) {
      return null;
    }

    return this.jobModel.findOneAndUpdate(
      {
        _id:
          new Types.ObjectId(
            jobId,
          ),

        status:
          "queued",
      },

      {
        $set: {
          status:
            "processing",

          startedAt:
            new Date(),

          "progress.phase":
            "planning",

          "progress.message":
            "Preparing video generation.",
        },

        $inc: {
          attempts: 1,
        },
      },

      {
        new: true,
      },
    );
  }

  // ============================================================
  // UPDATE PROGRESS
  // ============================================================

  async updateProgress(
    jobId: string,

    progress:
      Record<string, unknown>,
  ) {
    if (
      !Types.ObjectId.isValid(
        jobId,
      )
    ) {
      return null;
    }

    return this.jobModel.updateOne(
      {
        _id:
          new Types.ObjectId(
            jobId,
          ),

        status:
          "processing",
      },

      {
        $set: {
          progress,
        },
      },
    );
  }

  // ============================================================
  // PROVIDER OPERATION
  // ============================================================

  async setProviderOperation(
    jobId: string,
    operationId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        jobId,
      )
    ) {
      return null;
    }

    return this.jobModel.updateOne(
      {
        _id:
          new Types.ObjectId(
            jobId,
          ),

        status:
          "processing",
      },

      {
        $set: {
          providerOperationId:
            operationId,
        },
      },
    );
  }

  // ============================================================
  // COMPLETE
  //
  // result.resultUrl is expected to contain either:
  //
  // gs://bucket/path/video.mp4
  //
  // or an HTTPS URL.
  // ============================================================

  async complete(
    jobId: string,

    result: {
      resultUrl: string;

      thumbnailUrl?: string;

      durationSeconds: number;

      sceneCount: number;

      provider: string;

      creditsConsumed: number;
    },
  ) {
    if (
      !Types.ObjectId.isValid(
        jobId,
      )
    ) {
      return null;
    }

    return this.jobModel.updateOne(
      {
        _id:
          new Types.ObjectId(
            jobId,
          ),

        status:
          "processing",
      },

      {
        $set: {
          status:
            "completed",

          completedAt:
            new Date(),

          // IMPORTANT:
          // Store the final GCS URI here.
          resultUrl:
            result.resultUrl,

          thumbnailUrl:
            result.thumbnailUrl,

          provider:
            result.provider,

          creditsConsumed:
            result.creditsConsumed,

          result: {
            durationSeconds:
              result.durationSeconds,

            sceneCount:
              result.sceneCount,

            // Also preserve the media URI inside
            // the result object for future compatibility.
            resultUrl:
              result.resultUrl,
          },

          progress: {
            phase:
              "completed",

            completedScenes:
              result.sceneCount,

            totalScenes:
              result.sceneCount,

            percentage:
              100,

            message:
              "Video generation completed.",
          },
        },
      },
    );
  }

  // ============================================================
  // FAIL
  // ============================================================

  async fail(
    jobId: string,
    error: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        jobId,
      )
    ) {
      return null;
    }

    return this.jobModel.updateOne(
      {
        _id:
          new Types.ObjectId(
            jobId,
          ),

        status: {
          $nin: [
            "completed",
            "cancelled",
          ],
        },
      },

      {
        $set: {
          status:
            "failed",

          error:
            error.slice(
              0,
              4000,
            ),

          completedAt:
            new Date(),

          "progress.phase":
            "failed",

          "progress.message":
            "Video generation failed.",
        },
      },
    );
  }

  // ============================================================
  // CANCEL
  // ============================================================

  async cancel(
    userId: string,
    jobId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        jobId,
      )
    ) {
      throw new NotFoundException(
        "AI job cannot be cancelled.",
      );
    }

    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new NotFoundException(
        "AI job cannot be cancelled.",
      );
    }

    const job =
      await this.jobModel.findOneAndUpdate(
        {
          _id:
            new Types.ObjectId(
              jobId,
            ),

          userId:
            new Types.ObjectId(
              userId,
            ),

          status: {
            $in: [
              "queued",
              "processing",
            ],
          },
        },

        {
          $set: {
            status:
              "cancelled",

            cancelledAt:
              new Date(),

            "progress.phase":
              "cancelled",

            "progress.message":
              "Video generation cancelled.",
          },
        },

        {
          new: true,
        },
      );

    if (!job) {
      throw new NotFoundException(
        "AI job cannot be cancelled.",
      );
    }

    return this.toResponse(
      job,
    );
  }

  // ============================================================
  // RAW JOB
  // ============================================================

  async getRaw(
    jobId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        jobId,
      )
    ) {
      return null;
    }

    return this.jobModel.findById(
      new Types.ObjectId(
        jobId,
      ),
    );
  }

  // ============================================================
  // RESPONSE
  // ============================================================

  private toResponse(
    job: {
      _id: unknown;

      type?: unknown;

      status?: unknown;

      progress?: Record<
        string,
        unknown
      >;

      prompt?: unknown;

      resultUrl?: unknown;

      thumbnailUrl?: unknown;

      error?: unknown;

      result?: Record<
        string,
        unknown
      >;

      provider?: unknown;

      createdAt?: unknown;

      updatedAt?: unknown;
    },
  ) {
    // ----------------------------------------------------------
    // Resolve the media URL from the possible stored locations.
    // ----------------------------------------------------------

    const resultUrl =
      typeof job.resultUrl ===
      "string"
        ? job.resultUrl
        : typeof job.result
            ?.resultUrl ===
          "string"
        ? job.result.resultUrl
        : undefined;

    return {
      id: String(
        job._id,
      ),

      type:
        job.type,

      status:
        job.status,

      progress:
        typeof job.progress
          ?.percentage ===
        "number"
          ? job.progress
              .percentage
          : 0,

      prompt:
        job.prompt,

      // --------------------------------------------------------
      // Keep the original API field.
      // --------------------------------------------------------

      resultUrl,

      // --------------------------------------------------------
      // Also expose aliases so the frontend and media endpoint
      // can use the same completed-job response.
      // --------------------------------------------------------

      mediaUrl:
        resultUrl,

      videoUrl:
        resultUrl,

      outputUrl:
        resultUrl,

      outputGcsUri:
        resultUrl?.startsWith(
          "gs://",
        )
          ? resultUrl
          : undefined,

      thumbnailUrl:
        job.thumbnailUrl,

      provider:
        job.provider,

      result:
        job.result,

      error:
        job.error,

      createdAt:
        job.createdAt,

      updatedAt:
        job.updatedAt,
    };
  }
}