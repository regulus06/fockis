interface ShopEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export function ShopEmptyState({ icon = '🔍', title, message, action, compact = false }: ShopEmptyStateProps) {
  return (
    <div className={compact ? 'shop-state-panel shop-state-panel--compact' : 'shop-state-panel'}>
      <div className="shop-state-icon" aria-hidden="true">{icon}</div>
      <h4>{title}</h4>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
