import { useCallback, useEffect, useMemo, useState } from "react";
import { financeAdminApi } from "../api/financeAdminApi";
import type { CoinBalance } from "../types/finance.types";
import "../styles";
type SortKey = "userName" | "balance" | "purchased" | "spent" | "gifted";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 25;

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unable to load coin balances.";
}

export default function CoinsPage() {
  const [rows, setRows] = useState<CoinBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("balance");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const loadCoins = useCallback(async (isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await financeAdminApi.getCoins();

      if (!Array.isArray(data)) {
        throw new Error("The finance API returned an invalid coin balance response.");
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
    void loadCoins();
  }, [loadCoins]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = normalizedSearch
      ? rows.filter((row) =>
          String(row.userName ?? "")
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(row.userId ?? "")
            .toLowerCase()
            .includes(normalizedSearch),
        )
      : [...rows];

    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortKey === "userName") {
        comparison = String(a.userName ?? "").localeCompare(
          String(b.userName ?? ""),
          undefined,
          { sensitivity: "base" },
        );
      } else {
        comparison =
          Number(b[sortKey] ?? 0) - Number(a[sortKey] ?? 0);
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

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.balance += Number(row.balance ?? 0);
        acc.purchased += Number(row.purchased ?? 0);
        acc.spent += Number(row.spent ?? 0);
        acc.gifted += Number(row.gifted ?? 0);
        return acc;
      },
      {
        balance: 0,
        purchased: 0,
        spent: 0,
        gifted: 0,
      },
    );
  }, [rows]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc",
      );
      return;
    }

    setSortKey(key);
    setSortDirection(key === "userName" ? "asc" : "desc");
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  return (
    <section className="finance-page">
      <header className="finance-page-header">
        <div>
          <span>FOCKIS ADMIN CENTER</span>
          <h1>Coins</h1>
          <p>
            Monitor Fockis coin balances, purchases, spending, and gifting
            across the platform.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadCoins(true)}
          disabled={loading || refreshing}
          className="finance-button"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="finance-alert" role="alert">
          <strong>Unable to load coin balances.</strong>
          <span>{error}</span>

          <button
            type="button"
            onClick={() => void loadCoins(true)}
            disabled={refreshing}
          >
            Try again
          </button>
        </div>
      )}

      <div className="finance-stats-grid">
        <article className="finance-stat-card">
          <span>Total users</span>
          <strong>{formatNumber(rows.length)}</strong>
          <small>Users with coin balance records</small>
        </article>

        <article className="finance-stat-card">
          <span>Total balance</span>
          <strong>{formatNumber(totals.balance)}</strong>
          <small>Coins currently held by users</small>
        </article>

        <article className="finance-stat-card">
          <span>Total purchased</span>
          <strong>{formatNumber(totals.purchased)}</strong>
          <small>Coins purchased</small>
        </article>

        <article className="finance-stat-card">
          <span>Total spent</span>
          <strong>{formatNumber(totals.spent)}</strong>
          <small>Coins consumed</small>
        </article>

        <article className="finance-stat-card">
          <span>Total gifted</span>
          <strong>{formatNumber(totals.gifted)}</strong>
          <small>Coins used for gifting</small>
        </article>
      </div>

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Coin balances</h2>
            <p>
              {filteredRows.length.toLocaleString()} matching{" "}
              {filteredRows.length === 1 ? "record" : "records"}
              {search.trim() ? ` for "${search.trim()}"` : ""}.
            </p>
          </div>

          <div className="finance-toolbar">
            <label htmlFor="coin-search" className="finance-search">
              <span className="sr-only">Search users</span>
              <input
                id="coin-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search user or ID…"
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
            Loading coin balances…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="finance-empty">
            <h3>{search ? "No matching users" : "No coin balances"}</h3>
            <p>
              {search
                ? "Try a different user name or user ID."
                : "There are currently no coin balance records to display."}
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
                        onClick={() => handleSort("userName")}
                      >
                        User{sortIndicator("userName")}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        className="finance-sort-button"
                        onClick={() => handleSort("balance")}
                      >
                        Balance{sortIndicator("balance")}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        className="finance-sort-button"
                        onClick={() => handleSort("purchased")}
                      >
                        Purchased{sortIndicator("purchased")}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        className="finance-sort-button"
                        onClick={() => handleSort("spent")}
                      >
                        Spent{sortIndicator("spent")}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        className="finance-sort-button"
                        onClick={() => handleSort("gifted")}
                      >
                        Gifted{sortIndicator("gifted")}
                      </button>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRows.map((row) => (
                    <tr key={row.userId}>
                      <td>
                        <div className="finance-user-cell">
                          <strong>{row.userName || "Unknown user"}</strong>
                          <small>{row.userId}</small>
                        </div>
                      </td>

                      <td>
                        <strong>{formatNumber(row.balance)}</strong>
                      </td>

                      <td>{formatNumber(row.purchased)}</td>

                      <td>{formatNumber(row.spent)}</td>

                      <td>{formatNumber(row.gifted)}</td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    <td>
                      <strong>{formatNumber(totals.balance)}</strong>
                    </td>
                    <td>{formatNumber(totals.purchased)}</td>
                    <td>{formatNumber(totals.spent)}</td>
                    <td>{formatNumber(totals.gifted)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

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
                of <strong>{filteredRows.length}</strong>
              </div>

              <div className="finance-pagination-controls">
                <button
                  type="button"
                  className="finance-button finance-button-secondary"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
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
                      Math.min(totalPages, current + 1),
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