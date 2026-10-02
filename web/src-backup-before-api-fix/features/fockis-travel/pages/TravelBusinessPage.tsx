
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users2,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Loader2,
  RefreshCw,
} from 'lucide-react';

import { travelApi } from '../services/travelApi';
import '../styles/TravelBusinessPage.scss';

const CHIPS = [
  { ic: '🏨', label: 'Hotel' },
  { ic: '💼', label: 'Meeting Room' },
  { ic: '📽️', label: 'Equipment' },
  { ic: '📶', label: 'Business Wi-Fi' },
  { ic: '🍽️', label: 'Catering' },
  { ic: '🚗', label: 'Transportation' },
];

type BusinessTab = 'overview' | 'employees';

interface BusinessEmployee {
  id: string;
  name: string;
  trip: string;
  status: string;
}

interface BusinessStats {
  travelingEmployees: number;
  quarterlySpend: number;
  policyCompliance: number;
  activePolicies: number;
}

interface BusinessTrip {
  destination: string;
  startDate: string;
  endDate: string;
  items: Array<{
    label: string;
    amount: number;
  }>;
}

interface BusinessPolicy {
  name: string;
  description: string;
}

interface BusinessDashboard {
  stats: BusinessStats;
  employees: BusinessEmployee[];
  currentTrip?: BusinessTrip | null;
  policy?: BusinessPolicy | null;
}

function getString(
  value: unknown,
  fallback = '',
): string {
  return typeof value === 'string' ? value : fallback;
}

function getNumber(
  value: unknown,
  fallback = 0,
): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback;
}

function getObject(
  value: unknown,
): Record<string, unknown> {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return {};
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function normalizeEmployee(
  raw: unknown,
  index: number,
): BusinessEmployee {
  const employee = getObject(raw);

  const firstName = getString(employee.firstName);
  const lastName = getString(employee.lastName);

  const name =
    getString(employee.name) ||
    `${firstName} ${lastName}`.trim() ||
    getString(employee.fullName) ||
    `Employee ${index + 1}`;

  const destination =
    getString(employee.destination) ||
    getString(employee.tripDestination);

  const startDate =
    getString(employee.startDate) ||
    getString(employee.tripStartDate);

  const endDate =
    getString(employee.endDate) ||
    getString(employee.tripEndDate);

  let trip = getString(employee.trip);

  if (!trip && destination) {
    const dates =
      startDate && endDate
        ? `${formatDate(startDate)}–${formatDate(endDate)}`
        : startDate
          ? formatDate(startDate)
          : '';

    trip = dates
      ? `${destination}, ${dates}`
      : destination;
  }

  return {
    id:
      getString(employee.id) ||
      getString(employee._id) ||
      `${index}`,
    name,
    trip: trip || 'No active trip',
    status:
      getString(employee.status) ||
      getString(employee.bookingStatus) ||
      'Pending',
  };
}

function normalizeDashboard(
  raw: unknown,
): BusinessDashboard {
  const root = getObject(raw);

  /*
   * Some APIs return:
   *
   * {
   *   data: {
   *     stats: ...
   *   }
   * }
   *
   * while others return the object directly.
   *
   * Supporting both keeps this page resilient to either format.
   */
  const source = getObject(
    root.data && typeof root.data === 'object'
      ? root.data
      : root,
  );

  const rawStats = getObject(source.stats);

  const rawEmployees = Array.isArray(source.employees)
    ? source.employees
    : [];

  const rawTrip =
    source.currentTrip ??
    source.trip ??
    source.activeTrip;

  const rawPolicy = getObject(
    source.policy,
  );

  const employees = rawEmployees.map(
    (employee: unknown, index: number) =>
      normalizeEmployee(employee, index),
  );

  const stats: BusinessStats = {
    travelingEmployees: getNumber(
      rawStats.travelingEmployees ??
        rawStats.employeeCount ??
        source.travelingEmployees ??
        source.employeeCount,
    ),

    quarterlySpend: getNumber(
      rawStats.quarterlySpend ??
        rawStats.spend ??
        source.quarterlySpend ??
        source.spend,
    ),

    policyCompliance: getNumber(
      rawStats.policyCompliance ??
        rawStats.compliance ??
        source.policyCompliance ??
        source.compliance,
    ),

    activePolicies: getNumber(
      rawStats.activePolicies ??
        rawStats.policyCount ??
        source.activePolicies ??
        source.policyCount,
    ),
  };

  let currentTrip: BusinessTrip | null = null;

  if (rawTrip && typeof rawTrip === 'object') {
    const trip = getObject(rawTrip);

    const rawItems = Array.isArray(trip.items)
      ? trip.items
      : Array.isArray(trip.bookings)
        ? trip.bookings
        : [];

    currentTrip = {
      destination:
        getString(trip.destination) ||
        getString(trip.location) ||
        'Business trip',

      startDate:
        getString(trip.startDate) ||
        getString(trip.from),

      endDate:
        getString(trip.endDate) ||
        getString(trip.to),

      items: rawItems.map((item: unknown) => {
        const booking = getObject(item);

        return {
          label:
            getString(booking.label) ||
            getString(booking.name) ||
            getString(booking.title) ||
            'Travel booking',

          amount: getNumber(
            booking.amount ??
              booking.price ??
              booking.total,
          ),
        };
      }),
    };
  }

  const policy =
    rawPolicy.name || rawPolicy.description
      ? {
          name:
            getString(rawPolicy.name) ||
            'Travel policy',

          description:
            getString(rawPolicy.description) ||
            'No policy description available.',
        }
      : null;

  return {
    stats,
    employees,
    currentTrip,
    policy,
  };
}

/**
 * Business travel dashboard using real Travel API data.
 */
export default function TravelBusinessPage() {
  const [tab, setTab] =
    useState<BusinessTab>('overview');

  const [dashboard, setDashboard] =
    useState<BusinessDashboard | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      /*
       * IMPORTANT:
       *
       * This page intentionally does not use response.data.
       * Your travelApi may already unwrap API responses.
       *
       * The endpoint below is the expected business dashboard
       * endpoint. If your NestJS controller uses a different
       * route, only this URL needs to change.
       */
      const response =
        await travelApi.get<unknown>(
          '/travel/business/dashboard',
        );

      setDashboard(
        normalizeDashboard(response),
      );
    } catch (err) {
      console.error(
        'Failed to load business travel dashboard:',
        err,
      );

      setDashboard(null);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load business travel data.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const stats = dashboard?.stats;

  const currentTrip =
    dashboard?.currentTrip;

  return (
    <div className="travel-business-page">
      <section
        className="dark-band"
        style={{ padding: '88px 0' }}
      >
        <div className="wrap">
          <div className="biz-grid">
            <div>
              <div className="eyebrow">
                Business Travel
              </div>

              <h1
                style={{
                  fontSize: 38,
                  color:
                    'var(--paper, #FAF6EE)',
                }}
              >
                Travel for business
              </h1>

              <p
                style={{
                  color:
                    'rgba(250,246,238,0.65)',
                  fontSize: 15.5,
                  lineHeight: 1.6,
                  marginTop: 14,
                  maxWidth: 440,
                }}
              >
                Find hotels with meeting rooms,
                conference facilities, business
                services, transportation and
                everything your business trip
                requires.
              </p>

              <div className="biz-chip-grid">
                {CHIPS.map((chip) => (
                  <div
                    className="biz-chip"
                    key={chip.label}
                  >
                    <span
                      className="ic"
                      aria-hidden="true"
                    >
                      {chip.ic}
                    </span>

                    {chip.label}
                  </div>
                ))}
              </div>

              <Link
                to="/travel/meetings"
                className="btn btn-amber"
                style={{ marginTop: 28 }}
              >
                Explore business travel →
              </Link>
            </div>

            <div className="boarding-card">
              {loading ? (
                <div
                  style={{
                    minHeight: 240,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                  }}
                >
                  <Loader2
                    size={28}
                    aria-hidden="true"
                  />

                  <span>
                    Loading business trip…
                  </span>
                </div>
              ) : currentTrip ? (
                <>
                  <div className="boarding-top">
                    <div>
                      <div className="k">
                        Trip
                      </div>

                      <div className="v">
                        Corporate ·{' '}
                        {currentTrip.destination}
                      </div>
                    </div>

                    <div>
                      <div className="k">
                        Dates
                      </div>

                      <div
                        className="v mono"
                        style={{
                          fontSize: 13,
                        }}
                      >
                        {currentTrip.startDate &&
                        currentTrip.endDate
                          ? `${formatDate(
                              currentTrip.startDate,
                            )} – ${formatDate(
                              currentTrip.endDate,
                            )}`
                          : 'Dates not set'}
                      </div>
                    </div>
                  </div>

                  <div className="perforation" />

                  <div className="boarding-body">
                    {currentTrip.items.length >
                    0 ? (
                      currentTrip.items.map(
                        (item, index) => (
                          <div
                            className="stub-row"
                            key={`${item.label}-${index}`}
                          >
                            <span className="lbl">
                              {item.label}
                            </span>

                            <span className="val">
                              {formatCurrency(
                                item.amount,
                              )}
                            </span>
                          </div>
                        ),
                      )
                    ) : (
                      <div
                        style={{
                          padding: '20px 0',
                          color:
                            'var(--slate, #5B6B76)',
                        }}
                      >
                        No bookings on the
                        current trip.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    minHeight: 240,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: 24,
                  }}
                >
                  <div
                    style={{
                      fontSize: 32,
                      marginBottom: 10,
                    }}
                    aria-hidden="true"
                  >
                    ✈️
                  </div>

                  <strong>
                    No active business trip
                  </strong>

                  <span
                    style={{
                      marginTop: 6,
                      color:
                        'var(--slate, #5B6B76)',
                      fontSize: 14,
                    }}
                  >
                    Your current corporate
                    itinerary will appear here.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                Your company
              </div>

              <h2>
                Business travel overview
              </h2>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                marginBottom: 20,
                padding: '14px 16px',
                borderRadius: 10,
                border:
                  '1px solid #efc7c7',
                background: '#fff6f6',
                color: '#9b2c2c',
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <span>{error}</span>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() =>
                  void loadDashboard()
                }
              >
                <RefreshCw
                  size={15}
                  aria-hidden="true"
                />
                Retry
              </button>
            </div>
          )}

          <div className="biz-stats-grid">
            <div className="biz-stat-card">
              <div
                style={{
                  marginBottom: 8,
                  color:
                    'var(--petrol, #0E6E67)',
                }}
              >
                <Users2
                  size={20}
                  aria-hidden="true"
                />
              </div>

              <div className="amt">
                {loading
                  ? '—'
                  : stats?.travelingEmployees ??
                    0}
              </div>

              <div className="lbl">
                Traveling employees
              </div>
            </div>

            <div className="biz-stat-card">
              <div
                style={{
                  marginBottom: 8,
                  color:
                    'var(--petrol, #0E6E67)',
                }}
              >
                <Receipt
                  size={20}
                  aria-hidden="true"
                />
              </div>

              <div className="amt">
                {loading
                  ? '—'
                  : formatCurrency(
                      stats?.quarterlySpend ??
                        0,
                    )}
              </div>

              <div className="lbl">
                This quarter, spend
              </div>
            </div>

            <div className="biz-stat-card">
              <div
                style={{
                  marginBottom: 8,
                  color:
                    'var(--petrol, #0E6E67)',
                }}
              >
                <TrendingUp
                  size={20}
                  aria-hidden="true"
                />
              </div>

              <div className="amt">
                {loading
                  ? '—'
                  : `${stats?.policyCompliance ?? 0}%`}
              </div>

              <div className="lbl">
                Policy compliance
              </div>
            </div>

            <div className="biz-stat-card">
              <div
                style={{
                  marginBottom: 8,
                  color:
                    'var(--petrol, #0E6E67)',
                }}
              >
                <ShieldCheck
                  size={20}
                  aria-hidden="true"
                />
              </div>

              <div className="amt">
                {loading
                  ? '—'
                  : stats?.activePolicies ?? 0}
              </div>

              <div className="lbl">
                Active travel policies
              </div>
            </div>
          </div>

          <div
            className="category-tabs category-tabs--bordered"
            role="tablist"
            style={{
              marginBottom: 20,
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={
                tab === 'overview'
              }
              className={`category-tab${
                tab === 'overview'
                  ? ' is-active'
                  : ''
              }`}
              onClick={() =>
                setTab('overview')
              }
            >
              Travel policy
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={
                tab === 'employees'
              }
              className={`category-tab${
                tab === 'employees'
                  ? ' is-active'
                  : ''
              }`}
              onClick={() =>
                setTab('employees')
              }
            >
              Employees
            </button>
          </div>

          {tab === 'overview' ? (
            <div
              className="panel"
              style={{
                background: '#fff',
                border:
                  '1px solid var(--line, rgba(15,27,43,0.12))',
                borderRadius: 10,
                padding: 26,
              }}
            >
              {loading ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Loader2
                    size={20}
                    aria-hidden="true"
                  />

                  Loading travel policy…
                </div>
              ) : dashboard?.policy ? (
                <>
                  <h3
                    style={{
                      fontSize: 17,
                      marginBottom: 10,
                    }}
                  >
                    {dashboard.policy.name}
                  </h3>

                  <p
                    style={{
                      color:
                        'var(--slate, #5B6B76)',
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    {
                      dashboard.policy
                        .description
                    }
                  </p>
                </>
              ) : (
                <>
                  <h3
                    style={{
                      fontSize: 17,
                      marginBottom: 10,
                    }}
                  >
                    No travel policy configured
                  </h3>

                  <p
                    style={{
                      color:
                        'var(--slate, #5B6B76)',
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    Your company travel policy
                    will appear here when one is
                    configured.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div
              style={{
                border:
                  '1px solid var(--line, rgba(15,27,43,0.12))',
                borderRadius: 10,
                overflow: 'hidden',
                background: '#fff',
              }}
            >
              {loading ? (
                <div
                  style={{
                    padding: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      'center',
                    gap: 10,
                  }}
                >
                  <Loader2
                    size={20}
                    aria-hidden="true"
                  />

                  Loading employees…
                </div>
              ) : dashboard &&
                dashboard.employees.length >
                  0 ? (
                dashboard.employees.map(
                  (
                    employee: BusinessEmployee,
                  ) => (
                    <div
                      className="biz-employee-row"
                      key={employee.id}
                    >
                      <span>
                        {employee.name}
                      </span>

                      <span
                        style={{
                          color:
                            'var(--slate, #5B6B76)',
                        }}
                      >
                        {employee.trip}
                      </span>

                      <span className="ft-badge ft-badge--outline">
                        {employee.status}
                      </span>
                    </div>
                  ),
                )
              ) : (
                <div
                  style={{
                    padding: 40,
                    textAlign: 'center',
                    color:
                      'var(--slate, #5B6B76)',
                  }}
                >
                  No employees or business
                  travelers found.
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}