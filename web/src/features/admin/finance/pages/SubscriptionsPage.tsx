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
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load subscriptions.";
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
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString();
}

function formatDateTime(value?: string | Date) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

function getAmount(subscription: SubscriptionView) {
  const amount = subscription.amount;

  if (!amount) {
    return {
      value: 0,
      currency: "USD",
    };
  }

  return {
    value: Number(amount.amount ?? 0),
    currency: String(amount.currency || "USD").toUpperCase(),
  };
}

function formatMoney(
  value: number,
  currency: string,
) {
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
  if (!status) {
    return "Unknown";
  }

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function statusClass(status: SubscriptionStatus) {
  switch (status) {
    case "active":
      return "finance-status-badge finance-status-badge--success";

    case "trial":
      return "finance-status-badge finance-status-badge--info";

    case "past_due":
    case "incomplete":
      return "finance-status-badge finance-status-badge--warning";

    case "canceled":
    case "cancelled":
    case "expired":
    case "incomplete_expired":
      return "finance-status-badge finance-status-badge--danger";

    case "paused":
      return "finance-status-badge finance-status-badge--warning";

    default:
      return "finance-status-badge";
  }
}

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<SubscriptionView[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [page, setPage] = useState(1);

  const loadSubscriptions = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response =
          await subscriptionsAdminApi.list();

        if (!Array.isArray(response)) {
          throw new Error(
            "The Finance service returned an invalid subscriptions response.",
          );
        }

        setRows(response as SubscriptionView[]);
        setPage(1);
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
    void loadSubscriptions();
  }, [loadSubscriptions]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const statuses = useMemo(() => {
    return [
      ...new Set(
        rows
          .map(getStatus)
          .filter(Boolean),
      ),
    ].sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((subscription) => {
      const status = getStatus(subscription);

      const matchesStatus =
        statusFilter === "all" ||
        status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return getCustomerSearchText(
        subscription,
      ).includes(query);
    });
  }, [rows, search, statusFilter]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE),
  );

  const currentPage = Math.min(
    page,
    pageCount,
  );

  const paginatedRows = useMemo(() => {
    const start =
      (currentPage - 1) * PAGE_SIZE;

    return filteredRows.slice(
      start,
      start + PAGE_SIZE,
    );
  }, [filteredRows, currentPage]);

  const summary = useMemo(() => {
    let active = 0;
    let trial = 0;
    let pastDue = 0;
    let canceled = 0;
    let total = 0;

    const currencies = new Set<string>();

    for (const subscription of rows) {
      const status = getStatus(subscription);
      const amount = getAmount(subscription);

      currencies.add(amount.currency);
      total += amount.value;

      if (status === "active") {
        active += 1;
      }

      if (status === "trial") {
        trial += 1;
      }

      if (
        status === "past_due" ||
        status === "incomplete"
      ) {
        pastDue += 1;
      }

      if (
        status === "canceled" ||
        status === "cancelled" ||
        status === "expired" ||
        status === "incomplete_expired"
      ) {
        canceled += 1;
      }
    }

    return {
      active,
      trial,
      pastDue,
      canceled,
      total,
      currencies: [...currencies],
    };
  }, [rows]);

  const totalFormatted =
    summary.currencies.length === 1
      ? formatMoney(
          summary.total,
          summary.currencies[0],
        )
      : summary.total.toLocaleString(
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

          <h1>Subscriptions</h1>

          <p>
            Manage recurring plans, subscription
            status, renewal dates, customers, and
            subscription revenue.
          </p>
        </div>

        <div className="finance-page-header__actions">
          <button
            type="button"
            className="finance-button"
            onClick={() =>
              void loadSubscriptions(true)
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
              Subscription data could not be
              loaded.
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadSubscriptions(true)
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
            <span>Total subscriptions</span>

            <strong>
              {rows.length.toLocaleString()}
            </strong>

            <small>
              Subscription records returned by
              Finance
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Active</span>

            <strong>
              {summary.active.toLocaleString()}
            </strong>

            <small>
              Currently active subscriptions
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Trial</span>

            <strong>
              {summary.trial.toLocaleString()}
            </strong>

            <small>
              Subscriptions currently in trial
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Past due</span>

            <strong>
              {summary.pastDue.toLocaleString()}
            </strong>

            <small>
              Subscriptions requiring attention
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Subscription value</span>

            <strong>{totalFormatted}</strong>

            <small>
              Returned subscription amounts
            </small>
          </article>
        </div>
      )}

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Subscription records</h2>

            <p>
              Search customers, plans, provider
              identifiers, and subscription records.
            </p>
          </div>

          {!loading && (
            <span className="finance-panel-status">
              {filteredRows.length.toLocaleString()}{" "}
              {filteredRows.length === 1
                ? "record"
                : "records"}
            </span>
          )}
        </div>

        <div className="finance-toolbar">
          <label className="finance-search">
            <span className="sr-only">
              Search subscriptions
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search customer, plan, ID…"
              aria-label="Search subscriptions"
            />
          </label>

          <label>
            <span className="sr-only">
              Filter by subscription status
            </span>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
              aria-label="Filter by subscription status"
            >
              <option value="all">
                All statuses
              </option>

              {statuses.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          {(search || statusFilter !== "all") && (
            <button
              type="button"
              className="finance-button finance-button-secondary"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div
            className="finance-loading"
            role="status"
            aria-live="polite"
          >
            Loading subscriptions…
          </div>
        ) : paginatedRows.length === 0 ? (
          <div className="finance-empty">
            <h3>
              {rows.length === 0
                ? "No subscription records"
                : "No matching subscriptions"}
            </h3>

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
                    <th scope="col">
                      Customer
                    </th>

                    <th scope="col">
                      Plan
                    </th>

                    <th scope="col">
                      Amount
                    </th>

                    <th scope="col">
                      Status
                    </th>

                    <th scope="col">
                      Renewal
                    </th>

                    <th scope="col">
                      Provider
                    </th>

                    <th scope="col">
                      Subscription ID
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRows.map(
                    (subscription) => {
                      const amount =
                        getAmount(
                          subscription,
                        );

                      const status =
                        getStatus(
                          subscription,
                        );

                      const providerId =
                        subscription.providerSubscriptionId ||
                        subscription.stripeSubscriptionId ||
                        "—";

                      return (
                        <tr
                          key={
                            subscription.id
                          }
                        >
                          <td>
                            <div>
                              <strong>
                                {getCustomerName(
                                  subscription,
                                )}
                              </strong>

                              {(subscription.email ||
                                subscription.customerEmail) && (
                                <small>
                                  {subscription.email ||
                                    subscription.customerEmail}
                                </small>
                              )}
                            </div>
                          </td>

                          <td>
                            <strong>
                              {subscription.plan ||
                                "—"}
                            </strong>
                          </td>

                          <td>
                            {formatMoney(
                              amount.value,
                              amount.currency,
                            )}
                          </td>

                          <td>
                            <span
                              className={statusClass(
                                status,
                              )}
                            >
                              {statusLabel(
                                status,
                              )}
                            </span>
                          </td>

                          <td>
                            <div>
                              <strong>
                                {formatDate(
                                  subscription.renewsAt,
                                )}
                              </strong>

                              {subscription.currentPeriodEnd && (
                                <small>
                                  Period ends{" "}
                                  {formatDate(
                                    subscription.currentPeriodEnd,
                                  )}
                                </small>
                              )}
                            </div>
                          </td>

                          <td>
                            {subscription.provider ||
                              "—"}
                          </td>

                          <td>
                            <code>
                              {providerId}
                            </code>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>

            <div
              className="finance-pagination"
              aria-label="Subscription pagination"
            >
              <span>
                Showing{" "}
                {filteredRows.length === 0
                  ? 0
                  : (currentPage - 1) *
                      PAGE_SIZE +
                    1}{" "}
               –{" "}
                {Math.min(
                  currentPage * PAGE_SIZE,
                  filteredRows.length,
                )}{" "}
                of{" "}
                {filteredRows.length.toLocaleString()}
              </span>

              <div>
                <button
                  type="button"
                  className="finance-button finance-button-secondary"
                  onClick={() =>
                    setPage((value) =>
                      Math.max(
                        1,
                        value - 1,
                      ),
                    )
                  }
                  disabled={
                    currentPage <= 1
                  }
                >
                  Previous
                </button>

                <span>
                  Page {currentPage} of{" "}
                  {pageCount}
                </span>

                <button
                  type="button"
                  className="finance-button finance-button-secondary"
                  onClick={() =>
                    setPage((value) =>
                      Math.min(
                        pageCount,
                        value + 1,
                      ),
                    )
                  }
                  disabled={
                    currentPage >=
                    pageCount
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Subscription operations</h2>

            <p>
              Subscription status should be reconciled
              with the payment provider and the
              underlying customer account.
            </p>
          </div>
        </div>

        <div className="finance-dashboard-operations">
          <div className="finance-dashboard-operation">
            <span
              className="finance-dashboard-operation__icon"
              aria-hidden="true"
            >
              ✓
            </span>

            <span>
              <strong>
                Active subscriptions
              </strong>

              <small>
                Track active plans and their upcoming
                renewal periods.
              </small>
            </span>
          </div>

          <div className="finance-dashboard-operation">
            <span
              className="finance-dashboard-operation__icon"
              aria-hidden="true"
            >
              $
            </span>

            <span>
              <strong>
                Recurring revenue
              </strong>

              <small>
                Reconcile subscription charges with
                the associated payment records and
                provider events.
              </small>
            </span>
          </div>

          <div className="finance-dashboard-operation">
            <span
              className="finance-dashboard-operation__icon"
              aria-hidden="true"
            >
              !
            </span>

            <span>
              <strong>
                Past-due accounts
              </strong>

              <small>
                Review failed or overdue subscription
                payments before treating the
                subscription as financially settled.
              </small>
            </span>
          </div>

          <div className="finance-dashboard-operation">
            <span
              className="finance-dashboard-operation__icon"
              aria-hidden="true"
            >
              ↻
            </span>

            <span>
              <strong>
                Provider reconciliation
              </strong>

              <small>
                Provider subscription IDs and payment
                events should remain traceable for
                audit and reconciliation purposes.
              </small>
            </span>
          </div>
        </div>
      </div>

      {summary.currencies.length > 1 && (
        <div
          className="finance-alert"
          role="status"
        >
          <span>
            Multiple currencies are present in the
            returned subscription data. The aggregate
            subscription value is a raw total and should
            not be treated as a single converted currency
            without applying Fockis&apos; approved
            exchange-rate policy.
          </span>
        </div>
      )}

      {rows.length > 0 && (
        <div className="finance-panel">
          <div className="finance-panel-header">
            <div>
              <h2>Subscription lifecycle</h2>

              <p>
                Renewal and cancellation timestamps
                are retained so Finance administrators
                can reconcile recurring billing activity.
              </p>
            </div>
          </div>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th scope="col">
                    Status
                  </th>

                  <th scope="col">
                    Started
                  </th>

                  <th scope="col">
                    Current period
                  </th>

                  <th scope="col">
                    Trial ends
                  </th>

                  <th scope="col">
                    Canceled
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginatedRows.slice(0, 10).map(
                  (subscription) => (
                    <tr
                      key={`lifecycle-${subscription.id}`}
                    >
                      <td>
                        <span
                          className={statusClass(
                            getStatus(
                              subscription,
                            ),
                          )}
                        >
                          {statusLabel(
                            getStatus(
                              subscription,
                            ),
                          )}
                        </span>
                      </td>

                      <td>
                        {formatDateTime(
                          subscription.startedAt ||
                            subscription.createdAt,
                        )}
                      </td>

                      <td>
                        {subscription.currentPeriodStart ||
                        subscription.currentPeriodEnd ? (
                          <>
                            {formatDate(
                              subscription.currentPeriodStart,
                            )}{" "}
                            →{" "}
                            {formatDate(
                              subscription.currentPeriodEnd,
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>
                        {formatDate(
                          subscription.trialEndsAt,
                        )}
                      </td>

                      <td>
                        {formatDate(
                          subscription.canceledAt,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}