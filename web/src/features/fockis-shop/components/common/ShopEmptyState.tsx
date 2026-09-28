interface ShopEmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function ShopEmptyState({ icon = '🔍', title, message, action }: ShopEmptyStateProps) {
  return (
    <div className="shop-state-panel">
      <div className="shop-state-icon" aria-hidden="true">{icon}</div>
      <h4>{title}</h4>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
