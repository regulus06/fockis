import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CreditBalance, CreditChannel } from "../../types/platform.types";
import { useAsync } from "../../hooks/useAsync";
import { useMarketingWorkspace, useViewer } from "../../hooks/useMarketingWorkspace";
import { creditsApi } from "../../services/creditsApi";
import { plansApi } from "../../services/plansApi";
import { transactionsApi } from "../../services/transactionsApi";
import { BusinessMark } from "../../components/WorkspaceSwitcher";
import { PurchaseCreditsModal } from "../../components/PurchaseCreditsModal";
import { MARKETING_ROUTES } from "../../components/navigation";
import { BarList } from "../../components/AnalyticsChart";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { PageHeader, Panel, Stat, StatStrip } from "../../components/ui/Layout";
import { EmptyState, Notice, ProgressBar, SkeletonRows } from "../../components/ui/Feedback";
import { ActionMenu } from "../../components/ui/Menu";
import { Tabs } from "../../components/ui/Tabs";
import { creditThresholds } from "../../data/billingMockData";
import { includedOf, levelOf, remainingOf } from "../../utils/credits";
import { formatDate, formatNumber } from "../../utils/format";
import type { Tone } from "../../utils/labels";

type Filter = "all" | "low" | "past_due";

export default function AgencyBillingPage() {
  const { can } = useViewer();
  const navigate = useNavigate();
  const { businesses, switchBusiness } = useMarketingWorkspace();
  const balances = useAsync(() => creditsApi.listClientBalances(), []);
  const plans = useAsync(() => plansApi.listAllPlans(), []);
  const usage = useAsync(() => transactionsApi.usageByClient(30), []);
  const [filter, setFilter] = useState<Filter>("all");
  const [buy, setBuy] = useState<{ b: CreditBalance; channel: CreditChannel } | null>(null);

  if (!can("billing.manage_client_credits")) {
    return <div className="fm-page"><EmptyState icon="lock" title="You can't manage client credits" body="Ask an agency admin for the billing permission." /></div>;
  }

  const biz = (id: string) => businesses.find((b) => b.id === id);
  const level = (b: CreditBalance) => {
    const e = levelOf(b, "email", creditThresholds);
    const s = levelOf(b, "sms", creditThresholds);
    return e === "critical" || s === "critical" ? "critical" : e === "low" || s === "low" ? "low" : "normal";
  };
  const data = (balances.data ?? []).filter((b) => !biz(b.businessId)?.isAgencyOwner);
  const rows = data.filter((b) => filter === "all" || (filter === "low" ? level(b) !== "normal" : b.billingStatus === "past_due"));
  const statusLabel = (b: CreditBalance): [string, Tone] => {
    if (b.billingStatus === "past_due") return ["Payment past due", "red"];
    const l = level(b);
    return l === "critical" ? ["Credits exhausted", "red"] : l === "low" ? ["Low credits", "amber"] : ["Active", "green"];
  };
  const open = (id: string, path: string) => { switchBusiness(id); navigate(path); };

  return (
    <div className="fm-page">
      <PageHeader title="Client credits" description="Plans, credit balances, and billing health for every client." />
      <Notice>Only people with the client-billing permission see this page. That check is cosmetic until the backend enforces it.</Notice>
      <StatStrip>
        <Stat label="Clients" value={data.length} />
        <Stat label="Low or exhausted" value={data.filter((b) => level(b) !== "normal").length} />
        <Stat label="Payment past due" value={data.filter((b) => b.billingStatus === "past_due").length} />
        <Stat label="Email credits left (all clients)" value={formatNumber(data.reduce((n, b) => n + b.emailCreditsRemaining, 0))} />
      </StatStrip>
      <Tabs<Filter> label="Filter" value={filter} onChange={setFilter} items={[{ id: "all", label: "All clients" }, { id: "low", label: "Low credits" }, { id: "past_due", label: "Past due" }]} />
      <Panel flush>
        {balances.loading ? <SkeletonRows rows={6} cols={6} /> : rows.length === 0 ? <EmptyState icon="check" title="Everyone's in good shape" body="No clients match this filter." /> : (
          <div className="fm-tablewrap"><table className="fm-table">
            <thead><tr><th scope="col">Client</th><th scope="col">Plan</th><th scope="col">Email remaining</th><th scope="col">SMS remaining</th><th scope="col">Renews</th><th scope="col">Status</th><th scope="col"><span className="fm-sr">Actions</span></th></tr></thead>
            <tbody>{rows.map((bal) => {
              const b = biz(bal.businessId);
              if (!b) return null;
              const [label, tone] = statusLabel(bal);
              const plan = plans.data?.find((p) => p.planId === bal.planId);
              return (
                <tr key={bal.businessId}>
                  <td className="fm-table__primary"><div className="fm-person"><BusinessMark business={b} size={28} /><Link to={MARKETING_ROUTES.client(b.id)}>{b.name}</Link></div></td>
                  <td>{plan?.planName ?? "—"}{plan && plan.kind !== "standard" && <span className="fm-table__sub">{plan.kind.replace("_", " ")}</span>}</td>
                  {(["email", "sms"] as CreditChannel[]).map((ch) => {
                    const l = levelOf(bal, ch, creditThresholds);
                    return (
                      <td key={ch} className="fm-w-160">
                        <span className="fm-tnum">{formatNumber(remainingOf(bal, ch))}</span> <small className="fm-muted">/ {formatNumber(includedOf(bal, ch))}</small>
                        <ProgressBar value={(remainingOf(bal, ch) / Math.max(1, includedOf(bal, ch))) * 100} tone={l === "critical" ? "red" : l === "low" ? "amber" : "green"} label={`${b.name} ${ch} credits`} />
                      </td>
                    );
                  })}
                  <td>{formatDate(bal.renewalDate)}</td>
                  <td><Badge tone={tone} dot>{label}</Badge></td>
                  <td className="is-actions">
                    <ActionMenu label={`Actions for ${b.name}`} items={[
                      { label: "Buy email credits", icon: "mail", onSelect: () => setBuy({ b: bal, channel: "email" }) },
                      { label: "Buy SMS credits", icon: "message", onSelect: () => setBuy({ b: bal, channel: "sms" }) },
                      { label: "Change plan", icon: "star", onSelect: () => open(b.id, MARKETING_ROUTES.plans) },
                      { label: "View usage", icon: "chart", onSelect: () => open(b.id, MARKETING_ROUTES.usage) },
                      { label: "Adjust or custom plan", icon: "edit", onSelect: () => navigate(`${MARKETING_ROUTES.client(b.id)}?tab=credits`) },
                    ]} />
                  </td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </Panel>
      <div className="fm-grid fm-grid--two">
        <Panel title="Email credits used by client" description="Last 30 days">{usage.data ? <BarList items={usage.data.map((u) => ({ label: u.label, value: u.email }))} /> : <SkeletonRows rows={4} cols={2} />}</Panel>
        <Panel title="SMS credits used by client" description="Last 30 days">{usage.data ? <BarList items={usage.data.map((u) => ({ label: u.label, value: u.sms }))} color="#12b5a6" /> : <SkeletonRows rows={4} cols={2} />}</Panel>
      </div>
      {buy && biz(buy.b.businessId) && (
        <PurchaseCreditsModal open businessId={buy.b.businessId} businessName={biz(buy.b.businessId)?.name ?? ""} initialChannel={buy.channel} onClose={() => setBuy(null)} onPurchased={balances.reload} />
      )}
      <p className="fm-small fm-muted"><Button size="sm" variant="ghost" onClick={() => navigate(MARKETING_ROUTES.plans)}>Compare plans</Button></p>
    </div>
  );
}
