import { useNavigate } from "react-router-dom";
import { JobCard, CareersSearchBar } from "../components";
import { useJobs } from "../hooks";
import type { Job } from "../types";
import styles from "../styles/InternshipsPage.module.scss";

export function InternshipsPage() {
  const navigate = useNavigate();

  const {
    jobs,
    total,
    isLoading,
  } = useJobs("internships");

  const openJob = (job: Job): void => {
    navigate(`/careers/jobs/${job.id}`);
  };

  const easyApply = (job: Job): void => {
    navigate(`/careers/jobs/${job.id}/apply`);
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.eyebrow}>
          For students
        </div>

        <h1>
          Launch your career with <em>an internship</em>
        </h1>

        <p className={styles.sub}>
          Search by major, industry, and term — filter down
          to what actually fits your schedule and graduation
          date.
        </p>

        <CareersSearchBar
          keywordPlaceholder="Major, role, or company"
          onSearch={() => {}}
        />

        <div className={styles.chipRow}>
          <span className={styles.chipTeal}>Paid</span>
          <span className={styles.chip}>Summer 2027</span>
          <span className={styles.chip}>Remote</span>
          <span className={styles.chip}>Fall 2027</span>
          <span className={styles.chip}>Spring 2027</span>
        </div>
      </section>

      <div className={styles.results}>
        <div className={styles.toolbar}>
          <div>
            <b>{total}</b> internships found
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loading}>
            Loading internships…
          </div>
        ) : jobs.length === 0 ? (
          <div className={styles.loading}>
            No internships found.
          </div>
        ) : (
          <div className={styles.grid}>
            {jobs.map((job: Job) => (
              <JobCard
                key={job.id}
                job={job}
                onOpen={openJob}
                onEasyApply={easyApply}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}