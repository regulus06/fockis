import { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';

import PriceAlert from '../components/PriceAlert';
import { travelApi } from '../services/travelApi';

interface ApiPriceAlert {
  _id?: string;
  id?: string;

  destination?: string;

  originalPrice?: number;
  currentPrice?: number;
  targetPrice?: number;

  currency?: string;

  paused?: boolean;
  active?: boolean;

  createdAt?: string;
  updatedAt?: string;

  [key: string]: unknown;
}

interface PriceAlertItem {
  id: string;
  destination: string;
  originalPrice: number;
  currentPrice: number;
  targetPrice?: number;
  currency: string;
  paused: boolean;
}

function getId(alert: ApiPriceAlert): string {
  return String(
    alert._id ??
      alert.id ??
      '',
  );
}

function normalizeAlert(
  alert: ApiPriceAlert,
): PriceAlertItem | null {
  const id = getId(alert);

  if (!id) {
    return null;
  }

  return {
    id,

    destination:
      String(
        alert.destination ??
          'Unknown destination',
      ),

    originalPrice:
      Number(
        alert.originalPrice ??
          alert.currentPrice ??
          alert.targetPrice ??
          0,
      ),

    currentPrice:
      Number(
        alert.currentPrice ??
          alert.originalPrice ??
          alert.targetPrice ??
          0,
      ),

    targetPrice:
      alert.targetPrice !== undefined
        ? Number(alert.targetPrice)
        : undefined,

    currency:
      String(
        alert.currency ?? '$',
      ),

    paused:
      Boolean(
        alert.paused ??
          (alert.active === false),
      ),
  };
}

/**
 * Real Fockis Travel price-alert management.
 *
 * Data is loaded from:
 *
 * GET    /travel/price-alerts
 * POST   /travel/price-alerts
 * PATCH  /travel/price-alerts/:id
 * DELETE /travel/price-alerts/:id
 */
export default function TravelPriceAlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlertItem[]>([]);

  const [newDestination, setNewDestination] =
    useState('');

  const [targetPrice, setTargetPrice] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [actionId, setActionId] =
    useState<string | null>(null);

  const [error, setError] =
    useState('');

  /*
   * --------------------------------------------------------------------------
   * LOAD ALERTS
   * --------------------------------------------------------------------------
   */

  useEffect(() => {
    let mounted = true;

    async function loadAlerts() {
      setLoading(true);
      setError('');

      try {
        const response =
          await travelApi.get<
            ApiPriceAlert[]
          >('/travel/price-alerts');

        if (!mounted) {
          return;
        }

        const rawAlerts =
          Array.isArray(response)
            ? response
            : [];

        const normalized =
          rawAlerts
            .map(normalizeAlert)
            .filter(
              (
                alert,
              ): alert is PriceAlertItem =>
                alert !== null,
            );

        setAlerts(normalized);
      } catch (err) {
        console.error(
          'Unable to load price alerts:',
          err,
        );

        if (
          err &&
          typeof err === 'object' &&
          'message' in err &&
          typeof err.message ===
            'string'
        ) {
          setError(err.message);
        } else {
          setError(
            'Unable to load your price alerts.',
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadAlerts();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * --------------------------------------------------------------------------
   * CREATE ALERT
   * --------------------------------------------------------------------------
   */

  async function handleCreate(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    const destination =
      newDestination.trim();

    const price =
      Number(targetPrice);

    if (!destination) {
      return;
    }

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      setError(
        'Please enter a valid target price.',
      );
      return;
    }

    setCreating(true);
    setError('');

    try {
      const created =
        await travelApi.post<ApiPriceAlert>(
          '/travel/price-alerts',
          {
            destination,
            targetPrice: price,
          },
        );

      const normalized =
        normalizeAlert(created);

      if (normalized) {
        setAlerts((previous) => [
          normalized,
          ...previous,
        ]);
      }

      setNewDestination('');
      setTargetPrice('');
    } catch (err) {
      console.error(
        'Unable to create price alert:',
        err,
      );

      if (
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof err.message ===
          'string'
      ) {
        setError(err.message);
      } else {
        setError(
          'Unable to create the price alert.',
        );
      }
    } finally {
      setCreating(false);
    }
  }

  /*
   * --------------------------------------------------------------------------
   * PAUSE / RESUME
   * --------------------------------------------------------------------------
   */

  async function handleTogglePause(
    id: string,
  ) {
    const existing =
      alerts.find(
        (alert) => alert.id === id,
      );

    if (!existing) {
      return;
    }

    const paused =
      !existing.paused;

    setActionId(id);
    setError('');

    try {
      const updated =
        await travelApi.patch<ApiPriceAlert>(
          `/travel/price-alerts/${encodeURIComponent(id)}`,
          {
            paused,
            active: !paused,
          },
        );

      const normalized =
        normalizeAlert(updated);

      if (normalized) {
        setAlerts((previous) =>
          previous.map((alert) =>
            alert.id === id
              ? normalized
              : alert,
          ),
        );
      } else {
        /*
         * Fallback in case the backend returns
         * an empty response.
         */
        setAlerts((previous) =>
          previous.map((alert) =>
            alert.id === id
              ? {
                  ...alert,
                  paused,
                }
              : alert,
          ),
        );
      }
    } catch (err) {
      console.error(
        'Unable to update price alert:',
        err,
      );

      if (
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof err.message ===
          'string'
      ) {
        setError(err.message);
      } else {
        setError(
          'Unable to update the price alert.',
        );
      }
    } finally {
      setActionId(null);
    }
  }

  /*
   * --------------------------------------------------------------------------
   * DELETE ALERT
   * --------------------------------------------------------------------------
   */

  async function handleDelete(
    id: string,
  ) {
    const confirmed =
      window.confirm(
        'Delete this price alert?',
      );

    if (!confirmed) {
      return;
    }

    setActionId(id);
    setError('');

    try {
      await travelApi.delete(
        `/travel/price-alerts/${encodeURIComponent(id)}`,
      );

      setAlerts((previous) =>
        previous.filter(
          (alert) =>
            alert.id !== id,
        ),
      );
    } catch (err) {
      console.error(
        'Unable to delete price alert:',
        err,
      );

      if (
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof err.message ===
          'string'
      ) {
        setError(err.message);
      } else {
        setError(
          'Unable to delete the price alert.',
        );
      }
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="travel-price-alerts-page">
      {/* ================================================================== */}
      {/* HEADER                                                             */}
      {/* ================================================================== */}

      <section className="tight">
        <div className="wrap">
          <div className="eyebrow">
            Price Alerts
          </div>

          <h1
            style={{
              fontSize:
                'clamp(28px, 4vw, 42px)',
            }}
          >
            Never miss a better price
          </h1>

          <p
            style={{
              color:
                'var(--slate, #5B6B76)',
              marginTop: 10,
              maxWidth: 480,
            }}
          >
            Track a stay's nightly rate and
            we'll flag it here when the price
            changes.
          </p>
        </div>
      </section>

      {/* ================================================================== */}
      {/* CONTENT                                                            */}
      {/* ================================================================== */}

      <section>
        <div className="wrap">
          {/* CREATE */}
          <form
            className="create-alert-card"
            onSubmit={handleCreate}
          >
            <h3
              style={{
                fontSize: 17,
                marginBottom: 16,
              }}
            >
              <Bell
                size={16}
                aria-hidden="true"
                style={{
                  verticalAlign: -2,
                  marginRight: 6,
                }}
              />

              Create a price alert
            </h3>

            <div className="create-alert-fields">
              <label
                className="ft-field"
                style={{ margin: 0 }}
              >
                <span>
                  Stay or destination
                </span>

                <input
                  id="alert-dest"
                  placeholder="e.g. Karibe Hillside Hotel"
                  value={newDestination}
                  onChange={(e) =>
                    setNewDestination(
                      e.target.value,
                    )
                  }
                  disabled={creating}
                />
              </label>

              <label
                className="ft-field"
                style={{ margin: 0 }}
              >
                <span>
                  Target price / night
                </span>

                <input
                  id="alert-price"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="$"
                  value={targetPrice}
                  onChange={(e) =>
                    setTargetPrice(
                      e.target.value,
                    )
                  }
                  disabled={creating}
                />
              </label>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2
                      size={15}
                      className="spin"
                      aria-hidden="true"
                    />

                    Creating...
                  </>
                ) : (
                  'Create alert'
                )}
              </button>
            </div>
          </form>

          {/* ERROR */}
          {error && (
            <div
              role="alert"
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 10,
                background:
                  '#fff4f4',
                border:
                  '1px solid #efb8b8',
                color: '#9b2226',
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          {/* LOADING */}
          {loading ? (
            <div
              className="ft-empty-state"
              style={{ marginTop: 20 }}
            >
              <Loader2
                size={24}
                className="spin"
                aria-hidden="true"
              />

              <h4>
                Loading your alerts...
              </h4>

              <p>
                Getting your latest Travel
                price alerts.
              </p>
            </div>
          ) : alerts.length === 0 ? (
            /* EMPTY */
            <div
              className="ft-empty-state"
              style={{ marginTop: 20 }}
            >
              <div
                className="ic"
                aria-hidden="true"
              >
                🔔
              </div>

              <h4>
                No active alerts
              </h4>

              <p>
                Create one above to start
                tracking a price.
              </p>
            </div>
          ) : (
            /* REAL ALERTS */
            <div
              className="alerts-list"
              style={{ marginTop: 20 }}
            >
              {alerts.map((alert) => (
                <PriceAlert
                  key={alert.id}
                  id={alert.id}
                  destination={
                    alert.destination
                  }
                  originalPrice={
                    alert.originalPrice
                  }
                  currentPrice={
                    alert.currentPrice
                  }
                  targetPrice={
                    alert.targetPrice
                  }
                  currency={
                    alert.currency
                  }
                  paused={
                    alert.paused
                  }
                  loading={
                    actionId ===
                    alert.id
                  }
                  onTogglePause={
                    handleTogglePause
                  }
                  onDelete={
                    handleDelete
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