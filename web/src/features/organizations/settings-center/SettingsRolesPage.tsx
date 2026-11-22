/**
 * SettingsRolesPage.tsx — Organizations → Settings & Roles
 * Route: /organizations/:organizationId/admin/settings
 *
 * The Organization Administration Center: settings & currencies, team & roles,
 * permissions, security, notifications, billing, audit log and danger zone.
 * Data: /organizations/:id/admin-center (+ existing organization, members,
 * giving and subscription APIs). The server checks every permission; the
 * `access` flags only decide which controls are enabled.
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  Building2,
  CreditCard,
  Crown,
  Eye,
  HandHeart,
  History,
  KeyRound,
  Loader2,
  Lock,
  MapPin,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  UsersRound,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { hasBanner } from "../branding/PageBrandingParts";
import { pageKeyFromPath } from "../branding/pageBrandingApi";
import { usePageBranding } from "../branding/usePageBranding";
import { useOrgAdmin } from "../hooks/useOrgAdmin";
import OrgAppShell from "../ui/OrgAppShell";
import { errorMessage } from "../ui/orgUi";
import OrgBanner from "../branding/OrgBanner";
import { adminCenterApi, type Overview, type QuickInput } from "./adminCenterApi";
import { roleLabel } from "./permissionCatalog";
import { Card, Toggle } from "./SettingsParts";
import { OrgSettingsTab, PermissionsTab, TeamTab } from "./SettingsTabs";
import { AuditTab, BillingTab, DangerTab, NotificationsTab, SecurityTab } from "./SettingsTabsMore";
import "../ui/fockisOrgTheme.scss";
import "../admin/profileLocations.scss";
import "./settingsRoles.scss";

export type Tab = "settings" | "team" | "permissions" | "security" | "notifications" | "billing" | "audit" | "danger";
const TABS: { id: Tab; label: string; icon: LucideIcon; danger?: boolean }[] = [
  { id: "settings", label: "Organization Settings", icon: Settings },
  { id: "team", label: "Team & Roles", icon: Users },
  { id: "permissions", label: "Permissions", icon: ShieldCheck },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "billing", label: "Billing & Subscription", icon: CreditCard },
  { id: "audit", label: "Audit Logs", icon: History },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle, danger: true },
];

export type Notify = (tone: "ok" | "error", text: string) => void;

export default function SettingsRolesPage() {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const admin = useOrgAdmin(organizationId);
  const branding = usePageBranding(organizationId);
  const [tab, setTab] = useState<Tab>(() => {
    const h = window.location.hash.replace("#", "") as Tab;
    return TABS.some((t) => t.id === h) ? h : "settings";
  });
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [focusMember, setFocusMember] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const notify: Notify = useCallback((tone, text) => setToast({ tone, text }), []);
  const reload = useCallback(() => {
    setTick((t) => t + 1);
    admin.reload();
  }, [admin]);

  useEffect(() => {
    if (!organizationId) return;
    const controller = new AbortController();
    adminCenterApi
      .overview(organizationId, controller.signal)
      .then((o) => {
        setOverview(o);
        setError(null);
      })
      .catch((err) => !controller.signal.aborted && setError(errorMessage(err, "Settings could not be loaded.")));
    return () => controller.abort();
  }, [organizationId, tick]);

  useEffect(() => {
    window.history.replaceState(null, "", `#${tab}`);
  }, [tab]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const p = (s = "") => `/organizations/${encodeURIComponent(organizationId)}${s}`;
  const navTo = p("/admin/settings");
  const customBanner = hasBanner(branding.publishedFor(pageKeyFromPath(navTo, organizationId)));
  const org = admin.org;

  function openPermissionsFor(memberId: string) {
    setFocusMember(memberId);
    setTab("permissions");
  }

  return (
    <OrgAppShell variant="admin" organization={admin.shellOrg} viewer={admin.shellViewer} activeNavTo={navTo}>
      <div className="pl sr">
        {!customBanner && org && <OrgBanner organizationId={organizationId} name={org.name} tagline={org.tagline} logoUrl={org.logoUrl} coverUrl={org.bannerUrl ?? null} />}

        <header className="pl-title">
          <span className="pl-title__icon" aria-hidden="true">
            <Settings />
          </span>
          <div>
            <h1>Settings &amp; Roles</h1>
            <p>Manage your organization settings, team, permissions, security, and more.</p>
          </div>
        </header>

        <nav className="pl-tabs sr-tabs" role="tablist" aria-label="Settings sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={(tab === t.id ? "is-on" : "") + (t.danger ? " is-danger" : "")} onClick={() => setTab(t.id)}>
              <t.icon aria-hidden="true" /> {t.label}
            </button>
          ))}
        </nav>

        {error && <p className="pl-card pl-alert">{error}</p>}
        {!error && !overview && (
          <p className="pl-card pl-muted">
            <Loader2 className="pl-spin" aria-hidden="true" /> Loading settings…
          </p>
        )}

        {overview && (
          <div className={"sr-layout" + (tab === "settings" ? " sr-layout--side" : "")}>
            <div className="sr-main">
              {tab === "settings" && <OrgSettingsTab organizationId={organizationId} overview={overview} onSaved={(o) => (setOverview(o), admin.reload())} notify={notify} />}
              {tab === "settings" && (
                <p className="sr-note">
                  Communication and media settings are still in{" "}
                  <Link to={`/church/organizations/${encodeURIComponent(organizationId)}/admin/settings`} className="sr-quick__link">
                    the previous settings page
                  </Link>
                  .
                </p>
              )}
              {tab === "team" && <TeamTab organizationId={organizationId} overview={overview} notify={notify} onPermissions={openPermissionsFor} membersTo={p("/admin/members")} inviteTo={p("/admin/members/tools#invite")} />}
              {tab === "permissions" && <PermissionsTab organizationId={organizationId} overview={overview} notify={notify} focusMember={focusMember} />}
              {tab === "security" && <SecurityTab organizationId={organizationId} overview={overview} />}
              {tab === "notifications" && <NotificationsTab organizationId={organizationId} overview={overview} onSaved={reload} notify={notify} />}
              {tab === "billing" && <BillingTab />}
              {tab === "audit" && <AuditTab organizationId={organizationId} overview={overview} />}
              {tab === "danger" && <DangerTab organizationId={organizationId} overview={overview} notify={notify} onChanged={reload} />}
            </div>

            {tab === "settings" && (
              <aside className="sr-side">
                <TeamSummary overview={overview} onManage={() => setTab("team")} />
                <QuickSettings organizationId={organizationId} overview={overview} onChange={setOverview} notify={notify} givingTo={p("/admin/giving")} />
              </aside>
            )}
          </div>
        )}
      </div>
      {toast && (
        <div className={"pl-toast pl-toast--" + toast.tone} role="status">
          {toast.text}
        </div>
      )}
    </OrgAppShell>
  );
}

/* ----------------------------------------------------------------- side panel */

const ROLE_ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  owner: { icon: Crown, tone: "gold" },
  pastor_director: { icon: UsersRound, tone: "violet" },
  administrator: { icon: ShieldCheck, tone: "blue" },
  leader: { icon: Users, tone: "green" },
  department_manager: { icon: Users, tone: "green" },
  group_leader: { icon: Users, tone: "teal" },
};

function TeamSummary({ overview, onManage }: { overview: Overview; onManage: () => void }) {
  const counts = overview.roleCounts;
  const rows = [
    { id: "owner", label: "Owner", count: 1 },
    ...["pastor_director", "administrator", "department_manager", "leader", "group_leader"]
      .map((r) => ({ id: r, label: roleLabel(r), count: counts[r] ?? 0 }))
      .filter((r) => r.count > 0),
  ];
  // The owner is also counted in their own role.
  return (
    <Card icon={UsersRound} title="Organization Team & Roles" sub="Manage administrators and their roles.">
      <ul className="sr-rolecount">
        {rows.map((r) => {
          const meta = ROLE_ICONS[r.id] ?? { icon: Users, tone: "blue" };
          return (
            <li key={r.id}>
              <span className={"sr-dot sr-dot--" + meta.tone} aria-hidden="true">
                <meta.icon />
              </span>
              <b>{r.label}</b>
              <span className="sr-count">{r.count}</span>
            </li>
          );
        })}
      </ul>
      {overview.pendingRequests > 0 && (
        <p className="sr-note">
          <UserPlus aria-hidden="true" /> {overview.pendingRequests} membership request{overview.pendingRequests === 1 ? "" : "s"} waiting
        </p>
      )}
      <button type="button" className="pl-btn pl-btn--ghost pl-btn--block" onClick={onManage}>
        <Users aria-hidden="true" /> Manage Team &amp; Roles
      </button>
    </Card>
  );
}

function QuickSettings({ organizationId, overview, onChange, notify, givingTo }: { organizationId: string; overview: Overview; onChange: (o: Overview) => void; notify: Notify; givingTo: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const can = overview.access.canEditSettings;
  const pr = overview.preferences;

  async function set(key: keyof QuickInput, value: boolean) {
    setBusy(key);
    try {
      onChange(await adminCenterApi.quick(organizationId, { [key]: value }));
      notify("ok", "Saved.");
    } catch (err) {
      notify("error", errorMessage(err, "That setting could not be saved."));
    } finally {
      setBusy(null);
    }
  }

  const rows: { key: keyof QuickInput; icon: LucideIcon; tone: string; label: string; sub: string; value: boolean; disabled?: boolean; extra?: React.ReactNode }[] = [
    { key: "allowPublicPage", icon: Eye, tone: "gold", label: "Allow public page", sub: "Show your organization in Fockis Organizations search", value: overview.organization.isDiscoverable },
    { key: "allowMembershipRequests", icon: UserPlus, tone: "violet", label: "Allow membership requests", sub: "Let people request to join", value: pr.allowMembershipRequests },
    {
      key: "enableDonations",
      icon: HandHeart,
      tone: "red",
      label: "Enable donations (Giving)",
      sub: "Receive tithes, offerings and donations online",
      value: Boolean(overview.giving?.enabled),
      disabled: !overview.giving,
      extra: (
        <Link to={givingTo} className="sr-quick__link">
          Giving settings
        </Link>
      ),
    },
    { key: "showLocationsPublicly", icon: MapPin, tone: "blue", label: "Show location(s) on public page", sub: "Display addresses and service times", value: pr.showLocationsPublicly },
    { key: "publicEvents", icon: Building2, tone: "green", label: "Enable public events", sub: "Show upcoming events to visitors", value: pr.publicEvents },
    { key: "memberDirectory", icon: KeyRound, tone: "teal", label: "Member directory", sub: "Let members see the member directory", value: pr.memberDirectory },
  ];

  return (
    <Card icon={Zap} title="Quick Settings" className="sr-quick">
      {!can && <p className="sr-note">You can view these settings. Changing them needs the Settings permission.</p>}
      <ul>
        {rows.map((r) => (
          <li key={r.key}>
            <span className={"sr-dot sr-dot--" + r.tone} aria-hidden="true">
              <r.icon />
            </span>
            <span className="sr-quick__text">
              <b>{r.label}</b>
              <small>{r.sub}</small>
              {r.extra}
            </span>
            {busy === r.key ? <Loader2 className="pl-spin" aria-hidden="true" /> : <Toggle checked={r.value} onChange={(v) => void set(r.key, v)} disabled={!can || r.disabled || Boolean(busy)} label={r.label} />}
          </li>
        ))}
      </ul>
    </Card>
  );
}
