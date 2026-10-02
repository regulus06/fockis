import { Link } from 'react-router-dom';
import { Trash2, ExternalLink, Heart } from 'lucide-react';

export type WishlistItemType =
  | 'Stay'
  | 'Destination'
  | 'Experience'
  | 'Restaurant'
  | 'Car';

export interface WishlistItem {
  id: string;
  type: WishlistItemType;
  name: string;
  image: string;
  href: string;
}

export interface WishlistPanelProps {
  items: WishlistItem[];
  compact?: boolean;
  loading?: boolean;
  onRemove?: (id: string) => void | Promise<void>;
}

/**
 * Displays real wishlist records supplied by the Travel wishlist API.
 *
 * This component does NOT create fake/default wishlist data.
 * The parent page should load the user's wishlist from the backend
 * and pass the records through the `items` prop.
 */
export default function WishlistPanel({
  items,
  compact = false,
  loading = false,
  onRemove,
}: WishlistPanelProps) {
  if (loading) {
    return (
      <div
        className={compact ? 'wishlist-panel' : undefined}
        aria-busy="true"
        aria-live="polite"
      >
        <div className="ft-empty-state">
          <div className="ic" aria-hidden="true">
            ⏳
          </div>
          <h4>Loading your wishlist...</h4>
          <p>We're getting your saved places.</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="ft-empty-state">
        <div className="ic" aria-hidden="true">
          <Heart size={28} />
        </div>

        <h4>Nothing saved yet</h4>

        <p>
          Tap the heart on any stay, restaurant, car or experience
          to save it here.
        </p>

        <Link to="/travel" className="btn btn-outline">
          Start exploring →
        </Link>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="wishlist-panel">
        <h3>Save places you love ❤️</h3>

        <p>
          Hotels, restaurants, cars, meeting rooms and destinations.
        </p>

        <div className="wish-grid">
          {items.slice(0, 2).map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className="wish-thumb"
              style={{
                backgroundImage: `url("${item.image}")`,
              }}
              aria-label={`View ${item.name}`}
            >
              <span className="heart" aria-hidden="true">
                ❤️
              </span>
            </Link>
          ))}
        </div>

        <Link
          to="/travel/wishlist"
          className="btn btn-outline btn-block"
          style={{ marginTop: 16 }}
        >
          View wishlist →
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {items.map((item) => (
        <div key={item.id} className="wishlist-item">
          <img
            src={item.image}
            alt=""
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.visibility = 'hidden';
            }}
          />

          <div className="wishlist-item__body">
            <div className="wishlist-item__type">
              {item.type}
            </div>

            <h4>{item.name}</h4>
          </div>

          <div className="wishlist-item__actions">
            <Link
              to={item.href}
              className="icon-btn"
              aria-label={`View ${item.name}`}
              title={`View ${item.name}`}
            >
              <ExternalLink size={14} aria-hidden="true" />
            </Link>

            {onRemove && (
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove ${item.name} from wishlist`}
                title="Remove from wishlist"
                onClick={() => {
                  void onRemove(item.id);
                }}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}