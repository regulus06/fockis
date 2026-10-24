import { useCallback, useEffect, useMemo, useState } from "react";
import { subscriptionsAdminApi } from "../api/subscriptionsAdminApi";
import type { Subscription } from "../types/finance.types";

type SubscriptionStatus =
  | "active"
  | "trial"
  | "past_due"
  | "canceled"
  | "cancelled"
  | "expired"
  | "paused"
  | "incomplete"
  | "incomplete_expired"
  | string;

type SubscriptionView = Subscription & {
  userId?: string;
  email?: string;
  customerName?: string;
  customerEmail?: string;
  provider?: string;
  providerSubscriptionId?: string;
  stripeSubscriptionId?: string;
  startedAt?: string | Date;
  canceledAt?: string | Date;
  currentPeriodStart?: string | Date;
  currentPeriodEnd?: string | Date;
  trialEndsAt?: string | Date;
  createdAt?: string | Date;
};

const PAGE_SIZE = 25;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to complete the subscription operation.";
}

function getStatus(subscription: SubscriptionView): SubscriptionStatus {
  return String(subscription.status ?? "").toLowerCase();
}

function getCustomerName(subscription: SubscriptionView) {
  return (
    subscription.userName ||
    subscription.customerName ||
    subscription.email ||
    subscription.customerEmail ||
    subscription.userId ||
    "Unknown customer"
  );
}

function getCustomerSearchText(subscription: SubscriptionView) {
  return [
    subscription.userName,
    subscription.customerName,
    subscription.email,
    subscription.customerEmail,
    subscription.userId,
    subscription.providerSubscriptionId,
    subscription.stripeSubscriptionId,
    subscription.plan,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function formatDate(value?: string | Date) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

function formatDateTime(value?: string | Date) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function getAmount(subscription: SubscriptionView) {
  const amount = subscription.amount;
  if (!amount) return { value: 0, currency: "USD" };
  return {
    value: Number(amount.amount ?? 0),
    currency: String(amount.currency || "USD").toUpperCase(),
  };
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function statusLabel(status: SubscriptionStatus) {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusClass(status: SubscriptionStatus) {
  switch (status) {
    case "active":
      return "finance-status-badge finance-status-badge--success";
    case "trial":
      return "finance-status-badge finance-status-badge--info";
    case "past_due":
    case "incomplete":
    case "paused":
      return "finance-status-badge finance-status-badge--warning";
    case "canceled":
    case "cancelled":
    case "expired":
    case "incomplete_expired":
      return "finance-status-badge finance-status-badge--danger";
    default:
      return "finance-status-badge";
  }
}

function canCancel(status: string) {
  return ["active", "trial", "past_due", "paused", "incomplete"].includes(status);
}

function canReactivate(status: string) {
  return ["canceled", "cancelled", "paused"].includes(status);
}

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<SubscriptionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const loadSubscriptions = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await subscriptionsAdminApi.list();
      if (!Array.isArray(response)) {
        throw new Error("The Finance service returned an invalid subscriptions response.");
      }
      setRows(response as SubscriptionView[]);
      setPage(1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSubscriptions();
  }, [loadSubscriptions]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const statuses = useMemo(
    () => [...new Set(rows.map(getStatus).filter(Boolean))].sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((subscription) => {
      const status = getStatus(subscription);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      return !query || getCustomerSearchText(subscription).includes(query);
    });
  }, [rows, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  const summary = useMemo(() => {
    let active = 0;
    let trial = 0;
    let pastDue = 0;
    let canceled = 0;

    for (const subscription of rows) {
      const status = getStatus(subscription);
      if (status === "active") active += 1;
      if (status === "trial") trial += 1;
      if (status === "past_due" || status === "incomplete") pastDue += 1;
      if (["canceled", "cancelled", "expired", "incomplete_expired"].includes(status)) {
        canceled += 1;
      }
    }

    return { active, trial, pastDue, canceled };
  }, [rows]);

  const handleSubscriptionAction = async (
    subscription: SubscriptionView,
    action: "cancel" | "reactivate",
  ) => {
    const id = String(subscription.id ?? "");
    if (!id) {
      setActionError("This subscription has no ID, so it cannot be updated.");
      return;
    }

    const customer = getCustomerName(subscription);
    const confirmation =
      action === "cancel"
        ? `Cancel the subscription for ${customer}? Confirm that your backend/provider cancellation policy is appropriate before proceeding.`
        : `Reactivate the subscription for ${customer}?`;

    if (!window.confirm(confirmation)) return;

    setBusyId(id);
    setActionError("");
    setNotice("");

    try {
      if (action === "cancel") {
        await subscriptionsAdminApi.cancel(id);
        setNotice(`Cancellation request completed for ${customer}.`);
      } else {
        await subscriptionsAdminApi.reactivate(id);
        setNotice(`Reactivation request completed for ${customer}.`);
      }
      await loadSubscriptions(true);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="finance-page">
      <header className="finance-page-header">
        <div>
          <span>FOCKIS ADMIN CENTER</span>
          <h1>Subscriptions</h1>
          <p>Review subscriber accounts, billing status, renewal dates, and subscription lifecycle actions.</p>
        </div>
        <div className="finance-page-header__actions">
          <button
            type="button"
            className="finance-button"
            onClick={() => void loadSubscriptions(true)}
            disabled={loading || refreshing}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div className="finance-alert" role="alert">
          <div>
            <strong>Subscription data could not be loaded.</strong>
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => void loadSubscriptions(true)} disabled={refreshing}>
            Try again
          </button>
        </div>
      )}

      {notice && (
        <div className="finance-alert" role="status">
          <div><strong>Subscription updated</strong><span>{notice}</span></div>
          <button type="button" onClick={() => setNotice("")}>Dismiss</button>
        </div>
      )}

      {actionError && (
        <div className="finance-alert" role="alert">
          <div><strong>Action could not be completed.</strong><span>{actionError}</span></div>
          <button type="button" onClick={() => setActionError("")}>Dismiss</button>
        </div>
      )}

      {!loading && (
        <div className="finance-stats-grid">
          <article className="finance-stat-card">
            <span>Total subscriptions</span><strong>{rows.length.toLocaleString()}</strong>
            <small>Records returned by Finance</small>
          </article>
          <article className="finance-stat-card">
            <span>Active</span><strong>{summary.active.toLocaleString()}</strong>
            <small>Currently active subscriptions</small>
          </article>
          <article className="finance-stat-card">
            <span>Trial</span><strong>{summary.trial.toLocaleString()}</strong>
            <small>Subscriptions in trial</small>
          </article>
          <article className="finance-stat-card">
            <span>Past due</span><strong>{summary.pastDue.toLocaleString()}</strong>
            <small>Records requiring attention</small>
          </article>
          <article className="finance-stat-card">
            <span>Canceled / expired</span><strong>{summary.canceled.toLocaleString()}</strong>
            <small>Inactive subscription records</small>
          </article>
        </div>
      )}

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Subscriber records</h2>
            <p>Search by customer, email, plan, user ID, or provider subscription ID.</p>
          </div>
          {!loading && <span className="finance-panel-status">{filteredRows.length.toLocaleString()} records</span>}
        </div>

        <div className="finance-toolbar">
          <label className="finance-search">
            <span className="sr-only">Search subscriptions</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, plan, ID…"
              aria-label="Search subscriptions"
            />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by subscription status"
            >
              <option value="all">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </label>
          {(search || statusFilter !== "all") && (
            <button
              type="button"
              className="finance-button finance-button-secondary"
              onClick={() => { setSearch(""); setStatusFilter("all"); }}
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="finance-loading" role="status" aria-live="polite">Loading subscriptions…</div>
        ) : paginatedRows.length === 0 ? (
          <div className="finance-empty">
            <h3>{rows.length === 0 ? "No subscription records" : "No matching subscriptions"}</h3>
            <p>
              {rows.length === 0
                ? "The Finance service has not returned any subscription records."
                : "Try changing your search or status filter."}
            </p>
          </div>
        ) : (
          <>
            <div className="finance-table-wrap">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th scope="col">Customer</th>
                    <th scope="col">Plan</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Status</th>
                    <th scope="col">Renewal / period end</th>
                    <th scope="col">Provider</th>
                    <th scope="col">Subscription ID</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((subscription) => {
                    const amount = getAmount(subscription);
                    const status = getStatus(subscription);
                    const providerId =
                      subscription.providerSubscriptionId || subscription.stripeSubscriptionId || "—";
                    const id = String(subscription.id ?? "");
                    const isBusy = busyId === id;

                    return (
                      <tr key={id || providerId}>
                        <td>
                          <div>
                            <strong>{getCustomerName(subscription)}</strong>
                            {(subscription.email || subscription.customerEmail) && (
                              <small>{subscription.email || subscription.customerEmail}</small>
                            )}
                          </div>
                        </td>
                        <td><strong>{subscription.plan || "—"}</strong></td>
                        <td>{formatMoney(amount.value, amount.currency)}</td>
                        <td><span className={statusClass(status)}>{statusLabel(status)}</span></td>
                        <td>
                          <div>
                            <strong>{formatDate(subscription.renewsAt)}</strong>
                            {subscription.currentPeriodEnd && (
                              <small>Period ends {formatDate(subscription.currentPeriodEnd)}</small>
                            )}
                          </div>
                        </td>
                        <td>{subscription.provider || "—"}</td>
                        <td><code>{providerId}</code></td>
                        <td>
                          <div className="finance-row-actions">
                            {canCancel(status) && (
                              <button
                                type="button"
                                className="finance-button finance-button-secondary"
                                onClick={() => void handleSubscriptionAction(subscription, "cancel")}
                                disabled={Boolean(busyId)}
                              >
                                {isBusy ? "Working…" : "Cancel"}
                              </button>
                            )}
                            {canReactivate(status) && (
                              <button
                                type="button"
                                className="finance-button"
                                onClick={() => void handleSubscriptionAction(subscription, "reactivate")}
                                disabled={Boolean(busyId)}
                              >
                                {isBusy ? "Working…" : "Reactivate"}
                              </button>
                            )}
                            {!canCancel(status) && !canReactivate(status) && <span>—</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="finance-pagination" aria-label="Subscription pagination">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of{" "}
                {filteredRows.length.toLocaleString()}
              </span>
              <div>
                <button
                  type="button"
                  className="finance-button finance-button-secondary"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage <= 1}
                >
                  Previous
                </button>
                <span>Page {currentPage} of {pageCount}</span>
                <button
                  type="button"
                  className="finance-button finance-button-secondary"
                  onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                  disabled={currentPage >= pageCount}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {rows.length > 0 && (
        <div className="finance-panel">
          <div className="finance-panel-header">
            <div>
              <h2>Subscription lifecycle</h2>
              <p>Use these dates to review subscription history and reconcile provider records.</p>
            </div>
          </div>
          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  <th scope="col">Status</th>
                  <th scope="col">Started</th>
                  <th scope="col">Current period</th>
                  <th scope="col">Trial ends</th>
                  <th scope="col">Canceled</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.slice(0, 10).map((subscription) => (
                  <tr key={`lifecycle-${subscription.id}`}>
                    <td>{getCustomerName(subscription)}</td>
                    <td>
                      <span className={statusClass(getStatus(subscription))}>
                        {statusLabel(getStatus(subscription))}
                      </span>
                    </td>
                    <td>{formatDateTime(subscription.startedAt || subscription.createdAt)}</td>
                    <td>
                      {subscription.currentPeriodStart || subscription.currentPeriodEnd
                        ? `${formatDate(subscription.currentPeriodStart)} → ${formatDate(subscription.currentPeriodEnd)}`
                        : "—"}
                    </td>
                    <td>{formatDate(subscription.trialEndsAt)}</td>
                    <td>{formatDate(subscription.canceledAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
