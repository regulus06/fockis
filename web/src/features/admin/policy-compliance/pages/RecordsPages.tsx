import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Database, Download, FileCheck2, Lock, ScrollText, Settings, ShieldAlert, ShieldCheck, UserRoundCog } from "lucide-react";

import { adminError } from "../../support/supportAdminApi";
import { Pager, Pill, SmEmpty, SmError, SmLoading, useAdminQuery } from "../../support/components/SmParts";
import { useAdminAccess } from "../../permissions/adminAccess";
import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { actionLabel, downloadText } from "../components/PolicyParts";
import { policyAdminApi, type AdminDataRequest, type PolicySettings } from "../policyAdminApi";

const P = PERMISSIONS;
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

/* ============================================================================
   ACCEPTANCE RECORDS
============================================================================ */

export function AcceptancesPage() {
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const policies = useAdminQuery(() => policyAdminApi.list({ page: 1 }), []);
  const [draft, setDraft] = useState({ policyId: "", version: "", user: "", from: "", to: "" });
  const [filters, setFilters] = useState(draft);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const range = { ...filters, from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : "", to: filters.to ? new Date(`${filters.to}T23:59:59`).toISOString() : "" };
  const { data, loading, error, refetch } = useAdminQuery(() => policyAdminApi.acceptances({ ...range, page }), [JSON.stringify(filters), page]);

  async function exportCsv() {
    setExporting(true);
    try {
      const { filename, csv } = await policyAdminApi.exportAcceptances(range);
      downloadText(filename, csv);
      toast("success", "Export downloaded. This export was recorded in the audit log.");
    } catch (e) {
      toast("error", adminError(e));
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="fksm-card">
      <div className="fksm-card__head">
        <h2>
          <FileCheck2 size={22} aria-hidden /> Acceptance Records
        </h2>
        <button type="button" className="fksm-btn fksm-btn--secondary" onClick={() => void exportCsv()} disabled={exporting || !data?.total}>
          <Download size={16} aria-hidden /> {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>
      <p className="fksm-muted fkpc-intro">Only the account reference, policy, version, time and source are shown. Exports are logged as sensitive audit events.</p>
      <form
        className="fkpc-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters(draft);
          setPage(1);
        }}
      >
        <input className="fksm-input" value={draft.user} onChange={(e) => setDraft({ ...draft, user: e.target.value })} placeholder="@username or account ID" aria-label="Account" />
        <select className="fksm-select" value={draft.policyId} onChange={(e) => setDraft({ ...draft, policyId: e.target.value })} aria-label="Policy">
          <option value="">All policies</option>
          {(policies.data?.items ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <input className="fksm-input fkpc-narrow" value={draft.version} onChange={(e) => setDraft({ ...draft, version: e.target.value })} placeholder="Version" aria-label="Version" />
        <input type="date" className="fksm-input fkpc-narrow" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} aria-label="From" />
        <input type="date" className="fksm-input fkpc-narrow" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} aria-label="To" />
        <button type="submit" className="fksm-btn fksm-btn--primary">
          Apply
        </button>
      </form>
      {loading && !data ? (
        <SmLoading />
      ) : error ? (
        <SmError message={error} onRetry={() => void refetch()} />
      ) : !data?.items.length ? (
        <SmEmpty icon={<FileCheck2 size={22} />} title="No records" text="No acceptance records match these filters." />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Policy</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Accepted</th>
                  <th>Source</th>
                  <th>Consent type</th>
                  <th>Jurisdiction</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id}>
                    <td>{r.user ? `@${r.user.username || r.user.id}` : <span className="fksm-muted">Deleted account</span>}</td>
                    <td>{r.policyTitle}</td>
                    <td>v{r.version}</td>
                    <td>{r.current ? <Pill tone="green" dot>Current version</Pill> : <Pill tone="gray">Earlier version</Pill>}</td>
                    <td>{fmt(r.acceptedAt)}</td>
                    <td>{r.source === "registration" ? "Sign-up" : r.source === "policy_center" ? "Policy Center" : r.source}</td>
                    <td>{r.consentType.replace(/_/g, " ")}</td>
                    <td>{r.jurisdiction || "—"}</td>
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

/* ============================================================================
   AUDIT LOGS
============================================================================ */

const AUDIT_ACTIONS = ["policy_created", "policy_edited", "version_created", "policy_submitted", "policy_approved", "policy_rejected", "policy_changes_requested", "policy_scheduled", "policy_published", "policy_archived", "acceptance_requirement_changed", "policy_settings_changed", "acceptance_exported", "data_correction_resolved", "rule_published"];

export function AuditPage() {
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [integrity, setIntegrity] = useState<{ intact: boolean; checked: number; brokenAt: number | null } | null>(null);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);
  const { data, loading, error, refetch } = useAdminQuery(() => policyAdminApi.audit({ action, search: query, page }), [action, query, page]);

  async function verify() {
    setChecking(true);
    try {
      setIntegrity(await policyAdminApi.verifyAudit());
    } catch (e) {
      toast("error", adminError(e));
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="fksm-card">
      <div className="fksm-card__head">
        <h2>
          <ScrollText size={22} aria-hidden /> Audit Logs
        </h2>
        <button type="button" className="fksm-btn fksm-btn--secondary" onClick={() => void verify()} disabled={checking}>
          <ShieldCheck size={16} aria-hidden /> {checking ? "Checking…" : "Verify integrity"}
        </button>
      </div>
      <p className="fksm-muted fkpc-intro">Entries are chained with SHA-256 hashes and can't be edited or deleted. Sensitive entries are shown only to roles with acceptance-record access.</p>
      {integrity && (
        <p className={`fksm-notice${integrity.intact ? " fksm-notice--ok" : " fksm-notice--error"}`} role="status">
          {integrity.intact ? `All ${integrity.checked.toLocaleString()} entries verified — the log hasn't been altered.` : `The log chain is broken at entry #${integrity.brokenAt}. Contact security.`}
        </p>
      )}
      <div className="fkpc-filters">
        <label className="fksm-search fkpc-filters__search">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by policy or record" aria-label="Search" />
        </label>
        <select className="fksm-select" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} aria-label="Action">
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {actionLabel(a)}
            </option>
          ))}
        </select>
      </div>
      {loading && !data ? (
        <SmLoading />
      ) : error ? (
        <SmError message={error} onRetry={() => void refetch()} />
      ) : !data?.items.length ? (
        <SmEmpty icon={<ScrollText size={22} />} title="No entries" text="Nothing matches these filters." />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e.id}>
                    <td className="fksm-muted">{e.seq}</td>
                    <td>{fmt(e.at)}</td>
                    <td>{e.actor?.username || e.actor?.name || "System"}</td>
                    <td>{e.actorRole.replace(/_/g, " ")}</td>
                    <td>
                      {actionLabel(e.action)} {e.sensitive && <Pill tone="amber"><Lock size={11} aria-hidden /> Sensitive</Pill>}
                    </td>
                    <td className="fkpc-wrap">{e.targetLabel || e.targetType.replace(/_/g, " ")}</td>
                    <td className="fkpc-wrap fksm-muted">{e.summary || "—"}</td>
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

/* ============================================================================
   SETTINGS (+ privacy correction requests)
============================================================================ */

function CorrectionRequests() {
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const [view, setView] = useState("open");
  const { data, loading, error, refetch } = useAdminQuery(() => policyAdminApi.dataRequests({ type: "correction", view }), [view]);
  const [active, setActive] = useState<AdminDataRequest | null>(null);
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);

  async function resolve(status: "completed" | "rejected") {
    if (!active) return;
    setBusy(true);
    try {
      await policyAdminApi.resolveRequest(active.id, status, response.trim());
      toast("success", "The member was notified.");
      setActive(null);
      setResponse("");
      void refetch();
    } catch (e) {
      toast("error", adminError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="fksm-card">
      <div className="fksm-card__head">
        <h2>
          <UserRoundCog size={20} aria-hidden /> Data correction requests
        </h2>
      </div>
      <div className="fksm-tabs">
        {["open", "completed", "all"].map((v) => (
          <button key={v} type="button" className={view === v ? "is-active" : ""} onClick={() => setView(v)}>
            {v === "open" ? "Open" : v === "completed" ? "Closed" : "All"}
          </button>
        ))}
      </div>
      {loading && !data ? (
        <SmLoading />
      ) : error ? (
        <SmError message={error} onRetry={() => void refetch()} />
      ) : !data?.items.length ? (
        <p className="fksm-muted">No requests.</p>
      ) : (
        <ul className="fkpc-requests">
          {data.items.map((r) => (
            <li key={r.id}>
              <div>
                <strong>
                  {r.number} · {r.field.replace(/_/g, " ")}
                </strong>
                <span className="fksm-muted">
                  @{r.user?.username || "deleted"} · {fmt(r.createdAt)}
                </span>
                <p>{r.details}</p>
                {r.response && <p className="fksm-muted">Reply: {r.response}</p>}
              </div>
              {["pending", "processing"].includes(r.status) ? (
                <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => setActive(r)}>
                  Respond
                </button>
              ) : (
                <Pill tone={r.status === "completed" ? "green" : "gray"}>{r.status}</Pill>
              )}
              {active?.id === r.id && (
                <div className="fkpc-respond">
                  <textarea className="fksm-input" rows={3} value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Reply to the member (they'll see this)" maxLength={1000} />
                  <div className="fkpc-row-actions">
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => setActive(null)}>
                      Cancel
                    </button>
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" disabled={busy || response.trim().length < 3} onClick={() => void resolve("rejected")}>
                      Decline
                    </button>
                    <button type="button" className="fksm-btn fksm-btn--primary fksm-btn--sm" disabled={busy || response.trim().length < 3} onClick={() => void resolve("completed")}>
                      Mark corrected
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SettingsPage() {
  const { can } = useAdminAccess();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const { data, setData, loading, error, refetch } = useAdminQuery(() => policyAdminApi.settings(), []);
  const [form, setForm] = useState<PolicySettings | null>(null);
  const [busy, setBusy] = useState(false);
  const editable = can([P.POLICY_SETTINGS]);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  async function save() {
    if (!form) return;
    setBusy(true);
    try {
      const { defaultReviewDays, requireIndependentApproval, approvalDeadlineDays, notifyUsersOnRequiredUpdate, notifyApprovers, acceptanceGraceDays } = form;
      const saved = await policyAdminApi.updateSettings({ defaultReviewDays: Number(defaultReviewDays), requireIndependentApproval, approvalDeadlineDays: Number(approvalDeadlineDays), notifyUsersOnRequiredUpdate, notifyApprovers, acceptanceGraceDays: Number(acceptanceGraceDays) });
      setData(saved);
      toast("success", "Settings saved and recorded in the audit log.");
    } catch (e) {
      toast("error", adminError(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <div className="fksm-card"><SmLoading /></div>;
  if (error || !form) return <div className="fksm-card"><SmError message={error ?? "Unavailable"} onRetry={() => void refetch()} /></div>;
  const num = (k: keyof PolicySettings, v: string) => setForm({ ...form, [k]: v === "" ? "" : Number(v) } as PolicySettings);
  const flag = (k: keyof PolicySettings) => (
    <input type="checkbox" checked={Boolean(form[k])} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} disabled={!editable} />
  );

  return (
    <div className="fkpc-grid fkpc-grid--even">
      <section className="fksm-card">
        <div className="fksm-card__head">
          <h2>
            <Settings size={22} aria-hidden /> Policy Settings
          </h2>
        </div>
        {!editable && <p className="fksm-notice fksm-notice--info">You can view these settings. Changing them needs the Policy settings permission.</p>}
        <div className="fkpc-settings">
          <h3 className="fkpc-h3">Review &amp; approval</h3>
          <label className="fksm-field">
            <span>Default policy review period (days)</span>
            <input type="number" min={30} max={1825} className="fksm-input fkpc-narrow" value={form.defaultReviewDays} onChange={(e) => num("defaultReviewDays", e.target.value)} disabled={!editable} />
            <small className="fksm-muted">New policies get a review date this far ahead.</small>
          </label>
          <label className="fksm-field">
            <span>Approval deadline (days after submission)</span>
            <input type="number" min={1} max={90} className="fksm-input fkpc-narrow" value={form.approvalDeadlineDays} onChange={(e) => num("approvalDeadlineDays", e.target.value)} disabled={!editable} />
          </label>
          <label className="fksm-check">
            {flag("requireIndependentApproval")}
            <span>Require approval by someone other than the submitter (super admins excepted)</span>
          </label>
          <h3 className="fkpc-h3">Notifications &amp; acceptance</h3>
          <label className="fksm-check">
            {flag("notifyApprovers")}
            <span>Notify approvers when a version is submitted</span>
          </label>
          <label className="fksm-check">
            {flag("notifyUsersOnRequiredUpdate")}
            <span>Notify members when a policy that needs acceptance is updated</span>
          </label>
          <label className="fksm-field">
            <span>Acceptance grace period (days)</span>
            <input type="number" min={1} max={365} className="fksm-input fkpc-narrow" value={form.acceptanceGraceDays} onChange={(e) => num("acceptanceGraceDays", e.target.value)} disabled={!editable} />
            <small className="fksm-muted">Shown to members as the time they have to review an update.</small>
          </label>
          <h3 className="fkpc-h3">Versions</h3>
          <p className="fksm-muted">Published versions are never overwritten or deleted. Every change creates a new version that goes through approval.</p>
        </div>
        {editable && (
          <div className="fkpc-actionbar">
            <button type="button" className="fksm-btn fksm-btn--primary" onClick={() => void save()} disabled={busy}>
              {busy ? "Saving…" : "Save settings"}
            </button>
          </div>
        )}
      </section>

      <div className="fkpc-side">
        <section className="fksm-card">
          <div className="fksm-card__head">
            <h2>
              <Database size={20} aria-hidden /> Retention
            </h2>
          </div>
          <p className="fksm-muted">Retention rules for deleted accounts, policy acceptances, financial and security records, legal holds and backups are configured per jurisdiction in Legal &amp; Evidence. No period is applied until compliance staff set one.</p>
          <Link to="/admin/legal/retention" className="fksm-btn fksm-btn--secondary">
            Open Retention Settings
          </Link>
        </section>
        <section className="fksm-card">
          <div className="fksm-card__head">
            <h2>
              <ShieldAlert size={20} aria-hidden /> Roles &amp; permissions
            </h2>
          </div>
          <p className="fksm-muted">Three roles are available: Policy Editor (draft and submit), Policy Approver (review and approve) and Compliance Officer (publish, acceptance records, audit). Assign them to administrators in Administrators → Roles.</p>
          {can([P.ROLES_VIEW]) && (
            <Link to="/admin/roles" className="fksm-btn fksm-btn--secondary">
              Manage roles
            </Link>
          )}
        </section>
        {can([P.POLICY_ACCEPTANCE_VIEW]) && <CorrectionRequests />}
      </div>
    </div>
  );
}
