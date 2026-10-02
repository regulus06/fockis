import { apiClient } from "./apiClient";

import type {
  Application,
  ApplicationPayload,
} from "../types";

/* ============================================================
   APPLICATIONS API
============================================================ */

export const applicationsApi = {
  /* ==========================================================
     GET MY APPLICATIONS

     GET /careers/applications
  ========================================================== */

  getMyApplications:
    async (): Promise<Application[]> => {
      return apiClient.get<Application[]>(
        "/careers/applications",
      );
    },

  /* ==========================================================
     SUBMIT APPLICATION

     POST /careers/applications
  ========================================================== */

  submitApplication:
    async (
      payload: ApplicationPayload,
    ): Promise<Application> => {
      return apiClient.post<Application>(
        "/careers/applications",
        payload,
      );
    },

  /* ==========================================================
     GET APPLICATION BY ID

     GET /careers/applications/:id
  ========================================================== */

  getApplicationById:
    async (
      id: string,
    ): Promise<Application> => {
      return apiClient.get<Application>(
        `/careers/applications/${id}`,
      );
    },
};