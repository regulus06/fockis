import {
  Link,
} from "react-router-dom";

import {
  useEffect,
  useState,
} from "react";

import {
  getMarketingDashboard,
} from "../services/marketingApi";

import type {
  MarketingDashboardData,
} from "../types/marketingTypes";

import CampaignCard from "../components/CampaignCard";

import "../styles/MarketingDashboard.scss";

export default function MarketingDashboard() {
  const [
    data,
    setData,
  ] = useState<MarketingDashboardData | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  /* ========================================================================
     LOAD DASHBOARD
  ======================================================================== */

  useEffect(() => {
    async function load() {
      try {
        const result =
          await getMarketingDashboard();

        setData(
          result,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load marketing dashboard.",
        );
      } finally {
        setLoading(
          false,
        );
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

  const analytics =
    data?.analytics;

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

          <h1>
            Marketing Dashboard
          </h1>

          <p>
            Create campaigns, manage
            advertisements and track
            performance.
          </p>
        </div>

        {/* ================================================================
            HEADER ACTIONS
        ================================================================ */}

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >

          {/* ==============================================================
              CAMPAIGNS
          ============================================================== */}

          <Link
            to="/marketing/campaigns"
            className="fk-marketing-secondary-button"
          >
            Manage Campaigns
          </Link>

          {/* ==============================================================
              CREATE CAMPAIGN
          ============================================================== */}

          <Link
            to="/marketing/campaigns/create"
            className="fk-marketing-primary-button"
          >
            Create Campaign
          </Link>

        </div>
      </header>

      {/* ====================================================================
          METRICS
      ==================================================================== */}

      <section className="fk-marketing-metrics">

        <Metric
          label="Impressions"
          value={
            analytics?.impressions ??
            0
          }
        />

        <Metric
          label="Clicks"
          value={
            analytics?.clicks ??
            0
          }
        />

        <Metric
          label="Conversions"
          value={
            analytics?.conversions ??
            0
          }
        />

        <Metric
          label="Spend"
          value={`$${Number(
            analytics?.spend ??
            0,
          ).toFixed(2)}`}
        />

        <Metric
          label="Revenue"
          value={`$${Number(
            analytics?.revenue ??
            0,
          ).toFixed(2)}`}
        />

        <Metric
          label="ROI"
          value={`${Number(
            analytics?.roi ??
            0,
          ).toFixed(2)}x`}
        />

      </section>

      {/* ====================================================================
          CAMPAIGNS
      ==================================================================== */}

      <section className="fk-marketing-section">

        <div
          className="fk-marketing-section-header"
        >
          <div>

            <h2>
              Campaigns
            </h2>

            <p>
              Your latest advertising
              campaigns.
            </p>

          </div>

          {/* ================================================================
              VIEW ALL CAMPAIGNS
          ================================================================ */}

          <Link
            to="/marketing/campaigns"
            className="fk-marketing-link"
          >
            View All Campaigns
          </Link>

        </div>

        {/* ================================================================
            CAMPAIGN GRID
        ================================================================ */}

        <div className="fk-campaign-grid">

          {data?.campaigns?.length ? (
            data.campaigns.map(
              (
                campaign,
              ) => (
                <CampaignCard
                  key={
                    campaign._id ??
                    campaign.id ??
                    campaign.name
                  }
                  campaign={
                    campaign
                  }
                />
              ),
            )
          ) : (
            <div className="fk-marketing-empty">

              <p>
                No campaigns yet.
              </p>

              <Link
                to="/marketing/campaigns/create"
                className="fk-marketing-primary-button"
              >
                Create Your First Campaign
              </Link>

            </div>
          )}

        </div>

      </section>

    </main>
  );
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

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}