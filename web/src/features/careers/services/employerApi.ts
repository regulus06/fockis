
import { apiClient } from "./apiClient";
import type { Job } from "../types";

/* ============================================================
   EMPLOYER TYPES
============================================================ */

export interface EmployerJobSummary {
  id: string;
  title: string;
  jobType: string;
  status: "live" | "closed";
  applicantCount: number;
  viewCount: number;
}

export interface EmployerStats {
  openJobs: number;
  totalApplicants: number;
  inInterview: number;
  hireRate: number;
}

/* ============================================================
   EMPLOYER API
============================================================ */

export interface PostJobPayload {
  title: string;
  company: string;
  companyDescription?: string;
  companyWebsite?: string;

  country: string;
  city: string;
  stateProvince?: string;
  location?: string;

  type: "job" | "internship" | "coop";

  workplaceType?: "remote" | "hybrid" | "onsite";

  description: string;

  salary?: string;
  currency?: string;
  salaryPeriod?: string;

  remote?: boolean;
  applicationDeadline?: string;

  skills?: string[];
  benefits?: string[];
}

interface BackendEmployerJob {
  _id?: string;
  id?: string;
  title?: string;
  type?: "job" | "internship" | "coop" | string;
  isActive?: boolean;
  applicantCount?: number;
  viewCount?: number;
  [key: string]: unknown;
}

/* ============================================================
   HELPERS
============================================================ */

function getJobPath(id: string): string {
  const normalizedId = id?.trim();

  if (!normalizedId) {
    throw new Error("Job ID is required.");
  }

  return encodeURIComponent(normalizedId);
}

function normalizeEmployerJob(
  job: BackendEmployerJob,
): EmployerJobSummary {
  const jobType =
    job.type === "coop" ? "co-op" : job.type ?? "job";

  return {
    id: String(job.id ?? job._id ?? ""),
    title: job.title ?? "",
    jobType,
    status: job.isActive === false ? "closed" : "live",
    applicantCount: Number(job.applicantCount ?? 0),
    viewCount: Number(job.viewCount ?? 0),
  };
}

/* ============================================================
   EMPLOYER API METHODS
============================================================ */

export const employerApi = {
  /**
   * GET /careers/my-jobs
   *
   * The backend identifies the employer using
   * the authenticated JWT.
   */
  getEmployerJobs: async (): Promise<EmployerJobSummary[]> => {
    const response = await apiClient.get<BackendEmployerJob[]>(
      "/careers/my-jobs",
    );

    if (!Array.isArray(response)) {
      throw new Error(
        "Invalid employer jobs response from server.",
      );
    }

    return response.map(normalizeEmployerJob);
  },

  /**
   * Calculate employer statistics from existing jobs.
   */
  getEmployerStats: async (): Promise<EmployerStats> => {
    const jobs = await employerApi.getEmployerJobs();

    const openJobs = jobs.filter(
      (job) => job.status === "live",
    ).length;

    const totalApplicants = jobs.reduce(
      (total, job) =>
        total + Number(job.applicantCount ?? 0),
      0,
    );

    return {
      openJobs,
      totalApplicants,
      inInterview: 0,
      hireRate: 0,
    };
  },

  /**
   * POST /careers
   */
  postJob: async (
    payload: PostJobPayload,
  ): Promise<Job> => {
    return apiClient.post<Job>("/careers", payload);
  },

  /**
   * PATCH /careers/:id
   */
  updateJob: async (
    id: string,
    payload: Partial<PostJobPayload>,
  ): Promise<Job> => {
    return apiClient.patch<Job>(
      `/careers/${getJobPath(id)}`,
      payload,
    );
  },

  /**
   * DELETE /careers/:id
   */
  deleteJob: async (
    id: string,
  ): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(
      `/careers/${getJobPath(id)}`,
    );
  },
};
