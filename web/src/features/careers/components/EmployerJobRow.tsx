import type { EmployerJobSummary } from "../types";
import styles from "../styles/EmployerJobRow.module.scss";

interface EmployerJobRowProps {
  job: EmployerJobSummary;
  onManage: (job: EmployerJobSummary) => void;
}

export function EmployerJobRow({
  job,
  onManage,
}: EmployerJobRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.grow}>
        <div className={styles.title}>
          {job.title}
        </div>

        <div className={styles.sub}>
          {job.jobType} ·{" "}
          <span className={styles.mono}>
            {job.status}
          </span>
        </div>
      </div>

      <div className={styles.stat}>
        <div className={styles.n}>
          {job.applicantCount}
        </div>

        <div className={styles.l}>
          Applicants
        </div>
      </div>

      <div className={styles.stat}>
        <div className={styles.n}>
          {job.viewCount}
        </div>

        <div className={styles.l}>
          Views
        </div>
      </div>

      <button
        type="button"
        className={styles.manageBtn}
        onClick={() => onManage(job)}
      >
        Manage
      </button>
    </div>
  );
}
