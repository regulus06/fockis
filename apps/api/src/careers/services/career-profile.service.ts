import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { randomUUID } from "crypto";
import { extname } from "path";

import { CloudStorageService } from "../../uploads/cloud-storage.service";

import {
  CareerProfile,
  CareerProfileDocument,
} from "../schemas/career-profile.schema";

import { Job, JobDocument } from "../schemas/job.schema";

import {
  CreateJobAlertDto,
  UpdateCareerProfileDto,
} from "../dto/career-profile.dto";

export const RESUME_MAX_BYTES = 10 * 1024 * 1024;

const RESUME_TYPES: Record<
  string,
  { ext: string; signature: (buffer: Buffer) => boolean }
> = {
  "application/pdf": {
    ext: ".pdf",
    signature: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
  },

  "application/msword": {
    ext: ".doc",
    signature: (b) => b.subarray(0, 4).toString("hex") === "d0cf11e0",
  },

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    ext: ".docx",
    signature: (b) => b.subarray(0, 2).toString("latin1") === "PK",
  },
};

export interface UploadedResumeFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

type LeanProfile = CareerProfile & {
  _id: Types.ObjectId;
  updatedAt?: Date;
};

@Injectable()
export class CareerProfileService {
  constructor(
    @InjectModel(CareerProfile.name)
    private readonly profileModel: Model<CareerProfileDocument>,

    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,

    private readonly storage: CloudStorageService,
  ) {}

  /* ============================================================
     PROFILE
  ============================================================ */

  async getMine(userId: string) {
    const profile = await this.findLean(userId);
    return this.serialize(profile);
  }

  async update(userId: string, dto: UpdateCareerProfileDto) {
    const set: Record<string, unknown> = {};

    const text = [
      "headline",
      "summary",
      "location",
      "phone",
      "linkedInUrl",
      "websiteUrl",
    ] as const;

    for (const key of text) {
      if (dto[key] !== undefined) {
        set[key] = dto[key]?.trim() ?? "";
      }
    }

    if (dto.availability !== undefined) {
      set.availability = dto.availability;
    }

    if (dto.skills !== undefined) {
      set.skills = [
        ...new Set(
          dto.skills.map((skill) => skill.trim()).filter(Boolean),
        ),
      ];
    }

    if (dto.education !== undefined) {
      set.education = dto.education.map((item) => ({
        school: item.school.trim(),
        degree: item.degree?.trim() || undefined,
        fieldOfStudy: item.fieldOfStudy?.trim() || undefined,
        startYear: item.startYear?.trim() || undefined,
        endYear: item.endYear?.trim() || undefined,
      }));
    }

    if (dto.experience !== undefined) {
      set.experience = dto.experience.map((item) => {
        if (
          item.startDate &&
          item.endDate &&
          !item.current &&
          item.startDate > item.endDate
        ) {
          throw new BadRequestException(
            `End date for "${item.title}" is before its start date`,
          );
        }

        return {
          title: item.title.trim(),
          company: item.company.trim(),
          location: item.location?.trim() || undefined,
          startDate: item.startDate || undefined,
          endDate: item.current
            ? undefined
            : item.endDate || undefined,
          current: Boolean(item.current),
          description: item.description?.trim() || undefined,
        };
      });
    }

    if (dto.certifications !== undefined) {
      set.certifications = dto.certifications.map((item) => ({
        name: item.name.trim(),
        issuer: item.issuer?.trim() || undefined,
        year: item.year?.trim() || undefined,
        inProgress: Boolean(item.inProgress),
      }));
    }

    const profile = await this.profileModel
      .findOneAndUpdate(
        { userId: this.oid(userId) },
        {
          $set: set,
          $setOnInsert: { userId: this.oid(userId) },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      )
      .lean<LeanProfile>()
      .exec();

    return this.serialize(profile);
  }

  /* ============================================================
     RESUME
  ============================================================ */

  async uploadResume(userId: string, file?: UploadedResumeFile) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        "Choose a resume file to upload.",
      );
    }

    if (file.size > RESUME_MAX_BYTES) {
      throw new BadRequestException(
        "Your resume must be 10 MB or smaller.",
      );
    }

    const type = RESUME_TYPES[file.mimetype];

    if (!type || !type.signature(file.buffer)) {
      throw new BadRequestException(
        "Upload a PDF, DOC or DOCX file.",
      );
    }

    const storageKey = `careers/resumes/${userId}/${randomUUID()}${type.ext}`;

    await this.storage.uploadBuffer(
      file.buffer,
      storageKey,
      file.mimetype,
    );

    const previous = await this.findLean(userId);

    const profile = await this.profileModel
      .findOneAndUpdate(
        { userId: this.oid(userId) },
        {
          $set: {
            resume: {
              fileName: this.safeFileName(
                file.originalname,
                type.ext,
              ),
              storageKey,
              mimeType: file.mimetype,
              size: file.size,
              uploadedAt: new Date(),
            },
          },
          $setOnInsert: {
            userId: this.oid(userId),
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .lean<LeanProfile>()
      .exec();

    if (previous?.resume?.storageKey) {
      await this.storage
        .deleteObject(previous.resume.storageKey)
        .catch(() => undefined);
    }

    return this.serialize(profile);
  }

  async deleteResume(userId: string) {
    const profile = await this.findLean(userId);

    if (!profile?.resume) {
      throw new NotFoundException(
        "You have not uploaded a resume.",
      );
    }

    await this.profileModel
      .updateOne(
        { _id: profile._id },
        { $unset: { resume: "" } },
      )
      .exec();

    await this.storage
      .deleteObject(profile.resume.storageKey)
      .catch(() => undefined);

    return this.getMine(userId);
  }

  /** Short-lived link for the owner to open their resume. */
  async resumeUrl(userId: string) {
    const profile = await this.findLean(userId);

    if (!profile?.resume) {
      throw new NotFoundException(
        "You have not uploaded a resume.",
      );
    }

    return {
      fileName: profile.resume.fileName,
      url: await this.signedUrl(
        profile.resume.storageKey,
        profile.resume.fileName,
      ),
    };
  }

  /**
   * Copies the profile resume for one application, so later profile
   * changes never alter what the employer received.
   */
  async copyResumeForApplication(userId: string) {
    const profile = await this.findLean(userId);

    if (!profile?.resume) {
      throw new BadRequestException(
        "Upload a resume to your career profile before applying with it.",
      );
    }

    const ext = extname(profile.resume.storageKey) || ".pdf";

    const destination =
      `careers/applications/${userId}/${randomUUID()}${ext}`;

    await this.storage.copyObject(
      profile.resume.storageKey,
      destination,
    );

    return {
      fileName: profile.resume.fileName,
      storageKey: destination,
    };
  }

  signedUrl(storageKey: string, fileName: string) {
    const safe = fileName.replace(/["\\\r\n]/g, "");

    return this.storage.getSignedUrl(storageKey, {
      expiresInSeconds: 15 * 60,
      responseDisposition: `inline; filename="${safe}"`,
    });
  }

  /* ============================================================
     JOB ALERTS
  ============================================================ */

  async listAlerts(userId: string) {
    const profile = await this.findLean(userId);
    const alerts = profile?.jobAlerts ?? [];

    return Promise.all(
      alerts.map(async (alert) => ({
        id: alert._id.toString(),
        keywords: alert.keywords ?? "",
        location: alert.location ?? "",
        type: alert.type ?? "",
        remoteOnly: alert.remoteOnly,
        createdAt: alert.createdAt,
        lastViewedAt: alert.lastViewedAt,

        newMatches: await this.jobModel
          .countDocuments(
            this.alertQuery(alert, alert.lastViewedAt),
          )
          .exec(),

        totalMatches: await this.jobModel
          .countDocuments(this.alertQuery(alert))
          .exec(),
      })),
    );
  }

  async createAlert(
    userId: string,
    dto: CreateJobAlertDto,
  ) {
    const keywords = dto.keywords?.trim() ?? "";
    const location = dto.location?.trim() ?? "";

    if (
      !keywords &&
      !location &&
      !dto.type &&
      !dto.remoteOnly
    ) {
      throw new BadRequestException(
        "Add at least one criterion for the alert.",
      );
    }

    const profile = await this.findLean(userId);

    if ((profile?.jobAlerts?.length ?? 0) >= 10) {
      throw new BadRequestException(
        "You can keep up to 10 job alerts.",
      );
    }

    const now = new Date();

    await this.profileModel
      .updateOne(
        { userId: this.oid(userId) },
        {
          $push: {
            jobAlerts: {
              keywords,
              location,
              type: dto.type ?? "",
              remoteOnly: Boolean(dto.remoteOnly),
              createdAt: now,
              lastViewedAt: now,
            },
          },
          $setOnInsert: {
            userId: this.oid(userId),
          },
        },
        {
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    return this.listAlerts(userId);
  }

  async deleteAlert(
    userId: string,
    alertId: string,
  ) {
    const result = await this.profileModel
      .updateOne(
        { userId: this.oid(userId) },
        {
          $pull: {
            jobAlerts: {
              _id: this.oid(alertId, "alert"),
            },
          },
        },
      )
      .exec();

    if (!result.modifiedCount) {
      throw new NotFoundException("Alert not found");
    }

    return this.listAlerts(userId);
  }

  async markAlertViewed(
    userId: string,
    alertId: string,
  ) {
    const result = await this.profileModel
      .updateOne(
        {
          userId: this.oid(userId),
          "jobAlerts._id": this.oid(alertId, "alert"),
        },
        {
          $set: {
            "jobAlerts.$.lastViewedAt": new Date(),
          },
        },
      )
      .exec();

    if (!result.matchedCount) {
      throw new NotFoundException("Alert not found");
    }

    return this.listAlerts(userId);
  }

  /* ============================================================
     HELPERS
  ============================================================ */

  private alertQuery(
    alert: {
      keywords?: string;
      location?: string;
      type?: string;
      remoteOnly?: boolean;
    },
    since?: Date,
  ) {
    const query: Record<string, any> = {
      isActive: true,
      isApproved: true,
    };

    if (since) {
      query.createdAt = { $gt: since };
    }

    const and: Record<string, any>[] = [];

    if (alert.keywords) {
      const pattern = new RegExp(
        this.escape(alert.keywords),
        "i",
      );

      and.push({
        $or: [
          { title: pattern },
          { company: pattern },
          { description: pattern },
          { skills: pattern },
        ],
      });
    }

    if (alert.location) {
      const pattern = new RegExp(
        this.escape(alert.location),
        "i",
      );

      and.push({
        $or: [
          { city: pattern },
          { country: pattern },
          { stateProvince: pattern },
        ],
      });
    }

    if (alert.type) {
      if (
        ["job", "internship", "coop"].includes(alert.type)
      ) {
        query.type = alert.type;
      } else {
        query.employmentType = alert.type;
      }
    }

    if (alert.remoteOnly) {
      query.workplaceType = "remote";
    }

    if (and.length) {
      query.$and = and;
    }

    return query;
  }

  private serialize(profile: LeanProfile | null) {
    const p = profile;

    const data = {
      headline: p?.headline ?? "",
      summary: p?.summary ?? "",
      location: p?.location ?? "",
      phone: p?.phone ?? "",
      linkedInUrl: p?.linkedInUrl ?? "",
      websiteUrl: p?.websiteUrl ?? "",
      availability: p?.availability ?? "open",
      skills: p?.skills ?? [],

      education: (p?.education ?? []).map((item) => ({
        id: item._id.toString(),
        school: item.school,
        degree: item.degree ?? "",
        fieldOfStudy: item.fieldOfStudy ?? "",
        startYear: item.startYear ?? "",
        endYear: item.endYear ?? "",
      })),

      experience: (p?.experience ?? []).map((item) => ({
        id: item._id.toString(),
        title: item.title,
        company: item.company,
        location: item.location ?? "",
        startDate: item.startDate ?? "",
        endDate: item.endDate ?? "",
        current: item.current,
        description: item.description ?? "",
      })),

      certifications: (p?.certifications ?? []).map((item) => ({
        id: item._id.toString(),
        name: item.name,
        issuer: item.issuer ?? "",
        year: item.year ?? "",
        inProgress: item.inProgress,
      })),

      resume: p?.resume
        ? {
            fileName: p.resume.fileName,
            mimeType: p.resume.mimeType,
            size: p.resume.size,
            uploadedAt: p.resume.uploadedAt,
          }
        : null,

      jobAlertCount: p?.jobAlerts?.length ?? 0,
      updatedAt: p?.updatedAt ?? null,
    };

    const checks = [
      Boolean(data.headline),
      Boolean(data.summary),
      Boolean(data.location),
      data.skills.length >= 3,
      data.experience.length > 0,
      data.education.length > 0,
      Boolean(data.resume),
      Boolean(data.linkedInUrl || data.websiteUrl),
    ];

    return {
      ...data,
      completeness: Math.round(
        (checks.filter(Boolean).length / checks.length) * 100,
      ),
    };
  }

  private findLean(userId: string) {
    return this.profileModel
      .findOne({ userId: this.oid(userId) })
      .lean<LeanProfile>()
      .exec();
  }

  private safeFileName(name: string, ext: string) {
    const base = (name || "resume")
      .replace(/[^\w.\- ()]+/g, "_")
      .slice(0, 200);

    return base.toLowerCase().endsWith(ext)
      ? base
      : `${base}${ext}`;
  }

  private oid(id: string, label = "user") {
    if (
      !id ||
      !Types.ObjectId.isValid(id)
    ) {
      throw new BadRequestException(
        `Invalid ${label} ID`,
      );
    }

    return new Types.ObjectId(id);
  }

  private escape(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}