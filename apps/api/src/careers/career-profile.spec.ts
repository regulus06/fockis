import "reflect-metadata";
import { BadRequestException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Types } from "mongoose";

import { CareerProfileService } from "./services/career-profile.service";
import { ApplicationsService } from "./services/applications.service";
import { UpdateCareerProfileDto } from "./dto/career-profile.dto";
import { CreateApplicationDto } from "./dto/create-application.dto";

const userId = new Types.ObjectId().toString();
const exec = <T>(value: T) => ({ exec: jest.fn().mockResolvedValue(value), lean: () => ({ exec: jest.fn().mockResolvedValue(value) }) });

function makeService(profile: unknown = null) {
  const profileModel = {
    findOne: jest.fn().mockReturnValue({ lean: () => ({ exec: jest.fn().mockResolvedValue(profile) }) }),
    findOneAndUpdate: jest.fn().mockImplementation((_q, update) => ({
      lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), ...(update.$set ?? {}) }) }),
    })),
    updateOne: jest.fn().mockReturnValue(exec({ matchedCount: 1, modifiedCount: 1 })),
  };
  const storage = {
    uploadBuffer: jest.fn().mockResolvedValue(undefined),
    deleteObject: jest.fn().mockResolvedValue(undefined),
    copyObject: jest.fn().mockImplementation(async (_from: string, to: string) => to),
    getSignedUrl: jest.fn().mockResolvedValue("https://storage.example/signed"),
  };
  const service = new CareerProfileService(profileModel as never, {} as never, storage as never);
  return { service, profileModel, storage };
}

const pdf = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(100)]);

describe("CareerProfileService — resume upload", () => {
  it("stores a real PDF privately and never returns the storage key", async () => {
    const { service, storage } = makeService();
    const result = await service.uploadResume(userId, { originalname: "Jane Doe CV.pdf", mimetype: "application/pdf", size: pdf.length, buffer: pdf });

    expect(storage.uploadBuffer).toHaveBeenCalledWith(pdf, expect.stringMatching(new RegExp(`^careers/resumes/${userId}/.+\\.pdf$`)), "application/pdf");
    expect(result.resume?.fileName).toBe("Jane Doe CV.pdf");
    expect(JSON.stringify(result)).not.toContain("careers/resumes");
  });

  it("rejects files whose content doesn't match the declared type", async () => {
    const { service, storage } = makeService();
    await expect(
      service.uploadResume(userId, { originalname: "cv.pdf", mimetype: "application/pdf", size: 10, buffer: Buffer.from("<html>nope") }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.uploadBuffer).not.toHaveBeenCalled();
  });

  it("rejects unsupported types and oversize files", async () => {
    const { service } = makeService();
    await expect(service.uploadResume(userId, { originalname: "a.png", mimetype: "image/png", size: 10, buffer: Buffer.from("x") })).rejects.toThrow("PDF");
    await expect(service.uploadResume(userId, { originalname: "a.pdf", mimetype: "application/pdf", size: 11 * 1024 * 1024, buffer: pdf })).rejects.toThrow("10 MB");
  });

  it("replaces the old resume object after a new upload", async () => {
    const { service, storage } = makeService({ _id: new Types.ObjectId(), resume: { storageKey: "careers/resumes/old.pdf", fileName: "old.pdf" } });
    await service.uploadResume(userId, { originalname: "new.pdf", mimetype: "application/pdf", size: pdf.length, buffer: pdf });
    expect(storage.deleteObject).toHaveBeenCalledWith("careers/resumes/old.pdf");
  });

  it("copies the resume for an application so later edits don't change it", async () => {
    const { service, storage } = makeService({ _id: new Types.ObjectId(), resume: { storageKey: "careers/resumes/u/cv.pdf", fileName: "cv.pdf" } });
    const copy = await service.copyResumeForApplication(userId);
    expect(storage.copyObject).toHaveBeenCalledWith("careers/resumes/u/cv.pdf", expect.stringMatching(/^careers\/applications\//));
    expect(copy.fileName).toBe("cv.pdf");
  });

  it("signs short-lived links (15 minutes)", async () => {
    const { service, storage } = makeService();
    await service.signedUrl("k", 'cv"evil.pdf');
    expect(storage.getSignedUrl).toHaveBeenCalledWith("k", expect.objectContaining({ expiresInSeconds: 900, responseDisposition: 'inline; filename="cvevil.pdf"' }));
  });
});

describe("Career profile DTO", () => {
  const errs = async (body: Record<string, unknown>) =>
    (await validate(plainToInstance(UpdateCareerProfileDto, body), { whitelist: true, forbidNonWhitelisted: true })).map((e) => e.property);

  it("accepts a full profile", async () => {
    expect(
      await errs({
        headline: "IT Support Student",
        linkedInUrl: "https://linkedin.com/in/x",
        skills: ["Windows", "Linux"],
        experience: [{ title: "Help Desk", company: "Acme", startDate: "2025-06", current: true }],
        education: [{ school: "Ohio State" }],
        certifications: [{ name: "CompTIA A+", inProgress: true }],
      }),
    ).toEqual([]);
  });

  it("validates URLs and month format", async () => {
    expect(await errs({ linkedInUrl: "not a url" })).toContain("linkedInUrl");
    expect(await errs({ experience: [{ title: "x", company: "y", startDate: "June 2025" }] })).toContain("experience");
  });

  it("rejects end dates before start dates", async () => {
    const { service } = makeService();
    await expect(
      service.update(userId, { experience: [{ title: "A", company: "B", startDate: "2025-06", endDate: "2024-01" }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("Applying with the profile resume", () => {
  it("accepts the useProfileResume flag in the DTO", async () => {
    const errors = await validate(plainToInstance(CreateApplicationDto, { useProfileResume: true }), { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.map((e) => e.property)).not.toContain("useProfileResume");
  });

  it("stores a private copy on the application", async () => {
    const jobId = new Types.ObjectId();
    const jobModel = { findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: jobId, applicationMethod: "fockis", employerId: new Types.ObjectId() }) }) };
    const created = { _id: new Types.ObjectId() };
    const applicationModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      create: jest.fn().mockResolvedValue(created),
      findById: jest.fn().mockReturnValue({ select: () => ({ populate: () => ({ exec: jest.fn().mockResolvedValue(created) }) }) }),
    };
    const profiles = { copyResumeForApplication: jest.fn().mockResolvedValue({ fileName: "cv.pdf", storageKey: "careers/applications/u/1.pdf" }) };
    const service = new ApplicationsService(applicationModel as never, jobModel as never, profiles as never);

    await service.create(userId, { jobId: jobId.toString(), useProfileResume: true, skills: [] } as never);

    const saved = applicationModel.create.mock.calls[0][0];
    expect(saved.resumeStorageKey).toBe("careers/applications/u/1.pdf");
    expect(saved.resumeFileName).toBe("cv.pdf");
    expect(saved).not.toHaveProperty("useProfileResume");
  });
});
