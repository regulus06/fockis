/**
 * SettingsTabsMore.tsx — Security, Notifications, Billing, Audit Logs and
 * Danger Zone tabs of Settings & Roles.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRightLeft,
  Bell,
  CheckCircle2,
  CreditCard,
  Download,
  History,
  Info,
  Loader2,
  Lock,
  Power,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { deleteOrganization } from "../api/organizationsApi";
import { errorMessage } from "../ui/orgUi";
import { getCurrentSubscription } from "../../subscriptions/services/subscriptionApi";
import type { Subscription } from "../../subscriptions/types/subscriptionTypes";
import { adminCenterApi, type AuditEntry, type NotificationKey, type Overview, type Team } from "./adminCenterApi";
import { roleLabel } from "./permissionCatalog";
import { Card, Empty, Toggle } from "./SettingsParts";
import { describeAction, when } from "./SettingsTabs";
import type { Notify } from "./SettingsRolesPage";

/* ================================================================== Security */

export function SecurityTab({ organizationId, overview }: { organizationId: string; overview: Overview }) {
  const [events, setEvents] = useState<AuditEntry[] | null>(null);
  useEffect(() => {
    if (!overview.access.canViewAudit) return setEvents([]);
    const c = new AbortController();
    Promise.all([
      adminCenterApi.audit(organizationId, { category: "team" }, c.signal),
      adminCenterApi.audit(organizationId, { category: "permissions" }, c.signal),
      adminCenterApi.audit(organizationId, { category: "organization" }, c.signal),
    ])
      .then((r) => setEvents(r.flatMap((x) => x.items).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 15)))
      .catch(() => !c.signal.aborted && setEvents([]));
    return () => c.abort();
  }, [organizationId, overview.access.canViewAudit]);

  const enforced = [
    "Every settings, role and permission change is checked on the server, not just hidden in the page.",
    "Administrators can't promote themselves or grant themselves permissions.",
    "Dangerous permissions (administrators, permissions, archive, delete) can only be granted by the owner.",
    "Only the owner can transfer ownership, and only to an active member, after typing the organization name.",
    "The organization always keeps at least one administrator.",
    "Organization data is isolated: changing an ID in a request can't reach another organization.",
    "The audit log is append-only — nobody, including administrators, can edit it.",
  ];

  return (
    <>
      <Card icon={ShieldCheck} title="Protections in place">
        <ul className="sr-checks">
          {enforced.map((t) => (
            <li key={t}>
              <CheckCircle2 aria-hidden="true" /> {t}
            </li>
          ))}
        </ul>
      </Card>

      <Card icon={Lock} title="Account security" sub="Two-factor sign-in, active sessions, login history and trusted devices.">
        <p className="sr-banner sr-banner--muted">
          <Info aria-hidden="true" /> These aren't available in Fockis yet, so they can't be required for administrators. Nothing here is switched on.
        </p>
        <ul className="sr-soon">
          {["Require two-factor authentication for admins", "Active sessions & sign out everywhere", "Login history", "Device management"].map((t) => (
            <li key={t}>
              <span>{t}</span>
              <span className="sr-pill sr-pill--muted">Not available yet</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card icon={History} title="Recent security events" sub="Role, permission, access and organization status changes.">
        {events === null ? (
          <p className="sr-muted">
            <Loader2 className="pl-spin" aria-hidden="true" /> Loading…
          </p>
        ) : events.length === 0 ? (
          <Empty>{overview.access.canViewAudit ? "No security events yet." : "You need the Settings permission to see security events."}</Empty>
        ) : (
          <AuditList items={events} />
        )}
      </Card>
    </>
  );
}

/* ============================================================= Notifications */

const NOTIFS: { key: NotificationKey; label: string; sub: string; applied?: boolean }[] = [
  { key: "email", label: "Email notifications", sub: "Send organization emails to administrators." },
  { key: "members", label: "New members & requests", sub: "Alert administrators about new members and join requests." },
  { key: "eventReminders", label: "Event reminders", sub: "Remind people about upcoming events." },
  { key: "ministryAnnouncements", label: "Ministry announcements", sub: "Announcements from ministries and groups." },
  { key: "donations", label: "Donation alerts", sub: "Notify giving managers when an online gift is received.", applied: true },
  { key: "financialApprovals", label: "Financial approvals", sub: "Alerts for financial items waiting for approval." },
  { key: "security", label: "Security alerts", sub: "Role, permission and ownership changes." },
  { key: "admin", label: "Administrator updates", sub: "Settings changes made by other administrators." },
];

export function NotificationsTab({ organizationId, overview, onSaved, notify }: { organizationId: string; overview: Overview; onSaved: () => void; notify: Notify }) {
  const [values, setValues] = useState(overview.preferences.notifications);
  const [busy, setBusy] = useState<NotificationKey | null>(null);
  const can = overview.access.canEditSettings;

  async function set(key: NotificationKey, v: boolean) {
    const next = { ...values, [key]: v };
    setValues(next);
    setBusy(key);
    try {
      const prefs = await adminCenterApi.savePreferences(organizationId, { notifications: next });
      setValues(prefs.notifications);
      notify("ok", "Notification settings saved.");
      onSaved();
    } catch (err) {
      setValues(values);
      notify("error", errorMessage(err, "That setting could not be saved."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card icon={Bell} title="Notifications" sub="Organization-wide notification preferences.">
      <p className="sr-banner sr-banner--muted">
        <Info aria-hidden="true" /> Preferences are saved for the whole organization. Today only <b>Donation alerts</b> changes what Fockis sends; the others are stored and will apply as those notifications are connected.
      </p>
      <ul className="sr-notifs">
        {NOTIFS.map((n) => (
          <li key={n.key}>
            <span>
              <b>
                {n.label} {n.applied && <span className="sr-pill sr-pill--green">Applied</span>}
              </b>
              <small>{n.sub}</small>
            </span>
            {busy === n.key ? <Loader2 className="pl-spin" aria-hidden="true" /> : <Toggle checked={values[n.key] !== false} onChange={(v) => void set(n.key, v)} disabled={!can || Boolean(busy)} label={n.label} />}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* =================================================================== Billing */

export function BillingTab() {
  const [sub, setSub] = useState<Subscription | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getCurrentSubscription()
      .then((s) => setSub(s ?? null))
      .catch((err) => {
        const status = (err as { status?: number })?.status;
        if (status === 404) setSub(null);
        else setError(errorMessage(err, "Your subscription could not be loaded."));
      });
  }, []);

  return (
    <Card icon={CreditCard} title="Billing & Subscription" sub="Fockis subscriptions belong to your account, not to the organization.">
      {error && <p className="sr-error">{error}</p>}
      {sub === undefined && !error && (
        <p className="sr-muted">
          <Loader2 className="pl-spin" aria-hidden="true" /> Loading…
        </p>
      )}
      {sub === null && <Empty>You don't have a Fockis subscription.</Empty>}
      {sub && (
        <dl className="sr-dl">
          <div>
            <dt>Plan</dt>
            <dd>{sub.plan}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className="sr-pill">{sub.status}</span>
              {sub.cancelAtPeriodEnd && <span className="sr-pill sr-pill--muted">Cancels at period end</span>}
            </dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd>
              {sub.price} {sub.currency?.toUpperCase() ?? ""} {sub.billingInterval ? `/ ${sub.billingInterval.toLowerCase()}` : ""}
            </dd>
          </div>
          <div>
            <dt>Current period ends</dt>
            <dd>{when(sub.currentPeriodEnd)}</dd>
          </div>
        </dl>
      )}
      <div className="sr-actions sr-actions--left">
        <Link to="/subscriptions/plans" className="pl-btn pl-btn--primary">
          View plans
        </Link>
        <Link to="/subscriptions/billing" className="pl-btn pl-btn--ghost">
          Billing & invoices
        </Link>
        <Link to="/subscriptions" className="pl-btn pl-btn--ghost">
          Manage subscription
        </Link>
      </div>
    </Card>
  );
}

/* ================================================================ Audit Logs */

const CATEGORIES = [
  { id: "", label: "All activity" },
  { id: "settings", label: "Settings" },
  { id: "team", label: "Team" },
  { id: "permissions", label: "Permissions" },
  { id: "finance", label: "Finance" },
  { id: "profile", label: "Profile" },
  { id: "organization", label: "Organization" },
];

function AuditList({ items }: { items: AuditEntry[] }) {
  return (
    <ul className="sr-history sr-history--audit">
      {items.map((h) => (
        <li key={h.id}>
          <span className="sr-history__what">
            <b>{h.actorName || "Someone"}</b> {describeAction(h.action)} <b>{h.targetLabel}</b>
            <ChangeSummary before={h.before} after={h.after} />
            {h.details && <small className="sr-history__details">{h.details}</small>}
          </span>
          <span className="sr-history__meta">
            <span className="sr-pill sr-pill--muted">{h.category}</span>
            <small>{when(h.createdAt)}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.length > 6 ? `${v.length} items` : v.join(", ") || "none";
  if (typeof v === "boolean") return v ? "on" : "off";
  if (typeof v === "object") return Object.keys(v as object).length + " values";
  return String(v);
}

function ChangeSummary({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  if (!after) return null;
  const keys = Object.keys(after).slice(0, 4);
  if (!keys.length) return null;
  return (
    <small className="sr-history__diff">
      {keys.map((k) => (
        <span key={k}>
          {k}: {before && k in before ? `${k === "role" ? roleLabel(String(before[k])) : fmt(before[k])} → ` : ""}
          {k === "role" ? roleLabel(String(after[k])) : fmt(after[k])}
        </span>
      ))}
    </small>
  );
}

export function AuditTab({ organizationId, overview }: { organizationId: string; overview: Overview }) {
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AuditEntry[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => setPage(1), [category, q]);

  useEffect(() => {
    if (!overview.access.canViewAudit) return;
    const c = new AbortController();
    const t = window.setTimeout(() => {
      setLoading(true);
      adminCenterApi
        .audit(organizationId, { category: category || undefined, q: q.trim() || undefined, page }, c.signal)
        .then((r) => {
          setItems((prev) => (page === 1 ? r.items : [...(prev ?? []), ...r.items]));
          setHasMore(r.hasMore);
          setTotal(r.total);
          setError(null);
        })
        .catch((err) => !c.signal.aborted && setError(errorMessage(err, "The audit log could not be loaded.")))
        .finally(() => !c.signal.aborted && setLoading(false));
    }, 250);
    return () => (window.clearTimeout(t), c.abort());
  }, [organizationId, category, q, page, overview.access.canViewAudit]);

  if (!overview.access.canViewAudit) {
    return (
      <Card icon={History} title="Audit Logs">
        <Empty>You need the Settings permission to view the audit log.</Empty>
      </Card>
    );
  }

  return (
    <Card icon={History} title="Audit Logs" sub="A permanent, read-only record of administrative changes.">
      <div className="sr-filters">
        <label className="sr-search">
          <Search aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by person, action or item" aria-label="Search audit log" />
        </label>
        <select className="sr-input" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="sr-error">{error}</p>}
      {items === null && !error && (
        <p className="sr-muted">
          <Loader2 className="pl-spin" aria-hidden="true" /> Loading…
        </p>
      )}
      {items && items.length === 0 && <Empty>No activity recorded{category || q ? " for this filter" : " yet"}.</Empty>}
      {items && items.length > 0 && (
        <>
          <p className="sr-muted sr-small">
            {total} entr{total === 1 ? "y" : "ies"}
          </p>
          <AuditList items={items} />
        </>
      )}
      {hasMore && (
        <button type="button" className="pl-btn pl-btn--ghost pl-btn--block" onClick={() => setPage((p) => p + 1)} disabled={loading}>
          {loading ? <Loader2 className="pl-spin" aria-hidden="true" /> : null} Load more
        </button>
      )}
    </Card>
  );
}

/* =============================================================== Danger Zone */

export function DangerTab({ organizationId, overview, notify, onChanged }: { organizationId: string; overview: Overview; notify: Notify; onChanged: () => void }) {
  const navigate = useNavigate();
  const a = overview.access;
  const name = overview.organization.name;
  const archived = overview.organization.status === "archived";
  const [busy, setBusy] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [target, setTarget] = useState("");
  const [confirmTransfer, setConfirmTransfer] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");

  useEffect(() => {
    if (!a.isOwner) return;
    const c = new AbortController();
    adminCenterApi.team(organizationId, c.signal).then(setTeam).catch(() => undefined);
    return () => c.abort();
  }, [organizationId, a.isOwner]);

  async function transfer() {
    setBusy("transfer");
    try {
      const r = await adminCenterApi.transferOwnership(organizationId, target, confirmTransfer);
      notify("ok", `Ownership transferred to ${r.newOwner}. You remain an administrator.`);
      setConfirmTransfer("");
      onChanged();
    } catch (err) {
      notify("error", errorMessage(err, "Ownership could not be transferred."));
    } finally {
      setBusy(null);
    }
  }

  async function toggleStatus() {
    const next = archived ? "active" : "archived";
    if (next === "archived" && !window.confirm(`Deactivate ${name}? It will be hidden and archived. You can reactivate it later.`)) return;
    setBusy("status");
    try {
      await adminCenterApi.status(organizationId, next);
      notify("ok", next === "archived" ? "Organization deactivated." : "Organization reactivated.");
      onChanged();
    } catch (err) {
      notify("error", errorMessage(err, "The status could not be changed."));
    } finally {
      setBusy(null);
    }
  }

  async function exportData() {
    setBusy("export");
    try {
      const [overviewNow, teamNow, audit] = await Promise.all([
        adminCenterApi.overview(organizationId),
        adminCenterApi.team(organizationId).catch(() => null),
        a.canViewAudit ? adminCenterApi.audit(organizationId, { page: 1 }).catch(() => null) : Promise.resolve(null),
      ]);
      const data = {
        exportedAt: new Date().toISOString(),
        organization: overviewNow.organization,
        preferences: overviewNow.preferences,
        team: teamNow?.items.map((m) => ({ name: m.name, email: m.email, role: roleLabel(m.role, m.isOwner), permissions: m.permissions, status: m.status })) ?? [],
        recentAudit: audit?.items ?? [],
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name.replace(/[^\w-]+/g, "-").toLowerCase()}-settings.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify("error", errorMessage(err, "The export failed."));
    } finally {
      setBusy(null);
    }
  }

  async function destroy() {
    setBusy("delete");
    try {
      await deleteOrganization(organizationId);
      navigate("/organizations", { replace: true });
    } catch (err) {
      notify("error", errorMessage(err, "The organization could not be deleted."));
      setBusy(null);
    }
  }

  const candidates = (team?.items ?? []).filter((m) => !m.isOwner && m.status === "active");

  return (
    <div className="sr-danger">
      <p className="sr-banner sr-banner--danger">
        <AlertTriangle aria-hidden="true" /> These actions affect the whole organization. Each one is recorded in the audit log.
      </p>

      <Card icon={ArrowRightLeft} title="Transfer ownership" sub="Give ownership to another active team member. You'll stay an Organization Admin.">
        {!a.isOwner ? (
          <Empty>Only the owner can transfer ownership.</Empty>
        ) : candidates.length === 0 ? (
          <Empty>Add an active team member in Team &amp; Roles first.</Empty>
        ) : (
          <div className="sr-dz">
            <select className="sr-input" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="New owner">
              <option value="">Choose the new owner…</option>
              {candidates.map((m) => (
                <option key={m.memberId} value={m.memberId}>
                  {m.name} — {roleLabel(m.role)}
                </option>
              ))}
            </select>
            <input className="sr-input" value={confirmTransfer} onChange={(e) => setConfirmTransfer(e.target.value)} placeholder={`Type "${name}" to confirm`} aria-label="Type the organization name to confirm" />
            <button type="button" className="pl-btn sr-btn-danger" onClick={() => void transfer()} disabled={!target || confirmTransfer.trim() !== name.trim() || busy === "transfer"}>
              {busy === "transfer" ? <Loader2 className="pl-spin" aria-hidden="true" /> : null} Transfer ownership
            </button>
          </div>
        )}
      </Card>

      <Card icon={Download} title="Export organization settings" sub="Download settings, team roles, permissions and recent audit entries as JSON.">
        <button type="button" className="pl-btn pl-btn--ghost" onClick={() => void exportData()} disabled={busy === "export"}>
          {busy === "export" ? <Loader2 className="pl-spin" aria-hidden="true" /> : <Download aria-hidden="true" />} Export data
        </button>
      </Card>

      <Card icon={Power} title={archived ? "Reactivate organization" : "Deactivate organization"} sub={archived ? "Bring the organization back." : "Archive the organization. Nothing is deleted and you can reactivate it."}>
        {!a.canArchive ? (
          <Empty>You need the Archive permission for this.</Empty>
        ) : (
          <button type="button" className={"pl-btn " + (archived ? "pl-btn--primary" : "sr-btn-danger-ghost")} onClick={() => void toggleStatus()} disabled={busy === "status"}>
            {busy === "status" ? <Loader2 className="pl-spin" aria-hidden="true" /> : <Power aria-hidden="true" />} {archived ? "Reactivate" : "Deactivate"}
          </button>
        )}
      </Card>

      <Card icon={Trash2} title="Delete organization permanently" sub="This permanently removes the organization. It can't be undone." className="sr-card--danger">
        {!a.canDelete ? (
          <Empty>Only the owner or someone with the Delete permission can do this.</Empty>
        ) : (
          <div className="sr-dz">
            <input className="sr-input" value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder={`Type "${name}" to confirm`} aria-label="Type the organization name to confirm deletion" />
            <button type="button" className="pl-btn sr-btn-danger" onClick={() => void destroy()} disabled={confirmDelete.trim() !== name.trim() || busy === "delete"}>
              {busy === "delete" ? <Loader2 className="pl-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />} Delete permanently
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
