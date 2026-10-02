import { type ReactNode } from 'react';
import '../../styles/components/secretary.scss';

export function SecretarySection({ title, children, empty }: { title: string; children: ReactNode; empty?: boolean }) {
  if (empty) return null;
  return (
    <div className="fm-secretary-section">
      <h5>{title}</h5>
      {children}
    </div>
  );
}
