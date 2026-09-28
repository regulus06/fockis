import { useCallback, useEffect, useMemo, useState } from "react";
import { financeAdminApi } from "../api/financeAdminApi";
import type { Invoice } from "../types/finance.types";

type SortKey =
  | "invoiceNumber"
  | "customerName"
  | "source"
  | "amount"
  | "status";

type SortDirection = "asc" | "desc";

const PAGE_SIZE = 25;

function getAmount(invoice: Invoice) {
  return Number(invoice.amount?.amount ?? 0);
}

function getCurrency(invoice: Invoice) {
  return invoice.amount?.currency || "USD";
}

function formatAmount(invoice: Invoice) {
  const amount = getAmount(invoice);
  const currency = getCurrency(invoice);

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

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load invoices.";
}

function normalizeStatus(status: unknown) {
  return String(status ?? "unknown")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
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
    normalized.includes("open") ||
    normalized.includes("processing")
  ) {
    return "finance-status-badge finance-status-badge--warning";
  }

  if (
    normalized.includes("failed") ||
    normalized.includes("void") ||
    normalized.includes("cancel") ||
    normalized.includes("uncollect")
  ) {
    return "finance-status-badge finance-status-badge--danger";
  }

  return "finance-status-badge";
}

export default function InvoicesPage() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const [sortKey, setSortKey] =
    useState<SortKey>("invoiceNumber");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");

  const [page, setPage] = useState(1);

  const loadInvoices = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const data = await financeAdminApi.getInvoices();

        if (!Array.isArray(data)) {
          throw new Error(
            "The finance API returned an invalid invoices response.",
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
    void loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sourceFilter]);

  const statusOptions = useMemo(() => {
    const values = rows.map((invoice) =>
      String(invoice.status ?? "")
        .trim()
        .toLowerCase(),
    );

    return [...new Set(values.filter(Boolean))].sort();
  }, [rows]);

  const sourceOptions = useMemo(() => {
    const values = rows.map((invoice) =>
      String(invoice.source ?? "").trim(),
    );

    return [...new Set(values.filter(Boolean))].sort(
      (a, b) =>
        a.localeCompare(b, undefined, {
          sensitivity: "base",
        }),
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = rows.filter((invoice) => {
      const customerName = String(
        invoice.customerName ?? "",
      ).toLowerCase();

      const invoiceNumber = String(
        invoice.invoiceNumber ?? "",
      ).toLowerCase();

      const source = String(
        invoice.source ?? "",
      ).toLowerCase();

      const id = String(invoice.id ?? "").toLowerCase();

      const status = String(
        invoice.status ?? "",
      ).toLowerCase();

      const matchesSearch =
        !query ||
        invoiceNumber.includes(query) ||
        customerName.includes(query) ||
        source.includes(query) ||
        status.includes(query) ||
        id.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        status === statusFilter;

      const matchesSource =
        sourceFilter === "all" ||
        String(invoice.source ?? "").trim() ===
          sourceFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSource
      );
    });

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case "invoiceNumber":
          comparison = String(
            a.invoiceNumber ?? "",
          ).localeCompare(
            String(b.invoiceNumber ?? ""),
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            },
          );
          break;

        case "customerName":
          comparison = String(
            a.customerName ?? "",
          ).localeCompare(
            String(b.customerName ?? ""),
            undefined,
            {
              sensitivity: "base",
            },
          );
          break;

        case "source":
          comparison = String(
            a.source ?? "",
          ).localeCompare(
            String(b.source ?? ""),
            undefined,
            {
              sensitivity: "base",
            },
          );
          break;

        case "amount":
          comparison =
            getAmount(a) - getAmount(b);
          break;

        case "status":
          comparison = String(
            a.status ?? "",
          ).localeCompare(
            String(b.status ?? ""),
            undefined,
            {
              sensitivity: "base",
            },
          );
          break;
      }

      return sortDirection === "asc"
        ? comparison
        : -comparison;
    });

    return filtered;
  }, [
    rows,
    search,
    statusFilter,
    sourceFilter,
    sortKey,
    sortDirection,
  ]);

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

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, invoice) => {
        acc.totalAmount += getAmount(invoice);

        const status = normalizeStatus(
          invoice.status,
        );

        if (
          status.includes("paid") ||
          status.includes("complete") ||
          status.includes("success")
        ) {
          acc.paid += 1;
        }

        if (
          status.includes("pending") ||
          status.includes("open") ||
          status.includes("processing")
        ) {
          acc.pending += 1;
        }

        if (
          status.includes("failed") ||
          status.includes("void") ||
          status.includes("cancel")
        ) {
          acc.problem += 1;
        }

        return acc;
      },
      {
        totalAmount: 0,
        paid: 0,
        pending: 0,
        problem: 0,
      },
    );
  }, [rows]);

  const currencies = useMemo(() => {
    return [
      ...new Set(
        rows
          .map((invoice) => invoice.amount?.currency)
          .filter(Boolean),
      ),
    ];
  }, [rows]);

  const formatTotal = (amount: number) => {
    if (currencies.length !== 1) {
      return formatNumber(amount);
    }

    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencies[0] || "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return formatNumber(amount);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc",
      );
      return;
    }

    setSortKey(key);

    setSortDirection(
      key === "customerName" ||
        key === "source" ||
        key === "status"
        ? "asc"
        : "desc",
    );
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) {
      return "";
    }

    return sortDirection === "asc"
      ? " ↑"
      : " ↓";
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSourceFilter("all");
    setPage(1);
  };

  const hasFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    sourceFilter !== "all";

  return (
    <section className="finance-page">
      <header className="finance-page-header">
        <div>
          <span>FOCKIS ADMIN CENTER</span>

          <h1>Invoices</h1>

          <p>
            Manage invoices generated by Fockis services
            and review their billing status and financial
            value.
          </p>
        </div>

        <button
          type="button"
          className="finance-button"
          onClick={() =>
            void loadInvoices(true)
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
              Invoices could not be loaded.
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadInvoices(true)
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
            <span>Total invoices</span>

            <strong>
              {rows.length.toLocaleString()}
            </strong>

            <small>
              Invoice records returned by Finance
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Total billed</span>

            <strong>
              {formatTotal(
                totals.totalAmount,
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
              {totals.paid.toLocaleString()}
            </strong>

            <small>
              Completed or successfully paid invoices
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Pending</span>

            <strong>
              {totals.pending.toLocaleString()}
            </strong>

            <small>
              Open, pending, or processing invoices
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Attention</span>

            <strong>
              {totals.problem.toLocaleString()}
            </strong>

            <small>
              Failed, void, or cancelled records
            </small>
          </article>
        </div>
      )}

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Invoice records</h2>

            <p>
              {filteredRows.length.toLocaleString()} matching{" "}
              {filteredRows.length === 1
                ? "invoice"
                : "invoices"}
              {hasFilters
                ? " with the current filters"
                : ""}
              .
            </p>
          </div>

          <div className="finance-toolbar">
            <label
              htmlFor="invoice-search"
              className="finance-search"
            >
              <span className="sr-only">
                Search invoices
              </span>

              <input
                id="invoice-search"
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search invoice, customer, source, or ID…"
                autoComplete="off"
              />
            </label>
          </div>
        </div>

        <div className="finance-toolbar">
          <label>
            <span className="sr-only">
              Filter by status
            </span>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
              aria-label="Filter invoices by status"
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

          <label>
            <span className="sr-only">
              Filter by source
            </span>

            <select
              value={sourceFilter}
              onChange={(event) =>
                setSourceFilter(
                  event.target.value,
                )
              }
              aria-label="Filter invoices by source"
            >
              <option value="all">
                All sources
              </option>

              {sourceOptions.map(
                (source) => (
                  <option
                    key={source}
                    value={source}
                  >
                    {source}
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

        {loading ? (
          <div
            className="finance-loading"
            role="status"
            aria-live="polite"
          >
            Loading invoices…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="finance-empty">
            <h3>
              {hasFilters
                ? "No matching invoices"
                : "No invoices"}
            </h3>

            <p>
              {hasFilters
                ? "No invoices match the current search and filters."
                : "There are currently no invoice records available."}
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
            <div className="finance-table-wrap">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th scope="col">
                      <button
                        type="button"
                        className="finance-sort-button"
                        onClick={() =>
                          handleSort(
                            "invoiceNumber",
                          )
                        }
                      >
                        Invoice
                        {sortIndicator(
                          "invoiceNumber",
                        )}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        className="finance-sort-button"
                        onClick={() =>
                          handleSort(
                            "customerName",
                          )
                        }
                      >
                        Customer
                        {sortIndicator(
                          "customerName",
                        )}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        className="finance-sort-button"
                        onClick={() =>
                          handleSort(
                            "source",
                          )
                        }
                      >
                        Source
                        {sortIndicator(
                          "source",
                        )}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        className="finance-sort-button"
                        onClick={() =>
                          handleSort("amount")
                        }
                      >
                        Amount
                        {sortIndicator(
                          "amount",
                        )}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        className="finance-sort-button"
                        onClick={() =>
                          handleSort("status")
                        }
                      >
                        Status
                        {sortIndicator(
                          "status",
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRows.map(
                    (invoice) => (
                      <tr
                        key={invoice.id}
                      >
                        <td>
                          <div className="finance-user-cell">
                            <strong>
                              {invoice.invoiceNumber ||
                                "—"}
                            </strong>

                            <small>
                              {invoice.id}
                            </small>
                          </div>
                        </td>

                        <td>
                          {invoice.customerName ||
                            "—"}
                        </td>

                        <td>
                          {invoice.source ||
                            "—"}
                        </td>

                        <td>
                          <strong>
                            {formatAmount(
                              invoice,
                            )}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={getStatusClass(
                              invoice.status,
                            )}
                          >
                            {String(
                              invoice.status ??
                                "Unknown",
                            )
                              .replace(
                                /[_-]+/g,
                                " ",
                              )
                              .replace(
                                /\b\w/g,
                                (char) =>
                                  char.toUpperCase(),
                              )}
                          </span>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>

                <tfoot>
                  <tr>
                    <th scope="row">
                      Total
                    </th>

                    <td>
                      {rows.length.toLocaleString()}{" "}
                      invoices
                    </td>

                    <td>—</td>

                    <td>
                      <strong>
                        {formatTotal(
                          totals.totalAmount,
                        )}
                      </strong>
                    </td>

                    <td>—</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {currencies.length > 1 && (
              <div className="finance-alert">
                <span>
                  Multiple currencies are present in
                  these invoices. The displayed total is
                  a raw aggregate and must not be treated
                  as a converted single-currency total
                  without applying Fockis&apos; approved
                  exchange-rate policy.
                </span>
              </div>
            )}

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
            <h2>Invoice operations</h2>

            <p>
              Invoice records should remain traceable to
              their underlying financial transactions and
              billing events.
            </p>
          </div>
        </div>

        <div className="finance-dashboard-operations">
          <div className="finance-dashboard-operation">
            <span
              className="finance-dashboard-operation__icon"
              aria-hidden="true"
            >
              #
            </span>

            <span>
              <strong>Invoice traceability</strong>

              <small>
                Every invoice should have a stable invoice
                number and internal record ID for
                reconciliation.
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
              <strong>Payment reconciliation</strong>

              <small>
                Compare invoice amounts with the associated
                payment and transaction records when
                investigating discrepancies.
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
              <strong>Status monitoring</strong>

              <small>
                Failed, cancelled, void, or unresolved
                invoices should be reviewed against their
                underlying billing events.
              </small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}