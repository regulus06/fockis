import { useMailchimp } from "../hooks/useMailchimp";
import { useAnalyticsOverview } from "../hooks/useAnalytics";
import { KpiBand } from "../components/MarketingKpiCard";
import {
  AnalyticsChart,
  BarList,
  DonutChart,
} from "../components/AnalyticsChart";
import {
  DateRangeSelect,
  describeRange,
} from "../components/DateRangeSelect";
import {
  PageHeader,
  Panel,
} from "../components/ui/Layout";
import {
  ErrorState,
  Skeleton,
} from "../components/ui/Feedback";
import { DemoBadge } from "../components/ui/Badge";

export default function AnalyticsPage() {
  const {
    dateRange,
    setDateRange,
    isMock,
  } = useMailchimp();

  const data = useAnalyticsOverview(dateRange);
  const d = data.data;
  const loading = data.loading || !d;

  return (
    <div className="fm-page">
      <PageHeader
        title="Analytics"
        description="How your audience grows, engages, and buys across every channel."
        actions={
          <>
            {isMock && <DemoBadge />}

            <DateRangeSelect
              value={dateRange}
              onChange={setDateRange}
            />
          </>
        }
      />

      {data.error ? (
        <ErrorState
          message={data.error}
          onRetry={data.reload}
        />
      ) : (
        <>
          <KpiBand
            metrics={d?.metrics}
            loading={loading}
            count={7}
          />

          <div className="fm-grid fm-grid--two">
            <Panel
              title="Audience growth"
              description={describeRange(dateRange)}
            >
              {loading ? (
                <Skeleton height={220} />
              ) : (
                <AnalyticsChart
                  title="Audience growth"
                  series={d.audienceGrowth}
                  type="line"
                />
              )}
            </Panel>

            <Panel
              title="Revenue"
              description="Attributed to email and automations"
            >
              {loading ? (
                <Skeleton height={220} />
              ) : (
                <AnalyticsChart
                  title="Revenue"
                  series={d.revenue}
                  type="area"
                  format="currency"
                />
              )}
            </Panel>

            <Panel title="Conversion rate">
              {loading ? (
                <Skeleton height={220} />
              ) : (
                <AnalyticsChart
                  title="Conversion rate"
                  series={d.conversion}
                  type="line"
                  format="percent"
                />
              )}
            </Panel>

            <Panel
              title="Engagement"
              description="Open and click rate"
            >
              {loading ? (
                <Skeleton height={220} />
              ) : (
                <AnalyticsChart
                  title="Engagement"
                  series={d.engagement}
                  type="line"
                  format="percent"
                />
              )}
            </Panel>

            <Panel
              title="Customer activity"
              description="Unique contacts this period"
            >
              {loading ? (
                <Skeleton height={220} />
              ) : (
                <BarList items={d.customerActivity} />
              )}
            </Panel>

            <Panel
              title="Audience mix"
              description="Largest Fockis audiences"
            >
              {loading ? (
                <Skeleton height={220} />
              ) : (
                <DonutChart
                  items={d.audienceMix}
                  label="Audience mix"
                  format="number"
                />
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}