/**
 * OrganizationMemberPortalPage.tsx
 * -----------------------------------------------------------------------------
 * /organization/me (also /organization/member, /organization/member-portal,
 * /church/me…) — the member portal ("My Church", "My Company", "My Club"…)
 * from the reference design.
 *
 *   - every organization the person belongs to (GET /organizations?mine=true)
 *     with a switcher; ?organizationId= picks one
 *   - welcome banner, membership / groups / events / attendance cards,
 *     next event and recent activity — all from the person's own records
 *     (GET /organizations/:id/members/me/history) and the org's events
 *   - requests still waiting for approval
 * Only the signed-in person's own information is shown.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CircleCheck,
  ClipboardCheck,
  Clock,
  IdCard,
  LogIn,
  MapPin,
  Plus,
  UsersRound,
} from "lucide-react";

import { getOrganizationEvents } from "../../events/services/eventsApi";
import type { FockisEvent } from "../../events/types/event.types";
import { listOrganizations } from "../api/organizationsApi";
import { membersApi } from "../api/membersApi";
import { ChurchAuthError } from "../api/organizationApi";
import { memberHistoryApi, type MemberHistory } from "../api/visitsApi";
import { mediaUrl } from "../api/dashboardApi";
import { MEMBER_ROLE_LABELS, MembershipStatus, type MemberRole, type OrganizationSummary } from "../types/organization.types";
import { typeLabel } from "../ui/orgCategories";
import OrgAppShell from "../ui/OrgAppShell";
import { categoryInfo, termsFor } from "../ui/orgTerminology";
import { Alert, Avatar, EmptyState, Skeleton, StatCard, errorMessage, formatDate, formatDateTime } from "../ui/orgUi";
import "../styles/OrganizationMemberScreens.scss";

type Membership = Awaited<ReturnType<typeof membersApi.getMyMembership>>;
type Row = { org: OrganizationSummary; membership: NonNullable<Membership> | null };

interface ActivityItem {
  at: string;
  title: string;
  icon: "check" | "clock" | "role";
}

function activityFrom(h: MemberHistory | null, terms: ReturnType<typeof termsFor>): ActivityItem[] {
  if (!h?.membership) return [];
  const list: ActivityItem[] = [];
  for (const a of h.attendance.slice(0, 10)) {
    list.push({
      at: a.occurredAt,
      title: a.kind === "check_in" ? `Attended ${a.eventTitle || "an event"}` : `Reported an absence${a.eventTitle ? ` — ${a.eventTitle}` : ""}`,
      icon: a.kind === "check_in" ? "check" : "clock",
    });
  }
  for (const e of h.membership.history) {
    const title =
      e.note === "requested"
        ? "Applied for membership"
        : e.status === "active"
          ? "Membership approved"
          : e.status === "inactive"
            ? "Membership suspended"
            : e.role
              ? `Role: ${MEMBER_ROLE_LABELS[e.role as MemberRole] ?? e.role.replace(/_/g, " ")}`
              : `${terms.person} record updated`;
    list.push({ at: e.at, title, icon: e.role && !e.status ? "role" : "check" });
  }
  return list.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 5);
}

export default function OrganizationMemberPortalPage(): React.JSX.Element {
  const [params, setParams] = useSearchParams();
  const requested = params.get("organizationId") ?? "";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [history, setHistory] = useState<MemberHistory | null>(null);
  const [events, setEvents] = useState<FockisEvent[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await listOrganizations({ mine: true, page: 1, pageSize: 50 }, controller.signal);
        const orgs = Array.isArray(res?.items) ? res.items : [];
        const found = await Promise.all(
          orgs.map(async (org) => {
            try {
              return { org, membership: (await membersApi.getMyMembership(org.id, controller.signal)) ?? null };
            } catch {
              return { org, membership: null };
            }
          }),
        );
        if (!controller.signal.aborted) setRows(found);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof ChurchAuthError) setSignedOut(true);
        else setError(errorMessage(err, "Your organizations could not be loaded."));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const active = useMemo(() => rows.filter((r) => r.membership?.status === MembershipStatus.Active || r.membership?.isOwner), [rows]);
  const pending = rows.filter((r) => r.membership?.status === MembershipStatus.Pending && !r.membership?.isOwner);
  const current = useMemo(() => active.find((r) => r.org.id === requested) ?? active[0] ?? null, [active, requested]);
  const orgId = current?.org.id ?? "";

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setDetailLoading(true);
    setHistory(null);
    setEvents([]);
    Promise.allSettled([memberHistoryApi.mine(orgId), getOrganizationEvents(orgId)]).then(([h, ev]) => {
      if (cancelled) return;
      if (h.status === "fulfilled") setHistory(h.value);
      if (ev.status === "fulfilled") {
        setEvents(
          (Array.isArray(ev.value) ? ev.value : [])
            .filter((e) => new Date(e.endDate || e.startDate).getTime() >= Date.now() - 2 * 3600_000)
            .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate)),
        );
      }
      setDetailLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const pick = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("organizationId", id);
    setParams(next, { replace: true });
  };

  if (signedOut) {
    return (
      <OrgAppShell variant="platform">
        <div className="fo-card">
          <EmptyState icon={LogIn} title="Sign in to see your organizations" text="Your churches, teams, clubs and groups will appear here.">
            <Link to={"/login?returnTo=" + encodeURIComponent("/organization/me")} className="fo-btn fo-btn--primary">
              Sign in
            </Link>
            <Link to="/organizations/discover" className="fo-btn fo-btn--secondary">
              Browse organizations
            </Link>
          </EmptyState>
        </div>
      </OrgAppShell>
    );
  }

  const org = current?.org ?? null;
  const m = current?.membership ?? null;
  const t = termsFor(org?.organizationType);
  const cat = categoryInfo(org?.organizationType);
  const isOwner = Boolean(m?.isOwner);
  const isAdmin = Boolean(isOwner || m?.isAdmin);
  const p = (s = "") => (org ? `/organizations/${encodeURIComponent(org.id)}${s}` : "/organizations");
  const name = m?.profile?.displayName ?? "";
  const nextEvent = events[0] ?? null;
  const activity = activityFrom(history, t);
  const joined = history?.membership?.joinedAt ?? m?.joinedAt ?? null;

  return (
    <OrgAppShell
      variant={org ? "member" : "platform"}
      organization={org ? { id: org.id, name: org.name, organizationType: org.organizationType, logoUrl: org.logoUrl } : null}
      organizations={active.map((r) => ({ id: r.org.id, name: r.org.name, organizationType: r.org.organizationType, logoUrl: r.org.logoUrl }))}
      onSelectOrganization={pick}
      viewer={m ? { name, avatarUrl: m.profile?.avatarUrl, memberId: m.id, isAdmin } : undefined}
    >
      {error && <Alert>{error}</Alert>}

      {loading ? (
        <>
          <Skeleton height={170} style={{ marginBottom: 20 }} />
          <div className="fo-stats">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={120} />
            ))}
          </div>
        </>
      ) : !org ? (
        <div className="fo-card">
          <EmptyState icon={Building2} title="You're not in any organization yet" text="Find your church, team, club or community and ask to join — or create your own.">
            <Link to="/organizations/discover" className="fo-btn fo-btn--primary">
              Find an organization
            </Link>
            <Link to="/organizations/new" className="fo-btn fo-btn--secondary">
              <Plus aria-hidden="true" /> Create an organization
            </Link>
          </EmptyState>
        </div>
      ) : (
        <>
          <section className="fom-welcome">
            <div className="fom-welcome__art" aria-hidden="true">
              <cat.icon />
            </div>
            <Avatar name={name} url={m?.profile?.avatarUrl} size="lg" />
            <div className="fom-welcome__text">
              <h1>Welcome{name ? `, ${name}` : ""}</h1>
              <p>
                {isOwner ? "Owner" : (MEMBER_ROLE_LABELS[m?.role as MemberRole] ?? t.person)}
                {joined ? ` · ${t.person} since ${formatDate(joined, { month: "short", day: "numeric", year: "numeric" })}` : ""}
              </p>
              {m?.domain && <span className="fom-welcome__domain">{m.domain}</span>}
            </div>
          </section>

          <div className="fo-stats">
            <StatCard icon={IdCard} value={<span className="fo-badge fo-badge--ok">{isOwner ? "Owner" : "Active"}</span>} label="My Membership" to={p("/my-badge")} />
            <StatCard
              icon={UsersRound}
              tone="violet"
              value={detailLoading ? "…" : `${history?.groups.length ?? 0}`}
              label={`My ${t.groups}`}
              to={p("/groups")}
            />
            <StatCard icon={CalendarDays} tone="pink" value={detailLoading ? "…" : `${events.length}`} label="Upcoming Events" to={p("/events")} />
            <StatCard
              icon={ClipboardCheck}
              tone="green"
              value={detailLoading ? "…" : `${history?.attendanceSummary.checkIns ?? 0}`}
              label="My Attendance"
              to={p("/my-history")}
            />
          </div>

          <div className="fom-grid">
            <section className="fo-card" aria-labelledby="fom-next">
              <div className="fo-card__head">
                <h2 id="fom-next">Next Event</h2>
                <Link to={p("/events")} className="fo-btn fo-btn--ghost fo-btn--sm">
                  All events
                </Link>
              </div>
              {detailLoading ? (
                <Skeleton height={110} />
              ) : nextEvent ? (
                <div className="fom-next">
                  <span className="fom-next__img" style={nextEvent.coverImageUrl ? { backgroundImage: `url("${mediaUrl(nextEvent.coverImageUrl)}")` } : undefined}>
                    {!nextEvent.coverImageUrl && <CalendarDays aria-hidden="true" />}
                  </span>
                  <div>
                    <strong>{nextEvent.title}</strong>
                    <span>
                      <Clock aria-hidden="true" /> {formatDateTime(nextEvent.startDate)}
                    </span>
                    {(nextEvent.locationName || nextEvent.isOnline) && (
                      <span>
                        <MapPin aria-hidden="true" /> {nextEvent.isOnline ? "Online" : nextEvent.locationName}
                      </span>
                    )}
                    <Link to={`/events/${encodeURIComponent(nextEvent.id)}`} className="fo-btn fo-btn--secondary fo-btn--sm">
                      View Details
                    </Link>
                  </div>
                </div>
              ) : (
                <EmptyState icon={CalendarDays} title="No upcoming events" text="New events will show up here." />
              )}
            </section>

            <section className="fo-card" aria-labelledby="fom-act">
              <div className="fo-card__head">
                <h2 id="fom-act">Recent Activity</h2>
                <Link to={p("/my-history")} className="fo-btn fo-btn--ghost fo-btn--sm">
                  My history
                </Link>
              </div>
              {detailLoading ? (
                <Skeleton height={110} />
              ) : activity.length === 0 ? (
                <EmptyState icon={CircleCheck} title="Nothing yet" text="Your check-ins and membership changes will appear here." />
              ) : (
                <ul className="fo-activity">
                  {activity.map((a, i) => (
                    <li key={a.at + i}>
                      <span className="fo-activity__icon">{a.icon === "clock" ? <Clock aria-hidden="true" /> : <CircleCheck aria-hidden="true" />}</span>
                      <div>
                        <strong>{a.title}</strong>
                        <span>{formatDate(a.at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {(history?.departments.length ?? 0) + (history?.groups.length ?? 0) > 0 && (
              <section className="fo-card fom-grid__full" aria-labelledby="fom-where">
                <div className="fo-card__head">
                  <h2 id="fom-where">Where I belong</h2>
                </div>
                <div className="fom-chips">
                  {history?.departments.map((d) => (
                    <Link key={d.id} to={p("/departments")} className="fom-chip">
                      {t.department}: {d.name}
                    </Link>
                  ))}
                  {history?.groups.map((g) => (
                    <Link key={g.id} to={p("/groups")} className="fom-chip fom-chip--violet">
                      {g.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {active.length > 1 && (
            <section className="fom-others" aria-labelledby="fom-others">
              <h2 id="fom-others">My other organizations</h2>
              <div className="fom-others__list">
                {active
                  .filter((r) => r.org.id !== org.id)
                  .map((r) => (
                    <button key={r.org.id} type="button" className="fom-orgbtn" onClick={() => pick(r.org.id)}>
                      <strong>{r.org.name}</strong>
                      <span>{typeLabel(r.org.organizationType)}</span>
                      <ArrowRight aria-hidden="true" />
                    </button>
                  ))}
              </div>
            </section>
          )}
        </>
      )}

      {!loading && pending.length > 0 && (
        <section className="fo-card fom-pending" aria-labelledby="fom-pending">
          <h2 id="fom-pending">Waiting for approval</h2>
          <ul>
            {pending.map((r) => (
              <li key={r.org.id}>
                <Link to={`/organizations/${encodeURIComponent(r.org.id)}`}>
                  <strong>{r.org.name}</strong>
                </Link>
                <span>
                  {typeLabel(r.org.organizationType)} · request sent{r.membership?.createdAt ? ` ${formatDate(r.membership.createdAt)}` : ""}
                </span>
                <span className="fo-badge fo-badge--warn">Pending</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </OrgAppShell>
  );
}
