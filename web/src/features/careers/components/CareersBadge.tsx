
import styles from '../styles/CareersBadge.module.scss';

export type BadgeVariant =
  | 'internship'
  | 'coop'
  | 'remote'
  | 'paid'
  | 'fulltime';

interface CareersBadgeProps {
  variant: BadgeVariant;
  label: string;
  className?: string;
  title?: string;
}

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  internship: styles.internship,
  coop: styles.coop,
  remote: styles.remote,
  paid: styles.paid,
  fulltime: styles.fulltime,
};

export function CareersBadge({
  variant,
  label,
  className,
  title,
}: CareersBadgeProps) {
  const variantClass = VARIANT_CLASS[variant] ?? '';

  return (
    <span
      className={[
        styles.badge,
        variantClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={title ?? label}
    >
      {label}
    </span>
  );
}
