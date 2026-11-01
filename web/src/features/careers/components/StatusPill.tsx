
import styles from '../styles/StatusPill.module.scss';

export type ApplicationStatus =
  | 'applied'
  | 'viewed'
  | 'shortlisted'
  | 'interview'
  | 'offer'
  | 'rejected';

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  viewed: 'Viewed',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

interface StatusPillProps {
  status: ApplicationStatus;
}

export function StatusPill({ status }: StatusPillProps) {
  const label = STATUS_LABEL[status];

  return (
    <span
      className={`${styles.pill} ${styles[status] ?? ''}`}
      role="status"
      aria-label={`Application status: ${label}`}
    >
      {label}
    </span>
  );
}
