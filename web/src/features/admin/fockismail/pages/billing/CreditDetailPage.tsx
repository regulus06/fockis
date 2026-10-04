import { useState } from "react";
import type { CreditChannel } from "../../types/platform.types";
import { useAsync } from "../../hooks/useAsync";
import { useCredits } from "../../hooks/useCredits";
import { useMarketingWorkspace } from "../../hooks/useMarketingWorkspace";
import { transactionsApi } from "../../services/transactionsApi";
import { CreditAlert, CreditMeter } from "../../components/CreditMeter";
import { PurchaseCreditsModal } from "../../components/PurchaseCreditsModal";
import { TransactionTable } from "../../components/TransactionTable";
import { AnalyticsChart, BarList } from "../../components/AnalyticsChart";
import { MARKETING_ROUTES } from "../../components/navigation";
import { Button, LinkButton } from "../../components/ui/Button";
import { PageHeader, Panel } from "../../components/ui/Layout";
import { Skeleton } from "../../components/ui/Feedback";
import { CHANNEL_NAME } from "../../utils/credits";

export default function CreditDetailPage({ channel }: { channel: CreditChannel }) {
  const { currentBusiness } = useMarketingWorkspace();
  const id = currentBusiness?.id ?? "";
  const credits = useCredits(id);
  const usage = useAsync(() => transactionsApi.usage(id, 30), [id, credits.data?.emailCreditsRemaining]);
  const txns = useAsync(() => transactionsApi.list(id, { channel }), [id, channel, credits.data?.emailCreditsRemaining, credits.data?.smsCreditsRemaining]);
  const [buy, setBuy] = useState(false);
  const name = CHANNEL_NAME[channel];
  const key = channel === "email" ? "email" : "sms";

  return (
    <div className="fm-page">
      <PageHeader title={`${name} credits`} description={channel === "email" ? "One credit sends one email to one contact." : "One credit sends one SMS segment (up to 160 characters) to one subscriber."} actions={<><LinkButton to={MARKETING_ROUTES.plans}>Upgrade plan</LinkButton><Button variant="primary" icon="plus" onClick={() => setBuy(true)}>Buy {name} credits</Button></>} />
      {!credits.data ? <Skeleton height={200} /> : (
        <>
          <CreditAlert balance={credits.data} channel={channel} thresholds={credits.thresholds} onBuy={() => setBuy(true)} />
          <div className="fm-grid fm-grid--main">
            <Panel title="Balance"><CreditMeter balance={credits.data} channel={channel} thresholds={credits.thresholds} /></Panel>
            <Panel title="Daily usage" description="Last 30 days" className="fm-span-2">
              {usage.data ? <AnalyticsChart title={`${name} credit usage`} type="bar" series={[{ name: `${name} credits`, color: channel === "email" ? "#1f5eff" : "#12b5a6", points: usage.data.daily.map((d) => ({ label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: d[key] })) }]} /> : <Skeleton height={220} />}
            </Panel>
          </div>
          {usage.data && (
            <div className="fm-grid fm-grid--two">
              <Panel title="By campaign">{usage.data.byCampaign.length ? <BarList items={usage.data.byCampaign.map((u) => ({ label: u.label, value: u[key] })).filter((x) => x.value > 0)} /> : <p className="fm-muted">No campaign usage yet.</p>}</Panel>
              <Panel title="By automation">{usage.data.byAutomation.length ? <BarList items={usage.data.byAutomation.map((u) => ({ label: u.label, value: u[key] }))} color="#7c5cff" /> : <p className="fm-muted">No automation usage yet.</p>}</Panel>
            </div>
          )}
        </>
      )}
      <Panel title={`${name} credit history`} flush>{txns.data ? <TransactionTable rows={txns.data} /> : <Skeleton height={160} />}</Panel>
      {currentBusiness && <PurchaseCreditsModal open={buy} businessId={id} businessName={currentBusiness.name} initialChannel={channel} onClose={() => setBuy(false)} onPurchased={credits.reload} />}
    </div>
  );
}
