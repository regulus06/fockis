
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
  ApplicationMethod,
  Job,
  JobDocument,
  JobType,
  WorkplaceType,
} from "../schemas/job.schema";

import { CreateJobDto } from "../dto/create-job.dto";
import { UpdateJobDto } from "../dto/update-job.dto";

interface JobFilters {
  search?: string;
  country?: string;
  city?: string;
  type?: string;
  workplaceType?: string;
  remote?: boolean;
}

@Injectable()
export class CareerService {
  constructor(
    @InjectModel("FockisCareerJob")
    private readonly jobModel: Model<JobDocument>,
  ) {}

  /**
   * CREATE JOB
   * New jobs require admin approval before becoming public.
   */
  async create(employerId: string, data: CreateJobDto) {
    this.validateObjectId(employerId, "employer");

    if (!data.title?.trim()) {
      throw new BadRequestException("Job title is required");
    }

    if (!data.description?.trim()) {
      throw new BadRequestException("Job description is required");
    }

    if (!data.company?.trim()) {
      throw new BadRequestException("Company name is required");
    }

    const workplaceType = this.resolveWorkplaceType(
      data.workplaceType,
    );

    const jobType = this.resolveJobType(data.type);

    const applicationDeadline = this.parseDeadline(
      data.applicationDeadline,
    );

    const remote =
      data.remote ?? workplaceType === WorkplaceType.REMOTE;

    this.assertSalaryRange(data.salaryMin, data.salaryMax);

    const application = this.resolveApplication(
      data.applicationMethod,
      data.applicationUrl,
    );

    if (remote && workplaceType === WorkplaceType.ONSITE) {
      throw new BadRequestException(
        "An onsite job cannot be marked as remote",
      );
    }

    const job = await this.jobModel.create({
      title: data.title.trim(),
      employerId: new Types.ObjectId(employerId),
      company: data.company.trim(),
      companyDescription: data.companyDescription?.trim(),
      companyWebsite: data.companyWebsite?.trim(),
      country: data.country?.trim(),
      city: data.city?.trim(),
      stateProvince: data.stateProvince?.trim(),
      location: data.location?.trim(),
      type: jobType,
      workplaceType,
      description: data.description.trim(),
      salary: data.salary,
      currency: data.currency,
      salaryPeriod: data.salaryPeriod,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      applicationMethod: application.method,
      applicationUrl: application.url,
      employmentType: data.employmentType,
      experienceLevel: data.experienceLevel,
      remote,
      applicationDeadline,
      skills: this.cleanStringArray(data.skills),
      benefits: this.cleanStringArray(data.benefits),
      isActive: true,
      isApproved: false,
    });

    return job;
  }

  /**
   * FIND ALL PUBLIC JOBS
   */
  async findAll(filters?: JobFilters) {
    const query: Record<string, any> = {
      isActive: true,
      isApproved: true,
    };

    if (filters?.search?.trim()) {
      query.$text = {
        $search: filters.search.trim(),
      };
    }

    if (filters?.country?.trim()) {
      query.country = new RegExp(
        `^${this.escapeRegex(filters.country.trim())}$`,
        "i",
      );
    }

    if (filters?.city?.trim()) {
      query.city = new RegExp(
        this.escapeRegex(filters.city.trim()),
        "i",
      );
    }

    if (filters?.type?.trim()) {
      query.type = this.resolveJobType(filters.type);
    }

    if (filters?.workplaceType?.trim()) {
      query.workplaceType = this.resolveWorkplaceType(
        filters.workplaceType,
      );
    }

    if (filters?.remote !== undefined) {
      query.remote = filters.remote;
    }

    return this.jobModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * FIND JOBS BY TYPE
   */
  async findByType(type: string) {
    const jobType = this.resolveJobType(type);

    return this.jobModel
      .find({
        type: jobType,
        isActive: true,
        isApproved: true,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * FIND ONE PUBLIC JOB
   * Only active and approved jobs can be viewed publicly.
   */
  async findOne(id: string) {
    this.validateObjectId(id, "job");

    const job = await this.jobModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          isActive: true,
          isApproved: true,
        },
        { $inc: { viewCount: 1 } },
        { new: true },
      )
      .exec();

    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    return job;
  }

  /**
   * FIND EMPLOYER'S JOBS
   * Includes pending approval jobs belonging to the employer.
   */
  async findMine(employerId: string) {
    this.validateObjectId(employerId, "employer");

    return this.jobModel
      .find({
        employerId: new Types.ObjectId(employerId),
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * UPDATE OWN JOB
   */
  async update(
    id: string,
    employerId: string,
    data: UpdateJobDto,
  ) {
    this.validateObjectId(id, "job");
    this.validateObjectId(employerId, "employer");

    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) {
      if (!data.title.trim()) {
        throw new BadRequestException(
          "Job title cannot be empty",
        );
      }

      updateData.title = data.title.trim();
    }

    if (data.company !== undefined) {
      if (!data.company.trim()) {
        throw new BadRequestException(
          "Company name cannot be empty",
        );
      }

      updateData.company = data.company.trim();
    }

    if (data.companyDescription !== undefined) {
      updateData.companyDescription =
        data.companyDescription?.trim();
    }

    if (data.companyWebsite !== undefined) {
      updateData.companyWebsite =
        data.companyWebsite?.trim();
    }

    if (data.country !== undefined) {
      updateData.country = data.country?.trim();
    }

    if (data.city !== undefined) {
      updateData.city = data.city?.trim();
    }

    if (data.stateProvince !== undefined) {
      updateData.stateProvince =
        data.stateProvince?.trim();
    }

    if (data.location !== undefined) {
      updateData.location = data.location?.trim();
    }

    if (data.description !== undefined) {
      if (!data.description.trim()) {
        throw new BadRequestException(
          "Job description cannot be empty",
        );
      }

      updateData.description = data.description.trim();
    }

    if (data.type !== undefined) {
      updateData.type = this.resolveJobType(data.type);
    }

    if (data.workplaceType !== undefined) {
      updateData.workplaceType =
        this.resolveWorkplaceType(data.workplaceType);
    }

    if (data.salary !== undefined) {
      updateData.salary = data.salary;
    }

    if (data.currency !== undefined) {
      updateData.currency = data.currency;
    }

    if (data.salaryPeriod !== undefined) {
      updateData.salaryPeriod = data.salaryPeriod;
    }

    if (data.remote !== undefined) {
      updateData.remote = data.remote;
    }

    if (data.applicationDeadline !== undefined) {
      updateData.applicationDeadline =
        this.parseDeadline(data.applicationDeadline);
    }

    if (data.skills !== undefined) {
      updateData.skills = this.cleanStringArray(data.skills);
    }

    if (data.benefits !== undefined) {
      updateData.benefits = this.cleanStringArray(data.benefits);
    }

    if (data.employmentType !== undefined) {
      updateData.employmentType = data.employmentType;
    }

    if (data.experienceLevel !== undefined) {
      updateData.experienceLevel = data.experienceLevel;
    }

    if (data.salaryMin !== undefined) {
      updateData.salaryMin = data.salaryMin;
    }

    if (data.salaryMax !== undefined) {
      updateData.salaryMax = data.salaryMax;
    }

    const unset: Record<string, ""> = {};

    if (
      data.applicationMethod !== undefined ||
      data.applicationUrl !== undefined ||
      data.salaryMin !== undefined ||
      data.salaryMax !== undefined
    ) {
      const existing = await this.jobModel
        .findOne({
          _id: new Types.ObjectId(id),
          employerId: new Types.ObjectId(employerId),
        })
        .select("applicationMethod applicationUrl salaryMin salaryMax")
        .lean()
        .exec();

      if (!existing) {
        throw new NotFoundException(
          "Job not found or you do not own this job",
        );
      }

      this.assertSalaryRange(
        data.salaryMin ?? existing.salaryMin,
        data.salaryMax ?? existing.salaryMax,
      );

      if (
        data.applicationMethod !== undefined ||
        data.applicationUrl !== undefined
      ) {
        const application = this.resolveApplication(
          data.applicationMethod ??
            (existing.applicationMethod as string | undefined),
          data.applicationUrl ?? existing.applicationUrl,
        );

        updateData.applicationMethod = application.method;

        if (application.url) {
          updateData.applicationUrl = application.url;
        } else {
          unset.applicationUrl = "";
        }
      }
    }

    // Employers cannot modify employerId, isApproved, or other
    // protected moderation fields through this endpoint.
    const job = await this.jobModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          employerId: new Types.ObjectId(employerId),
        },
        Object.keys(unset).length
          ? { $set: updateData, $unset: unset }
          : { $set: updateData },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    if (!job) {
      throw new NotFoundException(
        "Job not found or you do not own this job",
      );
    }

    return job;
  }

  /**
   * DELETE OWN JOB
   */
  async remove(id: string, employerId: string) {
    this.validateObjectId(id, "job");
    this.validateObjectId(employerId, "employer");

    const job = await this.jobModel
      .findOneAndDelete({
        _id: new Types.ObjectId(id),
        employerId: new Types.ObjectId(employerId),
      })
      .exec();

    if (!job) {
      throw new NotFoundException(
        "Job not found or you do not own this job",
      );
    }

    return {
      message: "Job deleted successfully",
    };
  }

  /**
   * PAUSE / ACTIVATE OWN JOB
   */
  async setActive(
    id: string,
    employerId: string,
    isActive: boolean,
  ) {
    this.validateObjectId(id, "job");
    this.validateObjectId(employerId, "employer");

    const job = await this.jobModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          employerId: new Types.ObjectId(employerId),
        },
        { $set: { isActive } },
        { new: true },
      )
      .exec();

    if (!job) {
      throw new NotFoundException(
        "Job not found or you do not own this job",
      );
    }

    return job;
  }

  /**
   * CHECK JOB OWNERSHIP
   */
  async isEmployerForJob(
    jobId: string,
    userId: string,
  ): Promise<boolean> {
    if (
      !Types.ObjectId.isValid(jobId) ||
      !Types.ObjectId.isValid(userId)
    ) {
      return false;
    }

    const job = await this.jobModel
      .exists({
        _id: new Types.ObjectId(jobId),
        employerId: new Types.ObjectId(userId),
      })
      .exec();

    return !!job;
  }

  /**
   * VALIDATE MONGODB OBJECT ID
   */
  private validateObjectId(
    id: string,
    fieldName: string,
  ): void {
    if (
      !id ||
      typeof id !== "string" ||
      !Types.ObjectId.isValid(id)
    ) {
      throw new BadRequestException(
        `Invalid ${fieldName} ID`,
      );
    }
  }

  /**
   * RESOLVE JOB TYPE
   */
  private resolveJobType(value: string): JobType {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();

    const match = Object.values(JobType).find(
      (item) => String(item).toLowerCase() === normalized,
    );

    if (!match) {
      throw new BadRequestException(
        `Invalid job type: ${value}`,
      );
    }

    return match as JobType;
  }

  /**
   * RESOLVE WORKPLACE TYPE
   */
  private resolveWorkplaceType(
    value?: string,
  ): WorkplaceType {
    const normalized = String(value ?? "onsite")
      .trim()
      .toLowerCase();

    const match = Object.values(WorkplaceType).find(
      (item) => String(item).toLowerCase() === normalized,
    );

    if (!match) {
      throw new BadRequestException(
        `Invalid workplace type: ${value}`,
      );
    }

    return match as WorkplaceType;
  }

  /**
   * VALIDATE APPLICATION DEADLINE
   */
  private parseDeadline(
    value?: string | Date,
  ): Date | undefined {
    if (!value) {
      return undefined;
    }

    const deadline = new Date(value);

    if (Number.isNaN(deadline.getTime())) {
      throw new BadRequestException(
        "Invalid application deadline",
      );
    }

    if (deadline.getTime() < Date.now()) {
      throw new BadRequestException(
        "Application deadline cannot be in the past",
      );
    }

    return deadline;
  }

  /**
   * RESOLVE APPLICATION METHOD + URL
   */
  private resolveApplication(
    method?: string,
    url?: string,
  ): { method: ApplicationMethod; url?: string } {
    const normalized = String(method ?? ApplicationMethod.FOCKIS)
      .trim()
      .toLowerCase();

    if (normalized === ApplicationMethod.FOCKIS) {
      return { method: ApplicationMethod.FOCKIS };
    }

    if (normalized !== ApplicationMethod.EXTERNAL) {
      throw new BadRequestException(
        `Invalid application method: ${method}`,
      );
    }

    const trimmed = url?.trim();

    if (!trimmed) {
      throw new BadRequestException(
        "An external application URL is required when applying on the company website",
      );
    }

    let parsed: URL;

    try {
      parsed = new URL(trimmed);
    } catch {
      throw new BadRequestException(
        "External application URL must be a valid URL",
      );
    }

    if (
      parsed.protocol !== "https:" &&
      parsed.protocol !== "http:"
    ) {
      throw new BadRequestException(
        "External application URL must start with http:// or https://",
      );
    }

    return {
      method: ApplicationMethod.EXTERNAL,
      url: parsed.toString(),
    };
  }

  private assertSalaryRange(min?: number, max?: number): void {
    if (
      typeof min === "number" &&
      typeof max === "number" &&
      min > max
    ) {
      throw new BadRequestException(
        "Minimum salary cannot be greater than maximum salary",
      );
    }
  }

  /**
   * CLEAN STRING ARRAYS
   */
  private cleanStringArray(
    values?: string[],
  ): string[] {
    if (!Array.isArray(values)) {
      return [];
    }

    return [
      ...new Set(
        values
          .filter(
            (value): value is string =>
              typeof value === "string",
          )
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];
  }

  /**
   * ESCAPE REGEX CHARACTERS
   */
  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
