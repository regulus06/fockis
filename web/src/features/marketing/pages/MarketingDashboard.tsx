
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { getMarketingDashboard } from "../services/marketingApi";
import type { MarketingDashboardData } from "../types/marketingTypes";

import CampaignCard from "../components/CampaignCard";

import "../styles/MarketingDashboard.scss";

export default function MarketingDashboard() {
  const [data, setData] =
    useState<MarketingDashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getMarketingDashboard();

        if (active) setData(result);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load marketing dashboard.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="fk-marketing-page">
        <div className="fk-marketing-loading">
          Loading marketing dashboard...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="fk-marketing-page">
        <div className="fk-marketing-error">
          {error}
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </main>
    );
  }

  const analytics = data?.analytics;

  return (
    <main className="fk-marketing-page">
      <header className="fk-marketing-header">
        <div>
          <span className="fk-marketing-eyebrow">
            FOCKIS MARKETING
          </span>

          <h1>Marketing Dashboard</h1>

          <p>
            Create advertisements, manage campaigns,
            track performance, and control your advertising budget.
          </p>
        </div>

        <Link
          to="/ads/campaigns/create"
          className="fk-marketing-primary-button"
        >
          <span aria-hidden="true">＋</span>
          Create Campaign
        </Link>
      </header>

      {/* ADVERTISING NAVIGATION */}
      <section className="fk-marketing-section">
        <div className="fk-marketing-section-header">
          <div>
            <h2>Advertising Center</h2>
            <p>
              Open the tools you need to manage your Fockis ads.
            </p>
          </div>
        </div>

        <div className="fk-marketing-grid">
          <Link
            to="/ads"
            className="fk-marketing-action-card"
          >
            <div className="fk-marketing-action-card__icon">
              ◫
            </div>

            <div className="fk-marketing-action-card__content">
              <h3>Ads Overview</h3>
              <p>
                Open your advertising dashboard and review
                your ads management tools.
              </p>
              <span className="fk-marketing-action-card__link">
                Open Ads Overview →
              </span>
            </div>
          </Link>

          <Link
            to="/ads/campaigns"
            className="fk-marketing-action-card"
          >
            <div className="fk-marketing-action-card__icon">
              ▤
            </div>

            <div className="fk-marketing-action-card__content">
              <h3>Manage Campaigns</h3>
              <p>
                View existing campaigns, review their status,
                and manage your advertising activity.
              </p>
              <span className="fk-marketing-action-card__link">
                View Campaigns →
              </span>
            </div>
          </Link>

          <Link
            to="/ads/campaigns/create"
            className="fk-marketing-action-card"
          >
            <div className="fk-marketing-action-card__icon">
              ＋
            </div>

            <div className="fk-marketing-action-card__content">
              <h3>Create Campaign</h3>
              <p>
                Set up an advertising campaign for sponsored
                feed posts or video advertisements.
              </p>
              <span className="fk-marketing-action-card__link">
                Start Creating →
              </span>
            </div>
          </Link>

          <Link
            to="/ads/analytics"
            className="fk-marketing-action-card"
          >
            <div className="fk-marketing-action-card__icon">
              ↗
            </div>

            <div className="fk-marketing-action-card__content">
              <h3>Ads Analytics</h3>
              <p>
                Review advertising performance and available
                campaign statistics.
              </p>
              <span className="fk-marketing-action-card__link">
                View Analytics →
              </span>
            </div>
          </Link>

          <Link
            to="/ads/billing"
            className="fk-marketing-action-card"
          >
            <div className="fk-marketing-action-card__icon">
              $
            </div>

            <div className="fk-marketing-action-card__content">
              <h3>Advertising Billing</h3>
              <p>
                Access campaign billing and advertising budget
                management.
              </p>
              <span className="fk-marketing-action-card__link">
                Manage Billing →
              </span>
            </div>
          </Link>

          <Link
            to="/ads/credits"
            className="fk-marketing-action-card"
          >
            <div className="fk-marketing-action-card__icon">
              ✉
            </div>

            <div className="fk-marketing-action-card__content">
              <h3>Marketing Credits</h3>
              <p>
                View your available email and SMS credits
                and purchase additional packages.
              </p>
              <span className="fk-marketing-action-card__link">
                Manage Credits →
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* PERFORMANCE */}
      {analytics && (
        <section className="fk-marketing-section">
          <div className="fk-marketing-section-header">
            <div>
              <h2>Marketing Performance</h2>
              <p>
                Overview of your available marketing activity.
              </p>
            </div>

            <Link
              to="/ads/analytics"
              className="fk-marketing-section-link"
            >
              View Ads Analytics →
            </Link>
          </div>

          <div className="fk-marketing-metrics">
            <Metric
              label="Campaigns"
              value={data?.campaigns?.length ?? 0}
            />

            <Metric
              label="Recipients"
              value={toMetricValue(analytics.recipients)}
            />

            <Metric
              label="Delivered"
              value={toMetricValue(analytics.delivered)}
            />

            <Metric
              label="Opens"
              value={toMetricValue(analytics.opens)}
            />

            <Metric
              label="Clicks"
              value={toMetricValue(analytics.clicks)}
            />
          </div>
        </section>
      )}

      {/* RECENT CAMPAIGNS */}
      <section className="fk-marketing-section">
        <div className="fk-marketing-section-header">
          <div>
            <h2>Your Campaigns</h2>
            <p>
              Review the campaigns returned by your marketing API.
            </p>
          </div>

          <Link
            to="/ads/campaigns"
            className="fk-marketing-section-link"
          >
            View All Campaigns →
          </Link>
        </div>

        <div className="fk-campaign-grid">
          {data?.campaigns?.length ? (
            data.campaigns.map((campaign) => {
              const campaignKey =
                campaign._id != null
                  ? String(campaign._id)
                  : campaign.id != null
                    ? String(campaign.id)
                    : String(campaign.name ?? "campaign");

              return (
                <CampaignCard
                  key={campaignKey}
                  campaign={campaign}
                />
              );
            })
          ) : (
            <div className="fk-marketing-empty">
              <p>No campaigns yet.</p>

              <Link
                to="/ads/campaigns/create"
                className="fk-marketing-section-link"
              >
                Create Your First Campaign →
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function toMetricValue(
  value: unknown,
): string | number {
  if (
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }

  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;

    if (
      typeof source.value === "number" ||
      typeof source.value === "string"
    ) {
      return source.value;
    }

    if (
      typeof source.total === "number" ||
      typeof source.total === "string"
    ) {
      return source.total;
    }

    if (
      typeof source.count === "number" ||
      typeof source.count === "string"
    ) {
      return source.count;
    }
  }

  return 0;
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="fk-marketing-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
