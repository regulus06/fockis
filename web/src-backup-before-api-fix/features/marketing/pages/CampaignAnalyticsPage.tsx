import {
  Link,
  useParams,
} from "react-router-dom";

import {
  useMarketingAnalytics,
} from "../hooks/useMarketingAnalytics";

import "../styles/CampaignAnalyticsPage.scss";

export default function CampaignAnalyticsPage() {
  const {
    campaignId,
  } = useParams<{
    campaignId: string;
  }>();

  const {
    campaign,
    loading,
    error,
  } =
    useMarketingAnalytics(
      campaignId,
    );

  if (loading) {
    return (
      <main className="fk-marketing-page">
        <div className="fk-marketing-loading">
          Loading analytics...
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
      </main>
    );
  }

  return (
    <main className="fk-marketing-page">
      <header className="fk-marketing-header">
        <div>
          <span className="fk-marketing-eyebrow">
            ANALYTICS
          </span>

          <h1>
            {campaign?.campaignName ??
              "Campaign Analytics"}
          </h1>

          <p>
            Monitor campaign
            performance.
          </p>
        </div>

        <Link
          to={
            campaignId
              ? `/marketing/campaigns/${campaignId}`
              : "/marketing"
          }
          className="fk-marketing-secondary-button"
        >
          Back to campaign
        </Link>
      </header>

      <section className="fk-marketing-metrics">
        <Metric
          label="Impressions"
          value={
            campaign?.impressions ??
            0
          }
        />

        <Metric
          label="Clicks"
          value={
            campaign?.clicks ??
            0
          }
        />

        <Metric
          label="Conversions"
          value={
            campaign?.conversions ??
            0
          }
        />

        <Metric
          label="Spend"
          value={`$${Number(
            campaign?.spend ?? 0,
          ).toFixed(2)}`}
        />

        <Metric
          label="Revenue"
          value={`$${Number(
            campaign?.revenue ?? 0,
          ).toFixed(2)}`}
        />

        <Metric
          label="CTR"
          value={`${Number(
            campaign?.ctr ?? 0,
          ).toFixed(2)}%`}
        />

        <Metric
          label="Conversion rate"
          value={`${Number(
            campaign?.conversionRate ??
              0,
          ).toFixed(2)}%`}
        />

        <Metric
          label="ROI"
          value={`${Number(
            campaign?.roi ?? 0,
          ).toFixed(2)}x`}
        />
      </section>
    </main>
  );
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
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}