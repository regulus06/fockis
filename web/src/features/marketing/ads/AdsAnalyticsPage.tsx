/* ============================================================================
   FOCKIS ADS — ANALYTICS
   Account-level results computed from the advertiser's campaigns. The
   per-campaign event timeline lives on /ads/campaigns/:id/analytics.
============================================================================ */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowDown, ArrowUp, Plus } from "lucide-react";

import {
  adsPaths,
  computeTotals,
  formatCount,
  formatMoney,
  formatPercent,
  ratio,
  type AdsCampaign,
} from "./adsModel";
import { StatusChip } from "./AdsTiles";
import { useAdsData } from "./useAdsData";

type SortKey = "name" | "impressions" | "clicks" | "ctr" | "spent" | "conversions" | "roas";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "name", label: "Campaign", numeric: false },
  { key: "impressions", label: "Impressions", numeric: true },
  { key: "clicks", label: "Clicks", numeric: true },
  { key: "ctr", label: "CTR", numeric: true },
  { key: "spent", label: "Spent", numeric: true },
  { key: "conversions", label: "Conversions", numeric: true },
  { key: "roas", label: "ROAS", numeric: true },
];

function sortValue(campaign: AdsCampaign, key: SortKey): number | string {
  switch (key) {
    case "name":
      return campaign.name.toLowerCase();
    case "ctr":
      return ratio(campaign.clicks, campaign.impressions) ?? -1;
    case "roas":
      return ratio(campaign.revenue, campaign.spent) ?? -1;
    default:
      return campaign[key];
  }
}

export default function AdsAnalyticsPage() {
  const data = useAdsData();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "impressions",
    dir: -1,
  });

  const totals = useMemo(() => computeTotals(data.campaigns), [data.campaigns]);

  const rows = useMemo(() => {
    return [...data.campaigns].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      const cmp =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv)
          : Number(av) - Number(bv);

      return cmp * sort.dir || a.id.localeCompare(b.id);
    });
  }, [data.campaigns, sort]);

  const delivering = rows.filter((c) => c.impressions > 0);
  const maxImpressions = Math.max(1, ...delivering.map((c) => c.impressions));

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 1 ? -1 : 1 }
        : { key, dir: key === "name" ? 1 : -1 },
    );
  }

  return (
    <div className="fk-ads-page">
      <header className="fk-ads-pagehead">
        <div>
          <span className="fk-ads-eyebrow">Fockis Ads</span>
          <h1>Analytics</h1>
          <p>Results recorded by Fockis delivery for all of your campaigns.</p>
        </div>
      </header>

      {data.error && (
        <div className="fk-ads-alert" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{data.error}</span>
          <button type="button" className="fk-ads-btn fk-ads-btn--sm fk-ads-btn--ghost" onClick={() => void data.reload()}>
            Try again
          </button>
        </div>
      )}

      {data.loading && data.campaigns.length === 0 && !data.error && (
        <div className="fk-ads-skeleton-grid" aria-busy="true" aria-label="Loading analytics">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} className="fk-ads-skeleton" />
          ))}
        </div>
      )}

      {!data.loading && !data.error && data.campaigns.length === 0 && (
        <div className="fk-ads-empty fk-ads-empty--page">
          <strong>No results yet</strong>
          <p>Analytics appear after your first campaign is approved and starts delivering.</p>
          <Link to={adsPaths.create} className="fk-ads-btn fk-ads-btn--primary">
            <Plus size={18} aria-hidden="true" /> Create campaign
          </Link>
        </div>
      )}

      {data.campaigns.length > 0 && (
        <>
          <dl className="fk-ads-card fk-ads-kpi-grid fk-ads-kpi-grid--wide">
            <div>
              <dt>Impressions</dt>
              <dd>{formatCount(totals.impressions)}</dd>
            </div>
            <div>
              <dt>Clicks</dt>
              <dd>{formatCount(totals.clicks)}</dd>
            </div>
            <div>
              <dt>CTR</dt>
              <dd>{formatPercent(totals.ctr)}</dd>
            </div>
            <div>
              <dt>Video views</dt>
              <dd>{formatCount(totals.videoViews)}</dd>
            </div>
            <div>
              <dt>Installs</dt>
              <dd>{formatCount(totals.installs)}</dd>
            </div>
            <div>
              <dt>Conversions</dt>
              <dd>{formatCount(totals.conversions)}</dd>
            </div>
            <div>
              <dt>Spent</dt>
              <dd>{formatMoney(totals.spent)}</dd>
            </div>
            <div>
              <dt>ROAS</dt>
              <dd>{totals.roas === null ? "—" : `${totals.roas.toFixed(2)}×`}</dd>
            </div>
          </dl>

          <section className="fk-ads-card" aria-labelledby="fk-ads-share-title">
            <div className="fk-ads-card__head">
              <h2 id="fk-ads-share-title">Impressions by campaign</h2>
            </div>
            {delivering.length === 0 ? (
              <p className="fk-ads-muted">No campaign has recorded an impression yet.</p>
            ) : (
              <ul className="fk-ads-bars">
                {[...delivering]
                  .sort((a, b) => b.impressions - a.impressions)
                  .slice(0, 10)
                  .map((campaign) => (
                    <li key={campaign.id}>
                      <Link to={adsPaths.campaignAnalytics(campaign.id)}>{campaign.name}</Link>
                      <span className="fk-ads-bars__track">
                        <span style={{ width: `${(campaign.impressions / maxImpressions) * 100}%` }} />
                      </span>
                      <strong>{formatCount(campaign.impressions)}</strong>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section className="fk-ads-card fk-ads-table-card" aria-labelledby="fk-ads-table-title">
            <div className="fk-ads-card__head">
              <h2 id="fk-ads-table-title">By campaign</h2>
            </div>
            <div className="fk-ads-table-wrap">
              <table className="fk-ads-table">
                <thead>
                  <tr>
                    {COLUMNS.map((column) => (
                      <th
                        key={column.key}
                        scope="col"
                        className={column.numeric ? "is-num" : undefined}
                        aria-sort={
                          sort.key === column.key
                            ? sort.dir === 1
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <button type="button" onClick={() => toggleSort(column.key)}>
                          {column.label}
                          {sort.key === column.key &&
                            (sort.dir === 1 ? (
                              <ArrowUp size={14} aria-hidden="true" />
                            ) : (
                              <ArrowDown size={14} aria-hidden="true" />
                            ))}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((campaign) => {
                    const roas = ratio(campaign.revenue, campaign.spent);

                    return (
                      <tr key={campaign.id}>
                        <th scope="row">
                          <Link to={adsPaths.campaignAnalytics(campaign.id)}>{campaign.name}</Link>
                          <StatusChip status={campaign.status} />
                        </th>
                        <td className="is-num">{formatCount(campaign.impressions)}</td>
                        <td className="is-num">{formatCount(campaign.clicks)}</td>
                        <td className="is-num">{formatPercent(ratio(campaign.clicks, campaign.impressions))}</td>
                        <td className="is-num">{formatMoney(campaign.spent)}</td>
                        <td className="is-num">{formatCount(campaign.conversions)}</td>
                        <td className="is-num">{roas === null ? "—" : `${roas.toFixed(2)}×`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
