import type { ReactNode } from 'react';
import { TrendingUp } from 'lucide-react';
import ui from '../../styles/EmployerShared.module.scss';
import { formatEmployerNumber } from '../../utils/employerFormatters';

export interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number | string | null;
  /** Positive count shown as "+N this week". */
  delta?: number;
  deltaLabel?: string;
  hint?: string;
}

export function StatCard({ icon, label, value, delta, deltaLabel = 'this week', hint }: StatCardProps) {
  return (
    <div className={ui.statCard}>
      <span className={ui.statIcon} aria-hidden="true">{icon}</span>
      <span className={ui.statValue}>{typeof value === 'number' ? formatEmployerNumber(value) : value ?? '—'}</span>
      <span className={ui.statLabel}>{label}</span>
      {typeof delta === 'number' && delta > 0 && (
        <span className={ui.statDelta}>
          <TrendingUp size={13} aria-hidden="true" /> +{formatEmployerNumber(delta)} {deltaLabel}
        </span>
      )}
      {hint && <span className={ui.statHint}>{hint}</span>}
    </div>
  );
}

export default StatCard;
