import { useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileCheck, FileText, FileUp, FileX, Gavel, Lock, Paperclip, Plus, Search, ShieldPlus } from "lucide-react";

import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminAccess } from "../../permissions/adminAccess";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { Card, Pager, PersonCell, Pill, SmEmpty, SmError, SmLoading, formatDateTime, useAdminQuery, useConfirm, type Tone } from "../../support/components/SmParts";
import { adminError } from "../../support/supportAdminApi";
import { shortDate, toDateInput } from "../components/legalFormat";
import { useLegal } from "../layout/LegalLayout";
import { REQUEST_TYPE_LABELS, legalAdminApi, openSigned, type LegalRequest, type RequestInput } from "../legalAdminApi";
import { PreserveDialog } from "./EvidencePages";

const P = PERMISSIONS;

const VERIFY: Record<string, [string, Tone]> = { pending: ["Unverified", "amber"], verified: ["Verified", "green"], rejected: ["Rejected", "red"] };
const APPROVAL: Record<string, [string, Tone]> = { pending: ["Awaiting decision", "gray"], approved: ["Approved", "green"], partially_approved: ["Partly approved", "teal"], denied: ["Denied", "red"] };
const PRESERVE: Record<string, [string, Tone]> = { not_requested: ["Not requested", "gray"], pending: ["Preservation pending", "amber"], preserved: ["Preserved", "green"] };
const COMPLETION: Record<string, [string, Tone]> = { open: ["Open", "blue"], in_progress: ["In progress", "purple"], completed: ["Completed", "green"], closed: ["Closed", "gray"] };

const pill = (map: Record<string, [string, Tone]>, value: string) => {
  const [label, tone] = map[value] ?? [value, "gray" as Tone];
  return <Pill tone={tone}>{label}</Pill>;
};

/* ============================================================================
   LIST
============================================================================ */

export function RequestsPage() {
  const navigate = useNavigate();
  const { can } = useAdminAccess();
  const [params, setParams] = useSearchParams();
  const view = (params.get("view") as "open" | "overdue" | "completed" | "all") || "open";
  const search = params.get("q") ?? "";
  const page = Number(params.get("page")) || 1;
  const [draft, setDraft] = useState(search);
  const list = useAdminQuery(() => legalAdminApi.requests({ view, search: search || undefined, page }), [view, search, page]);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  return (
    <Card
      title="Legal Requests"
      icon={<FileText size={20} />}
      action={can([P.LEGAL_REQUESTS_MANAGE]) ? (
        <Link to="/admin/legal/requests/new" className="fksm-btn fksm-btn--primary fksm-btn--sm"><Plus size={15} /> Record a request</Link>
      ) : undefined}
    >
      <div className="fksm-tabs" role="tablist" aria-label="Requests">
        {(["open", "overdue", "completed", "all"] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? "is-active" : ""} onClick={() => set("view", v === "open" ? "" : v)}>
            {v[0].toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
      <form className="fksm-filters" role="search" onSubmit={(e) => { e.preventDefault(); set("q", draft.trim()); }}>
        <div className="fksm-search">
          <Search size={16} aria-hidden="true" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search reference, authority or requested records…" aria-label="Search requests" />
        </div>
      </form>

      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty icon={<FileText size={24} />} title="No legal requests here" text="Requests from courts and authorities are recorded here and must be verified and approved before anything is disclosed." />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Authority</th>
                  <th>Verification</th>
                  <th>Disclosure</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((r) => (
                  <tr key={r.id} className="is-clickable" onClick={() => navigate(`/admin/legal/requests/${r.id}`)}>
                    <td>
                      <span className="fksm-subject">
                        <strong>{r.number}</strong>
                        <span>{REQUEST_TYPE_LABELS[r.requestType] ?? r.requestType}</span>
                      </span>
                    </td>
                    <td><span className="fksm-subject"><strong title={r.authority}>{r.authority}</strong><span>{r.jurisdiction || "—"}</span></span></td>
                    <td>{pill(VERIFY, r.verificationStatus)}</td>
                    <td>{pill(APPROVAL, r.approvalStatus)}</td>
                    <td>{r.overdue ? <Pill tone="red" dot>Overdue · {shortDate(r.responseDeadline)}</Pill> : <span className="fksm-date">{shortDate(r.responseDeadline)}</span>}</td>
                    <td>{pill(COMPLETION, r.completionStatus)}</td>
                    <td><PersonCell person={r.assignedTo} fallback="Unassigned" /></td>
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

export function NewRequestPage() {
  const navigate = useNavigate();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const { refreshCounts } = useLegal();
  const [form, setForm] = useState<RequestInput>({ authority: "", authorityContact: "", requestType: "preservation", legalBasis: "", jurisdiction: "", requestedRecords: "", preservationRequested: true });
  const [subjects, setSubjects] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!form.authority.trim() || form.requestedRecords.trim().length < 5) return setError("Add the requesting authority and describe the records requested.");
    setSaving(true);
    try {
      const r = await legalAdminApi.createRequest({
        ...form,
        subjects: subjects.split(/[\s,]+/).filter(Boolean),
        responseDeadline: form.responseDeadline || undefined,
        receivedAt: form.receivedAt || undefined,
      });
      toast("success", `Request ${r.number} recorded.`);
      refreshCounts();
      navigate(`/admin/legal/requests/${r.id}`, { replace: true });
    } catch (err) {
      setError(adminError(err, "Couldn't record the request."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Link to="/admin/legal/requests" className="fksm-back"><ArrowLeft size={16} /> Back to Legal Requests</Link>
      <Card title="Record a legal request" icon={<FileText size={20} />}>
        <p className="fksm-notice fksm-notice--info" style={{ marginBottom: 16 }}>Recording a request discloses nothing. It must be verified and then approved before any information is shared.</p>
        <div className="fksm-form-grid">
          <label className="fksm-field">
            <span>Requesting authority <b className="fksm-required">*</b></span>
            <input value={form.authority} maxLength={200} onChange={(e) => setForm({ ...form, authority: e.target.value })} />
          </label>
          <label className="fksm-field">
            <span>Contact</span>
            <input value={form.authorityContact} maxLength={300} onChange={(e) => setForm({ ...form, authorityContact: e.target.value })} placeholder="Officer, email or phone" />
          </label>
          <label className="fksm-field">
            <span>Request type</span>
            <select value={form.requestType} onChange={(e) => setForm({ ...form, requestType: e.target.value })}>
              {Object.entries(REQUEST_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="fksm-field">
            <span>Jurisdiction</span>
            <input value={form.jurisdiction} maxLength={120} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} />
          </label>
          <label className="fksm-field is-wide">
            <span>Legal basis</span>
            <textarea rows={2} maxLength={1000} value={form.legalBasis} onChange={(e) => setForm({ ...form, legalBasis: e.target.value })} placeholder="Statute, order or reference cited by the requester" />
          </label>
          <label className="fksm-field is-wide">
            <span>Records requested <b className="fksm-required">*</b></span>
            <textarea rows={3} maxLength={3000} value={form.requestedRecords} onChange={(e) => setForm({ ...form, requestedRecords: e.target.value })} />
          </label>
          <label className="fksm-field is-wide">
            <span>Accounts named</span>
            <input value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="@username or account ID, separated by commas" />
          </label>
          <label className="fksm-field">
            <span>Received</span>
            <input type="date" value={form.receivedAt ?? ""} onChange={(e) => setForm({ ...form, receivedAt: e.target.value })} />
          </label>
          <label className="fksm-field">
            <span>Response deadline</span>
            <input type="date" value={form.responseDeadline ?? ""} onChange={(e) => setForm({ ...form, responseDeadline: e.target.value })} />
          </label>
          <label className="fksm-check is-wide">
            <input type="checkbox" checked={Boolean(form.preservationRequested)} onChange={(e) => setForm({ ...form, preservationRequested: e.target.checked })} /> The requester asks us to preserve records
          </label>
        </div>
        {error && <p className="fksm-notice fksm-notice--error" role="alert" style={{ marginTop: 14 }}>{error}</p>}
        <div className="fksm-row" style={{ marginTop: 18, justifyContent: "flex-end" }}>
          <Link to="/admin/legal/requests" className="fksm-btn fksm-btn--secondary">Cancel</Link>
          <button type="button" className="fksm-btn fksm-btn--primary" disabled={saving} onClick={() => void submit()}>{saving ? "Saving…" : "Record request"}</button>
        </div>
      </Card>
    </>
  );
}

/* ============================================================================
   DETAIL
============================================================================ */

export function RequestDetailPage() {
  const { requestId = "" } = useParams();
  const { can } = useAdminAccess();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const { refreshCounts } = useLegal();
  const confirm = useConfirm();
  const query = useAdminQuery(() => legalAdminApi.request(requestId), [requestId]);
  const staff = useAdminQuery(() => legalAdminApi.staff(), []);
  const fileInput = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [preserveOpen, setPreserveOpen] = useState(false);
  const r = query.data;
  const canManage = can([P.LEGAL_REQUESTS_MANAGE]);
  const canApprove = can([P.LEGAL_REQUESTS_APPROVE]);

  const apply = async (work: Promise<LegalRequest>, success: string) => {
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
  const ask = (title: string, description: string, confirmLabel: string, work: (note: string) => Promise<LegalRequest>, success: string, tone?: "danger") =>
    confirm.ask({ title, description, confirmLabel, reasonLabel: "Documented note", tone }, async (note) => {
      if (!(await apply(work(note), success))) throw new Error("failed");
    });

  if (query.loading && !r) return <SmLoading label="Loading request…" />;
  if (query.error || !r) return <SmError message={query.error ?? "Legal request not found."} onRetry={query.refetch} />;

  return (
    <>
      <Link to="/admin/legal/requests" className="fksm-back"><ArrowLeft size={16} /> Back to Legal Requests</Link>
      <div className="fksm-detail">
        <div className="fksm-stack">
          <Card>
            <div className="fksm-detail-head">
              <div>
                <h2>{r.number} · {r.authority}</h2>
                <div className="fksm-detail-head__meta">
                  <span>{REQUEST_TYPE_LABELS[r.requestType] ?? r.requestType}</span>·<span>Received {shortDate(r.receivedAt)}</span>
                  {r.responseDeadline && <><span>·</span><span>Due {shortDate(r.responseDeadline)}</span></>}
                </div>
              </div>
              <div className="fksm-row">{r.overdue && <Pill tone="red" dot>Overdue</Pill>}{pill(COMPLETION, r.completionStatus)}</div>
            </div>
            <div className="fklg-steps" aria-label="Request progress">
              <div><span>1. Verification</span>{pill(VERIFY, r.verificationStatus)}</div>
              <div><span>2. Preservation</span>{pill(PRESERVE, r.preservationStatus)}</div>
              <div><span>3. Disclosure decision</span>{pill(APPROVAL, r.approvalStatus)}</div>
              <div><span>4. Completion</span>{pill(COMPLETION, r.completionStatus)}</div>
            </div>
            <h3 className="fklg-h3">Records requested</h3>
            <p className="fksm-prose">{r.requestedRecords}</p>
            {r.legalBasis && (<><h3 className="fklg-h3">Legal basis</h3><p className="fksm-prose">{r.legalBasis}</p></>)}
            {r.subjects.length > 0 && (
              <>
                <h3 className="fklg-h3">Accounts named</h3>
                <div className="fksm-row">{r.subjects.map((s) => s && <span key={s.id} className="fklg-chip"><PersonCell person={s} /></span>)}</div>
              </>
            )}
            {r.verificationNote && <p className="fksm-notice fksm-notice--info" style={{ marginTop: 14 }}><b>Verification:</b> {r.verificationNote} — {r.verifiedBy?.username || r.verifiedBy?.name}, {formatDateTime(r.verifiedAt)}</p>}
            {r.approvalNote && <p className="fksm-notice fksm-notice--info" style={{ marginTop: 8 }}><b>Decision:</b> {r.approvalNote} — {r.approvedBy?.username || r.approvedBy?.name}, {formatDateTime(r.approvedAt)}</p>}
          </Card>

          <Card title="Actions">
            <div className="fksm-row">
              {canManage && r.verificationStatus === "pending" && (
                <>
                  <button type="button" className="fksm-btn fksm-btn--success fksm-btn--sm" onClick={() => ask("Mark as verified?", "Confirm you checked the request is genuine (e.g. contacted the issuing authority through an independent channel).", "Mark verified", (n) => legalAdminApi.verifyRequest(r.id, "verified", n), "Request verified.")}>
                    <FileCheck size={15} /> Verify
                  </button>
                  <button type="button" className="fksm-btn fksm-btn--danger-ghost fksm-btn--sm" onClick={() => ask("Reject this request?", "Use this when the request can't be verified or has no valid basis.", "Reject request", (n) => legalAdminApi.verifyRequest(r.id, "rejected", n), "Request rejected.", "danger")}>
                    <FileX size={15} /> Reject
                  </button>
                </>
              )}
              {canApprove && r.verificationStatus === "verified" && r.approvalStatus === "pending" && (
                <>
                  <button type="button" className="fksm-btn fksm-btn--primary fksm-btn--sm" onClick={() => ask("Approve disclosure?", "Records the decision to disclose the requested information. Nothing is sent automatically.", "Approve", (n) => legalAdminApi.decideRequest(r.id, "approved", n), "Disclosure approved.")}>
                    <Gavel size={15} /> Approve
                  </button>
                  <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => ask("Approve in part?", "Describe exactly what may be disclosed.", "Approve in part", (n) => legalAdminApi.decideRequest(r.id, "partially_approved", n), "Partial disclosure approved.")}>
                    Approve in part
                  </button>
                  <button type="button" className="fksm-btn fksm-btn--danger-ghost fksm-btn--sm" onClick={() => ask("Deny disclosure?", "Records that no information will be disclosed.", "Deny", (n) => legalAdminApi.decideRequest(r.id, "denied", n), "Disclosure denied.", "danger")}>
                    Deny
                  </button>
                </>
              )}
              {r.verificationStatus === "verified" && can([P.LEGAL_HOLDS_MANAGE]) && !r.holdId && (
                <Link to={`/admin/legal/holds/new?request=${r.id}`} className="fksm-btn fksm-btn--secondary fksm-btn--sm"><Lock size={15} /> Create legal hold</Link>
              )}
              {r.holdId && <Link to={`/admin/legal/holds/${r.holdId}`} className="fksm-btn fksm-btn--secondary fksm-btn--sm"><Lock size={15} /> View legal hold</Link>}
              {r.verificationStatus === "verified" && can([P.LEGAL_EVIDENCE_PRESERVE]) && (
                <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => setPreserveOpen(true)}><ShieldPlus size={15} /> Preserve a record</button>
              )}
              {["approved", "partially_approved"].includes(r.approvalStatus) && can([P.LEGAL_EVIDENCE_EXPORT]) && (
                <Link to={`/admin/legal/exports?request=${r.id}`} className="fksm-btn fksm-btn--secondary fksm-btn--sm">Create evidence package</Link>
              )}
            </div>
            {r.verificationStatus === "pending" && !canManage && <p className="fksm-muted" style={{ marginTop: 8 }}>Waiting for verification by compliance staff.</p>}
          </Card>

          <Card title="History">
            <ol className="fksm-timeline">
              {(r.history ?? []).slice().reverse().map((e, i) => (
                <li key={i}>
                  <span className="fksm-timeline__icon"><FileText size={16} /></span>
                  <div><strong>{e.action.replace(/_/g, " ")}</strong><p>{e.actor?.username || e.actor?.name || "Staff"}{e.note ? ` · ${e.note}` : ""}</p></div>
                  <time>{formatDateTime(e.at)}</time>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="fksm-stack">
          <Card title="Manage">
            <div className="fksm-stack">
              <label className="fksm-field">
                <span>Status</span>
                <select className="fksm-select" value={r.completionStatus} disabled={!canManage} onChange={(e) => void apply(legalAdminApi.updateRequest(r.id, { completionStatus: e.target.value }), "Status updated.")}>
                  {Object.entries(COMPLETION).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="fksm-field">
                <span>Assigned to</span>
                <select className="fksm-select" value={r.assignedTo?.id ?? ""} disabled={!canManage} onChange={(e) => void apply(legalAdminApi.updateRequest(r.id, { assignedTo: e.target.value }), "Assignment updated.")}>
                  <option value="">Unassigned</option>
                  {r.assignedTo && !(staff.data ?? []).some((s) => s.id === r.assignedTo?.id) && <option value={r.assignedTo.id}>{r.assignedTo.username || r.assignedTo.name}</option>}
                  {(staff.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.username || s.name}</option>)}
                </select>
              </label>
              <label className="fksm-field">
                <span>Response deadline</span>
                <input type="date" disabled={!canManage} value={toDateInput(r.responseDeadline)} onChange={(e) => void apply(legalAdminApi.updateRequest(r.id, { responseDeadline: e.target.value }), "Deadline updated.")} />
              </label>
              <dl className="fksm-facts">
                {r.authorityContact && <div><dt>Contact</dt><dd>{r.authorityContact}</dd></div>}
                {r.jurisdiction && <div><dt>Jurisdiction</dt><dd>{r.jurisdiction}</dd></div>}
                <div><dt>Recorded by</dt><dd>{r.createdBy?.username || r.createdBy?.name || "—"}</dd></div>
              </dl>
            </div>
          </Card>

          <Card title="Internal notes">
            <textarea className="fksm-input" rows={4} style={{ width: "100%" }} disabled={!canManage} value={notes ?? r.notes ?? ""} onChange={(e) => setNotes(e.target.value)} aria-label="Internal notes" />
            {canManage && notes !== null && notes !== (r.notes ?? "") && (
              <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" style={{ marginTop: 8 }} onClick={() => void apply(legalAdminApi.updateRequest(r.id, { notes }), "Notes saved.").then((ok) => ok && setNotes(null))}>Save notes</button>
            )}
          </Card>

          <Card title="Documents" icon={<Paperclip size={18} />}>
            {(r.documents ?? []).length === 0 ? <p className="fksm-muted">No documents uploaded.</p> : (
              <div className="fksm-files">
                {(r.documents ?? []).map((d) => (
                  <button key={d.key} type="button" title={`sha256 ${d.sha256}`} onClick={() => confirm.ask({ title: `Open ${d.name}?`, description: "Opening a legal document is recorded in the access log.", confirmLabel: "Open document", reasonLabel: "Reason for opening" }, (reason) => openSigned(() => legalAdminApi.requestDocumentLink(r.id, d.key, reason)))}>
                    <Paperclip size={14} /><em>{d.name}</em>
                  </button>
                ))}
              </div>
            )}
            {canManage && (
              <>
                <input ref={fileInput} type="file" hidden accept="application/pdf,image/png,image/jpeg,text/plain" onChange={(e) => { const f = e.target.files?.[0]; if (f) void apply(legalAdminApi.requestDocument(r.id, f), "Document uploaded."); e.target.value = ""; }} />
                <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" style={{ marginTop: 10 }} onClick={() => fileInput.current?.click()}><FileUp size={15} /> Upload document</button>
              </>
            )}
          </Card>
        </div>
      </div>
      {preserveOpen && <PreserveDialog requestId={r.id} onClose={() => setPreserveOpen(false)} onDone={() => { setPreserveOpen(false); void query.refetch(); refreshCounts(); }} />}
      {confirm.element}
    </>
  );
}
