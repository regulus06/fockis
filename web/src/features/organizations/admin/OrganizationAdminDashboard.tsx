/**
 * OrganizationAdminDashboard.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/admin (and /admin/dashboard)
 *
 * The "Organization Dashboard" from the reference design. Every number comes
 * from GET /organizations/:id/dashboard (real records, filtered by the
 * administrator's permissions on the server). A section the administrator may
 * not see comes back as null and is hidden here.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  CalendarDays,
  CalendarPlus,
  CircleCheck,
  ClipboardCheck,
  Clock,
  Eye,
  Megaphone,
  Network,
  RefreshCw,
  Send,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";

import { getOrganizationDashboard, type DashboardRange, type OrganizationDashboard } from "../api/dashboardApi";
import { MEMBER_ROLE_LABELS, type MemberRole } from "../types/organization.types";
import { useOrgAdmin } from "../hooks/useOrgAdmin";
import AdminGate from "../ui/AdminGate";
import { termsFor } from "../ui/orgTerminology";
import { Alert, Avatar, BarChart, EmptyState, LineChart, Skeleton, StatCard, errorMessage, formatDate, formatDateTime, formatNumber } from "../ui/orgUi";
import "../styles/OrganizationAdminScreens.scss";

const RANGES: { value: DashboardRange; label: string }[] = [
  { value: 7, label: "Last 7 Days" },
  { value: 30, label: "Last 30 Days" },
  { value: 90, label: "Last 90 Days" },
  { value: 365, label: "Last 12 Months" },
];

type Activity = NonNullable<OrganizationDashboard["recentActivity"]>[number];

function describe(a: Activity, person: string): string {
  if (a.note === "requested" || a.status === "pending") return `Applied to become a ${person.toLowerCase()}`;
  if (a.note === "joined") return "Joined the organization";
  if (a.status === "active") return "Membership approved / reactivated";
  if (a.status === "inactive") return "Membership suspended";
  if (a.status === "archived") return "Application declined or membership archived";
  if (a.role) return `Role changed to ${MEMBER_ROLE_LABELS[a.role as MemberRole] ?? a.role.replace(/_/g, " ")}`;
  return "Membership updated";
}

export default function OrganizationAdminDashboard(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const location = useLocation();
  const state = useOrgAdmin(organizationId);
  const [range, setRange] = useState<DashboardRange>(30);
  const [data, setData] = useState<OrganizationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const notice = (location.state as { notice?: string } | null)?.notice;

  useEffect(() => {
    if (!state.allowed) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getOrganizationDashboard(organizationId, range, controller.signal)
      .then((d) => !controller.signal.aborted && setData(d))
      .catch((err) => !controller.signal.aborted && setError(errorMessage(err, "The dashboard could not be loaded.")))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [organizationId, range, state.allowed, tick]);

  const p = (s = "") => `/organizations/${encodeURIComponent(organizationId)}${s}`;

  return (
    <AdminGate state={state} organizationId={organizationId} returnTo={p("/admin")}>
      {() => {
        const t = termsFor(state.org?.organizationType);
        const c = data?.counts;
        const total = c && c.totalMembers !== null ? c.totalMembers + (c.inactiveMembers ?? 0) : null;
        const can = state.can;
        const quick = [
          { show: can("add_member"), to: p("/admin/members/tools#add"), icon: UserPlus, label: `Add ${t.person}` },
          { show: can("add_member"), to: p("/admin/members/tools#invite"), icon: Send, label: `Invite ${t.people}` },
          { show: can("manage_events"), to: p("/admin/events"), icon: CalendarPlus, label: "Create Event" },
          { show: can("manage_communication"), to: p("/communication"), icon: Megaphone, label: "Send Announcement" },
          { show: can("manage_departments"), to: p("/admin/departments"), icon: Network, label: `Manage ${t.departments}` },
          { show: can("manage_attendance"), to: p("/attendance"), icon: ClipboardCheck, label: "Record Attendance" },
        ].filter((q) => q.show);

        const att = data?.attendance;
        const attTrend =
          att && att.previousCheckIns > 0 ? Math.round(((att.checkIns - att.previousCheckIns) / att.previousCheckIns) * 1000) / 10 : null;
        const pointLabel = (iso: string) =>
          formatDate(iso, range >= 365 ? { month: "short", year: "2-digit" } : { month: "short", day: "numeric" });

        return (
          <>
            <div className="fo-pagehead">
              <div>
                <h1>Organization Dashboard</h1>
                <p>Welcome back{state.me?.profile?.displayName ? `, ${state.me.profile.displayName.split(" ")[0]}` : ""}!</p>
              </div>
              <div className="fo-pagehead__actions">
                <Link to={p()} className="fo-btn fo-btn--secondary">
                  <Eye aria-hidden="true" /> Public page
                </Link>
                <label>
                  <span className="fo-sr">Time range</span>
                  <select className="fo-select" value={range} onChange={(e) => setRange(Number(e.target.value) as DashboardRange)}>
                    {RANGES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {notice && <Alert tone="ok">{notice}</Alert>}
            {error && (
              <Alert>
                {error}{" "}
                <button type="button" className="fo-btn fo-btn--ghost fo-btn--sm" onClick={() => setTick((x) => x + 1)}>
                  <RefreshCw aria-hidden="true" /> Try again
                </button>
              </Alert>
            )}

            {loading && !data ? (
              <>
                <div className="fo-stats">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} height={128} />
                  ))}
                </div>
                <Skeleton height={300} />
              </>
            ) : data ? (
              <>
                <div className="fo-stats foa-stats" aria-busy={loading}>
                  {c?.totalMembers !== null && (
                    <StatCard icon={Users} value={formatNumber(total)} label={`Total ${t.people}`} trend={data.growth?.changePercent ?? null} to={p("/admin/members")} />
                  )}
                  {c?.totalMembers !== null && (
                    <StatCard icon={UserCheck} tone="green" value={formatNumber(c?.totalMembers)} label={`Active ${t.people}`} to={p("/admin/members?status=active")} />
                  )}
                  {c?.pendingApplications !== null && (
                    <StatCard icon={Clock} tone="amber" value={formatNumber(c?.pendingApplications)} label="Pending Applications" to={p("/admin/members?status=pending")} />
                  )}
                  {c?.departments !== null && (
                    <StatCard icon={Network} tone="violet" value={formatNumber(c?.departments)} label={t.departments} to={p("/admin/departments")} />
                  )}
                  {c?.groups !== null && <StatCard icon={UsersRound} value={formatNumber(c?.groups)} label={t.groups} to={p("/admin/groups")} />}
                  {c?.upcomingEvents !== null && (
                    <StatCard icon={CalendarDays} tone="pink" value={formatNumber(c?.upcomingEvents)} label="Upcoming Events" to={p("/admin/events")} />
                  )}
                </div>

                <div className="foa-grid">
                  <section className="fo-card foa-grid__wide" aria-labelledby="foa-growth">
                    <div className="fo-card__head">
                      <h2 id="foa-growth">{t.person} Growth</h2>
                      {typeof c?.newMembers === "number" && (
                        <span className="fo-badge fo-badge--ok">
                          +{c.newMembers.toLocaleString()} new in {RANGES.find((r) => r.value === range)?.label.toLowerCase().replace("last ", "the last ")}
                        </span>
                      )}
                    </div>
                    {data.growth ? (
                      <LineChart label={`${t.people} over time`} points={data.growth.points.map((pt) => ({ x: pointLabel(pt.date), y: pt.total }))} />
                    ) : (
                      <p className="fo-muted">You don't have permission to view member figures.</p>
                    )}
                  </section>

                  <section className="fo-card" aria-labelledby="foa-quick">
                    <div className="fo-card__head">
                      <h2 id="foa-quick">Quick Actions</h2>
                    </div>
                    {quick.length === 0 ? (
                      <p className="fo-muted">Ask the owner for permissions to manage this organization.</p>
                    ) : (
                      <div className="fo-quick">
                        {quick.map((q) => (
                          <Link key={q.label} to={q.to} className="fo-quick__btn">
                            <q.icon aria-hidden="true" /> {q.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </section>

                  {att && (
                    <section className="fo-card foa-grid__wide" aria-labelledby="foa-att">
                      <div className="fo-card__head">
                        <h2 id="foa-att">Attendance</h2>
                        <Link to={p("/attendance")} className="fo-btn fo-btn--ghost fo-btn--sm">
                          Open attendance
                        </Link>
                      </div>
                      <div className="foa-attstats">
                        <div>
                          <strong>{att.checkIns.toLocaleString()}</strong>
                          <span>Check-ins</span>
                          {attTrend !== null && <em className={attTrend < 0 ? "is-down" : ""}>{attTrend > 0 ? "+" : ""}{attTrend}% vs previous period</em>}
                        </div>
                        <div>
                          <strong>{att.membersPresent.toLocaleString()}</strong>
                          <span>{t.people} present</span>
                        </div>
                        <div>
                          <strong>{att.participationRate === null ? "—" : `${att.participationRate}%`}</strong>
                          <span>Participation</span>
                        </div>
                        <div>
                          <strong>{att.absences.toLocaleString()}</strong>
                          <span>Absence reports</span>
                        </div>
                      </div>
                      {att.byWeek.length > 0 ? (
                        <BarChart label="Check-ins per week" bars={att.byWeek.map((w) => ({ x: formatDate(w.weekStart, { month: "short", day: "numeric" }), y: w.checkIns }))} />
                      ) : (
                        <p className="fo-muted">No check-ins recorded in this period.</p>
                      )}
                    </section>
                  )}

                  {data.recentActivity && (
                    <section className="fo-card" aria-labelledby="foa-act">
                      <div className="fo-card__head">
                        <h2 id="foa-act">Recent Activity</h2>
                      </div>
                      {data.recentActivity.length === 0 ? (
                        <EmptyState icon={CircleCheck} title="No activity yet" text={`New ${t.people.toLowerCase()} and changes will show up here.`} />
                      ) : (
                        <ul className="foa-activity">
                          {data.recentActivity.map((a, i) => (
                            <li key={a.memberId + a.at + i}>
                              <Avatar name={a.name} url={a.avatarUrl} size="sm" />
                              <div>
                                <Link to={p(`/members/${encodeURIComponent(a.memberId)}`)}>{a.name}</Link>
                                <span>{describe(a, t.person)}</span>
                                <small>{formatDateTime(a.at)}</small>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  )}

                  {data.upcomingEvents && (
                    <section className="fo-card foa-grid__wide" aria-labelledby="foa-ev">
                      <div className="fo-card__head">
                        <h2 id="foa-ev">Upcoming Events</h2>
                        <Link to={p("/admin/events")} className="fo-btn fo-btn--ghost fo-btn--sm">
                          Manage events
                        </Link>
                      </div>
                      {data.upcomingEvents.length === 0 ? (
                        <EmptyState icon={CalendarDays} title="Nothing scheduled" text="Create an event to fill your calendar.">
                          {can("manage_events") && (
                            <Link to={p("/admin/events")} className="fo-btn fo-btn--primary fo-btn--sm">
                              Create Event
                            </Link>
                          )}
                        </EmptyState>
                      ) : (
                        <ul className="foa-events">
                          {data.upcomingEvents.map((e) => {
                            const d = e.startsAt ? new Date(e.startsAt) : null;
                            return (
                              <li key={e.id}>
                                <span className="foa-events__date">
                                  <small>{d ? d.toLocaleDateString(undefined, { month: "short" }).toUpperCase() : ""}</small>
                                  <b>{d ? d.getDate() : "—"}</b>
                                </span>
                                <span>
                                  <strong>{e.title}</strong>
                                  <small>
                                    {d ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : ""}
                                    {e.location ? ` · ${e.location}` : ""}
                                  </small>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>
                  )}
                </div>
                <p className="foa-updated">Updated {formatDateTime(data.generatedAt)}</p>
              </>
            ) : null}
          </>
        );
      }}
    </AdminGate>
  );
}
