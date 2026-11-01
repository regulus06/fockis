import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CircleCheck, CircleX, Database, Eye, FileLock, Paperclip, Search, ShieldPlus, X } from "lucide-react";

import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminAccess } from "../../permissions/adminAccess";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { Card, Pager, PersonCell, Pill, SmEmpty, SmError, SmLoading, formatDateTime, useAdminQuery, useConfirm } from "../../support/components/SmParts";
import { formatBytes } from "../../support/components/SmThread";
import { adminError } from "../../support/supportAdminApi";
import { RECORD_TYPE_LABELS, legalAdminApi, openSigned, type EvidenceDetail } from "../legalAdminApi";

const P = PERMISSIONS;
const PRESERVABLE = ["post", "comment", "account", "report_case", "moderation_event", "support_ticket"];

/* ============================================================================
   PRESERVE DIALOG
============================================================================ */

export function PreserveDialog({ holdId, requestId, onClose, onDone }: { holdId?: string; requestId?: string; onClose: () => void; onDone: () => void }) {
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const holds = useAdminQuery(() => (holdId || requestId ? Promise.resolve(null) : legalAdminApi.holds({ status: "active" })), []);
  const [form, setForm] = useState({ recordType: "post", recordId: "", holdId: holdId ?? "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const submit = async () => {
    setError(null);
    if (!form.recordId.trim()) return setError("Enter the record ID.");
    if (!requestId && !form.holdId) return setError("Choose the legal hold this preservation is for.");
    if (form.reason.trim().length < 5) return setError("Record a reason (at least 5 characters).");
    setBusy(true);
    try {
      const record = await legalAdminApi.preserve({ recordType: form.recordType, recordId: form.recordId.trim(), holdId: requestId ? undefined : form.holdId, requestId, reason: form.reason.trim() });
      toast("success", `Preserved as ${record.number}.`);
      onDone();
    } catch (err) {
      setError(adminError(err, "Couldn't preserve that record."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fksm-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="fksm-dialog" role="dialog" aria-modal="true" aria-labelledby="fklg-preserve-title">
        <div className="fksm-dialog__head">
          <h2 id="fklg-preserve-title">Preserve a record</h2>
          <button type="button" className="fksm-icon-btn" aria-label="Close" onClick={onClose} disabled={busy}><X size={18} /></button>
        </div>
        <p className="fksm-dialog__text">A copy is taken now and can't be edited later. Media is copied to restricted storage with a sha256 hash.</p>
        <label className="fksm-field">
          <span>Record type</span>
          <select value={form.recordType} onChange={(e) => setForm({ ...form, recordType: e.target.value })}>
            {PRESERVABLE.map((t) => <option key={t} value={t}>{RECORD_TYPE_LABELS[t]}</option>)}
          </select>
        </label>
        <label className="fksm-field">
          <span>Record ID <b className="fksm-required">*</b></span>
          <input value={form.recordId} onChange={(e) => setForm({ ...form, recordId: e.target.value })} placeholder={form.recordType === "account" ? "Account ID" : "e.g. post ID"} />
        </label>
        {!holdId && !requestId && (
          <label className="fksm-field">
            <span>Legal hold <b className="fksm-required">*</b></span>
            <select value={form.holdId} onChange={(e) => setForm({ ...form, holdId: e.target.value })} disabled={holds.loading}>
              <option value="">{holds.loading ? "Loading holds…" : holds.data?.items.length ? "Choose an active hold" : "No active holds"}</option>
              {(holds.data?.items ?? []).map((h) => <option key={h.id} value={h.id}>{h.number} · {h.caseReference}</option>)}
            </select>
          </label>
        )}
        <label className="fksm-field">
          <span>Reason <b className="fksm-required">*</b></span>
          <textarea rows={3} maxLength={1000} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </label>
        {error && <p className="fksm-notice fksm-notice--error" role="alert">{error}</p>}
        <div className="fksm-dialog__foot">
          <button type="button" className="fksm-btn fksm-btn--secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="fksm-btn fksm-btn--primary" onClick={() => void submit()} disabled={busy}>
            <ShieldPlus size={15} /> {busy ? "Preserving…" : "Preserve"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   ARCHIVE LIST
============================================================================ */

export function EvidenceArchivePage() {
  const navigate = useNavigate();
  const { can } = useAdminAccess();
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const recordType = params.get("type") ?? "";
  const status = params.get("status") ?? "preserved";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const page = Number(params.get("page")) || 1;
  const [draft, setDraft] = useState(search);
  const [preserveOpen, setPreserveOpen] = useState(false);
  const list = useAdminQuery(
    () => legalAdminApi.evidence({ search: search || undefined, recordType: recordType || undefined, status, from: from || undefined, to: to ? `${to}T23:59:59.999Z` : undefined, page }),
    [search, recordType, status, from, to, page],
  );

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  return (
    <Card
      title="Evidence Archive"
      icon={<Database size={20} />}
      action={can([P.LEGAL_EVIDENCE_PRESERVE]) ? (
        <button type="button" className="fksm-btn fksm-btn--primary fksm-btn--sm" onClick={() => setPreserveOpen(true)}>
          <ShieldPlus size={15} /> Preserve a record
        </button>
      ) : undefined}
    >
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
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Username, account ID, post ID, record no., case or report ID…" aria-label="Search evidence" />
        </div>
        <select className="fksm-select" value={recordType} onChange={(e) => set("type", e.target.value)} aria-label="Content type">
          <option value="">All types</option>
          {PRESERVABLE.map((t) => <option key={t} value={t}>{RECORD_TYPE_LABELS[t]}</option>)}
        </select>
        <select className="fksm-select" value={status} onChange={(e) => set("status", e.target.value === "preserved" ? "" : e.target.value)} aria-label="Preservation status">
          <option value="preserved">Preserved</option>
          <option value="expired">Expired</option>
          <option value="all">All</option>
        </select>
        <input className="fksm-input" type="date" value={from} onChange={(e) => set("from", e.target.value)} aria-label="Preserved from" />
        <input className="fksm-input" type="date" value={to} onChange={(e) => set("to", e.target.value)} aria-label="Preserved to" />
      </form>
      <p className="fksm-muted" style={{ fontSize: 12.5, marginBottom: 10 }}>Searches are recorded in the access log. The list shows record details only; opening a record's contents asks for a reason.</p>

      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty icon={<Database size={24} />} title="No preserved records" text="Records appear here once compliance staff preserve them under a legal hold or verified request." />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards">
              <thead>
                <tr>
                  <th>Record</th>
                  <th>Type</th>
                  <th>Account</th>
                  <th>Case</th>
                  <th>Preserved</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((r) => (
                  <tr key={r.id} className="is-clickable" onClick={() => navigate(`/admin/legal/evidence/${r.id}`)}>
                    <td>
                      <span className="fksm-subject">
                        <strong>{r.number}</strong>
                        <span>ID {r.recordId}{r.fileCount ? ` · ${r.fileCount} file${r.fileCount === 1 ? "" : "s"}` : ""}</span>
                      </span>
                    </td>
                    <td>{RECORD_TYPE_LABELS[r.recordType] ?? r.recordType}</td>
                    <td>{r.username ? `@${r.username}` : r.userId || "—"}</td>
                    <td>#{r.caseReference}</td>
                    <td>
                      <span className="fksm-subject">
                        <strong>{formatDateTime(r.preservedAt)}</strong>
                        <span>{r.preservedBy?.username || r.preservedBy?.name}</span>
                      </span>
                    </td>
                    <td>{r.status === "preserved" ? <Pill tone="green">Preserved</Pill> : <Pill tone="gray">Expired</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={(p) => set("page", String(p))} />
        </>
      )}
      {preserveOpen && <PreserveDialog onClose={() => setPreserveOpen(false)} onDone={() => { setPreserveOpen(false); void list.refetch(); }} />}
    </Card>
  );
}

/* ============================================================================
   RECORD (reason first, then content)
============================================================================ */

export function EvidenceRecordPage() {
  const { recordId = "" } = useParams();
  const { can } = useAdminAccess();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const confirm = useConfirm();
  const [reason, setReason] = useState("");
  const [record, setRecord] = useState<EvidenceDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!can([P.LEGAL_EVIDENCE_VIEW])) {
    return (
      <Card>
        <SmEmpty icon={<FileLock size={24} />} title="Restricted" text="Opening preserved content needs the evidence view permission." action={<Link className="fksm-link" to="/admin/legal/evidence">Back to the archive</Link>} />
      </Card>
    );
  }

  const open = async () => {
    if (reason.trim().length < 5) return setError("Record why you need to open this record (at least 5 characters).");
    setBusy(true);
    setError(null);
    try {
      setRecord(await legalAdminApi.openEvidence(recordId, reason.trim()));
    } catch (err) {
      setError(adminError(err, "Couldn't open this record."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link to="/admin/legal/evidence" className="fksm-back"><ArrowLeft size={16} /> Back to Evidence Archive</Link>
      {!record ? (
        <Card title="Open preserved record" icon={<FileLock size={20} />}>
          <p className="fksm-muted">Access to preserved content is restricted. Your name, the time and the reason below are written to the tamper-evident access log.</p>
          <form
            className="fksm-stack"
            style={{ marginTop: 14, maxWidth: 560 }}
            onSubmit={(e) => {
              e.preventDefault();
              void open();
            }}
          >
            <label className="fksm-field">
              <span>Reason for access <b className="fksm-required">*</b></span>
              <textarea rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Preparing response for LR-2026-0038" />
            </label>
            {error && <p className="fksm-notice fksm-notice--error" role="alert">{error}</p>}
            <button type="submit" className="fksm-btn fksm-btn--primary" disabled={busy} style={{ alignSelf: "flex-start" }}>
              <Eye size={15} /> {busy ? "Opening…" : "Open record"}
            </button>
          </form>
        </Card>
      ) : (
        <div className="fksm-detail">
          <Card>
            <div className="fksm-detail-head">
              <div>
                <h2>{record.number} · {RECORD_TYPE_LABELS[record.recordType] ?? record.recordType}</h2>
                <div className="fksm-detail-head__meta">
                  <span>Case #{record.caseReference}</span>
                  {record.holdNumber && <><span>·</span><span>Hold {record.holdNumber}</span></>}
                </div>
              </div>
              {record.status === "preserved" ? <Pill tone="green">Preserved</Pill> : <Pill tone="gray">Expired</Pill>}
            </div>
            {record.integrity !== null && (
              <p className={`fksm-notice ${record.integrity ? "fksm-notice--ok" : "fksm-notice--error"}`} style={{ marginTop: 14 }}>
                {record.integrity ? <CircleCheck size={14} style={{ verticalAlign: -2 }} /> : <CircleX size={14} style={{ verticalAlign: -2 }} />}{" "}
                {record.integrity ? "Snapshot matches its preservation hash." : "Snapshot does NOT match its preservation hash — escalate immediately."}
              </p>
            )}
            {record.snapshot ? (
              <pre className="fklg-json" aria-label="Preserved snapshot">{JSON.stringify(record.snapshot, null, 2)}</pre>
            ) : (
              <p className="fksm-muted" style={{ marginTop: 14 }}>The snapshot was removed when the retention period ended ({formatDateTime(record.expiredAt)}).</p>
            )}
          </Card>
          <div className="fksm-stack">
            <Card title="Record details">
              <dl className="fksm-facts">
                <div><dt>Original ID</dt><dd>{record.recordId}</dd></div>
                <div><dt>Account</dt><dd>{record.username ? `@${record.username}` : record.userId || "—"}</dd></div>
                <div><dt>Created</dt><dd>{formatDateTime(record.originalCreatedAt)}</dd></div>
                <div><dt>Preserved</dt><dd>{formatDateTime(record.preservedAt)}</dd></div>
                <div><dt>Preserved by</dt><dd><PersonCell person={record.preservedBy} /></dd></div>
                <div><dt>Reports</dt><dd>{record.reportIds.length ? record.reportIds.join(", ") : "None"}</dd></div>
              </dl>
              <p className="fksm-muted" style={{ fontSize: 12, marginTop: 10, overflowWrap: "anywhere" }}>sha256 {record.snapshotHash}</p>
              <p className="fksm-muted" style={{ fontSize: 12.5, marginTop: 6 }}>Reason preserved: {record.reason}</p>
            </Card>
            <Card title="Preserved files" icon={<Paperclip size={18} />}>
              {record.files.length === 0 ? <p className="fksm-muted">No media files.</p> : (
                <div className="fksm-stack">
                  {record.files.map((f) => (
                    <div key={f.key} className="fklg-file">
                      <button
                        type="button"
                        className="fksm-btn fksm-btn--secondary fksm-btn--sm"
                        onClick={() =>
                          confirm.ask({ title: `Open ${f.name}?`, description: "Opening a preserved file is recorded in the access log.", confirmLabel: "Open file", reasonLabel: "Reason" }, (r) =>
                            openSigned(() => legalAdminApi.evidenceFile(record.id, f.key, r)).catch((err) => {
                              toast("error", adminError(err));
                              throw err;
                            }),
                          )
                        }
                      >
                        <Paperclip size={14} /> {f.name}
                      </button>
                      <small>{formatBytes(f.size)} · {f.sha256 ? `sha256 ${f.sha256.slice(0, 16)}…` : "not hashed (large file)"}</small>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
      {confirm.element}
    </>
  );
}
