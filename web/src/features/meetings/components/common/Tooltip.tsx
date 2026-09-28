import { type ReactNode } from 'react';
import '../../styles/components/common.scss';

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="fm-tooltip-wrap">
      {children}
      <span className="fm-tooltip" role="tooltip">{label}</span>
    </span>
  );
}
