import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from '../schemas/job.schema';
import { JobApplication } from '../schemas/job-application.schema';
import { CreateJobDto } from '../dto/create-job.dto';
import { UpdateJobDto } from '../dto/update-job.dto';
import { ApplyJobDto } from '../dto/apply-job.dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name) private jobModel: Model<Job>,
    @InjectModel(JobApplication.name) private applicationModel: Model<JobApplication>,
  ) {}

  findAll(type?: string) {
    const filter: Record<string, unknown> = { active: true };
    if (type && type !== 'all') filter.type = type;
    return this.jobModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const job = await this.jobModel.findById(id).exec();
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  create(dto: CreateJobDto) {
    return this.jobModel.create(dto);
  }

  async update(id: string, dto: UpdateJobDto) {
    const job = await this.jobModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  /** Soft delete — keeps job history/applications intact, just stops it showing on the board. */
  async remove(id: string) {
    const job = await this.jobModel.findByIdAndUpdate(id, { active: false }, { new: true }).exec();
    if (!job) throw new NotFoundException('Job not found');
    return { deactivated: true };
  }

  async apply(jobId: string, dto: ApplyJobDto) {
    await this.findOne(jobId);
    const application = await this.applicationModel.create({
      jobId,
      applicantName: dto.applicantName ?? 'demo-student',
      applicantEmail: dto.applicantEmail,
    });
    return { ok: true, applicationId: application._id };
  }

  findApplicationsForApplicant(applicantName: string) {
    return this.applicationModel.find({ applicantName }).populate('jobId').sort({ createdAt: -1 }).exec();
  }

  /** For the manager's applicant-tracking view. */
  findApplicationsForJob(jobId: string) {
    return this.applicationModel.find({ jobId }).sort({ createdAt: -1 }).exec();
  }
}
