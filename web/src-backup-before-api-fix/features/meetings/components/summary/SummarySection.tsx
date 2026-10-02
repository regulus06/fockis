import { type ReactNode } from 'react';
import '../../styles/components/summary.scss';

export function SummarySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="fm-summary-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
