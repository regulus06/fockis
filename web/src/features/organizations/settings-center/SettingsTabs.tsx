/**
 * SettingsTabs.tsx — Organization Settings, Team & Roles and Permissions tabs
 * of Settings & Roles. Every change goes through /admin-center, which checks
 * permissions on the server and writes the audit log.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  Coins,
  Crown,
  History,
  Info,
  Link2,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import { PLATFORM_CATEGORIES, platformCategoryOf, typesForCategory, type PlatformCategory } from "../ui/orgTerminology";
import { Avatar, errorMessage } from "../ui/orgUi";
import { adminCenterApi, type Overview, type Preferences, type Rates, type Team, type TeamMember } from "./adminCenterApi";
import { allTimeZones, currencyInfo, DATE_FORMATS, formatMoney, LANGUAGES } from "./currencies";
import { ADMIN_ROLES, PERMISSION_MODULES, PRESETS, ROLE_OPTIONS, roleLabel } from "./permissionCatalog";
import { Card, Combobox, CurrencyPicker, CurrencyTags, Empty, Field, Toggle } from "./SettingsParts";
import type { Notify } from "./SettingsRolesPage";

export const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

/* ======================================================= Organization Settings */

interface Draft {
  name: string;
  category: PlatformCategory;
  organizationType: string;
  timeZone: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  defaultCurrency: string;
  acceptedCurrencies: string[];
  multiCurrency: boolean;
  showConverted: boolean;
}

function draftOf(o: Overview): Draft {
  const pr = o.preferences;
  return {
    name: o.organization.name,
    category: platformCategoryOf(o.organization.organizationType),
    organizationType: o.organization.organizationType,
    timeZone: pr.timeZone,
    language: pr.language,
    dateFormat: pr.dateFormat,
    timeFormat: pr.timeFormat,
    defaultCurrency: pr.currency.defaultCurrency,
    acceptedCurrencies: pr.currency.acceptedCurrencies,
    multiCurrency: pr.currency.multiCurrency,
    showConverted: pr.currency.showConverted,
  };
}

const rateNum = (r: number) => r.toLocaleString(undefined, { maximumSignificantDigits: 5 });

const STATUS_LABEL: Record<string, string> = { active: "Active", pending: "Pending review", suspended: "Suspended", archived: "Deactivated" };

export function OrgSettingsTab({ organizationId, overview, onSaved, notify }: { organizationId: string; overview: Overview; onSaved: (o: Overview) => void; notify: Notify }) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(overview));
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [rates, setRates] = useState<Rates | null>(null);
  const [ratesBusy, setRatesBusy] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const zones = useMemo(() => allTimeZones(), []);
  const a = overview.access;
  const canSettings = a.canEditSettings;
  const canProfile = a.canEditProfile;
  const initial = useMemo(() => draftOf(overview), [overview]);
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft);
  const set = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const types = typesForCategory(draft.category);

  useEffect(() => setDraft(draftOf(overview)), [overview]);

  const loadRates = useCallback(async () => {
    setRatesBusy(true);
    setRatesError(null);
    try {
      setRates(await adminCenterApi.rates(organizationId, draft.defaultCurrency));
    } catch (err) {
      setRatesError(errorMessage(err, "Exchange rates are unavailable right now."));
    } finally {
      setRatesBusy(false);
    }
  }, [organizationId, draft.defaultCurrency]);

  function setDefault(code: string) {
    set({ defaultCurrency: code, acceptedCurrencies: draft.acceptedCurrencies.includes(code) ? draft.acceptedCurrencies : [code, ...draft.acceptedCurrencies] });
    setRates(null);
  }

  async function save() {
    if (!draft.name.trim()) return notify("error", "Organization name is required.");
    if (!draft.organizationType) return notify("error", "Choose an organization type.");
    setSaving(true);
    try {
      let next = overview;
      if (canProfile && (draft.name.trim() !== initial.name || draft.organizationType !== initial.organizationType)) {
        next = await adminCenterApi.profile(organizationId, { name: draft.name.trim(), organizationType: draft.organizationType });
      }
      const prefsChanged = (["timeZone", "language", "dateFormat", "timeFormat", "defaultCurrency", "acceptedCurrencies", "multiCurrency", "showConverted"] as const).some(
        (k) => JSON.stringify(draft[k]) !== JSON.stringify(initial[k]),
      );
      if (canSettings && (prefsChanged || overview.preferences.suggested)) {
        const prefs: Preferences = await adminCenterApi.savePreferences(organizationId, {
          timeZone: draft.timeZone,
          language: draft.language,
          dateFormat: draft.dateFormat,
          timeFormat: draft.timeFormat,
          currency: { defaultCurrency: draft.defaultCurrency, acceptedCurrencies: draft.acceptedCurrencies, multiCurrency: draft.multiCurrency, showConverted: draft.showConverted },
        });
        next = { ...next, preferences: prefs };
      }
      onSaved(next);
      notify("ok", "Settings saved.");
    } catch (err) {
      notify("error", errorMessage(err, "Settings could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  const fx = rates ?? (overview.preferences.exchangeRates?.base === draft.defaultCurrency ? { ...overview.preferences.exchangeRates, fetchedAt: overview.preferences.exchangeRates.fetchedAt ?? "", note: "" } : null);
  const others = draft.acceptedCurrencies.filter((c) => c !== draft.defaultCurrency);
  const status = overview.organization.status || "active";

  return (
    <>
      {overview.preferences.suggested && canSettings && (
        <p className="sr-banner">
          <Info aria-hidden="true" /> We suggested these settings from your main location. Review them and press <b>Save Changes</b> to keep them.
        </p>
      )}
      {!canSettings && <p className="sr-banner">You can view these settings. Changing them needs the Settings permission.</p>}

      <div className="sr-grid2">
        <Card icon={Building2} title="General Information">
          <Field label="Organization Name" required>
            <input className="sr-input" maxLength={150} value={draft.name} disabled={!canProfile} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Organization Category" required>
            <select
              className="sr-input"
              value={draft.category}
              disabled={!canProfile}
              onChange={(e) => {
                const category = e.target.value as PlatformCategory;
                const keep = typesForCategory(category).some((t) => t.value === draft.organizationType);
                set({ category, organizationType: keep ? draft.organizationType : "" });
              }}
            >
              {PLATFORM_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Organization Type" required>
            <select className="sr-input" value={draft.organizationType} disabled={!canProfile} onChange={(e) => set({ organizationType: e.target.value })}>
              {!draft.organizationType && <option value="">Choose a type…</option>}
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Time Zone" required>
            <Combobox
              value={draft.timeZone}
              items={zones}
              getKey={(z) => z.id}
              render={(z) => <span className="sr-ellipsis">{z.label}</span>}
              match={(z, q) => z.label.toLowerCase().includes(q)}
              onChange={(timeZone) => set({ timeZone })}
              disabled={!canSettings}
              ariaLabel="Time zone"
            />
          </Field>
          <div className="sr-row3">
            <Field label="Language" required>
              <select className="sr-input" value={draft.language} disabled={!canSettings} onChange={(e) => set({ language: e.target.value })}>
                {!LANGUAGES.some((l) => l.id === draft.language) && <option value={draft.language}>{draft.language}</option>}
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date Format">
              <select className="sr-input" value={draft.dateFormat} disabled={!canSettings} onChange={(e) => set({ dateFormat: e.target.value })}>
                {DATE_FORMATS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Time Format">
              <select className="sr-input" value={draft.timeFormat} disabled={!canSettings} onChange={(e) => set({ timeFormat: e.target.value })}>
                <option value="24h">24 Hours (14:30)</option>
                <option value="12h">12 Hours (2:30 PM)</option>
              </select>
            </Field>
          </div>
          <Field label="Status">
            <span className={"sr-status sr-status--" + status}>
              <i aria-hidden="true" /> {STATUS_LABEL[status] ?? status}
            </span>
          </Field>
        </Card>

        <Card icon={Coins} title="Currency Settings">
          <Field label="Default Currency" required hint="Used for new donations, offerings, invoices and reports.">
            <CurrencyPicker value={draft.defaultCurrency} onChange={setDefault} disabled={!canSettings} ariaLabel="Default currency" />
          </Field>
          <Field label="Accepted Currencies" hint="Donors can give in any of these currencies.">
            <CurrencyTags codes={draft.acceptedCurrencies} locked={draft.defaultCurrency} disabled={!canSettings} onRemove={(c) => set({ acceptedCurrencies: draft.acceptedCurrencies.filter((x) => x !== c) })} />
            {canSettings &&
              (adding ? (
                <CurrencyPicker
                  value=""
                  exclude={draft.acceptedCurrencies}
                  placeholder="Search a currency to add…"
                  ariaLabel="Add an accepted currency"
                  onChange={(c) => {
                    set({ acceptedCurrencies: [...draft.acceptedCurrencies, c] });
                    setAdding(false);
                  }}
                />
              ) : (
                <button type="button" className="sr-link" onClick={() => setAdding(true)} disabled={draft.acceptedCurrencies.length >= 20}>
                  + Add currency
                </button>
              ))}
          </Field>

          <div className="sr-switchrow">
            <span>
              <b>Allow multi-currency</b>
              <small>Accept donations and payments in multiple currencies.</small>
            </span>
            <Toggle checked={draft.multiCurrency} onChange={(v) => set({ multiCurrency: v })} disabled={!canSettings} label="Allow multi-currency" />
          </div>
          <div className="sr-switchrow">
            <span>
              <b>Show converted amounts</b>
              <small>Reports show an estimate in {draft.defaultCurrency} next to the original amount.</small>
            </span>
            <Toggle checked={draft.showConverted} onChange={(v) => set({ showConverted: v })} disabled={!canSettings} label="Show converted amounts" />
          </div>

          <div className="sr-fx">
            <div className="sr-fx__head">
              <b>Exchange rates</b>
              <button type="button" className="sr-link" onClick={() => void loadRates()} disabled={ratesBusy}>
                {ratesBusy ? <Loader2 className="pl-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />} Check current rates
              </button>
            </div>
            {ratesError && <p className="sr-error">{ratesError}</p>}
            {!fx && !ratesError && <p className="sr-muted">No rates loaded yet.</p>}
            {fx && (
              <>
                <ul className="sr-fx__list">
                  {others.length === 0 && <li className="sr-muted">Add another accepted currency to see its rate.</li>}
                  {others.map((c) => {
                    const r = fx.rates[c];
                    return (
                      <li key={c}>
                        <span>1 {draft.defaultCurrency}</span>
                        <span aria-hidden="true">≈</span>
                        <b>{r ? `${rateNum(r)} ${c}` : "rate unavailable"}</b>
                        {r ? <small>1 {c} ≈ {formatMoney(1 / r, draft.defaultCurrency)}</small> : null}
                      </li>
                    );
                  })}
                </ul>
                <p className="sr-fx__meta">
                  Last updated {when(fx.fetchedAt)} · {fx.provider}
                </p>
              </>
            )}
            <p className="sr-fx__note">
              <Info aria-hidden="true" /> Converted amounts are estimates for reporting only — they are never recorded as payments. Each gift keeps its original currency and amount; changing the default currency doesn't rewrite past transactions.
            </p>
          </div>
          <p className="sr-muted sr-small">
            {currencyInfo(draft.defaultCurrency).name} uses {currencyInfo(draft.defaultCurrency).decimals} decimal place{currencyInfo(draft.defaultCurrency).decimals === 1 ? "" : "s"}.
          </p>
        </Card>
      </div>

      {(canSettings || canProfile) && (
        <div className="sr-actions">
          <button type="button" className="pl-btn pl-btn--ghost" onClick={() => setDraft(initial)} disabled={!dirty || saving}>
            Reset
          </button>
          <button type="button" className="pl-btn pl-btn--primary" onClick={() => void save()} disabled={(!dirty && !overview.preferences.suggested) || saving}>
            {saving ? <Loader2 className="pl-spin" aria-hidden="true" /> : null} Save Changes
          </button>
        </div>
      )}
    </>
  );
}

/* ============================================================== Team & Roles */

function useTeam(organizationId: string) {
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    adminCenterApi
      .team(organizationId, c.signal)
      .then((t) => (setTeam(t), setError(null)))
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "The team could not be loaded.")));
    return () => c.abort();
  }, [organizationId, tick]);
  return { team, setTeam, error, reload: () => setTick((t) => t + 1) };
}

export function TeamTab({ organizationId, overview, notify, onPermissions, membersTo, inviteTo }: { organizationId: string; overview: Overview; notify: Notify; onPermissions: (memberId: string) => void; membersTo: string; inviteTo: string }) {
  const { team, setTeam, error, reload } = useTeam(organizationId);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const can = overview.access.canManageTeam;

  async function run(memberId: string, fn: () => Promise<Team>, ok: string) {
    setBusy(memberId);
    try {
      setTeam(await fn());
      notify("ok", ok);
    } catch (err) {
      notify("error", errorMessage(err, "That change could not be saved."));
      reload();
    } finally {
      setBusy(null);
    }
  }

  const items = (team?.items ?? []).filter((m) => {
    if (roleFilter === "owner" ? !m.isOwner : roleFilter && m.role !== roleFilter) return false;
    const s = q.trim().toLowerCase();
    return !s || m.name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s);
  });

  return (
    <>
      <Card
        icon={Users}
        title="Team & Roles"
        sub="People with a leadership or administrator role. Only the server decides who can change what."
        action={
          can && (
            <button type="button" className="pl-btn pl-btn--primary pl-btn--sm" onClick={() => setAdding((v) => !v)}>
              <UserPlus aria-hidden="true" /> Add to team
            </button>
          )
        }
      >
        {adding && <AddToTeam organizationId={organizationId} onAdded={(t) => (setTeam(t), setAdding(false), notify("ok", "Role assigned."))} notify={notify} />}

        <div className="sr-filters">
          <label className="sr-search">
            <Search aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" aria-label="Search team" />
          </label>
          <select className="sr-input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
            <option value="">All roles</option>
            <option value="owner">Owner</option>
            {ROLE_OPTIONS.filter((r) => r.id !== "member" && r.id !== "guest").map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="sr-error">{error}</p>}
        {!team && !error && (
          <p className="sr-muted">
            <Loader2 className="pl-spin" aria-hidden="true" /> Loading team…
          </p>
        )}
        {team && items.length === 0 && <Empty>No team members match.</Empty>}
        {team && items.length > 0 && (
          <ul className="sr-team">
            {items.map((m) => (
              <li key={m.memberId}>
                <Avatar url={m.avatarUrl} name={m.name} size="sm" />
                <span className="sr-team__who">
                  <b>
                    {m.name} {m.isOwner && <Crown className="sr-crown" aria-label="Owner" />}
                  </b>
                  <small>{m.email || "—"}</small>
                </span>
                <span className="sr-team__role">
                  {m.isOwner || !can ? (
                    <span className={"sr-pill" + (m.isOwner ? " sr-pill--gold" : "")}>{roleLabel(m.role, m.isOwner)}</span>
                  ) : (
                    <select className="sr-input sr-input--sm" value={m.role} disabled={busy === m.memberId} aria-label={`Role for ${m.name}`} onChange={(e) => void run(m.memberId, () => adminCenterApi.changeRole(organizationId, m.memberId, e.target.value), "Role updated.")}>
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {m.status !== "active" && <span className="sr-pill sr-pill--muted">{m.status}</span>}
                </span>
                <span className="sr-team__perm">{m.isOwner ? "All permissions" : `${m.permissions.length} permission${m.permissions.length === 1 ? "" : "s"}`}</span>
                <span className="sr-team__acts">
                  {!m.isOwner && overview.access.canManagePermissions && ADMIN_ROLES.includes(m.role) && (
                    <button type="button" className="pl-btn pl-btn--ghost pl-btn--sm" onClick={() => onPermissions(m.memberId)}>
                      <ShieldCheck aria-hidden="true" /> Permissions
                    </button>
                  )}
                  {!m.isOwner && can && (
                    <button
                      type="button"
                      className="sr-iconbtn sr-iconbtn--danger"
                      disabled={busy === m.memberId}
                      aria-label={`Remove ${m.name}'s team access`}
                      title="Remove team access (they stay a member)"
                      onClick={() => {
                        if (window.confirm(`Remove ${m.name}'s role and permissions? They will stay a regular member.`)) void run(m.memberId, () => adminCenterApi.removeAccess(organizationId, m.memberId), "Access removed.");
                      }}
                    >
                      {busy === m.memberId ? <Loader2 className="pl-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="sr-grid2">
        <Card icon={UserPlus} title="Pending requests" sub="People who asked to join.">
          {!team ? null : team.pending.length === 0 ? (
            <Empty>No pending requests.</Empty>
          ) : (
            <ul className="sr-simple">
              {team.pending.slice(0, 8).map((p) => (
                <li key={p.memberId}>
                  <b>{p.name}</b>
                  <small>{when(p.requestedAt)}</small>
                </li>
              ))}
            </ul>
          )}
          <Link to={`${membersTo}?status=pending`} className="pl-btn pl-btn--ghost pl-btn--block">
            Review requests in Members
          </Link>
        </Card>
        <Card icon={Link2} title="Invite people" sub="Share your join link. Email invitations aren't available yet.">
          <p className="sr-muted">New people join with your invite link, then you approve them and give them a role here.</p>
          <Link to={inviteTo} className="pl-btn pl-btn--ghost pl-btn--block">
            <Link2 aria-hidden="true" /> Get the invite link
          </Link>
        </Card>
      </div>

      <Card icon={History} title="Role history" sub="Recent role, permission and ownership changes.">
        {!team ? null : team.history.length === 0 ? (
          <Empty>No role changes recorded yet.</Empty>
        ) : (
          <ul className="sr-history">
            {team.history.map((h) => (
              <li key={h.id}>
                <span className="sr-history__what">
                  <b>{h.actorName || "Someone"}</b> {describeAction(h.action)} <b>{h.targetLabel}</b>
                  {h.after && "role" in h.after ? ` → ${roleLabel(String(h.after.role))}` : ""}
                </span>
                <small>{when(h.createdAt)}</small>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export function describeAction(action: string): string {
  const map: Record<string, string> = {
    "role.changed": "changed the role of",
    "permissions.changed": "changed the permissions of",
    "access.removed": "removed team access for",
    "ownership.transferred": "transferred ownership to",
    "settings.updated": "updated settings for",
    "currency.updated": "changed currency settings for",
    "notifications.updated": "changed notifications for",
    "quick_settings.updated": "changed quick settings for",
    "giving.toggled": "changed online giving for",
    "profile.updated": "updated the profile of",
    "status.changed": "changed the status of",
  };
  return map[action] ?? action.replace(/[._]/g, " ");
}

function AddToTeam({ organizationId, onAdded, notify }: { organizationId: string; onAdded: (t: Team) => void; notify: Notify }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [pick, setPick] = useState<string>("");
  const [role, setRole] = useState("leader");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) return setResults([]);
    const c = new AbortController();
    const t = window.setTimeout(() => {
      setLoading(true);
      adminCenterApi
        .searchMembers(organizationId, s, c.signal)
        .then((r) =>
          setResults(
            (r.items ?? []).map((m) => ({ id: m.id, name: m.profile?.displayName || m.user?.displayName || "Member", email: m.profile?.email || "", role: m.role || "member" })),
          ),
        )
        .catch(() => !c.signal.aborted && setResults([]))
        .finally(() => !c.signal.aborted && setLoading(false));
    }, 250);
    return () => (window.clearTimeout(t), c.abort());
  }, [organizationId, q]);

  async function submit() {
    if (!pick) return;
    setBusy(true);
    try {
      onAdded(await adminCenterApi.changeRole(organizationId, pick, role));
    } catch (err) {
      notify("error", errorMessage(err, "The role could not be assigned."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sr-add">
      <p className="sr-muted">Find an existing active member and give them a role.</p>
      <div className="sr-add__row">
        <label className="sr-search">
          <Search aria-hidden="true" />
          <input value={q} onChange={(e) => (setQ(e.target.value), setPick(""))} placeholder="Search members by name or email" aria-label="Search members" autoFocus />
        </label>
        <select className="sr-input" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
          {ROLE_OPTIONS.filter((r) => r.id !== "member" && r.id !== "guest").map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <button type="button" className="pl-btn pl-btn--primary" onClick={() => void submit()} disabled={!pick || busy}>
          {busy ? <Loader2 className="pl-spin" aria-hidden="true" /> : null} Assign role
        </button>
      </div>
      {loading && <p className="sr-muted">Searching…</p>}
      {!loading && q.trim().length >= 2 && results.length === 0 && <p className="sr-muted">No active members found.</p>}
      {results.length > 0 && (
        <ul className="sr-pick" role="listbox" aria-label="Members">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" role="option" aria-selected={pick === r.id} className={pick === r.id ? "is-on" : ""} onClick={() => setPick(r.id)}>
                <b>{r.name}</b>
                <small>
                  {r.email || "—"} · {roleLabel(r.role)}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* =============================================================== Permissions */

export function PermissionsTab({ organizationId, overview, notify, focusMember }: { organizationId: string; overview: Overview; notify: Notify; focusMember: string | null }) {
  const { team, setTeam, error, reload } = useTeam(organizationId);
  const [busy, setBusy] = useState<string | null>(null);
  const can = overview.access.canManagePermissions;
  const isOwner = overview.access.isOwner;

  const cols: TeamMember[] = useMemo(() => {
    const list = (team?.items ?? []).filter((m) => m.isOwner || ADMIN_ROLES.includes(m.role));
    list.sort((a, b) => (a.isOwner ? -1 : b.isOwner ? 1 : a.memberId === focusMember ? -1 : b.memberId === focusMember ? 1 : a.name.localeCompare(b.name)));
    return list;
  }, [team, focusMember]);

  async function save(m: TeamMember, permissions: string[], ok = "Permissions updated.") {
    setBusy(m.memberId);
    try {
      setTeam(await adminCenterApi.setPermissions(organizationId, m.memberId, permissions));
      notify("ok", ok);
    } catch (err) {
      notify("error", errorMessage(err, "Permissions could not be saved."));
      reload();
    } finally {
      setBusy(null);
    }
  }

  async function applyPreset(m: TeamMember, presetId: string) {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    if (!window.confirm(`Apply "${preset.label}" to ${m.name}? This replaces their current permissions.`)) return;
    setBusy(m.memberId);
    try {
      if (m.role !== preset.role) setTeam(await adminCenterApi.changeRole(organizationId, m.memberId, preset.role));
      setTeam(await adminCenterApi.setPermissions(organizationId, m.memberId, preset.permissions));
      notify("ok", `${preset.label} applied to ${m.name}.`);
    } catch (err) {
      notify("error", errorMessage(err, "The preset could not be applied."));
      reload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card icon={ShieldCheck} title="Permissions" sub="Each administrator has their own permissions. The owner always has every permission.">
      <p className="sr-banner">
        <Info aria-hidden="true" /> Only Organization Admins and Pastors / Directors can use these permissions. Other roles (leaders, ministry directors…) can only view. Nobody can grant themselves permissions, and the
        <Lock className="sr-inline" aria-label="locked" /> permissions can only be granted by the owner.
      </p>
      {error && <p className="sr-error">{error}</p>}
      {!team && !error && (
        <p className="sr-muted">
          <Loader2 className="pl-spin" aria-hidden="true" /> Loading permissions…
        </p>
      )}
      {team && cols.length <= 1 && <Empty>Add an Organization Admin or Pastor / Director in Team &amp; Roles to give them permissions.</Empty>}
      {team && cols.length > 0 && (
        <div className="sr-matrix-wrap">
          <table className="sr-matrix">
            <thead>
              <tr>
                <th scope="col" className="sr-matrix__mod">
                  Module / permission
                </th>
                {cols.map((m) => (
                  <th key={m.memberId} scope="col" className={m.memberId === focusMember ? "is-focus" : ""}>
                    <span className="sr-matrix__name">
                      {m.isOwner && <Crown className="sr-crown" aria-hidden="true" />} {m.name}
                    </span>
                    <small>{roleLabel(m.role, m.isOwner)}</small>
                    {!m.isOwner && can && (
                      <select className="sr-input sr-input--xs" value="" disabled={busy === m.memberId} aria-label={`Apply a preset to ${m.name}`} onChange={(e) => void applyPreset(m, e.target.value)}>
                        <option value="">Apply preset…</option>
                        {PRESETS.filter((p) => ADMIN_ROLES.includes(p.role)).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MODULES.map((mod) => (
                <ModuleRows key={mod.id} mod={mod} cols={cols} can={can} isOwner={isOwner} busy={busy} onToggle={(m, id, on) => void save(m, on ? [...m.permissions, id] : m.permissions.filter((x) => x !== id))} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!can && <p className="sr-muted sr-small">You can view permissions. Changing them needs the Manage permissions permission.</p>}
      <p className="sr-muted sr-small">
        <AlertTriangle className="sr-inline" aria-hidden="true" /> Role presets set a role and a starting set of permissions for one person; you can adjust each box afterwards. <ArrowRightLeft className="sr-inline" aria-hidden="true" /> Ownership is transferred in the Danger Zone.
      </p>
    </Card>
  );
}

function ModuleRows({ mod, cols, can, isOwner, busy, onToggle }: { mod: (typeof PERMISSION_MODULES)[number]; cols: TeamMember[]; can: boolean; isOwner: boolean; busy: string | null; onToggle: (m: TeamMember, id: string, on: boolean) => void }) {
  return (
    <>
      <tr className="sr-matrix__group">
        <th scope="rowgroup" colSpan={cols.length + 1}>
          {mod.label}
          {mod.note && <small> — {mod.note}</small>}
        </th>
      </tr>
      {mod.permissions.map((p) => (
        <tr key={p.id}>
          <th scope="row" className="sr-matrix__mod">
            {p.label} {p.dangerous && <Lock className="sr-inline" aria-label="Owner only" />}
          </th>
          {cols.map((m) => {
            const on = m.isOwner || m.permissions.includes(p.id);
            const locked = m.isOwner || !can || busy === m.memberId || (p.dangerous && !isOwner);
            return (
              <td key={m.memberId}>
                <input type="checkbox" className="sr-check" checked={on} disabled={locked} aria-label={`${p.label} (${mod.label}) for ${m.name}`} onChange={(e) => onToggle(m, p.id, e.target.checked)} />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
