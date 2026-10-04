import { useState } from "react";
import type { Approval, ApprovalStatus } from "../../types/platform.types";
import { useAsync } from "../../hooks/useAsync";
import { useAction } from "../../hooks/useMailchimp";
import { useMarketingWorkspace } from "../../hooks/useMarketingWorkspace";
import { agencyApi } from "../../services/agencyApi";
import { BusinessMark } from "../../components/WorkspaceSwitcher";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { PageHeader, Panel, Toolbar } from "../../components/ui/Layout";
import { FilterSelect, TextArea } from "../../components/ui/Field";
import { EmptyState, Notice, SkeletonRows } from "../../components/ui/Feedback";
import { Drawer } from "../../components/ui/Overlay";
import { Segmented, Tabs } from "../../components/ui/Tabs";
import { APPROVAL_STATUS_LABELS, APPROVAL_STATUS_TONES } from "../../utils/platformLabels";
import { CAMPAIGN_TYPE_LABELS } from "../../utils/labels";
import { cx, formatDate, formatDateTime, timeAgo } from "../../utils/format";

type Tab = "all" | ApprovalStatus;
const ORDER: ApprovalStatus[] = ["draft", "pending_approval", "changes_requested", "approved", "scheduled", "sent"];

export default function ApprovalsPage() {
  const run = useAction();
  const { businesses } = useMarketingWorkspace();
  const list = useAsync(() => agencyApi.getApprovals(), []);
  const [tab, setTab] = useState<Tab>("pending_approval");
  const [client, setClient] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [side, setSide] = useState<"agency" | "client">("agency");

  const data = list.data ?? [];
  const rows = data.filter((a) => (tab === "all" || a.status === tab) && (client === "all" || a.businessId === client));
  const current = data.find((a) => a.id === openId) ?? null;
  const biz = (id: string) => businesses.find((b) => b.id === id);

  const act = async (a: Approval, status: ApprovalStatus, message: string) => {
    const next = await run(() => agencyApi.setApprovalStatus(a.id, status, comment.trim() ? { author: side === "agency" ? "Elince M." : `${biz(a.businessId)?.name ?? "Client"} (client)`, side, body: comment.trim() } : undefined), message);
    if (next) {
      list.setData((l) => l?.map((x) => (x.id === next.id ? next : x)));
      setComment("");
    }
  };

  return (
    <div className="fm-page">
      <PageHeader title="Approvals" description="Campaigns waiting for a client to approve before they send." />
      <Tabs<Tab> label="Approval status" value={tab} onChange={setTab} items={[{ id: "all", label: "All", count: data.length }, ...ORDER.map((s) => ({ id: s as Tab, label: APPROVAL_STATUS_LABELS[s], count: data.filter((a) => a.status === s).length }))]} />
      <Toolbar>
        <FilterSelect label="Client" value={client} onChange={setClient} options={[{ value: "all", label: "All clients" }, ...businesses.filter((b) => !b.isAgencyOwner).map((b) => ({ value: b.id, label: b.name }))]} />
      </Toolbar>
      <Panel flush>
        {list.loading ? <SkeletonRows rows={5} cols={5} /> : rows.length === 0 ? <EmptyState icon="check" title="Nothing here" body="Campaigns you send for approval appear in this list." /> : (
          <ul className="fm-approvals">
            {rows.map((a) => {
              const b = biz(a.businessId);
              return (
                <li key={a.id}>
                  <button type="button" onClick={() => setOpenId(a.id)}>
                    {b && <BusinessMark business={b} size={34} />}
                    <span className="fm-approvals__main">
                      <strong>{a.campaignName}</strong>
                      <span>{b?.name} · {CAMPAIGN_TYPE_LABELS[a.campaignType]} · “{a.subject}”</span>
                    </span>
                    <span className="fm-approvals__meta">
                      <Badge tone={APPROVAL_STATUS_TONES[a.status]} dot>{APPROVAL_STATUS_LABELS[a.status]}</Badge>
                      <small>{a.comments.length} comment{a.comments.length === 1 ? "" : "s"} · {timeAgo(a.requestedAt)}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Drawer open={Boolean(current)} title={current?.campaignName ?? ""} onClose={() => { setOpenId(null); setComment(""); }} width={520}
        footer={current && (
          <div className="fm-row fm-row--wrap fm-row--end">
            {(current.status === "draft" || current.status === "changes_requested") && <Button variant="primary" icon="send" onClick={() => act(current, "pending_approval", "Sent to the client for approval.")}>Request approval</Button>}
            {current.status === "pending_approval" && (
              <>
                <Button variant="danger" icon="x" onClick={() => act(current, "draft", "Rejected. Moved back to draft.")}>Reject</Button>
                <Button icon="edit" disabled={!comment.trim()} onClick={() => act(current, "changes_requested", "Changes requested.")}>Request changes</Button>
                <Button variant="primary" icon="check" onClick={() => act(current, "approved", "Approved.")}>Approve</Button>
              </>
            )}
            {current.status === "approved" && <Button variant="primary" icon="calendar" onClick={() => act(current, "scheduled", "Scheduled.")}>Mark scheduled</Button>}
          </div>
        )}
      >
        {current && (
          <>
            <dl className="fm-deflist">
              <div><dt>Client</dt><dd>{biz(current.businessId)?.name}</dd></div>
              <div><dt>Subject</dt><dd>{current.subject}</dd></div>
              <div><dt>Type</dt><dd>{CAMPAIGN_TYPE_LABELS[current.campaignType]}</dd></div>
              <div><dt>Status</dt><dd><Badge tone={APPROVAL_STATUS_TONES[current.status]} dot>{APPROVAL_STATUS_LABELS[current.status]}</Badge></dd></div>
              <div><dt>Requested</dt><dd>{current.requestedBy}, {formatDateTime(current.requestedAt)}</dd></div>
              {current.scheduledFor && <div><dt>Sends</dt><dd>{formatDate(current.scheduledFor)}</dd></div>}
            </dl>
            <h4 className="fm-subhead">Comments</h4>
            <ul className="fm-thread">
              {current.comments.length === 0 && <li className="fm-muted fm-small">No comments yet.</li>}
              {current.comments.map((c) => (
                <li key={c.id} className={cx(c.side === "client" ? "is-client" : "is-agency")}>
                  <header><strong>{c.author}</strong><span>{c.side === "client" ? "Client" : "Agency"}</span><time>{formatDateTime(c.at)}</time></header>
                  <p>{c.body}</p>
                </li>
              ))}
            </ul>
            <Segmented<"agency" | "client"> label="Comment as" value={side} onChange={setSide} options={[{ id: "agency", label: "As agency" }, { id: "client", label: "Log client feedback" }]} />
            <TextArea label="Add a comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} hint="Comments are attached when you change the status, or post on their own." />
            <div className="fm-row fm-row--end"><Button size="sm" disabled={!comment.trim()} onClick={async () => {
              const next = await run(() => agencyApi.addApprovalComment(current.id, { author: side === "agency" ? "Elince M." : `${biz(current.businessId)?.name ?? "Client"} (client)`, side, body: comment.trim() }), "Comment added.");
              if (next) { list.setData((l) => l?.map((x) => (x.id === next.id ? next : x))); setComment(""); }
            }}>Post comment</Button></div>
            <Notice>Clients will approve from their own login once the backend supports client accounts. For now you can log their decision here.</Notice>
          </>
        )}
      </Drawer>
    </div>
  );
}
