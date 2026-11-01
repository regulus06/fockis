import { useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileUp, Lock, LockOpen, Paperclip, Plus, Search, ShieldPlus, X } from "lucide-react";

import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminAccess } from "../../permissions/adminAccess";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { Card, Pager, PersonCell, Pill, SmEmpty, SmError, SmLoading, formatDateTime, useAdminQuery, useConfirm } from "../../support/components/SmParts";
import { adminError } from "../../support/supportAdminApi";
import { shortDate, toDateInput } from "../components/legalFormat";
import { useLegal } from "../layout/LegalLayout";
import { HOLD_BASIS_LABELS, RECORD_TYPE_LABELS, legalAdminApi, openSigned, type HoldInput, type LegalHold } from "../legalAdminApi";
import { PreserveDialog } from "./EvidencePages";

const P = PERMISSIONS;

export function HoldStatus({ hold }: { hold: Pick<LegalHold, "status" | "reviewDue"> }) {
  if (hold.status === "released") return <Pill tone="gray">Released</Pill>;
  return hold.reviewDue ? <Pill tone="amber" dot>Review due</Pill> : <Pill tone="red" dot>Active</Pill>;
}

/* ============================================================================
   LIST
============================================================================ */

export function HoldsPage() {
  const navigate = useNavigate();
  const { can } = useAdminAccess();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as "active" | "released" | "all") || "active";
  const search = params.get("q") ?? "";
  const page = Number(params.get("page")) || 1;
  const [draft, setDraft] = useState(search);
  const list = useAdminQuery(() => legalAdminApi.holds({ status, search: search || undefined, page }), [status, search, page]);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  return (
    <Card
      title="Legal Holds"
      icon={<Lock size={20} />}
      action={
        can([P.LEGAL_HOLDS_MANAGE]) ? (
          <Link to="/admin/legal/holds/new" className="fksm-btn fksm-btn--primary fksm-btn--sm">
            <Plus size={15} /> New legal hold
          </Link>
        ) : undefined
      }
    >
      <div className="fksm-tabs" role="tablist" aria-label="Hold status">
        {(["active", "released", "all"] as const).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={status === s} className={status === s ? "is-active" : ""} onClick={() => set("status", s === "active" ? "" : s)}>
            {s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      <form
        className="fksm-filters"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          set("q", draft.trim());
        }}
      >
        <div className="fksm-search">
          <Search size={16} aria-hidden="true" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search hold number, case reference, username or record ID…" aria-label="Search holds" />
        </div>
      </form>

      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty icon={<Lock size={24} />} title="No legal holds here" text="Holds are created by compliance staff for a verified legal basis. Content reports never create holds on their own." />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards">
              <thead>
                <tr>
                  <th>Hold</th>
                  <th>Legal basis</th>
                  <th>Covers</th>
                  <th>Status</th>
                  <th>Review</th>
                  <th>Created by</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((h) => (
                  <tr key={h.id} className="is-clickable" onClick={() => navigate(`/admin/legal/holds/${h.id}`)}>
                    <td>
                      <span className="fksm-subject">
                        <strong>{h.number}</strong>
                        <span title={h.title}>Case #{h.caseReference} · {h.title}</span>
                      </span>
                    </td>
                    <td>{HOLD_BASIS_LABELS[h.legalBasis] ?? h.legalBasis}</td>
                    <td className="fksm-date">
                      {h.subjects.length} account{h.subjects.length === 1 ? "" : "s"} · {h.recordCount} record{h.recordCount === 1 ? "" : "s"}
                    </td>
                    <td><HoldStatus hold={h} /></td>
                    <td className="fksm-date">{h.status === "released" ? `Released ${shortDate(h.releasedAt)}` : shortDate(h.reviewAt)}</td>
                    <td><PersonCell person={h.createdBy} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={(p) => set("page", String(p))} />
        </>
      )}
    </Card>
  );
}

/* ============================================================================
   NEW
============================================================================ */

const RECORD_TYPES = Object.keys(RECORD_TYPE_LABELS).filter((k) => k !== "other");

export function NewHoldPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const { refreshCounts } = useLegal();
  const [form, setForm] = useState<HoldInput>({ caseReference: "", title: "", legalBasis: "preservation_request", basisDetails: "", scope: "", requestId: params.get("request") ?? undefined });
  const [subjects, setSubjects] = useState("");
  const [records, setRecords] = useState<{ recordType: string; recordId: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const payload: HoldInput = {
      ...form,
      subjects: subjects.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean),
      records: records.filter((r) => r.recordId.trim()).map((r) => ({ ...r, recordId: r.recordId.trim() })),
      reviewAt: form.reviewAt || undefined,
      expiresAt: form.expiresAt || undefined,
    };
    if (!payload.caseReference.trim() || !payload.title.trim()) return setError("Add a case reference and a title.");
    if (!payload.subjects?.length && !payload.records?.length) return setError("Name at least one account or record the hold covers.");
    setSaving(true);
    try {
      const hold = await legalAdminApi.createHold(payload);
      toast("success", `Legal hold ${hold.number} created.`);
      refreshCounts();
      navigate(`/admin/legal/holds/${hold.id}`, { replace: true });
    } catch (err) {
      setError(adminError(err, "Couldn't create the hold."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Link to="/admin/legal/holds" className="fksm-back"><ArrowLeft size={16} /> Back to Legal Holds</Link>
      <Card title="New legal hold" icon={<Lock size={20} />}>
        <p className="fksm-notice fksm-notice--info" style={{ marginBottom: 16 }}>
          A hold stops the covered accounts and records from being deleted — by account deletion, moderation or the retention job — until it is released.
        </p>
        <div className="fksm-form-grid">
          <label className="fksm-field">
            <span>Case reference <b className="fksm-required">*</b></span>
            <input value={form.caseReference} maxLength={80} onChange={(e) => setForm({ ...form, caseReference: e.target.value })} placeholder="e.g. LR-2026-0038 or court docket" />
          </label>
          <label className="fksm-field">
            <span>Legal basis <b className="fksm-required">*</b></span>
            <select value={form.legalBasis} onChange={(e) => setForm({ ...form, legalBasis: e.target.value })}>
              {Object.entries(HOLD_BASIS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="fksm-field is-wide">
            <span>Title <b className="fksm-required">*</b></span>
            <input value={form.title} maxLength={150} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Short description of the matter" />
          </label>
          <label className="fksm-field is-wide">
            <span>Basis details</span>
            <textarea rows={3} maxLength={2000} value={form.basisDetails} onChange={(e) => setForm({ ...form, basisDetails: e.target.value })} placeholder="Order number, issuing body, counsel's instruction…" />
          </label>
          <label className="fksm-field is-wide">
            <span>Scope</span>
            <textarea rows={2} maxLength={2000} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="What the hold covers, e.g. posts and comments from 1 Jan to 31 Mar" />
          </label>
          <label className="fksm-field is-wide">
            <span>Accounts covered</span>
            <input value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="@username or account ID, separated by commas" />
            <small>Everything these accounts own is protected from deletion.</small>
          </label>
          <div className="fksm-field is-wide">
            <span>Specific records</span>
            <div className="fksm-stack">
              {records.map((r, i) => (
                <div key={i} className="fksm-row" style={{ flexWrap: "nowrap" }}>
                  <select className="fksm-select" value={r.recordType} aria-label="Record type" onChange={(e) => setRecords(records.map((x, j) => (j === i ? { ...x, recordType: e.target.value } : x)))}>
                    {RECORD_TYPES.map((t) => <option key={t} value={t}>{RECORD_TYPE_LABELS[t]}</option>)}
                  </select>
                  <input className="fksm-input" style={{ flex: 1, minWidth: 0 }} value={r.recordId} aria-label="Record ID" placeholder="Record ID" onChange={(e) => setRecords(records.map((x, j) => (j === i ? { ...x, recordId: e.target.value } : x)))} />
                  <button type="button" className="fksm-icon-btn" aria-label="Remove record" onClick={() => setRecords(records.filter((_, j) => j !== i))}><X size={16} /></button>
                </div>
              ))}
              <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" style={{ alignSelf: "flex-start" }} onClick={() => setRecords([...records, { recordType: "post", recordId: "" }])}>
                <Plus size={15} /> Add record
              </button>
            </div>
          </div>
          <label className="fksm-field">
            <span>Review date</span>
            <input type="date" value={form.reviewAt ?? ""} onChange={(e) => setForm({ ...form, reviewAt: e.target.value })} />
          </label>
          <label className="fksm-field">
            <span>Expiry date (if any)</span>
            <input type="date" value={form.expiresAt ?? ""} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            <small>Holds never lapse on their own; an expired hold is flagged for review.</small>
          </label>
        </div>
        {error && <p className="fksm-notice fksm-notice--error" role="alert" style={{ marginTop: 14 }}>{error}</p>}
        <div className="fksm-row" style={{ marginTop: 18, justifyContent: "flex-end" }}>
          <Link to="/admin/legal/holds" className="fksm-btn fksm-btn--secondary">Cancel</Link>
          <button type="button" className="fksm-btn fksm-btn--primary" disabled={saving} onClick={() => void submit()}>
            <Lock size={15} /> {saving ? "Creating…" : "Create legal hold"}
          </button>
        </div>
      </Card>
    </>
  );
}

/* ============================================================================
   DETAIL
============================================================================ */

export function HoldDetailPage() {
  const { holdId = "" } = useParams();
  const { can } = useAdminAccess();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const { refreshCounts } = useLegal();
  const confirm = useConfirm();
  const query = useAdminQuery(() => legalAdminApi.hold(holdId), [holdId]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [addSubjects, setAddSubjects] = useState("");
  const [review, setReview] = useState<string | null>(null);
  const [preserveOpen, setPreserveOpen] = useState(false);
  const h = query.data;
  const canManage = can([P.LEGAL_HOLDS_MANAGE]);

  const apply = async (work: Promise<LegalHold>, success: string) => {
    try {
      query.setData(await work);
      toast("success", success);
      refreshCounts();
      return true;
    } catch (error) {
      toast("error", adminError(error));
      return false;
    }
  };

  if (query.loading && !h) return <SmLoading label="Loading legal hold…" />;
  if (query.error || !h) return <SmError message={query.error ?? "Legal hold not found."} onRetry={query.refetch} />;
  const active = h.status === "active";

  return (
    <>
      <Link to="/admin/legal/holds" className="fksm-back"><ArrowLeft size={16} /> Back to Legal Holds</Link>
      <div className="fksm-detail">
        <div className="fksm-stack">
          <Card>
            <div className="fksm-detail-head">
              <div>
                <h2>{h.number} · {h.title}</h2>
                <div className="fksm-detail-head__meta">
                  <span>Case #{h.caseReference}</span>·<span>{HOLD_BASIS_LABELS[h.legalBasis] ?? h.legalBasis}</span>·<span>Created {formatDateTime(h.createdAt)}</span>
                </div>
              </div>
              <HoldStatus hold={h} />
            </div>
            {h.basisDetails && <p className="fksm-prose" style={{ marginTop: 14 }}>{h.basisDetails}</p>}
            {h.scope && (
              <p className="fksm-prose fksm-muted" style={{ marginTop: 8 }}>
                <b>Scope:</b> {h.scope}
              </p>
            )}
            {!active && (
              <p className="fksm-notice fksm-notice--info" style={{ marginTop: 14 }}>
                Released {formatDateTime(h.releasedAt)} by {h.releasedBy?.username || h.releasedBy?.name || "staff"}: {h.releaseReason}. Retention rules apply again to the records it covered.
              </p>
            )}
          </Card>

          <Card title="Covered accounts">
            {h.subjects.length === 0 ? <p className="fksm-muted">No whole accounts — only the records below.</p> : (
              <div className="fksm-row">{h.subjects.map((s) => s && <span key={s.id} className="fklg-chip"><PersonCell person={s} /></span>)}</div>
            )}
            {active && canManage && (
              <form
                className="fksm-row"
                style={{ marginTop: 12 }}
                onSubmit={async (e) => {
                  e.preventDefault();
                  const list = addSubjects.split(/[\s,]+/).filter(Boolean);
                  if (!list.length) return;
                  if (await apply(legalAdminApi.updateHold(h.id, { addSubjects: list, note: "Accounts added" }), "Accounts added to the hold.")) setAddSubjects("");
                }}
              >
                <input className="fksm-input" style={{ flex: 1, minWidth: 180 }} value={addSubjects} onChange={(e) => setAddSubjects(e.target.value)} placeholder="Add @username or account ID" aria-label="Add accounts" />
                <button type="submit" className="fksm-btn fksm-btn--secondary fksm-btn--sm">Add</button>
              </form>
            )}
          </Card>

          <Card
            title={`Covered records (${h.recordCount})`}
            action={active && can([P.LEGAL_EVIDENCE_PRESERVE]) ? (
              <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => setPreserveOpen(true)}>
                <ShieldPlus size={15} /> Preserve a record
              </button>
            ) : undefined}
          >
            {h.records.length === 0 ? <p className="fksm-muted">No individual records yet.</p> : (
              <div className="fksm-table-wrap">
                <table className="fksm-table">
                  <thead><tr><th>Type</th><th>Record ID</th></tr></thead>
                  <tbody>
                    {h.records.map((r) => (
                      <tr key={`${r.recordType}-${r.recordId}`}>
                        <td>{RECORD_TYPE_LABELS[r.recordType] ?? r.recordType}</td>
                        <td><code className="fklg-code">{r.recordId}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Link to={`/admin/legal/evidence?q=${encodeURIComponent(h.caseReference)}`} className="fksm-link" style={{ marginTop: 10 }}>
              Preserved evidence for this case →
            </Link>
          </Card>

          <Card title="History">
            <ol className="fksm-timeline">
              {(h.history ?? []).slice().reverse().map((e, i) => (
                <li key={i}>
                  <span className="fksm-timeline__icon"><Lock size={16} /></span>
                  <div>
                    <strong>{e.action.replace(/_/g, " ")}</strong>
                    <p>{e.actor?.username || e.actor?.name || "Staff"}{e.note ? ` · ${e.note}` : ""}</p>
                  </div>
                  <time>{formatDateTime(e.at)}</time>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="fksm-stack">
          <Card title="Details">
            <dl className="fksm-facts">
              <div><dt>Created by</dt><dd>{h.createdBy?.username || h.createdBy?.name || "—"}</dd></div>
              <div><dt>Review date</dt><dd>{shortDate(h.reviewAt)}</dd></div>
              <div><dt>Expiry</dt><dd>{h.expiresAt ? shortDate(h.expiresAt) : "Until released"}</dd></div>
              {h.request && <div><dt>Legal request</dt><dd><Link className="fksm-link" to={`/admin/legal/requests/${h.request.id}`}>{h.request.number}</Link></dd></div>}
            </dl>
            {active && canManage && (
              <div className="fksm-stack" style={{ marginTop: 12 }}>
                <label className="fksm-field">
                  <span>Change review date</span>
                  <input type="date" value={review ?? toDateInput(h.reviewAt)} onChange={(e) => setReview(e.target.value)} />
                </label>
                {review !== null && review !== toDateInput(h.reviewAt) && (
                  <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => void apply(legalAdminApi.updateHold(h.id, { reviewAt: review || undefined, note: "Review date changed" }), "Review date saved.").then((ok) => ok && setReview(null))}>
                    Save review date
                  </button>
                )}
              </div>
            )}
          </Card>

          <Card title="Supporting documents" icon={<Paperclip size={18} />}>
            {h.documents.length === 0 ? <p className="fksm-muted">No documents uploaded.</p> : (
              <div className="fksm-files">
                {h.documents.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    title={`sha256 ${d.sha256}`}
                    onClick={() =>
                      confirm.ask({ title: `Open ${d.name}?`, description: "Opening a legal document is recorded in the access log.", confirmLabel: "Open document", reasonLabel: "Reason for opening" }, (reason) =>
                        openSigned(() => legalAdminApi.holdDocumentLink(h.id, d.key, reason)),
                      )
                    }
                  >
                    <Paperclip size={14} /><em>{d.name}</em>
                  </button>
                ))}
              </div>
            )}
            {canManage && (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  hidden
                  accept="application/pdf,image/png,image/jpeg,text/plain"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void apply(legalAdminApi.holdDocument(h.id, file), "Document uploaded.");
                    e.target.value = "";
                  }}
                />
                <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" style={{ marginTop: 10 }} onClick={() => fileInput.current?.click()}>
                  <FileUp size={15} /> Upload document
                </button>
                <p className="fksm-muted" style={{ fontSize: 12, marginTop: 6 }}>PDF, PNG, JPG or text · up to 20 MB · stored privately with a sha256 hash.</p>
              </>
            )}
          </Card>

          {active && canManage && (
            <Card title="Release">
              <p className="fksm-muted" style={{ fontSize: 13 }}>Release only when the legal basis has ended. Retention rules then apply to the covered records again.</p>
              <button
                type="button"
                className="fksm-btn fksm-btn--danger-ghost fksm-btn--block"
                style={{ marginTop: 10 }}
                onClick={() =>
                  confirm.ask(
                    { title: `Release ${h.number}?`, description: "Covered accounts and records can be deleted again under normal rules. This is recorded in the access log.", confirmLabel: "Release hold", tone: "danger", reasonLabel: "Authorization and reason for release", typeToConfirm: "RELEASE" },
                    async (reason) => {
                      const ok = await apply(legalAdminApi.releaseHold(h.id, reason), "Legal hold released.");
                      if (!ok) throw new Error("Release failed.");
                    },
                  )
                }
              >
                <LockOpen size={15} /> Release legal hold
              </button>
            </Card>
          )}
        </div>
      </div>
      {preserveOpen && <PreserveDialog holdId={h.id} onClose={() => setPreserveOpen(false)} onDone={() => { setPreserveOpen(false); void query.refetch(); refreshCounts(); }} />}
      {confirm.element}
    </>
  );
}
