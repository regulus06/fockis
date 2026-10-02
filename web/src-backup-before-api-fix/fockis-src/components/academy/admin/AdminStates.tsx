export function AdminLoading({ label = 'Loading…' }: { label?: string }) {
  return <div className="admin-state">{label}</div>;
}

export function AdminEmpty({ label }: { label: string }) {
  return <div className="admin-state">{label}</div>;
}

export function AdminError({ label, onRetry }: { label: string; onRetry?: () => void }) {
  return (
    <div className="admin-state error">
      {label}
      {onRetry && (
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-outline btn-sm" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
