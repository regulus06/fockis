import { useCallback, useEffect, useMemo, useState } from "react";

import { financeAdminApi } from "../api/financeAdminApi";
import type { FinanceTransaction } from "../types/finance.types";
import TransactionTable from "../components/TransactionTable";

const PAGE_SIZE = 25;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load financial transactions.";
}

function getTransactionStatus(
  transaction: FinanceTransaction,
) {
  const value = transaction as FinanceTransaction & {
    status?: string;
  };

  return String(value.status ?? "").toLowerCase();
}

function getTransactionType(
  transaction: FinanceTransaction,
) {
  const value = transaction as FinanceTransaction & {
    type?: string;
  };

  return String(value.type ?? "").toLowerCase();
}

function getSearchText(
  transaction: FinanceTransaction,
) {
  /*
   * Keep search defensive because FinanceTransaction can
   * evolve as additional payment providers and financial
   * sources are added.
   */
  try {
    return JSON.stringify(transaction).toLowerCase();
  } catch {
    return "";
  }
}

function formatStatus(status: string) {
  if (!status) {
    return "Unknown";
  }

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function getStatusClass(status: string) {
  switch (status) {
    case "succeeded":
    case "successful":
    case "completed":
    case "paid":
      return "finance-status-badge finance-status-badge--success";

    case "pending":
    case "processing":
    case "requires_action":
      return "finance-status-badge finance-status-badge--warning";

    case "failed":
    case "canceled":
    case "cancelled":
    case "refunded":
      return "finance-status-badge finance-status-badge--danger";

    default:
      return "finance-status-badge";
  }
}

export default function TransactionsPage() {
  const [rows, setRows] = useState<
    FinanceTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");
  const [typeFilter, setTypeFilter] =
    useState("all");

  const [page, setPage] = useState(1);

  const loadTransactions = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response =
          await financeAdminApi.getTransactions();

        if (!Array.isArray(response)) {
          throw new Error(
            "The Finance service returned an invalid transactions response.",
          );
        }

        setRows(response);
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
    void loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter]);

  const statuses = useMemo(() => {
    return [
      ...new Set(
        rows
          .map(getTransactionStatus)
          .filter(Boolean),
      ),
    ].sort();
  }, [rows]);

  const types = useMemo(() => {
    return [
      ...new Set(
        rows
          .map(getTransactionType)
          .filter(Boolean),
      ),
    ].sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return rows.filter((transaction) => {
      const status =
        getTransactionStatus(transaction);

      const type =
        getTransactionType(transaction);

      const matchesStatus =
        statusFilter === "all" ||
        status === statusFilter;

      const matchesType =
        typeFilter === "all" ||
        type === typeFilter;

      if (
        !matchesStatus ||
        !matchesType
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return getSearchText(
        transaction,
      ).includes(query);
    });
  }, [
    rows,
    search,
    statusFilter,
    typeFilter,
  ]);

  const pageCount = Math.max(
    1,
    Math.ceil(
      filteredRows.length / PAGE_SIZE,
    ),
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
    let successful = 0;
    let pending = 0;
    let failed = 0;
    let refunded = 0;

    for (const transaction of rows) {
      const status =
        getTransactionStatus(
          transaction,
        );

      if (
        status === "succeeded" ||
        status === "successful" ||
        status === "completed" ||
        status === "paid"
      ) {
        successful += 1;
      }

      if (
        status === "pending" ||
        status === "processing" ||
        status === "requires_action"
      ) {
        pending += 1;
      }

      if (status === "failed") {
        failed += 1;
      }

      if (
        status === "refunded"
      ) {
        refunded += 1;
      }
    }

    return {
      total: rows.length,
      successful,
      pending,
      failed,
      refunded,
    };
  }, [rows]);

  const showingFrom =
    filteredRows.length === 0
      ? 0
      : (currentPage - 1) *
          PAGE_SIZE +
        1;

  const showingTo = Math.min(
    currentPage * PAGE_SIZE,
    filteredRows.length,
  );

  return (
    <section className="finance-page">
      <header className="finance-page-header">
        <div>
          <span>FOCKIS ADMIN CENTER</span>

          <h1>Transactions</h1>

          <p>
            Review financial movements across Fockis,
            including payments, fees, refunds, wallet
            activity, subscriptions, and payouts.
          </p>
        </div>

        <div className="finance-page-header__actions">
          <button
            type="button"
            className="finance-button"
            onClick={() =>
              void loadTransactions(true)
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
              Transaction data could not be loaded.
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadTransactions(true)
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
            <span>Total transactions</span>

            <strong>
              {summary.total.toLocaleString()}
            </strong>

            <small>
              Financial records returned by Finance
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Successful</span>

            <strong>
              {summary.successful.toLocaleString()}
            </strong>

            <small>
              Completed or successfully settled
              transactions
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Pending</span>

            <strong>
              {summary.pending.toLocaleString()}
            </strong>

            <small>
              Transactions requiring settlement or
              processing
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Failed</span>

            <strong>
              {summary.failed.toLocaleString()}
            </strong>

            <small>
              Transactions that did not complete
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Refunded</span>

            <strong>
              {summary.refunded.toLocaleString()}
            </strong>

            <small>
              Transactions marked as refunded
            </small>
          </article>
        </div>
      )}

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Financial activity</h2>

            <p>
              Search and filter the Finance transaction
              ledger before reviewing individual records.
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
              Search transactions
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search transaction, order, user, provider ID…"
              aria-label="Search transactions"
            />
          </label>

          <label>
            <span className="sr-only">
              Filter by transaction status
            </span>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
              aria-label="Filter transactions by status"
            >
              <option value="all">
                All statuses
              </option>

              {statuses.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">
              Filter by transaction type
            </span>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value,
                )
              }
              aria-label="Filter transactions by type"
            >
              <option value="all">
                All transaction types
              </option>

              {types.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {formatStatus(type)}
                </option>
              ))}
            </select>
          </label>

          {(search ||
            statusFilter !== "all" ||
            typeFilter !== "all") && (
            <button
              type="button"
              className="finance-button finance-button-secondary"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setTypeFilter("all");
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
            Loading transactions…
          </div>
        ) : paginatedRows.length === 0 ? (
          <div className="finance-empty">
            <h3>
              {rows.length === 0
                ? "No transactions"
                : "No matching transactions"}
            </h3>

            <p>
              {rows.length === 0
                ? "The Finance service has not returned any transaction records."
                : "Try changing the search or filters to find the transaction you need."}
            </p>

            {rows.length === 0 && (
              <button
                type="button"
                className="finance-button"
                onClick={() =>
                  void loadTransactions(
                    true,
                  )
                }
              >
                Refresh transactions
              </button>
            )}
          </div>
        ) : (
          <>
            <TransactionTable
              rows={paginatedRows}
            />

            <div
              className="finance-pagination"
              aria-label="Transaction pagination"
            >
              <span>
                Showing{" "}
                {showingFrom.toLocaleString()}–
                {showingTo.toLocaleString()} of{" "}
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
            <h2>Transaction operations</h2>

            <p>
              Use the transaction ledger as the starting
              point for payment, refund, payout, and
              reconciliation investigations.
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
              <strong>
                Payment reconciliation
              </strong>

              <small>
                Trace customer payments back to the
                originating order and payment provider
                record.
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
              <strong>
                Refund reconciliation
              </strong>

              <small>
                Confirm refunds remain linked to the
                original financial transaction.
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
              <strong>
                Fee tracking
              </strong>

              <small>
                Keep platform and payment-processing fees
                separately traceable from transaction
                amounts.
              </small>
            </span>
          </div>

          <div className="finance-dashboard-operation">
            <span
              className="finance-dashboard-operation__icon"
              aria-hidden="true"
            >
              ✓
            </span>

            <span>
              <strong>
                Audit and reconciliation
              </strong>

              <small>
                Financial changes should remain
                attributable to their underlying records
                and authorized administrative actions.
              </small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}