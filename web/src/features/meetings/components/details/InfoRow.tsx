import { type ReactNode } from 'react';
import '../../styles/components/details.scss';

export function InfoRow({ label, value, action }: { label: string; value: ReactNode; action?: ReactNode }) {
  return (
    <div className="fm-info-row">
      <span className="fm-info-row__label">{label}</span>
      <span className="fm-info-row__value">{value}</span>
      {action}
    </div>
  );
}
