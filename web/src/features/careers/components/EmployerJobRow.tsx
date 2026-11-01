
import type { EmployerJobSummary } from '../types';

import styles from '../styles/EmployerJobRow.module.scss';

interface EmployerJobRowProps {
  job: EmployerJobSummary;
  onManage: (job: EmployerJobSummary) => void;
}

const STATUS_LABELS: Record<EmployerJobSummary['status'], string> = {
  live: 'Live',
  draft: 'Draft',
  closed: 'Closed',
};

const formatCount = (value: number): string =>
  new Intl.NumberFormat().format(
    Number.isFinite(value) ? Math.max(0, value) : 0,
  );

export function EmployerJobRow({
  job,
  onManage,
}: EmployerJobRowProps) {
  const statusLabel = STATUS_LABELS[job.status] ?? job.status;

  return (
    <article className={styles.row}>
      <div className={styles.grow}>
        <div className={styles.title}>
          {job.title}
        </div>

        <div className={styles.sub}>
          <span>{job.jobType}</span>
          <span aria-hidden="true"> · </span>
          <span className={styles.mono}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className={styles.stat}>
        <div className={styles.n}>
          {formatCount(job.applicantCount)}
        </div>

        <div className={styles.l}>
          Applicants
        </div>
      </div>

      <div className={styles.stat}>
        <div className={styles.n}>
          {formatCount(job.viewCount)}
        </div>

        <div className={styles.l}>
          Views
        </div>
      </div>

      <button
        type="button"
        className={styles.manageBtn}
        onClick={() => onManage(job)}
        aria-label={`Manage ${job.title}`}
      >
        Manage
      </button>
    </article>
  );
}
