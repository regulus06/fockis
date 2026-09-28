import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

import CategoryTabs from '../components/CategoryTabs';
import WishlistPanel, {
  type WishlistItem as PanelWishlistItem,
} from '../components/WishlistPanel';

import wishlistApi, {
  type WishlistItem as ApiWishlistItem,
} from '../services/wishlistApi';
import '../styles/TravelWishlistPage.scss';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'Stay', label: 'Stays' },
  { id: 'Destination', label: 'Destinations' },
  { id: 'Experience', label: 'Experiences' },
  { id: 'Restaurant', label: 'Restaurants' },
  { id: 'Car', label: 'Cars' },
];

type WishlistType = PanelWishlistItem['type'];

function getStringValue(
  value: unknown,
  fallback = '',
): string {
  return typeof value === 'string' ? value : fallback;
}

function getListingValue(
  listing: unknown,
  key: string,
): unknown {
  if (
    listing &&
    typeof listing === 'object' &&
    key in listing
  ) {
    return (listing as Record<string, unknown>)[key];
  }

  return undefined;
}

/**
 * Converts the backend wishlist item into the shape expected by
 * WishlistPanel.
 */
function normalizeWishlistItem(
  item: ApiWishlistItem,
  index: number,
): PanelWishlistItem | null {
  const listing =
    item.listing &&
    typeof item.listing === 'object'
      ? item.listing
      : null;

  const listingId =
    getStringValue(item.listingId) ||
    getStringValue(item.id) ||
    getStringValue(item._id);

  if (!listingId) {
    return null;
  }

  const name =
    getStringValue(getListingValue(listing, 'name')) ||
    getStringValue(getListingValue(listing, 'title')) ||
    getStringValue(item.name) ||
    `Saved travel item ${index + 1}`;

  const image =
    getStringValue(getListingValue(listing, 'image')) ||
    getStringValue(getListingValue(listing, 'imageUrl')) ||
    getStringValue(getListingValue(listing, 'coverImage')) ||
    getStringValue(getListingValue(listing, 'thumbnail')) ||
    getStringValue(item.image);

  const rawType =
    getStringValue(getListingValue(listing, 'type')) ||
    getStringValue(getListingValue(listing, 'category')) ||
    getStringValue(item.type);

  let type: WishlistType = 'Destination';

  switch (rawType.toLowerCase()) {
    case 'stay':
    case 'hotel':
    case 'hotels':
    case 'accommodation':
      type = 'Stay';
      break;

    case 'experience':
    case 'experiences':
    case 'tour':
    case 'activity':
      type = 'Experience';
      break;

    case 'restaurant':
    case 'restaurants':
    case 'dining':
      type = 'Restaurant';
      break;

    case 'car':
    case 'cars':
    case 'rental':
    case 'rental car':
      type = 'Car';
      break;

    case 'destination':
    case 'destinations':
    default:
      type = 'Destination';
      break;
  }

  const href =
    getStringValue(getListingValue(listing, 'href')) ||
    getStringValue(getListingValue(listing, 'url')) ||
    `/travel`;

  return {
    id: listingId,
    type,
    name,
    image,
    href,
  };
}

/**
 * Saved travel items loaded from the real Travel wishlist API.
 */
export default function TravelWishlistPage() {
  const [tab, setTab] = useState('all');

  const [items, setItems] = useState<PanelWishlistItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadWishlist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      /*
       * IMPORTANT:
       *
       * wishlistApi.list() is typed as WishlistItem[].
       * Therefore we use the returned value directly.
       *
       * DO NOT use response.data here.
       */
      const response = await wishlistApi.list();

      const apiItems: ApiWishlistItem[] = Array.isArray(response)
        ? response
        : [];

      const normalized: PanelWishlistItem[] = apiItems
        .map((item: ApiWishlistItem, index: number) =>
          normalizeWishlistItem(item, index),
        )
        .filter(
          (
            item: PanelWishlistItem | null,
          ): item is PanelWishlistItem => item !== null,
        );

      setItems(normalized);
    } catch (err) {
      console.error('Failed to load travel wishlist:', err);

      setItems([]);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load your wishlist.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWishlist();
  }, [loadWishlist]);

  const filtered = useMemo(() => {
    if (tab === 'all') {
      return items;
    }

    return items.filter(
      (item: PanelWishlistItem) => item.type === tab,
    );
  }, [items, tab]);

  const handleRemove = async (id: string) => {
    try {
      setRemovingId(id);
      setError(null);

      /*
       * The backend remove endpoint expects the listing ID.
       */
      await wishlistApi.remove(id);

      /*
       * Update the UI immediately after the backend confirms deletion.
       */
      setItems((previous) =>
        previous.filter(
          (item: PanelWishlistItem) => item.id !== id,
        ),
      );
    } catch (err) {
      console.error('Failed to remove wishlist item:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to remove this item from your wishlist.',
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="travel-wishlist-page">
      <section className="tight">
        <div className="wrap">
          <div className="eyebrow">Wishlist</div>

          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
            }}
          >
            Saved for later
          </h1>

          <p
            style={{
              color: 'var(--slate, #5B6B76)',
              marginTop: 10,
              maxWidth: 560,
            }}
          >
            Your saved stays, destinations, experiences,
            restaurants and cars are stored here.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          {error && (
            <div
              role="alert"
              style={{
                marginBottom: 20,
                padding: '14px 16px',
                borderRadius: 12,
                background: '#fff4f4',
                border: '1px solid #f0caca',
                color: '#9b2c2c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <span>{error}</span>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => void loadWishlist()}
                disabled={loading}
              >
                <RefreshCw size={15} aria-hidden="true" />
                Try again
              </button>
            </div>
          )}

          {!loading && (
            <div className="wishlist-tabs">
              <CategoryTabs
                categories={TABS}
                activeId={tab}
                onChange={setTab}
                bordered
              />
            </div>
          )}

          {loading ? (
            <div
              className="ft-empty-state"
              style={{
                minHeight: 260,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Loader2
                size={30}
                aria-hidden="true"
                style={{
                  animation: 'spin 1s linear infinite',
                }}
              />

              <h4 style={{ marginTop: 14 }}>
                Loading your wishlist…
              </h4>

              <p>
                We’re retrieving your saved travel items.
              </p>
            </div>
          ) : (
            <WishlistPanel
              items={filtered}
              onRemove={handleRemove}
            />
          )}

          {removingId && (
            <div
              aria-live="polite"
              style={{
                marginTop: 12,
                fontSize: 13,
                color: 'var(--slate, #5B6B76)',
              }}
            >
              Removing saved item…
            </div>
          )}
        </div>
      </section>
    </div>
  );
}