import styles from '../../styles/EmployerCharts.module.scss';
import { formatEmployerNumber } from '../../utils/employerFormatters';

/** Sequential ramp: one hue, light → dark as candidates progress. */
const RAMP = ['#c4dcfb', '#93bff7', '#5d9ef1', '#2c7fe9', '#0f5fc4'];

export function FunnelChart({ stages }: { stages: { stage: string; label: string; count: number }[] }) {
  const top = Math.max(1, stages[0]?.count ?? 0);

  return (
    <ol className={styles.funnel} aria-label="Hiring funnel">
      {stages.map((stage, index) => {
        const share = stages[0]?.count ? Math.round((stage.count / stages[0].count) * 100) : 0;
        return (
          <li key={stage.stage} className={styles.funnelRow} title={`${stage.label}: ${stage.count} (${share}% of applicants)`}>
            <span className={styles.funnelName}>{stage.label}</span>
            <div>
              <div className={styles.funnelBar} style={{ width: `${(stage.count / top) * 100}%`, background: RAMP[index] ?? RAMP[RAMP.length - 1] }} />
            </div>
            <span className={styles.funnelValue}>
              {formatEmployerNumber(stage.count)}
              <small>{share}%</small>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default FunnelChart;
