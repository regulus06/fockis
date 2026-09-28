import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Program } from '../../programs/schemas/program.schema';
import { Course } from '../../courses/schemas/course.schema';
import { Enrollment } from '../../courses/schemas/enrollment.schema';
import { Faculty } from '../../faculty/schemas/faculty.schema';
import { Student } from '../../students/schemas/student.schema';
import { CampusEvent } from '../../events/schemas/event.schema';
import { NewsItem } from '../../news/schemas/news.schema';
import { Application } from '../../admissions/schemas/application.schema';
import { Job } from '../../career/schemas/job.schema';
import { JobApplication } from '../../career/schemas/job-application.schema';
import { ContactMessage } from '../../contact/schemas/contact-message.schema';

/**
 * Real, queried-on-demand counts and a merged recent-activity feed for the
 * admin dashboard overview. Deliberately reads models directly (via its own
 * MongooseModule.forFeature registrations) rather than adding a `count()`
 * method to every existing service — that would mean touching nine
 * unrelated modules for one dashboard screen. If any of these counts need
 * to be reused outside the dashboard later, promote that one to its owning
 * service instead.
 */
@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Program.name) private programModel: Model<Program>,
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
    @InjectModel(Faculty.name) private facultyModel: Model<Faculty>,
    @InjectModel(Student.name) private studentModel: Model<Student>,
    @InjectModel(CampusEvent.name) private eventModel: Model<CampusEvent>,
    @InjectModel(NewsItem.name) private newsModel: Model<NewsItem>,
    @InjectModel(Application.name) private applicationModel: Model<Application>,
    @InjectModel(Job.name) private jobModel: Model<Job>,
    @InjectModel(JobApplication.name) private jobApplicationModel: Model<JobApplication>,
    @InjectModel(ContactMessage.name) private contactMessageModel: Model<ContactMessage>,
  ) {}

  async getStats() {
    const [
      programs, courses, enrollments, faculty, students, events, news,
      applications, pendingApplications, jobs, jobApplications,
      contactMessages, newContactMessages,
    ] = await Promise.all([
      this.programModel.countDocuments().exec(),
      this.courseModel.countDocuments().exec(),
      this.enrollmentModel.countDocuments().exec(),
      this.facultyModel.countDocuments().exec(),
      this.studentModel.countDocuments().exec(),
      this.eventModel.countDocuments().exec(),
      this.newsModel.countDocuments().exec(),
      this.applicationModel.countDocuments().exec(),
      this.applicationModel.countDocuments({ status: 'submitted' }).exec(),
      this.jobModel.countDocuments({ active: true }).exec(),
      this.jobApplicationModel.countDocuments().exec(),
      this.contactMessageModel.countDocuments().exec(),
      this.contactMessageModel.countDocuments({ status: 'new' }).exec(),
    ]);

    return {
      programs, courses, enrollments, faculty, students, events, news,
      applications, pendingApplications, jobs, jobApplications,
      contactMessages, newContactMessages,
    };
  }

  /** A unified, timestamp-sorted feed across the collections that represent real activity. */
  async getRecentActivity(limit = 15) {
    const [applications, jobApplications, contactMessages] = await Promise.all([
      this.applicationModel.find().populate('programId').sort({ createdAt: -1 }).limit(limit).exec(),
      this.jobApplicationModel.find().populate('jobId').sort({ createdAt: -1 }).limit(limit).exec(),
      this.contactMessageModel.find().sort({ createdAt: -1 }).limit(limit).exec(),
    ]);

    const events = [
      ...applications.map((a) => ({
        type: 'admissions_application' as const,
        title: `${a.firstName} ${a.lastName} applied to ${(a.programId as any)?.name ?? 'a program'}`,
        status: a.status,
        createdAt: (a as any).createdAt,
        id: a._id,
      })),
      ...jobApplications.map((j) => ({
        type: 'job_application' as const,
        title: `${j.applicantName} applied for ${(j.jobId as any)?.title ?? 'a job'}`,
        status: j.status,
        createdAt: (j as any).createdAt,
        id: j._id,
      })),
      ...contactMessages.map((c) => ({
        type: 'contact_message' as const,
        title: `${c.name} sent a message: "${c.subject}"`,
        status: c.status,
        createdAt: (c as any).createdAt,
        id: c._id,
      })),
    ];

    return events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  }
}
