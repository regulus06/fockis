import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

import CarCard from '../components/CarCard';
import CategoryTabs from '../components/CategoryTabs';
import '../styles/TravelCarsPage.scss';

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
  currency: string;
  price: number;
  priceUnit?: string;
  metadata?: Record<string, any>;
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

const CAR_CATEGORIES = [
  { id: 'all', label: 'All vehicles' },
  { id: 'economy', label: 'Economy' },
  { id: 'suv', label: 'SUV' },
  { id: 'van', label: 'Van / Group' },
  { id: 'electric', label: 'Electric' },
];

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

  return (
    symbols[currency?.toUpperCase()] ||
    currency ||
    '$'
  );
}

function getImage(
  listing: Listing,
): string | undefined {
  return listing.images?.[0];
}

function getCategory(
  listing: Listing,
): string {
  const metadataCategory =
    listing.metadata?.category;

  if (
    typeof metadataCategory === 'string' &&
    metadataCategory.trim()
  ) {
    return metadataCategory.toLowerCase();
  }

  const tagCategory =
    listing.tags?.find((tag) =>
      CAR_CATEGORIES.some(
        (category) =>
          category.id !== 'all' &&
          category.id ===
            tag.toLowerCase(),
      ),
    );

  if (tagCategory) {
    return tagCategory.toLowerCase();
  }

  return 'economy';
}

function getSeats(
  listing: Listing,
): number {
  const seats = listing.metadata?.seats;

  return typeof seats === 'number' &&
    seats > 0
    ? seats
    : 5;
}

function getTransmission(
  listing: Listing,
): 'Automatic' | 'Manual' {
  const transmission =
    listing.metadata?.transmission;

  return transmission === 'Manual'
    ? 'Manual'
    : 'Automatic';
}

function getHasAC(
  listing: Listing,
): boolean {
  if (
    typeof listing.metadata?.hasAC ===
    'boolean'
  ) {
    return listing.metadata.hasAC;
  }

  return (
    listing.amenities?.some(
      (amenity) =>
        amenity
          .toLowerCase()
          .includes('a/c') ||
        amenity
          .toLowerCase()
          .includes(
            'air conditioning',
          ) ||
        amenity
          .toLowerCase()
          .includes('ac'),
    ) ?? true
  );
}

function getBags(
  listing: Listing,
): number | undefined {
  const bags = listing.metadata?.bags;

  return typeof bags === 'number'
    ? bags
    : undefined;
}

function getBadges(
  listing: Listing,
): string[] {
  if (
    Array.isArray(
      listing.metadata?.badges,
    )
  ) {
    return listing.metadata.badges.filter(
      (
        badge: unknown,
      ): badge is string =>
        typeof badge === 'string',
    );
  }

  return [];
}

function getEmoji(
  listing: Listing,
): string {
  const emoji = listing.metadata?.emoji;

  return typeof emoji === 'string' &&
    emoji.trim()
    ? emoji
    : '🚗';
}

export default function TravelCarsPage() {
  const [cars, setCars] =
    useState<Listing[]>([]);

  const [category, setCategory] =
    useState('all');

  const [sort, setSort] = useState<
    'recommended' |
    'price-low' |
    'price-high'
  >('recommended');

  const [pickup, setPickup] = useState(
    'Pétion-Ville, Haiti',
  );

  const [pickupDate, setPickupDate] =
    useState('');

  const [dropoffDate, setDropoffDate] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  /*
   * ----------------------------------------------------------------------
   * LOAD CARS
   * ----------------------------------------------------------------------
   *
   * The backend receives:
   *
   * type=car
   * city=Pétion-Ville
   * country=Haiti
   * pickupDate=YYYY-MM-DD
   * dropoffDate=YYYY-MM-DD
   */
  async function loadCars() {
    try {
      setLoading(true);
      setError('');

      const params =
        new URLSearchParams({
          type: 'car',
          limit: '100',
          skip: '0',
        });

      /*
       * LOCATION
       *
       * Example:
       * "Pétion-Ville, Haiti"
       *
       * becomes:
       *
       * city=Pétion-Ville
       * country=Haiti
       */
      if (pickup.trim()) {
        const parts = pickup
          .split(',')
          .map((part) =>
            part.trim(),
          );

        if (parts[0]) {
          params.set(
            'city',
            parts[0],
          );
        }

        if (parts[1]) {
          params.set(
            'country',
            parts[1],
          );
        }
      }

      /*
       * PICK-UP DATE
       */
      if (pickupDate) {
        params.set(
          'pickupDate',
          pickupDate,
        );
      }

      /*
       * DROP-OFF DATE
       */
      if (dropoffDate) {
        params.set(
          'dropoffDate',
          dropoffDate,
        );
      }

      const url =
        `${API_BASE_URL}/travel/listings?${params.toString()}`;

      console.log(
        'Loading travel cars:',
        url,
      );

      const response =
        await fetch(url, {
          method: 'GET',
          headers: {
            Accept:
              'application/json',
          },
        });

      if (!response.ok) {
        throw new Error(
          `Unable to load cars. Server returned ${response.status}.`,
        );
      }

      const data: ListingsResponse =
        await response.json();

      setCars(
        Array.isArray(data.items)
          ? data.items
          : [],
      );
    } catch (err) {
      console.error(
        'Travel cars error:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load cars right now.',
      );

      setCars([]);
    } finally {
      setLoading(false);
    }
  }

  /*
   * Load the initial car inventory.
   */
  useEffect(() => {
    void loadCars();
  }, []);

  const filtered =
    useMemo(() => {
      let list = cars.filter(
        (car) => {
          if (
            category === 'all'
          ) {
            return true;
          }

          return (
            getCategory(car) ===
            category
          );
        },
      );

      list = [...list];

      if (
        sort === 'price-low'
      ) {
        list.sort(
          (a, b) =>
            a.price - b.price,
        );
      }

      if (
        sort === 'price-high'
      ) {
        list.sort(
          (a, b) =>
            b.price - a.price,
        );
      }

      return list;
    }, [
      cars,
      category,
      sort,
    ]);

  function clearFilters() {
    setCategory('all');
    setSort('recommended');
    setPickup(
      'Pétion-Ville, Haiti',
    );
    setPickupDate('');
    setDropoffDate('');

    /*
     * Reload using the default
     * filters.
     */
    setTimeout(() => {
      void loadCars();
    }, 0);
  }

  return (
    <div className="travel-cars-page">
      <section className="tight">
        <div className="wrap">
          <div className="eyebrow">
            Cars
          </div>

          <h1
            style={{
              fontSize:
                'clamp(28px, 4vw, 42px)',
            }}
          >
            Rent a car anywhere
          </h1>

          <p
            style={{
              color:
                'var(--slate, #5B6B76)',
              marginTop: 10,
              maxWidth: 480,
            }}
          >
            Economy to luxury,
            everywhere Fockis
            operates.
          </p>

          <form
            className="travel-search travel-search--inline"
            style={{
              marginTop: 28,
            }}
            onSubmit={(e) => {
              e.preventDefault();
              void loadCars();
            }}
          >
            <div className="search-fields">
              <label className="field">
                <span>
                  Pick-up location
                </span>

                <input
                  id="pickup-loc"
                  className="value"
                  value={pickup}
                  onChange={(e) =>
                    setPickup(
                      e.target.value,
                    )
                  }
                  placeholder="City or location"
                />
              </label>

              <label className="field">
                <span>
                  Pick-up date
                </span>

                <input
                  id="pickup-date"
                  type="date"
                  className="value"
                  value={pickupDate}
                  onChange={(e) =>
                    setPickupDate(
                      e.target.value,
                    )
                  }
                />
              </label>

              <label className="field">
                <span>
                  Drop-off date
                </span>

                <input
                  id="dropoff-date"
                  type="date"
                  className="value"
                  value={dropoffDate}
                  onChange={(e) =>
                    setDropoffDate(
                      e.target.value,
                    )
                  }
                />
              </label>

              <button
                type="submit"
                className="search-submit"
                disabled={loading}
              >
                {loading
                  ? 'Searching…'
                  : 'Search cars →'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section>
        <div className="wrap">
          <CategoryTabs
            categories={
              CAR_CATEGORIES
            }
            activeId={category}
            onChange={
              setCategory
            }
            bordered
          />

          <div
            className="filters-bar"
            style={{
              marginTop: 20,
            }}
          >
            <span className="ft-pill">
              <SlidersHorizontal
                size={13}
                aria-hidden="true"
              />
              Filters
            </span>

            <label
              className="sort-select ft-field"
              style={{
                margin: 0,
              }}
            >
              <span className="ft-hide-mobile">
                Sort by
              </span>

              <select
                id="car-sort"
                value={sort}
                onChange={(e) =>
                  setSort(
                    e.target
                      .value as typeof sort,
                  )
                }
              >
                <option value="recommended">
                  Recommended
                </option>

                <option value="price-low">
                  Price: low to
                  high
                </option>

                <option value="price-high">
                  Price: high to
                  low
                </option>
              </select>
            </label>
          </div>

          {loading ? (
            <div className="ft-empty-state">
              <div
                className="ic"
                aria-hidden="true"
              >
                🚗
              </div>

              <h4>
                Loading cars...
              </h4>

              <p>
                We're finding
                available
                vehicles for you.
              </p>
            </div>
          ) : error ? (
            <div className="ft-empty-state">
              <div
                className="ic"
                aria-hidden="true"
              >
                ⚠️
              </div>

              <h4>
                Unable to load
                cars
              </h4>

              <p>{error}</p>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() =>
                  void loadCars()
                }
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="results-count">
                {filtered.length}{' '}
                {filtered.length ===
                1
                  ? 'vehicle'
                  : 'vehicles'}{' '}
                available
              </div>

              {filtered.length ===
              0 ? (
                <div className="ft-empty-state">
                  <div
                    className="ic"
                    aria-hidden="true"
                  >
                    🚗
                  </div>

                  <h4>
                    No vehicles in
                    this category
                  </h4>

                  <p>
                    Try another
                    vehicle category
                    or clear your
                    filters.
                  </p>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={
                      clearFilters
                    }
                  >
                    View all
                    vehicles
                  </button>
                </div>
              ) : (
                <div className="ft-four-col">
                  {filtered.map(
                    (car) => (
                      <CarCard
                        key={
                          car._id
                        }
                        id={
                          car._id
                        }
                        name={
                          car.name
                        }
                        category={getCategory(
                          car,
                        )}
                        image={getImage(
                          car,
                        )}
                        emoji={getEmoji(
                          car,
                        )}
                        seats={getSeats(
                          car,
                        )}
                        transmission={getTransmission(
                          car,
                        )}
                        hasAC={getHasAC(
                          car,
                        )}
                        bags={getBags(
                          car,
                        )}
                        pricePerDay={
                          car.price
                        }
                        currency={getCurrencySymbol(
                          car.currency,
                        )}
                        badges={getBadges(
                          car,
                        )}
                      />
                    ),
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}