import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { CreditChannel } from "../../types/platform.types";
import { useAsync } from "../../hooks/useAsync";
import { useCredits } from "../../hooks/useCredits";
import { useMarketingWorkspace } from "../../hooks/useMarketingWorkspace";
import { plansApi } from "../../services/plansApi";
import { CreditMeter } from "../../components/CreditMeter";
import { PurchaseCreditsModal } from "../../components/PurchaseCreditsModal";
import { Button } from "../../components/ui/Button";
import { PageHeader, Panel } from "../../components/ui/Layout";
import { Notice, Skeleton } from "../../components/ui/Feedback";
import { Segmented } from "../../components/ui/Tabs";
import { Icon } from "../../components/ui/Icon";
import { CHANNEL_NAME, formatMoney } from "../../utils/credits";
import { formatNumber } from "../../utils/format";

export default function PurchaseCreditsPage() {
  const [params, setParams] = useSearchParams();
  const channel: CreditChannel = params.get("type") === "sms" ? "sms" : "email";
  const { currentBusiness } = useMarketingWorkspace();
  const id = currentBusiness?.id ?? "";
  const credits = useCredits(id);
  const packages = useAsync(() => plansApi.listPackages(channel), [channel]);
  const [open, setOpen] = useState(false);

  return (
    <div className="fm-page">
      <PageHeader title="Buy credits" description={`Add credits to ${currentBusiness?.name ?? "this workspace"}. Purchased credits don't expire at renewal.`} />
      <Segmented<CreditChannel> label="Credit type" value={channel} onChange={(c) => setParams({ type: c })} options={[{ id: "email", label: "Email credits", icon: <Icon name="mail" size={14} /> }, { id: "sms", label: "SMS credits", icon: <Icon name="message" size={14} /> }]} />
      <div className="fm-grid fm-grid--main">
        <Panel title={`${CHANNEL_NAME[channel]} packages`} className="fm-span-2">
          {!packages.data ? <Skeleton height={220} /> : (
            <div className="fm-packages is-wide">
              {packages.data.map((p) => (
                <div key={p.packageId} className="fm-package is-static">
                  <strong>{formatNumber(p.credits)}</strong>
                  <span>{CHANNEL_NAME[p.channel]} credits</span>
                  <em>{formatMoney(p.price, "Price on checkout")}</em>
                  {(p.bestValue || p.label) && <span className="fm-package__tag">{p.bestValue ? "Best value" : p.label}</span>}
                  <Button size="sm" variant="primary" onClick={() => setOpen(true)}>Choose</Button>
                </div>
              ))}
            </div>
          )}
          <Notice icon="lock">Checkout happens on Stripe's secure page. Package sizes and prices come from your Fockis account and may change.</Notice>
        </Panel>
        <Panel title="Your balance">{credits.data ? <CreditMeter balance={credits.data} channel={channel} thresholds={credits.thresholds} /> : <Skeleton height={140} />}</Panel>
      </div>
      {currentBusiness && <PurchaseCreditsModal open={open} businessId={id} businessName={currentBusiness.name} initialChannel={channel} onClose={() => setOpen(false)} onPurchased={credits.reload} />}
    </div>
  );
}
