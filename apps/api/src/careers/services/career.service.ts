import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  Job,
  JobDocument,
  JobType,
  WorkplaceType,
} from "../schemas/job.schema";

import { CreateJobDto } from "../dto/create-job.dto";

import { UpdateJobDto } from "../dto/update-job.dto";

@Injectable()
export class CareerService {
  constructor(
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,
  ) {}

  /*
   * ============================================================
   * CREATE JOB
   * ============================================================
   */

  async create(
    employerId: string,
    data: CreateJobDto,
  ) {
    if (!Types.ObjectId.isValid(employerId)) {
      throw new BadRequestException(
        "Invalid employer ID",
      );
    }

    const workplaceType =
      data.workplaceType === "remote"
        ? WorkplaceType.REMOTE
        : data.workplaceType === "hybrid"
          ? WorkplaceType.HYBRID
          : WorkplaceType.ONSITE;

    const job = await this.jobModel.create({
      title: data.title,

      employerId:
        new Types.ObjectId(employerId),

      company: data.company,

      companyDescription:
        data.companyDescription,

      companyWebsite:
        data.companyWebsite,

      country: data.country,

      city: data.city,

      stateProvince:
        data.stateProvince,

      location:
        data.location,

      type:
        data.type as JobType,

      workplaceType,

      description:
        data.description,

      salary:
        data.salary,

      currency:
        data.currency,

      salaryPeriod:
        data.salaryPeriod,

      remote:
        data.remote ??
        workplaceType === WorkplaceType.REMOTE,

      applicationDeadline:
        data.applicationDeadline
          ? new Date(data.applicationDeadline)
          : undefined,

      skills:
        data.skills ?? [],

      benefits:
        data.benefits ?? [],

      isActive: true,

      isApproved: true,
    });

    return job;
  }

  /*
   * ============================================================
   * FIND ALL PUBLIC JOBS
   * ============================================================
   */

  async findAll(
    filters?: {
      search?: string;
      country?: string;
      city?: string;
      type?: string;
      workplaceType?: string;
      remote?: boolean;
    },
  ) {
    const query: Record<string, any> = {
      isActive: true,
      isApproved: true,
    };

    /*
     * Search
     */

    if (filters?.search?.trim()) {
      query.$text = {
        $search: filters.search.trim(),
      };
    }

    /*
     * Country
     */

    if (filters?.country?.trim()) {
      query.country = new RegExp(
        `^${this.escapeRegex(
          filters.country.trim(),
        )}$`,
        "i",
      );
    }

    /*
     * City
     */

    if (filters?.city?.trim()) {
      query.city = new RegExp(
        this.escapeRegex(
          filters.city.trim(),
        ),
        "i",
      );
    }

    /*
     * Job type
     */

    if (
      filters?.type &&
      Object.values(JobType).includes(
        filters.type as JobType,
      )
    ) {
      query.type =
        filters.type as JobType;
    }

    /*
     * Workplace type
     */

    if (
      filters?.workplaceType &&
      Object.values(
        WorkplaceType,
      ).includes(
        filters.workplaceType as WorkplaceType,
      )
    ) {
      query.workplaceType =
        filters.workplaceType as WorkplaceType;
    }

    /*
     * Remote
     */

    if (
      filters?.remote !== undefined
    ) {
      query.remote = filters.remote;
    }

    return this.jobModel
      .find(query)
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  /*
   * ============================================================
   * FIND BY TYPE
   * ============================================================
   */

  async findByType(
    type: string,
  ) {
    if (
      !Object.values(JobType).includes(
        type as JobType,
      )
    ) {
      throw new BadRequestException(
        `Invalid job type: ${type}`,
      );
    }

    return this.jobModel
      .find({
        type: type as JobType,

        isActive: true,

        isApproved: true,
      })
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  /*
   * ============================================================
   * FIND ONE JOB
   * ============================================================
   */

  async findOne(
    id: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        "Invalid job ID",
      );
    }

    const job =
      await this.jobModel.findById(id);

    if (!job) {
      throw new NotFoundException(
        `Job ${id} not found`,
      );
    }

    return job;
  }

  /*
   * ============================================================
   * FIND EMPLOYER'S JOBS
   * ============================================================
   */

  async findMine(
    employerId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        employerId,
      )
    ) {
      throw new BadRequestException(
        "Invalid employer ID",
      );
    }

    return this.jobModel
      .find({
        employerId:
          new Types.ObjectId(
            employerId,
          ),
      })
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  /*
   * ============================================================
   * UPDATE JOB
   * ============================================================
   */

  async update(
    id: string,
    employerId: string,
    data: UpdateJobDto,
  ) {
    if (
      !Types.ObjectId.isValid(id) ||
      !Types.ObjectId.isValid(
        employerId,
      )
    ) {
      throw new BadRequestException(
        "Invalid job or employer ID",
      );
    }

    const updateData: Record<
      string,
      any
    > = {
      ...data,
    };

    /*
     * Convert workplace type to enum.
     */

    if (data.workplaceType) {
      if (
        !Object.values(
          WorkplaceType,
        ).includes(
          data.workplaceType as WorkplaceType,
        )
      ) {
        throw new BadRequestException(
          "Invalid workplace type",
        );
      }

      updateData.workplaceType =
        data.workplaceType as WorkplaceType;
    }

    /*
     * Convert job type to enum.
     */

    if (data.type) {
      if (
        !Object.values(
          JobType,
        ).includes(
          data.type as JobType,
        )
      ) {
        throw new BadRequestException(
          "Invalid job type",
        );
      }

      updateData.type =
        data.type as JobType;
    }

    /*
     * Convert deadline.
     */

    if (
      data.applicationDeadline
    ) {
      updateData.applicationDeadline =
        new Date(
          data.applicationDeadline,
        );
    }

    const job =
      await this.jobModel.findOneAndUpdate(
        {
          _id:
            new Types.ObjectId(id),

          employerId:
            new Types.ObjectId(
              employerId,
            ),
        },

        {
          $set: updateData,
        },

        {
          new: true,

          runValidators: true,
        },
      );

    if (!job) {
      throw new NotFoundException(
        "Job not found or you do not own this job",
      );
    }

    return job;
  }

  /*
   * ============================================================
   * DELETE JOB
   * ============================================================
   */

  async remove(
    id: string,
    employerId: string,
  ) {
    if (
      !Types.ObjectId.isValid(id) ||
      !Types.ObjectId.isValid(
        employerId,
      )
    ) {
      throw new BadRequestException(
        "Invalid job or employer ID",
      );
    }

    const job =
      await this.jobModel.findOneAndDelete({
        _id:
          new Types.ObjectId(id),

        employerId:
          new Types.ObjectId(
            employerId,
          ),
      });

    if (!job) {
      throw new NotFoundException(
        "Job not found or you do not own this job",
      );
    }

    return {
      message:
        "Job deleted successfully",
    };
  }

  /*
   * ============================================================
   * CHECK JOB OWNERSHIP
   * ============================================================
   */

  async isEmployerForJob(
    jobId: string,
    userId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        jobId,
      ) ||
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      return false;
    }

    const job =
      await this.jobModel.findOne({
        _id:
          new Types.ObjectId(jobId),

        employerId:
          new Types.ObjectId(userId),
      });

    return !!job;
  }

  /*
   * ============================================================
   * ESCAPE REGEX
   * ============================================================
   */

  private escapeRegex(
    value: string,
  ): string {
    return value.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
  }
}