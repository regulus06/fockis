import { useCallback, useEffect, useMemo, useState } from "react";
import { financeAdminApi } from "../api/financeAdminApi";
import type { FeeSummary } from "../types/finance.types";

type SortKey =
  | "source"
  | "transactionCount"
  | "gross"
  | "fees"
  | "net";

type SortDirection = "asc" | "desc";

const PAGE_SIZE = 25;

function formatAmount(
  money: FeeSummary["gross"] | FeeSummary["fees"] | FeeSummary["net"],
) {
  const currency = money?.currency || "USD";
  const amount = Number(money?.amount ?? 0);

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getAmount(
  money: FeeSummary["gross"] | FeeSummary["fees"] | FeeSummary["net"],
) {
  return Number(money?.amount ?? 0);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load fee information.";
}

export default function FeesPage() {
  const [rows, setRows] = useState<FeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("fees");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const loadFees = useCallback(async (isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await financeAdminApi.getFees();

      if (!Array.isArray(data)) {
        throw new Error(
          "The finance API returned an invalid fee summary response.",
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
    void loadFees();
  }, [loadFees]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.transactionCount += Number(row.transactionCount ?? 0);
        acc.gross += getAmount(row.gross);
        acc.fees += getAmount(row.fees);
        acc.net += getAmount(row.net);

        return acc;
      },
      {
        transactionCount: 0,
        gross: 0,
        fees: 0,
        net: 0,
      },
    );
  }, [rows]);

  const currencies = useMemo(() => {
    const values = rows.flatMap((row) => [
      row.gross?.currency,
      row.fees?.currency,
      row.net?.currency,
    ]);

    return [...new Set(values.filter(Boolean))];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = query
      ? rows.filter((row) =>
          String(row.source ?? "")
            .toLowerCase()
            .includes(query),
        )
      : [...rows];

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case "source":
          comparison = String(a.source ?? "").localeCompare(
            String(b.source ?? ""),
            undefined,
            { sensitivity: "base" },
          );
          break;

        case "transactionCount":
          comparison =
            Number(a.transactionCount ?? 0) -
            Number(b.transactionCount ?? 0);
          break;

        case "gross":
          comparison = getAmount(a.gross) - getAmount(b.gross);
          break;

        case "fees":
          comparison = getAmount(a.fees) - getAmount(b.fees);
          break;

        case "net":
          comparison = getAmount(a.net) - getAmount(b.net);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
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

  const effectiveFeeRate =
    totals.gross > 0 ? (totals.fees / totals.gross) * 100 : 0;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc",
      );
      return;
    }

    setSortKey(key);
    setSortDirection(key === "source" ? "asc" : "desc");
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) {
      return "";
    }

    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  return (
    <section className="finance-page">
      <header className="finance-page-header">
        <div>
          <span>FOCKIS ADMIN CENTER</span>
          <h1>Fees</h1>
          <p>
            Monitor Fockis platform fees and net revenue by
            revenue source.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadFees(true)}
          disabled={loading || refreshing}
          className="finance-button"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="finance-alert" role="alert">
          <div>
            <strong>Unable to load fee information.</strong>
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => void loadFees(true)}
            disabled={refreshing}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && (
        <div className="finance-stats-grid">
          <article className="finance-stat-card">
            <span>Revenue sources</span>
            <strong>{rows.length.toLocaleString()}</strong>
            <small>Sources currently reported by Finance</small>
          </article>

          <article className="finance-stat-card">
            <span>Transactions</span>
            <strong>
              {totals.transactionCount.toLocaleString()}
            </strong>
            <small>Transactions included in this summary</small>
          </article>

          <article className="finance-stat-card">
            <span>Gross revenue</span>
            <strong>
              {currencies.length === 1
                ? new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: currencies[0] || "USD",
                  }).format(totals.gross)
                : totals.gross.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
            </strong>
            <small>
              {currencies.length === 1
                ? currencies[0]
                : "Multiple currencies"}
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Platform fees</span>
            <strong>
              {currencies.length === 1
                ? new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: currencies[0] || "USD",
                  }).format(totals.fees)
                : totals.fees.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
            </strong>
            <small>
              Effective fee rate{" "}
              {effectiveFeeRate.toFixed(2)}%
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Net revenue</span>
            <strong>
              {currencies.length === 1
                ? new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: currencies[0] || "USD",
                  }).format(totals.net)
                : totals.net.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
            </strong>
            <small>Gross revenue less reported fees</small>
          </article>
        </div>
      )}

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Fee summary</h2>
            <p>
              {filteredRows.length.toLocaleString()} matching{" "}
              {filteredRows.length === 1 ? "source" : "sources"}
              {search.trim()
                ? ` for "${search.trim()}"`
                : ""}
              .
            </p>
          </div>

          <div className="finance-toolbar">
            <label
              htmlFor="fee-search"
              className="finance-search"
            >
              <span className="sr-only">
                Search revenue sources
              </span>

              <input
                id="fee-search"
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search source…"
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
          <div className="finance-loading" role="status">
            Loading fee summary…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="finance-empty">
            <h3>
              {search
                ? "No matching revenue sources"
                : "No fee data"}
            </h3>

            <p>
              {search
                ? "Try a different source name."
                : "There are currently no fee summary records to display."}
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
                          handleSort("source")
                        }
                      >
                        Source
                        {sortIndicator("source")}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        className="finance-sort-button"
                        onClick={() =>
                          handleSort("transactionCount")
                        }
                      >
                        Transactions
                        {sortIndicator(
                          "transactionCount",
                        )}
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
                  {paginatedRows.map((row) => (
                    <tr key={row.source}>
                      <td>
                        <strong>
                          {row.source || "Unknown source"}
                        </strong>
                      </td>

                      <td>
                        {Number(
                          row.transactionCount ?? 0,
                        ).toLocaleString()}
                      </td>

                      <td>{formatAmount(row.gross)}</td>

                      <td>
                        <strong>
                          {formatAmount(row.fees)}
                        </strong>
                      </td>

                      <td>{formatAmount(row.net)}</td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr>
                    <th scope="row">Total</th>

                    <td>
                      {totals.transactionCount.toLocaleString()}
                    </td>

                    <td>
                      {currencies.length === 1
                        ? new Intl.NumberFormat(
                            undefined,
                            {
                              style: "currency",
                              currency:
                                currencies[0] || "USD",
                            },
                          ).format(totals.gross)
                        : "—"}
                    </td>

                    <td>
                      {currencies.length === 1
                        ? new Intl.NumberFormat(
                            undefined,
                            {
                              style: "currency",
                              currency:
                                currencies[0] || "USD",
                            },
                          ).format(totals.fees)
                        : "—"}
                    </td>

                    <td>
                      {currencies.length === 1
                        ? new Intl.NumberFormat(
                            undefined,
                            {
                              style: "currency",
                              currency:
                                currencies[0] || "USD",
                            },
                          ).format(totals.net)
                        : "—"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {currencies.length > 1 && (
              <div className="finance-alert">
                <span>
                  Multiple currencies are present. Totals are
                  displayed separately by source because combining
                  currencies without an exchange-rate policy would
                  produce misleading figures.
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
    </section>
  );
}