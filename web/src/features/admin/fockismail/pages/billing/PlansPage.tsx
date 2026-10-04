import { useState } from "react";
import type { MarketingPlan } from "../../types/platform.types";
import { useAsync } from "../../hooks/useAsync";
import { useCredits } from "../../hooks/useCredits";
import { useAction, useMailchimp } from "../../hooks/useMailchimp";
import { useMarketingWorkspace } from "../../hooks/useMarketingWorkspace";
import { plansApi } from "../../services/plansApi";
import { billingApi } from "../../services/billingApi";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { PageHeader, Panel } from "../../components/ui/Layout";
import { Notice, SkeletonCards } from "../../components/ui/Feedback";
import { Modal } from "../../components/ui/Overlay";
import { Icon } from "../../components/ui/Icon";
import { formatMoney, planCredits } from "../../utils/credits";
import { cx, formatNumber } from "../../utils/format";

export default function PlansPage() {
  const run = useAction();
  const { isMock, toast } = useMailchimp();
  const { currentBusiness } = useMarketingWorkspace();
  const id = currentBusiness?.id ?? "";
  const credits = useCredits(id);
  const plans = useAsync(() => plansApi.listPlans(id), [id]);
  const [target, setTarget] = useState<MarketingPlan | null>(null);
  const [busy, setBusy] = useState(false);

  const current = plans.data?.find((p) => p.planId === credits.data?.planId);
  const direction = (p: MarketingPlan) => (!current ? "Switch" : p.rank > current.rank ? "Upgrade" : p.rank < current.rank ? "Downgrade" : "Switch");
  const used = credits.data?.emailCreditsUsed ?? 0;

  const change = async () => {
    if (!target) return;
    if (!target.price) {
      toast("This plan is priced by the Fockis team. We'll contact you.", "info");
      setTarget(null);
      return;
    }
    setBusy(true);
    const session = await run(() => billingApi.changePlan(id, target));
    if (session?.mode === "redirect" && session.url) {
      window.location.assign(session.url);
      return;
    }
    if (session?.mode === "mock") {
      const ok = await run(() => billingApi.completeMockCheckout(id, { kind: "plan", planId: target.planId }), `${currentBusiness?.name} is now on ${target.planName}${isMock ? " (demo)" : ""}.`);
      if (ok) {
        credits.reload();
        plans.reload();
        setTarget(null);
      }
    }
    setBusy(false);
  };

  const rows: Array<[string, (p: MarketingPlan) => string]> = [
    ["Email credits / month", (p) => planCredits(p, "email")],
    ["SMS credits / month", (p) => planCredits(p, "sms")],
    ["Contacts", (p) => (p.limits.contacts === null ? "Unlimited" : formatNumber(p.limits.contacts))],
    ["Team seats", (p) => (p.limits.seats === null ? "Unlimited" : String(p.limits.seats))],
    ["Workspaces", (p) => (p.limits.workspaces === null ? "Unlimited" : String(p.limits.workspaces))],
  ];

  return (
    <div className="fm-page">
      <PageHeader title="Plans" description={`Choose the plan for ${currentBusiness?.name ?? "this workspace"}. You can change at any time.`} />
      {plans.loading || !plans.data ? <SkeletonCards count={4} height={360} /> : (
        <>
          <div className="fm-plangrid">
            {plans.data.map((p) => {
              const isCurrent = p.planId === current?.planId;
              return (
                <article key={p.planId} className={cx("fm-planopt", p.highlighted && "is-highlighted", isCurrent && "is-current")}>
                  <header>
                    <h2>{p.planName}</h2>
                    {isCurrent ? <Badge tone="blue">Current plan</Badge> : p.highlighted ? <Badge tone="violet">Most popular</Badge> : p.kind !== "standard" && p.kind !== "enterprise" ? <Badge>{p.kind.replace("_", " ")}</Badge> : null}
                  </header>
                  <p className="fm-planopt__desc">{p.description}</p>
                  <p className="fm-planopt__price">{formatMoney(p.price)}{p.price && <span>/ month</span>}</p>
                  <ul>{p.features.map((f) => <li key={f}><Icon name="check" size={14} /> {f}</li>)}</ul>
                  {isCurrent ? <Button disabled>Your plan</Button> : (
                    <Button variant={direction(p) === "Upgrade" ? "primary" : "secondary"} onClick={() => setTarget(p)}>
                      {p.price ? `${direction(p)} to ${p.planName}` : "Contact sales"}
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
          <Panel title="Compare plans" flush>
            <div className="fm-tablewrap"><table className="fm-table fm-table--compare">
              <thead><tr><th scope="col">Feature</th>{plans.data.map((p) => <th key={p.planId} scope="col" className="is-num">{p.planName}</th>)}</tr></thead>
              <tbody>
                {rows.map(([label, fn]) => <tr key={label}><th scope="row">{label}</th>{plans.data?.map((p) => <td key={p.planId} className="is-num">{fn(p)}</td>)}</tr>)}
                <tr><th scope="row">Price</th>{plans.data.map((p) => <td key={p.planId} className="is-num">{formatMoney(p.price)}</td>)}</tr>
              </tbody>
            </table></div>
          </Panel>
          <Notice>Plans, prices, and credit amounts come from your Fockis account. Agencies can create custom plans for individual clients.</Notice>
        </>
      )}

      <Modal open={Boolean(target)} title={target ? `${direction(target)} to ${target.planName}?` : ""} size="sm" onClose={() => setTarget(null)}
        footer={target && <><Button onClick={() => setTarget(null)}>Cancel</Button><Button variant="primary" loading={busy} onClick={change}>{target.price ? `Confirm ${direction(target).toLowerCase()}` : "Request a call"}</Button></>}
      >
        {target && current && (
          <>
            <dl className="fm-deflist">
              <div><dt>From</dt><dd>{current.planName} · {formatMoney(current.price)}</dd></div>
              <div><dt>To</dt><dd>{target.planName} · {formatMoney(target.price)}</dd></div>
              <div><dt>Email credits</dt><dd>{planCredits(current, "email")} → {planCredits(target, "email")}</dd></div>
              <div><dt>SMS credits</dt><dd>{planCredits(current, "sms")} → {planCredits(target, "sms")}</dd></div>
            </dl>
            {direction(target) === "Downgrade" && used > target.emailCreditsIncluded && <Notice tone="warning">You've already used {formatNumber(used)} email credits this cycle, more than {target.planName} includes. You'll have only purchased credits left until renewal.</Notice>}
            <Notice>{direction(target) === "Upgrade" ? "You'll be charged a prorated amount today through Stripe." : "The change applies right away. Any credit is applied to your next invoice."}{isMock && " Demo mode: nothing is charged."}</Notice>
          </>
        )}
      </Modal>
    </div>
  );
}
