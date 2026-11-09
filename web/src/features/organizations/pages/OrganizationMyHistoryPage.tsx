/**
 * OrganizationMyHistoryPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/my-history — "Member Profile & History" from
 * the reference design: profile card on the left (photo, name, status,
 * membership card), tabbed record on the right:
 *
 *   History     membership timeline (application, approval, role changes,
 *               joined groups and departments, attended events)
 *   Membership  number, status, role, join date, Fockis address
 *   Groups      groups and departments
 *   Attendance  check-ins and absence reports
 *   Visits      visit requests (cancel while still open)
 *
 * Data: GET /organizations/:id/members/me/history (the person's own records
 * only). The history is append-only on the server, so it cannot be silently
 * rewritten.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarCheck,
  CircleCheck,
  ClipboardCheck,
  Clock,
  FileText,
  History,
  IdCard,
  Network,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import { getOrganization } from "../api/organizationsApi";
import { membersApi, type MyMembershipResponse } from "../api/membersApi";
import { ChurchAuthError } from "../api/organizationApi";
import { VISIT_STATUS_LABELS, memberHistoryApi, visitsApi, type MemberHistory } from "../api/visitsApi";
import { MEMBER_ROLE_LABELS, type MemberRole, type Organization } from "../types/organization.types";
import OrgAppShell from "../ui/OrgAppShell";
import { termsFor } from "../ui/orgTerminology";
import { Alert, Avatar, EmptyState, Skeleton, StatusBadge, errorMessage, formatDate } from "../ui/orgUi";
import "../styles/OrganizationMemberScreens.scss";

type Tab = "history" | "membership" | "groups" | "attendance" | "visits";

type TimelineEntry = { at: string; title: string; text: string; tone: "ok" | "info" | "warn" | "muted"; icon: typeof CircleCheck };

const roleName = (r?: string | null) => (r ? (MEMBER_ROLE_LABELS[r as MemberRole] ?? r.replace(/_/g, " ")) : "");

function visitDay(value: string): string {
  return new Date(value + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function buildTimeline(data: MemberHistory, terms: ReturnType<typeof termsFor>): TimelineEntry[] {
  const m = data.membership;
  if (!m) return [];
  const list: TimelineEntry[] = [];
  for (const h of m.history) {
    if (h.note === "requested") {
      list.push({ at: h.at, title: "Membership Application", text: "You submitted a membership application.", tone: "info", icon: FileText });
    } else if (h.note === "joined") {
      list.push({ at: h.at, title: `Joined ${data.organization.name}`, text: `You became a ${terms.person.toLowerCase()}.`, tone: "ok", icon: CircleCheck });
    } else if (h.status === "active") {
      list.push({ at: h.at, title: "Membership Approved", text: "Your membership was approved.", tone: "ok", icon: CircleCheck });
    } else if (h.status === "inactive") {
      list.push({ at: h.at, title: "Membership Suspended", text: "Your membership was set to inactive.", tone: "warn", icon: Clock });
    } else if (h.status === "archived") {
      list.push({ at: h.at, title: "Membership Archived", text: "This membership was archived.", tone: "muted", icon: Clock });
    } else if (h.role) {
      list.push({ at: h.at, title: "Role Updated", text: `Your role is now ${roleName(h.role)}.`, tone: "info", icon: ShieldCheck });
    } else if (h.status) {
      list.push({ at: h.at, title: "Status Updated", text: `Status: ${h.status}.`, tone: "muted", icon: History });
    }
  }
  for (const a of data.attendance) {
    if (a.kind !== "check_in") continue;
    list.push({ at: a.occurredAt, title: `Attended ${a.eventTitle || "an event"}`, text: "Check-in recorded.", tone: "info", icon: CalendarCheck });
  }
  return list.sort((a, b) => +new Date(b.at) - +new Date(a.at));
}

export default function OrganizationMyHistoryPage(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<MemberHistory | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [me, setMe] = useState<MyMembershipResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("history");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([memberHistoryApi.mine(organizationId), getOrganization(organizationId).catch(() => null), membersApi.getMyMembership(organizationId).catch(() => null)])
      .then(([h, o, m]) => {
        if (cancelled) return;
        setData(h);
        setOrg(o);
        setMe(m ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ChurchAuthError) {
          navigate("/login?returnTo=" + encodeURIComponent(`/organizations/${organizationId}/my-history`), { replace: true });
          return;
        }
        setError(errorMessage(err, "Your history could not be loaded."));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [organizationId, navigate]);

  async function cancelVisit(id: string) {
    setCancelling(id);
    try {
      const updated = await visitsApi.cancelMine(id);
      setData((d) => (d ? { ...d, visits: d.visits.map((v) => (v.id === id ? { ...v, ...updated } : v)) } : d));
    } catch (err) {
      setError(errorMessage(err, "The visit could not be cancelled."));
    } finally {
      setCancelling(null);
    }
  }

  const p = (s = "") => `/organizations/${encodeURIComponent(organizationId)}${s}`;
  const type = org?.organizationType ?? data?.organization.organizationType ?? null;
  const t = termsFor(type);
  const m = data?.membership ?? null;
  const name = me?.profile?.displayName ?? "";
  const timeline = data ? buildTimeline(data, t) : [];
  const shown = showAll ? timeline : timeline.slice(0, 8);
  const shellOrg = data || org ? { id: organizationId, name: org?.name ?? data?.organization.name ?? "", organizationType: type, logoUrl: org?.logoUrl } : null;

  const tabs: { id: Tab; label: string; icon: typeof History }[] = [
    { id: "history", label: "History", icon: History },
    { id: "membership", label: "Membership", icon: IdCard },
    { id: "groups", label: `${t.groups} & ${t.departments}`, icon: UsersRound },
    { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    { id: "visits", label: "Visits", icon: CalendarCheck },
  ];

  return (
    <OrgAppShell variant="member" organization={shellOrg} viewer={me ? { name, avatarUrl: me.profile?.avatarUrl, memberId: me.id, isAdmin: Boolean(me.isOwner || me.isAdmin) } : undefined}>
      <nav className="fo-crumbs" aria-label="Breadcrumb">
        <Link to={`/organization/me?organizationId=${encodeURIComponent(organizationId)}`}>
          <ArrowLeft aria-hidden="true" /> {t.myOrg}
        </Link>
        <span aria-hidden="true">›</span>
        <strong>My Profile</strong>
      </nav>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <div className="foh">
          <Skeleton height={420} />
          <Skeleton height={420} />
        </div>
      ) : !data ? null : !m ? (
        <div className="fo-card">
          <EmptyState icon={UserRound} title={`You are not a ${t.person.toLowerCase()} of ${data.organization.name}`} text="Ask to join and your history will start here.">
            <Link to={p("/join")} className="fo-btn fo-btn--primary">
              Ask to join
            </Link>
          </EmptyState>
        </div>
      ) : (
        <div className="foh">
          <aside className="fo-card foh-profile">
            <Avatar name={name} url={me?.profile?.avatarUrl} size="xl" />
            <h1>{name || t.person}</h1>
            <StatusBadge status={m.status} />
            <dl className="foh-profile__facts">
              <div>
                <dt>{t.person} number</dt>
                <dd>{m.id.slice(-8).toUpperCase()}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{me?.isOwner ? "Owner" : roleName(m.role)}</dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd>{m.joinedAt ? formatDate(m.joinedAt) : "Not yet"}</dd>
              </div>
            </dl>
            <Link to={p("/my-badge")} className="fo-btn fo-btn--primary fo-btn--block">
              <IdCard aria-hidden="true" /> My Membership Card
            </Link>
            <nav className="foh-tabs" aria-label="My record">
              {tabs.map((x) => (
                <button key={x.id} type="button" className={"fo-nav__link" + (tab === x.id ? " is-active" : "")} aria-pressed={tab === x.id} onClick={() => setTab(x.id)}>
                  <x.icon aria-hidden="true" /> {x.label}
                </button>
              ))}
              <Link to={p(`/members/${encodeURIComponent(m.id)}`)} className="fo-nav__link">
                <UserRound aria-hidden="true" /> Public profile
              </Link>
              <Link to={p("/media")} className="fo-nav__link">
                <FileText aria-hidden="true" /> Documents
              </Link>
            </nav>
          </aside>

          <section className="fo-card foh-main" aria-live="polite">
            {tab === "history" && (
              <>
                <div className="fo-card__head">
                  <h2>Membership History</h2>
                  <span className="fo-muted" style={{ fontSize: 13 }}>
                    {timeline.length} event{timeline.length === 1 ? "" : "s"}
                  </span>
                </div>
                {timeline.length === 0 ? (
                  <EmptyState icon={History} title="No history yet" />
                ) : (
                  <>
                    <ol className="fo-timeline">
                      {shown.map((e, i) => (
                        <li key={e.at + i} className="fo-timeline__item">
                          <span className={"fo-timeline__icon" + (e.tone === "info" ? "" : ` fo-timeline__icon--${e.tone}`)}>
                            <e.icon aria-hidden="true" />
                          </span>
                          <div>
                            <div className="fo-timeline__title">{e.title}</div>
                            <div className="fo-timeline__date">{formatDate(e.at, { month: "short", day: "numeric", year: "numeric" })}</div>
                            <div className="fo-timeline__text">{e.text}</div>
                          </div>
                        </li>
                      ))}
                    </ol>
                    {timeline.length > shown.length && (
                      <button type="button" className="fo-btn fo-btn--ghost" onClick={() => setShowAll(true)}>
                        Show all {timeline.length} events
                      </button>
                    )}
                  </>
                )}
                <p className="foh-note">
                  <ShieldCheck aria-hidden="true" /> This history is kept as a permanent record and can only be added to.
                </p>
              </>
            )}

            {tab === "membership" && (
              <>
                <div className="fo-card__head">
                  <h2>Membership</h2>
                </div>
                <dl className="foh-kv">
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <StatusBadge status={m.status} />
                    </dd>
                  </div>
                  <div>
                    <dt>Role</dt>
                    <dd>{me?.isOwner ? "Owner" : roleName(m.role)}</dd>
                  </div>
                  <div>
                    <dt>Applied</dt>
                    <dd>{formatDate(m.requestedAt) || "—"}</dd>
                  </div>
                  <div>
                    <dt>Joined</dt>
                    <dd>{formatDate(m.joinedAt) || "—"}</dd>
                  </div>
                  <div>
                    <dt>{t.person} number</dt>
                    <dd>{m.id.slice(-8).toUpperCase()}</dd>
                  </div>
                  <div>
                    <dt>Fockis address</dt>
                    <dd>{m.domain || "—"}</dd>
                  </div>
                </dl>
              </>
            )}

            {tab === "groups" && (
              <>
                <div className="fo-card__head">
                  <h2>
                    {t.groups} &amp; {t.departments}
                  </h2>
                </div>
                {data.departments.length + data.groups.length === 0 ? (
                  <EmptyState icon={UsersRound} title={`Not in any ${t.groups.toLowerCase()} yet`}>
                    <Link to={p("/groups")} className="fo-btn fo-btn--primary fo-btn--sm">
                      Browse {t.groups.toLowerCase()}
                    </Link>
                  </EmptyState>
                ) : (
                  <ul className="foh-list">
                    {data.departments.map((d) => (
                      <li key={d.id}>
                        <Network aria-hidden="true" />
                        <Link to={p("/departments")}>{d.name}</Link>
                        <span className="fo-badge">{t.department}</span>
                      </li>
                    ))}
                    {data.groups.map((g) => (
                      <li key={g.id}>
                        <UsersRound aria-hidden="true" />
                        <Link to={p("/groups")}>{g.name}</Link>
                        <span className="fo-badge fo-badge--violet">Group</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {tab === "attendance" && (
              <>
                <div className="fo-card__head">
                  <h2>Attendance</h2>
                  <Link to={p("/attendance")} className="fo-btn fo-btn--ghost fo-btn--sm">
                    Check in / report absence
                  </Link>
                </div>
                <div className="foh-summary">
                  <div>
                    <strong>{data.attendanceSummary.checkIns}</strong>
                    <span>Check-ins</span>
                  </div>
                  <div>
                    <strong>{data.attendanceSummary.absences}</strong>
                    <span>Absences reported</span>
                  </div>
                  <div>
                    <strong>{data.attendanceSummary.lastCheckIn ? formatDate(data.attendanceSummary.lastCheckIn) : "—"}</strong>
                    <span>Last check-in</span>
                  </div>
                </div>
                {data.attendance.length === 0 ? (
                  <p className="fo-muted">No attendance records yet.</p>
                ) : (
                  <ul className="foh-list">
                    {data.attendance.map((a) => (
                      <li key={a.id}>
                        {a.kind === "check_in" ? <CircleCheck aria-hidden="true" /> : <Clock aria-hidden="true" />}
                        <span>
                          <strong>{a.eventTitle || "Event"}</strong>
                          <small>
                            {formatDate(a.occurredAt)}
                            {a.note ? ` · ${a.note}` : ""}
                          </small>
                        </span>
                        <span className={"fo-badge" + (a.kind === "check_in" ? " fo-badge--ok" : " fo-badge--warn")}>
                          {a.kind === "check_in" ? "Present" : "Absent"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {tab === "visits" && (
              <>
                <div className="fo-card__head">
                  <h2>My visit requests</h2>
                  <Link to={p("/visit")} className="fo-btn fo-btn--ghost fo-btn--sm">
                    Plan a visit
                  </Link>
                </div>
                {data.visits.length === 0 ? (
                  <p className="fo-muted">None yet.</p>
                ) : (
                  <ul className="foh-list">
                    {data.visits.map((v) => (
                      <li key={v.id}>
                        <CalendarCheck aria-hidden="true" />
                        <span>
                          <strong>{visitDay(v.visitDate)}</strong>
                          <small>
                            {v.visitTime || "Any time"} · {v.branchName || data.organization.name}
                          </small>
                        </span>
                        <span className="fo-badge">{VISIT_STATUS_LABELS[v.status]}</span>
                        {["new", "contacted", "scheduled"].includes(v.status) && (
                          <button type="button" className="fo-btn fo-btn--secondary fo-btn--sm" disabled={cancelling === v.id} onClick={() => cancelVisit(v.id)}>
                            Cancel
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </OrgAppShell>
  );
}
