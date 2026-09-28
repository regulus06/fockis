import styles from "../styles/StatusPill.module.scss";

export type ApplicationStatus =
  | "applied"
  | "viewed"
  | "shortlisted"
  | "interview"
  | "offer"
  | "rejected";

const STATUS_LABEL: Record<
  ApplicationStatus,
  string
> = {
  applied: "Applied",
  viewed: "Viewed",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

interface StatusPillProps {
  status: ApplicationStatus;
}

export function StatusPill({
  status,
}: StatusPillProps) {
  return (
    <span
      className={`${styles.pill} ${styles[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
