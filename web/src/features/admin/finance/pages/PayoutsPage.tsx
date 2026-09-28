import { useCallback, useEffect, useMemo, useState } from "react";
import { payoutsAdminApi } from "../api/payoutsAdminApi";
import type { Payout } from "../types/finance.types";
import PayoutTable from "../components/PayoutTable";

type PayoutRecord = Payout & {
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  sellerId?: string;
  sellerName?: string;
  orderId?: string;
  createdAt?: string;
  updatedAt?: string;
};

const PAGE_SIZE = 25;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load seller payouts.";
}

function getAmount(payout: PayoutRecord) {
  return Number(payout.amount ?? 0);
}

function getCurrency(payout: PayoutRecord) {
  return payout.currency || "USD";
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

function normalizeStatus(status: unknown) {
  return String(status ?? "unknown")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
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
    normalized.includes("paid") ||
    normalized.includes("complete") ||
    normalized.includes("success")
  ) {
    return "finance-status-badge finance-status-badge--success";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("processing") ||
    normalized.includes("queued") ||
    normalized.includes("scheduled")
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

export default function PayoutsPage() {
  const [rows, setRows] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const loadPayouts = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const data = await payoutsAdminApi.list();

        if (!Array.isArray(data)) {
          throw new Error(
            "The payouts API returned an invalid response.",
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
    void loadPayouts();
  }, [loadPayouts]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const records = useMemo<PayoutRecord[]>(
    () => rows as PayoutRecord[],
    [rows],
  );

  const statusOptions = useMemo(() => {
    return [
      ...new Set(
        records
          .map((payout) =>
            normalizeStatus(payout.status),
          )
          .filter(Boolean),
      ),
    ].sort();
  }, [records]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((payout) => {
      const searchable = [
        payout.id,
        payout.sellerId,
        payout.sellerName,
        payout.orderId,
        payout.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const status = normalizeStatus(
        payout.status,
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
    let paidAmount = 0;
    let pendingAmount = 0;
    let failedAmount = 0;

    let paidCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    for (const payout of records) {
      const amount = getAmount(payout);
      const status = normalizeStatus(
        payout.status,
      );

      totalAmount += amount;

      if (
        status.includes("paid") ||
        status.includes("complete") ||
        status.includes("success")
      ) {
        paidAmount += amount;
        paidCount += 1;
      } else if (
        status.includes("pending") ||
        status.includes("processing") ||
        status.includes("queued") ||
        status.includes("scheduled")
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
      totalAmount,
      paidAmount,
      pendingAmount,
      failedAmount,
      paidCount,
      pendingCount,
      failedCount,
      count: records.length,
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

          <h1>Seller Payouts</h1>

          <p>
            Monitor money owed and paid to Fockis Shop
            sellers, including payout status and
            operational exceptions.
          </p>
        </div>

        <button
          type="button"
          className="finance-button"
          onClick={() =>
            void loadPayouts(true)
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
              Seller payouts could not be loaded.
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadPayouts(true)
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
            <span>Total payouts</span>

            <strong>
              {summary.count.toLocaleString()}
            </strong>

            <small>
              Seller payout records
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Total payout value</span>

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
            <span>Paid</span>

            <strong>
              {formatTotal(
                summary.paidAmount,
              )}
            </strong>

            <small>
              {summary.paidCount.toLocaleString()}{" "}
              completed payouts
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
            <h2>Payout operations</h2>

            <p>
              {filteredRows.length.toLocaleString()} matching{" "}
              {filteredRows.length === 1
                ? "payout"
                : "payouts"}
              {hasFilters
                ? " with the current filters"
                : ""}
              .
            </p>
          </div>

          <div className="finance-toolbar">
            <label
              htmlFor="payout-search"
              className="finance-search"
            >
              <span className="sr-only">
                Search seller payouts
              </span>

              <input
                id="payout-search"
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search seller, payout, order, or ID…"
                autoComplete="off"
              />
            </label>

            <label>
              <span className="sr-only">
                Filter payouts by status
              </span>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value,
                  )
                }
                aria-label="Filter payouts by status"
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
            Loading seller payouts…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="finance-empty">
            <h3>
              {hasFilters
                ? "No matching payouts"
                : "No seller payouts"}
            </h3>

            <p>
              {hasFilters
                ? "No payout records match the current search and status filter."
                : "There are currently no seller payout records available."}
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
            <PayoutTable rows={paginatedRows} />

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
            <h2>Payout controls</h2>

            <p>
              Seller payouts should be reconciled against
              seller earnings, platform fees, refunds, and
              the underlying payout provider records.
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
              <strong>Payout reconciliation</strong>

              <small>
                Compare seller earnings with the payout
                amount before considering a payout settled.
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
              <strong>Seller settlement</strong>

              <small>
                Track amounts owed to sellers separately
                from amounts that have already been paid.
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
                Failed or rejected payouts should be
                investigated before retrying or making
                manual adjustments.
              </small>
            </span>
          </div>
        </div>
      </div>

      {currencies.length > 1 && (
        <div className="finance-alert">
          <span>
            Multiple currencies are present in the payout
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