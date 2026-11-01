import { useState } from 'react';
import styles from '../../styles/EmployerCharts.module.scss';
import { formatEmployerNumber } from '../../utils/employerFormatters';

/** Validated categorical order (see dataviz palette check). Never cycled. */
export const SERIES_COLORS = ['#1677e8', '#0ea5a4', '#a78bfa'];

export interface DonutSlice {
  label: string;
  value: number;
}

export function DonutChart({ slices, centerLabel }: { slices: DonutSlice[]; centerLabel: string }) {
  const [active, setActive] = useState<number | null>(null);
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = 15.9155;
  const circumference = 2 * Math.PI * radius;
  const gap = total > 0 && slices.filter((s) => s.value > 0).length > 1 ? 0.8 : 0;

  let offset = 0;

  return (
    <div className={styles.donutWrap}>
      <div className={styles.donut}>
        <svg viewBox="0 0 42 42" role="img" aria-label={`${centerLabel}: ${slices.map((s) => `${s.label} ${s.value}`).join(', ')}`}>
          <circle cx="21" cy="21" r={radius} fill="none" stroke="#eef0f7" strokeWidth="5" />
          {total > 0 &&
            slices.map((slice, index) => {
              const length = (slice.value / total) * circumference;
              const dash = Math.max(0, length - gap);
              const element = (
                <circle
                  key={slice.label}
                  cx="21"
                  cy="21"
                  r={radius}
                  fill="none"
                  stroke={SERIES_COLORS[index]}
                  strokeWidth={active === index ? 6 : 5}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  opacity={active === null || active === index ? 1 : 0.35}
                  onPointerEnter={() => setActive(index)}
                  onPointerLeave={() => setActive(null)}
                >
                  <title>{`${slice.label}: ${slice.value} (${Math.round((slice.value / total) * 100)}%)`}</title>
                </circle>
              );
              offset += length;
              return element;
            })}
        </svg>
        <div className={styles.donutCenter}>
          <strong>{formatEmployerNumber(active !== null ? slices[active].value : total)}</strong>
          <span>{active !== null ? slices[active].label : centerLabel}</span>
        </div>
      </div>
      <ul className={styles.legend}>
        {slices.map((slice, index) => (
          <li key={slice.label} onPointerEnter={() => setActive(index)} onPointerLeave={() => setActive(null)}>
            <span className={styles.swatch} style={{ background: SERIES_COLORS[index] }} aria-hidden="true" />
            {slice.label}
            <b>
              {formatEmployerNumber(slice.value)}
              {total > 0 && <span style={{ color: '#7a819e', fontWeight: 500 }}> · {Math.round((slice.value / total) * 100)}%</span>}
            </b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DonutChart;
