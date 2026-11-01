import { RefreshCw, TriangleAlert } from 'lucide-react';
import ui from '../../styles/EmployerShared.module.scss';

export interface EmployerErrorProps {
  message: string;
  title?: string;
  onRetry?: () => void;
}

export function EmployerError({ message, title = 'Something went wrong', onRetry }: EmployerErrorProps) {
  return (
    <div className={ui.state} role="alert">
      <span className={ui.stateIconError} aria-hidden="true">
        <TriangleAlert size={24} />
      </span>
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className={ui.btnSecondary} onClick={onRetry} style={{ marginTop: 8 }}>
          <RefreshCw size={15} /> Try again
        </button>
      )}
    </div>
  );
}

export default EmployerError;
