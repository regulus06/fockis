import ui from '../../styles/EmployerShared.module.scss';

export interface EmployerLoadingProps {
  label?: string;
  /** Render skeleton rows instead of a spinner. */
  rows?: number;
}

export function EmployerLoading({ label = 'Loading…', rows }: EmployerLoadingProps) {
  if (rows) {
    return (
      <div style={{ display: 'grid', gap: 14, padding: 20 }} role="status" aria-label={label}>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className={ui.skeleton} style={{ width: `${92 - (index % 3) * 14}%` }} />
        ))}
      </div>
    );
  }

  return (
    <div className={ui.state} role="status">
      <span className={ui.spinner} aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export default EmployerLoading;
