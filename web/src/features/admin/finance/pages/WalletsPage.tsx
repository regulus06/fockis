import { useCallback, useEffect, useMemo, useState } from "react";
import { financeAdminApi } from "../api/financeAdminApi";
import type { Wallet } from "../types/finance.types";

type WalletView = Wallet & {
  ownerId?: string;
  ownerType?: string;
  currency?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

const PAGE_SIZE = 25;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load wallets.";
}

function getWalletType(wallet: WalletView) {
  return String(
    wallet.type ?? wallet.ownerType ?? "",
  ).toLowerCase();
}

function getWalletStatus(wallet: WalletView) {
  return String(wallet.status ?? "").toLowerCase();
}

function getOwnerName(wallet: WalletView) {
  return (
    wallet.ownerName ||
    wallet.ownerId ||
    "Unknown owner"
  );
}

function getOwnerSearchText(wallet: WalletView) {
  return [
    wallet.ownerName,
    wallet.ownerId,
    wallet.type,
    wallet.ownerType,
    wallet.status,
    wallet.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getMoneyValue(
  money:
    | {
        amount?: number;
        currency?: string;
      }
    | undefined,
) {
  return {
    amount: Number(money?.amount ?? 0),
    currency: String(
      money?.currency || "USD",
    ).toUpperCase(),
  };
}

function formatMoney(
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

function formatLabel(value: string) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function getStatusClass(status: string) {
  switch (status) {
    case "active":
    case "enabled":
      return "finance-status-badge finance-status-badge--success";

    case "pending":
    case "processing":
      return "finance-status-badge finance-status-badge--warning";

    case "frozen":
    case "suspended":
    case "disabled":
    case "closed":
      return "finance-status-badge finance-status-badge--danger";

    default:
      return "finance-status-badge";
  }
}

export default function WalletsPage() {
  const [rows, setRows] = useState<WalletView[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] =
    useState("all");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [page, setPage] = useState(1);

  const loadWallets = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response =
          await financeAdminApi.getWallets();

        if (!Array.isArray(response)) {
          throw new Error(
            "The Finance service returned an invalid wallets response.",
          );
        }

        setRows(response as WalletView[]);
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
    void loadWallets();
  }, [loadWallets]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter]);

  const walletTypes = useMemo(() => {
    return [
      ...new Set(
        rows
          .map(getWalletType)
          .filter(Boolean),
      ),
    ].sort();
  }, [rows]);

  const walletStatuses = useMemo(() => {
    return [
      ...new Set(
        rows
          .map(getWalletStatus)
          .filter(Boolean),
      ),
    ].sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return rows.filter((wallet) => {
      const type = getWalletType(wallet);
      const status = getWalletStatus(wallet);

      const matchesType =
        typeFilter === "all" ||
        type === typeFilter;

      const matchesStatus =
        statusFilter === "all" ||
        status === statusFilter;

      if (!matchesType || !matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return getOwnerSearchText(wallet).includes(
        query,
      );
    });
  }, [
    rows,
    search,
    typeFilter,
    statusFilter,
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
    let availableTotal = 0;
    let pendingTotal = 0;

    let active = 0;
    let frozen = 0;
    let suspended = 0;

    const currencies = new Set<string>();

    for (const wallet of rows) {
      const available = getMoneyValue(
        wallet.available,
      );

      const pending = getMoneyValue(
        wallet.pending,
      );

      currencies.add(available.currency);
      currencies.add(pending.currency);

      availableTotal += available.amount;
      pendingTotal += pending.amount;

      const status =
        getWalletStatus(wallet);

      if (
        status === "active" ||
        status === "enabled"
      ) {
        active += 1;
      }

      if (status === "frozen") {
        frozen += 1;
      }

      if (status === "suspended") {
        suspended += 1;
      }
    }

    return {
      total: rows.length,
      active,
      frozen,
      suspended,
      availableTotal,
      pendingTotal,
      currencies: [...currencies],
    };
  }, [rows]);

  const currency =
    summary.currencies.length === 1
      ? summary.currencies[0]
      : "USD";

  const availableFormatted =
    summary.currencies.length === 1
      ? formatMoney(
          summary.availableTotal,
          currency,
        )
      : summary.availableTotal.toLocaleString(
          undefined,
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        );

  const pendingFormatted =
    summary.currencies.length === 1
      ? formatMoney(
          summary.pendingTotal,
          currency,
        )
      : summary.pendingTotal.toLocaleString(
          undefined,
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        );

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

          <h1>Wallets</h1>

          <p>
            Monitor user, seller, creator, and business
            wallet balances, pending funds, and wallet
            status.
          </p>
        </div>

        <div className="finance-page-header__actions">
          <button
            type="button"
            className="finance-button"
            onClick={() =>
              void loadWallets(true)
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
              Wallet data could not be loaded.
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadWallets(true)
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
            <span>Total wallets</span>

            <strong>
              {summary.total.toLocaleString()}
            </strong>

            <small>
              Wallet records returned by Finance
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Active wallets</span>

            <strong>
              {summary.active.toLocaleString()}
            </strong>

            <small>
              Wallets currently available for normal
              activity
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Available balance</span>

            <strong>
              {availableFormatted}
            </strong>

            <small>
              Raw available balance across returned
              wallets
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Pending balance</span>

            <strong>
              {pendingFormatted}
            </strong>

            <small>
              Funds not yet available for withdrawal or
              settlement
            </small>
          </article>

          <article className="finance-stat-card">
            <span>Restricted wallets</span>

            <strong>
              {(
                summary.frozen +
                summary.suspended
              ).toLocaleString()}
            </strong>

            <small>
              Frozen or suspended wallets
            </small>
          </article>
        </div>
      )}

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Wallet ledger</h2>

            <p>
              Search wallet owners and review available,
              pending, and operational status information.
            </p>
          </div>

          {!loading && (
            <span className="finance-panel-status">
              {filteredRows.length.toLocaleString()}{" "}
              {filteredRows.length === 1
                ? "wallet"
                : "wallets"}
            </span>
          )}
        </div>

        <div className="finance-toolbar">
          <label className="finance-search">
            <span className="sr-only">
              Search wallets
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search owner, wallet ID, type…"
              aria-label="Search wallets"
            />
          </label>

          <label>
            <span className="sr-only">
              Filter by wallet type
            </span>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value,
                )
              }
              aria-label="Filter wallets by type"
            >
              <option value="all">
                All wallet types
              </option>

              {walletTypes.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {formatLabel(type)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">
              Filter by wallet status
            </span>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
              aria-label="Filter wallets by status"
            >
              <option value="all">
                All statuses
              </option>

              {walletStatuses.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {formatLabel(status)}
                  </option>
                ),
              )}
            </select>
          </label>

          {(search ||
            typeFilter !== "all" ||
            statusFilter !== "all") && (
            <button
              type="button"
              className="finance-button finance-button-secondary"
              onClick={() => {
                setSearch("");
                setTypeFilter("all");
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
            Loading wallets…
          </div>
        ) : paginatedRows.length === 0 ? (
          <div className="finance-empty">
            <h3>
              {rows.length === 0
                ? "No wallet records"
                : "No matching wallets"}
            </h3>

            <p>
              {rows.length === 0
                ? "The Finance service has not returned any wallet records."
                : "Try changing the search or wallet filters."}
            </p>

            {rows.length === 0 && (
              <button
                type="button"
                className="finance-button"
                onClick={() =>
                  void loadWallets(
                    true,
                  )
                }
              >
                Refresh wallets
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
                      Owner
                    </th>

                    <th scope="col">
                      Type
                    </th>

                    <th scope="col">
                      Available
                    </th>

                    <th scope="col">
                      Pending
                    </th>

                    <th scope="col">
                      Status
                    </th>

                    <th scope="col">
                      Wallet ID
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRows.map(
                    (wallet) => {
                      const status =
                        getWalletStatus(
                          wallet,
                        );

                      const available =
                        getMoneyValue(
                          wallet.available,
                        );

                      const pending =
                        getMoneyValue(
                          wallet.pending,
                        );

                      return (
                        <tr
                          key={wallet.id}
                        >
                          <td>
                            <div>
                              <strong>
                                {getOwnerName(
                                  wallet,
                                )}
                              </strong>

                              {wallet.ownerId && (
                                <small>
                                  {wallet.ownerId}
                                </small>
                              )}
                            </div>
                          </td>

                          <td>
                            {formatLabel(
                              getWalletType(
                                wallet,
                              ),
                            )}
                          </td>

                          <td>
                            {formatMoney(
                              available.amount,
                              available.currency,
                            )}
                          </td>

                          <td>
                            {formatMoney(
                              pending.amount,
                              pending.currency,
                            )}
                          </td>

                          <td>
                            <span
                              className={getStatusClass(
                                status,
                              )}
                            >
                              {formatLabel(
                                status,
                              )}
                            </span>
                          </td>

                          <td>
                            <code>
                              {wallet.id}
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
              aria-label="Wallet pagination"
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
            <h2>Wallet operations</h2>

            <p>
              Wallet balances should remain traceable to
              their underlying financial transactions and
              authorized adjustments.
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
                Available balance
              </strong>

              <small>
                Funds currently available to the wallet
                owner according to the Finance service.
              </small>
            </span>
          </div>

          <div className="finance-dashboard-operation">
            <span
              className="finance-dashboard-operation__icon"
              aria-hidden="true"
            >
              …
            </span>

            <span>
              <strong>
                Pending balance
              </strong>

              <small>
                Funds that have not completed the
                applicable settlement or release process.
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
                Wallet reconciliation
              </strong>

              <small>
                Balance changes should reconcile with
                deposits, purchases, payouts, refunds,
                transfers, and adjustments.
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
                Restricted wallets
              </strong>

              <small>
                Frozen or suspended wallets should be
                investigated using the underlying account,
                transaction, and audit records.
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
            returned wallet data. Aggregate balances are
            raw totals and should not be treated as a
            single converted currency without applying
            Fockis&apos; approved exchange-rate policy.
          </span>
        </div>
      )}
    </section>
  );
}