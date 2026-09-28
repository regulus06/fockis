import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  Application,
  ApplicationDocument,
  ApplicationStatus,
} from "../schemas/application.schema";

import {
  CreateApplicationDto,
} from "../dto/create-application.dto";

import {
  UpdateApplicationStatusDto,
} from "../dto/update-application-status.dto";

import {
  Job,
  JobDocument,
} from "../schemas/job.schema";

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name)
    private readonly applicationModel:
      Model<ApplicationDocument>,

    @InjectModel(Job.name)
    private readonly jobModel:
      Model<JobDocument>,
  ) {}

  async findAllForUser(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(
        "Invalid user ID",
      );
    }

    return this.applicationModel
      .find({
        userId: new Types.ObjectId(userId),
      })
      .populate("jobId")
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  async findOne(
    id: string,
    userId?: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        "Invalid application ID",
      );
    }

    const query: any = {
      _id: new Types.ObjectId(id),
    };

    if (
      userId &&
      Types.ObjectId.isValid(userId)
    ) {
      query.userId =
        new Types.ObjectId(userId);
    }

    const application =
      await this.applicationModel
        .findOne(query)
        .populate("jobId")
        .exec();

    if (!application) {
      throw new NotFoundException(
        "Application not found",
      );
    }

    return application;
  }

  async create(
    userId: string,
    dto: CreateApplicationDto,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(
        "Invalid user ID",
      );
    }

    if (!Types.ObjectId.isValid(dto.jobId)) {
      throw new BadRequestException(
        "Invalid job ID",
      );
    }

    const job =
      await this.jobModel.findById(
        dto.jobId,
      );

    if (!job) {
      throw new NotFoundException(
        "Job not found",
      );
    }

    const existing =
      await this.applicationModel.findOne({
        jobId: new Types.ObjectId(
          dto.jobId,
        ),
        userId: new Types.ObjectId(
          userId,
        ),
      });

    if (existing) {
      throw new BadRequestException(
        "You have already applied to this job",
      );
    }

    const application =
      await this.applicationModel.create({
        ...dto,

        jobId: new Types.ObjectId(
          dto.jobId,
        ),

        userId: new Types.ObjectId(
          userId,
        ),

        skills: dto.skills || [],

        status:
          ApplicationStatus.APPLIED,
      });

    return this.applicationModel
      .findById(application._id)
      .populate("jobId")
      .exec();
  }

  async updateStatus(
    id: string,
    dto: UpdateApplicationStatusDto,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        "Invalid application ID",
      );
    }

    const application =
      await this.applicationModel
        .findByIdAndUpdate(
          id,
          {
            status: dto.status,
          },
          {
            new: true,
          },
        )
        .populate("jobId")
        .exec();

    if (!application) {
      throw new NotFoundException(
        "Application not found",
      );
    }

    return application;
  }

  async findAllForJob(jobId: string) {
    if (!Types.ObjectId.isValid(jobId)) {
      throw new BadRequestException(
        "Invalid job ID",
      );
    }

    return this.applicationModel
      .find({
        jobId: new Types.ObjectId(
          jobId,
        ),
      })
      .populate("jobId")
      .sort({
        createdAt: -1,
      })
      .exec();
  }
}