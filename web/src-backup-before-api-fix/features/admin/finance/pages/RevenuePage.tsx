import { useCallback, useEffect, useMemo, useState } from "react";
import { financeAdminApi } from "../api/financeAdminApi";
import type { RevenuePoint } from "../types/finance.types";
import RevenueChart from "../components/RevenueChart";

type RevenuePeriod = "30d" | "90d" | "180d" | "1y";

const PERIOD_OPTIONS: Array<{
  value: RevenuePeriod;
  label: string;
}> = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "180d", label: "Last 180 days" },
  { value: "1y", label: "Last year" },
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load revenue data.";
}

function getPointValue(point: RevenuePoint) {
  const value = point as RevenuePoint & {
    amount?: number;
    revenue?: number;
    gross?: number;
    net?: number;
    value?: number;
  };

  return Number(
    value.revenue ??
      value.amount ??
      value.gross ??
      value.net ??
      value.value ??
      0,
  );
}

function getPointCurrency(point: RevenuePoint) {
  const value = point as RevenuePoint & {
    currency?: string;
  };

  return value.currency || "USD";
}

function formatCurrency(
  amount: number,
  currency = "USD",
) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenuePoint[]>([]);
  const [period, setPeriod] =
    useState<RevenuePeriod>("90d");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  const loadRevenue = useCallback(
    async (
      selectedPeriod: RevenuePeriod,
      isRefresh = false,
    ) => {
      try {
        setError("");

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response =
          await financeAdminApi.getRevenue(
            selectedPeriod,
          );

        if (!Array.isArray(response)) {
          throw new Error(
            "The finance API returned an invalid revenue response.",
          );
        }

        setData(response);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadRevenue(period);
  }, [period, loadRevenue]);

  const summary = useMemo(() => {
    if (data.length === 0) {
      return {
        total: 0,
        average: 0,
        highest: 0,
        lowest: 0,
      };
    }

    const values = data.map(getPointValue);

    const total = values.reduce(
      (sum, value) => sum + value,
      0,
    );

    return {
      total,
      average: total / values.length,
      highest: Math.max(...values),
      lowest: Math.min(...values),
    };
  }, [data]);

  const currencies = useMemo(() => {
    return [
      ...new Set(
        data
          .map(getPointCurrency)
          .filter(Boolean),
      ),
    ];
  }, [data]);

  const currency =
    currencies.length === 1
      ? currencies[0]
      : "USD";

  const totalFormatted =
    currencies.length === 1
      ? formatCurrency(
          summary.total,
          currency,
        )
      : summary.total.toLocaleString(
          undefined,
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        );

  const averageFormatted =
    currencies.length === 1
      ? formatCurrency(
          summary.average,
          currency,
        )
      : summary.average.toLocaleString(
          undefined,
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        );

  const highestFormatted =
    currencies.length === 1
      ? formatCurrency(
          summary.highest,
          currency,
        )
      : summary.highest.toLocaleString(
          undefined,
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        );

  return (
    <section className="finance-page">
      <header className="finance-page-header">
        <div>
          <span>FOCKIS ADMIN CENTER</span>

          <h1>Revenue</h1>

          <p>
            Monitor gross, fee, refund, and net revenue
            performance over time.
          </p>
        </div>

        <div className="finance-page-header__actions">
          <label>
            <span className="sr-only">
              Revenue reporting period
            </span>

            <select
              value={period}
              onChange={(event) =>
                setPeriod(
                  event.target
                    .value as RevenuePeriod,
                )
              }
              disabled={loading || refreshing}
              aria-label="Revenue reporting period"
            >
              {PERIOD_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </label>

          <button
            type="button"
            className="finance-button"
            onClick={() =>
              void loadRevenue(
                period,
                true,
              )
            }
            disabled={
              loading || refreshing
            }
          >
            {refreshing
              ? "Refreshing…"
              : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div
          className="finance-alert"
          role="alert"
        >
          <div>
            <strong>
              Revenue data could not be loaded.
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadRevenue(
                period,
                true,
              )
            }
            disabled={refreshing}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && (
        <div className="finance-stats-grid">
          <article className="finance-stat-card">
            <span>Revenue periods</span>

            <strong>
              {data.length.toLocaleString()}
            </strong>

            <small>
              Reporting points returned
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Revenue total</span>

            <strong>
              {totalFormatted}
            </strong>

            <small>
              {currencies.length === 1
                ? currency
                : "Multiple currencies"}
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Average period</span>

            <strong>
              {averageFormatted}
            </strong>

            <small>
              Average value per reporting point
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Highest period</span>

            <strong>
              {highestFormatted}
            </strong>

            <small>
              Highest value returned
            </small>
          </article>
        </div>
      )}

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Revenue performance</h2>

            <p>
              {PERIOD_OPTIONS.find(
                (option) =>
                  option.value === period,
              )?.label ?? "Selected period"}
              . Revenue values are supplied by the Finance
              service.
            </p>
          </div>

          {!loading && (
            <span className="finance-panel-status">
              {data.length.toLocaleString()}{" "}
              {data.length === 1
                ? "period"
                : "periods"}
            </span>
          )}
        </div>

        {loading ? (
          <div
            className="finance-loading"
            role="status"
            aria-live="polite"
          >
            Loading revenue…
          </div>
        ) : data.length === 0 ? (
          <div className="finance-empty">
            <h3>No revenue data</h3>

            <p>
              No revenue data was returned for the selected
              reporting period.
            </p>
          </div>
        ) : (
          <RevenueChart data={data} />
        )}
      </div>

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Revenue monitoring</h2>

            <p>
              Use the detailed Finance records to reconcile
              changes in revenue with payments, fees, refunds,
              and seller payouts.
            </p>
          </div>
        </div>

        <div className="finance-dashboard-operations">
          <div className="finance-dashboard-operation">
            <span
              className="finance-dashboard-operation__icon"
              aria-hidden="true"
            >
              $
            </span>

            <span>
              <strong>Gross revenue</strong>

              <small>
                Revenue generated before applicable fees,
                refunds, and other financial adjustments.
              </small>
            </span>
          </div>

          <div className="finance-dashboard-operation">
            <span
              className="finance-dashboard-operation__icon"
              aria-hidden="true"
            >
              %
            </span>

            <span>
              <strong>Platform fees</strong>

              <small>
                Fees recorded by the Finance system should
                remain separately traceable from gross
                revenue.
              </small>
            </span>
          </div>

          <div className="finance-dashboard-operation">
            <span
              className="finance-dashboard-operation__icon"
              aria-hidden="true"
            >
              ↩
            </span>

            <span>
              <strong>Refunds and payouts</strong>

              <small>
                Refunds and seller payouts affect the final
                financial position and should be reconciled
                against their underlying records.
              </small>
            </span>
          </div>
        </div>
      </div>

      {currencies.length > 1 && (
        <div
          className="finance-alert"
          role="status"
        >
          <span>
            Multiple currencies are present in the returned
            revenue data. Aggregate values are raw totals and
            should not be treated as a single converted
            currency without applying Fockis&apos; approved
            exchange-rate policy.
          </span>
        </div>
      )}
    </section>
  );
}