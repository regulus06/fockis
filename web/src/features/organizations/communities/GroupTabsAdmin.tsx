/**
 * GroupTabsAdmin.tsx — Reports (with PDF / Excel / CSV export) and Settings
 * (edit via the wizard, services, privacy shortcuts, status, archive/delete,
 * audit log).
 */

import { useState } from "react";
import { Archive, BarChart3, FileDown, FileSpreadsheet, FileText, History, Loader2, Pencil, RotateCcw, Star, Trash2 } from "lucide-react";

import { exportCsv, exportPdf, exportXlsx, safeFileName, type Cell } from "../ministries/reportExport";
import { SERVICE_LABELS, STATUS_LABELS, categoryLabel, communitiesApi, type GroupSettings } from "./communitiesApi";
import { Empty, fmtDate, money } from "./GroupParts";
import GroupWizard from "./GroupWizard";
import { ErrorBox, Loading, act, useLoad, type TabProps } from "./GroupTabKit";

/* ============================================================================
 * Reports
 * ========================================================================== */

export function ReportsTab({ organizationId, group, notify }: TabProps) {
  const rep = useLoad((s) => communitiesApi.report(organizationId, group.id, s), [organizationId, group.id]);
  if (rep.error) return <ErrorBox text={rep.error} />;
  if (!rep.data) return <Loading rows={2} height={100} />;
  const r = rep.data;
  const pct = (n: number | null) => (n === null ? "—" : `${n}%`);
  const max = Math.max(1, ...r.growth.map((g) => g.joined));

  const summaryRows: Cell[][] = [
    ["Members", r.members],
    ["New members (90 days)", r.newMembers90Days],
    ["Meetings (90 days)", r.meetings90Days],
    ["Activities (90 days)", r.activities90Days],
    ["Attendance rate", pct(r.attendanceRate)],
    ["Engaged members", r.engagedMembers],
    ["Engagement rate", pct(r.engagementRate)],
  ];
  if (r.finance) {
    const f = r.finance;
    summaryRows.push(
      ["Total contributions", money(f.totalContributions, f.currency)],
      ["Funds from church", money(f.fundsFromChurch, f.currency)],
      ["Total expenses", money(f.totalExpenses, f.currency)],
      ["Available balance", money(f.availableBalance, f.currency)],
      ["Contributors", f.totalContributors],
      ["Fundraising collected", money(f.fundraising.collected, f.currency)],
    );
  }
  const growthRows: Cell[][] = r.growth.map((g) => [g.label, g.joined]);
  const file = safeFileName(`${r.group.name}-report`);
  const exportAll = (kind: "csv" | "xlsx" | "pdf") => {
    try {
      if (kind === "csv") exportCsv(file, ["Metric", "Value"], [...summaryRows, [], ["Month", "New members"], ...growthRows]);
      else if (kind === "xlsx") exportXlsx(file, "Report", ["Metric", "Value"], [...summaryRows, [], ["Month", "New members"], ...growthRows]);
      else if (!exportPdf(`${r.group.name} — Group report`, `${categoryLabel(r.group.category)} · Generated ${fmtDate(r.generatedAt, true)}`, [{ heading: "Summary", headers: ["Metric", "Value"], rows: summaryRows }, { heading: "Membership growth", headers: ["Month", "New members"], rows: growthRows }])) notify("error", "Allow pop-ups to save the PDF.");
    } catch {
      notify("error", "The export could not be created.");
    }
  };

  return (
    <div className="mn-stack">
      <div className="mn-row mn-row--between">
        <p className="mn-muted">Generated {fmtDate(r.generatedAt, true)} · last 90 days unless noted.</p>
        <div className="mn-row">
          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => exportAll("pdf")}>
            <FileText aria-hidden="true" /> PDF
          </button>
          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => exportAll("xlsx")}>
            <FileSpreadsheet aria-hidden="true" /> Excel
          </button>
          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => exportAll("csv")}>
            <FileDown aria-hidden="true" /> CSV
          </button>
        </div>
      </div>
      <div className="mn-kpis gc-kpis3">
        <Stat label="Members" value={r.members} sub={`+${r.newMembers90Days} in 90 days`} />
        <Stat label="Meetings" value={r.meetings90Days} />
        <Stat label="Activities" value={r.activities90Days} />
        <Stat label="Attendance rate" value={pct(r.attendanceRate)} />
        <Stat label="Engagement" value={pct(r.engagementRate)} sub={`${r.engagedMembers} engaged members`} />
        {r.finance && <Stat label="Balance" value={money(r.finance.availableBalance, r.finance.currency)} sub={`${money(r.finance.totalContributions, r.finance.currency)} in`} />}
      </div>
      <section className="mn-panel">
        <h3 className="gc-h3">
          <BarChart3 aria-hidden="true" /> Membership growth
        </h3>
        {r.growth.every((g) => g.joined === 0) ? (
          <p className="mn-muted">No new members in this period.</p>
        ) : (
          <ul className="mn-bars">
            {r.growth.map((g) => (
              <li key={g.label}>
                <span>{g.label}</span>
                <i style={{ width: `${Math.round((g.joined / max) * 100)}%` }} />
                <b>{g.joined}</b>
              </li>
            ))}
          </ul>
        )}
      </section>
      {r.finance && (
        <section className="mn-panel">
          <h3 className="gc-h3">Financial summary</h3>
          <dl className="mn-dl gc-dl">
            <dt>Contributions</dt>
            <dd>{money(r.finance.totalContributions, r.finance.currency)}</dd>
            <dt>Funds from church</dt>
            <dd>{money(r.finance.fundsFromChurch, r.finance.currency)}</dd>
            <dt>Expenses</dt>
            <dd>{money(r.finance.totalExpenses, r.finance.currency)}</dd>
            <dt>Available balance</dt>
            <dd>{money(r.finance.availableBalance, r.finance.currency)}</dd>
            <dt>Pending requests</dt>
            <dd>{r.finance.pendingRequests}</dd>
          </dl>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div>
      <small className="gc-kpi__label">{label}</small>
      <b>{value}</b>
      {sub && <span>{sub}</span>}
    </div>
  );
}

/* ============================================================================
 * Settings
 * ========================================================================== */

export function SettingsTab({ organizationId, group, notify, onChanged, onDeleted }: TabProps & { onDeleted: () => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [services, setServices] = useState(group.settings.services);
  const audit = useLoad((s) => communitiesApi.audit(organizationId, group.id, s), [organizationId, group.id]);
  const governs = group.viewer.governs;
  const archived = group.status === "archived";

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    if (await act(notify, fn, ok, "The change could not be saved.")) {
      onChanged();
      audit.reload();
    }
    setBusy(null);
  }
  const saveServices = () => run("services", () => communitiesApi.update(organizationId, group.id, { settings: { services } as Partial<GroupSettings> }), "Services updated.");
  const dirty = JSON.stringify(services) !== JSON.stringify(group.settings.services);

  return (
    <div className="mn-stack">
      <section className="mn-panel">
        <div className="mn-row mn-row--between">
          <div>
            <h3 className="gc-h3">Group details</h3>
            <p className="mn-muted">Name, category, images, leadership, membership rules, meeting schedule and privacy.</p>
          </div>
          <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" /> Edit group
          </button>
        </div>
        <dl className="mn-dl gc-dl">
          <dt>Visibility</dt>
          <dd>{group.settings.visibility}</dd>
          <dt>Joining</dt>
          <dd>{group.settings.requireApproval ? `Approval by ${group.settings.approver === "church" ? "church leadership" : "group leaders"}` : "Open"}</dd>
          <dt>Invitations</dt>
          <dd>{group.settings.membersCanInvite ? "Members can invite" : "Leaders only"}{group.settings.allowExternalInvites ? " · external email allowed" : ""}</dd>
          <dt>Status</dt>
          <dd>{STATUS_LABELS[group.status] ?? group.status}</dd>
          <dt>Currency</dt>
          <dd>{group.settings.currency}</dd>
        </dl>
      </section>

      <section className="mn-panel">
        <h3 className="gc-h3">Group services</h3>
        <p className="mn-muted">Turn features on or off for this group. Turning one off hides its tab; existing records are kept.</p>
        <div className="gc-services">
          {SERVICE_LABELS.map(([k, label, hint]) => (
            <label key={k} className="mn-check">
              <input type="checkbox" checked={Boolean(services[k as keyof GroupSettings["services"]])} onChange={(e) => setServices((x) => ({ ...x, [k]: e.target.checked }))} />
              <span>
                <b>{label}</b>
                <small>{hint}</small>
              </span>
            </label>
          ))}
        </div>
        <div className="mn-row mn-row--end">
          <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" disabled={!dirty || busy === "services"} onClick={saveServices}>
            {busy === "services" && <Loader2 className="mn-spin" aria-hidden="true" />} Save services
          </button>
        </div>
      </section>

      {governs && (
        <section className="mn-panel">
          <h3 className="gc-h3">Church oversight</h3>
          <div className="mn-row gc-wrap">
            <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" disabled={busy === "feature"} onClick={() => run("feature", () => communitiesApi.update(organizationId, group.id, { featured: !group.featured }), group.featured ? "Removed from featured." : "Featured on the dashboard.")}>
              <Star aria-hidden="true" /> {group.featured ? "Unfeature" : "Feature this group"}
            </button>
            {!archived && (
              <select
                className="mn-input gc-narrow"
                value={group.status}
                aria-label="Status"
                onChange={(e) => run("status", () => communitiesApi.update(organizationId, group.id, { status: e.target.value as "active" | "inactive" | "draft" }), "Status updated.")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
            )}
          </div>
        </section>
      )}

      {(governs || group.viewer.groupRole === "leader") && (
        <section className="mn-panel gc-danger">
          <h3 className="gc-h3">Archive or delete</h3>
          <p className="mn-muted">Archived groups are read-only and hidden from members' lists. Deleted groups can be restored by church leadership from Deleted Groups.</p>
          <div className="mn-row gc-wrap">
            <button
              type="button"
              className="mn-btn mn-btn--outline mn-btn--sm"
              disabled={busy === "archive"}
              onClick={() => {
                if (!archived && !window.confirm(`Archive ${group.name}?`)) return;
                void run("archive", () => communitiesApi.archive(organizationId, group.id, archived), archived ? "Group restored." : "Group archived.");
              }}
            >
              {archived ? <RotateCcw aria-hidden="true" /> : <Archive aria-hidden="true" />} {archived ? "Restore group" : "Archive group"}
            </button>
            {governs && (
              <button
                type="button"
                className="mn-btn mn-btn--danger mn-btn--sm"
                disabled={busy === "delete"}
                onClick={async () => {
                  if (!window.confirm(`Delete ${group.name}? Church leadership can restore it from Deleted Groups.`)) return;
                  setBusy("delete");
                  if (await act(notify, () => communitiesApi.softDelete(organizationId, group.id), "Group deleted.", "The group could not be deleted.")) onDeleted();
                  setBusy(null);
                }}
              >
                <Trash2 aria-hidden="true" /> Delete group
              </button>
            )}
          </div>
        </section>
      )}

      <section className="mn-panel">
        <h3 className="gc-h3">
          <History aria-hidden="true" /> Activity log
        </h3>
        {audit.error && <ErrorBox text={audit.error} />}
        {!audit.data && !audit.error && <div className="mn-sk" style={{ height: 80 }} />}
        {audit.data && audit.data.items.length === 0 && <Empty icon={History} title="No activity yet" text="Changes to this group are recorded here." />}
        {audit.data && audit.data.items.length > 0 && (
          <ol className="mn-history">
            {audit.data.items.map((a) => (
              <li key={a.id}>
                <b>{a.action.replace(/_/g, " ")}</b> — {a.detail} <small>{a.actorName} · {fmtDate(a.createdAt, true)}</small>
              </li>
            ))}
          </ol>
        )}
      </section>

      {editing && (
        <GroupWizard
          organizationId={organizationId}
          groupId={group.id}
          defaults={group.settings}
          canGovern={governs}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            notify("ok", "Group updated.");
            onChanged();
            audit.reload();
          }}
        />
      )}
    </div>
  );
}
