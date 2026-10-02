import { useCallback, useEffect, useMemo, useState } from "react";
import { financeAdminApi } from "../api/financeAdminApi";
import type { FinancialReport } from "../types/finance.types";

type SortKey =
  | "name"
  | "period"
  | "gross"
  | "fees"
  | "refunds"
  | "payouts"
  | "net";

type SortDirection = "asc" | "desc";

const PAGE_SIZE = 25;

function getMoneyAmount(
  value:
    | FinancialReport["gross"]
    | FinancialReport["fees"]
    | FinancialReport["refunds"]
    | FinancialReport["payouts"]
    | FinancialReport["net"],
) {
  return Number(value?.amount ?? 0);
}

function getCurrency(
  value:
    | FinancialReport["gross"]
    | FinancialReport["fees"]
    | FinancialReport["refunds"]
    | FinancialReport["payouts"]
    | FinancialReport["net"],
) {
  return value?.currency || "USD";
}

function formatMoney(
  value:
    | FinancialReport["gross"]
    | FinancialReport["fees"]
    | FinancialReport["refunds"]
    | FinancialReport["payouts"]
    | FinancialReport["net"],
) {
  const currency = getCurrency(value);
  const amount = getMoneyAmount(value);

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load financial reports.";
}

export default function FinancialReportsPage() {
  const [rows, setRows] = useState<FinancialReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("period");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const loadReports = useCallback(async (isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await financeAdminApi.getReports();

      if (!Array.isArray(data)) {
        throw new Error(
          "The finance API returned an invalid financial reports response.",
        );
      }

      setRows(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const currencies = useMemo(() => {
    const values = rows.flatMap((row) => [
      row.gross?.currency,
      row.fees?.currency,
      row.refunds?.currency,
      row.payouts?.currency,
      row.net?.currency,
    ]);

    return [...new Set(values.filter(Boolean))];
  }, [rows]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.gross += getMoneyAmount(row.gross);
        acc.fees += getMoneyAmount(row.fees);
        acc.refunds += getMoneyAmount(row.refunds);
        acc.payouts += getMoneyAmount(row.payouts);
        acc.net += getMoneyAmount(row.net);

        return acc;
      },
      {
        gross: 0,
        fees: 0,
        refunds: 0,
        payouts: 0,
        net: 0,
      },
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = query
      ? rows.filter((row) => {
          return (
            String(row.name ?? "")
              .toLowerCase()
              .includes(query) ||
            String(row.period ?? "")
              .toLowerCase()
              .includes(query) ||
            String(row.id ?? "")
              .toLowerCase()
              .includes(query)
          );
        })
      : [...rows];

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case "name":
          comparison = String(a.name ?? "").localeCompare(
            String(b.name ?? ""),
            undefined,
            { sensitivity: "base" },
          );
          break;

        case "period":
          comparison = String(a.period ?? "").localeCompare(
            String(b.period ?? ""),
            undefined,
            { numeric: true, sensitivity: "base" },
          );
          break;

        case "gross":
          comparison =
            getMoneyAmount(a.gross) -
            getMoneyAmount(b.gross);
          break;

        case "fees":
          comparison =
            getMoneyAmount(a.fees) -
            getMoneyAmount(b.fees);
          break;

        case "refunds":
          comparison =
            getMoneyAmount(a.refunds) -
            getMoneyAmount(b.refunds);
          break;

        case "payouts":
          comparison =
            getMoneyAmount(a.payouts) -
            getMoneyAmount(b.payouts);
          break;

        case "net":
          comparison =
            getMoneyAmount(a.net) -
            getMoneyAmount(b.net);
          break;
      }

      return sortDirection === "asc"
        ? comparison
        : -comparison;
    });

    return filtered;
  }, [rows, search, sortKey, sortDirection]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE),
  );

  const safePage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;

    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc",
      );
      return;
    }

    setSortKey(key);
    setSortDirection(
      key === "name" || key === "period"
        ? "asc"
        : "desc",
    );
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) {
      return "";
    }

    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  const formatTotal = (amount: number) => {
    if (currencies.length !== 1) {
      return amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencies[0] || "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return amount.toFixed(2);
    }
  };

  return (
    <section className="finance-page">
      <header className="finance-page-header">
        <div>
          <span>FOCKIS ADMIN CENTER</span>

          <h1>Financial Reports</h1>

          <p>
            Period-based financial summaries for administration,
            reporting, reconciliation, and financial review.
          </p>
        </div>

        <button
          type="button"
          className="finance-button"
          onClick={() => void loadReports(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="finance-alert" role="alert">
          <div>
            <strong>
              Financial reports could not be loaded.
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => void loadReports(true)}
            disabled={refreshing}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && (
        <div className="finance-stats-grid">
          <article className="finance-stat-card">
            <span>Reports</span>

            <strong>{rows.length.toLocaleString()}</strong>

            <small>
              Financial reporting periods available
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Gross revenue</span>

            <strong>{formatTotal(totals.gross)}</strong>

            <small>
              {currencies.length === 1
                ? currencies[0]
                : "Multiple currencies"}
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Platform fees</span>

            <strong>{formatTotal(totals.fees)}</strong>

            <small>Fees reported across all periods</small>
          </article>

          <article className="finance-stat-card">
            <span>Refunds</span>

            <strong>{formatTotal(totals.refunds)}</strong>

            <small>Refund value included in reports</small>
          </article>

          <article className="finance-stat-card">
            <span>Seller payouts</span>

            <strong>{formatTotal(totals.payouts)}</strong>

            <small>Payout value included in reports</small>
          </article>

          <article className="finance-stat-card">
            <span>Net revenue</span>

            <strong>{formatTotal(totals.net)}</strong>

            <small>Reported net financial value</small>
          </article>
        </div>
      )}

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Financial reports</h2>

            <p>
              {filteredRows.length.toLocaleString()} matching{" "}
              {filteredRows.length === 1
                ? "report"
                : "reports"}
              {search.trim()
                ? ` for "${search.trim()}"`
                : ""}
              .
            </p>
          </div>

          <div className="finance-toolbar">
            <label
              htmlFor="financial-report-search"
              className="finance-search"
            >
              <span className="sr-only">
                Search financial reports
              </span>

              <input
                id="financial-report-search"
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search report, period, or ID…"
                autoComplete="off"
              />
            </label>

            {search && (
              <button
                type="button"
                className="finance-button finance-button-secondary"
                onClick={() => setSearch("")}
              >
                Clear
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
            Loading financial reports…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="finance-empty">
            <h3>
              {search
                ? "No matching reports"
                : "No financial reports"}
            </h3>

            <p>
              {search
                ? "Try a different report name, period, or report ID."
                : "There are currently no financial reports available."}
            </p>

            {search && (
              <button
                type="button"
                className="finance-button"
                onClick={() => setSearch("")}
              >
                Clear search
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
                          handleSort("name")
                        }
                      >
                        Report
                        {sortIndicator("name")}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        className="finance-sort-button"
                        onClick={() =>
                          handleSort("period")
                        }
                      >
                        Period
                        {sortIndicator("period")}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        className="finance-sort-button"
                        onClick={() =>
                          handleSort("gross")
                        }
                      >
                        Gross
                        {sortIndicator("gross")}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        className="finance-sort-button"
                        onClick={() =>
                          handleSort("fees")
                        }
                      >
                        Fees
                        {sortIndicator("fees")}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        className="finance-sort-button"
                        onClick={() =>
                          handleSort("refunds")
                        }
                      >
                        Refunds
                        {sortIndicator("refunds")}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        className="finance-sort-button"
                        onClick={() =>
                          handleSort("payouts")
                        }
                      >
                        Payouts
                        {sortIndicator("payouts")}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        className="finance-sort-button"
                        onClick={() =>
                          handleSort("net")
                        }
                      >
                        Net
                        {sortIndicator("net")}
                      </button>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRows.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <div className="finance-user-cell">
                          <strong>
                            {report.name ||
                              "Unnamed report"}
                          </strong>

                          <small>{report.id}</small>
                        </div>
                      </td>

                      <td>{report.period || "—"}</td>

                      <td>{formatMoney(report.gross)}</td>

                      <td>{formatMoney(report.fees)}</td>

                      <td>{formatMoney(report.refunds)}</td>

                      <td>{formatMoney(report.payouts)}</td>

                      <td>
                        <strong>
                          {formatMoney(report.net)}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr>
                    <th scope="row">Total</th>

                    <td>
                      {rows.length.toLocaleString()} reports
                    </td>

                    <td>{formatTotal(totals.gross)}</td>

                    <td>{formatTotal(totals.fees)}</td>

                    <td>{formatTotal(totals.refunds)}</td>

                    <td>{formatTotal(totals.payouts)}</td>

                    <td>
                      <strong>
                        {formatTotal(totals.net)}
                      </strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {currencies.length > 1 && (
              <div className="finance-alert">
                <span>
                  Multiple currencies are present in these
                  reports. Aggregate totals are displayed as
                  numeric totals only and should not be treated
                  as a converted single-currency amount without
                  applying Fockis&apos; approved exchange-rate
                  policy.
                </span>
              </div>
            )}

            <div className="finance-pagination">
              <div>
                Showing{" "}
                <strong>
                  {(safePage - 1) * PAGE_SIZE + 1}
                </strong>{" "}
                –{" "}
                <strong>
                  {Math.min(
                    safePage * PAGE_SIZE,
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
                    setPage((current) =>
                      Math.max(1, current - 1),
                    )
                  }
                  disabled={safePage <= 1}
                >
                  Previous
                </button>

                <span>
                  Page <strong>{safePage}</strong> of{" "}
                  <strong>{totalPages}</strong>
                </span>

                <button
                  type="button"
                  className="finance-button finance-button-secondary"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(
                        totalPages,
                        current + 1,
                      ),
                    )
                  }
                  disabled={safePage >= totalPages}
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
            <h2>Report controls</h2>

            <p>
              Financial reports should be treated as
              reconciliation records. Use the underlying
              transactions, payments, refunds, and payouts to
              investigate discrepancies.
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
              <strong>Reconciliation</strong>
              <small>
                Compare reported revenue against payment,
                refund, fee, and payout records.
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
              <strong>Revenue review</strong>
              <small>
                Review gross revenue, fees, refunds, payouts,
                and reported net amounts by period.
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
              <strong>Discrepancy investigation</strong>
              <small>
                Investigate differences using the detailed
                Finance transaction records rather than
                modifying summary totals.
              </small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}