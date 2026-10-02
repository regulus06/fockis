export function AdminLoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="fk-state">
      <div className="fk-spinner" />
      <p>{label}</p>
    </div>
  );
}

export function AdminEmptyState({
  title = 'Nothing here yet',
  description,
  icon = '\u{1F4ED}',
}: {
  title?: string;
  description?: string;
  icon?: string;
}) {
  return (
    <div className="fk-state">
      <div className="fk-state__icon">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}

export function AdminErrorState({
  message = 'Something went wrong loading this data.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="fk-state">
      <div className="fk-state__icon">⚠️</div>
      <h3>Couldn't load this</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="fk-btn fk-btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
