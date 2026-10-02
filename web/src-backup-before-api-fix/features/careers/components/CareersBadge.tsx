import styles from '../styles/CareersBadge.module.scss';

export type BadgeVariant = 'internship' | 'coop' | 'remote' | 'paid' | 'fulltime';

interface CareersBadgeProps {
  variant: BadgeVariant;
  label: string;
}

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  internship: styles.internship,
  coop: styles.coop,
  remote: styles.remote,
  paid: styles.paid,
  fulltime: styles.fulltime,
};

export function CareersBadge({ variant, label }: CareersBadgeProps) {
  return <span className={`${styles.badge} ${VARIANT_CLASS[variant]}`}>{label}</span>;
}
