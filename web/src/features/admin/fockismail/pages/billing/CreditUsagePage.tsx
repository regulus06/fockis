import { useState } from "react";
import { useAsync } from "../../hooks/useAsync";
import { useMailchimp } from "../../hooks/useMailchimp";
import { useMarketingWorkspace, useViewer } from "../../hooks/useMarketingWorkspace";
import { transactionsApi } from "../../services/transactionsApi";
import { AnalyticsChart, BarList, DonutChart } from "../../components/AnalyticsChart";
import { DemoBadge } from "../../components/ui/Badge";
import { PageHeader, Panel, Stat, StatStrip, Toolbar } from "../../components/ui/Layout";
import { FilterSelect } from "../../components/ui/Field";
import { Skeleton } from "../../components/ui/Feedback";
import { Segmented } from "../../components/ui/Tabs";
import { formatNumber } from "../../utils/format";

type Grain = "daily" | "weekly" | "monthly";
type Channel = "all" | "email" | "sms";

export default function CreditUsagePage() {
  const { isMock } = useMailchimp();
  const { currentBusiness, businesses, switchBusiness } = useMarketingWorkspace();
  const { can } = useViewer();
  const [days, setDays] = useState("30");
  const [grain, setGrain] = useState<Grain>("daily");
  const [channel, setChannel] = useState<Channel>("all");
  const [campaign, setCampaign] = useState("all");
  const id = currentBusiness?.id ?? "";
  const usage = useAsync(() => transactionsApi.usage(id, Number(days)), [id, days]);
  const byClient = useAsync(() => (can("billing.manage_client_credits") ? transactionsApi.usageByClient(Number(days)) : Promise.resolve([])), [days]);
  const u = usage.data;

  const bucket = (n: number) => (grain === "daily" ? 1 : grain === "weekly" ? 7 : 30) * n;
  const points = u ? u.daily.reduce<Array<{ label: string; email: number; sms: number }>>((acc, d, i) => {
    const size = bucket(1);
    const idx = Math.floor(i / size);
    if (!acc[idx]) acc[idx] = { label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }), email: 0, sms: 0 };
    acc[idx].email += d.email;
    acc[idx].sms += d.sms;
    return acc;
  }, []) : [];

  const series = [
    ...(channel !== "sms" ? [{ name: "Email credits", color: "#1f5eff", points: points.map((p) => ({ label: p.label, value: p.email })) }] : []),
    ...(channel !== "email" ? [{ name: "SMS credits", color: "#12b5a6", points: points.map((p) => ({ label: p.label, value: p.sms })) }] : []),
  ];
  const campaigns = (u?.byCampaign ?? []).filter((c) => campaign === "all" || c.label === campaign);

  return (
    <div className="fm-page">
      <PageHeader title="Credit usage" description={`Where ${currentBusiness?.name ?? "this workspace"}'s credits go.`} actions={isMock ? <DemoBadge /> : undefined} />
      <Toolbar>
        <FilterSelect label="Workspace" value={id} onChange={switchBusiness} options={businesses.map((b) => ({ value: b.id, label: b.name }))} />
        <FilterSelect label="Date" value={days} onChange={setDays} options={[{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }]} />
        <FilterSelect label="Channel" value={channel} onChange={(v) => setChannel(v as Channel)} options={[{ value: "all", label: "Email and SMS" }, { value: "email", label: "Email only" }, { value: "sms", label: "SMS only" }]} />
        <FilterSelect label="Campaign" value={campaign} onChange={setCampaign} options={[{ value: "all", label: "All campaigns" }, ...(u?.byCampaign ?? []).map((c) => ({ value: c.label, label: c.label }))]} />
        <span className="fm-toolbar__spacer" />
        <Segmented<Grain> label="Group by" value={grain} onChange={setGrain} options={[{ id: "daily", label: "Daily" }, { id: "weekly", label: "Weekly" }, { id: "monthly", label: "Monthly" }]} />
      </Toolbar>
      {!u ? <Skeleton height={400} /> : (
        <>
          <StatStrip>
            <Stat label="Email credits used" value={formatNumber(u.totals.email)} />
            <Stat label="SMS credits used" value={formatNumber(u.totals.sms)} />
            <Stat label="Combined" value={formatNumber(u.totals.email + u.totals.sms)} />
            <Stat label="Busiest channel" value={u.byChannel.slice().sort((a, b) => b.email + b.sms - (a.email + a.sms))[0]?.label ?? "—"} />
          </StatStrip>
          <Panel title="Combined marketing usage"><AnalyticsChart title="Credit usage over time" type={grain === "daily" ? "area" : "bar"} series={series} /></Panel>
          <div className="fm-grid fm-grid--three">
            <Panel title="By campaign">{campaigns.length ? <BarList items={campaigns.map((c) => ({ label: c.label, value: c.email }))} /> : <p className="fm-muted">No campaign usage.</p>}</Panel>
            <Panel title="By automation">{u.byAutomation.length ? <BarList items={u.byAutomation.map((c) => ({ label: c.label, value: c.email + c.sms }))} color="#7c5cff" /> : <p className="fm-muted">No automation usage.</p>}</Panel>
            <Panel title="By channel"><DonutChart items={u.byChannel.map((c) => ({ label: c.label, value: c.email + c.sms }))} label="Usage by channel" format="number" /></Panel>
          </div>
          {can("billing.manage_client_credits") && byClient.data && byClient.data.length > 0 && (
            <Panel title="By client" description="Agency view across all workspaces">
              <AnalyticsChart title="Credit usage by client" type="bar" series={[
                { name: "Email", points: byClient.data.map((c) => ({ label: c.label.split(" ")[0], value: c.email })) },
                { name: "SMS", points: byClient.data.map((c) => ({ label: c.label.split(" ")[0], value: c.sms })) },
              ]} />
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
