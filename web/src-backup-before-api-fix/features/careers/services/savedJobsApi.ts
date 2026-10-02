// web/src/features/careers/services/savedJobsApi.ts

import { apiClient } from "./apiClient";

import type {
  Job,
  SavedJob,
} from "../types";

/* ============================================================
   SAVED JOBS API

   Backend routes:

   GET    /careers/saved-jobs
   GET    /careers/saved-jobs/:jobId/status
   POST   /careers/saved-jobs/:jobId
   DELETE /careers/saved-jobs/:jobId

   All routes require authentication.
============================================================ */

/* ============================================================
   SAVED JOB WITH DETAILS
============================================================ */

export interface SavedJobWithDetails
  extends SavedJob {
  job?: Job;
}

/* ============================================================
   SAVED JOB STATUS
============================================================ */

export interface SavedJobStatus {
  saved: boolean;
}

/* ============================================================
   SAVED JOBS API
============================================================ */

export const savedJobsApi = {
  /* ==========================================================
     GET SAVED JOBS

     GET /careers/saved-jobs
  ========================================================== */

  getSavedJobs:
    async (): Promise<SavedJobWithDetails[]> => {
      return apiClient.get<
        SavedJobWithDetails[]
      >(
        "/careers/saved-jobs",
      );
    },

  /* ==========================================================
     CHECK WHETHER JOB IS SAVED

     GET /careers/saved-jobs/:jobId/status
  ========================================================== */

  isJobSaved:
    async (
      jobId: string,
    ): Promise<boolean> => {
      if (!jobId) {
        throw new Error(
          "Job ID is required",
        );
      }

      const response =
        await apiClient.get<SavedJobStatus>(
          `/careers/saved-jobs/${jobId}/status`,
        );

      return response.saved;
    },

  /* ==========================================================
     SAVE JOB

     POST /careers/saved-jobs/:jobId
  ========================================================== */

  saveJob:
    async (
      jobId: string,
    ): Promise<SavedJob> => {
      if (!jobId) {
        throw new Error(
          "Job ID is required",
        );
      }

      return apiClient.post<SavedJob>(
        `/careers/saved-jobs/${jobId}`,
      );
    },

  /* ==========================================================
     UNSAVE JOB

     DELETE /careers/saved-jobs/:jobId
  ========================================================== */

  unsaveJob:
    async (
      jobId: string,
    ): Promise<void> => {
      if (!jobId) {
        throw new Error(
          "Job ID is required",
        );
      }

      await apiClient.delete<void>(
        `/careers/saved-jobs/${jobId}`,
      );
    },
};