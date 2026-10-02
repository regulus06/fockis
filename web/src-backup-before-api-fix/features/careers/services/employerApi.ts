import { apiClient } from "./apiClient";

import type {
  EmployerJobSummary,
  EmployerStats,
  Job,
} from "../types";

/* ============================================================
   EMPLOYER API

   Backend routes:

   GET    /careers/my-jobs
   POST   /careers
   PATCH  /careers/:id
   DELETE /careers/:id
============================================================ */

/* ============================================================
   CREATE / UPDATE JOB PAYLOAD
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

  type:
    | "job"
    | "internship"
    | "coop";

  workplaceType?:
    | "remote"
    | "hybrid"
    | "onsite";

  description: string;

  salary?: string;
  currency?: string;
  salaryPeriod?: string;

  remote?: boolean;

  applicationDeadline?: string;

  skills?: string[];

  benefits?: string[];
}

/* ============================================================
   BACKEND EMPLOYER JOB
============================================================ */

interface BackendEmployerJob {
  _id?: string;
  id?: string;

  title?: string;

  type?:
    | "job"
    | "internship"
    | "coop"
    | string;

  isActive?: boolean;

  applicantCount?: number;
  viewCount?: number;

  [key: string]: unknown;
}

/* ============================================================
   RESPONSE NORMALIZATION
============================================================ */

function normalizeEmployerJob(
  job: BackendEmployerJob,
): EmployerJobSummary {
  const jobType =
    job.type === "coop"
      ? "co-op"
      : job.type ?? "job";

  return {
    id: String(
      job.id ??
        job._id ??
        "",
    ),

    title:
      job.title ??
      "",

    jobType,

    status:
      job.isActive === false
        ? "closed"
        : "live",

    applicantCount:
      Number(
        job.applicantCount ??
          0,
      ),

    viewCount:
      Number(
        job.viewCount ??
          0,
      ),
  };
}

/* ============================================================
   EMPLOYER API
============================================================ */

export const employerApi = {
  /* ==========================================================
     GET EMPLOYER JOBS

     GET /careers/my-jobs

     The backend determines the employer from:

       req.user.id

     Therefore no employer ID is sent
     from the frontend.
  ========================================================== */

  getEmployerJobs:
    async (): Promise<
      EmployerJobSummary[]
    > => {
      const response =
        await apiClient.get<
          BackendEmployerJob[]
        >(
          "/careers/my-jobs",
        );

      return response.map(
        normalizeEmployerJob,
      );
    },

  /* ==========================================================
     EMPLOYER STATS

     There is currently no dedicated backend
     statistics endpoint.

     Calculate the available statistics from
     the employer's jobs.
  ========================================================== */

  getEmployerStats:
    async (): Promise<EmployerStats> => {
      const jobs =
        await employerApi.getEmployerJobs();

      const openJobs =
        jobs.filter(
          (job) =>
            job.status ===
            "live",
        ).length;

      const totalApplicants =
        jobs.reduce(
          (
            total,
            job,
          ) =>
            total +
            Number(
              job.applicantCount ??
                0,
            ),
          0,
        );

      return {
        openJobs,

        totalApplicants,

        inInterview: 0,

        hireRate: 0,
      };
    },

  /* ==========================================================
     CREATE JOB

     POST /careers

     Authentication:
       JWT

     Backend:
       req.user.id
  ========================================================== */

  postJob:
    async (
      payload: PostJobPayload,
    ): Promise<Job> => {
      return apiClient.post<Job>(
        "/careers",
        payload,
      );
    },

  /* ==========================================================
     UPDATE JOB

     PATCH /careers/:id

     Backend verifies that the authenticated
     employer owns the job.
  ========================================================== */

  updateJob:
    async (
      id: string,
      payload:
        Partial<PostJobPayload>,
    ): Promise<Job> => {
      return apiClient.patch<Job>(
        `/careers/${id}`,
        payload,
      );
    },

  /* ==========================================================
     DELETE JOB

     DELETE /careers/:id
  ========================================================== */

  deleteJob:
    async (
      id: string,
    ): Promise<{
      message: string;
    }> => {
      return apiClient.delete<{
        message: string;
      }>(
        `/careers/${id}`,
      );
    },
};