import type { ShippingEstimate as ShippingEstimateType } from '../../types/shipping.types';
import { formatPrice } from '../../utils/currency';

interface ShippingEstimateProps {
  estimate: ShippingEstimateType;
  selectedOptionId?: string | null;
  onSelect?: (optionId: string) => void;
}

export function ShippingEstimate({ estimate, selectedOptionId, onSelect }: ShippingEstimateProps) {
  return (
    <div className="shipping-estimate">
      {estimate.options.map((opt) => (
        <label key={opt.id} className="shipping-estimate-option">
          <input
            type="radio"
            name={`shipping-${estimate.storeId}`}
            checked={selectedOptionId === opt.id}
            onChange={() => onSelect?.(opt.id)}
          />
          <span className="shipping-estimate-label">{opt.label}</span>
          <span className="shipping-estimate-eta mono">
            {opt.estimatedDays.min === opt.estimatedDays.max ? `${opt.estimatedDays.min} day` : `${opt.estimatedDays.min}–${opt.estimatedDays.max} days`}
          </span>
          <span className="shipping-estimate-price mono">{opt.price === 0 ? 'Free' : formatPrice(opt.price)}</span>
        </label>
      ))}
    </div>
  );
}
