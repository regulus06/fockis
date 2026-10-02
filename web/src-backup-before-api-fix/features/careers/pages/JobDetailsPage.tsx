import { useNavigate, useParams } from "react-router-dom";
import { useJobDetails, useSavedJobs } from "../hooks";
import { CareersBadge } from "../components";
import {
  formatSalary,
  formatPostedAt,
  jobTypeBadge,
} from "../types/formatJobMeta";
import type { Job } from "../types";
import styles from "../styles/JobDetailsPage.module.scss";

export function JobDetailsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const {
    job,
    isLoading,
    error,
  } = useJobDetails(jobId);

  const isSaved = useSavedJobs(
    (state: {
      isSaved: (id: string) => boolean;
    }) => (job ? state.isSaved(job.id) : false)
  );

  const toggleSave = useSavedJobs(
    (state: {
      toggleSave: (id: string) => void;
    }) => state.toggleSave
  );

  if (isLoading) {
    return (
      <div className={styles.loading}>
        Loading job…
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className={styles.loading}>
        Couldn't load this job.
      </div>
    );
  }

  const typeBadge = jobTypeBadge(job);

  return (
    <div className={styles.page}>
      <button
        className={styles.back}
        onClick={() => navigate("/careers/search")}
      >
        ← Back to results
      </button>

      <div className={styles.layout}>
        <div className={styles.card}>
          <div className={styles.badgeRow}>
            {typeBadge && (
              <CareersBadge
                variant={typeBadge.variant}
                label={typeBadge.label}
              />
            )}

            {job.isPaid && (
              <CareersBadge
                variant="paid"
                label="PAID"
              />
            )}

            <CareersBadge
              variant="remote"
              label={job.arrangement.toUpperCase()}
            />
          </div>

          <div className={styles.top}>
            <div className={styles.logo}>
              {job.company.initials}
            </div>

            <div>
              <div className={styles.title}>
                {job.title}
              </div>

              <div className={styles.companyLine}>
                {job.company.name}

                {job.company.verified && (
                  <span className={styles.verified}>
                    ✔ Verified
                  </span>
                )}

                {" · "}
                {job.location}
              </div>
            </div>
          </div>

          <div className={styles.metaRow}>
            <div className={styles.meta}>
              <span>Salary</span>
              <b>{formatSalary(job)}</b>
            </div>

            {job.term && (
              <div className={styles.meta}>
                <span>Term</span>
                <b>{job.term}</b>
              </div>
            )}

            <div className={styles.meta}>
              <span>Arrangement</span>
              <b>{job.arrangement}</b>
            </div>

            <div className={styles.meta}>
              <span>Posted</span>
              <b>{formatPostedAt(job.postedAt)}</b>
            </div>

            {job.applicationDeadline && (
              <div className={styles.meta}>
                <span>Deadline</span>
                <b>
                  {new Date(
                    job.applicationDeadline
                  ).toLocaleDateString()}
                </b>
              </div>
            )}
          </div>

          <section>
            <h3>About the role</h3>
            <p>{job.description}</p>
          </section>

          <section>
            <h3>Responsibilities</h3>

            <ul>
              {job.responsibilities.map(
                (responsibility: string, index: number) => (
                  <li key={index}>
                    {responsibility}
                  </li>
                )
              )}
            </ul>
          </section>

          <section>
            <h3>Qualifications</h3>

            <ul>
              {job.qualifications.map(
                (qualification: string, index: number) => (
                  <li key={index}>
                    {qualification}
                  </li>
                )
              )}
            </ul>
          </section>

          {job.preferredQualifications && (
            <section>
              <h3>Preferred qualifications</h3>
              <p>{job.preferredQualifications}</p>
            </section>
          )}

          <section>
            <h3>Skills</h3>

            <div className={styles.skills}>
              {job.skills.map(
                (skill: Job["skills"][number]) => (
                  <span
                    key={skill.id}
                    className={styles.skillTag}
                  >
                    {skill.label}
                  </span>
                )
              )}
            </div>
          </section>

          {job.benefits && (
            <section>
              <h3>Benefits</h3>
              <p>{job.benefits}</p>
            </section>
          )}

          <section>
            <h3>About the company</h3>
            <p>
              {job.company.name} is part of the Fockis platform.
            </p>
          </section>
        </div>

        <aside className={styles.sticky}>
          <div className={styles.pay}>
            {formatSalary(job)}
          </div>

          {job.applicationDeadline && (
            <div className={styles.deadline}>
              Applications close{" "}
              {new Date(
                job.applicationDeadline
              ).toLocaleDateString()}
            </div>
          )}

          <button
            className={styles.btnPrimary}
            onClick={() =>
              navigate(
                `/careers/jobs/${job.id}/apply`
              )
            }
          >
            Apply now
          </button>

          <button
            className={styles.btnOutline}
            onClick={() =>
              navigate(
                `/careers/jobs/${job.id}/apply`
              )
            }
          >
            Easy Apply
          </button>

          <div className={styles.rowBtns}>
            <button
              className={styles.btnGhost}
              onClick={() => toggleSave(job.id)}
            >
              {isSaved ? "♥ Saved" : "♡ Save"}
            </button>

            <button
              className={styles.btnGhost}
              onClick={() =>
                navigator.clipboard?.writeText(
                  window.location.href
                )
              }
            >
              ↗ Share
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
