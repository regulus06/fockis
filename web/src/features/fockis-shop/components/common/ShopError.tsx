interface ShopErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ShopError({ title = "Something didn't load", message, onRetry }: ShopErrorProps) {
  return (
    <div className="shop-state-panel shop-state-panel--error" role="alert">
      <div className="shop-state-icon" aria-hidden="true">⚠️</div>
      <h4>{title}</h4>
      {message && <p>{message}</p>}
      {onRetry && (
        <button type="button" className="btn btn-outline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
