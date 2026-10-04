import { useState } from "react";
import type { TransactionalTemplate } from "../types/mailchimp.types";
import { useAsync } from "../hooks/useAsync";
import { useAction, useMailchimp } from "../hooks/useMailchimp";
import { channelsApi } from "../services/channelsApi";
import { Badge, DemoBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { PageHeader, Panel, Stat, StatStrip } from "../components/ui/Layout";
import { EmptyState, ErrorState, Notice, ProgressBar, SkeletonRows } from "../components/ui/Feedback";
import { ActionMenu } from "../components/ui/Menu";
import { Drawer } from "../components/ui/Overlay";
import { formatDate, formatNumber, formatPercent, rate } from "../utils/format";
import type { Tone } from "../utils/labels";

const STATUS_TONE: Record<TransactionalTemplate["status"], Tone> = { active: "green", paused: "amber", draft: "neutral" };

export default function TransactionalEmailPage() {
  const list = useAsync(() => channelsApi.transactional(), []);
  const run = useAction();
  const { isMock, toast } = useMailchimp();
  const [open, setOpen] = useState<TransactionalTemplate | null>(null);
  const data = list.data ?? [];
  const totals = data.reduce((s, t) => ({ sent: s.sent + t.sent, delivered: s.delivered + t.delivered, failed: s.failed + t.failed }), { sent: 0, delivered: 0, failed: 0 });

  const setStatus = async (t: TransactionalTemplate, status: TransactionalTemplate["status"]) => {
    if (await run(() => channelsApi.setTransactionalStatus(t.id, status), status === "active" ? `“${t.name}” is on.` : `Paused “${t.name}”. Fockis falls back to its default message.`)) list.reload();
  };

  return (
    <div className="fm-page">
      <PageHeader title="Transactional email" description="Receipts, confirmations, and account emails Fockis sends when something happens." actions={isMock ? <DemoBadge /> : undefined} />
      <StatStrip>
        <Stat label="Sent (30 days)" value={formatNumber(totals.sent)} />
        <Stat label="Delivered" value={formatPercent(rate(totals.delivered, totals.sent), 2)} sub={formatNumber(totals.delivered)} />
        <Stat label="Failed" value={formatNumber(totals.failed)} sub={formatPercent(rate(totals.failed, totals.sent), 2)} />
      </StatStrip>
      <Panel flush>
        {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.loading ? <SkeletonRows rows={8} cols={6} /> : data.length === 0 ? (
          <EmptyState icon="receipt" title="No transactional templates" body="The backend registers a template for each Fockis event that sends email." />
        ) : (
          <div className="fm-tablewrap">
            <table className="fm-table">
              <thead><tr><th scope="col">Template</th><th scope="col">Status</th><th scope="col" className="is-num">Sent</th><th scope="col" className="is-num">Delivered</th><th scope="col" className="is-num">Failed</th><th scope="col">Delivery</th><th scope="col"><span className="fm-sr">Actions</span></th></tr></thead>
              <tbody>{data.map((t) => {
                const d = rate(t.delivered, t.sent);
                return (
                  <tr key={t.id}>
                    <td className="fm-table__primary"><button type="button" className="fm-linkbtn" onClick={() => setOpen(t)}>{t.name}</button><span className="fm-table__sub"><code>{t.event}</code></span></td>
                    <td><Badge tone={STATUS_TONE[t.status]} dot>{t.status[0].toUpperCase() + t.status.slice(1)}</Badge></td>
                    <td className="is-num">{formatNumber(t.sent)}</td>
                    <td className="is-num">{formatNumber(t.delivered)}</td>
                    <td className="is-num">{formatNumber(t.failed)}</td>
                    <td className="fm-w-160">{t.sent ? <><ProgressBar value={d} tone={d > 99 ? "green" : d > 97 ? "amber" : "red"} label={`${t.name} delivery rate`} /> <small className="fm-muted">{formatPercent(d, 2)}</small></> : "—"}</td>
                    <td className="is-actions">
                      <ActionMenu label={`Actions for ${t.name}`} items={[
                        { label: "View details", icon: "eye", onSelect: () => setOpen(t) },
                        { label: "Send test", icon: "mail", onSelect: () => toast(isMock ? "Demo mode: no test was sent." : "Test sent to your account email.", "info") },
                        t.status === "active" ? { label: "Pause", icon: "pause", onSelect: () => setStatus(t, "paused") } : { label: "Turn on", icon: "play", onSelect: () => setStatus(t, "active") },
                      ]} />
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </Panel>

      <Drawer open={Boolean(open)} title={open?.name ?? ""} onClose={() => setOpen(null)} footer={<Button onClick={() => setOpen(null)}>Close</Button>}>
        {open && (
          <>
            <dl className="fm-deflist">
              <div><dt>Event</dt><dd><code>{open.event}</code></dd></div>
              <div><dt>Status</dt><dd>{open.status}</dd></div>
              <div><dt>Last edited</dt><dd>{formatDate(open.updatedAt)}</dd></div>
              <div><dt>Delivered</dt><dd>{formatNumber(open.delivered)} of {formatNumber(open.sent)}</dd></div>
            </dl>
            <h4 className="fm-subhead">Sample payload</h4>
            <pre className="fm-code"><code>{JSON.stringify({ event: open.event, to: "member@example.com", data: { name: "Amara", orderId: "FK-10293" } }, null, 2)}</code></pre>
            <Notice>Fockis services trigger these emails from the backend. The frontend never holds SMTP or provider credentials.</Notice>
          </>
        )}
      </Drawer>
    </div>
  );
}
