interface ShopErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ShopError({ title = "Something didn't load", message, onRetry }: ShopErrorProps) {
  return (
    <div className="shop-state-panel">
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
