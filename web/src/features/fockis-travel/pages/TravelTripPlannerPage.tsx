import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Share2,
} from 'lucide-react';

import TripPlanner, {
  type PlannerStep,
} from '../components/TripPlanner';

interface TripPlannerItem {
  id: string;
  type: string;
  name: string;
  emoji: string;
  status?: string;
  subtitle?: string;
  price?: number;
  currency?: string;
}

interface TripPlannerData {
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;

  steps?: TripPlannerItem[];

  budget?: {
    spent: number;
    total: number;
    currency?: string;
  };
}

interface TripPlannerApiResponse {
  success?: boolean;
  data?: TripPlannerData;
  message?: string;
}

interface ApiErrorResponse {
  message?: string;
}

/**
 * Fockis Travel — Trip Planner
 *
 * This page uses the Fockis backend for trip data.
 *
 * Expected backend endpoint:
 *
 * GET /travel/trip-planner
 *
 * Query:
 *   destination
 *   startDate
 *   endDate
 *   travelers
 *
 * The backend should return:
 *
 * {
 *   success: true,
 *   data: {
 *     destination,
 *     startDate,
 *     endDate,
 *     travelers,
 *     steps: [],
 *     budget: {
 *       spent,
 *       total,
 *       currency
 *     }
 *   }
 * }
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000';

const FALLBACK_STEPS: TripPlannerItem[] = [
  {
    id: 'flight-outbound',
    type: 'flight',
    name: 'Flight',
    emoji: '✈️',
    status: 'Not booked yet',
  },
  {
    id: 'airport-transfer',
    type: 'transfer',
    name: 'Airport transfer',
    emoji: '🚐',
    status: 'Not booked yet',
  },
  {
    id: 'hotel',
    type: 'hotel',
    name: 'Hotel',
    emoji: '🏨',
    status: 'Not booked yet',
  },
  {
    id: 'car',
    type: 'car',
    name: 'Rental car',
    emoji: '🚗',
    status: 'Not booked yet',
  },
  {
    id: 'restaurant',
    type: 'restaurant',
    name: 'Restaurant',
    emoji: '🍽️',
    status: 'Not booked yet',
  },
  {
    id: 'meeting',
    type: 'meeting',
    name: 'Meeting',
    emoji: '💼',
    status: 'Not booked yet',
  },
  {
    id: 'experience',
    type: 'experience',
    name: 'Experience',
    emoji: '🏝️',
    status: 'Not booked yet',
  },
  {
    id: 'flight-return',
    type: 'flight',
    name: 'Return flight',
    emoji: '✈️',
    status: 'Not booked yet',
  },
];

function formatCurrency(
  amount: number,
  currency = 'USD',
) {
  try {
    return new Intl.NumberFormat(
      undefined,
      {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      },
    ).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(value: string) {
  if (!value) {
    return 'Not selected';
  }

  const date = new Date(
    `${value}T00:00:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  ).format(date);
}

function getPlannerSteps(
  items: TripPlannerItem[],
): PlannerStep[] {
  return items.map((item) => ({
    emoji: item.emoji,
    label: item.name,
    sub:
      item.subtitle ||
      item.status ||
      (item.price !== undefined
        ? formatCurrency(
            item.price,
            item.currency,
          )
        : 'Not booked yet'),
  }));
}

export default function TravelTripPlannerPage() {
  const [destination, setDestination] =
    useState('Haiti');

  const [startDate, setStartDate] =
    useState('');

  const [endDate, setEndDate] =
    useState('');

  const [travelers, setTravelers] =
    useState(2);

  const [trip, setTrip] =
    useState<TripPlannerData | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [hasSearched, setHasSearched] =
    useState(false);

  const steps = useMemo(() => {
    if (
      trip?.steps &&
      trip.steps.length > 0
    ) {
      return trip.steps;
    }

    return FALLBACK_STEPS;
  }, [trip]);

  const plannerSteps =
    useMemo(
      () => getPlannerSteps(steps),
      [steps],
    );

  const budget = trip?.budget;

  const budgetPercentage =
    budget && budget.total > 0
      ? Math.min(
          100,
          Math.round(
            (budget.spent /
              budget.total) *
              100,
          ),
        )
      : 0;

  const searchTrip = useCallback(
    async () => {
      const trimmedDestination =
        destination.trim();

      if (!trimmedDestination) {
        setError(
          'Please enter a destination.',
        );
        return;
      }

      if (!startDate) {
        setError(
          'Please select a start date.',
        );
        return;
      }

      if (!endDate) {
        setError(
          'Please select an end date.',
        );
        return;
      }

      if (endDate < startDate) {
        setError(
          'End date must be after the start date.',
        );
        return;
      }

      if (
        !Number.isInteger(
          travelers,
        ) ||
        travelers < 1
      ) {
        setError(
          'Travelers must be at least 1.',
        );
        return;
      }

      setLoading(true);
      setError('');
      setHasSearched(true);

      try {
        const params =
          new URLSearchParams({
            destination:
              trimmedDestination,
            startDate,
            endDate,
            travelers:
              String(travelers),
          });

        const response =
          await fetch(
            `${API_BASE_URL}/travel/trip-planner?${params.toString()}`,
            {
              method: 'GET',
              headers: {
                Accept:
                  'application/json',
              },
              credentials:
                'include',
            },
          );

        if (!response.ok) {
          let message =
            `Travel search failed (${response.status}).`;

          try {
            const body =
              (await response.json()) as ApiErrorResponse;

            if (
              body?.message
            ) {
              message =
                body.message;
            }
          } catch {
            // Ignore invalid error JSON.
          }

          throw new Error(message);
        }

        const result =
          (await response.json()) as TripPlannerApiResponse;

        if (!result.data) {
          throw new Error(
            result.message ||
              'The travel service returned no trip data.',
          );
        }

        setTrip(result.data);

        if (
          result.data.destination
        ) {
          setDestination(
            result.data.destination,
          );
        }

        if (
          result.data.startDate
        ) {
          setStartDate(
            result.data.startDate,
          );
        }

        if (
          result.data.endDate
        ) {
          setEndDate(
            result.data.endDate,
          );
        }

        if (
          result.data.travelers
        ) {
          setTravelers(
            result.data.travelers,
          );
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load travel data.';

        setError(message);
        setTrip(null);
      } finally {
        setLoading(false);
      }
    },
    [
      destination,
      endDate,
      startDate,
      travelers,
    ],
  );

  useEffect(() => {
    if (
      !startDate ||
      !endDate
    ) {
      return;
    }

    if (
      endDate < startDate
    ) {
      return;
    }

    // Do not automatically call the API
    // until the user has searched.
    if (!hasSearched) {
      return;
    }

    void searchTrip();
  }, [
    // Intentionally only reacts to
    // explicit search state changes.
    hasSearched,
  ]);

  const handleTravelersChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value =
      Number(event.target.value);

    if (
      !Number.isFinite(value)
    ) {
      return;
    }

    setTravelers(
      Math.min(
        20,
        Math.max(1, value),
      ),
    );
  };

  const handleSaveTrip = () => {
    if (!trip) {
      setError(
        'Search for your trip before saving it.',
      );
      return;
    }

    localStorage.setItem(
      'fockis-travel-trip',
      JSON.stringify(trip),
    );
  };

  const handleShareTrip =
    async () => {
      const shareText =
        `My Fockis Travel trip to ${destination}`;

      try {
        if (
          navigator.share
        ) {
          await navigator.share({
            title:
              'Fockis Travel Trip',
            text: shareText,
            url:
              window.location.href,
          });

          return;
        }

        await navigator.clipboard.writeText(
          window.location.href,
        );
      } catch {
        // User cancelled sharing
        // or browser does not support it.
      }
    };

  return (
    <div className="travel-trip-planner-page">
      {/* ============================================================ */}
      {/* HEADER                                                        */}
      {/* ============================================================ */}

      <section className="tight">
        <div className="wrap">
          <div className="eyebrow">
            Trip Planner
          </div>

          <h1
            style={{
              fontSize:
                'clamp(28px, 4vw, 42px)',
            }}
          >
            Plan your entire trip
          </h1>

          <p
            style={{
              color:
                'var(--slate, #5B6B76)',
              marginTop: 10,
              maxWidth: 520,
            }}
          >
            Search real travel inventory,
            organize your itinerary and
            keep your trip budget in one
            place.
          </p>

          {/* ======================================================== */}
          {/* SEARCH FORM                                               */}
          {/* ======================================================== */}

          <div
            className="planner-setup"
            style={{
              marginTop: 28,
            }}
          >
            <div className="planner-setup__fields">
              <div
                className="ft-field"
                style={{ margin: 0 }}
              >
                <label htmlFor="p-dest">
                  Destination
                </label>

                <input
                  id="p-dest"
                  type="text"
                  value={destination}
                  onChange={(event) =>
                    setDestination(
                      event.target.value,
                    )
                  }
                  placeholder="Haiti, Paris, Tokyo..."
                />
              </div>

              <div
                className="ft-field"
                style={{ margin: 0 }}
              >
                <label htmlFor="p-start">
                  Start date
                </label>

                <input
                  id="p-start"
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(
                      event.target.value,
                    )
                  }
                />
              </div>

              <div
                className="ft-field"
                style={{ margin: 0 }}
              >
                <label htmlFor="p-end">
                  End date
                </label>

                <input
                  id="p-end"
                  type="date"
                  value={endDate}
                  onChange={(event) =>
                    setEndDate(
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>

            <div
              className="ft-field"
              style={{
                maxWidth: 200,
                marginTop: 16,
                marginBottom: 0,
              }}
            >
              <label htmlFor="p-travelers">
                Travelers
              </label>

              <input
                id="p-travelers"
                type="number"
                min={1}
                max={20}
                value={travelers}
                onChange={
                  handleTravelersChange
                }
              />
            </div>

            <button
              type="button"
              className="btn btn-amber"
              onClick={() =>
                void searchTrip()
              }
              disabled={loading}
              style={{
                marginTop: 20,
              }}
            >
              {loading ? (
                <>
                  <Loader2
                    size={16}
                    className="spin"
                    aria-hidden="true"
                  />

                  Searching...
                </>
              ) : (
                <>
                  Search real travel data →
                </>
              )}
            </button>
          </div>

          {/* ======================================================== */}
          {/* ERROR                                                     */}
          {/* ======================================================== */}

          {error ? (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems:
                  'center',
                gap: 8,
                marginTop: 16,
                padding: 14,
                borderRadius: 10,
                background:
                  'rgba(180, 60, 60, 0.08)',
                color:
                  'var(--danger, #B43C3C)',
                fontSize: 14,
              }}
            >
              <AlertCircle
                size={18}
                aria-hidden="true"
              />

              <span>{error}</span>
            </div>
          ) : null}
        </div>
      </section>

      {/* ============================================================ */}
      {/* LIVE ITINERARY                                                */}
      {/* ============================================================ */}

      <section>
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                Itinerary
              </div>

              <h2>
                {trip
                  ? `Your trip to ${trip.destination}`
                  : 'Build your itinerary'}
              </h2>

              {trip ? (
                <p
                  style={{
                    color:
                      'var(--slate, #5B6B76)',
                    marginTop: 6,
                  }}
                >
                  {formatDate(
                    trip.startDate,
                  )}{' '}
                  —{' '}
                  {formatDate(
                    trip.endDate,
                  )}{' '}
                  · {trip.travelers}{' '}
                  {trip.travelers ===
                  1
                    ? 'traveler'
                    : 'travelers'}
                </p>
              ) : null}
            </div>

            {trip ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() =>
                  void searchTrip()
                }
                disabled={loading}
              >
                <RefreshCw
                  size={15}
                  aria-hidden="true"
                />

                Refresh
              </button>
            ) : null}
          </div>

          <TripPlanner
            steps={plannerSteps}
          />

          <button
            type="button"
            className="btn btn-amber"
            style={{
              marginTop: 20,
            }}
          >
            <Plus
              size={15}
              aria-hidden="true"
            />

            Add to itinerary
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* LIVE BUDGET                                                   */}
      {/* ============================================================ */}

      <section className="tight">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                Budget
              </div>

              <h2>
                Trip summary
              </h2>
            </div>
          </div>

          {!budget ? (
            <div
              className="budget-summary"
              style={{
                padding: 24,
              }}
            >
              <p
                style={{
                  color:
                    'var(--slate, #5B6B76)',
                  margin: 0,
                }}
              >
                Search your trip to see
                live pricing and your
                current budget.
              </p>
            </div>
          ) : (
            <>
              <div className="budget-summary">
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                    fontSize: 14.5,
                    fontWeight: 600,
                  }}
                >
                  <span>
                    {formatCurrency(
                      budget.spent,
                      budget.currency,
                    )}{' '}
                    planned
                  </span>

                  <span
                    style={{
                      color:
                        'var(--slate, #5B6B76)',
                    }}
                  >
                    of{' '}
                    {formatCurrency(
                      budget.total,
                      budget.currency,
                    )}{' '}
                    budget
                  </span>
                </div>

                <div className="trip-budget-bar">
                  <span
                    style={{
                      width: `${budgetPercentage}%`,
                    }}
                  />
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color:
                      'var(--slate, #5B6B76)',
                  }}
                >
                  {budgetPercentage}% of
                  your planned budget
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  marginTop: 24,
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={
                    handleSaveTrip
                  }
                >
                  <Save
                    size={15}
                    aria-hidden="true"
                  />

                  Save trip
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={
                    handleShareTrip
                  }
                >
                  <Share2
                    size={15}
                    aria-hidden="true"
                  />

                  Share trip
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}