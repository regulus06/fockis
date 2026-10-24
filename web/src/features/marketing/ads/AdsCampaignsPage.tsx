/* ============================================================================
   FOCKIS ADS — CAMPAIGNS
   Filterable list of the advertiser's campaigns with state-aware actions.
============================================================================ */

import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, Plus, Search } from "lucide-react";

import {
  adsPaths,
  formatCount,
  formatDate,
  formatMoney,
  formatPercent,
  humanize,
  ratio,
  sortByRecent,
  type AdsCampaign,
} from "./adsModel";
import { AdsMedia, StatusChip } from "./AdsTiles";
import CampaignActions from "./CampaignActions";
import { AdsNotices, useAdsNotices } from "./AdsNotices";
import { useAdsData } from "./useAdsData";

type FilterId = "all" | "running" | "review" | "paused" | "drafts" | "changes" | "ended";

const FILTERS: { id: FilterId; label: string; match: (c: AdsCampaign) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "running", label: "Running", match: (c) => c.status === "ACTIVE" },
  { id: "review", label: "In review", match: (c) => c.status === "PENDING_REVIEW" },
  { id: "paused", label: "Paused", match: (c) => c.status === "PAUSED" },
  { id: "drafts", label: "Drafts", match: (c) => c.status === "DRAFT" },
  { id: "changes", label: "Needs changes", match: (c) => c.status === "REJECTED" },
  {
    id: "ended",
    label: "Ended",
    match: (c) => c.status === "COMPLETED" || c.status === "CANCELLED",
  },
];

function isFilter(value: string | null): value is FilterId {
  return FILTERS.some((filter) => filter.id === value);
}

export default function AdsCampaignsPage() {
  const data = useAdsData();
  const notices = useAdsNotices();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");

  const filterParam = params.get("status");
  const filter: FilterId = isFilter(filterParam) ? filterParam : "all";

  const counts = useMemo(() => {
    const result = {} as Record<FilterId, number>;

    for (const item of FILTERS) {
      result[item.id] = data.campaigns.filter(item.match).length;
    }

    return result;
  }, [data.campaigns]);

  const visible = useMemo(() => {
    const active = FILTERS.find((item) => item.id === filter) ?? FILTERS[0];
    const needle = query.trim().toLowerCase();

    return sortByRecent(data.campaigns).filter(
      (campaign) =>
        active.match(campaign) &&
        (!needle ||
          campaign.name.toLowerCase().includes(needle) ||
          campaign.headline.toLowerCase().includes(needle)),
    );
  }, [data.campaigns, filter, query]);

  function selectFilter(id: FilterId) {
    const next = new URLSearchParams(params);

    if (id === "all") {
      next.delete("status");
    } else {
      next.set("status", id);
    }

    setParams(next, { replace: true });
  }

  return (
    <div className="fk-ads-page">
      <AdsNotices notices={notices} />

      <header className="fk-ads-pagehead">
        <div>
          <span className="fk-ads-eyebrow">Fockis Ads</span>
          <h1>Campaigns</h1>
          <p>Every campaign you have created, newest first.</p>
        </div>
        <Link to={adsPaths.create} className="fk-ads-btn fk-ads-btn--primary">
          <Plus size={18} aria-hidden="true" /> Create campaign
        </Link>
      </header>

      <div className="fk-ads-toolbar">
        <div className="fk-ads-tabs" role="tablist" aria-label="Filter campaigns by status">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              className={`fk-ads-tab${filter === item.id ? " is-active" : ""}`}
              onClick={() => selectFilter(item.id)}
            >
              {item.label}
              <span className="fk-ads-tab__count">{counts[item.id] ?? 0}</span>
            </button>
          ))}
        </div>

        <label className="fk-ads-search">
          <Search size={16} aria-hidden="true" />
          <span className="fk-ads-sr">Search campaigns</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search campaigns"
          />
        </label>
      </div>

      {data.error && (
        <div className="fk-ads-alert" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{data.error}</span>
          <button type="button" className="fk-ads-btn fk-ads-btn--sm fk-ads-btn--ghost" onClick={() => void data.reload()}>
            Try again
          </button>
        </div>
      )}

      {data.loading && data.campaigns.length === 0 && !data.error ? (
        <div className="fk-ads-list" aria-busy="true" aria-label="Loading campaigns">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} className="fk-ads-skeleton fk-ads-skeleton--row" />
          ))}
        </div>
      ) : visible.length === 0 && !data.error ? (
        <div className="fk-ads-empty fk-ads-empty--page">
          <strong>
            {data.campaigns.length === 0
              ? "You have no campaigns yet"
              : query
                ? "No campaigns match your search"
                : "No campaigns with this status"}
          </strong>
          <p>
            {data.campaigns.length === 0
              ? "Create one to reach people in the feed, Waves, Stories or Marketplace."
              : "Try another filter."}
          </p>
          {data.campaigns.length === 0 && (
            <Link to={adsPaths.create} className="fk-ads-btn fk-ads-btn--primary">
              <Plus size={18} aria-hidden="true" /> Create campaign
            </Link>
          )}
        </div>
      ) : (
        <ul className="fk-ads-list">
          {visible.map((campaign) => (
            <li key={campaign.id} className="fk-ads-row">
              <Link to={adsPaths.campaign(campaign.id)} className="fk-ads-row__thumb" tabIndex={-1} aria-hidden="true">
                <AdsMedia
                  url={campaign.mediaUrl}
                  poster={campaign.thumbnailUrl}
                  format={campaign.adFormat}
                  label={humanize(campaign.adFormat) || "Creative"}
                />
              </Link>

              <div className="fk-ads-row__main">
                <div className="fk-ads-row__title">
                  <Link to={adsPaths.campaign(campaign.id)}>{campaign.name}</Link>
                  <StatusChip status={campaign.status} />
                </div>
                <p className="fk-ads-row__meta">
                  {[
                    humanize(campaign.objective),
                    campaign.placements.map(humanize).join(", "),
                    campaign.startDate ? `Starts ${formatDate(campaign.startDate)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              <dl className="fk-ads-row__stats">
                <div>
                  <dt>Impressions</dt>
                  <dd>{formatCount(campaign.impressions)}</dd>
                </div>
                <div>
                  <dt>CTR</dt>
                  <dd>{formatPercent(ratio(campaign.clicks, campaign.impressions))}</dd>
                </div>
                <div>
                  <dt>Spent / budget</dt>
                  <dd>
                    {formatMoney(campaign.spent)}
                    <small> / {formatMoney(campaign.totalBudget)}</small>
                  </dd>
                </div>
              </dl>

              <CampaignActions
                campaign={campaign}
                raw={data.rawById.get(campaign.id)}
                onChanged={data.reload}
                onError={notices.error}
                onNotice={notices.success}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
