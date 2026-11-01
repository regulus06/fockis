import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { Job, JobDocument } from "../schemas/job.schema";

import {
  Application,
  ApplicationDocument,
  ApplicationStatus,
} from "../schemas/application.schema";

import {
  EmployerCompany,
  EmployerCompanyDocument,
  EmployerRole,
} from "../schemas/employer-company.schema";

import {
  EmployerInterview,
  EmployerInterviewDocument,
} from "../schemas/employer-interview.schema";

import { CareerProfileService } from "./career-profile.service";

import {
  InterviewFeedbackDto,
  InviteTeamMemberDto,
  RescheduleInterviewDto,
  ScheduleInterviewDto,
  SubmitVerificationDto,
  UpdateCompanyProfileDto,
  UpdateEmployerSettingsDto,
  UpdateTeamMemberDto,
  UpgradeRequestDto,
} from "../dto/employer.dto";

type FilterQuery<T> = Record<string, any>;

/* ============================================================
   TYPES
============================================================ */

export interface EmployerActor {
  userId: string;
  email?: string;
  username?: string;
}

export interface EmployerContext {
  actorId: string;
  ownerId: string;
  role: EmployerRole;
}

type Capability =
  | "read"
  | "manageApplicants"
  | "manageJobs"
  | "manageCompany"
  | "manageTeam"
  | "manageBilling";

const ROLE_CAPABILITIES: Record<EmployerRole, Capability[]> = {
  owner: ["read", "manageApplicants", "manageJobs", "manageCompany", "manageTeam", "manageBilling"],
  admin: ["read", "manageApplicants", "manageJobs", "manageCompany", "manageTeam"],
  recruiter: ["read", "manageApplicants", "manageJobs"],
  hiring_manager: ["read", "manageApplicants"],
};

/** Order of the hiring pipeline, used by the funnel. */
const STAGE_RANK: Record<string, number> = {
  applied: 0,
  viewed: 1,
  shortlisted: 2,
  interview: 3,
  offer: 4,
};

/** "Qualified" = the employer moved the candidate past screening. */
const QUALIFIED_STATUSES = [
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
];

/**
 * Employer plans. Pricing is intentionally not stored here:
 * no payment provider is connected to employer plans yet.
 */
const EMPLOYER_PLANS = [
  {
    id: "free",
    name: "Free",
    description: "Post jobs and manage applicants on Fockis Careers.",
    features: [
      "Unlimited job listings",
      "Fockis and external applications",
      "Applicant tracking and notes",
      "Interview scheduling",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    description: "For teams hiring regularly.",
    features: [
      "Everything in Free",
      "Promoted job listings",
      "Advanced hiring analytics",
      "Priority verification review",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations with custom needs.",
    features: [
      "Everything in Growth",
      "Dedicated account manager",
      "Custom integrations",
      "Volume hiring support",
    ],
  },
];

type LeanJob = Job & { _id: Types.ObjectId; createdAt?: Date; updatedAt?: Date };
type LeanApplication = Application & { _id: Types.ObjectId; createdAt?: Date; updatedAt?: Date };

@Injectable()
export class EmployerService {
  constructor(
    @InjectModel("FockisCareerJob")
    private readonly jobModel: Model<JobDocument>,

    @InjectModel(Application.name)
    private readonly applicationModel: Model<ApplicationDocument>,

    @InjectModel(EmployerCompany.name)
    private readonly companyModel: Model<EmployerCompanyDocument>,

    @InjectModel(EmployerInterview.name)
    private readonly interviewModel: Model<EmployerInterviewDocument>,

    @Optional()
    private readonly careerProfiles?: CareerProfileService,
  ) {}

  /* ============================================================
     CONTEXT + PERMISSIONS
  ============================================================ */

  /**
   * Resolve which employer account the current user acts for.
   *
   * - A user who owns a company (or has none yet) acts as owner.
   * - A user who accepted a team invitation acts for that company.
   */
  async resolveContext(actor: EmployerActor): Promise<EmployerContext> {
    this.assertObjectId(actor.userId, "user");

    const userObjectId = new Types.ObjectId(actor.userId);

    const owned = await this.companyModel
      .exists({ ownerId: userObjectId })
      .exec();

    if (!owned) {
      const membership = await this.companyModel
        .findOne({
          team: { $elemMatch: { userId: userObjectId, status: "active" } },
        })
        .select("ownerId team")
        .lean()
        .exec();

      if (membership) {
        const member = membership.team.find(
          (item) => item.userId?.toString() === actor.userId,
        );

        if (member) {
          return {
            actorId: actor.userId,
            ownerId: membership.ownerId.toString(),
            role: member.role,
          };
        }
      }
    }

    return {
      actorId: actor.userId,
      ownerId: actor.userId,
      role: "owner",
    };
  }

  assertCan(context: EmployerContext, capability: Capability): void {
    if (!ROLE_CAPABILITIES[context.role]?.includes(capability)) {
      throw new ForbiddenException(
        "Your Employer Center role does not allow this action.",
      );
    }
  }

  capabilitiesFor(role: EmployerRole): Capability[] {
    return ROLE_CAPABILITIES[role] ?? [];
  }

  /* ============================================================
     ME
  ============================================================ */

  async getMe(actor: EmployerActor) {
    const context = await this.resolveContext(actor);
    const company = await this.findCompany(context.ownerId);

    const invitations = actor.email
      ? await this.findPendingInvitations(actor.email)
      : [];

    const jobIds = await this.jobModel
      .find({ employerId: new Types.ObjectId(context.ownerId) })
      .distinct("_id")
      .exec();

    const unreviewedApplications = jobIds.length
      ? await this.applicationModel
          .countDocuments({ jobId: { $in: jobIds }, status: ApplicationStatus.APPLIED })
          .exec()
      : 0;

    return {
      user: {
        id: actor.userId,
        email: actor.email ?? null,
        username: actor.username ?? null,
      },
      role: context.role,
      capabilities: this.capabilitiesFor(context.role),
      isOwner: context.role === "owner",
      company: company ? this.serializeCompany(company) : null,
      pendingInvitations: invitations,
      unreviewedApplications,
    };
  }

  /* ============================================================
     DASHBOARD
  ============================================================ */

  async getDashboard(actor: EmployerActor, days = 30) {
    const context = await this.resolveContext(actor);
    const range = this.clampDays(days);

    const jobs = await this.findOwnerJobs(context.ownerId);
    const jobIds = jobs.map((job) => job._id);
    const jobById = new Map(jobs.map((job) => [job._id.toString(), job]));

    const applications = await this.applicationModel
      .find({ jobId: { $in: jobIds } })
      .select("jobId fullName status statusHistory createdAt")
      .sort({ createdAt: -1 })
      .lean<LeanApplication[]>()
      .exec();

    const now = Date.now();
    const weekAgo = now - 7 * 86_400_000;

    const activeJobs = jobs.filter((job) => this.jobStatus(job) === "active");
    const qualified = applications.filter((app) =>
      QUALIFIED_STATUSES.includes(app.status),
    );

    const countByJob = this.countBy(applications, (app) => app.jobId.toString());

    const byType: Record<string, number> = { job: 0, internship: 0, coop: 0 };
    for (const app of applications) {
      const type = jobById.get(app.jobId.toString())?.type ?? "job";
      byType[type] = (byType[type] ?? 0) + 1;
    }

    const upcomingInterviews = await this.interviewModel
      .countDocuments({
        ownerId: new Types.ObjectId(context.ownerId),
        status: "scheduled",
        startsAt: { $gte: new Date() },
      })
      .exec();

    const recentInterviews = await this.interviewModel
      .find({ ownerId: new Types.ObjectId(context.ownerId) })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
      .exec();

    return {
      rangeDays: range,
      stats: {
        activeJobs: activeJobs.length,
        totalJobs: jobs.length,
        pendingApprovalJobs: jobs.filter((job) => this.jobStatus(job) === "pending_approval").length,
        newJobsThisWeek: jobs.filter((job) => this.time(job.createdAt) >= weekAgo).length,
        applications: applications.length,
        newApplicationsThisWeek: applications.filter((app) => this.time(app.createdAt) >= weekAgo).length,
        qualified: qualified.length,
        newQualifiedThisWeek: qualified.filter((app) => this.lastStatusChange(app) >= weekAgo).length,
        jobViews: jobs.reduce((sum, job) => sum + Number(job.viewCount ?? 0), 0),
        upcomingInterviews,
      },
      applicationTrend: this.dailySeries(applications, range),
      applicationsByType: [
        { type: "job", label: "Job", count: byType.job ?? 0 },
        { type: "internship", label: "Internship", count: byType.internship ?? 0 },
        { type: "coop", label: "Co-op", count: byType.coop ?? 0 },
      ],
      recentJobs: jobs.slice(0, 5).map((job) =>
        this.serializeJob(job, countByJob.get(job._id.toString()) ?? 0),
      ),
      recentActivity: this.buildActivity(applications, recentInterviews, jobById).slice(0, 8),
    };
  }

  /* ============================================================
     JOBS
  ============================================================ */

  async listJobs(
    actor: EmployerActor,
    query: { search?: string; type?: string; status?: string; page?: number; limit?: number },
  ) {
    const context = await this.resolveContext(actor);
    const jobs = await this.findOwnerJobs(context.ownerId);

    const counts = await this.applicationCountsByJob(jobs.map((job) => job._id));

    const search = query.search?.trim().toLowerCase();

    const filtered = jobs
      .map((job) => this.serializeJob(job, counts.get(job._id.toString()) ?? 0))
      .filter((job) => {
        if (search) {
          const haystack = `${job.title} ${job.location} ${job.company}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        if (query.type && query.type !== "all" && job.type !== query.type) return false;
        if (query.status && query.status !== "all" && job.status !== query.status) return false;
        return true;
      });

    const statusCounts = this.countBy(
      jobs.map((job) => this.jobStatus(job)),
      (status) => status,
    );

    return {
      ...this.paginate(filtered, query.page, query.limit),
      statusCounts: Object.fromEntries(statusCounts),
    };
  }

  async getJob(actor: EmployerActor, jobId: string) {
    const context = await this.resolveContext(actor);
    const job = await this.findOwnerJob(context.ownerId, jobId);

    const applications = await this.applicationModel
      .find({ jobId: job._id })
      .select("status")
      .lean()
      .exec();

    const pipeline = this.countBy(applications, (app) => app.status);

    return {
      ...this.serializeJob(job, applications.length),
      pipeline: Object.fromEntries(pipeline),
    };
  }

  async setJobActive(actor: EmployerActor, jobId: string, isActive: boolean) {
    const context = await this.resolveContext(actor);
    this.assertCan(context, "manageJobs");

    const job = await this.jobModel
      .findOneAndUpdate(
        {
          _id: this.toObjectId(jobId, "job"),
          employerId: new Types.ObjectId(context.ownerId),
        },
        { $set: { isActive } },
        { new: true },
      )
      .lean<LeanJob>()
      .exec();

    if (!job) {
      throw new NotFoundException("Job not found or you do not own this job");
    }

    const count = await this.applicationModel.countDocuments({ jobId: job._id }).exec();

    return this.serializeJob(job, count);
  }

  /* ============================================================
     APPLICANTS
  ============================================================ */

  async listApplicants(
    actor: EmployerActor,
    query: { search?: string; jobId?: string; status?: string; page?: number; limit?: number },
  ) {
    const context = await this.resolveContext(actor);
    const jobs = await this.findOwnerJobs(context.ownerId);
    const jobById = new Map(jobs.map((job) => [job._id.toString(), job]));

    let jobIds = jobs.map((job) => job._id);

    if (query.jobId && query.jobId !== "all") {
      if (!jobById.has(query.jobId)) {
        throw new NotFoundException("Job not found or you do not own this job");
      }
      jobIds = [new Types.ObjectId(query.jobId)];
    }

    const base: FilterQuery<ApplicationDocument> = { jobId: { $in: jobIds } };

    const filter: FilterQuery<ApplicationDocument> = { ...base };

    if (query.status && query.status !== "all") {
      filter.status = this.assertApplicationStatus(query.status);
    }

    const search = query.search?.trim();
    if (search) {
      const pattern = new RegExp(this.escapeRegex(search), "i");
      filter.$or = [
        { fullName: pattern },
        { email: pattern },
        { skills: pattern },
        { location: pattern },
      ];
    }

    const { page, limit } = this.pageParams(query.page, query.limit);

    const [items, total, statusGroups] = await Promise.all([
      this.applicationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("userId", "profilePicture username firstName lastName")
        .lean<LeanApplication[]>()
        .exec(),
      this.applicationModel.countDocuments(filter).exec(),
      this.applicationModel
        .aggregate<{ _id: string; count: number }>([
          { $match: base },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ])
        .exec(),
    ]);

    const weekAgo = Date.now() - 7 * 86_400_000;
    const newCount = await this.applicationModel
      .countDocuments({ ...base, createdAt: { $gte: new Date(weekAgo) } })
      .exec();

    const statusCounts: Record<string, number> = {};
    let all = 0;
    for (const group of statusGroups) {
      statusCounts[group._id] = group.count;
      all += group.count;
    }

    return {
      items: items.map((app) => this.serializeApplicantRow(app, jobById)),
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      counts: { all, newThisWeek: newCount, ...statusCounts },
    };
  }

  async getApplicant(actor: EmployerActor, applicationId: string) {
    const context = await this.resolveContext(actor);
    const application = await this.findOwnerApplication(context.ownerId, applicationId, true);
    const job = await this.jobModel.findById(application.jobId).lean<LeanJob>().exec();

    const interviews = await this.interviewModel
      .find({ applicationId: application._id })
      .sort({ startsAt: -1 })
      .lean()
      .exec();

    // First employer open marks the application as viewed.
    if (application.status === ApplicationStatus.APPLIED) {
      await this.applicationModel
        .updateOne(
          { _id: application._id, status: ApplicationStatus.APPLIED },
          {
            $set: { status: ApplicationStatus.VIEWED },
            $push: {
              statusHistory: {
                status: ApplicationStatus.VIEWED,
                changedAt: new Date(),
                changedBy: new Types.ObjectId(context.actorId),
              },
            },
          },
        )
        .exec();

      application.status = ApplicationStatus.VIEWED;
      application.statusHistory = [
        ...(application.statusHistory ?? []),
        {
          status: ApplicationStatus.VIEWED,
          changedAt: new Date(),
          changedBy: new Types.ObjectId(context.actorId),
        },
      ];
    }

    const user = this.populatedUser(application.userId);

    // Resumes attached from a career profile are private: hand out a
    // short-lived signed link only to the employer that owns the job.
    let resumeUrl = application.resumeUrl ?? null;
    if (application.resumeStorageKey && this.careerProfiles) {
      resumeUrl = await this.careerProfiles
        .signedUrl(application.resumeStorageKey, application.resumeFileName ?? "resume")
        .catch(() => null);
    }

    return {
      id: application._id.toString(),
      candidateUserId: user.id,
      fullName: application.fullName,
      email: application.email,
      phone: application.phone,
      location: application.location,
      profilePicture: user.profilePicture,
      linkedInUrl: application.linkedInUrl ?? null,
      resumeFileName: application.resumeFileName ?? null,
      resumeUrl,
      education: application.education ?? null,
      experience: application.experience ?? null,
      skills: application.skills ?? [],
      coverLetter: application.coverLetter ?? null,
      workAuthorized: application.workAuthorized,
      availableStartDate: application.availableStartDate ?? null,
      answers: application.answers ?? {},
      status: application.status,
      appliedAt: application.createdAt ?? null,
      job: job
        ? {
            id: job._id.toString(),
            title: job.title,
            type: job.type,
            location: this.jobLocation(job),
          }
        : null,
      statusHistory: (application.statusHistory ?? []).map((entry) => ({
        status: entry.status,
        changedAt: entry.changedAt,
      })),
      notes: (application.employerNotes ?? [])
        .slice()
        .sort((a, b) => this.time(b.createdAt) - this.time(a.createdAt))
        .map((note) => ({
          id: note._id?.toString() ?? "",
          body: note.body,
          authorName: note.authorName ?? "Team member",
          createdAt: note.createdAt,
        })),
      interviews: interviews.map((item) => this.serializeInterview(item)),
    };
  }

  async addApplicantNote(actor: EmployerActor, applicationId: string, body: string) {
    const context = await this.resolveContext(actor);
    this.assertCan(context, "manageApplicants");

    const text = body.trim();
    if (!text) {
      throw new BadRequestException("Note cannot be empty");
    }

    const application = await this.findOwnerApplication(context.ownerId, applicationId);

    await this.applicationModel
      .updateOne(
        { _id: application._id },
        {
          $push: {
            employerNotes: {
              body: text,
              authorId: new Types.ObjectId(context.actorId),
              authorName: actor.username ?? actor.email ?? "Team member",
              createdAt: new Date(),
            },
          },
        },
      )
      .exec();

    return this.getApplicant(actor, applicationId);
  }

  /* ============================================================
     CANDIDATES
     Only people who applied to this employer's jobs.
  ============================================================ */

  async listCandidates(
    actor: EmployerActor,
    query: {
      search?: string;
      location?: string;
      experience?: string;
      education?: string;
      availability?: string;
      saved?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const context = await this.resolveContext(actor);
    const jobs = await this.findOwnerJobs(context.ownerId);
    const jobById = new Map(jobs.map((job) => [job._id.toString(), job]));

    const company = await this.findCompany(context.ownerId);
    const saved = new Set((company?.savedCandidates ?? []).map((id) => id.toString()));

    const applications = await this.applicationModel
      .find({ jobId: { $in: jobs.map((job) => job._id) } })
      .select("userId fullName email location skills education experience availableStartDate status jobId createdAt linkedInUrl")
      .sort({ createdAt: -1 })
      .populate("userId", "profilePicture username")
      .lean<LeanApplication[]>()
      .exec();

    type Candidate = {
      userId: string;
      fullName: string;
      email: string;
      location: string;
      profilePicture: string | null;
      skills: string[];
      education: LeanApplication["education"] | null;
      experience: LeanApplication["experience"] | null;
      availableStartDate: string | null;
      latestApplicationId: string;
      latestStatus: string;
      appliedJobs: { id: string; title: string }[];
      lastAppliedAt: Date | null;
      saved: boolean;
    };

    const byUser = new Map<string, Candidate>();

    for (const app of applications) {
      const user = this.populatedUser(app.userId);
      if (!user.id) continue;

      const job = jobById.get(app.jobId.toString());
      const existing = byUser.get(user.id);

      if (existing) {
        if (job && !existing.appliedJobs.some((item) => item.id === job._id.toString())) {
          existing.appliedJobs.push({ id: job._id.toString(), title: job.title });
        }
        existing.skills = [...new Set([...existing.skills, ...(app.skills ?? [])])];
        continue;
      }

      byUser.set(user.id, {
        userId: user.id,
        fullName: app.fullName,
        email: app.email,
        location: app.location,
        profilePicture: user.profilePicture,
        skills: app.skills ?? [],
        education: app.education ?? null,
        experience: app.experience ?? null,
        availableStartDate: app.availableStartDate ?? null,
        latestApplicationId: app._id.toString(),
        latestStatus: app.status,
        appliedJobs: job ? [{ id: job._id.toString(), title: job.title }] : [],
        lastAppliedAt: app.createdAt ?? null,
        saved: saved.has(user.id),
      });
    }

    const search = query.search?.trim().toLowerCase();
    const location = query.location?.trim().toLowerCase();
    const education = query.education?.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30 = today.getTime() + 30 * 86_400_000;

    const candidates = [...byUser.values()].filter((candidate) => {
      if (search) {
        const haystack = [
          candidate.fullName,
          candidate.skills.join(" "),
          candidate.experience?.roleTitle ?? "",
          candidate.education?.major ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      if (location && !candidate.location.toLowerCase().includes(location)) return false;

      if (query.experience === "with" && !candidate.experience) return false;
      if (query.experience === "without" && candidate.experience) return false;

      if (education) {
        const text = `${candidate.education?.school ?? ""} ${candidate.education?.major ?? ""}`.toLowerCase();
        if (!text.includes(education)) return false;
      }

      if (query.availability && query.availability !== "any") {
        const start = candidate.availableStartDate
          ? new Date(candidate.availableStartDate).getTime()
          : NaN;
        if (query.availability === "now" && !(Number.isFinite(start) && start <= today.getTime())) return false;
        if (query.availability === "30days" && !(Number.isFinite(start) && start <= in30)) return false;
        if (query.availability === "later" && !(Number.isFinite(start) && start > in30)) return false;
      }

      if (query.saved === "true" && !candidate.saved) return false;

      return true;
    });

    return this.paginate(candidates, query.page, query.limit ?? 12);
  }

  async setCandidateSaved(actor: EmployerActor, candidateUserId: string, saved: boolean) {
    const context = await this.resolveContext(actor);
    this.assertCan(context, "manageApplicants");

    const candidateId = this.toObjectId(candidateUserId, "candidate");

    // Only candidates who applied to this employer can be saved.
    const jobs = await this.findOwnerJobs(context.ownerId);
    const applied = await this.applicationModel
      .exists({ userId: candidateId, jobId: { $in: jobs.map((job) => job._id) } })
      .exec();

    if (!applied) {
      throw new NotFoundException("Candidate not found");
    }

    await this.ensureCompany(context.ownerId);

    await this.companyModel
      .updateOne(
        { ownerId: new Types.ObjectId(context.ownerId) },
        saved
          ? { $addToSet: { savedCandidates: candidateId } }
          : { $pull: { savedCandidates: candidateId } },
      )
      .exec();

    return { userId: candidateUserId, saved };
  }

  /* ============================================================
     INTERVIEWS
  ============================================================ */

  async listInterviews(actor: EmployerActor, query: { view?: string }) {
    const context = await this.resolveContext(actor);
    const filter: FilterQuery<EmployerInterviewDocument> = {
      ownerId: new Types.ObjectId(context.ownerId),
    };

    const now = new Date();

    if (query.view === "upcoming") {
      filter.status = "scheduled";
      filter.startsAt = { $gte: now };
    } else if (query.view === "completed") {
      filter.status = "completed";
    } else if (query.view === "scheduled") {
      filter.status = "scheduled";
    } else if (query.view === "cancelled") {
      filter.status = "cancelled";
    }

    const items = await this.interviewModel
      .find(filter)
      .sort({ startsAt: query.view === "completed" ? -1 : 1 })
      .limit(500)
      .lean()
      .exec();

    const counts = await this.interviewModel
      .aggregate<{ _id: string; count: number }>([
        { $match: { ownerId: new Types.ObjectId(context.ownerId) } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .exec();

    const upcoming = await this.interviewModel
      .countDocuments({
        ownerId: new Types.ObjectId(context.ownerId),
        status: "scheduled",
        startsAt: { $gte: now },
      })
      .exec();

    return {
      items: items.map((item) => this.serializeInterview(item)),
      counts: {
        upcoming,
        ...Object.fromEntries(counts.map((group) => [group._id, group.count])),
      },
    };
  }

  async scheduleInterview(actor: EmployerActor, dto: ScheduleInterviewDto) {
    const context = await this.resolveContext(actor);
    this.assertCan(context, "manageApplicants");

    const application = await this.findOwnerApplication(context.ownerId, dto.applicationId);
    const job = await this.jobModel.findById(application.jobId).lean<LeanJob>().exec();

    const startsAt = this.parseFutureDate(dto.startsAt);

    if (application.status === ApplicationStatus.REJECTED) {
      throw new BadRequestException("Cannot schedule an interview for a rejected application");
    }

    const interview = await this.interviewModel.create({
      ownerId: new Types.ObjectId(context.ownerId),
      applicationId: application._id,
      jobId: application.jobId,
      candidateUserId: application.userId,
      candidateName: application.fullName,
      candidateEmail: application.email,
      jobTitle: job?.title ?? "Job",
      startsAt,
      durationMinutes: dto.durationMinutes ?? 30,
      timezone: dto.timezone?.trim() || "UTC",
      type: dto.type,
      meetingUrl: dto.meetingUrl?.trim() || undefined,
      location: dto.location?.trim() || undefined,
      notes: dto.notes?.trim() || undefined,
      status: "scheduled",
      createdBy: new Types.ObjectId(context.actorId),
    });

    if (application.status !== ApplicationStatus.INTERVIEW) {
      await this.applicationModel
        .updateOne(
          { _id: application._id },
          {
            $set: { status: ApplicationStatus.INTERVIEW },
            $push: {
              statusHistory: {
                status: ApplicationStatus.INTERVIEW,
                changedAt: new Date(),
                changedBy: new Types.ObjectId(context.actorId),
              },
            },
          },
        )
        .exec();
    }

    return this.serializeInterview(interview.toObject());
  }

  async rescheduleInterview(actor: EmployerActor, interviewId: string, dto: RescheduleInterviewDto) {
    const context = await this.resolveContext(actor);
    this.assertCan(context, "manageApplicants");

    const interview = await this.findOwnerInterview(context.ownerId, interviewId);

    if (interview.status !== "scheduled") {
      throw new BadRequestException("Only scheduled interviews can be changed");
    }

    if (dto.startsAt !== undefined) interview.startsAt = this.parseFutureDate(dto.startsAt);
    if (dto.durationMinutes !== undefined) interview.durationMinutes = dto.durationMinutes;
    if (dto.timezone !== undefined) interview.timezone = dto.timezone.trim() || "UTC";
    if (dto.type !== undefined) interview.type = dto.type;
    if (dto.meetingUrl !== undefined) interview.meetingUrl = dto.meetingUrl.trim() || undefined;
    if (dto.location !== undefined) interview.location = dto.location.trim() || undefined;
    if (dto.notes !== undefined) interview.notes = dto.notes.trim() || undefined;

    if (interview.type === "video" && !interview.meetingUrl) {
      throw new BadRequestException("A meeting link is required for video interviews");
    }
    if (interview.type === "onsite" && !interview.location) {
      throw new BadRequestException("A location is required for on-site interviews");
    }

    await interview.save();

    return this.serializeInterview(interview.toObject());
  }

  async cancelInterview(actor: EmployerActor, interviewId: string) {
    const context = await this.resolveContext(actor);
    this.assertCan(context, "manageApplicants");

    const interview = await this.findOwnerInterview(context.ownerId, interviewId);

    if (interview.status !== "scheduled") {
      throw new BadRequestException("Only scheduled interviews can be cancelled");
    }

    interview.status = "cancelled";
    await interview.save();

    return this.serializeInterview(interview.toObject());
  }

  async submitInterviewFeedback(actor: EmployerActor, interviewId: string, dto: InterviewFeedbackDto) {
    const context = await this.resolveContext(actor);
    this.assertCan(context, "manageApplicants");

    const interview = await this.findOwnerInterview(context.ownerId, interviewId);

    if (interview.status === "cancelled") {
      throw new BadRequestException("Cannot add feedback to a cancelled interview");
    }

    interview.status = "completed";
    interview.feedback = {
      rating: dto.rating,
      recommendation: dto.recommendation,
      comments: dto.comments?.trim() || undefined,
      submittedBy: new Types.ObjectId(context.actorId),
      submittedAt: new Date(),
    };

    await interview.save();

    return this.serializeInterview(interview.toObject());
  }

  /* ============================================================
     COMPANY PROFILE
  ============================================================ */

  async getProfile(actor: EmployerActor) {
    const context = await this.resolveContext(actor);
    const company = await this.findCompany(context.ownerId);

    const jobs = await this.findOwnerJobs(context.ownerId);

    return {
      company: company ? this.serializeCompany(company) : null,
      openJobs: jobs.filter((job) => this.jobStatus(job) === "active").length,
      // Fallback name the employer already used on job listings.
      suggestedCompanyName: jobs[0]?.company ?? "",
    };
  }

  async updateProfile(actor: EmployerActor, dto: UpdateCompanyProfileDto) {
    const context = await this.resolveContext(actor);
    this.assertCan(context, "manageCompany");

    await this.ensureCompany(context.ownerId);

    const set: Record<string, unknown> = {
      companyName: dto.companyName.trim(),
    };

    const optional: (keyof UpdateCompanyProfileDto)[] = [
      "industry",
      "companySize",
      "website",
      "foundedYear",
      "country",
      "city",
      "stateProvince",
      "tagline",
      "about",
      "logoUrl",
      "coverImageUrl",
    ];

    for (const key of optional) {
      const value = dto[key];
      if (value !== undefined) {
        set[key] = typeof value === "string" ? value.trim() : value;
      }
    }

    if (dto.socialLinks) {
      for (const [key, value] of Object.entries(dto.socialLinks)) {
        set[`socialLinks.${key}`] = typeof value === "string" ? value.trim() : value;
      }
    }

    if (dto.media) {
      set.media = dto.media.map((item) => ({
        url: item.url.trim(),
        caption: item.caption?.trim() || undefined,
        addedAt: new Date(),
      }));
    }

    const company = await this.companyModel
      .findOneAndUpdate(
        { ownerId: new Types.ObjectId(context.ownerId) },
        { $set: set },
        { new: true, runValidators: true },
      )
      .lean()
      .exec();

    if (!company) {
      throw new NotFoundException("Company profile not found");
    }

    return { company: this.serializeCompany(company) };
  }

  /* ============================================================
     VERIFICATION
  ============================================================ */

  async getVerification(actor: EmployerActor) {
    const context = await this.resolveContext(actor);
    const company = await this.findCompany(context.ownerId);

    return {
      verification: company?.verification ?? { status: "not_submitted", documents: [] },
      history: (company?.verificationHistory ?? [])
        .slice()
        .sort((a, b) => this.time(b.at) - this.time(a.at)),
      companyName: company?.companyName ?? "",
      website: company?.website ?? "",
    };
  }

  async submitVerification(actor: EmployerActor, dto: SubmitVerificationDto) {
    const context = await this.resolveContext(actor);
    this.assertCan(context, "manageCompany");

    const company = await this.ensureCompany(context.ownerId);

    if (company.verification?.status === "pending") {
      throw new ConflictException("A verification request is already under review");
    }

    if (company.verification?.status === "approved") {
      throw new ConflictException("Your company is already verified");
    }

    if (!dto.documents.length) {
      throw new BadRequestException("Upload at least one business document");
    }

    const now = new Date();

    await this.companyModel
      .updateOne(
        { _id: company._id },
        {
          $set: {
            verification: {
              status: "pending",
              legalName: dto.legalName.trim(),
              businessEmail: dto.businessEmail.trim().toLowerCase(),
              website: dto.website.trim(),
              registrationNumber: dto.registrationNumber?.trim() || undefined,
              documents: dto.documents.map((doc) => ({ name: doc.name.trim(), url: doc.url.trim() })),
              submittedAt: now,
            },
          },
          $push: {
            verificationHistory: {
              status: "pending",
              note: "Verification request submitted",
              at: now,
            },
          },
        },
      )
      .exec();

    return this.getVerification(actor);
  }

  /* ============================================================
     TEAM
  ============================================================ */

  async getTeam(actor: EmployerActor) {
    const context = await this.resolveContext(actor);
    const company = await this.findCompany(context.ownerId);

    return {
      owner: {
        userId: context.ownerId,
        isYou: context.ownerId === actor.userId,
      },
      yourRole: context.role,
      members: (company?.team ?? []).map((member) => ({
        id: member._id.toString(),
        email: member.email,
        name: member.name ?? null,
        role: member.role,
        status: member.status,
        invitedAt: member.invitedAt,
        joinedAt: member.joinedAt ?? null,
        isYou: member.userId?.toString() === actor.userId,
      })),
    };
  }

  async inviteTeamMember(actor: EmployerActor, dto: InviteTeamMemberDto) {
    const context = await this.resolveContext(actor);
    this.assertCan(context, "manageTeam");

    const email = dto.email.trim().toLowerCase();

    if (context.role === "owner" && actor.email?.toLowerCase() === email) {
      throw new BadRequestException("You are already the owner of this Employer Center");
    }

    const company = await this.ensureCompany(context.ownerId);

    if (company.team.some((member) => member.email === email)) {
      throw new ConflictException("This person is already on your team or has a pending invitation");
    }

    if (company.team.length >= 50) {
      throw new BadRequestException("Team member limit reached");
    }

    await this.companyModel
      .updateOne(
        { _id: company._id },
        {
          $push: {
            team: {
              email,
              name: dto.name?.trim() || undefined,
              role: dto.role,
              status: "invited",
              invitedBy: new Types.ObjectId(context.actorId),
              invitedAt: new Date(),
            },
          },
        },
      )
      .exec();

    return this.getTeam(actor);
  }

  async updateTeamMember(actor: EmployerActor, memberId: string, dto: UpdateTeamMemberDto) {
    const context = await this.resolveContext(actor);
    this.assertCan(context, "manageTeam");

    const result = await this.companyModel
      .updateOne(
        {
          ownerId: new Types.ObjectId(context.ownerId),
          "team._id": this.toObjectId(memberId, "team member"),
        },
        { $set: { "team.$.role": dto.role } },
      )
      .exec();

    if (!result.matchedCount) {
      throw new NotFoundException("Team member not found");
    }

    return this.getTeam(actor);
  }

  async removeTeamMember(actor: EmployerActor, memberId: string) {
    const context = await this.resolveContext(actor);
    this.assertCan(context, "manageTeam");

    const result = await this.companyModel
      .updateOne(
        { ownerId: new Types.ObjectId(context.ownerId) },
        { $pull: { team: { _id: this.toObjectId(memberId, "team member") } } },
      )
      .exec();

    if (!result.modifiedCount) {
      throw new NotFoundException("Team member not found");
    }

    return this.getTeam(actor);
  }

  async acceptInvitation(actor: EmployerActor, companyId: string) {
    if (!actor.email) {
      throw new BadRequestException("Your account has no email address");
    }

    const email = actor.email.toLowerCase();

    const result = await this.companyModel
      .updateOne(
        {
          _id: this.toObjectId(companyId, "company"),
          team: { $elemMatch: { email, status: "invited" } },
        },
        {
          $set: {
            "team.$.status": "active",
            "team.$.userId": new Types.ObjectId(actor.userId),
            "team.$.joinedAt": new Date(),
          },
        },
      )
      .exec();

    if (!result.matchedCount) {
      throw new NotFoundException("Invitation not found");
    }

    return this.getMe(actor);
  }

  /* ============================================================
     ANALYTICS
  ============================================================ */

  async getAnalytics(actor: EmployerActor, query: { from?: string; to?: string }) {
    const context = await this.resolveContext(actor);

    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 29 * 86_400_000);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new BadRequestException("Invalid date range");
    }

    const fromStart = new Date(from);
    fromStart.setHours(0, 0, 0, 0);
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);

    const days = Math.min(366, Math.round((toEnd.getTime() - fromStart.getTime()) / 86_400_000));

    const jobs = await this.findOwnerJobs(context.ownerId);
    const jobIds = jobs.map((job) => job._id);

    const allApplications = await this.applicationModel
      .find({ jobId: { $in: jobIds } })
      .select("jobId status statusHistory createdAt")
      .lean<LeanApplication[]>()
      .exec();

    const inRange = allApplications.filter((app) => {
      const time = this.time(app.createdAt);
      return time >= fromStart.getTime() && time <= toEnd.getTime();
    });

    const totalViews = jobs.reduce((sum, job) => sum + Number(job.viewCount ?? 0), 0);
    const qualified = inRange.filter((app) => QUALIFIED_STATUSES.includes(app.status));

    const perJob = jobs.map((job) => {
      const apps = inRange.filter((app) => app.jobId.toString() === job._id.toString());
      const lifetimeApps = allApplications.filter((app) => app.jobId.toString() === job._id.toString()).length;
      const views = Number(job.viewCount ?? 0);
      return {
        jobId: job._id.toString(),
        title: job.title,
        type: job.type,
        status: this.jobStatus(job),
        applicationMethod: job.applicationMethod ?? "fockis",
        views,
        applications: apps.length,
        qualified: apps.filter((app) => QUALIFIED_STATUSES.includes(app.status)).length,
        // Lifetime, to match lifetime view counts.
        conversionRate: views > 0 ? this.round((lifetimeApps / views) * 100) : null,
      };
    });

    // Furthest stage each application reached.
    const reached = inRange.map((app) => {
      const statuses = [app.status, ...(app.statusHistory ?? []).map((entry) => entry.status)];
      return Math.max(...statuses.map((status) => STAGE_RANK[status] ?? 0));
    });

    const funnel = [
      { stage: "applied", label: "Applied", count: inRange.length },
      { stage: "viewed", label: "Reviewed", count: reached.filter((rank) => rank >= 1).length },
      { stage: "shortlisted", label: "Shortlisted", count: reached.filter((rank) => rank >= 2).length },
      { stage: "interview", label: "Interview", count: reached.filter((rank) => rank >= 3).length },
      { stage: "offer", label: "Offer", count: reached.filter((rank) => rank >= 4).length },
    ];

    const externalJobs = jobs.filter((job) => job.applicationMethod === "external");

    return {
      range: { from: fromStart, to: toEnd },
      totals: {
        // View counts are lifetime totals: per-day views are not recorded.
        jobViews: totalViews,
        jobViewsScope: "lifetime",
        applications: inRange.length,
        qualified: qualified.length,
        conversionRate:
          totalViews > 0
            ? this.round((allApplications.length / totalViews) * 100)
            : null,
        conversionScope: "lifetime",
      },
      applicationsOverTime: this.dailySeries(inRange, days + 1, toEnd),
      jobPerformance: perJob.sort((a, b) => b.applications - a.applications),
      topJobs: perJob
        .filter((job) => job.applications > 0)
        .sort((a, b) => b.applications - a.applications)
        .slice(0, 5),
      funnel,
      sources: {
        fockisApplications: inRange.length,
        externalListings: externalJobs.length,
        externalViews: externalJobs.reduce((sum, job) => sum + Number(job.viewCount ?? 0), 0),
      },
    };
  }

  /* ============================================================
     BILLING
  ============================================================ */

  async getBilling(actor: EmployerActor) {
    const context = await this.resolveContext(actor);
    const company = await this.findCompany(context.ownerId);

    const plan = company?.billing?.plan ?? "free";
    const requests = (company?.billing?.upgradeRequests ?? [])
      .slice()
      .sort((a, b) => this.time(b.requestedAt) - this.time(a.requestedAt));

    return {
      paymentsConnected: false,
      currentPlan: EMPLOYER_PLANS.find((item) => item.id === plan) ?? EMPLOYER_PLANS[0],
      plans: EMPLOYER_PLANS,
      pendingUpgrade: requests.find((item) => item.status === "requested") ?? null,
      upgradeRequests: requests,
      invoices: [],
      paymentMethods: [],
      canManage: this.capabilitiesFor(context.role).includes("manageBilling"),
    };
  }

  async requestUpgrade(actor: EmployerActor, dto: UpgradeRequestDto) {
    const context = await this.resolveContext(actor);
    this.assertCan(context, "manageBilling");

    const company = await this.ensureCompany(context.ownerId);

    if (company.billing?.upgradeRequests?.some((item) => item.status === "requested")) {
      throw new ConflictException("You already have a pending plan request");
    }

    if (company.billing?.plan === dto.plan) {
      throw new BadRequestException("You are already on this plan");
    }

    await this.companyModel
      .updateOne(
        { _id: company._id },
        {
          $push: {
            "billing.upgradeRequests": {
              plan: dto.plan,
              status: "requested",
              requestedAt: new Date(),
            },
          },
        },
      )
      .exec();

    return this.getBilling(actor);
  }

  async cancelUpgradeRequest(actor: EmployerActor) {
    const context = await this.resolveContext(actor);
    this.assertCan(context, "manageBilling");

    const result = await this.companyModel
      .updateOne(
        {
          ownerId: new Types.ObjectId(context.ownerId),
          "billing.upgradeRequests.status": "requested",
        },
        {
          $set: {
            "billing.upgradeRequests.$.status": "cancelled",
            "billing.upgradeRequests.$.cancelledAt": new Date(),
          },
        },
      )
      .exec();

    if (!result.matchedCount) {
      throw new NotFoundException("No pending plan request");
    }

    return this.getBilling(actor);
  }

  /* ============================================================
     SETTINGS
  ============================================================ */

  async getSettings(actor: EmployerActor) {
    const context = await this.resolveContext(actor);
    const company = await this.findCompany(context.ownerId);

    return {
      companyName: company?.companyName ?? "",
      website: company?.website ?? "",
      contactEmail: company?.settings?.contactEmail ?? actor.email ?? "",
      timezone: company?.settings?.timezone ?? "UTC",
      notifications: {
        newApplications: company?.settings?.notifications?.newApplications ?? true,
        applicationStatusChanges: company?.settings?.notifications?.applicationStatusChanges ?? true,
        interviewReminders: company?.settings?.notifications?.interviewReminders ?? true,
        weeklySummary: company?.settings?.notifications?.weeklySummary ?? false,
        productUpdates: company?.settings?.notifications?.productUpdates ?? false,
      },
      canManage: this.capabilitiesFor(context.role).includes("manageCompany"),
    };
  }

  async updateSettings(actor: EmployerActor, dto: UpdateEmployerSettingsDto) {
    const context = await this.resolveContext(actor);
    this.assertCan(context, "manageCompany");

    await this.ensureCompany(context.ownerId);

    const set: Record<string, unknown> = {};

    if (dto.companyName !== undefined) set.companyName = dto.companyName.trim();
    if (dto.website !== undefined) set.website = dto.website.trim();
    if (dto.contactEmail !== undefined) set["settings.contactEmail"] = dto.contactEmail.trim().toLowerCase();
    if (dto.timezone !== undefined) set["settings.timezone"] = dto.timezone.trim() || "UTC";

    if (dto.notifications) {
      for (const [key, value] of Object.entries(dto.notifications)) {
        if (typeof value === "boolean") {
          set[`settings.notifications.${key}`] = value;
        }
      }
    }

    if (Object.keys(set).length) {
      await this.companyModel
        .updateOne({ ownerId: new Types.ObjectId(context.ownerId) }, { $set: set }, { runValidators: true })
        .exec();
    }

    return this.getSettings(actor);
  }

  /* ============================================================
     PUBLIC COMPANY PAGES (job seekers)
  ============================================================ */

  async listPublicCompanies(search?: string) {
    const groups = await this.jobModel
      .aggregate<{ _id: Types.ObjectId; openJobs: number; company: string; latest: Date }>([
        { $match: { isActive: true, isApproved: true } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$employerId",
            openJobs: { $sum: 1 },
            company: { $first: "$company" },
            latest: { $first: "$createdAt" },
          },
        },
        { $sort: { openJobs: -1, latest: -1 } },
        { $limit: 200 },
      ])
      .exec();

    const companies = await this.companyModel
      .find({ ownerId: { $in: groups.map((group) => group._id) } })
      .select("ownerId companyName logoUrl industry city country tagline verification.status")
      .lean()
      .exec();
    const byOwner = new Map(companies.map((company) => [company.ownerId.toString(), company]));

    const term = search?.trim().toLowerCase();

    return groups
      .map((group) => {
        const company = byOwner.get(group._id.toString());
        return {
          id: group._id.toString(),
          name: company?.companyName || group.company,
          logoUrl: company?.logoUrl || null,
          industry: company?.industry || "",
          location: [company?.city, company?.country].filter(Boolean).join(", "),
          tagline: company?.tagline || "",
          verified: company?.verification?.status === "approved",
          openJobs: group.openJobs,
        };
      })
      .filter((company) => !term || company.name.toLowerCase().includes(term) || company.industry.toLowerCase().includes(term));
  }

  async getPublicCompany(id: string) {
    const ownerId = this.toObjectId(id, "company");

    const [company, jobs] = await Promise.all([
      this.companyModel.findOne({ ownerId }).lean().exec(),
      this.jobModel
        .find({ employerId: ownerId, isActive: true, isApproved: true })
        .select("-viewCount")
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
    ]);

    if (!company && !jobs.length) {
      throw new NotFoundException("Company not found");
    }

    return {
      id,
      name: company?.companyName || jobs[0]?.company || "Company",
      tagline: company?.tagline ?? "",
      logoUrl: company?.logoUrl || null,
      coverImageUrl: company?.coverImageUrl || null,
      industry: company?.industry ?? "",
      companySize: company?.companySize ?? "",
      website: company?.website || jobs[0]?.companyWebsite || "",
      foundedYear: company?.foundedYear ?? null,
      location: [company?.city, company?.stateProvince, company?.country].filter(Boolean).join(", "),
      about: company?.about || jobs[0]?.companyDescription || "",
      socialLinks: company?.socialLinks ?? {},
      media: (company?.media ?? []).map((item) => ({ url: item.url, caption: item.caption ?? "" })),
      verified: company?.verification?.status === "approved",
      openJobs: jobs.length,
      jobs,
    };
  }

  /* ============================================================
     INTERNAL HELPERS
  ============================================================ */

  private async findPendingInvitations(email: string) {
    const normalized = email.toLowerCase();

    const companies = await this.companyModel
      .find({ team: { $elemMatch: { email: normalized, status: "invited" } } })
      .select("companyName logoUrl team")
      .lean()
      .exec();

    return companies.map((company) => {
      const member = company.team.find((item) => item.email === normalized);
      return {
        companyId: company._id.toString(),
        companyName: company.companyName || "An employer",
        logoUrl: company.logoUrl ?? null,
        role: member?.role ?? "recruiter",
        invitedAt: member?.invitedAt ?? null,
      };
    });
  }

  private async findCompany(ownerId: string) {
    return this.companyModel
      .findOne({ ownerId: new Types.ObjectId(ownerId) })
      .lean()
      .exec();
  }

  /** Create the company record on first write. */
  private async ensureCompany(ownerId: string) {
    const company = await this.companyModel
      .findOneAndUpdate(
        { ownerId: new Types.ObjectId(ownerId) },
        { $setOnInsert: { ownerId: new Types.ObjectId(ownerId) } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    if (!company.companyName) {
      const firstJob = await this.jobModel
        .findOne({ employerId: new Types.ObjectId(ownerId) })
        .select("company")
        .lean()
        .exec();

      if (firstJob?.company) {
        company.companyName = firstJob.company;
        await company.save();
      }
    }

    return company;
  }

  private findOwnerJobs(ownerId: string) {
    return this.jobModel
      .find({ employerId: new Types.ObjectId(ownerId) })
      .sort({ createdAt: -1 })
      .lean<LeanJob[]>()
      .exec();
  }

  private async findOwnerJob(ownerId: string, jobId: string) {
    const job = await this.jobModel
      .findOne({
        _id: this.toObjectId(jobId, "job"),
        employerId: new Types.ObjectId(ownerId),
      })
      .lean<LeanJob>()
      .exec();

    if (!job) {
      throw new NotFoundException("Job not found or you do not own this job");
    }

    return job;
  }

  private async findOwnerApplication(ownerId: string, applicationId: string, populate = false) {
    const query = this.applicationModel.findById(this.toObjectId(applicationId, "application"));

    if (populate) {
      query.populate("userId", "profilePicture username firstName lastName").select("+resumeStorageKey");
    }

    const application = await query.lean<LeanApplication>().exec();

    if (!application) {
      throw new NotFoundException("Application not found");
    }

    const owns = await this.jobModel
      .exists({ _id: application.jobId, employerId: new Types.ObjectId(ownerId) })
      .exec();

    if (!owns) {
      // Do not reveal that the application exists.
      throw new NotFoundException("Application not found");
    }

    return application;
  }

  private async findOwnerInterview(ownerId: string, interviewId: string) {
    const interview = await this.interviewModel
      .findOne({
        _id: this.toObjectId(interviewId, "interview"),
        ownerId: new Types.ObjectId(ownerId),
      })
      .exec();

    if (!interview) {
      throw new NotFoundException("Interview not found");
    }

    return interview;
  }

  private async applicationCountsByJob(jobIds: Types.ObjectId[]) {
    const groups = await this.applicationModel
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { jobId: { $in: jobIds } } },
        { $group: { _id: "$jobId", count: { $sum: 1 } } },
      ])
      .exec();

    return new Map(groups.map((group) => [group._id.toString(), group.count]));
  }

  jobStatus(job: Pick<LeanJob, "isActive" | "isApproved" | "applicationDeadline">) {
    if (!job.isActive) return "paused";
    if (job.applicationDeadline && this.time(job.applicationDeadline) < Date.now()) return "expired";
    if (!job.isApproved) return "pending_approval";
    return "active";
  }

  private jobLocation(job: Pick<LeanJob, "city" | "stateProvince" | "country" | "workplaceType">) {
    const place = [job.city, job.stateProvince, job.country].filter(Boolean).join(", ");
    const arrangement =
      job.workplaceType === "remote" ? "Remote" : job.workplaceType === "hybrid" ? "Hybrid" : "On-site";
    return place ? `${place} (${arrangement})` : arrangement;
  }

  private serializeJob(job: LeanJob, applicationsCount: number) {
    return {
      id: job._id.toString(),
      title: job.title,
      company: job.company,
      companyDescription: job.companyDescription ?? "",
      companyWebsite: job.companyWebsite ?? "",
      type: job.type,
      workplaceType: job.workplaceType,
      country: job.country,
      city: job.city,
      stateProvince: job.stateProvince ?? "",
      location: this.jobLocation(job),
      description: job.description,
      salary: job.salary ?? "",
      salaryMin: job.salaryMin ?? null,
      salaryMax: job.salaryMax ?? null,
      currency: job.currency ?? "",
      salaryPeriod: job.salaryPeriod ?? "",
      skills: job.skills ?? [],
      benefits: job.benefits ?? [],
      applicationDeadline: job.applicationDeadline ?? null,
      applicationMethod: job.applicationMethod ?? "fockis",
      applicationUrl: job.applicationUrl ?? null,
      employmentType: job.employmentType ?? null,
      experienceLevel: job.experienceLevel ?? null,
      isActive: job.isActive,
      isApproved: job.isApproved,
      status: this.jobStatus(job),
      viewCount: Number(job.viewCount ?? 0),
      applicationsCount,
      createdAt: job.createdAt ?? null,
      updatedAt: job.updatedAt ?? null,
    };
  }

  private serializeApplicantRow(app: LeanApplication, jobById: Map<string, LeanJob>) {
    const user = this.populatedUser(app.userId);
    const job = jobById.get(app.jobId.toString());

    return {
      id: app._id.toString(),
      candidateUserId: user.id,
      fullName: app.fullName,
      email: app.email,
      location: app.location,
      profilePicture: user.profilePicture,
      skills: (app.skills ?? []).slice(0, 6),
      jobId: app.jobId.toString(),
      jobTitle: job?.title ?? "Deleted job",
      status: app.status,
      appliedAt: app.createdAt ?? null,
    };
  }

  private serializeInterview(item: EmployerInterview & { _id: Types.ObjectId; createdAt?: Date }) {
    return {
      id: item._id.toString(),
      applicationId: item.applicationId.toString(),
      jobId: item.jobId.toString(),
      candidateName: item.candidateName,
      candidateEmail: item.candidateEmail ?? null,
      jobTitle: item.jobTitle,
      startsAt: item.startsAt,
      durationMinutes: item.durationMinutes,
      timezone: item.timezone,
      type: item.type,
      meetingUrl: item.meetingUrl ?? null,
      location: item.location ?? null,
      notes: item.notes ?? null,
      status: item.status,
      feedback: item.feedback
        ? {
            rating: item.feedback.rating,
            recommendation: item.feedback.recommendation,
            comments: item.feedback.comments ?? null,
            submittedAt: item.feedback.submittedAt,
          }
        : null,
      createdAt: item.createdAt ?? null,
    };
  }

  private serializeCompany(company: EmployerCompany & { _id: Types.ObjectId; createdAt?: Date; updatedAt?: Date }) {
    return {
      id: company._id.toString(),
      companyName: company.companyName ?? "",
      industry: company.industry ?? "",
      companySize: company.companySize ?? "",
      website: company.website ?? "",
      foundedYear: company.foundedYear ?? null,
      country: company.country ?? "",
      city: company.city ?? "",
      stateProvince: company.stateProvince ?? "",
      tagline: company.tagline ?? "",
      about: company.about ?? "",
      logoUrl: company.logoUrl ?? "",
      coverImageUrl: company.coverImageUrl ?? "",
      socialLinks: {
        linkedin: company.socialLinks?.linkedin ?? "",
        x: company.socialLinks?.x ?? "",
        facebook: company.socialLinks?.facebook ?? "",
        instagram: company.socialLinks?.instagram ?? "",
        youtube: company.socialLinks?.youtube ?? "",
      },
      media: (company.media ?? []).map((item) => ({
        id: item._id?.toString() ?? item.url,
        url: item.url,
        caption: item.caption ?? "",
      })),
      verificationStatus: company.verification?.status ?? "not_submitted",
      teamSize: (company.team ?? []).filter((member) => member.status === "active").length + 1,
      plan: company.billing?.plan ?? "free",
      updatedAt: company.updatedAt ?? null,
    };
  }

  private populatedUser(value: unknown): { id: string; profilePicture: string | null } {
    if (value && typeof value === "object" && "_id" in value) {
      const user = value as { _id: Types.ObjectId; profilePicture?: string };
      return {
        id: user._id.toString(),
        profilePicture: user.profilePicture || null,
      };
    }

    return {
      id: value ? String(value) : "",
      profilePicture: null,
    };
  }

  private buildActivity(
    applications: LeanApplication[],
    interviews: (EmployerInterview & { _id: Types.ObjectId; createdAt?: Date })[],
    jobById: Map<string, LeanJob>,
  ) {
    type Activity = { id: string; type: string; message: string; at: Date; link: string };
    const events: Activity[] = [];

    for (const app of applications.slice(0, 50)) {
      const jobTitle = jobById.get(app.jobId.toString())?.title ?? "a job";

      events.push({
        id: `${app._id}-applied`,
        type: "application",
        message: `${app.fullName} applied for ${jobTitle}`,
        at: app.createdAt ?? new Date(0),
        link: `/careers/employer/applicants/${app._id}`,
      });

      for (const entry of app.statusHistory ?? []) {
        if (entry.status === "applied" || entry.status === "viewed") continue;
        events.push({
          id: `${app._id}-${entry.status}-${this.time(entry.changedAt)}`,
          type: "status",
          message: `${app.fullName} moved to ${this.statusLabel(entry.status)} for ${jobTitle}`,
          at: entry.changedAt,
          link: `/careers/employer/applicants/${app._id}`,
        });
      }
    }

    for (const interview of interviews) {
      events.push({
        id: `${interview._id}-interview`,
        type: "interview",
        message: `Interview ${interview.status === "cancelled" ? "cancelled" : "scheduled"} with ${interview.candidateName}`,
        at: interview.createdAt ?? interview.startsAt,
        link: "/careers/employer/interviews",
      });
    }

    return events.sort((a, b) => this.time(b.at) - this.time(a.at));
  }

  private statusLabel(status: string) {
    const labels: Record<string, string> = {
      applied: "New",
      viewed: "Reviewed",
      shortlisted: "Shortlisted",
      interview: "Interview",
      offer: "Offer / Hired",
      rejected: "Rejected",
    };
    return labels[status] ?? status;
  }

  private dailySeries(items: { createdAt?: Date }[], days: number, end = new Date()) {
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    const buckets: { date: string; count: number }[] = [];
    const index = new Map<string, number>();

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const day = new Date(endDay.getTime() - offset * 86_400_000);
      const key = day.toISOString().slice(0, 10);
      index.set(key, buckets.length);
      buckets.push({ date: key, count: 0 });
    }

    for (const item of items) {
      if (!item.createdAt) continue;
      const day = new Date(item.createdAt);
      day.setHours(0, 0, 0, 0);
      const position = index.get(day.toISOString().slice(0, 10));
      if (position !== undefined) buckets[position].count += 1;
    }

    return buckets;
  }

  private lastStatusChange(app: LeanApplication) {
    const history = app.statusHistory ?? [];
    return history.length ? this.time(history[history.length - 1].changedAt) : this.time(app.createdAt);
  }

  private countBy<T>(items: T[], key: (item: T) => string) {
    const map = new Map<string, number>();
    for (const item of items) {
      const value = key(item);
      map.set(value, (map.get(value) ?? 0) + 1);
    }
    return map;
  }

  private pageParams(page?: number, limit?: number) {
    const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Math.floor(Number(page)) : 1;
    const safeLimit =
      Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.min(100, Math.floor(Number(limit))) : 10;
    return { page: safePage, limit: safeLimit };
  }

  private paginate<T>(items: T[], page?: number, limit?: number) {
    const params = this.pageParams(page, limit);
    const start = (params.page - 1) * params.limit;
    return {
      items: items.slice(start, start + params.limit),
      total: items.length,
      page: params.page,
      limit: params.limit,
      pages: Math.max(1, Math.ceil(items.length / params.limit)),
    };
  }

  private clampDays(days: number) {
    const value = Number(days);
    if (!Number.isFinite(value)) return 30;
    return Math.min(365, Math.max(7, Math.floor(value)));
  }

  private parseFutureDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException("Invalid interview date");
    }
    if (date.getTime() < Date.now() - 60_000) {
      throw new BadRequestException("Interview time must be in the future");
    }
    return date;
  }

  private assertApplicationStatus(value: string) {
    const statuses = Object.values(ApplicationStatus) as string[];
    if (!statuses.includes(value)) {
      throw new BadRequestException("Invalid application status");
    }
    return value as ApplicationStatus;
  }

  private assertObjectId(id: string, label: string) {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label} ID`);
    }
  }

  private toObjectId(id: string, label: string) {
    this.assertObjectId(id, label);
    return new Types.ObjectId(id);
  }

  private time(value?: Date | string | null) {
    return value ? new Date(value).getTime() : 0;
  }

  private round(value: number) {
    return Math.round(value * 10) / 10;
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
