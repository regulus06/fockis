import { apiClient } from "./apiClient";

import type {
  Job,
  JobFilters,
  JobSearchResult,
} from "../types";

/* ============================================================
   QUERY BUILDER

   Backend:
   GET /careers
   Supports:
   - search
   - country
   - city
   - type
   - workplaceType
   - remote
============================================================ */

function buildQuery(
  filters: Partial<JobFilters>,
): string {
  const params = new URLSearchParams();

  if (filters.keyword?.trim()) {
    params.set(
      "search",
      filters.keyword.trim(),
    );
  }

  if (filters.location?.trim()) {
    params.set(
      "city",
      filters.location.trim(),
    );
  }

  /*
   * Backend accepts:
   * job       -> regular job
   * internship
   * coop
   */

  if (filters.jobTypes?.length) {
    const type = filters.jobTypes[0];

    if (type === "internship") {
      params.set("type", "internship");
    } else if (type === "co-op") {
      params.set("type", "coop");
    } else {
      params.set("type", "job");
    }
  }

  /*
   * Backend accepts:
   * remote
   * hybrid
   * onsite
   */

  if (filters.arrangements?.length) {
    const arrangement =
      filters.arrangements[0];

    if (arrangement === "remote") {
      params.set(
        "workplaceType",
        "remote",
      );
    } else if (
      arrangement === "hybrid"
    ) {
      params.set(
        "workplaceType",
        "hybrid",
      );
    } else {
      params.set(
        "workplaceType",
        "onsite",
      );
    }
  }

  /*
   * Send the remote flag when remote
   * is specifically selected.
   */

  if (
    filters.arrangements?.includes(
      "remote",
    )
  ) {
    params.set("remote", "true");
  }

  /*
   * The backend currently does not
   * implement these filters:
   *
   * - experienceLevels
   * - industries
   * - minSalary
   * - datePosted
   * - sort
   *
   * Do not send unsupported parameters.
   */

  const query = params.toString();

  return query
    ? `?${query}`
    : "";
}

/* ============================================================
   PAGINATION

   The current backend returns an array.
   Pagination is therefore handled on the
   frontend for now.
============================================================ */

function paginate(
  jobs: Job[],
  filters: Partial<JobFilters>,
): JobSearchResult {
  const page =
    filters.page ?? 1;

  const pageSize =
    filters.pageSize ?? 20;

  const start =
    (page - 1) * pageSize;

  const items =
    jobs.slice(
      start,
      start + pageSize,
    );

  return {
    items,
    total: jobs.length,
    page,
    pageSize,
  };
}

/* ============================================================
   CAREERS API
============================================================ */

export const careersApi = {
  /* ==========================================================
     SEARCH ALL JOBS

     GET /careers
  ========================================================== */

  searchJobs: async (
    filters: Partial<JobFilters> = {},
  ): Promise<JobSearchResult> => {
    const query =
      buildQuery(filters);

    const response =
      await apiClient.get<Job[]>(
        `/careers${query}`,
      );

    return paginate(
      response,
      filters,
    );
  },

  /* ==========================================================
     SEARCH INTERNSHIPS

     GET /careers?type=internship
  ========================================================== */

  searchInternships: async (
    filters: Partial<JobFilters> = {},
  ): Promise<JobSearchResult> => {
    const query =
      buildQuery({
        ...filters,
        jobTypes: [
          "internship",
        ],
      });

    const response =
      await apiClient.get<Job[]>(
        `/careers${query}`,
      );

    return paginate(
      response,
      filters,
    );
  },

  /* ==========================================================
     SEARCH CO-OPS

     GET /careers?type=coop
  ========================================================== */

  searchCoops: async (
    filters: Partial<JobFilters> = {},
  ): Promise<JobSearchResult> => {
    const query =
      buildQuery({
        ...filters,
        jobTypes: [
          "co-op",
        ],
      });

    const response =
      await apiClient.get<Job[]>(
        `/careers${query}`,
      );

    return paginate(
      response,
      filters,
    );
  },

  /* ==========================================================
     GET ONE JOB

     GET /careers/:id
  ========================================================== */

  getJobById: (
    id: string,
  ) =>
    apiClient.get<Job>(
      `/careers/${id}`,
    ),

  /* ==========================================================
     RECOMMENDED JOBS

     There is currently no dedicated
     recommendation endpoint.

     Use the public careers endpoint.
  ========================================================== */

  getRecommendedJobs:
    async (): Promise<Job[]> => {
      const response =
        await apiClient.get<Job[]>(
          "/careers",
        );

      return response.slice(
        0,
        10,
      );
    },
};