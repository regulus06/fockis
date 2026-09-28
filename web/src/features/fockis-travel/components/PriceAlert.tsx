import { Bell, Pause, Play, Trash2 } from 'lucide-react';

export interface PriceAlertProps {
  id: string;
  destination: string;
  originalPrice: number;
  currentPrice: number;
  targetPrice?: number;
  currency?: string;
  paused?: boolean;
  loading?: boolean;

  onTogglePause?: (id: string) => void;
  onDelete?: (id: string) => void;
}

/**
 * A single real price-alert row.
 *
 * The component contains no hardcoded alert data.
 * All values come from TravelPriceAlertsPage / the API.
 */
export default function PriceAlert({
  id,
  destination,
  originalPrice,
  currentPrice,
  targetPrice,
  currency = '$',
  paused = false,
  loading = false,
  onTogglePause,
  onDelete,
}: PriceAlertProps) {
  const dropped = currentPrice < originalPrice;

  return (
    <div
      className={`price-alert-card${paused ? ' is-paused' : ''}`}
    >
      <div className="price-alert-card__info">
        <div className="dest">
          {destination}
        </div>

        <div className="old">
          {currency}
          {originalPrice}
          /night
        </div>

        {targetPrice !== undefined && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--slate, #5B6B76)',
              marginTop: 3,
            }}
          >
            Target: {currency}
            {targetPrice}
            /night
          </div>
        )}
      </div>

      <div className="price-alert-card__price">
        <div className="new">
          {currency}
          {currentPrice}
          /night
        </div>

        {dropped && (
          <span className="drop">
            <Bell
              size={10}
              aria-hidden="true"
              style={{
                verticalAlign: -1,
                marginRight: 3,
              }}
            />
            PRICE DROPPED
          </span>
        )}
      </div>

      <div className="price-alert-card__actions">
        <button
          type="button"
          className="icon-btn"
          aria-label={
            paused
              ? 'Resume alert'
              : 'Pause alert'
          }
          disabled={loading}
          onClick={() =>
            onTogglePause?.(id)
          }
        >
          {paused ? (
            <Play
              size={14}
              aria-hidden="true"
            />
          ) : (
            <Pause
              size={14}
              aria-hidden="true"
            />
          )}
        </button>

        <button
          type="button"
          className="icon-btn"
          aria-label="Delete alert"
          disabled={loading}
          onClick={() =>
            onDelete?.(id)
          }
        >
          <Trash2
            size={14}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}