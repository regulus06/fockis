import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CircleCheck, FileClock, GitCompare, History, Layers, PenLine, RotateCcw, X } from "lucide-react";

import { adminError } from "../../support/supportAdminApi";
import { Pager, SmEmpty, SmError, SmLoading, useAdminQuery, useConfirm } from "../../support/components/SmParts";
import { useAdminAccess } from "../../permissions/adminAccess";
import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { CategoryPill, DiffView, PolicyPreview, StatusPill, sectionsToText } from "../components/PolicyParts";
import { PC_BASE, usePolicyContext } from "../PolicyLayout";
import { policyAdminApi, type PolicyVersion } from "../policyAdminApi";

const P = PERMISSIONS;
const fmt = (iso?: string | null, time = false) =>
  iso ? new Date(iso).toLocaleString(undefined, time ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric", year: "numeric" }) : "—";
const who = (p?: { username: string; name: string } | null) => p?.username || p?.name || "—";

/* ============================================================================
   VERSIONS
============================================================================ */

const VERSION_FILTERS = [
  { value: "", label: "All versions" },
  { value: "published", label: "Published" },
  { value: "superseded", label: "Superseded" },
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "rejected", label: "Rejected" },
];

export function VersionsPage() {
  const [params, setParams] = useSearchParams();
  const policyId = params.get("policyId") ?? "";
  const status = params.get("status") ?? "";
  const [page, setPage] = useState(1);
  const policies = useAdminQuery(() => policyAdminApi.list({ page: 1 }), []);
  const { data, loading, error, refetch } = useAdminQuery(() => policyAdminApi.versions({ policyId, status, page }), [policyId, status, page]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setPage(1);
  };

  return (
    <section className="fksm-card">
      <div className="fksm-card__head">
        <h2>
          <Layers size={22} aria-hidden /> Policy Versions
        </h2>
      </div>
      <p className="fksm-muted fkpc-intro">Every version is kept. Restoring an older version creates a new draft from its text — published history is never changed.</p>
      <div className="fkpc-filters">
        <select className="fksm-select" value={policyId} onChange={(e) => setFilter("policyId", e.target.value)} aria-label="Policy">
          <option value="">All policies</option>
          {(policies.data?.items ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <select className="fksm-select" value={status} onChange={(e) => setFilter("status", e.target.value)} aria-label="Status">
          {VERSION_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      {loading && !data ? (
        <SmLoading />
      ) : error ? (
        <SmError message={error} onRetry={() => void refetch()} />
      ) : !data?.items.length ? (
        <SmEmpty icon={<Layers size={22} />} title="No versions" text="No versions match these filters." />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Change summary</th>
                  <th>Created by</th>
                  <th>Approved by</th>
                  <th>Published</th>
                  <th>Effective</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link to={`${PC_BASE}/policies/${v.policyId}`}>{v.policyTitle}</Link>
                    </td>
                    <td>
                      <Link to={`${PC_BASE}/versions/${v.id}`} className="fkpc-strong">
                        v{v.version}
                      </Link>
                      {v.restoredFrom && <small className="fksm-muted"> (from v{v.restoredFrom})</small>}
                    </td>
                    <td>
                      <StatusPill status={v.status} />
                    </td>
                    <td className="fkpc-wrap">{v.changeSummary || "—"}</td>
                    <td>{who(v.createdBy)}</td>
                    <td>{who(v.approvedBy)}</td>
                    <td>{fmt(v.publishedAt)}</td>
                    <td>{fmt(v.effectiveDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} hasMore={data.hasMore} total={data.total} onPage={setPage} />
        </>
      )}
    </section>
  );
}

export function VersionDetailPage() {
  const { versionId = "" } = useParams();
  const navigate = useNavigate();
  const { can } = useAdminAccess();
  const { refresh } = usePolicyContext();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const { data: v, loading, error, refetch } = useAdminQuery(() => policyAdminApi.version(versionId), [versionId]);
  const policy = useAdminQuery(() => (v ? policyAdminApi.get(v.policyId) : Promise.resolve(null)), [v?.policyId]);
  const [view, setView] = useState<"text" | "compare">("text");
  const [other, setOther] = useState<PolicyVersion | null>(null);
  const [otherId, setOtherId] = useState("");
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [newVersion, setNewVersion] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  const others = (policy.data?.versions ?? []).filter((x) => x.id !== versionId);
  useEffect(() => {
    const id = otherId || others[0]?.id;
    if (view !== "compare" || !id) return;
    policyAdminApi.version(id).then(setOther).catch((e) => toast("error", adminError(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, otherId, policy.data]);

  async function restore() {
    setBusy(true);
    try {
      const p = await policyAdminApi.restore(versionId, newVersion.trim(), summary.trim());
      toast("success", `Draft v${newVersion} created from v${v?.version}.`);
      refresh();
      navigate(`${PC_BASE}/policies/${p.id}`);
    } catch (e) {
      toast("error", adminError(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="fksm-card"><SmLoading /></div>;
  if (error || !v) return <div className="fksm-card"><SmError message={error ?? "Not found"} onRetry={() => void refetch()} /></div>;

  return (
    <div className="fkpc-editor">
      <section className="fksm-card fkpc-editor__head">
        <Link to={`${PC_BASE}/versions?policyId=${v.policyId}`} className="fksm-link fkpc-back">
          <ArrowLeft size={15} aria-hidden /> Versions
        </Link>
        <div className="fkpc-editor__title">
          <div>
            <h2>
              {v.policyTitle} — v{v.version}
            </h2>
            <p className="fksm-muted">{v.changeSummary || "No change summary."}</p>
          </div>
          <StatusPill status={v.status} />
        </div>
        <dl className="fkpc-facts">
          <div><dt>Created</dt><dd>{who(v.createdBy)} · {fmt(v.createdAt, true)}</dd></div>
          <div><dt>Submitted</dt><dd>{v.submittedAt ? `${who(v.submittedBy)} · ${fmt(v.submittedAt, true)}` : "—"}</dd></div>
          <div><dt>Approved</dt><dd>{v.approvedAt ? `${who(v.approvedBy)} · ${fmt(v.approvedAt, true)}` : "—"}</dd></div>
          <div><dt>Published</dt><dd>{v.publishedAt ? `${who(v.publishedBy)} · ${fmt(v.publishedAt, true)}` : "—"}</dd></div>
          <div><dt>Effective</dt><dd>{fmt(v.effectiveDate)}</dd></div>
          <div><dt>Acceptance</dt><dd>{v.requiredAcceptance ? "Required" : "Not required"}</dd></div>
        </dl>
        <div className="fkpc-actionbar">
          {can([P.POLICY_EDIT]) && !["draft", "pending_review", "approved", "scheduled"].includes(v.status) && (
            <button type="button" className="fksm-btn fksm-btn--primary" onClick={() => setRestoreOpen((o) => !o)}>
              <RotateCcw size={16} aria-hidden /> Restore as new version
            </button>
          )}
          <Link to={`${PC_BASE}/policies/${v.policyId}`} className="fksm-btn fksm-btn--secondary">
            Open policy
          </Link>
        </div>
        {restoreOpen && (
          <div className="fkpc-restore">
            <p className="fksm-muted">This creates a new draft with v{v.version}'s text. It still has to be approved and published.</p>
            <div className="fkpc-restore__row">
              <label className="fksm-field">
                <span>New version number</span>
                <input className="fksm-input" value={newVersion} onChange={(e) => setNewVersion(e.target.value)} placeholder={policy.data?.publishedVersion ? `Higher than ${policy.data.publishedVersion}` : "e.g. 2.0"} />
              </label>
              <label className="fksm-field fkpc-grow">
                <span>Why restore it?</span>
                <input className="fksm-input" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={1000} />
              </label>
              <button type="button" className="fksm-btn fksm-btn--primary" disabled={busy || !newVersion.trim() || summary.trim().length < 5} onClick={() => void restore()}>
                {busy ? "Creating…" : "Create draft"}
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="fksm-tabs fkpc-subtabs" role="tablist">
        <button type="button" role="tab" aria-selected={view === "text"} className={view === "text" ? "is-active" : ""} onClick={() => setView("text")}>
          <History size={15} aria-hidden /> Content
        </button>
        <button type="button" role="tab" aria-selected={view === "compare"} className={view === "compare" ? "is-active" : ""} onClick={() => setView("compare")} disabled={!others.length}>
          <GitCompare size={15} aria-hidden /> Compare
        </button>
      </div>

      {view === "text" ? (
        <section className="fksm-card">
          <PolicyPreview sections={v.sections} />
        </section>
      ) : (
        <section className="fksm-card">
          <div className="fkpc-compare-bar">
            <span>Compare v{v.version} with</span>
            <select className="fksm-select" value={otherId || others[0]?.id || ""} onChange={(e) => setOtherId(e.target.value)} aria-label="Other version">
              {others.map((o) => (
                <option key={o.id} value={o.id}>
                  v{o.version} — {o.status}
                </option>
              ))}
            </select>
          </div>
          {other ? <DiffView before={sectionsToText(other.sections)} after={sectionsToText(v.sections)} beforeLabel={`v${other.version}`} afterLabel={`v${v.version}`} /> : <SmLoading />}
        </section>
      )}
    </div>
  );
}

/* ============================================================================
   APPROVALS
============================================================================ */

export function ApprovalsPage() {
  const { can } = useAdminAccess();
  const { refresh } = usePolicyContext();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const confirm = useConfirm();
  const [view, setView] = useState<"pending" | "decided" | "all">("pending");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState("");
  const { data, loading, error, refetch } = useAdminQuery(() => policyAdminApi.approvals(view, page), [view, page]);
  const canReview = can([P.POLICY_REVIEW]);

  const done = (msg: string) => {
    toast("success", msg);
    refresh();
    void refetch();
  };

  async function approve(v: PolicyVersion) {
    setBusy(v.id);
    try {
      await policyAdminApi.approve(v.policyId);
      done(`${v.policyTitle} v${v.version} approved.`);
    } catch (e) {
      toast("error", adminError(e));
    } finally {
      setBusy("");
    }
  }

  const decide = (v: PolicyVersion, kind: "reject" | "changes") =>
    confirm.ask(
      kind === "reject"
        ? { title: `Reject ${v.policyTitle} v${v.version}?`, description: "The author sees your reason and can revise and resubmit.", confirmLabel: "Reject", tone: "danger", reasonLabel: "Reason for rejection" }
        : { title: `Request changes to ${v.policyTitle} v${v.version}?`, description: "The version goes back to draft for the author.", confirmLabel: "Request changes", reasonLabel: "What needs to change" },
      async (reason) => {
        if (kind === "reject") await policyAdminApi.reject(v.policyId, reason);
        else await policyAdminApi.requestChanges(v.policyId, reason);
        done(kind === "reject" ? "Version rejected." : "Changes requested.");
      },
    );

  const lastDecision = (v: PolicyVersion) => [...(v.review ?? [])].reverse().find((r) => ["approved", "rejected", "changes_requested", "published"].includes(r.action));

  return (
    <section className="fksm-card">
      <div className="fksm-card__head">
        <h2>
          <FileClock size={22} aria-hidden /> Approval Requests
        </h2>
      </div>
      <div className="fksm-tabs" role="tablist">
        {(["pending", "decided", "all"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={view === t} className={view === t ? "is-active" : ""} onClick={() => { setView(t); setPage(1); }}>
            {t === "pending" ? "Waiting for review" : t === "decided" ? "Decided" : "All"}
          </button>
        ))}
      </div>
      {!canReview && view === "pending" && <p className="fksm-notice fksm-notice--info">You can see approval requests, but your role can't approve or reject them.</p>}
      {loading && !data ? (
        <SmLoading />
      ) : error ? (
        <SmError message={error} onRetry={() => void refetch()} />
      ) : !data?.items.length ? (
        <SmEmpty icon={<CircleCheck size={22} />} title={view === "pending" ? "Nothing waiting" : "No approvals yet"} text={view === "pending" ? "Policy versions sent for approval appear here." : "Decisions on submitted versions appear here."} />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Version</th>
                  <th>Submitted by</th>
                  <th>Submitted</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th className="fkpc-table__actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((v) => {
                  const overdue = v.status === "pending_review" && v.approvalDeadline && new Date(v.approvalDeadline).getTime() < Date.now();
                  const decision = lastDecision(v);
                  return (
                    <tr key={v.id}>
                      <td>
                        <div className="fkpc-cell-stack">
                          <Link to={`${PC_BASE}/policies/${v.policyId}?tab=compare`} className="fkpc-strong">
                            {v.policyTitle}
                          </Link>
                          {v.category && <CategoryPill category={v.category} />}
                        </div>
                      </td>
                      <td>
                        v{v.version}
                        {v.changeSummary && <small className="fkpc-sub">{v.changeSummary}</small>}
                      </td>
                      <td>{who(v.submittedBy)}</td>
                      <td>{fmt(v.submittedAt, true)}</td>
                      <td className={overdue ? "fkpc-overdue" : ""}>{v.status === "pending_review" ? fmt(v.approvalDeadline) : "—"}</td>
                      <td>
                        <StatusPill status={v.status} />
                        {decision?.note && v.status !== "pending_review" && <small className="fkpc-sub">“{decision.note}”</small>}
                      </td>
                      <td className="fkpc-table__actions">
                        <div className="fkpc-row-actions">
                          <Link to={`${PC_BASE}/policies/${v.policyId}?tab=compare`} className="fksm-btn fksm-btn--secondary fksm-btn--sm">
                            Review
                          </Link>
                          {v.status === "pending_review" && canReview && (
                            <>
                              <button type="button" className="fksm-btn fksm-btn--primary fksm-btn--sm" disabled={busy === v.id} onClick={() => void approve(v)}>
                                Approve
                              </button>
                              <button type="button" className="fksm-icon-btn" title="Request changes" aria-label="Request changes" onClick={() => decide(v, "changes")}>
                                <PenLine size={16} />
                              </button>
                              <button type="button" className="fksm-icon-btn fkpc-danger-text" title="Reject" aria-label="Reject" onClick={() => decide(v, "reject")}>
                                <X size={16} />
                              </button>
                            </>
                          )}
                          <Link to={`${PC_BASE}/policies/${v.policyId}?tab=history`} className="fksm-icon-btn" title="Change history" aria-label="Change history">
                            <History size={16} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager page={page} hasMore={data.hasMore} total={data.total} onPage={setPage} />
        </>
      )}
      {confirm.element}
    </section>
  );
}
