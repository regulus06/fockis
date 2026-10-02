import { type ReactNode } from 'react';
import '../../styles/components/common.scss';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="fm-empty">
      {icon && <div className="fm-empty__icon">{icon}</div>}
      <div className="fm-empty__title">{title}</div>
      {description && <div className="fm-empty__desc">{description}</div>}
      {action && <div className="fm-empty__action">{action}</div>}
    </div>
  );
}
