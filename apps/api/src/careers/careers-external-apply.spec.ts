import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { BadRequestException } from "@nestjs/common";
import { Types } from "mongoose";

import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { CareerService } from "./services/career.service";
import { ApplicationsService } from "./services/applications.service";
import { EmployerService } from "./services/employer.service";

const baseJob = {
  title: "Software Engineer",
  company: "TechNova Inc.",
  country: "United States",
  city: "New York",
  type: "job",
  workplaceType: "hybrid",
  description: "Build and ship reliable features for our customers.",
};

async function errorsFor(cls: typeof CreateJobDto | typeof UpdateJobDto, body: Record<string, unknown>) {
  const errors = await validate(plainToInstance(cls, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((error) => error.property);
}

describe("Job DTO — application method", () => {
  it("accepts a Fockis job without a URL (existing behaviour)", async () => {
    expect(await errorsFor(CreateJobDto, baseJob)).toEqual([]);
    expect(await errorsFor(CreateJobDto, { ...baseJob, applicationMethod: "fockis" })).toEqual([]);
  });

  it("requires a URL for external jobs", async () => {
    expect(await errorsFor(CreateJobDto, { ...baseJob, applicationMethod: "external" })).toContain("applicationUrl");
  });

  it("rejects non-http URLs", async () => {
    for (const applicationUrl of ["javascript:alert(1)", "ftp://example.com/apply", "careers.example.com"]) {
      expect(
        await errorsFor(CreateJobDto, { ...baseJob, applicationMethod: "external", applicationUrl }),
      ).toContain("applicationUrl");
    }
  });

  it("accepts a valid https URL and numeric salary range", async () => {
    expect(
      await errorsFor(CreateJobDto, {
        ...baseJob,
        applicationMethod: "external",
        applicationUrl: "https://careers.example.com/jobs/123",
        salaryMin: 90000,
        salaryMax: 120000,
      }),
    ).toEqual([]);
  });

  it("rejects unknown methods", async () => {
    expect(await errorsFor(CreateJobDto, { ...baseJob, applicationMethod: "email" })).toContain("applicationMethod");
  });

  it("allows partial updates without the method", async () => {
    expect(await errorsFor(UpdateJobDto, { title: "Senior Engineer" })).toEqual([]);
  });
});

describe("CareerService — saving application method", () => {
  const employerId = new Types.ObjectId().toString();

  function serviceWith(model: Record<string, jest.Mock>) {
    return new CareerService(model as never);
  }

  it("saves applicationMethod and applicationUrl for external jobs", async () => {
    const create = jest.fn(async (doc) => doc);
    const service = serviceWith({ create });

    await service.create(employerId, {
      ...baseJob,
      applicationMethod: "external",
      applicationUrl: "https://careers.example.com/apply",
    } as CreateJobDto);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationMethod: "external",
        applicationUrl: "https://careers.example.com/apply",
      }),
    );
  });

  it("defaults to fockis and never stores a URL for Fockis jobs", async () => {
    const create = jest.fn(async (doc) => doc);
    const service = serviceWith({ create });

    await service.create(employerId, {
      ...baseJob,
      applicationUrl: "https://ignored.example.com",
    } as CreateJobDto);

    const saved = create.mock.calls[0][0];
    expect(saved.applicationMethod).toBe("fockis");
    expect(saved.applicationUrl).toBeUndefined();
  });

  it("rejects external jobs without a URL even if DTO validation is bypassed", async () => {
    const service = serviceWith({ create: jest.fn() });
    await expect(
      service.create(employerId, { ...baseJob, applicationMethod: "external" } as CreateJobDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a minimum salary above the maximum", async () => {
    const service = serviceWith({ create: jest.fn() });
    await expect(
      service.create(employerId, { ...baseJob, salaryMin: 200, salaryMax: 100 } as CreateJobDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("ApplicationsService — internal applications", () => {
  const exec = <T>(value: T) => ({ exec: jest.fn().mockResolvedValue(value) });

  it("refuses Fockis applications for external jobs", async () => {
    const jobModel = {
      findOne: jest.fn().mockReturnValue(
        exec({ _id: new Types.ObjectId(), applicationMethod: "external", employerId: new Types.ObjectId() }),
      ),
    };
    const applicationModel = { findOne: jest.fn(), create: jest.fn() };
    const service = new ApplicationsService(applicationModel as never, jobModel as never);

    await expect(
      service.create(new Types.ObjectId().toString(), { jobId: new Types.ObjectId().toString() } as never),
    ).rejects.toThrow("company website");
    expect(applicationModel.create).not.toHaveBeenCalled();
  });

  it("still accepts Fockis applications and records the first status", async () => {
    const jobId = new Types.ObjectId();
    const userId = new Types.ObjectId().toString();
    const jobModel = {
      findOne: jest.fn().mockReturnValue(exec({ _id: jobId, applicationMethod: "fockis", employerId: new Types.ObjectId() })),
    };
    const created = { _id: new Types.ObjectId() };
    const applicationModel = {
      findOne: jest.fn().mockReturnValue(exec(null)),
      create: jest.fn().mockResolvedValue(created),
      findById: jest.fn().mockReturnValue({ select: () => ({ populate: () => exec(created) }) }),
    };
    const service = new ApplicationsService(applicationModel as never, jobModel as never);

    await service.create(userId, { jobId: jobId.toString(), skills: [] } as never);

    expect(applicationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "applied",
        statusHistory: [expect.objectContaining({ status: "applied" })],
      }),
    );
  });
});

describe("EmployerService — roles", () => {
  const service = new EmployerService({} as never, {} as never, {} as never, {} as never);

  it("lets hiring managers manage applicants but not jobs or the team", () => {
    const context = { actorId: "a", ownerId: "o", role: "hiring_manager" as const };
    expect(() => service.assertCan(context, "manageApplicants")).not.toThrow();
    expect(() => service.assertCan(context, "manageJobs")).toThrow();
    expect(() => service.assertCan(context, "manageTeam")).toThrow();
  });

  it("reserves billing for the owner", () => {
    expect(() => service.assertCan({ actorId: "a", ownerId: "o", role: "admin" }, "manageBilling")).toThrow();
    expect(() => service.assertCan({ actorId: "o", ownerId: "o", role: "owner" }, "manageBilling")).not.toThrow();
  });

  it("derives job status from activity, deadline and approval", () => {
    const past = new Date(Date.now() - 86_400_000);
    expect(service.jobStatus({ isActive: false, isApproved: true })).toBe("paused");
    expect(service.jobStatus({ isActive: true, isApproved: true, applicationDeadline: past })).toBe("expired");
    expect(service.jobStatus({ isActive: true, isApproved: false })).toBe("pending_approval");
    expect(service.jobStatus({ isActive: true, isApproved: true })).toBe("active");
  });
});
