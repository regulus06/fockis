import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { JobCard } from "../components/JobCard";
import { JobFilters } from "../components/JobFilters";

import { useJobFilters } from "../hooks/useJobFilters";
import { useJobs } from "../hooks/useJobs";

import type { Job } from "../types/Job";

import styles from "../styles/JobSearchPage.module.scss";

interface CareersSearchState {
  keyword?: string;
  location?: string;
}

export function JobSearchPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    jobs,
    total,
    isLoading,
    error,
  } = useJobs("jobs");

  const setKeyword = useJobFilters((state) => state.setKeyword);
  const setLocationFilter = useJobFilters((state) => state.setLocation);
  const setSort = useJobFilters((state) => state.setSort);
  const filters = useJobFilters((state) => state.filters);

  /*
   * Seed filters from CareersSearchBar navigation state.
   *
   * Example:
   * {
   *   keyword: "cybersecurity",
   *   location: "Columbus"
   * }
   */
  useEffect(() => {
    const state =
      location.state as CareersSearchState | null;

    if (state?.keyword) {
      setKeyword(state.keyword);
    }

    if (state?.location) {
      setLocationFilter(state.location);
    }
  }, [
    location.state,
    setKeyword,
    setLocationFilter,
  ]);

  const openJob = (job: Job): void => {
    navigate(`/careers/jobs/${job.id}`);
  };

  const easyApply = (job: Job): void => {
    navigate(`/careers/jobs/${job.id}/apply`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Find jobs</h1>

        <p>
          Showing results for{" "}
          <span className={styles.mono}>
            "{filters.keyword || "all roles"}"
          </span>

          {filters.location && (
            <>
              {" "}near{" "}
              <span className={styles.mono}>
                {filters.location}
              </span>
            </>
          )}
        </p>
      </div>

      <div className={styles.layout}>
        <JobFilters />

        <div>
          <div className={styles.toolbar}>
            <div className={styles.count}>
              <b>{total}</b> jobs found
            </div>

            <select
              className={styles.sort}
              value={filters.sort}
              onChange={(event) =>
                setSort(
                  event.target.value as typeof filters.sort,
                )
              }
            >
              <option value="recommended">
                Recommended
              </option>

              <option value="recent">
                Most recent
              </option>

              <option value="salary">
                Salary
              </option>
            </select>
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {isLoading && (
            <div className={styles.loading}>
              Loading jobs…
            </div>
          )}

          {!isLoading && jobs.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                🔍
              </div>

              <h3>
                No jobs match these filters
              </h3>

              <p>
                Try widening your search — remove a
                filter or broaden the location.
              </p>
            </div>
          )}

          <div className={styles.results}>
            {jobs.map((job: Job) => (
              <JobCard
                key={job.id}
                job={job}
                layout="list"
                onOpen={openJob}
                onEasyApply={easyApply}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}