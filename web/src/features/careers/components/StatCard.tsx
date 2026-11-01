
import styles from '../styles/StatCard.module.scss';

interface StatCardProps {
  value: string | number;
  label: string;
  trend?: string;
}

export function StatCard({
  value,
  label,
  trend,
}: StatCardProps) {
  const displayValue =
    typeof value === 'number'
      ? new Intl.NumberFormat().format(value)
      : value;

  return (
    <article
      className={styles.card}
      aria-label={`${label}: ${displayValue}`}
    >
      <div className={styles.num}>
        {displayValue}
      </div>

      <div className={styles.lbl}>
        {label}
      </div>

      {trend && (
        <div className={styles.trend}>
          {trend}
        </div>
      )}
    </article>
  );
}
