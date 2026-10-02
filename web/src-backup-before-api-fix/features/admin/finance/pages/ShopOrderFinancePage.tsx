import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { financeAdminApi } from "../api/financeAdminApi";
import ShopOrderFinanceFlow from "../components/ShopOrderFinanceFlow";
import type { ShopOrderFinance } from "../types/finance.types";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load order finance.";
}

export default function ShopOrderFinancePage() {
  const { orderId = "" } = useParams<{
    orderId: string;
  }>();

  const [order, setOrder] =
    useState<ShopOrderFinance | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  const loadOrderFinance = useCallback(
    async (isRefresh = false) => {
      if (!orderId) {
        setOrder(null);
        setError(
          "No Shop order ID was provided.",
        );
        setLoading(false);
        return;
      }

      try {
        setError("");

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const result =
          await financeAdminApi.getShopOrderFinance(
            orderId,
          );

        if (!result) {
          throw new Error(
            "The Finance service did not return financial information for this order.",
          );
        }

        setOrder(result);
      } catch (err) {
        setOrder(null);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    void loadOrderFinance();
  }, [loadOrderFinance]);

  if (!orderId) {
    return (
      <section className="finance-page">
        <header className="finance-page-header">
          <div>
            <span>FOCKIS ADMIN CENTER</span>

            <h1>Shop Order Finance</h1>

            <p>
              Financial reconciliation for a Fockis Shop
              order.
            </p>
          </div>

          <Link
            to="/admin/finance/shop-orders"
            className="finance-button"
          >
            Back to Shop Orders
          </Link>
        </header>

        <div
          className="finance-alert"
          role="alert"
        >
          <div>
            <strong>Order ID required.</strong>

            <span>
              Open this page from a specific Shop order to
              view its financial reconciliation.
            </span>
          </div>

          <Link
            to="/admin/finance/shop-orders"
            className="finance-button finance-button-secondary"
          >
            View Shop Orders
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="finance-page">
      <header className="finance-page-header">
        <div>
          <span>FOCKIS ADMIN CENTER</span>

          <h1>Shop Order Finance</h1>

          <p>
            Financial reconciliation for a Fockis Shop order.
            Review the payment, fees, seller earnings,
            refunds, and payout lifecycle for this order.
          </p>
        </div>

        <div className="finance-page-header__actions">
          <Link
            to="/admin/finance/shop-orders"
            className="finance-button finance-button-secondary"
          >
            Back to Shop Orders
          </Link>

          <button
            type="button"
            className="finance-button"
            onClick={() =>
              void loadOrderFinance(true)
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

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Order reconciliation</h2>

            <p>
              Order ID:{" "}
              <strong>{orderId}</strong>
            </p>
          </div>

          {!loading && order && (
            <span className="finance-panel-status">
              Finance record loaded
            </span>
          )}
        </div>

        {error && (
          <div
            className="finance-alert"
            role="alert"
          >
            <div>
              <strong>
                Unable to load order finance.
              </strong>

              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadOrderFinance(true)
              }
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
            Loading Shop order financial data…
          </div>
        ) : !error && !order ? (
          <div className="finance-empty">
            <h3>
              Financial record not found
            </h3>

            <p>
              No financial reconciliation record was
              returned for this Shop order.
            </p>

            <button
              type="button"
              className="finance-button"
              onClick={() =>
                void loadOrderFinance(true)
              }
            >
              Try again
            </button>
          </div>
        ) : order ? (
          <ShopOrderFinanceFlow order={order} />
        ) : null}
      </div>

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Order finance controls</h2>

            <p>
              Use the order finance record as the
              reconciliation view for the complete Shop
              payment lifecycle.
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
              <strong>Customer payment</strong>

              <small>
                Verify the amount collected from the customer
                against the originating payment transaction.
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
                Review the fees recorded by Finance before
                determining seller earnings.
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
              <strong>Refunds</strong>

              <small>
                Confirm refunds are connected to the original
                order and payment before reconciling the final
                financial position.
              </small>
            </span>
          </div>

          <div className="finance-dashboard-operation">
            <span
              className="finance-dashboard-operation__icon"
              aria-hidden="true"
            >
              ↗
            </span>

            <span>
              <strong>Seller payout</strong>

              <small>
                Reconcile seller earnings and payout status
                against the order's final financial position.
              </small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}