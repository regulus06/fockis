import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useCampaigns } from "../hooks/useCampaigns";
import { useCampaignReport } from "../hooks/useAnalytics";
import { useMailchimp } from "../hooks/useMailchimp";
import { AnalyticsChart, BarList, DonutChart } from "../components/AnalyticsChart";
import { ReportCard } from "../components/ReportCard";
import { DateRangeSelect } from "../components/DateRangeSelect";
import { Button } from "../components/ui/Button";
import { PageHeader, Panel } from "../components/ui/Layout";
import { Checkbox, FilterSelect } from "../components/ui/Field";
import { EmptyState, ErrorState, Notice, Skeleton } from "../components/ui/Feedback";
import { DemoBadge } from "../components/ui/Badge";
import { rangeToDays } from "../services/analyticsApi";
import { clickRate, openRate } from "../services/campaignsApi";
import { downloadText, formatCurrency, formatDate, formatNumber, formatPercent, rate } from "../utils/format";

// Demo benchmarks; a real backend should supply industry or account averages.
const BENCH = { open: 35, click: 5, bounce: 1, unsub: 0.3 };

export default function ReportsPage() {
  const { dateRange, setDateRange, isMock } = useMailchimp();
  const [params, setParams] = useSearchParams();
  const campaigns = useCampaigns({});
  const [compare, setCompare] = useState<string[]>([]);

  const sent = useMemo(() => {
    const cutoff = Date.now() - rangeToDays(dateRange) * 86400000;
    const from = dateRange.preset === "custom" && dateRange.from ? new Date(dateRange.from).getTime() : cutoff;
    const to = dateRange.preset === "custom" && dateRange.to ? new Date(dateRange.to).getTime() + 86400000 : Infinity;
    return (campaigns.data ?? [])
      .filter((c) => c.stats.delivered > 0 && c.sentAt)
      .filter((c) => {
        const t = new Date(c.sentAt ?? 0).getTime();
        return t >= from && t <= to;
      })
      .sort((a, b) => new Date(b.sentAt ?? 0).getTime() - new Date(a.sentAt ?? 0).getTime());
  }, [campaigns.data, dateRange]);

  const selectedId = params.get("campaign") ?? sent[0]?.id;
  const report = useCampaignReport(selectedId);
  const r = report.data;
  const st = r?.stats;

  const compared = (campaigns.data ?? []).filter((c) => compare.includes(c.id));

  const exportCsv = () => {
    if (!r || !st) return;
    const rows = [
      ["metric", "value"],
      ["recipients", st.recipients], ["delivered", st.delivered], ["unique_opens", st.uniqueOpens], ["unique_clicks", st.uniqueClicks],
      ["bounces", st.bounces], ["unsubscribes", st.unsubscribes], ["spam_complaints", st.spamComplaints], ["conversions", st.conversions], ["revenue", st.revenue],
      ...r.links.map((l) => [`link:${l.url}`, l.clicks]),
    ];
    downloadText(`report-${r.campaignId}.csv`, rows.map((x) => x.join(",")).join("\n"), "text/csv");
  };

  return (
    <div className="fm-page">
      <PageHeader
        title="Reports"
        description="See how each campaign performed, and compare campaigns side by side."
        actions={<><DateRangeSelect value={dateRange} onChange={setDateRange} /><Button icon="download" disabled={!r} onClick={exportCsv}>Export CSV</Button></>}
      />

      {campaigns.loading ? <Skeleton height={44} /> : sent.length === 0 ? (
        <EmptyState icon="report" title="No sent campaigns in this period" body="Choose a longer date range, or send a campaign to see its report." />
      ) : (
        <>
          <div className="fm-row fm-row--wrap fm-reportpicker">
            <FilterSelect
              label="Campaign"
              value={selectedId ?? ""}
              onChange={(v) => setParams({ campaign: v })}
              options={sent.map((c) => ({ value: c.id, label: `${c.name} · ${formatDate(c.sentAt)}` }))}
            />
            {isMock && <DemoBadge />}
          </div>

          {report.error ? <ErrorState message={report.error} onRetry={report.reload} /> : !r || !st || report.loading ? <Skeleton height={420} /> : (
            <>
              <div className="fm-reportgrid">
                <ReportCard label="Delivered" value={formatPercent(rate(st.delivered, st.recipients))} detail={`${formatNumber(st.delivered)} of ${formatNumber(st.recipients)}`} />
                <ReportCard label="Open rate" value={formatPercent(rate(st.uniqueOpens, st.delivered))} detail={`${formatNumber(st.uniqueOpens)} unique opens`} benchmark={{ value: BENCH.open, current: rate(st.uniqueOpens, st.delivered), higherIsBetter: true, label: `Benchmark ${BENCH.open}%` }} />
                <ReportCard label="Click rate" value={formatPercent(rate(st.uniqueClicks, st.delivered))} detail={`${formatNumber(st.uniqueClicks)} unique clicks`} benchmark={{ value: BENCH.click, current: rate(st.uniqueClicks, st.delivered), higherIsBetter: true, label: `Benchmark ${BENCH.click}%` }} />
                <ReportCard label="Bounce rate" value={formatPercent(rate(st.bounces, st.recipients), 2)} detail={`${formatNumber(st.bounces)} bounced`} benchmark={{ value: BENCH.bounce, current: rate(st.bounces, st.recipients), higherIsBetter: false, label: `Benchmark under ${BENCH.bounce}%` }} />
                <ReportCard label="Unsubscribe rate" value={formatPercent(rate(st.unsubscribes, st.delivered), 2)} detail={`${formatNumber(st.unsubscribes)} unsubscribed`} benchmark={{ value: BENCH.unsub, current: rate(st.unsubscribes, st.delivered), higherIsBetter: false, label: `Benchmark under ${BENCH.unsub}%` }} />
                <ReportCard label="Spam complaints" value={formatNumber(st.spamComplaints)} detail={formatPercent(rate(st.spamComplaints, st.delivered), 3)} />
                <ReportCard label="Revenue" value={formatCurrency(st.revenue)} detail={`${formatCurrency(st.conversions ? st.revenue / st.conversions : 0)} per order`} />
                <ReportCard label="Conversions" value={formatNumber(st.conversions)} detail={formatPercent(rate(st.conversions, st.delivered), 2)} />
              </div>

              <div className="fm-grid fm-grid--two">
                <Panel title="Opens over time" description="First 24 hours after sending">
                  <AnalyticsChart title="Opens over time" series={[{ name: "Opens", points: r.opensOverTime }]} type="area" />
                </Panel>
                <Panel title="Clicks over time" description="First 24 hours after sending">
                  <AnalyticsChart title="Clicks over time" series={[{ name: "Clicks", points: r.clicksOverTime, color: "#12b5a6" }]} type="area" />
                </Panel>
                <Panel title="Devices"><DonutChart items={r.devices} label="Opens by device" /></Panel>
                <Panel title="Top locations"><BarList items={r.locations} format="percent" /></Panel>
                <Panel title="Revenue" description="First 7 days">
                  <AnalyticsChart title="Revenue" series={[{ name: "Revenue", points: r.revenueOverTime, color: "#7c5cff" }]} type="bar" format="currency" />
                </Panel>
                <Panel title="Link performance" flush>
                  <div className="fm-tablewrap">
                    <table className="fm-table">
                      <thead><tr><th scope="col">Link</th><th scope="col" className="is-num">Clicks</th><th scope="col" className="is-num">Unique</th><th scope="col" className="is-num">Share</th></tr></thead>
                      <tbody>{r.links.map((l) => (
                        <tr key={l.url}><td className="fm-break">{l.url}</td><td className="is-num">{formatNumber(l.clicks)}</td><td className="is-num">{formatNumber(l.uniqueClicks)}</td><td className="is-num">{formatPercent(rate(l.clicks, st.clicks))}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </Panel>
              </div>
            </>
          )}

          <Panel title="Compare campaigns" description="Pick up to three sent campaigns.">
            <div className="fm-chipset">
              {sent.map((c) => (
                <Checkbox key={c.id} label={c.name} checked={compare.includes(c.id)} onChange={(on) => setCompare((list) => (on ? [...list, c.id].slice(-3) : list.filter((x) => x !== c.id)))} />
              ))}
            </div>
            {compared.length < 2 ? (
              <Notice>Select at least two campaigns to compare them.</Notice>
            ) : (
              <>
                <div className="fm-tablewrap fm-mt-16">
                  <table className="fm-table fm-table--compare">
                    <thead><tr><th scope="col">Metric</th>{compared.map((c, i) => <th key={c.id} scope="col" className="is-num">Campaign {String.fromCharCode(65 + i)}<span className="fm-table__sub">{c.name}</span></th>)}</tr></thead>
                    <tbody>
                      {([
                        ["Recipients", (c) => formatNumber(c.stats.recipients)],
                        ["Open rate", (c) => formatPercent(openRate(c))],
                        ["Click rate", (c) => formatPercent(clickRate(c))],
                        ["Unsubscribes", (c) => formatNumber(c.stats.unsubscribes)],
                        ["Revenue", (c) => formatCurrency(c.stats.revenue)],
                      ] as Array<[string, (c: (typeof compared)[number]) => string]>).map(([label, fn]) => (
                        <tr key={label}><th scope="row">{label}</th>{compared.map((c) => <td key={c.id} className="is-num">{fn(c)}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <AnalyticsChart
                  title="Open and click rate comparison"
                  type="bar"
                  format="percent"
                  series={[
                    { name: "Open rate", points: compared.map((c, i) => ({ label: `Campaign ${String.fromCharCode(65 + i)}`, value: +openRate(c).toFixed(1) })) },
                    { name: "Click rate", points: compared.map((c, i) => ({ label: `Campaign ${String.fromCharCode(65 + i)}`, value: +clickRate(c).toFixed(1) })) },
                  ]}
                />
              </>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
