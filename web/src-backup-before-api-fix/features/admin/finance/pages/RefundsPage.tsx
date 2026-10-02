import { useCallback, useEffect, useMemo, useState } from "react";
import { refundsAdminApi } from "../api/refundsAdminApi";
import type { Refund } from "../types/finance.types";
import RefundTable from "../components/RefundTable";

type RefundRecord = Refund & {
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  userId?: string;
  customerId?: string;
  customerName?: string;
  sellerId?: string;
  sellerName?: string;
  orderId?: string;
  transactionId?: string;
  paymentId?: string;
  reason?: string;
  createdAt?: string;
  updatedAt?: string;
};

const PAGE_SIZE = 25;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load refunds.";
}

function getAmount(refund: RefundRecord) {
  return Number(refund.amount ?? 0);
}

function getCurrency(refund: RefundRecord) {
  return refund.currency || "USD";
}

function formatAmount(amount: number, currency: string) {
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

function normalizeValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeStatus(status: unknown) {
  return normalizeValue(status).replace(
    /[_-]+/g,
    " ",
  );
}

function formatStatus(status: unknown) {
  return String(status ?? "Unknown")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function getStatusClass(status: unknown) {
  const normalized = normalizeStatus(status);

  if (
    normalized.includes("refunded") ||
    normalized.includes("complete") ||
    normalized.includes("success")
  ) {
    return "finance-status-badge finance-status-badge--success";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("processing") ||
    normalized.includes("requested") ||
    normalized.includes("review")
  ) {
    return "finance-status-badge finance-status-badge--warning";
  }

  if (
    normalized.includes("failed") ||
    normalized.includes("rejected") ||
    normalized.includes("cancel") ||
    normalized.includes("declined")
  ) {
    return "finance-status-badge finance-status-badge--danger";
  }

  return "finance-status-badge";
}

export default function RefundsPage() {
  const [rows, setRows] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const loadRefunds = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const data = await refundsAdminApi.list();

        if (!Array.isArray(data)) {
          throw new Error(
            "The refunds API returned an invalid response.",
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
    void loadRefunds();
  }, [loadRefunds]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const records = useMemo<RefundRecord[]>(
    () => rows as RefundRecord[],
    [rows],
  );

  const statusOptions = useMemo(() => {
    return [
      ...new Set(
        records
          .map((refund) =>
            normalizeStatus(refund.status),
          )
          .filter(Boolean),
      ),
    ].sort();
  }, [records]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((refund) => {
      const searchable = [
        refund.id,
        refund.userId,
        refund.customerId,
        refund.customerName,
        refund.sellerId,
        refund.sellerName,
        refund.orderId,
        refund.transactionId,
        refund.paymentId,
        refund.reason,
        refund.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const status = normalizeStatus(
        refund.status,
      );

      const matchesSearch =
        !query || searchable.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE),
  );

  const safePage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;

    return filteredRows.slice(
      start,
      start + PAGE_SIZE,
    );
  }, [filteredRows, safePage]);

  const summary = useMemo(() => {
    let totalAmount = 0;
    let completedAmount = 0;
    let pendingAmount = 0;
    let failedAmount = 0;

    let completedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    for (const refund of records) {
      const amount = getAmount(refund);
      const status = normalizeStatus(
        refund.status,
      );

      totalAmount += amount;

      if (
        status.includes("refunded") ||
        status.includes("complete") ||
        status.includes("success")
      ) {
        completedAmount += amount;
        completedCount += 1;
      } else if (
        status.includes("pending") ||
        status.includes("processing") ||
        status.includes("requested") ||
        status.includes("review")
      ) {
        pendingAmount += amount;
        pendingCount += 1;
      } else if (
        status.includes("failed") ||
        status.includes("rejected") ||
        status.includes("cancel") ||
        status.includes("declined")
      ) {
        failedAmount += amount;
        failedCount += 1;
      }
    }

    return {
      count: records.length,
      totalAmount,
      completedAmount,
      pendingAmount,
      failedAmount,
      completedCount,
      pendingCount,
      failedCount,
    };
  }, [records]);

  const currencies = useMemo(() => {
    return [
      ...new Set(
        records
          .map(getCurrency)
          .filter(Boolean),
      ),
    ];
  }, [records]);

  const formatTotal = (amount: number) => {
    if (currencies.length !== 1) {
      return amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    return formatAmount(
      amount,
      currencies[0] || "USD",
    );
  };

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

          <h1>Refunds</h1>

          <p>
            Review customer refunds, monitor refund status,
            and reconcile returned funds with the original
            payment transaction.
          </p>
        </div>

        <button
          type="button"
          className="finance-button"
          onClick={() =>
            void loadRefunds(true)
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
              Refunds could not be loaded.
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadRefunds(true)
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
            <span>Total refunds</span>

            <strong>
              {summary.count.toLocaleString()}
            </strong>

            <small>
              Refund records returned by Finance
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Refund value</span>

            <strong>
              {formatTotal(
                summary.totalAmount,
              )}
            </strong>

            <small>
              {currencies.length === 1
                ? currencies[0]
                : "Multiple currencies"}
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Completed</span>

            <strong>
              {formatTotal(
                summary.completedAmount,
              )}
            </strong>

            <small>
              {summary.completedCount.toLocaleString()}{" "}
              completed refunds
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Pending</span>

            <strong>
              {formatTotal(
                summary.pendingAmount,
              )}
            </strong>

            <small>
              {summary.pendingCount.toLocaleString()}{" "}
              awaiting completion
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Attention</span>

            <strong>
              {formatTotal(
                summary.failedAmount,
              )}
            </strong>

            <small>
              {summary.failedCount.toLocaleString()}{" "}
              failed or rejected
            </small>
          </article>
        </div>
      )}

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Refund operations</h2>

            <p>
              {filteredRows.length.toLocaleString()} matching{" "}
              {filteredRows.length === 1
                ? "refund"
                : "refunds"}
              {hasFilters
                ? " with the current filters"
                : ""}
              .
            </p>
          </div>

          <div className="finance-toolbar">
            <label
              htmlFor="refund-search"
              className="finance-search"
            >
              <span className="sr-only">
                Search refunds
              </span>

              <input
                id="refund-search"
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search refund, customer, seller, order, or transaction…"
                autoComplete="off"
              />
            </label>

            <label>
              <span className="sr-only">
                Filter refunds by status
              </span>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value,
                  )
                }
                aria-label="Filter refunds by status"
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
                      {formatStatus(status)}
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
            Loading refunds…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="finance-empty">
            <h3>
              {hasFilters
                ? "No matching refunds"
                : "No refunds"}
            </h3>

            <p>
              {hasFilters
                ? "No refund records match the current search and status filter."
                : "There are currently no refund records available."}
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
            <RefundTable rows={paginatedRows} />

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
            <h2>Refund controls</h2>

            <p>
              Refund operations should remain traceable to
              the original payment, order, customer, seller,
              and payment-provider refund record.
            </p>
          </div>
        </div>

        <div className="finance-dashboard-operations">
          <div className="finance-dashboard-operation">
            <span
              className="finance-dashboard-operation__icon"
              aria-hidden="true"
            >
              ↩
            </span>

            <span>
              <strong>Refund reconciliation</strong>

              <small>
                Compare the refund amount with the original
                transaction before considering the refund
                settled.
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
                Keep the original payment, order,
                transaction, and refund references connected
                throughout the refund lifecycle.
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
              <strong>Exception handling</strong>

              <small>
                Failed, rejected, cancelled, or pending
                refunds should be investigated before
                issuing another financial adjustment.
              </small>
            </span>
          </div>
        </div>
      </div>

      {currencies.length > 1 && (
        <div className="finance-alert">
          <span>
            Multiple currencies are present in the refund
            records. Aggregate amounts are raw totals and
            should not be interpreted as a single converted
            currency without applying Fockis&apos; approved
            exchange-rate policy.
          </span>
        </div>
      )}
    </section>
  );
}