import { type ReactNode } from 'react';
import '../../styles/components/common.scss';

interface BadgeProps {
  tone?: 'neutral' | 'live' | 'warning' | 'danger' | 'success' | 'ai';
  children: ReactNode;
  dot?: boolean;
}

export function Badge({ tone = 'neutral', children, dot }: BadgeProps) {
  return (
    <span className={`fm-badge fm-badge--${tone}`}>
      {dot && <span className="fm-badge__dot" />}
      {children}
    </span>
  );
}
