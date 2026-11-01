
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  Application,
  ApplicationDocument,
  ApplicationStatus,
} from "../schemas/application.schema";

import { CreateApplicationDto } from "../dto/create-application.dto";
import { CareerProfileService } from "./career-profile.service";
import { UpdateApplicationStatusDto } from "../dto/update-application-status.dto";

import {
  ApplicationMethod,
  Job,
  JobDocument,
} from "../schemas/job.schema";

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name)
    private readonly applicationModel: Model<ApplicationDocument>,

    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,

    @Optional()
    private readonly careerProfiles?: CareerProfileService,
  ) {}

  async findAllForUser(userId: string) {
    this.validateObjectId(userId, "user");

    return this.applicationModel
      .find({ userId: new Types.ObjectId(userId) })
      // Recruiter notes are private to the employer.
      .select("-employerNotes")
      .populate("jobId")
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string) {
    this.validateObjectId(id, "application");
    this.validateObjectId(userId, "user");

    const application = await this.applicationModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .select("-employerNotes")
      .populate("jobId")
      .exec();

    if (!application) {
      throw new NotFoundException("Application not found");
    }

    return application;
  }

  async create(userId: string, dto: CreateApplicationDto) {
    this.validateObjectId(userId, "user");
    this.validateObjectId(dto.jobId, "job");

    const job = await this.jobModel
      .findOne({
        _id: new Types.ObjectId(dto.jobId),
        isActive: true,
        isApproved: true,
      })
      .exec();

    if (!job) {
      throw new NotFoundException(
        "Job not found or is no longer accepting applications",
      );
    }

    if (job.applicationMethod === ApplicationMethod.EXTERNAL) {
      throw new BadRequestException(
        "This job accepts applications on the company website only",
      );
    }

    if (
      job.applicationDeadline &&
      new Date(job.applicationDeadline).getTime() < Date.now()
    ) {
      throw new BadRequestException(
        "The application deadline for this job has passed",
      );
    }

    if (
      job.employerId &&
      job.employerId.toString() === userId
    ) {
      throw new BadRequestException(
        "You cannot apply to your own job",
      );
    }

    const existing = await this.applicationModel
      .findOne({
        jobId: new Types.ObjectId(dto.jobId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (existing) {
      throw new BadRequestException(
        "You have already applied to this job",
      );
    }

    // Attach the private resume from the career profile when requested.
    const { useProfileResume, ...fields } = dto;
    let resume: { fileName: string; storageKey: string } | null = null;

    if (useProfileResume) {
      if (!this.careerProfiles) {
        throw new BadRequestException("Resume attachments are not available.");
      }
      resume = await this.careerProfiles.copyResumeForApplication(userId);
    }

    const application = await this.applicationModel.create({
      ...fields,
      ...(resume
        ? { resumeFileName: resume.fileName, resumeStorageKey: resume.storageKey, resumeUrl: undefined }
        : {}),
      jobId: new Types.ObjectId(dto.jobId),
      userId: new Types.ObjectId(userId),
      skills: this.cleanStringArray(dto.skills),
      status: ApplicationStatus.APPLIED,
      statusHistory: [
        {
          status: ApplicationStatus.APPLIED,
          changedAt: new Date(),
          changedBy: new Types.ObjectId(userId),
        },
      ],
    });

    return this.applicationModel
      .findById(application._id)
      .select("-employerNotes")
      .populate("jobId")
      .exec();
  }

  /**
   * @param employerId owner of the job (the employer account)
   * @param actorId    user performing the change (owner or team member)
   */
  async updateStatus(
    id: string,
    employerId: string,
    dto: UpdateApplicationStatusDto,
    actorId: string = employerId,
  ) {
    this.validateObjectId(id, "application");
    this.validateObjectId(employerId, "employer");
    this.validateObjectId(actorId, "user");

    const allowedStatuses: string[] = Object.values(
      ApplicationStatus,
    );

    if (!allowedStatuses.includes(dto.status)) {
      throw new BadRequestException(
        "Invalid application status",
      );
    }

    const application = await this.applicationModel
      .findById(id)
      .exec();

    if (!application) {
      throw new NotFoundException("Application not found");
    }

    const job = await this.jobModel
      .findOne({
        _id: application.jobId,
        employerId: new Types.ObjectId(employerId),
      })
      .exec();

    if (!job) {
      throw new ForbiddenException(
        "You are not authorized to update this application",
      );
    }

    if (application.status !== dto.status) {
      application.status =
        dto.status as ApplicationStatus;

      application.statusHistory = [
        ...(application.statusHistory ?? []),
        {
          status: dto.status,
          changedAt: new Date(),
          changedBy: new Types.ObjectId(actorId),
        },
      ];

      await application.save();
    }

    return this.applicationModel
      .findById(application._id)
      .populate("jobId")
      .exec();
  }

  async findAllForJob(
    jobId: string,
    employerId: string,
  ) {
    this.validateObjectId(jobId, "job");
    this.validateObjectId(employerId, "employer");

    const job = await this.jobModel
      .findOne({
        _id: new Types.ObjectId(jobId),
        employerId: new Types.ObjectId(employerId),
      })
      .exec();

    if (!job) {
      throw new NotFoundException(
        "Job not found or you do not own this job",
      );
    }

    return this.applicationModel
      .find({
        jobId: new Types.ObjectId(jobId),
      })
      .populate("jobId")
      .sort({ createdAt: -1 })
      .exec();
  }

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

  private cleanStringArray(values?: string[]): string[] {
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
}
