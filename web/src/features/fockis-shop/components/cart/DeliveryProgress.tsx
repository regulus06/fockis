import { formatPrice } from '../../utils/currency';

interface DeliveryProgressProps {
  subtotal: number;
  threshold: number;
}

export function DeliveryProgress({ subtotal, threshold }: DeliveryProgressProps) {
  const pct = Math.min(100, (subtotal / threshold) * 100);
  const unlocked = subtotal >= threshold;
  const remaining = Math.max(0, threshold - subtotal);

  return (
    <div className="cart-delivery-progress">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      {unlocked ? (
        <div className="unlocked show">✓ Free delivery unlocked</div>
      ) : (
        <div className="progress-note">Add {formatPrice(remaining)} more to unlock free delivery.</div>
      )}
    </div>
  );
}
