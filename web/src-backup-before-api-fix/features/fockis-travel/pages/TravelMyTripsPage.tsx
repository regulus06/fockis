import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, RefreshCw } from 'lucide-react';

import CategoryTabs from '../components/CategoryTabs';
import { tripsApi } from '../services/tripsApi';
import type { TravelTrip } from '../services/tripsApi';
import '../styles/TravelMyTripsPage.scss';

type TripTab = 'upcoming' | 'completed' | 'cancelled';

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Past trips' },
  { id: 'cancelled', label: 'Cancelled' },
];

function getTripId(trip: TravelTrip): string | null {
  if (trip._id) return trip._id;
  if (trip.id) return trip.id;
  return null;
}

function normalizeStatus(status?: string): TripTab {
  const value = String(status ?? '').toLowerCase();

  if (
    value === 'completed' ||
    value === 'complete' ||
    value === 'past' ||
    value === 'finished'
  ) {
    return 'completed';
  }

  if (
    value === 'cancelled' ||
    value === 'canceled'
  ) {
    return 'cancelled';
  }

  return 'upcoming';
}

function formatDate(date?: string): string {
  if (!date) return '';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateRange(
  startDate?: string,
  endDate?: string,
): string {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (start && end) {
    return `${start} – ${end}`;
  }

  return start || end || 'Dates not set';
}

function getTripName(trip: TravelTrip): string {
  return (
    trip.destination ||
    trip.name ||
    trip.title ||
    'Untitled trip'
  );
}

function getTripItems(trip: TravelTrip): string[] {
  if (!Array.isArray(trip.items)) {
    return [];
  }

  return trip.items
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      if (
        item &&
        typeof item === 'object'
      ) {
        const value = item as Record<string, unknown>;

        const label =
          value.label ??
          value.name ??
          value.title ??
          value.type ??
          value.category;

        if (typeof label === 'string') {
          return label;
        }
      }

      return null;
    })
    .filter(
      (item): item is string =>
        Boolean(item),
    );
}

function getTripEmoji(trip: TravelTrip): string {
  const destination = String(
    trip.destination ?? '',
  ).toLowerCase();

  if (destination.includes('haiti')) return '🇭🇹';
  if (destination.includes('japan')) return '🇯🇵';
  if (destination.includes('france')) return '🇫🇷';
  if (destination.includes('usa')) return '🇺🇸';
  if (destination.includes('canada')) return '🇨🇦';
  if (destination.includes('dominican')) return '🇩🇴';
  if (destination.includes('spain')) return '🇪🇸';
  if (destination.includes('italy')) return '🇮🇹';
  if (destination.includes('uk')) return '🇬🇧';

  return '🧳';
}

/**
 * ============================================================================
 * FOCKIS TRAVEL — MY TRIPS
 * ============================================================================
 *
 * REAL API DATA
 *
 * GET /travel/trips
 *
 * No hard-coded trips are used here.
 */
export default function TravelMyTripsPage() {
  const [tab, setTab] =
    useState<TripTab>('upcoming');

  const [trips, setTrips] = useState<TravelTrip[]>(
    [],
  );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadTrips = useCallback(
    async () => {
      setLoading(true);
      setError(null);

      try {
        const response =
          await tripsApi.list();

        /*
         * The backend normally returns an array.
         *
         * This defensive handling also supports APIs that return:
         *
         * {
         *   data: [...]
         * }
         *
         * or:
         *
         * {
         *   trips: [...]
         * }
         */
        let normalized: TravelTrip[] = [];

        if (Array.isArray(response)) {
          normalized = response;
        } else if (
          response &&
          typeof response === 'object'
        ) {
          const payload =
            response as unknown as Record<
              string,
              unknown
            >;

          if (
            Array.isArray(payload.data)
          ) {
            normalized =
              payload.data as TravelTrip[];
          } else if (
            Array.isArray(payload.trips)
          ) {
            normalized =
              payload.trips as TravelTrip[];
          }
        }

        setTrips(normalized);
      } catch (err) {
        let message =
          'Unable to load your trips. Please try again.';

        if (
          err &&
          typeof err === 'object'
        ) {
          const apiError =
            err as {
              message?: unknown;
            };

          if (
            typeof apiError.message ===
            'string' &&
            apiError.message.trim()
          ) {
            message =
              apiError.message;
          }
        }

        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  const filteredTrips =
    useMemo(() => {
      return trips.filter(
        (trip) =>
          normalizeStatus(
            trip.status,
          ) === tab,
      );
    }, [trips, tab]);

  const counts = useMemo(() => {
    return {
      upcoming: trips.filter(
        (trip) =>
          normalizeStatus(
            trip.status,
          ) === 'upcoming',
      ).length,

      completed: trips.filter(
        (trip) =>
          normalizeStatus(
            trip.status,
          ) === 'completed',
      ).length,

      cancelled: trips.filter(
        (trip) =>
          normalizeStatus(
            trip.status,
          ) === 'cancelled',
      ).length,
    };
  }, [trips]);

  return (
    <div className="travel-my-trips-page">
      {/* ================================================================== */}
      {/* HEADER */}
      {/* ================================================================== */}

      <section className="tight">
        <div className="wrap">
          <div className="eyebrow">
            My Trips
          </div>

          <h1
            style={{
              fontSize:
                'clamp(28px, 4vw, 42px)',
            }}
          >
            Your travel dashboard
          </h1>

          <p
            style={{
              color:
                'var(--slate, #5B6B76)',
              marginTop: 10,
              maxWidth: 600,
            }}
          >
            Manage your upcoming journeys,
            review past trips and access your
            complete travel itinerary.
          </p>
        </div>
      </section>

      {/* ================================================================== */}
      {/* TRIPS */}
      {/* ================================================================== */}

      <section>
        <div className="wrap">
          <div className="trips-tabs">
            <CategoryTabs
              categories={TABS.map(
                (item) => ({
                  ...item,
                  label: `${
                    item.label
                  } ${
                    counts[
                      item.id as TripTab
                    ]
                  }`,
                }),
              )}
              activeId={tab}
              onChange={(id) =>
                setTab(
                  id as TripTab,
                )
              }
              bordered
            />
          </div>

          {/* ================================================================ */}
          {/* LOADING */}
          {/* ================================================================ */}

          {loading && (
            <div
              className="ft-empty-state"
              aria-live="polite"
            >
              <div
                className="ic"
                aria-hidden="true"
              >
                <RefreshCw
                  size={22}
                  className="travel-spin"
                />
              </div>

              <h4>
                Loading your trips…
              </h4>

              <p>
                We're retrieving your latest
                travel plans.
              </p>
            </div>
          )}

          {/* ================================================================ */}
          {/* ERROR */}
          {/* ================================================================ */}

          {!loading && error && (
            <div
              className="ft-empty-state"
              role="alert"
            >
              <div
                className="ic"
                aria-hidden="true"
              >
                ⚠️
              </div>

              <h4>
                We couldn't load your trips
              </h4>

              <p>
                {error}
              </p>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() =>
                  void loadTrips()
                }
              >
                <RefreshCw
                  size={15}
                  aria-hidden="true"
                />
                Try again
              </button>
            </div>
          )}

          {/* ================================================================ */}
          {/* EMPTY */}
          {/* ================================================================ */}

          {!loading &&
            !error &&
            filteredTrips.length === 0 && (
              <div className="ft-empty-state">
                <div
                  className="ic"
                  aria-hidden="true"
                >
                  🧳
                </div>

                <h4>
                  No {tab} trips
                </h4>

                <p>
                  Once you book something,
                  it will appear here
                  automatically.
                </p>

                <Link
                  to="/travel"
                  className="btn btn-outline"
                >
                  Start exploring →
                </Link>
              </div>
            )}

          {/* ================================================================ */}
          {/* REAL TRIPS */}
          {/* ================================================================ */}

          {!loading &&
            !error &&
            filteredTrips.length > 0 && (
              <div className="travel-trips-list">
                {filteredTrips.map(
                  (trip) => {
                    const tripId =
                      getTripId(trip);

                    const status =
                      normalizeStatus(
                        trip.status,
                      );

                    const items =
                      getTripItems(
                        trip,
                      );

                    const destination =
                      getTripName(
                        trip,
                      );

                    return (
                      <div
                        className={`trip-card trip-card--${status}`}
                        key={
                          tripId ??
                          `${destination}-${trip.startDate ?? ''}`
                        }
                      >
                        {/* ------------------------------------------------ */}
                        {/* TOP */}
                        {/* ------------------------------------------------ */}

                        <div
                          style={{
                            display:
                              'flex',
                            justifyContent:
                              'space-between',
                            alignItems:
                              'flex-start',
                            gap: 20,
                          }}
                        >
                          <div>
                            <div
                              className="eyebrow"
                              style={{
                                marginBottom: 6,
                              }}
                            >
                              My Trip
                            </div>

                            <h3
                              style={{
                                fontSize: 20,
                              }}
                            >
                              {getTripEmoji(
                                trip,
                              )}{' '}
                              {
                                destination
                              }
                            </h3>

                            <div className="dates">
                              <CalendarDays
                                size={14}
                                aria-hidden="true"
                                style={{
                                  verticalAlign:
                                    -2,
                                  marginRight: 5,
                                }}
                              />

                              {formatDateRange(
                                trip.startDate,
                                trip.endDate,
                              )}
                            </div>
                          </div>

                          <span
                            className={`trip-status trip-status--${status}`}
                          >
                            {status}
                          </span>
                        </div>

                        {/* ------------------------------------------------ */}
                        {/* DESCRIPTION */}
                        {/* ------------------------------------------------ */}

                        {trip.description && (
                          <p
                            style={{
                              marginTop: 14,
                              color:
                                'var(--slate, #5B6B76)',
                              maxWidth: 700,
                            }}
                          >
                            {
                              trip.description
                            }
                          </p>
                        )}

                        {/* ------------------------------------------------ */}
                        {/* ITINERARY ITEMS */}
                        {/* ------------------------------------------------ */}

                        {items.length > 0 && (
                          <div className="trip-items">
                            {items.map(
                              (
                                item,
                                index,
                              ) => (
                                <span
                                  className="trip-item"
                                  key={`${item}-${index}`}
                                >
                                  {
                                    item
                                  }
                                </span>
                              ),
                            )}
                          </div>
                        )}

                        {/* ------------------------------------------------ */}
                        {/* ACTION */}
                        {/* ------------------------------------------------ */}

                        {tripId ? (
                          <Link
                            to={`/travel/trips/${encodeURIComponent(
                              tripId,
                            )}`}
                            className="btn btn-ghost-dark"
                            style={{
                              alignSelf:
                                'flex-start',
                              marginTop: 16,
                            }}
                          >
                            View trip →
                          </Link>
                        ) : (
                          <Link
                            to="/travel/trip-planner"
                            className="btn btn-ghost-dark"
                            style={{
                              alignSelf:
                                'flex-start',
                              marginTop: 16,
                            }}
                          >
                            Open trip planner →
                          </Link>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            )}
        </div>
      </section>
    </div>
  );
}