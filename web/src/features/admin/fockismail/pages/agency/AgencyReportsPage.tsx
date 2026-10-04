import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAsync } from "../../hooks/useAsync";
import { useMailchimp } from "../../hooks/useMailchimp";
import { useMarketingWorkspace } from "../../hooks/useMarketingWorkspace";
import { agencyApi } from "../../services/agencyApi";
import { rangeToDays } from "../../services/analyticsApi";
import { KpiBand } from "../../components/MarketingKpiCard";
import { AnalyticsChart, BarList, DonutChart } from "../../components/AnalyticsChart";
import { DateRangeSelect } from "../../components/DateRangeSelect";
import { Button } from "../../components/ui/Button";
import { DemoBadge } from "../../components/ui/Badge";
import { PageHeader, Panel, Toolbar } from "../../components/ui/Layout";
import { FilterSelect } from "../../components/ui/Field";
import { EmptyState, Notice, Skeleton } from "../../components/ui/Feedback";
import { BUSINESS_TYPE_LABELS } from "../../utils/platformLabels";
import { CAMPAIGN_TYPE_LABELS } from "../../utils/labels";
import { downloadText, formatCurrency, formatNumber, formatPercent } from "../../utils/format";
import type { AnalyticsMetric } from "../../types/mailchimp.types";
import type { BusinessType } from "../../types/platform.types";

export default function AgencyReportsPage() {
  const { dateRange, setDateRange, isMock } = useMailchimp();
  const { businesses } = useMarketingWorkspace();
  const [params] = useSearchParams();
  const [client, setClient] = useState(params.get("client") ?? "all");
  const [type, setType] = useState<BusinessType | "all">("all");
  const [campaignType, setCampaignType] = useState("all");
  const days = rangeToDays(dateRange);
  const report = useAsync(() => agencyApi.getReport({ businessId: client, businessType: type, campaignType, days }), [client, type, campaignType, days]);
  const rows = report.data ?? [];
  const name = (id: string) => businesses.find((b) => b.id === id)?.name ?? id;
  const sum = (k: "contacts" | "campaigns" | "emailsSent" | "leads" | "conversions" | "revenue") => rows.reduce((n, r) => n + r[k], 0);
  const avg = (k: "openRate" | "clickRate") => { const r = rows.filter((x) => x[k] > 0); return r.length ? r.reduce((n, x) => n + x[k], 0) / r.length : 0; };
  const metrics: AnalyticsMetric[] | undefined = report.data && [
    { key: "clients", label: "Clients", value: rows.length, format: "number", changePct: 0, sparkline: [] },
    { key: "campaigns", label: "Campaigns", value: sum("campaigns"), format: "number", changePct: 6.2, sparkline: [] },
    { key: "contacts", label: "Contacts", value: sum("contacts"), format: "number", changePct: 4.4, sparkline: [] },
    { key: "sent", label: "Emails sent", value: sum("emailsSent"), format: "number", changePct: 9.1, sparkline: [] },
    { key: "open", label: "Open rate", value: avg("openRate"), format: "percent", changePct: 1.2, sparkline: [] },
    { key: "click", label: "Click rate", value: avg("clickRate"), format: "percent", changePct: 0.4, sparkline: [] },
    { key: "leads", label: "Leads", value: sum("leads"), format: "number", changePct: 7.8, sparkline: [] },
    { key: "conversions", label: "Conversions", value: sum("conversions"), format: "number", changePct: 5.5, sparkline: [] },
    { key: "revenue", label: "Revenue", value: sum("revenue"), format: "currency", changePct: 12.9, sparkline: [] },
  ];

  const exportCsv = () => downloadText("fockis-client-report.csv", ["client,contacts,campaigns,emails_sent,open_rate,click_rate,leads,conversions,revenue", ...rows.map((r) => [name(r.businessId), r.contacts, r.campaigns, r.emailsSent, r.openRate.toFixed(1), r.clickRate.toFixed(1), r.leads, r.conversions, r.revenue].join(","))].join("\n"), "text/csv");

  return (
    <div className="fm-page">
      <PageHeader title="Client reports" description="Results across every client, ready to share in monthly check-ins." actions={<>{isMock && <DemoBadge />}<DateRangeSelect value={dateRange} onChange={setDateRange} /><Button icon="download" disabled={!rows.length} onClick={exportCsv}>Export CSV</Button></>} />
      {isMock && <Notice>Demo data. Numbers come from each client's sample workspace and are scaled to the date range.</Notice>}
      <Toolbar>
        <FilterSelect label="Client" value={client} onChange={setClient} options={[{ value: "all", label: "All clients" }, ...businesses.filter((b) => !b.isAgencyOwner).map((b) => ({ value: b.id, label: b.name }))]} />
        <FilterSelect label="Business type" value={type} onChange={(v) => setType(v as BusinessType | "all")} options={[{ value: "all", label: "All business types" }, ...Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => ({ value, label }))]} />
        <FilterSelect label="Campaign type" value={campaignType} onChange={setCampaignType} options={[{ value: "all", label: "All campaign types" }, ...Object.entries(CAMPAIGN_TYPE_LABELS).map(([value, label]) => ({ value, label }))]} />
      </Toolbar>
      <KpiBand metrics={metrics} loading={!metrics} count={9} />
      {report.loading ? <Skeleton height={300} /> : rows.length === 0 ? <EmptyState icon="report" title="No clients match" body="Change the filters to see results." /> : (
        <>
          <div className="fm-grid fm-grid--two">
            <Panel title="Emails sent by client">
              <AnalyticsChart title="Emails sent by client" type="bar" series={[{ name: "Emails sent", points: rows.map((r) => ({ label: name(r.businessId).split(" ")[0], value: r.emailsSent })) }]} />
            </Panel>
            <Panel title="Open vs. click rate">
              <AnalyticsChart title="Open and click rate by client" type="bar" format="percent" series={[
                { name: "Open rate", points: rows.map((r) => ({ label: name(r.businessId).split(" ")[0], value: +r.openRate.toFixed(1) })) },
                { name: "Click rate", points: rows.map((r) => ({ label: name(r.businessId).split(" ")[0], value: +r.clickRate.toFixed(1) })) },
              ]} />
            </Panel>
            <Panel title="Revenue by client"><BarList items={rows.map((r) => ({ label: name(r.businessId), value: r.revenue }))} format="currency" /></Panel>
            <Panel title="Leads share"><DonutChart items={rows.filter((r) => r.leads > 0).map((r) => ({ label: name(r.businessId), value: r.leads }))} label="Leads by client" format="number" /></Panel>
          </div>
          <Panel title="By client" flush>
            <div className="fm-tablewrap"><table className="fm-table">
              <thead><tr><th scope="col">Client</th><th scope="col" className="is-num">Contacts</th><th scope="col" className="is-num">Campaigns</th><th scope="col" className="is-num">Emails sent</th><th scope="col" className="is-num">Open rate</th><th scope="col" className="is-num">Click rate</th><th scope="col" className="is-num">Leads</th><th scope="col" className="is-num">Conversions</th><th scope="col" className="is-num">Revenue</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.businessId}><td className="fm-table__primary"><strong>{name(r.businessId)}</strong></td><td className="is-num">{formatNumber(r.contacts)}</td><td className="is-num">{r.campaigns}</td><td className="is-num">{formatNumber(r.emailsSent)}</td><td className="is-num">{r.openRate ? formatPercent(r.openRate) : "—"}</td><td className="is-num">{r.clickRate ? formatPercent(r.clickRate) : "—"}</td><td className="is-num">{formatNumber(r.leads)}</td><td className="is-num">{formatNumber(r.conversions)}</td><td className="is-num">{formatCurrency(r.revenue)}</td></tr>
              ))}</tbody>
            </table></div>
          </Panel>
        </>
      )}
    </div>
  );
}
