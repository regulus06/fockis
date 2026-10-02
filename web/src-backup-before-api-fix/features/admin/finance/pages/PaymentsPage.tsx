import { useCallback, useEffect, useMemo, useState } from "react";
import { financeAdminApi } from "../api/financeAdminApi";
import type { FinanceTransaction } from "../types/finance.types";
import TransactionTable from "../components/TransactionTable";

const PAYMENT_TYPE = "SHOP_PAYMENT";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load customer payments.";
}

function getTransactionAmount(
  transaction: FinanceTransaction,
) {
  const value = transaction as FinanceTransaction & {
    amount?: number;
    grossAmount?: number;
    netAmount?: number;
    feeAmount?: number;
    currency?: string;
  };

  return Number(
    value.amount ??
      value.grossAmount ??
      value.netAmount ??
      0,
  );
}

function getTransactionCurrency(
  transaction: FinanceTransaction,
) {
  const value = transaction as FinanceTransaction & {
    currency?: string;
  };

  return value.currency || "USD";
}

function formatAmount(
  amount: number,
  currency: string,
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

export default function PaymentsPage() {
  const [rows, setRows] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 25;

  const loadPayments = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const data =
          await financeAdminApi.getTransactions(
            `type=${PAYMENT_TYPE}`,
          );

        if (!Array.isArray(data)) {
          throw new Error(
            "The finance API returned an invalid payment response.",
          );
        }

        setRows(data);
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
    void loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const statusOptions = useMemo(() => {
    return [
      ...new Set(
        rows
          .map((transaction) => {
            const value = transaction as FinanceTransaction & {
              status?: string;
            };

            return String(value.status ?? "")
              .trim()
              .toLowerCase();
          })
          .filter(Boolean),
      ),
    ].sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((transaction) => {
      const value = transaction as FinanceTransaction & {
        id?: string;
        status?: string;
        userId?: string;
        sellerId?: string;
        orderId?: string;
        reference?: string;
        paymentIntentId?: string;
        customerName?: string;
      };

      const searchable = [
        value.id,
        value.userId,
        value.sellerId,
        value.orderId,
        value.reference,
        value.paymentIntentId,
        value.customerName,
        value.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const status = String(
        value.status ?? "",
      ).toLowerCase();

      const matchesSearch =
        !query || searchable.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE),
  );

  const safePage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start =
      (safePage - 1) * PAGE_SIZE;

    return filteredRows.slice(
      start,
      start + PAGE_SIZE,
    );
  }, [filteredRows, safePage]);

  const summary = useMemo(() => {
    let total = 0;
    let successful = 0;
    let pending = 0;
    let failed = 0;

    for (const transaction of rows) {
      total += getTransactionAmount(transaction);

      const value =
        transaction as FinanceTransaction & {
          status?: string;
        };

      const status = String(
        value.status ?? "",
      )
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ");

      if (
        status.includes("success") ||
        status.includes("paid") ||
        status.includes("complete")
      ) {
        successful += 1;
      } else if (
        status.includes("pending") ||
        status.includes("processing") ||
        status.includes("open")
      ) {
        pending += 1;
      } else if (
        status.includes("failed") ||
        status.includes("cancel") ||
        status.includes("declined")
      ) {
        failed += 1;
      }
    }

    return {
      total,
      count: rows.length,
      successful,
      pending,
      failed,
    };
  }, [rows]);

  const currencies = useMemo(() => {
    return [
      ...new Set(
        rows
          .map(getTransactionCurrency)
          .filter(Boolean),
      ),
    ];
  }, [rows]);

  const totalFormatted = useMemo(() => {
    if (currencies.length !== 1) {
      return summary.total.toLocaleString(
        undefined,
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      );
    }

    return formatAmount(
      summary.total,
      currencies[0] || "USD",
    );
  }, [currencies, summary.total]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const hasFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all";

  return (
    <section className="finance-page">
      <header className="finance-page-header">
        <div>
          <span>FOCKIS ADMIN CENTER</span>

          <h1>Payments</h1>

          <p>
            Monitor customer payments collected by Fockis,
            including payment status, transaction references,
            and financial amounts.
          </p>
        </div>

        <button
          type="button"
          className="finance-button"
          onClick={() =>
            void loadPayments(true)
          }
          disabled={loading || refreshing}
        >
          {refreshing
            ? "Refreshing…"
            : "Refresh"}
        </button>
      </header>

      {error && (
        <div
          className="finance-alert"
          role="alert"
        >
          <div>
            <strong>
              Payments could not be loaded.
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadPayments(true)
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
            <span>Payments</span>

            <strong>
              {summary.count.toLocaleString()}
            </strong>

            <small>
              Customer payment transactions
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Payment volume</span>

            <strong>
              {totalFormatted}
            </strong>

            <small>
              {currencies.length === 1
                ? currencies[0]
                : "Multiple currencies"}
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Successful</span>

            <strong>
              {summary.successful.toLocaleString()}
            </strong>

            <small>
              Completed or successfully paid
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Pending</span>

            <strong>
              {summary.pending.toLocaleString()}
            </strong>

            <small>
              Pending or processing payments
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Attention</span>

            <strong>
              {summary.failed.toLocaleString()}
            </strong>

            <small>
              Failed, declined, or cancelled payments
            </small>
          </article>
        </div>
      )}

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Customer payments</h2>

            <p>
              {filteredRows.length.toLocaleString()} matching{" "}
              {filteredRows.length === 1
                ? "payment"
                : "payments"}
              {hasFilters
                ? " with the current filters"
                : ""}
              .
            </p>
          </div>

          <div className="finance-toolbar">
            <label
              htmlFor="payment-search"
              className="finance-search"
            >
              <span className="sr-only">
                Search customer payments
              </span>

              <input
                id="payment-search"
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search transaction, order, customer, or payment ID…"
                autoComplete="off"
              />
            </label>

            <label>
              <span className="sr-only">
                Filter payments by status
              </span>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value,
                  )
                }
                aria-label="Filter payments by status"
              >
                <option value="all">
                  All statuses
                </option>

                {statusOptions.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status
                        .replace(
                          /[_-]+/g,
                          " ",
                        )
                        .replace(
                          /\b\w/g,
                          (char) =>
                            char.toUpperCase(),
                        )}
                    </option>
                  ),
                )}
              </select>
            </label>

            {hasFilters && (
              <button
                type="button"
                className="finance-button finance-button-secondary"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div
            className="finance-loading"
            role="status"
            aria-live="polite"
          >
            Loading customer payments…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="finance-empty">
            <h3>
              {hasFilters
                ? "No matching payments"
                : "No customer payments"}
            </h3>

            <p>
              {hasFilters
                ? "No payment transactions match the current search and status filter."
                : "There are currently no customer payment transactions available."}
            </p>

            {hasFilters && (
              <button
                type="button"
                className="finance-button"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <TransactionTable
              rows={paginatedRows}
            />

            <div className="finance-pagination">
              <div>
                Showing{" "}
                <strong>
                  {(safePage - 1) *
                    PAGE_SIZE +
                    1}
                </strong>{" "}
                –{" "}
                <strong>
                  {Math.min(
                    safePage *
                      PAGE_SIZE,
                    filteredRows.length,
                  )}
                </strong>{" "}
                of{" "}
                <strong>
                  {filteredRows.length}
                </strong>
              </div>

              <div className="finance-pagination-controls">
                <button
                  type="button"
                  className="finance-button finance-button-secondary"
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.max(
                          1,
                          current - 1,
                        ),
                    )
                  }
                  disabled={
                    safePage <= 1
                  }
                >
                  Previous
                </button>

                <span>
                  Page{" "}
                  <strong>
                    {safePage}
                  </strong>{" "}
                  of{" "}
                  <strong>
                    {totalPages}
                  </strong>
                </span>

                <button
                  type="button"
                  className="finance-button finance-button-secondary"
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.min(
                          totalPages,
                          current + 1,
                        ),
                    )
                  }
                  disabled={
                    safePage >=
                    totalPages
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
            <h2>Payment operations</h2>

            <p>
              Payment records should remain traceable to the
              originating order, customer, payment provider,
              and underlying Finance transaction.
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
              <strong>Payment verification</strong>

              <small>
                Confirm payment status against the
                underlying payment-provider transaction
                before treating an order as paid.
              </small>
            </span>
          </div>

          <div className="finance-dashboard-operation">
            <span
              className="finance-dashboard-operation__icon"
              aria-hidden="true"
            >
              #
            </span>

            <span>
              <strong>Transaction traceability</strong>

              <small>
                Use transaction and payment references to
                trace customer payments through the Finance
                lifecycle.
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
              <strong>Payment exceptions</strong>

              <small>
                Investigate failed, declined, pending, or
                cancelled payments before taking downstream
                financial actions.
              </small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}