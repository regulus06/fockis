import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/FinanceDashboardPage.scss";
import FinanceStatsCards from "../components/FinanceStatsCards";
import RevenueChart from "../components/RevenueChart";
import { financeAdminApi } from "../api/financeAdminApi";
import type {
  FinanceOverview,
  RevenuePoint,
} from "../types/finance.types";

type FinanceNavItem = {
  label: string;
  path: string;
  icon: string;
  description: string;
};

const FINANCE_NAVIGATION: FinanceNavItem[] = [
  {
    label: "Overview",
    path: "/admin/finance",
    icon: "▦",
    description: "Financial performance and operations overview",
  },
  {
    label: "Transactions",
    path: "/admin/finance/transactions",
    icon: "⇄",
    description: "Platform-wide financial transactions",
  },
  {
    label: "Payments",
    path: "/admin/finance/payments",
    icon: "▣",
    description: "Customer payment activity",
  },
  {
    label: "Payouts",
    path: "/admin/finance/payouts",
    icon: "↗",
    description: "Seller and creator payouts",
  },
  {
    label: "Refunds",
    path: "/admin/finance/refunds",
    icon: "↩",
    description: "Issued and pending refunds",
  },
  {
    label: "Revenue",
    path: "/admin/finance/revenue",
    icon: "$",
    description: "Revenue performance and trends",
  },
  {
    label: "Fees",
    path: "/admin/finance/fees",
    icon: "%",
    description: "Platform fee reporting",
  },
  {
    label: "Subscriptions",
    path: "/admin/finance/subscriptions",
    icon: "◉",
    description: "Subscription billing and revenue",
  },
  {
    label: "Coins",
    path: "/admin/finance/coins",
    icon: "◆",
    description: "Fockis coin balances and activity",
  },
  {
    label: "Wallets",
    path: "/admin/finance/wallets",
    icon: "▣",
    description: "User wallet balances and activity",
  },
  {
    label: "Invoices",
    path: "/admin/finance/invoices",
    icon: "▤",
    description: "Invoices and billing records",
  },
  {
    label: "Reports",
    path: "/admin/finance/reports",
    icon: "▥",
    description: "Financial reporting and exports",
  },
  {
    label: "Shop Orders",
    path: "/admin/finance/shop-orders",
    icon: "🛍",
    description: "Order-level financial reconciliation",
  },
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load finance data.";
}

function getRevenueAmount(point: RevenuePoint) {
  const value = point as RevenuePoint & {
    amount?: number;
    revenue?: number;
    value?: number;
  };

  return Number(
    value.amount ??
      value.revenue ??
      value.value ??
      0,
  );
}

export default function FinanceDashboardPage() {
  const [overview, setOverview] =
    useState<FinanceOverview | null>(null);

  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadFinance = useCallback(async (isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [nextOverview, nextRevenue] =
        await Promise.all([
          financeAdminApi.getOverview(),
          financeAdminApi.getRevenue(),
        ]);

      if (!nextOverview) {
        throw new Error(
          "The finance API returned an empty overview.",
        );
      }

      if (!Array.isArray(nextRevenue)) {
        throw new Error(
          "The finance API returned an invalid revenue response.",
        );
      }

      setOverview(nextOverview);
      setRevenue(nextRevenue);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadFinance();
  }, [loadFinance]);

  const revenueSummary = useMemo(() => {
    if (revenue.length === 0) {
      return {
        total: 0,
        average: 0,
        highest: 0,
      };
    }

    const amounts = revenue.map(getRevenueAmount);

    const total = amounts.reduce(
      (sum, amount) => sum + amount,
      0,
    );

    const highest = Math.max(...amounts);

    return {
      total,
      average: total / amounts.length,
      highest,
    };
  }, [revenue]);

  const formatCurrency = useCallback(
    (amount: number) => {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    },
    [],
  );

  return (
    <section className="finance-page">
      <header className="finance-page-header">
        <div>
          <span>FOCKIS ADMIN CENTER</span>

          <h1>Finance</h1>

          <p>
            Central control for every money movement across
            Fockis.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadFinance(true)}
          disabled={loading || refreshing}
          className="finance-button"
          aria-label="Refresh finance data"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <nav
        className="finance-dashboard-navigation"
        aria-label="Finance administration"
      >
        {FINANCE_NAVIGATION.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={
              item.path === "/admin/finance"
                ? "finance-dashboard-navigation__item finance-dashboard-navigation__item--active"
                : "finance-dashboard-navigation__item"
            }
            title={item.description}
          >
            <span
              className="finance-dashboard-navigation__icon"
              aria-hidden="true"
            >
              {item.icon}
            </span>

            <strong>{item.label}</strong>
          </Link>
        ))}
      </nav>

      {error && (
        <div
          className="finance-alert"
          role="alert"
          aria-live="polite"
        >
          <div>
            <strong>
              Finance data could not be loaded.
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => void loadFinance(true)}
            disabled={refreshing}
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div
          className="finance-loading"
          role="status"
          aria-live="polite"
        >
          Loading finance overview…
        </div>
      ) : (
        <>
          <FinanceStatsCards overview={overview} />

          <div className="finance-stats-grid">
            <article className="finance-stat-card">
              <span>Revenue periods</span>

              <strong>
                {revenue.length.toLocaleString()}
              </strong>

              <small>
                Reporting periods returned by Finance
              </small>
            </article>

            <article className="finance-stat-card">
              <span>Chart total</span>

              <strong>
                {formatCurrency(revenueSummary.total)}
              </strong>

              <small>
                Revenue represented in the chart
              </small>
            </article>

            <article className="finance-stat-card">
              <span>Average period</span>

              <strong>
                {formatCurrency(revenueSummary.average)}
              </strong>

              <small>
                Average revenue per reporting period
              </small>
            </article>

            <article className="finance-stat-card">
              <span>Highest period</span>

              <strong>
                {formatCurrency(revenueSummary.highest)}
              </strong>

              <small>
                Highest value returned in the chart
              </small>
            </article>
          </div>
        </>
      )}

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Revenue</h2>

            <p>
              Review revenue performance across the
              reporting periods returned by the Finance
              service.
            </p>
          </div>

          {!loading && revenue.length > 0 && (
            <span
              className="finance-panel-status"
              aria-label={`${revenue.length} revenue periods`}
            >
              {revenue.length.toLocaleString()}{" "}
              {revenue.length === 1
                ? "period"
                : "periods"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="finance-loading">
            Loading revenue…
          </div>
        ) : revenue.length === 0 ? (
          <div className="finance-empty">
            <h3>No revenue data</h3>

            <p>
              The Finance service did not return any revenue
              periods for the current reporting range.
            </p>
          </div>
        ) : (
          <RevenueChart data={revenue} />
        )}
      </div>

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Finance operations</h2>

            <p>
              Use the Finance Center to move from platform
              performance into individual financial
              operations.
            </p>
          </div>
        </div>

        <div className="finance-dashboard-operations">
          {FINANCE_NAVIGATION.filter(
            (item) => item.path !== "/admin/finance",
          ).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="finance-dashboard-operation"
            >
              <span
                className="finance-dashboard-operation__icon"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <span>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>

              <span
                className="finance-dashboard-operation__arrow"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>How Fockis money flows</h2>

            <p>
              Finance connects customer payments, platform
              fees, seller earnings, refunds, and payouts.
            </p>
          </div>
        </div>

        <div className="finance-money-flow">
          <div className="finance-money-flow__step">
            <span
              className="finance-money-flow__number"
              aria-hidden="true"
            >
              1
            </span>

            <div>
              <strong>Customer payment</strong>

              <p>
                A customer completes a payment for a Fockis
                product, service, subscription, or other
                supported transaction.
              </p>
            </div>
          </div>

          <span
            className="finance-money-flow__arrow"
            aria-hidden="true"
          >
            →
          </span>

          <div className="finance-money-flow__step">
            <span
              className="finance-money-flow__number"
              aria-hidden="true"
            >
              2
            </span>

            <div>
              <strong>Finance records</strong>

              <p>
                The transaction is recorded with its amount,
                currency, payment status, fees, and related
                financial references.
              </p>
            </div>
          </div>

          <span
            className="finance-money-flow__arrow"
            aria-hidden="true"
          >
            →
          </span>

          <div className="finance-money-flow__step">
            <span
              className="finance-money-flow__number"
              aria-hidden="true"
            >
              3
            </span>

            <div>
              <strong>Platform fee</strong>

              <p>
                Applicable Fockis platform fees are recorded
                separately from the transaction's gross
                amount.
              </p>
            </div>
          </div>

          <span
            className="finance-money-flow__arrow"
            aria-hidden="true"
          >
            →
          </span>

          <div className="finance-money-flow__step">
            <span
              className="finance-money-flow__number"
              aria-hidden="true"
            >
              4
            </span>

            <div>
              <strong>Seller payout</strong>

              <p>
                The eligible seller earnings move through the
                payout workflow after fees, refunds, and other
                applicable adjustments.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}