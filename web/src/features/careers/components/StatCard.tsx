import styles from '../styles/StatCard.module.scss';

interface StatCardProps {
  value: string | number;
  label: string;
  trend?: string;
}

export function StatCard({ value, label, trend }: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.num}>{value}</div>
      <div className={styles.lbl}>{label}</div>
      {trend && <div className={styles.trend}>{trend}</div>}
    </div>
  );
}
