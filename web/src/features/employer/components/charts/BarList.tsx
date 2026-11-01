import { Link } from 'react-router-dom';
import styles from '../../styles/EmployerCharts.module.scss';
import { formatEmployerNumber } from '../../utils/employerFormatters';

export interface BarListItem {
  id: string;
  label: string;
  value: number;
  href?: string;
  detail?: string;
}

/** Horizontal single-series bars, sorted by the caller. */
export function BarList({ items, valueLabel }: { items: BarListItem[]; valueLabel: string }) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <ol className={styles.bars}>
      {items.map((item) => (
        <li key={item.id} className={styles.barRow} title={`${item.label}: ${item.value} ${valueLabel}${item.detail ? ` · ${item.detail}` : ''}`}>
          <div className={styles.barLabel}>
            <span>{item.href ? <Link to={item.href} style={{ color: 'inherit', textDecoration: 'none' }}>{item.label}</Link> : item.label}</span>
            <b>{formatEmployerNumber(item.value)}</b>
          </div>
          <div className={styles.barTrack} aria-hidden="true">
            <div className={styles.barFill} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export default BarList;
