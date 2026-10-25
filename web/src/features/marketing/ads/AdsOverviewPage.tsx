/* ============================================================================
   FOCKIS ADS — OVERVIEW

   Hero, real totals, insights and rails. Every number on this page is
   computed from the advertiser's own campaigns (GET /marketing/campaigns).
   When there is no data the page says so; it never shows sample figures.
============================================================================ */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Info,
  Megaphone,
  Plus,
  RefreshCw,
  Rocket,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  Waves,
  Clapperboard,
  Newspaper,
  type LucideIcon,
} from "lucide-react";

import {
  adsPaths,
  computeTotals,
  deriveInsights,
  formatCount,
  formatMoney,
  formatPercent,
  sortByRecent,
  topPerforming,
  type AdsInsight,
} from "./adsModel";
import { FORMATS, TEMPLATES, createUrl, type PresetPlacement } from "./adsPresets";
import {
  CampaignTile,
  CreativeTile,
  PresetTile,
  Rail,
  RailEmpty,
} from "./AdsTiles";
import { useAdsData } from "./useAdsData";
import { useAdsNotices, AdsNotices } from "./AdsNotices";

const FORMAT_ICONS: Record<PresetPlacement, LucideIcon> = {
  FEED: Newspaper,
  WAVES: Waves,
  STORY: Clapperboard,
  MARKETPLACE: Store,
};

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  installs: Rocket,
  sales: ShoppingBag,
  traffic: TrendingUp,
  engagement: Sparkles,
  awareness: Megaphone,
};

function InsightIcon({ tone }: { tone: AdsInsight["tone"] }) {
  if (tone === "warning") return <AlertTriangle size={18} aria-hidden="true" />;
  if (tone === "positive") return <TrendingUp size={18} aria-hidden="true" />;
  return <Info size={18} aria-hidden="true" />;
}

export default function AdsOverviewPage() {
  const data = useAdsData();
  const notices = useAdsNotices();
  const [refreshing, setRefreshing] = useState(false);

  const totals = useMemo(() => computeTotals(data.campaigns), [data.campaigns]);
  const insights = useMemo(() => deriveInsights(data.campaigns), [data.campaigns]);

  const recent = useMemo(() => sortByRecent(data.campaigns), [data.campaigns]);
  const running = recent.filter((c) => c.status === "ACTIVE");
  const attention = recent.filter(
    (c) => c.status === "REJECTED" || c.status === "PENDING_REVIEW" || c.status === "PAUSED",
  );
  const drafts = recent.filter((c) => c.status === "DRAFT");
  const top = useMemo(() => topPerforming(data.campaigns), [data.campaigns]);

  const creatives = useMemo(
    () =>
      data.ads.filter((ad) => ad.mediaUrl || ad.imageUrl || ad.videoUrl).slice(0, 12),
    [data.ads],
  );

  const hasCampaigns = data.campaigns.length > 0;
  const firstLoad = data.loading && !hasCampaigns && !data.error;

  async function refresh() {
    setRefreshing(true);
    await data.reload();
    setRefreshing(false);
  }

  const tileProps = {
    onChanged: data.reload,
    onError: notices.error,
    onNotice: notices.success,
  };

  const summary = hasCampaigns
    ? [
        totals.activeCount > 0
          ? `${totals.activeCount} running`
          : "Nothing running right now",
        attention.length > 0 ? `${attention.length} need attention` : null,
        drafts.length > 0 ? `${drafts.length} in drafts` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div className="fk-ads-page">
      <AdsNotices notices={notices} />

      {/* HERO */}

      <section className="fk-ads-hero" aria-labelledby="fk-ads-hero-title">
        <div className="fk-ads-hero__copy">
          <span className="fk-ads-eyebrow">Fockis Ads</span>
          <h1 id="fk-ads-hero-title">
            {hasCampaigns ? "Your campaigns, in one place" : "Reach people where they scroll, watch and shop"}
          </h1>
          <p>
            {summary ??
              "Create a campaign for the feed, Waves, Stories or Marketplace. Every campaign is reviewed before it runs, and you only see results from real delivery."}
          </p>
          <div className="fk-ads-hero__actions">
            <Link to={adsPaths.create} className="fk-ads-btn fk-ads-btn--primary fk-ads-btn--lg">
              <Plus size={18} aria-hidden="true" />
              Create campaign
            </Link>
            <Link to={adsPaths.analytics} className="fk-ads-btn fk-ads-btn--glass fk-ads-btn--lg">
              <BarChart3 size={18} aria-hidden="true" />
              View analytics
            </Link>
          </div>
        </div>

        <div className="fk-ads-hero__art" aria-hidden="true">
          <span className="fk-ads-hero__orb fk-ads-hero__orb--a" />
          <span className="fk-ads-hero__orb fk-ads-hero__orb--b" />
          <span className="fk-ads-hero__ring" />
          <img src="/brand/fockis-icon-192.png" alt="" width={112} height={112} />
        </div>
      </section>

      {data.error && (
        <div className="fk-ads-alert" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{data.error}</span>
          <button type="button" className="fk-ads-btn fk-ads-btn--sm fk-ads-btn--ghost" onClick={() => void refresh()}>
            Try again
          </button>
        </div>
      )}

      {firstLoad && (
        <div className="fk-ads-skeleton-grid" aria-busy="true" aria-label="Loading campaigns">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} className="fk-ads-skeleton" />
          ))}
        </div>
      )}

      {/* TOTALS + INSIGHTS */}

      {hasCampaigns && (
        <div className="fk-ads-split">
          <section className="fk-ads-card fk-ads-kpis" aria-labelledby="fk-ads-kpi-title">
            <div className="fk-ads-card__head">
              <h2 id="fk-ads-kpi-title">All-time results</h2>
              <button
                type="button"
                className="fk-ads-icon-btn fk-ads-icon-btn--sm"
                onClick={() => void refresh()}
                disabled={refreshing}
                aria-label="Refresh results"
              >
                <RefreshCw size={16} aria-hidden="true" className={refreshing ? "is-spinning" : undefined} />
              </button>
            </div>
            <dl className="fk-ads-kpi-grid">
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
                <dt>Spent</dt>
                <dd>{formatMoney(totals.spent)}</dd>
              </div>
              <div>
                <dt>Video views</dt>
                <dd>{formatCount(totals.videoViews)}</dd>
              </div>
              <div>
                <dt>Conversions</dt>
                <dd>{formatCount(totals.conversions)}</dd>
              </div>
            </dl>
            <p className="fk-ads-footnote">
              Totals across {totals.campaignCount} {totals.campaignCount === 1 ? "campaign" : "campaigns"}, as recorded by Fockis delivery.
            </p>
          </section>

          <section className="fk-ads-card fk-ads-insights" aria-labelledby="fk-ads-insight-title">
            <div className="fk-ads-card__head">
              <h2 id="fk-ads-insight-title">Insights</h2>
            </div>
            {insights.length === 0 ? (
              <p className="fk-ads-muted">
                Nothing needs your attention. Insights appear here as your campaigns collect results.
              </p>
            ) : (
              <ul className="fk-ads-insight-list">
                {insights.slice(0, 5).map((insight) => (
                  <li key={insight.id} className={`fk-ads-insight fk-ads-insight--${insight.tone}`}>
                    <InsightIcon tone={insight.tone} />
                    <div>
                      <strong>{insight.title}</strong>
                      <p>{insight.detail}</p>
                      {insight.campaignId && (
                        <Link className="fk-ads-link" to={adsPaths.campaign(insight.campaignId)}>
                          Open campaign
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {!firstLoad && !data.error && !hasCampaigns && (
        <section className="fk-ads-card fk-ads-steps" aria-labelledby="fk-ads-steps-title">
          <h2 id="fk-ads-steps-title">How Fockis Ads works</h2>
          <ol>
            <li>
              <strong>Build</strong>
              <span>Pick a goal, upload a creative and choose where it shows.</span>
            </li>
            <li>
              <strong>Review</strong>
              <span>A Fockis reviewer checks the campaign before it can run.</span>
            </li>
            <li>
              <strong>Run</strong>
              <span>Delivery follows your budget and schedule; pause any time.</span>
            </li>
            <li>
              <strong>Learn</strong>
              <span>Results here come only from real impressions and clicks.</span>
            </li>
          </ol>
        </section>
      )}

      {/* RAILS */}

      {!firstLoad && !data.error && (
        <>
          <Rail
            id="running"
            title="Running now"
            description="Campaigns delivering to people right now."
            count={running.length}
            action={
              <Link className="fk-ads-link" to={adsPaths.campaigns}>
                All campaigns
              </Link>
            }
            empty={
              <RailEmpty
                title="No campaigns are running"
                text={
                  hasCampaigns
                    ? "Approved campaigns appear here while they deliver."
                    : "Your first approved campaign will appear here."
                }
                action={
                  <Link className="fk-ads-btn fk-ads-btn--soft fk-ads-btn--sm" to={adsPaths.create}>
                    <Plus size={16} aria-hidden="true" /> Create campaign
                  </Link>
                }
              />
            }
          >
            {running.map((campaign) => (
              <CampaignTile key={campaign.id} campaign={campaign} raw={data.rawById.get(campaign.id)} {...tileProps} />
            ))}
          </Rail>

          {attention.length > 0 && (
            <Rail
              id="attention"
              title="Needs attention"
              description="In review, paused, or waiting for changes."
              count={attention.length}
            >
              {attention.map((campaign) => (
                <CampaignTile key={campaign.id} campaign={campaign} raw={data.rawById.get(campaign.id)} {...tileProps} />
              ))}
            </Rail>
          )}

          {hasCampaigns && (
            <Rail
              id="top"
              title="Top performing"
              description="Highest click-through rate among campaigns with at least 500 impressions."
              count={top.length}
              empty={
                <RailEmpty
                  title="Not enough data yet"
                  text="Rankings appear once a campaign reaches 500 impressions."
                />
              }
            >
              {top.map((campaign) => (
                <CampaignTile key={campaign.id} campaign={campaign} raw={data.rawById.get(campaign.id)} {...tileProps} />
              ))}
            </Rail>
          )}

          {drafts.length > 0 && (
            <Rail id="drafts" title="Drafts" description="Finish and submit these for review." count={drafts.length}>
              {drafts.map((campaign) => (
                <CampaignTile key={campaign.id} campaign={campaign} raw={data.rawById.get(campaign.id)} {...tileProps} />
              ))}
            </Rail>
          )}

          <Rail
            id="creatives"
            title="Creative library"
            description="Images and videos attached to your ads."
            count={creatives.length}
            action={
              <Link className="fk-ads-link" to={adsPaths.creatives}>
                Manage
              </Link>
            }
            empty={
              <RailEmpty
                title={data.adsError ? "Creatives could not be loaded" : "No creatives yet"}
                text={data.adsError ?? "Creatives you upload to a campaign are kept here for reuse."}
              />
            }
          >
            {creatives.map((ad, index) => (
              <CreativeTile key={String(ad._id ?? ad.id ?? index)} ad={ad} />
            ))}
          </Rail>

          <Rail
            id="templates"
            title="Start from a goal"
            description="Pre-fills the builder. You can change everything before submitting."
            count={TEMPLATES.length}
          >
            {TEMPLATES.map((template) => {
              const Icon = TEMPLATE_ICONS[template.id] ?? Sparkles;

              return (
                <PresetTile
                  key={template.id}
                  to={createUrl(template)}
                  icon={<Icon size={20} aria-hidden="true" />}
                  title={template.title}
                  text={template.text}
                />
              );
            })}
          </Rail>

          <Rail id="formats" title="Where ads appear" description="Every placement is labeled Sponsored." count={FORMATS.length}>
            {FORMATS.map((format) => {
              const Icon = FORMAT_ICONS[format.placement];

              return (
                <PresetTile
                  key={format.placement}
                  to={createUrl({
                    placement: format.placement,
                    format: format.placement === "WAVES" ? "VIDEO" : undefined,
                  })}
                  icon={<Icon size={20} aria-hidden="true" />}
                  title={format.title}
                  text={format.text}
                  tag={format.spec}
                />
              );
            })}
          </Rail>
        </>
      )}
    </div>
  );
}
