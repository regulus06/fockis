import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import ui from '../../styles/EmployerShared.module.scss';

export interface EmployerEmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmployerEmptyState({ title, description, icon, action }: EmployerEmptyStateProps) {
  return (
    <div className={ui.state}>
      <span className={ui.stateIcon} aria-hidden="true">
        {icon ?? <Inbox size={24} />}
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

export default EmployerEmptyState;
