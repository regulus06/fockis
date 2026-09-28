import { useEffect, useMemo, useState } from 'react';

import { useCart } from '../../hooks/useCart';
import { getShippingEstimates } from '../../services/checkoutApi';
import { formatPrice } from '../../utils/currency';

import type {
ShippingEstimate,
ShippingMethodOption,
} from '../../types/shipping.types';

export function DeliveryProgress() {
const {
items,
totals,
isHydrating,
isSyncing,
} = useCart();

const [estimates, setEstimates] = useState<ShippingEstimate[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const subtotal = Number(totals.subtotal) || 0;

useEffect(() => {
let cancelled = false;

async function loadShippingEstimates() {
  if (!items.length) {
    setEstimates([]);
    setError(null);
    setLoading(false);
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const result = await getShippingEstimates(items);

    if (!cancelled) {
      setEstimates(Array.isArray(result) ? result : []);
    }
  } catch (requestError) {
    if (cancelled) {
      return;
    }

    const message =
      requestError instanceof Error
        ? requestError.message
        : 'Unable to load delivery options.';

    setEstimates([]);
    setError(message);
  } finally {
    if (!cancelled) {
      setLoading(false);
    }
  }
}

void loadShippingEstimates();

return () => {
  cancelled = true;
};

}, [items]);

const optionCount = useMemo(
() =>
estimates.reduce(
(total, estimate) =>
total + estimate.options.length,
0,
),
[estimates],
);

const availableStoreCount = estimates.filter(
(estimate) => estimate.options.length > 0,
).length;

const freeDeliveryOptions = useMemo(
() =>
estimates.flatMap(
(estimate) =>
estimate.options.filter(
(option) =>
option.freeAbove !== null &&
option.freeAbove !== undefined,
),
),
[estimates],
);

const getDeliveryTypeLabel = (
type: ShippingMethodOption['type'],
) => {
switch (type) {
case 'local_delivery':
return 'Local delivery';

  case 'national_delivery':
    return 'National delivery';

  case 'international':
    return 'International';

  case 'pickup':
    return 'Pickup';

  default:
    return type;
}

};

const formatEstimatedDays = (
option: ShippingMethodOption,
) => {
const min = Number(option.estimatedDays?.min);
const max = Number(option.estimatedDays?.max);

if (
  !Number.isFinite(min) ||
  !Number.isFinite(max)
) {
  return null;
}

if (min === max) {
  return `${min} day${min === 1 ? '' : 's'}`;
}

return `${min}–${max} days`;
};

return ( <section> <div className="wrap"> <div className="section-head"> <div> <div className="sec-label"> <span className="num">09</span>
DELIVERY </div>

        <h2>Delivery options</h2>
      </div>
    </div>

    <div className="fd-band">
      <div>
        <div className="fd-flow">
          <div className="fd-node">
            Cart
          </div>

          <span className="fd-arrow">
            ↓
          </span>

          <div
            className="fd-node"
            style={{
              borderColor: 'var(--brass-light)',
              color: 'var(--brass-light)',
            }}
          >
            Available delivery options
          </div>
        </div>

        <div className="fd-examples">
          <div className="fd-example">
            <span>
              Cart subtotal
            </span>

            <span className="amt mono">
              {formatPrice(subtotal)}
            </span>
          </div>

          <div className="fd-example">
            <span>
              Stores with delivery data
            </span>

            <span className="amt mono">
              {availableStoreCount}
            </span>
          </div>

          <div className="fd-example">
            <span>
              Available options
            </span>

            <span className="amt mono">
              {optionCount}
            </span>
          </div>
        </div>

        {isHydrating || isSyncing ? (
          <p
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 12.5,
              marginTop: 16,
            }}
          >
            Updating your cart...
          </p>
        ) : loading ? (
          <p
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 12.5,
              marginTop: 16,
            }}
          >
            Loading available delivery options...
          </p>
        ) : error ? (
          <p
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 12.5,
              marginTop: 16,
            }}
          >
            Delivery options could not be loaded.
          </p>
        ) : !items.length ? (
          <p
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 12.5,
              marginTop: 16,
            }}
          >
            Add products to your cart to see delivery options.
          </p>
        ) : !optionCount ? (
          <p
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 12.5,
              marginTop: 16,
            }}
          >
            No delivery options are currently available for the
            products in your cart.
          </p>
        ) : (
          <div
            style={{
              marginTop: 20,
              display: 'grid',
              gap: 10,
            }}
          >
            {estimates.map((estimate) => (
              <div
                key={estimate.storeId}
                style={{
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.55)',
                    marginBottom: 10,
                  }}
                >
                  Store {estimate.storeId}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  {estimate.options.map((option) => (
                    <div
                      key={option.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        padding: '8px 0',
                      }}
                    >
                      <div>
                        <div>
                          {option.label}
                        </div>

                        <div
                          style={{
                            color: 'rgba(255,255,255,0.55)',
                            fontSize: 12,
                            marginTop: 3,
                          }}
                        >
                          {getDeliveryTypeLabel(option.type)}
                          {formatEstimatedDays(option)
                            ? ` · ${formatEstimatedDays(option)}`
                            : ''}
                        </div>
                      </div>

                      <div
                        className="mono"
                        style={{
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatPrice(Number(option.price) || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cart-panel">
        <h4>
          Cart
        </h4>

        <div className="cart-total mono">
          {formatPrice(subtotal)}
        </div>

        {loading ? (
          <div className="progress-note">
            Loading delivery options...
          </div>
        ) : error ? (
          <div className="progress-note">
            Delivery information is unavailable right now.
          </div>
        ) : !items.length ? (
          <div className="progress-note">
            Your cart is empty.
          </div>
        ) : optionCount > 0 ? (
          <div className="unlocked show">
            ✓ Delivery options available
          </div>
        ) : (
          <div className="progress-note">
            No delivery options available.
          </div>
        )}

        {freeDeliveryOptions.length > 0 && (
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            {freeDeliveryOptions.length} option
            {freeDeliveryOptions.length === 1 ? '' : 's'} include
            {freeDeliveryOptions.length === 1 ? 's' : ''} a
            seller-defined free-delivery threshold.
          </div>
        )}
      </div>
    </div>
  </div>
</section>

);
}
