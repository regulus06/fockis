import { useAsync } from "../../hooks/useAsync";
import { useAction, useMailchimp } from "../../hooks/useMailchimp";
import { useMarketingWorkspace } from "../../hooks/useMarketingWorkspace";
import { billingApi } from "../../services/billingApi";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { PageHeader, Panel } from "../../components/ui/Layout";
import { EmptyState, Notice, SkeletonRows } from "../../components/ui/Feedback";
import { ActionMenu } from "../../components/ui/Menu";
import { Icon } from "../../components/ui/Icon";

export default function PaymentMethodsPage() {
  const run = useAction();
  const { confirm, isMock } = useMailchimp();
  const { currentBusiness } = useMarketingWorkspace();
  const id = currentBusiness?.id ?? "";
  const methods = useAsync(() => billingApi.getPaymentMethods(id), [id]);
  return (
    <div className="fm-page">
      <PageHeader title="Payment methods" description="Cards used for plan renewals and credit purchases." actions={<Button variant="primary" icon="plus" onClick={async () => { if (await run(() => billingApi.addPaymentMethod(id), isMock ? "Demo card added." : "Card added.")) methods.reload(); }}>Add card</Button>} />
      <Notice icon="lock">Cards are collected by Stripe Elements on a secure form. Fockis only stores the brand and last four digits.</Notice>
      <Panel flush>
        {methods.loading ? <SkeletonRows rows={2} cols={3} /> : !methods.data?.length ? <EmptyState icon="receipt" title="No cards on file" body="Add a card to buy credits or change plans." /> : (
          <ul className="fm-cardlist">
            {methods.data.map((m) => (
              <li key={m.id}>
                <span className="fm-cardlist__brand"><Icon name="receipt" size={18} /></span>
                <div><strong>{m.brand} ending {m.last4}</strong><small>Expires {String(m.expMonth).padStart(2, "0")}/{m.expYear}</small></div>
                {m.isDefault && <Badge tone="blue">Default</Badge>}
                <ActionMenu label={`Actions for card ending ${m.last4}`} items={[
                  ...(m.isDefault ? [] : [{ label: "Make default", icon: "check" as const, onSelect: async () => { if ((await run(() => billingApi.setDefaultPaymentMethod(id, m.id), "Default card updated.")) !== undefined) methods.reload(); } }]),
                  { label: "Remove", icon: "trash", danger: true, onSelect: async () => {
                    if (!(await confirm({ title: `Remove card ending ${m.last4}?`, body: m.isDefault ? "Renewals will fail until you add another card." : undefined, confirmLabel: "Remove card", danger: true }))) return;
                    if ((await run(() => billingApi.removePaymentMethod(id, m.id), "Card removed.")) !== undefined) methods.reload();
                  } },
                ]} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
