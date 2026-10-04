import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { CreditChannel } from "../../types/platform.types";
import { useAsync } from "../../hooks/useAsync";
import { useCredits } from "../../hooks/useCredits";
import { useMailchimp } from "../../hooks/useMailchimp";
import { useMarketingWorkspace } from "../../hooks/useMarketingWorkspace";
import { plansApi } from "../../services/plansApi";
import { transactionsApi } from "../../services/transactionsApi";
import { CreditAlert, CreditMeter } from "../../components/CreditMeter";
import { PurchaseCreditsModal } from "../../components/PurchaseCreditsModal";
import { TransactionTable } from "../../components/TransactionTable";
import { MARKETING_ROUTES } from "../../components/navigation";
import { Badge, DemoBadge } from "../../components/ui/Badge";
import { Button, LinkButton } from "../../components/ui/Button";
import { PageHeader, Panel } from "../../components/ui/Layout";
import { ErrorState, Notice, Skeleton } from "../../components/ui/Feedback";
import { formatMoney, planCredits } from "../../utils/credits";
import { formatDate } from "../../utils/format";

export default function BillingOverviewPage() {
  const { isMock } = useMailchimp();
  const { currentBusiness } = useMarketingWorkspace();
  const [params] = useSearchParams();
  const id = currentBusiness?.id ?? "";
  const credits = useCredits(id);
  const plan = useAsync(() => (credits.data ? plansApi.getPlan(credits.data.planId) : Promise.reject(new Error("Loading"))), [credits.data?.planId]);
  const txns = useAsync(() => transactionsApi.list(id), [id, credits.data?.emailCreditsRemaining, credits.data?.smsCreditsRemaining]);
  const [buy, setBuy] = useState<CreditChannel | null>(null);

  const b = credits.data;
  const p = plan.data;

  return (
    <div className="fm-page">
      <PageHeader
        title="Billing & credits"
        description={`Plan and credit balance for ${currentBusiness?.name ?? "this workspace"}. Each workspace has its own balance.`}
        actions={<>{isMock && <DemoBadge />}<Button icon="mail" onClick={() => setBuy("email")}>Buy email credits</Button><Button icon="message" onClick={() => setBuy("sms")}>Buy SMS credits</Button><LinkButton to={MARKETING_ROUTES.plans} variant="primary" icon="star">Upgrade plan</LinkButton></>}
      />
      {params.get("checkout") === "success" && <Notice tone="success">Payment received. Credits appear here as soon as Stripe confirms it.</Notice>}
      {credits.error ? <ErrorState message={credits.error} onRetry={credits.reload} /> : !b ? <Skeleton height={260} /> : (
        <>
          <CreditAlert balance={b} channel="email" thresholds={credits.thresholds} onBuy={() => setBuy("email")} />
          <CreditAlert balance={b} channel="sms" thresholds={credits.thresholds} onBuy={() => setBuy("sms")} />
          <div className="fm-billgrid">
            <section className="fm-plancard">
              <div className="fm-plancard__top">
                <span className="fm-plancard__label">Current plan</span>
                {b.billingStatus !== "active" && <Badge tone={b.billingStatus === "past_due" ? "red" : "blue"} dot>{b.billingStatus === "past_due" ? "Payment past due" : b.billingStatus === "trialing" ? "Trial" : b.billingStatus}</Badge>}
              </div>
              <h2>{p?.planName ?? "…"}</h2>
              <p className="fm-plancard__price">{p ? formatMoney(p.price) : ""}{p?.price && <span> / {p.billingCycle === "monthly" ? "month" : p.billingCycle}</span>}</p>
              <ul>
                <li>{p ? planCredits(p, "email") : "…"} email credits per cycle</li>
                <li>{p ? planCredits(p, "sms") : "…"} SMS credits per cycle</li>
                <li>Renews {formatDate(b.renewalDate)}</li>
              </ul>
              <div className="fm-row fm-row--wrap">
                <LinkButton to={MARKETING_ROUTES.plans} size="sm">Compare plans</LinkButton>
                <LinkButton to={MARKETING_ROUTES.history} size="sm" variant="ghost">Billing history</LinkButton>
              </div>
              {b.billingStatus === "past_due" && <Notice tone="warning">The last payment failed. <Link to={MARKETING_ROUTES.paymentMethods}>Update the payment method</Link> to keep sending.</Notice>}
            </section>
            <Panel title="Email credits" actions={<Link className="fm-linkbtn" to={MARKETING_ROUTES.emailCredits}>Details</Link>}>
              <CreditMeter balance={b} channel="email" thresholds={credits.thresholds} />
              <Button size="sm" icon="plus" onClick={() => setBuy("email")}>Buy email credits</Button>
            </Panel>
            <Panel title="SMS credits" actions={<Link className="fm-linkbtn" to={MARKETING_ROUTES.smsCredits}>Details</Link>}>
              <CreditMeter balance={b} channel="sms" thresholds={credits.thresholds} />
              <Button size="sm" icon="plus" onClick={() => setBuy("sms")}>Buy SMS credits</Button>
            </Panel>
          </div>
          <Panel title="How credits work">
            <ul className="fm-plainlist">
              <li>One email credit sends one email to one contact. One SMS credit sends one 160-character text segment.</li>
              <li>Plan credits refresh on your renewal date. Purchased credits carry over.</li>
              <li>Campaigns check your balance before sending and won't send if you're short.</li>
            </ul>
          </Panel>
        </>
      )}
      <Panel title="Recent transactions" flush actions={<LinkButton size="sm" variant="ghost" to={MARKETING_ROUTES.transactions}>All transactions</LinkButton>}>
        {txns.data ? <TransactionTable rows={txns.data.slice(0, 6)} /> : <Skeleton height={160} />}
      </Panel>
      {currentBusiness && <PurchaseCreditsModal open={Boolean(buy)} businessId={id} businessName={currentBusiness.name} initialChannel={buy ?? "email"} onClose={() => setBuy(null)} onPurchased={credits.reload} />}
    </div>
  );
}
