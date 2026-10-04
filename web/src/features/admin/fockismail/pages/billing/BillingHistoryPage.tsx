import { useAsync } from "../../hooks/useAsync";
import { useMarketingWorkspace } from "../../hooks/useMarketingWorkspace";
import { billingApi } from "../../services/billingApi";
import { Badge } from "../../components/ui/Badge";
import { PageHeader, Panel } from "../../components/ui/Layout";
import { EmptyState, Notice, SkeletonRows } from "../../components/ui/Feedback";
import { formatMoney } from "../../utils/credits";
import { formatDate } from "../../utils/format";
import type { Tone } from "../../utils/labels";
import type { Invoice } from "../../types/platform.types";

const TONE: Record<Invoice["status"], Tone> = { paid: "green", open: "amber", failed: "red", refunded: "violet", void: "neutral" };

export default function BillingHistoryPage() {
  const { currentBusiness } = useMarketingWorkspace();
  const invoices = useAsync(() => billingApi.getInvoices(currentBusiness?.id ?? ""), [currentBusiness?.id]);
  return (
    <div className="fm-page">
      <PageHeader title="Billing history" description="Invoices and receipts for this workspace." />
      <Panel flush>
        {invoices.loading ? <SkeletonRows rows={5} cols={5} /> : !invoices.data?.length ? <EmptyState icon="receipt" title="No invoices yet" body="Invoices appear after your first payment." /> : (
          <div className="fm-tablewrap"><table className="fm-table">
            <thead><tr><th scope="col">Date</th><th scope="col">Invoice</th><th scope="col">Description</th><th scope="col" className="is-num">Amount</th><th scope="col">Status</th><th scope="col"><span className="fm-sr">Download</span></th></tr></thead>
            <tbody>{invoices.data.map((i) => (
              <tr key={i.id}>
                <td>{formatDate(i.issuedAt)}</td><td><code>{i.number}</code></td><td>{i.description}</td>
                <td className="is-num">{formatMoney(i.amount)}</td>
                <td><Badge tone={TONE[i.status]} dot>{i.status[0].toUpperCase() + i.status.slice(1)}</Badge></td>
                <td className="is-actions">{i.hostedUrl ? <a href={i.hostedUrl} target="_blank" rel="noreferrer">View</a> : <span className="fm-muted fm-small">PDF via Stripe</span>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Panel>
      <Notice>Downloadable invoices come from Stripe once the billing backend is connected.</Notice>
    </div>
  );
}
