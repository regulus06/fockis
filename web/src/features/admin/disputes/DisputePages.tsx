import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Scale, Search } from "lucide-react";

import { Pager, SmEmpty, SmError, SmLoading, formatDateTime, timeAgo, useAdminQuery } from "../support/components/SmParts";
import { useAdminAccess } from "../permissions/adminAccess";
import { PERMISSIONS } from "../permissions/permission.constants";
import { Dialog } from "../security/components/SecurityControls";
import { securityError } from "../security/securityAdminApi";
import {
  DISPUTE_REASON_LABEL,
  DISPUTE_STATUS_LABEL,
  disputesAdminApi,
  type DisputeAction,
  type DisputeStatus,
} from "./disputesAdminApi";

import "../support/styles/SupportMod.scss";
import "../security/SecurityAdmin.scss";

function tone(status: DisputeStatus): string {
  if (status === "open") return "amber";
  if (status === "under_review") return "purple";
  if (status === "closed") return "gray";
  return "green";
}

/** /admin/marketplace/disputes */
export function AdminDisputesPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");

  const query = useMemo(() => {
    const out: Record<string, string | number> = { page: Number(params.get("page") ?? 1) || 1, pageSize: 25, status: params.get("status") ?? "active" };
    const s = params.get("search");
    if (s) out.search = s;
    return out;
  }, [params]);

  const list = useAdminQuery(() => disputesAdminApi.list(query), [JSON.stringify(query)]);
  const data = list.data;

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  return (
    <div className="fksm fksec fksec-page">
      <header className="fksec-page__head">
        <div>
          <h2>Marketplace Disputes</h2>
          <p>Disputes buyers opened on their orders. {data ? `${data.counts.open} open, ${data.counts.underReview} under review.` : ""}</p>
        </div>
      </header>

      <div className="fksm-card">
        <form
          className="fksm-filters fksec-filters"
          onSubmit={(event) => {
            event.preventDefault();
            set("search", search.trim());
          }}
        >
          <label className="fksm-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" placeholder="Dispute or order number" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search disputes" />
          </label>
          <select className="fksm-select" value={query.status} onChange={(e) => set("status", e.target.value === "active" ? "" : e.target.value)} aria-label="Status">
            <option value="active">Open and under review</option>
            {(Object.keys(DISPUTE_STATUS_LABEL) as DisputeStatus[]).map((s) => (
              <option key={s} value={s}>
                {DISPUTE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button type="submit" className="fksm-btn fksm-btn--secondary">
            Search
          </button>
        </form>

        {list.loading && !data ? (
          <SmLoading />
        ) : list.error ? (
          <SmError message={list.error} onRetry={() => void list.refetch()} />
        ) : !data?.items.length ? (
          <SmEmpty icon={<Scale size={22} />} title="No disputes" text="No disputes match these filters." />
        ) : (
          <>
            <div className="fksm-table-wrap">
              <table className="fksm-table">
                <thead>
                  <tr>
                    <th scope="col">Dispute</th>
                    <th scope="col">Order</th>
                    <th scope="col">Reason</th>
                    <th scope="col">Buyer</th>
                    <th scope="col">Status</th>
                    <th scope="col">Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <Link to={`/admin/marketplace/disputes/${d.id}`}>
                          <strong>{d.number ?? d.id.slice(-8)}</strong>
                        </Link>
                      </td>
                      <td>{d.orderNumber || (d.orderId ? <code>{d.orderId.slice(-8)}</code> : "—")}</td>
                      <td>{DISPUTE_REASON_LABEL[d.reason] ?? d.reason}</td>
                      <td>{d.buyerUsername ? `@${d.buyerUsername}` : "—"}</td>
                      <td>
                        <span className={`fksm-pill fksm-pill--${tone(d.status)}`}>{DISPUTE_STATUS_LABEL[d.status] ?? d.status}</span>
                      </td>
                      <td className="fksec-nowrap" title={formatDateTime(d.createdAt)}>
                        {timeAgo(d.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} total={data.total} hasMore={data.page < data.pages} onPage={(p) => set("page", String(p))} />
          </>
        )}
      </div>
    </div>
  );
}

const ACTION_LABEL: Record<DisputeAction, string> = {
  start_review: "Start review",
  resolve_buyer: "Resolve for buyer",
  resolve_seller: "Resolve for seller",
  close: "Close",
};

/** /admin/marketplace/disputes/:id */
export function AdminDisputeDetailPage() {
  const { id = "" } = useParams();
  const access = useAdminAccess();
  const canManage = access.can([PERMISSIONS.MARKETPLACE_ORDERS_MANAGE]);
  const detail = useAdminQuery(() => disputesAdminApi.get(id), [id]);
  const [action, setAction] = useState<DisputeAction | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (detail.loading && !detail.data) return <SmLoading />;

  if (detail.error || !detail.data) {
    return (
      <div className="fksm fksec fksec-page">
        <Link to="/admin/marketplace/disputes" className="fksec-back">
          <ArrowLeft size={15} aria-hidden="true" /> Disputes
        </Link>
        <SmEmpty icon={<Scale size={22} />} title="Dispute unavailable" text={detail.error ?? "This dispute no longer exists or you can't open it."} />
      </div>
    );
  }

  const d = detail.data;
  const active = d.status === "open" || d.status === "under_review";

  const submit = async () => {
    if (!action) return;
    setBusy(true);
    setError(null);
    try {
      await disputesAdminApi.review(id, action, note.trim());
      setAction(null);
      setNote("");
      await detail.refetch();
    } catch (err) {
      setError(securityError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fksm fksec fksec-page">
      <Link to="/admin/marketplace/disputes" className="fksec-back">
        <ArrowLeft size={15} aria-hidden="true" /> Disputes
      </Link>

      <header className="fksec-page__head">
        <div>
          <h2>
            {d.number ?? "Dispute"} <span className={`fksm-pill fksm-pill--${tone(d.status)}`}>{DISPUTE_STATUS_LABEL[d.status]}</span>
          </h2>
          <p>Opened {formatDateTime(d.createdAt)}</p>
        </div>
        {active && canManage && (
          <div className="fksec-actions">
            {(d.status === "open" ? (["start_review", "resolve_buyer", "resolve_seller", "close"] as DisputeAction[]) : (["resolve_buyer", "resolve_seller", "close"] as DisputeAction[])).map((a) => (
              <button key={a} type="button" className={`fksm-btn fksm-btn--sm ${a === "start_review" ? "fksm-btn--secondary" : "fksm-btn--primary"}`} onClick={() => setAction(a)}>
                {ACTION_LABEL[a]}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="fksec-grid-2">
        <div className="fksm-card">
          <h3 className="fksec-card-title">Dispute</h3>
          <dl className="fksec-dl">
            <dt>Reason</dt>
            <dd>{DISPUTE_REASON_LABEL[d.reason] ?? d.reason}</dd>
            <dt>Order</dt>
            <dd>{d.orderNumber || d.orderId || "—"}</dd>
            {d.orderTotal !== null && (
              <>
                <dt>Order total</dt>
                <dd>{d.orderTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
              </>
            )}
            <dt>Buyer</dt>
            <dd>{d.buyerUsername ? `@${d.buyerUsername}` : "—"}</dd>
            <dt>Sellers</dt>
            <dd>{d.sellerUsernames.length ? d.sellerUsernames.map((u) => `@${u}`).join(", ") : "—"}</dd>
            {d.adminNote && (
              <>
                <dt>Latest note</dt>
                <dd>{d.adminNote}</dd>
              </>
            )}
          </dl>
        </div>
        <div className="fksm-card">
          <h3 className="fksec-card-title">Buyer's description</h3>
          <p className="fksec-message">{d.description}</p>
          <p className="fksm-muted">Deciding a dispute records the outcome. Refunds are issued from the order and payment tools.</p>
        </div>
      </div>

      <div className="fksm-card">
        <h3 className="fksec-card-title">History</h3>
        <ol className="fksec-timeline">
          {[...d.history].reverse().map((event, index) => (
            <li key={`${event.at}-${index}`}>
              <time dateTime={event.at}>{formatDateTime(event.at)}</time>
              <strong>{ACTION_LABEL[event.action as DisputeAction] ?? event.action.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}</strong>
              <span className="fksm-muted">{event.actorName || "—"}</span>
              {event.note && <p>{event.note}</p>}
            </li>
          ))}
        </ol>
      </div>

      {action && (
        <Dialog
          title={ACTION_LABEL[action]}
          busy={busy}
          onClose={() => setAction(null)}
          footer={
            <>
              <button type="button" className="fksm-btn fksm-btn--secondary" onClick={() => setAction(null)} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="fksm-btn fksm-btn--primary" onClick={() => void submit()} disabled={busy || (action !== "start_review" && !note.trim())}>
                {busy ? "Saving…" : ACTION_LABEL[action]}
              </button>
            </>
          }
        >
          <label className="fksm-field">
            <span>Note {action === "start_review" ? "(optional)" : "(required)"}</span>
            <textarea rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          {error && (
            <p className="fksm-notice fksm-notice--error" role="alert">
              {error}
            </p>
          )}
        </Dialog>
      )}
    </div>
  );
}
