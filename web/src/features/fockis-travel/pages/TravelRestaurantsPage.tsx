import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import { useEffect, useMemo, useState } from 'react';
import RestaurantCard from '../components/RestaurantCard';
import CategoryTabs from '../components/CategoryTabs';
import { Users, Calendar } from 'lucide-react';
import '../styles/TravelRestaurantsPage.scss';

interface TravelListing {
  _id?: string;
  id?: string;
  name: string;
  type: string;
  description?: string;
  country?: string;
  city?: string;
  address?: string;
  images?: string[];
  amenities?: string[];
  tags?: string[];
  rating?: number;
  reviewCount?: number;
  currency?: string;
  price?: number;
  priceUnit?: string;
  active?: boolean;
  metadata?: Record<string, unknown>;
}

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  cuisineTag: string;
  location: string;
  image: string;
  rating: number;
  priceRange: string;
  times: string[];
}

const CUISINES = [
  { id: 'all', label: 'All cuisines' },
  { id: 'haitian', label: 'Haitian' },
  { id: 'french', label: 'French' },
  { id: 'japanese', label: 'Japanese' },
  { id: 'brazilian', label: 'Brazilian' },
];

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  FOCKIS_API_URL;

function getCuisineTag(listing: TravelListing): string {
  const tags = listing.tags ?? [];

  const possibleCuisine = tags.find((tag) =>
    CUISINES.some((cuisine) => cuisine.id === tag.toLowerCase())
  );

  if (possibleCuisine) {
    return possibleCuisine.toLowerCase();
  }

  const text = [
    listing.name,
    listing.description,
    ...(listing.tags ?? []),
    ...(listing.amenities ?? []),
  ]
    .join(' ')
    .toLowerCase();

  if (text.includes('haitian') || text.includes('haiti')) {
    return 'haitian';
  }

  if (text.includes('french') || text.includes('france')) {
    return 'french';
  }

  if (text.includes('japanese') || text.includes('japan')) {
    return 'japanese';
  }

  if (text.includes('brazilian') || text.includes('brazil')) {
    return 'brazilian';
  }

  return 'all';
}

function getCuisineName(listing: TravelListing): string {
  const cuisineTag = getCuisineTag(listing);

  const cuisine = CUISINES.find((item) => item.id === cuisineTag);

  if (cuisine && cuisine.id !== 'all') {
    return cuisine.label;
  }

  return 'Restaurant';
}

function getLocation(listing: TravelListing): string {
  return [listing.city, listing.country]
    .filter(Boolean)
    .join(', ');
}

function getImage(listing: TravelListing): string {
  return (
    listing.images?.[0] ||
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=700'
  );
}

function getPriceRange(listing: TravelListing): string {
  const price = Number(listing.price ?? 0);

  if (!price) {
    return '';
  }

  if (price < 25) {
    return '$';
  }

  if (price < 75) {
    return '$$';
  }

  if (price < 150) {
    return '$$$';
  }

  return '$$$$';
}

function getAvailableTimes(listing: TravelListing): string[] {
  const metadata = listing.metadata ?? {};

  const metadataTimes = metadata.availableTimes;

  if (Array.isArray(metadataTimes)) {
    return metadataTimes.filter(
      (time): time is string => typeof time === 'string'
    );
  }

  const defaultTimes = ['6:00 PM', '7:00 PM', '8:30 PM'];

  return defaultTimes;
}

function mapListingToRestaurant(listing: TravelListing): Restaurant {
  return {
    id: listing._id || listing.id || '',
    name: listing.name,
    cuisine: getCuisineName(listing),
    cuisineTag: getCuisineTag(listing),
    location: getLocation(listing),
    image: getImage(listing),
    rating: Number(listing.rating ?? 0),
    priceRange: getPriceRange(listing),
    times: getAvailableTimes(listing),
  };
}

/**
 * Restaurant discovery & reservation UI.
 *
 * Loads restaurants from:
 * GET /travel/listings?type=restaurant
 */
export default function TravelRestaurantsPage() {
  const [cuisine, setCuisine] = useState('all');
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState('');
  const [selectedTimes, setSelectedTimes] = useState<Record<string, string>>(
    {}
  );

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadRestaurants() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          `${API_BASE_URL}/travel/listings?type=restaurant`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load restaurants (${response.status})`
          );
        }

        const data = await response.json();

        const listings: TravelListing[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];

        const mappedRestaurants = listings
          .filter((listing) => listing.active !== false)
          .map(mapListingToRestaurant)
          .filter((restaurant) => restaurant.id);

        if (!cancelled) {
          setRestaurants(mappedRestaurants);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load travel restaurants:', err);

          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load restaurants.'
          );

          setRestaurants([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRestaurants();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (cuisine === 'all') {
      return restaurants;
    }

    return restaurants.filter(
      (restaurant) => restaurant.cuisineTag === cuisine
    );
  }, [restaurants, cuisine]);

  function handleFindTable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    console.log('Restaurant search:', {
      date,
      partySize,
      cuisine,
    });
  }

  return (
    <div className="travel-restaurants-page">
      <section className="tight">
        <div className="wrap">
          <div className="eyebrow">Dining</div>

          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>
            Reserve a table
          </h1>

          <p
            style={{
              color: 'var(--slate, #5B6B76)',
              marginTop: 10,
              maxWidth: 480,
            }}
          >
            From local favorites to fine dining, with private dining and
            catering available.
          </p>

          <form
            className="travel-search travel-search--inline"
            style={{ marginTop: 28 }}
            onSubmit={handleFindTable}
          >
            <div className="search-fields">
              <label className="field">
                <span>
                  <Calendar
                    size={11}
                    aria-hidden="true"
                    style={{ verticalAlign: -1 }}
                  />{' '}
                  Date &amp; time
                </span>

                <input
                  id="r-date"
                  type="datetime-local"
                  className="value"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>

              <label className="field">
                <span>
                  <Users
                    size={11}
                    aria-hidden="true"
                    style={{ verticalAlign: -1 }}
                  />{' '}
                  Party size
                </span>

                <input
                  id="r-party"
                  type="number"
                  min={1}
                  max={20}
                  className="value"
                  value={partySize}
                  onChange={(e) => {
                    const value = Number(e.target.value);

                    if (Number.isFinite(value)) {
                      setPartySize(Math.min(20, Math.max(1, value)));
                    }
                  }}
                />
              </label>

              <button type="submit" className="search-submit">
                Find a table →
              </button>
            </div>
          </form>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="cuisine-filter-row">
            <CategoryTabs
              categories={CUISINES}
              activeId={cuisine}
              onChange={setCuisine}
              bordered
            />
          </div>

          {loading && (
            <div className="ft-empty-state">
              <div className="ic" aria-hidden="true">
                🍽️
              </div>

              <h4>Loading restaurants...</h4>

              <p>
                Finding restaurants available through Fockis Travel.
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="ft-empty-state">
              <div className="ic" aria-hidden="true">
                ⚠️
              </div>

              <h4>Unable to load restaurants</h4>

              <p>{error}</p>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="ft-empty-state">
              <div className="ic" aria-hidden="true">
                🍽️
              </div>

              <h4>No restaurants found</h4>

              <p>
                {restaurants.length === 0
                  ? 'There are no restaurant listings in the Fockis Travel database yet.'
                  : 'Try a different cuisine filter.'}
              </p>

              {cuisine !== 'all' && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setCuisine('all')}
                >
                  View all restaurants
                </button>
              )}
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="restaurant-grid">
              {filtered.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  id={restaurant.id}
                  name={restaurant.name}
                  cuisine={restaurant.cuisine}
                  location={restaurant.location}
                  image={restaurant.image}
                  rating={restaurant.rating}
                  priceRange={restaurant.priceRange}
                  availableTimes={restaurant.times}
                  selectedTime={selectedTimes[restaurant.id]}
                  onSelectTime={(id, time) =>
                    setSelectedTimes((previous) => ({
                      ...previous,
                      [id]: time,
                    }))
                  }
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
