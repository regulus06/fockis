import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Clock3, Download, Layers, PackagePlus, Play, Save, ShieldCheck, UsersRound } from "lucide-react";

import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminAccess } from "../../permissions/adminAccess";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { Card, Pager, PersonCell, Pill, SmEmpty, SmError, SmLoading, formatDateTime, useAdminQuery, useConfirm } from "../../support/components/SmParts";
import { formatBytes } from "../../support/components/SmThread";
import { adminError } from "../../support/supportAdminApi";
import { activity, activityDetails, daysLabel, shortDate, toDateInput } from "../components/legalFormat";
import { useLegal } from "../layout/LegalLayout";
import { RECORD_TYPE_LABELS, legalAdminApi, openSigned, type RetentionPolicy } from "../legalAdminApi";

const P = PERMISSIONS;

/* ============================================================================
   EVIDENCE EXPORT
============================================================================ */

export function ExportsPage() {
  const { can } = useAdminAccess();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const confirm = useConfirm();
  const [params] = useSearchParams();
  const requestId = params.get("request") ?? "";
  const [page, setPage] = useState(1);
  const list = useAdminQuery(() => legalAdminApi.exports(page), [page]);
  const canExport = can([P.LEGAL_EVIDENCE_EXPORT]);

  const [caseRef, setCaseRef] = useState("");
  const [lookup, setLookup] = useState("");
  const [lookupDraft, setLookupDraft] = useState("");
  const candidates = useAdminQuery(() => (lookup ? legalAdminApi.evidence({ search: lookup, status: "preserved" }) : Promise.resolve(null)), [lookup]);
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setError(null);
    if (!caseRef.trim() || !selected.length || reason.trim().length < 5) return setError("Add the case reference, pick at least one record and record a reason.");
    setBusy(true);
    try {
      const pkg = await legalAdminApi.createExport({ caseReference: caseRef.trim(), recordIds: selected, requestId: requestId || undefined, reason: reason.trim() });
      toast("success", `Package ${pkg.number} created.`);
      setSelected([]);
      setReason("");
      void list.refetch();
    } catch (err) {
      setError(adminError(err, "Couldn't create the package."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {canExport && (
        <Card title="Create evidence package" icon={<PackagePlus size={20} />}>
          <p className="fksm-muted" style={{ fontSize: 13, marginBottom: 14 }}>
            The package contains each record's snapshot, original and preserved timestamps, file hashes and chain of custody. It is stored privately and every export and download is logged.
            {requestId && " This package is for an approved legal request."}
          </p>
          <div className="fksm-form-grid">
            <label className="fksm-field">
              <span>Case reference <b className="fksm-required">*</b></span>
              <input value={caseRef} maxLength={80} onChange={(e) => setCaseRef(e.target.value)} />
            </label>
            <form className="fksm-field" onSubmit={(e) => { e.preventDefault(); setLookup((lookupDraft || caseRef).trim()); }}>
              <span>Find preserved records</span>
              <div className="fksm-row" style={{ flexWrap: "nowrap" }}>
                <input className="fksm-input" style={{ flex: 1, minWidth: 0 }} placeholder="Case reference, username or record no." value={lookupDraft} onChange={(e) => setLookupDraft(e.target.value)} aria-label="Find records" />
                <button type="submit" className="fksm-btn fksm-btn--secondary fksm-btn--sm" disabled={!(lookupDraft || caseRef).trim()}>Find</button>
              </div>
            </form>
          </div>
          {candidates.loading && lookup ? <SmLoading /> : candidates.data && (
            candidates.data.items.length === 0 ? <p className="fksm-muted" style={{ marginTop: 12 }}>No preserved records for that case.</p> : (
              <ul className="fklg-picklist">
                {candidates.data.items.map((r) => (
                  <li key={r.id}>
                    <label className="fksm-check">
                      <input type="checkbox" checked={selected.includes(r.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, r.id] : selected.filter((x) => x !== r.id))} />
                      <b>{r.number}</b> · {RECORD_TYPE_LABELS[r.recordType] ?? r.recordType} · {r.username ? `@${r.username}` : r.recordId} · preserved {shortDate(r.preservedAt)}
                    </label>
                  </li>
                ))}
              </ul>
            )
          )}
          <label className="fksm-field" style={{ marginTop: 14 }}>
            <span>Reason <b className="fksm-required">*</b></span>
            <textarea rows={2} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {error && <p className="fksm-notice fksm-notice--error" role="alert" style={{ marginTop: 12 }}>{error}</p>}
          <button type="button" className="fksm-btn fksm-btn--primary" style={{ marginTop: 14 }} disabled={busy} onClick={() => void create()}>
            <PackagePlus size={15} /> {busy ? "Creating…" : `Create package${selected.length ? ` (${selected.length})` : ""}`}
          </button>
        </Card>
      )}

      <Card title="Evidence exports" icon={<Download size={20} />}>
        {list.loading && !list.data ? <SmLoading /> : list.error ? <SmError message={list.error} onRetry={list.refetch} /> : !list.data?.items.length ? (
          <SmEmpty icon={<Download size={24} />} title="No exports yet" />
        ) : (
          <>
            <div className="fksm-table-wrap">
              <table className="fksm-table fksm-table--cards">
                <thead><tr><th>Package</th><th>Records</th><th>Exported by</th><th>Date</th><th>Integrity</th><th aria-label="Download" /></tr></thead>
                <tbody>
                  {list.data.items.map((x) => (
                    <tr key={x.id}>
                      <td><span className="fksm-subject"><strong>{x.number}</strong><span>Case #{x.caseReference}</span></span></td>
                      <td>{x.recordNumbers.length}</td>
                      <td><PersonCell person={x.exportedBy} /></td>
                      <td className="fksm-date">{formatDateTime(x.exportedAt)}</td>
                      <td><code className="fklg-code" title={x.packageSha256}>{x.packageSha256.slice(0, 12)}…</code> <span className="fksm-muted">{formatBytes(x.packageBytes)}</span></td>
                      <td className="fksm-actions-cell" style={{ width: "auto" }}>
                        {x.available ? (canExport && (
                          <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => confirm.ask({ title: `Download ${x.number}?`, description: "Downloads are recorded in the access log.", confirmLabel: "Download", reasonLabel: "Reason for download" }, (r) => openSigned(() => legalAdminApi.downloadExport(x.id, r)))}>
                            <Download size={14} /> Download
                          </button>
                        )) : <Pill tone="gray">Removed</Pill>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={setPage} />
          </>
        )}
      </Card>
      {confirm.element}
    </>
  );
}

/* ============================================================================
   ACCESS AUDIT LOG
============================================================================ */

export function AuditPage() {
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const [params, setParams] = useSearchParams();
  const caseReference = params.get("case") ?? "";
  const action = params.get("action") ?? "";
  const page = Number(params.get("page")) || 1;
  const [draft, setDraft] = useState(caseReference);
  const [check, setCheck] = useState<{ intact: boolean; checked: number; brokenAt: number | null } | null>(null);
  const list = useAdminQuery(() => legalAdminApi.audit({ caseReference: caseReference || undefined, action: action || undefined, page }), [caseReference, action, page]);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  return (
    <Card
      title="Access Audit Logs"
      icon={<Clock3 size={20} />}
      action={
        <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => legalAdminApi.verifyAudit().then(setCheck).catch((e) => toast("error", adminError(e)))}>
          <ShieldCheck size={15} /> Verify integrity
        </button>
      }
    >
      {check && (
        <p className={`fksm-notice ${check.intact ? "fksm-notice--ok" : "fksm-notice--error"}`} role="status" style={{ marginBottom: 12 }}>
          {check.intact ? `All ${check.checked.toLocaleString()} entries verified — nothing has been altered or removed.` : `Integrity check failed at entry #${check.brokenAt}. Escalate to a super admin.`}
        </p>
      )}
      <form className="fksm-filters" onSubmit={(e) => { e.preventDefault(); set("case", draft.trim()); }}>
        <input className="fksm-input" style={{ flex: "1 1 200px" }} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Filter by case reference" aria-label="Case reference" />
        <select className="fksm-select" value={action} onChange={(e) => set("action", e.target.value)} aria-label="Action">
          <option value="">All actions</option>
          {["evidence_viewed", "evidence_preserved", "evidence_exported", "export_downloaded", "hold_created", "hold_released", "request_received", "request_verified", "disclosure_approved", "disclosure_denied", "account_deleted", "account_deleted_with_hold", "retention_policy_changed", "retention_run", "archive_searched", "document_opened"].map((a) => (
            <option key={a} value={a}>{activity(a).label}</option>
          ))}
        </select>
      </form>
      {list.loading && !list.data ? <SmLoading /> : list.error ? <SmError message={list.error} onRetry={list.refetch} /> : !list.data?.items.length ? (
        <SmEmpty icon={<Clock3 size={24} />} title="No entries" />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards fklg-activity">
              <thead><tr><th>#</th><th>Activity</th><th>Details</th><th>Admin</th><th>Date &amp; Time</th></tr></thead>
              <tbody>
                {list.data.items.map((e) => {
                  const a = activity(e.action);
                  const [first, second] = activityDetails(e);
                  return (
                    <tr key={e.id}>
                      <td className="fksm-muted">{e.seq}</td>
                      <td><span className={`fklg-act${a.tone ? ` fklg-act--${a.tone}` : ""}`}><a.icon size={18} aria-hidden="true" /><b>{a.label}</b></span></td>
                      <td><span className="fksm-subject fklg-details"><strong title={first}>{first}</strong>{second && <span title={second}>{second}</span>}</span></td>
                      <td><PersonCell person={e.actor} fallback="System" /></td>
                      <td className="fksm-date">{formatDateTime(e.at)}</td>
                    </tr>
                  );
                })}
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
   RETENTION POLICIES
============================================================================ */

const RETENTION_STATUS: Record<string, [string, "green" | "gray" | "amber" | "blue"]> = {
  needs_configuration: ["Not set", "amber"],
  active: ["Active", "green"],
  paused: ["Paused", "gray"],
  under_review: ["Under review", "blue"],
};

type RetentionChanges = { retentionDays: number | null; action: string; enabled: boolean; purpose: string; legalBasis: string; responsibleRole: string; effectiveDate: string | null; nextReviewAt: string | null };

function PolicyCard({ policy, editable, onSave }: { policy: RetentionPolicy; editable: boolean; onSave: (p: RetentionPolicy, changes: RetentionChanges) => void }) {
  const initial = () => ({
    days: policy.retentionDays == null ? "" : String(policy.retentionDays),
    action: policy.action,
    enabled: policy.enabled,
    purpose: policy.purpose,
    legalBasis: policy.legalBasis,
    role: policy.responsibleRole,
    effective: toDateInput(policy.effectiveDate),
    review: toDateInput(policy.nextReviewAt),
  });
  const [f, setF] = useState(initial);
  const [showHistory, setShowHistory] = useState(false);
  const days = f.days === "" ? null : Math.max(1, Math.min(36500, Number(f.days) || 1));
  const dirty = JSON.stringify(f) !== JSON.stringify(initial());
  const [label, tone] = RETENTION_STATUS[policy.status] ?? [policy.status, "gray"];
  const toIso = (d: string) => (d ? new Date(`${d}T00:00:00Z`).toISOString() : null);

  return (
    <div className="fklg-policy">
      <div className="fklg-policy__head">
        <div>
          <h3>
            {policy.label} {policy.jurisdiction !== "global" && <span className="fklg-jur">{policy.jurisdiction}</span>}
          </h3>
          <p>{policy.description}</p>
        </div>
        <span className="fklg-policy__pills">
          {!policy.automated && <Pill tone="gray">Manual review</Pill>}
          {policy.reviewDue && <Pill tone="red">Review due</Pill>}
          <Pill tone={tone}>{label}</Pill>
        </span>
      </div>
      <div className="fksm-form-grid">
        <label className="fksm-field">
          <span>Retention period (days)</span>
          <input type="number" min={1} max={36500} disabled={!editable} value={f.days} placeholder="Not set" onChange={(e) => setF({ ...f, days: e.target.value })} />
          <small>{days ? daysLabel(days) : "No period set — nothing is deleted."}</small>
        </label>
        <label className="fksm-field">
          <span>Then</span>
          <select disabled={!editable} value={f.action} onChange={(e) => setF({ ...f, action: e.target.value as RetentionPolicy["action"] })}>
            <option value="delete">Delete</option>
            <option value="anonymize">Anonymize</option>
          </select>
        </label>
        <label className="fksm-field">
          <span>Legal basis</span>
          <input disabled={!editable} value={f.legalBasis} maxLength={500} placeholder="e.g. statute, regulation or contract" onChange={(e) => setF({ ...f, legalBasis: e.target.value })} />
        </label>
        <label className="fksm-field">
          <span>Purpose</span>
          <input disabled={!editable} value={f.purpose} maxLength={500} onChange={(e) => setF({ ...f, purpose: e.target.value })} />
        </label>
        <label className="fksm-field">
          <span>Responsible role</span>
          <input disabled={!editable} value={f.role} maxLength={120} placeholder="e.g. Compliance Officer" onChange={(e) => setF({ ...f, role: e.target.value })} />
        </label>
        <label className="fksm-field">
          <span>Effective date</span>
          <input type="date" disabled={!editable} value={f.effective} onChange={(e) => setF({ ...f, effective: e.target.value })} />
        </label>
        <label className="fksm-field">
          <span>Next review</span>
          <input type="date" disabled={!editable} value={f.review} onChange={(e) => setF({ ...f, review: e.target.value })} />
        </label>
        {policy.automated ? (
          <label className="fksm-check" style={{ alignSelf: "end", paddingBottom: 10 }}>
            <input type="checkbox" disabled={!editable || !days} checked={f.enabled && Boolean(days)} onChange={(e) => setF({ ...f, enabled: e.target.checked })} /> Apply automatically
          </label>
        ) : (
          <p className="fksm-muted" style={{ alignSelf: "end", fontSize: 12.5 }}>Records in this category live in other systems and are flagged for manual review — the job doesn't delete them.</p>
        )}
      </div>
      <div className="fklg-policy__foot">
        <span className="fksm-muted">
          Last run {policy.lastRunAt ? `${formatDateTime(policy.lastRunAt)} · ${policy.lastRunAffected} record(s)` : "never"}
          {policy.lastRunNote ? ` · ${policy.lastRunNote}` : ""}
          {policy.updatedBy ? ` · changed by ${policy.updatedBy.username || policy.updatedBy.name}` : ""}
        </span>
        <span className="fklg-policy__actions">
          {policy.history.length > 0 && (
            <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => setShowHistory((v) => !v)}>
              {showHistory ? "Hide history" : `History (${policy.history.length})`}
            </button>
          )}
          {editable && dirty && (
            <button
              type="button"
              className="fksm-btn fksm-btn--primary fksm-btn--sm"
              onClick={() => onSave(policy, { retentionDays: days, action: f.action, enabled: f.enabled && Boolean(days), purpose: f.purpose, legalBasis: f.legalBasis, responsibleRole: f.role, effectiveDate: toIso(f.effective), nextReviewAt: toIso(f.review) })}
            >
              <Save size={14} /> Save changes
            </button>
          )}
        </span>
      </div>
      {showHistory && (
        <ul className="fklg-history">
          {policy.history.map((h, i) => (
            <li key={i}>
              <strong>{h.changes}</strong>
              <span>
                {formatDateTime(h.at)} · {h.by?.username || h.by?.name || "System"}
                {h.reason ? ` — ${h.reason}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddJurisdictionRule({ categories, onCreate }: { categories: RetentionPolicy[]; onCreate: (recordType: string, jurisdiction: string) => void }) {
  const [recordType, setRecordType] = useState(categories[0]?.recordType ?? "");
  const [jurisdiction, setJurisdiction] = useState("");
  return (
    <form
      className="fksm-filters"
      onSubmit={(e) => {
        e.preventDefault();
        if (jurisdiction.trim()) onCreate(recordType, jurisdiction.trim().toUpperCase());
      }}
    >
      <select className="fksm-select" value={recordType} onChange={(e) => setRecordType(e.target.value)} aria-label="Category">
        {categories.map((c) => (
          <option key={c.recordType} value={c.recordType}>
            {c.label}
          </option>
        ))}
      </select>
      <input className="fksm-input" style={{ flex: "0 1 200px" }} value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} placeholder="Jurisdiction (US, EU, US-CA…)" aria-label="Jurisdiction" maxLength={21} />
      <button type="submit" className="fksm-btn fksm-btn--secondary" disabled={!jurisdiction.trim()}>
        Add jurisdiction rule
      </button>
    </form>
  );
}

export function RetentionPage() {
  const { can } = useAdminAccess();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const { refreshCounts } = useLegal();
  const confirm = useConfirm();
  const list = useAdminQuery(() => legalAdminApi.policies(), []);
  const editable = can([P.LEGAL_RETENTION_MANAGE]);
  const [jurisdiction, setJurisdiction] = useState("all");
  const items = list.data ?? [];
  const jurisdictions = Array.from(new Set(items.map((p) => p.jurisdiction)));
  const shown = items.filter((p) => jurisdiction === "all" || p.jurisdiction === jurisdiction);
  const unset = items.filter((p) => p.jurisdiction === "global" && p.retentionDays == null).length;

  return (
    <Card
      title="Retention Settings"
      icon={<Layers size={20} />}
      action={editable ? (
        <button
          type="button"
          className="fksm-btn fksm-btn--secondary fksm-btn--sm"
          onClick={() =>
            confirm.ask({ title: "Run retention now?", description: "Applies every active rule now. Records under an active legal hold are always skipped. The job also runs automatically every 6 hours.", confirmLabel: "Run now", typeToConfirm: "RUN" }, async () => {
              const result = await legalAdminApi.runRetention();
              const total = Object.values(result.affected).reduce((a, b) => a + b, 0);
              toast("success", `Retention ran: ${total} record(s) affected.`);
              void list.refetch();
              refreshCounts();
            })
          }
        >
          <Play size={15} /> Run now
        </button>
      ) : undefined}
    >
      <p className="fksm-notice fksm-notice--info" style={{ marginBottom: 12 }}>
        Fockis doesn't pre-fill retention periods. Set each period with legal counsel for the jurisdictions you operate in. Until a period is set and the rule is switched on, nothing in that category is deleted automatically. Anything under an active legal hold is always kept. Every change is recorded with your reason.
      </p>
      {unset > 0 && <p className="fksm-notice fksm-notice--warn" style={{ marginBottom: 12 }}>{unset} categor{unset === 1 ? "y has" : "ies have"} no retention period yet.</p>}
      {list.loading && !list.data ? <SmLoading /> : list.error ? <SmError message={list.error} onRetry={list.refetch} /> : (
        <>
          <div className="fksm-filters">
            <select className="fksm-select" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} aria-label="Jurisdiction">
              <option value="all">All jurisdictions</option>
              {jurisdictions.map((j) => (
                <option key={j} value={j}>
                  {j === "global" ? "Global (default)" : j}
                </option>
              ))}
            </select>
          </div>
          {editable && (
            <AddJurisdictionRule
              categories={items.filter((p) => p.jurisdiction === "global")}
              onCreate={(recordType, j) =>
                confirm.ask({ title: `Add a ${j} rule?`, description: "Creates a separate rule for this jurisdiction. It starts without a period.", confirmLabel: "Add rule", reasonLabel: "Reason / legal reference" }, async (reason) => {
                  await legalAdminApi.createRetentionRule({ recordType, jurisdiction: j, reason });
                  toast("success", `${j} rule added.`);
                  void list.refetch();
                })
              }
            />
          )}
          <div className="fksm-stack">
            {shown.map((p) => (
              <PolicyCard
                key={`${p.id}-${p.updatedAt}`}
                policy={p}
                editable={editable}
                onSave={(policy, changes) =>
                  confirm.ask({ title: `Change “${policy.label}”${policy.jurisdiction !== "global" ? ` (${policy.jurisdiction})` : ""}?`, description: "Changes are recorded with your reason in the rule history and the access log.", confirmLabel: "Save rule", reasonLabel: "Reason / legal approval reference" }, async (reason) => {
                    await legalAdminApi.updatePolicy(policy.recordType, { ...changes, reason }, policy.jurisdiction);
                    toast("success", "Retention rule saved.");
                    void list.refetch();
                    refreshCounts();
                  })
                }
              />
            ))}
          </div>
        </>
      )}
      {confirm.element}
    </Card>
  );
}

/* ============================================================================
   DELETED ACCOUNT RECORDS
============================================================================ */

const DELETION_STATUS: Record<string, [string, "green" | "red" | "amber" | "gray" | "blue"]> = {
  requested: ["Requested", "blue"],
  processing: ["Processing", "amber"],
  completed: ["Completed", "green"],
  completed_with_hold: ["Completed · hold applied", "red"],
  failed: ["Failed", "red"],
};

export function DeletionsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "all";
  const search = params.get("q") ?? "";
  const page = Number(params.get("page")) || 1;
  const [draft, setDraft] = useState(search);
  const list = useAdminQuery(() => legalAdminApi.deletions({ status, search: search || undefined, page }), [status, search, page]);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  return (
    <Card title="Deleted Account Records" icon={<UsersRound size={20} />}>
      <p className="fksm-muted" style={{ fontSize: 13, marginBottom: 12 }}>
        A minimal register of account deletions: dates, outcome and counts only — no profile content. After the retention period the account ID is removed too.
      </p>
      <form className="fksm-filters" onSubmit={(e) => { e.preventDefault(); set("q", draft.trim()); }}>
        <input className="fksm-input" style={{ flex: "1 1 200px" }} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Deletion number (DA-…) or account ID" aria-label="Search deletions" />
        <select className="fksm-select" value={status} onChange={(e) => set("status", e.target.value === "all" ? "" : e.target.value)} aria-label="Status">
          <option value="all">All outcomes</option>
          {Object.entries(DELETION_STATUS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </form>
      {list.loading && !list.data ? <SmLoading /> : list.error ? <SmError message={list.error} onRetry={list.refetch} /> : !list.data?.items.length ? (
        <SmEmpty icon={<UsersRound size={24} />} title="No deletion records" text="When people delete their accounts, the outcome is recorded here." />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards">
              <thead><tr><th>Record</th><th>Account ID</th><th>Requested</th><th>Outcome</th><th>Kept under hold</th><th>Removed</th></tr></thead>
              <tbody>
                {list.data.items.map((d) => {
                  const [label, tone] = DELETION_STATUS[d.status] ?? [d.status, "gray"];
                  return (
                    <tr key={d.id}>
                      <td><span className="fksm-subject"><strong>{d.number}</strong><span>{d.source === "user" ? "Requested by the user" : "Admin deletion"}</span></span></td>
                      <td>{d.userId ? <code className="fklg-code">{d.userId}</code> : <span className="fksm-muted">Anonymized {shortDate(d.anonymizedAt)}</span>}</td>
                      <td className="fksm-date">{formatDateTime(d.requestedAt)}</td>
                      <td><Pill tone={tone}>{label}</Pill></td>
                      <td>{d.holdNumbers.length ? d.holdNumbers.join(", ") : "—"}{d.summary.postsRetained ? <div className="fksm-muted" style={{ fontSize: 12 }}>{d.summary.postsRetained} post(s) kept</div> : null}</td>
                      <td className="fksm-date">{d.summary.postsDeleted ?? 0} posts · {d.summary.commentsDeleted ?? 0} comments{d.summary.accountDeleted ? " · account" : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={(p) => set("page", String(p))} />
        </>
      )}
    </Card>
  );
}
