import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

import StayCard from '../components/StayCard';
import '../styles/TravelStaysPage.scss';

interface Listing {
  _id: string;
  name: string;
  type: string;
  description?: string;
  country: string;
  city: string;
  address?: string;
  images?: string[];
  amenities?: string[];
  tags?: string[];
  rating?: number;
  reviewCount?: number;
  currency: string;
  price: number;
  priceUnit?: string;
  active?: boolean;
}

interface ListingsResponse {
  items: Listing[];
  total: number;
  page: number;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL;

function getListingImage(listing: Listing): string {
  return (
    listing.images?.[0] ||
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'
  );
}

function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    HTG: 'G',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    DOP: 'RD$',
    JPY: '¥',
    AUD: 'A$',
  };

  return symbols[currency?.toUpperCase()] || currency || '$';
}

function getAmenities(listing: Listing): string {
  if (listing.amenities?.length) {
    return listing.amenities.slice(0, 4).join(' · ');
  }

  return 'Comfortable stay · Fockis verified';
}

export default function TravelStaysPage() {
  const [stays, setStays] = useState<Listing[]>([]);
  const [sort, setSort] = useState<
    'recommended' | 'price-low' | 'price-high' | 'rating'
  >('recommended');

  const [minRating, setMinRating] = useState(0);
  const [destination, setDestination] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /*
   * Load real stays from the Fockis Travel backend.
   *
   * Endpoint:
   * GET /travel/listings?type=stay
   */
  useEffect(() => {
    let cancelled = false;

    async function loadStays() {
      try {
        setLoading(true);
        setError('');

        const params = new URLSearchParams({
          type: 'stay',
          limit: '100',
          skip: '0',
        });

        const response = await fetch(
          `${API_BASE_URL}/travel/listings?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          },
        );

        if (!response.ok) {
          throw new Error(
            `Unable to load stays. Server returned ${response.status}.`,
          );
        }

        const data: ListingsResponse = await response.json();

        if (!cancelled) {
          setStays(Array.isArray(data.items) ? data.items : []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Travel stays error:', err);

          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load stays right now.',
          );

          setStays([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStays();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Client-side filtering and sorting.
   *
   * The backend already returns only:
   * type=stay
   */
  const filtered = useMemo(() => {
    let list = stays.filter((stay) => {
      const rating = stay.rating ?? 0;

      const search = destination.trim().toLowerCase();

      const matchesRating = rating >= minRating;

      const matchesDestination =
        !search ||
        stay.city?.toLowerCase().includes(search) ||
        stay.country?.toLowerCase().includes(search) ||
        stay.name?.toLowerCase().includes(search) ||
        stay.address?.toLowerCase().includes(search);

      return matchesRating && matchesDestination;
    });

    list = [...list];

    if (sort === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    }

    if (sort === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    }

    if (sort === 'rating') {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    return list;
  }, [stays, sort, minRating, destination]);

  function clearFilters() {
    setDestination('');
    setMinRating(0);
    setSort('recommended');
  }

  return (
    <div className="travel-stays-page">
      <section className="tight">
        <div className="wrap">
          <div className="eyebrow">Stays</div>

          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>
            Find your perfect stay
          </h1>

          <p
            style={{
              color: 'var(--slate, #5B6B76)',
              marginTop: 10,
              maxWidth: 520,
            }}
          >
            Hotels, resorts, apartments and villas — for the international
            traveler and the local guest alike.
          </p>

          <form
            className="travel-search travel-search--inline"
            style={{ marginTop: 28 }}
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="search-fields">
              <label className="field">
                <span>Destination</span>

                <input
                  id="s-dest"
                  className="value"
                  placeholder="Search by city or country"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Check-in</span>

                <input
                  id="s-checkin"
                  type="date"
                  className="value"
                />
              </label>

              <label className="field">
                <span>Check-out</span>

                <input
                  id="s-checkout"
                  type="date"
                  className="value"
                />
              </label>

              <button type="submit" className="search-submit">
                Search →
              </button>
            </div>
          </form>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="stays-filters-row">
            <span className="ft-pill">
              <SlidersHorizontal size={13} aria-hidden="true" />
              Filters
            </span>

            <label className="ft-field" style={{ margin: 0 }}>
              <span className="ft-hide-mobile">Min rating</span>

              <select
                id="min-rating"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
              >
                <option value={0}>Any rating</option>
                <option value={4}>4.0+</option>
                <option value={4.5}>4.5+</option>
              </select>
            </label>

            <label
              className="ft-field"
              style={{ margin: '0 0 0 auto' }}
            >
              <span className="ft-hide-mobile">Sort by</span>

              <select
                id="stay-sort"
                value={sort}
                onChange={(e) =>
                  setSort(e.target.value as typeof sort)
                }
              >
                <option value="recommended">Recommended</option>
                <option value="price-low">
                  Price: low to high
                </option>
                <option value="price-high">
                  Price: high to low
                </option>
                <option value="rating">Top rated</option>
              </select>
            </label>
          </div>

          {loading ? (
            <div className="ft-empty-state">
              <div className="ic" aria-hidden="true">
                🏨
              </div>

              <h4>Loading stays...</h4>

              <p>
                We're finding available accommodations for you.
              </p>
            </div>
          ) : error ? (
            <div className="ft-empty-state">
              <div className="ic" aria-hidden="true">
                ⚠️
              </div>

              <h4>Unable to load stays</h4>

              <p>{error}</p>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="results-count">
                {filtered.length}{' '}
                {filtered.length === 1 ? 'stay' : 'stays'} found
              </div>

              {filtered.length === 0 ? (
                <div className="ft-empty-state">
                  <div className="ic" aria-hidden="true">
                    🏨
                  </div>

                  <h4>No stays match your filters</h4>

                  <p>
                    Try clearing the destination search or lowering
                    the minimum rating.
                  </p>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="stays-grid">
                  {filtered.map((stay) => (
                    <StayCard
                      key={stay._id}
                      id={stay._id}
                      name={stay.name}
                      location={`${stay.city}, ${stay.country}`}
                      image={getListingImage(stay)}
                      rating={stay.rating ?? 0}
                      amenities={getAmenities(stay)}
                      price={stay.price}
                      currency={getCurrencySymbol(stay.currency)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}