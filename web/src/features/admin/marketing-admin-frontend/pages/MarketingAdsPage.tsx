import React, { useMemo, useState } from "react";

import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
  AdActionButtons,
  formatCurrency,
  formatNumber,
  formatDate,
  statusClass,
  useAds,
} from "./shared";

const STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "ACTIVE",
  "PAUSED",
  "BLOCKED",
  "REJECTED",
  "EXPIRED",
  "ARCHIVED",
] as const;

export default function MarketingAdsPage(): React.ReactElement {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const {
    data,
    loading,
    error,
    refresh,
  } = useAds(status || undefined);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return data;
    }

    return data.filter((ad) =>
      [
        ad.id,
        ad.campaignName,
        ad.advertiserName,
        ad.placement,
        ad.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [data, search]);

  return (
    <>
      <PageHeader
        title="Advertisements"
        description="Control individual ad creative, placement and delivery status."
      />

      <section className="marketing-admin__card">
        <div className="marketing-admin__filters">
          <input
            type="search"
            placeholder="Search ads…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search advertisements"
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter advertisements by status"
          >
            <option value="">All statuses</option>

            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => void refresh()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState message="No advertisements match the current filters." />
        ) : (
          <div className="marketing-admin__table-wrap">
            <table className="marketing-admin__table">
              <thead>
                <tr>
                  <th>Advertisement</th>
                  <th>Campaign</th>
                  <th>Advertiser</th>
                  <th>Status</th>
                  <th>Placement</th>
                  <th>Performance</th>
                  <th>Spend</th>
                  <th>Admin Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((ad) => (
                  <tr key={ad.id}>
                    <td>
                      <strong>{ad.id}</strong>

                      <small>
                        Created {formatDate(ad.createdAt)}
                      </small>
                    </td>

                    <td>
                      {ad.campaignName || "—"}
                    </td>

                    <td>
                      {ad.advertiserName || "—"}
                    </td>

                    <td>
                      <span className={statusClass(ad.status)}>
                        {ad.status}
                      </span>
                    </td>

                    <td>
                      {ad.placement || "—"}
                    </td>

                    <td>
                      <small>
                        {formatNumber(ad.impressions)} impressions
                      </small>

                      <small>
                        {formatNumber(ad.clicks)} clicks
                      </small>
                    </td>

                    <td>
                      {formatCurrency(ad.spend)}
                    </td>

                    <td>
                      <AdActionButtons
                        ad={ad}
                        onRefresh={() => void refresh()}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}