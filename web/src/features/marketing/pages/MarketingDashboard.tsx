import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { getMarketingDashboard } from "../services/marketingApi";
import type { MarketingDashboardData } from "../types/marketingTypes";

import CampaignCard from "../components/CampaignCard";

import "../styles/MarketingDashboard.scss";

export default function MarketingDashboard() {
  const [data, setData] =
    useState<MarketingDashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /* ========================================================================
     LOAD DASHBOARD
  ======================================================================== */

  useEffect(() => {
    async function load() {
      try {
        const result =
          await getMarketingDashboard();

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load marketing dashboard.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  /* ========================================================================
     LOADING
  ======================================================================== */

  if (loading) {
    return (
      <main className="fk-marketing-page">
        <div className="fk-marketing-loading">
          Loading marketing dashboard...
        </div>
      </main>
    );
  }

  /* ========================================================================
     ERROR
  ======================================================================== */

  if (error) {
    return (
      <main className="fk-marketing-page">
        <div className="fk-marketing-error">
          {error}
        </div>
      </main>
    );
  }

  const analytics = data?.analytics;

  /* ========================================================================
     DASHBOARD
  ======================================================================== */

  return (
    <main className="fk-marketing-page">
      {/* ====================================================================
          HEADER
      ==================================================================== */}

      <header className="fk-marketing-header">
        <div>
          <span className="fk-marketing-eyebrow">
            FOCKIS MARKETING
          </span>

          <h1>Marketing Dashboard</h1>

          <p>
            Manage campaigns, credits, and
            advertising activity.
          </p>
        </div>
      </header>

      {/* ====================================================================
          MARKETING MANAGEMENT
      ==================================================================== */}

      <section className="fk-marketing-section">
        <div className="fk-marketing-section-header">
          <div>
            <h2>Marketing Management</h2>

            <p>
              Access your marketing credits and
              campaign billing.
            </p>
          </div>
        </div>

        <div className="fk-marketing-grid">
          {/* CREDITS */}

          <Link
            to="/marketing/credits"
            className="fk-marketing-action-card"
          >
            <div className="fk-marketing-action-card__icon">
              ✉
            </div>

            <div className="fk-marketing-action-card__content">
              <h3>Marketing Credits</h3>

              <p>
                View your Email and SMS credit
                balances and purchase additional
                credit packages.
              </p>

              <span className="fk-marketing-action-card__link">
                Manage Credits →
              </span>
            </div>
          </Link>

          {/* BILLING */}

          <Link
            to="/marketing/billing"
            className="fk-marketing-action-card"
          >
            <div className="fk-marketing-action-card__icon">
              $
            </div>

            <div className="fk-marketing-action-card__content">
              <h3>Campaign Billing</h3>

              <p>
                Manage campaign spending limits and
                advertising budgets.
              </p>

              <span className="fk-marketing-action-card__link">
                Manage Billing →
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* ====================================================================
          ANALYTICS
      ==================================================================== */}

      {analytics && (
        <section className="fk-marketing-section">
          <div className="fk-marketing-section-header">
            <div>
              <h2>Performance</h2>

              <p>
                Overview of your marketing activity.
              </p>
            </div>
          </div>

          <div className="fk-marketing-metrics">
            <Metric
              label="Campaigns"
              value={data?.campaigns?.length ?? 0}
            />

            <Metric
              label="Recipients"
              value={toMetricValue(
                analytics.recipients,
              )}
            />

            <Metric
              label="Delivered"
              value={toMetricValue(
                analytics.delivered,
              )}
            />

            <Metric
              label="Opens"
              value={toMetricValue(
                analytics.opens,
              )}
            />

            <Metric
              label="Clicks"
              value={toMetricValue(
                analytics.clicks,
              )}
            />
          </div>
        </section>
      )}

      {/* ====================================================================
          CAMPAIGNS
      ==================================================================== */}

      <section className="fk-marketing-section">
        <div className="fk-marketing-section-header">
          <div>
            <h2>Campaigns</h2>

            <p>
              Your latest advertising campaigns.
            </p>
          </div>

          <Link
            to="/marketing/campaigns"
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
                    : String(
                        campaign.name ??
                          "campaign",
                      );

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
                to="/marketing/campaigns"
                className="fk-marketing-section-link"
              >
                Create a Campaign →
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

/* ============================================================================
   METRIC VALUE NORMALIZER
============================================================================ */

function toMetricValue(
  value: unknown,
): string | number {
  if (
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const source =
      value as Record<string, unknown>;

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

/* ============================================================================
   METRIC
============================================================================ */

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