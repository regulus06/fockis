import { type ReactNode } from 'react';
import '../../styles/components/scheduling.scss';

export function FormField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="fm-field">
      <span className="fm-field__label">{label}</span>
      {children}
      {hint && <span className="fm-field__hint">{hint}</span>}
    </label>
  );
}
