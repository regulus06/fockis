/**
 * OrganizationAdminDashboard.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/admin (and /admin/dashboard)
 *
 * The Organization Dashboard. Every number comes from
 * GET /organizations/:id/dashboard (real records, filtered by the
 * administrator's permissions on the server). A section the administrator may
 * not see comes back as null and is hidden here. The date filter (Today,
 * 7/30/90 days, This year, Custom range) is sent to the server and changes the
 * statistics, the growth chart and attendance.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  ChartLine,
  ChevronDown,
  CircleCheck,
  Clock,
  Eye,
  HandHeart,
  Info,
  LayoutDashboard,
  MapPin,
  Megaphone,
  MoreVertical,
  Network,
  Pencil,
  Percent,
  RefreshCw,
  Send,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  UsersRound,
  Video,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  getOrganizationDashboard,
  mediaUrl,
  type DashboardActivity,
  type DashboardEvent,
  type DashboardQuery,
  type OrganizationDashboard,
} from "../api/dashboardApi";
import { MEMBER_ROLE_LABELS, type MemberRole } from "../types/organization.types";
import { useOrgAdmin } from "../hooks/useOrgAdmin";
import AdminGate from "../ui/AdminGate";
import { termsFor } from "../ui/orgTerminology";
import { Alert, Avatar, Skeleton, errorMessage, formatDate, formatNumber } from "../ui/orgUi";
import OrgBanner from "../branding/OrgBanner";
import { hasBanner } from "../branding/PageBrandingParts";
import { pageKeyFromPath } from "../branding/pageBrandingApi";
import { usePageBranding } from "../branding/usePageBranding";
import "./organizationDashboard.scss";

/* ------------------------------------------------------------------ ranges */

type RangeKey = "today" | "7d" | "30d" | "90d" | "year" | "custom";

const RANGES: { key: RangeKey; label: string; phrase: string }[] = [
  { key: "today", label: "Today", phrase: "today" },
  { key: "7d", label: "Last 7 Days", phrase: "in the last 7 days" },
  { key: "30d", label: "Last 30 Days", phrase: "in the last 30 days" },
  { key: "90d", label: "Last 90 Days", phrase: "in the last 90 days" },
  { key: "year", label: "This Year", phrase: "this year" },
  { key: "custom", label: "Custom Range", phrase: "in this period" },
];

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function queryFor(key: RangeKey, from: string, to: string): DashboardQuery | null {
  const now = new Date();
  switch (key) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from: start.toISOString(), to: now.toISOString() };
    }
    case "7d":
      return { days: 7 };
    case "90d":
      return { days: 90 };
    case "year":
      return { from: new Date(now.getFullYear(), 0, 1).toISOString(), to: now.toISOString() };
    case "custom": {
      if (!from || !to) return null;
      const [fy, fm, fd] = from.split("-").map(Number);
      const [ty, tm, td] = to.split("-").map(Number);
      const start = new Date(fy, fm - 1, fd);
      const end = new Date(ty, tm - 1, td, 23, 59, 59, 999);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return null;
      return { from: start.toISOString(), to: end.toISOString() };
    }
    default:
      return { days: 30 };
  }
}

/* ---------------------------------------------------------------- activity */

function humanize(action: string): string {
  const s = action.replace(/^ministry[._]/, "").replace(/[._]+/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Updated";
}

function describe(a: DashboardActivity, person: string): string {
  switch (a.type) {
    case "member":
      if (a.action === "requested" || a.status === "pending") return `Applied to become a ${person.toLowerCase()}`;
      if (a.action === "joined") return "Joined the organization";
      if (a.status === "active") return "Membership approved";
      if (a.status === "inactive") return "Membership suspended";
      if (a.status === "archived") return "Application declined or membership archived";
      if (a.detail) return `Role changed to ${MEMBER_ROLE_LABELS[a.detail as MemberRole] ?? a.detail.replace(/_/g, " ")}`;
      return "Membership updated";
    case "event":
      return a.detail ? `Event created · ${formatDate(a.detail, { weekday: "short", month: "short", day: "numeric" })}` : "Event created";
    case "ministry":
      return a.detail ? `${humanize(a.action)} — ${a.detail}` : humanize(a.action);
    case "announcement":
      return a.detail ? `Published an announcement: “${a.detail}”` : "Published an announcement";
    case "donation":
      return a.detail ? `Gave ${a.detail}` : "Gave online";
    case "attendance": {
      const n = Number(a.detail ?? 0);
      return `Attendance recorded · ${n} ${n === 1 ? "person" : "people"} present`;
    }
    default:
      return humanize(a.action);
  }
}

const ACTIVITY_ICON: Record<DashboardActivity["type"], LucideIcon> = {
  member: UserPlus,
  event: CalendarDays,
  ministry: Network,
  announcement: Megaphone,
  donation: HandHeart,
  attendance: CalendarCheck2,
};

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/* =================================================================== page */

export default function OrganizationAdminDashboard(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const state = useOrgAdmin(organizationId);
  const branding = usePageBranding(organizationId);

  const rangeKey = (RANGES.some((r) => r.key === params.get("range")) ? params.get("range") : "30d") as RangeKey;
  const customFrom = params.get("from") ?? "";
  const customTo = params.get("to") ?? "";
  const query = useMemo(() => queryFor(rangeKey, customFrom, customTo), [rangeKey, customFrom, customTo]);

  const [data, setData] = useState<OrganizationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const notice = (location.state as { notice?: string } | null)?.notice;

  useEffect(() => {
    if (!state.allowed || !query) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getOrganizationDashboard(organizationId, query, controller.signal)
      .then((d) => !controller.signal.aborted && setData(d))
      .catch((err) => !controller.signal.aborted && setError(errorMessage(err, "The dashboard could not be loaded.")))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, JSON.stringify(query), state.allowed, tick]);

  function setRange(key: RangeKey, from?: string, to?: string) {
    const next = new URLSearchParams(params);
    if (key === "30d") next.delete("range");
    else next.set("range", key);
    if (key === "custom" && from && to) {
      next.set("from", from);
      next.set("to", to);
    } else {
      next.delete("from");
      next.delete("to");
    }
    setParams(next, { replace: true });
  }

  const p = (s = "") => `/organizations/${encodeURIComponent(organizationId)}${s}`;
  const pageBanner = hasBanner(branding.publishedFor(pageKeyFromPath(p("/admin"), organizationId)));

  return (
    <AdminGate state={state} organizationId={organizationId} returnTo={p("/admin")}>
      {() => {
        const org = state.org;
        const t = termsFor(org?.organizationType);
        const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[2];
        const phrase =
          rangeKey === "custom" && data?.range
            ? `from ${formatDate(data.range.from, { month: "short", day: "numeric" })} to ${formatDate(data.range.to, { month: "short", day: "numeric" })}`
            : range.phrase;

        return (
          <div className="od">
            {!pageBanner && org && (
              <OrgBanner organizationId={organizationId} name={org.name} tagline={org.tagline} logoUrl={org.logoUrl} coverUrl={org.bannerUrl ?? null} />
            )}

            <div className="od-head">
              <div className="od-head__title">
                <h1>Organization Dashboard</h1>
                <p>Welcome back! Here's what's happening in your organization.</p>
              </div>
              <div className="od-head__actions">
                <Link to={p()} className="od-btn od-btn--ghost">
                  <Eye aria-hidden="true" /> Public Page
                </Link>
                <RangePicker value={rangeKey} from={customFrom} to={customTo} onChange={setRange} />
              </div>
            </div>

            {notice && <Alert tone="ok">{notice}</Alert>}
            {rangeKey === "custom" && !query && <Alert tone="info">Choose a start and end date for the custom range.</Alert>}
            {error && (
              <div className="od-error" role="alert">
                <span>{error}</span>
                <button type="button" className="od-btn od-btn--ghost od-btn--sm" onClick={() => setTick((x) => x + 1)}>
                  <RefreshCw aria-hidden="true" /> Try again
                </button>
              </div>
            )}

            {loading && !data ? (
              <DashboardSkeleton />
            ) : data ? (
              <div className={"od-body" + (loading ? " is-loading" : "")} aria-busy={loading}>
                <Stats data={data} p={p} people={t.people} departments={t.departments} groups={t.groups} />

                <div className="od-row od-row--growth">
                  <GrowthCard data={data} person={t.person} phrase={phrase} rangeKey={rangeKey} />
                  <QuickActions p={p} can={state.can} person={t.person} people={t.people} departments={t.departments} />
                </div>

                {(data.attendance || data.recentActivity) && (
                  <div className={"od-row" + (data.attendance && data.recentActivity ? " od-row--split" : "")}>
                    {data.attendance && <AttendanceCard data={data} p={p} people={t.people} />}
                    {data.recentActivity && <ActivityCard items={data.recentActivity} p={p} person={t.person} />}
                  </div>
                )}

                {data.upcomingEvents && <EventsCard events={data.upcomingEvents} p={p} canManage={state.can("manage_events")} />}

                <p className="od-updated">
                  Updated {new Date(data.generatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  {loading ? " · refreshing…" : ""}
                </p>
              </div>
            ) : null}
          </div>
        );
      }}
    </AdminGate>
  );
}

/* ============================================================ date filter */

function RangePicker({ value, from, to, onChange }: { value: RangeKey; from: string; to: string; onChange: (k: RangeKey, from?: string, to?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const today = ymd(new Date());
  const [f, setF] = useState(from || ymd(new Date(Date.now() - 29 * 86_400_000)));
  const [tt, setT] = useState(to || today);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) {
        setOpen(false);
        setCustom(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const label =
    value === "custom" && from && to
      ? `${formatDate(from + "T12:00:00", { month: "short", day: "numeric" })} – ${formatDate(to + "T12:00:00", { month: "short", day: "numeric", year: "numeric" })}`
      : (RANGES.find((r) => r.key === value)?.label ?? "Last 30 Days");
  const valid = f && tt && f <= tt && tt <= today;

  return (
    <div className="od-range" ref={box}>
      <button type="button" className="od-btn od-btn--ghost od-range__btn" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
        <CalendarRange aria-hidden="true" /> {label} <ChevronDown aria-hidden="true" className="od-range__chev" />
      </button>
      {open && (
        <div className="od-range__pop">
          {!custom ? (
            <ul role="listbox" aria-label="Date range">
              {RANGES.map((r) => (
                <li key={r.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === r.key}
                    className={value === r.key ? "is-on" : ""}
                    onClick={() => {
                      if (r.key === "custom") return setCustom(true);
                      onChange(r.key);
                      setOpen(false);
                    }}
                  >
                    {r.label}
                    {r.key === "custom" && <ChevronDown aria-hidden="true" className="od-range__more" />}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <form
              className="od-range__custom"
              onSubmit={(e) => {
                e.preventDefault();
                if (!valid) return;
                onChange("custom", f, tt);
                setOpen(false);
                setCustom(false);
              }}
            >
              <label>
                <span>From</span>
                <input type="date" value={f} max={tt || today} onChange={(e) => setF(e.target.value)} required />
              </label>
              <label>
                <span>To</span>
                <input type="date" value={tt} min={f} max={today} onChange={(e) => setT(e.target.value)} required />
              </label>
              {!valid && <small>The start date must be on or before the end date (and not in the future).</small>}
              <div>
                <button type="button" className="od-btn od-btn--ghost od-btn--sm" onClick={() => setCustom(false)}>
                  Back
                </button>
                <button type="submit" className="od-btn od-btn--primary od-btn--sm" disabled={!valid}>
                  Apply
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== stats */

function Stats({
  data,
  p,
  people,
  departments,
  groups,
}: {
  data: OrganizationDashboard;
  p: (s?: string) => string;
  people: string;
  departments: string;
  groups: string;
}) {
  const c = data.counts;
  const total = c.totalMembers !== null ? c.totalMembers + (c.inactiveMembers ?? 0) : null;
  const plus = (n?: number | null) => (typeof n === "number" && n > 0 ? `+${n.toLocaleString()} new` : null);
  const cards: { show: boolean; tone: string; icon: LucideIcon; value: number | null; label: string; to: string; change: string | null; down?: boolean }[] = [
    {
      show: c.totalMembers !== null,
      tone: "blue",
      icon: Users,
      value: total,
      label: `Total ${people}`,
      to: p("/admin/members"),
      change: data.growth?.changePercent != null && data.growth.changePercent !== 0 ? `${data.growth.changePercent > 0 ? "+" : ""}${data.growth.changePercent}%` : null,
      down: (data.growth?.changePercent ?? 0) < 0,
    },
    { show: c.totalMembers !== null, tone: "green", icon: UserCheck, value: c.totalMembers, label: `Active ${people}`, to: p("/admin/members?status=active"), change: plus(c.newMembers) },
    { show: c.pendingApplications !== null, tone: "amber", icon: Clock, value: c.pendingApplications, label: "Pending Applications", to: p("/admin/members?status=pending"), change: null },
    { show: c.departments !== null, tone: "violet", icon: Network, value: c.departments, label: departments, to: p("/admin/departments"), change: plus(c.newDepartments) },
    { show: c.groups !== null, tone: "sky", icon: UsersRound, value: c.groups, label: groups, to: p("/admin/groups"), change: plus(c.newGroups) },
    { show: c.upcomingEvents !== null, tone: "pink", icon: CalendarDays, value: c.upcomingEvents, label: "Upcoming Events", to: p("/admin/events"), change: null },
  ];
  const shown = cards.filter((card) => card.show);
  if (!shown.length) return null;
  return (
    <div className="od-stats">
      {shown.map((card) => (
        <Link key={card.label} to={card.to} className={`od-stat od-stat--${card.tone}`}>
          <span className="od-stat__icon" aria-hidden="true">
            <card.icon />
          </span>
          <card.icon className="od-stat__deco" aria-hidden="true" />
          <strong>{formatNumber(card.value)}</strong>
          <span className="od-stat__label">{card.label}</span>
          {card.change && <em className={"od-stat__change" + (card.down ? " is-down" : "")}>{card.change}</em>}
        </Link>
      ))}
    </div>
  );
}

/* ================================================================= growth */

function GrowthCard({ data, person, phrase, rangeKey }: { data: OrganizationDashboard; person: string; phrase: string; rangeKey: RangeKey }) {
  const g = data.growth;
  const fmt = (iso: string) =>
    rangeKey === "today"
      ? new Date(iso).toLocaleTimeString(undefined, { hour: "numeric" })
      : data.rangeDays > 180
        ? formatDate(iso, { month: "short", year: "2-digit" })
        : formatDate(iso, { month: "short", day: "numeric" });
  const added = typeof data.counts.newMembers === "number" ? data.counts.newMembers : (g?.added ?? null);
  return (
    <section className="od-card od-growth" aria-labelledby="od-growth">
      <div className="od-card__head">
        <h2 id="od-growth">
          <ChartLine aria-hidden="true" /> {person} Growth
        </h2>
        {typeof added === "number" && (
          <span className={"od-pill" + (added > 0 ? " od-pill--ok" : "")}>
            {added > 0 ? "↑ " : ""}+{added.toLocaleString()} new {phrase}
          </span>
        )}
      </div>
      {g ? (
        <AreaChart points={g.points.map((pt) => ({ label: fmt(pt.date), value: pt.total }))} label={`Active ${person.toLowerCase()}s over time`} />
      ) : (
        <p className="od-muted">You don't have permission to view member figures.</p>
      )}
    </section>
  );
}

function AreaChart({ points, label }: { points: { label: string; value: number }[]; label: string }) {
  const W = 640;
  const H = 220;
  const pad = { l: 40, r: 14, t: 12, b: 30 };
  const max = Math.max(0, ...points.map((pt) => pt.value));
  const top = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const ticks = [0, 1, 2, 3, 4].map((i) => (top / 4) * i);
  const x = (i: number) => pad.l + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - v / top) * (H - pad.t - pad.b);
  const line = points.map((pt, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(pt.value).toFixed(1)}`).join(" ");
  const area = points.length ? `${line} L${x(points.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z` : "";
  const every = Math.max(1, Math.ceil(points.length / 8));

  return (
    <figure className="od-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${points.map((pt) => `${pt.label} ${pt.value}`).join(", ")}`}>
        <defs>
          <linearGradient id="od-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--fo-blue, #0b63d1)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--fo-blue, #0b63d1)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((tv) => (
          <g key={tv}>
            <line x1={pad.l} x2={W - pad.r} y1={y(tv)} y2={y(tv)} className="od-chart__grid" />
            <text x={pad.l - 8} y={y(tv) + 4} textAnchor="end" className="od-chart__tick">
              {Number.isInteger(tv) ? tv.toLocaleString() : tv.toFixed(1)}
            </text>
          </g>
        ))}
        {area && <path d={area} fill="url(#od-area)" />}
        {line && <path d={line} className="od-chart__line" />}
        {points.map((pt, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(pt.value)} r={i === points.length - 1 ? 5 : 3.5} className="od-chart__dot">
              <title>
                {pt.label}: {pt.value.toLocaleString()}
              </title>
            </circle>
            {(i % every === 0 || i === points.length - 1) && (
              <text x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="od-chart__tick">
                {pt.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </figure>
  );
}

/* ========================================================== quick actions */

function QuickActions({ p, can, person, people, departments }: { p: (s?: string) => string; can: (perm: string) => boolean; person: string; people: string; departments: string }) {
  const actions = [
    { perm: "add_member", to: p("/admin/members/tools#add"), icon: UserPlus, label: `Add ${person}` },
    { perm: "add_member", to: p("/admin/members/tools#invite"), icon: Send, label: `Invite ${people}` },
    { perm: "manage_events", to: p("/admin/events"), icon: CalendarPlus, label: "Create Event" },
    { perm: "manage_communication", to: p("/communication"), icon: Megaphone, label: "Send Announcement" },
    { perm: "manage_departments", to: p("/admin/departments"), icon: Network, label: `Manage ${departments}` },
    { perm: "manage_attendance", to: p("/attendance"), icon: CalendarCheck2, label: "Record Attendance" },
  ];
  return (
    <section className="od-card od-quick" aria-labelledby="od-quick">
      <div className="od-card__head">
        <h2 id="od-quick">
          <Zap aria-hidden="true" /> Quick Actions
        </h2>
      </div>
      <div className="od-quick__grid">
        {actions.map((a) =>
          can(a.perm) ? (
            <Link key={a.label} to={a.to} className="od-quick__btn">
              <a.icon aria-hidden="true" />
              <span>{a.label}</span>
            </Link>
          ) : (
            <span key={a.label} className="od-quick__btn is-locked" title="You don't have permission for this. Ask the owner." aria-disabled="true">
              <a.icon aria-hidden="true" />
              <span>{a.label}</span>
            </span>
          ),
        )}
      </div>
    </section>
  );
}

/* ============================================================= attendance */

function AttendanceCard({ data, p, people }: { data: OrganizationDashboard; p: (s?: string) => string; people: string }) {
  const att = data.attendance!;
  const trend = att.previousCheckIns > 0 ? Math.round(((att.checkIns - att.previousCheckIns) / att.previousCheckIns) * 1000) / 10 : null;
  const tiles: { icon: LucideIcon; tone: string; value: string; label: string; extra?: string; down?: boolean }[] = [
    { icon: CalendarCheck2, tone: "green", value: att.checkIns.toLocaleString(), label: "Check-ins", extra: trend !== null ? `${trend > 0 ? "+" : ""}${trend}% vs previous` : undefined, down: (trend ?? 0) < 0 },
    { icon: Users, tone: "blue", value: att.membersPresent.toLocaleString(), label: `${people} present` },
    { icon: Percent, tone: "violet", value: att.participationRate === null ? "—" : `${att.participationRate}%`, label: "Participation" },
    { icon: UserX, tone: "red", value: att.absences.toLocaleString(), label: "Absence reports" },
  ];
  const max = Math.max(1, ...att.byWeek.map((w) => w.checkIns));
  return (
    <section className="od-card od-att" aria-labelledby="od-att">
      <div className="od-card__head">
        <h2 id="od-att">
          <UsersRound aria-hidden="true" /> Attendance
        </h2>
        <Link to={p("/attendance")} className="od-link">
          Open attendance <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      <div className="od-att__tiles">
        {tiles.map((tile) => (
          <div key={tile.label} className={`od-att__tile od-att__tile--${tile.tone}`}>
            <span className="od-att__icon" aria-hidden="true">
              <tile.icon />
            </span>
            <span>
              <strong>{tile.value}</strong>
              <small>{tile.label}</small>
              {tile.extra && <em className={tile.down ? "is-down" : ""}>{tile.extra}</em>}
            </span>
          </div>
        ))}
      </div>
      {att.byWeek.length > 0 ? (
        <div className="od-att__bars" role="img" aria-label={`Check-ins per week: ${att.byWeek.map((w) => `${formatDate(w.weekStart, { month: "short", day: "numeric" })} ${w.checkIns}`).join(", ")}`}>
          {att.byWeek.map((w) => (
            <span key={w.weekStart} title={`${formatDate(w.weekStart, { month: "short", day: "numeric" })}: ${w.checkIns}`}>
              <i style={{ height: `${Math.max(6, (w.checkIns / max) * 100)}%` } as CSSProperties} />
              <small>{formatDate(w.weekStart, { month: "short", day: "numeric" })}</small>
            </span>
          ))}
        </div>
      ) : (
        <p className="od-muted od-note">
          <Info aria-hidden="true" /> No check-ins recorded in this period.
        </p>
      )}
    </section>
  );
}

/* ============================================================== activity */

function activityLink(a: DashboardActivity, p: (s?: string) => string): string | null {
  switch (a.type) {
    case "member":
      return a.memberId ? p(`/members/${encodeURIComponent(a.memberId)}`) : null;
    case "event":
      return a.targetId ? p(`/events/${encodeURIComponent(a.targetId)}`) : p("/admin/events");
    case "ministry":
      return a.targetId ? p(`/ministries/${encodeURIComponent(a.targetId)}`) : p("/admin/departments");
    case "announcement":
      return p("/communication");
    case "donation":
      return p("/admin/giving");
    case "attendance":
      return a.targetId ? p(`/ministries/${encodeURIComponent(a.targetId)}`) : p("/attendance");
    default:
      return null;
  }
}

function ActivityCard({ items, p, person }: { items: DashboardActivity[]; p: (s?: string) => string; person: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 5);
  return (
    <section className="od-card od-act" aria-labelledby="od-act">
      <div className="od-card__head">
        <h2 id="od-act">
          <Clock aria-hidden="true" /> Recent Activity
        </h2>
        {items.length > 5 && (
          <button type="button" className="od-link" onClick={() => setAll((v) => !v)} aria-expanded={all}>
            {all ? "Show less" : "View All"} <ArrowRight aria-hidden="true" />
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="od-empty">
          <CircleCheck aria-hidden="true" />
          <b>No activity yet</b>
          <span>New {person.toLowerCase()}s, events, announcements and gifts will show up here.</span>
        </div>
      ) : (
        <ul className={"od-act__list" + (all ? " is-all" : "")}>
          {shown.map((a) => {
            const Icon = ACTIVITY_ICON[a.type] ?? LayoutDashboard;
            const to = activityLink(a, p);
            const body = (
              <>
                {a.type === "member" || a.type === "announcement" || (a.type === "donation" && a.memberId) ? (
                  <Avatar name={a.actorName} url={a.avatarUrl} size="sm" />
                ) : a.avatarUrl ? (
                  <img className="od-act__thumb" src={mediaUrl(a.avatarUrl) ?? ""} alt="" />
                ) : (
                  <span className={`od-act__icon od-act__icon--${a.type}`} aria-hidden="true">
                    <Icon />
                  </span>
                )}
                <span className="od-act__text">
                  <b>{a.actorName}</b>
                  <span>{describe(a, person)}</span>
                  <small>{when(a.at)}</small>
                </span>
                <Icon className="od-act__type" aria-label={a.type} />
              </>
            );
            return <li key={a.id}>{to ? <Link to={to}>{body}</Link> : <div>{body}</div>}</li>;
          })}
        </ul>
      )}
    </section>
  );
}

/* ================================================================= events */

function eventStatus(e: DashboardEvent): { label: string; tone: string } {
  const start = e.startsAt ? new Date(e.startsAt).getTime() : 0;
  const soon = start && start - Date.now() < 24 * 3_600_000;
  if (e.requiresRsvp) {
    if (e.capacity && (e.going ?? 0) >= e.capacity) return { label: "Full", tone: "red" };
    return { label: `Registration open · ${e.going ?? 0}${e.capacity ? `/${e.capacity}` : ""} going`, tone: "blue" };
  }
  if (soon) return { label: "Starting soon", tone: "amber" };
  return { label: "Upcoming", tone: "green" };
}

function EventsCard({ events, p, canManage }: { events: DashboardEvent[]; p: (s?: string) => string; canManage: boolean }) {
  const [menu, setMenu] = useState<string | null>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (ev: MouseEvent) => !(ev.target as HTMLElement).closest(".od-ev__menu") && setMenu(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  return (
    <section className="od-card od-events" aria-labelledby="od-ev">
      <div className="od-card__head">
        <h2 id="od-ev">
          <CalendarDays aria-hidden="true" /> Upcoming Events
        </h2>
        <Link to={p("/admin/events")} className="od-link">
          Manage events <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      {events.length === 0 ? (
        <div className="od-empty">
          <CalendarDays aria-hidden="true" />
          <b>Nothing scheduled</b>
          <span>Create an event to fill your calendar.</span>
          {canManage && (
            <Link to={p("/admin/events")} className="od-btn od-btn--primary od-btn--sm">
              <CalendarPlus aria-hidden="true" /> Create Event
            </Link>
          )}
        </div>
      ) : (
        <ul className="od-ev">
          {events.map((e) => {
            const d = e.startsAt ? new Date(e.startsAt) : null;
            const status = eventStatus(e);
            const cover = mediaUrl(e.coverImageUrl ?? null);
            return (
              <li key={e.id} className="od-ev__item">
                <span className="od-ev__date" aria-hidden="true">
                  <small>{d ? d.toLocaleDateString(undefined, { month: "short" }) : ""}</small>
                  <b>{d ? d.getDate() : "—"}</b>
                </span>
                <Link to={p(`/events/${encodeURIComponent(e.id)}`)} className="od-ev__thumb" aria-hidden="true" tabIndex={-1}>
                  {cover ? <img src={cover} alt="" /> : <CalendarDays />}
                </Link>
                <span className="od-ev__info">
                  <Link to={p(`/events/${encodeURIComponent(e.id)}`)} className="od-ev__title">
                    {e.title}
                  </Link>
                  <span>
                    <CalendarDays aria-hidden="true" />
                    {d ? d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Date to be announced"}
                    {d && <> · {d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</>}
                  </span>
                  {(e.location || e.isOnline) && (
                    <span>
                      {e.isOnline && !e.location ? <Video aria-hidden="true" /> : <MapPin aria-hidden="true" />}
                      {e.location || "Online"}
                    </span>
                  )}
                </span>
                <span className={`od-pill od-pill--${status.tone}`}>{status.label}</span>
                <span className="od-ev__acts">
                  {canManage && (
                    <Link to={p(`/events/${encodeURIComponent(e.id)}/edit`)} className="od-iconbtn" aria-label={`Edit ${e.title}`} title="Edit event">
                      <Pencil aria-hidden="true" />
                    </Link>
                  )}
                  <span className="od-ev__menu">
                    <button type="button" className="od-iconbtn" aria-label={`More actions for ${e.title}`} aria-haspopup="menu" aria-expanded={menu === e.id} onClick={() => setMenu(menu === e.id ? null : e.id)}>
                      <MoreVertical aria-hidden="true" />
                    </button>
                    {menu === e.id && (
                      <span className="od-ev__pop" role="menu">
                        <Link role="menuitem" to={p(`/events/${encodeURIComponent(e.id)}`)}>
                          View event
                        </Link>
                        {canManage && (
                          <Link role="menuitem" to={p(`/events/${encodeURIComponent(e.id)}/edit`)}>
                            Edit event
                          </Link>
                        )}
                        <Link role="menuitem" to={p("/admin/events")}>
                          All events
                        </Link>
                      </span>
                    )}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ============================================================== skeleton */

function DashboardSkeleton() {
  return (
    <div className="od-body" aria-busy="true">
      <div className="od-stats">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={120} />
        ))}
      </div>
      <div className="od-row od-row--growth">
        <Skeleton height={300} />
        <Skeleton height={300} />
      </div>
      <Skeleton height={180} />
    </div>
  );
}
