/**
 * OrganizationMemberPortalPage.tsx
 * -----------------------------------------------------------------------------
 * /organization/me (also /organization/member, /organization/member-portal,
 * /church/me) — "My organizations".
 *
 *   - Lists every organization the person created or belongs to
 *     (GET /organizations?mine=true), with their membership in each.
 *   - ?organizationId= picks which one is open; otherwise the first
 *     active membership.
 *   - Shows requests still waiting for approval.
 *   - One set of links for the open organization (no duplicates), plus
 *     admin shortcuts for owners and admins.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { listOrganizations } from "../api/organizationsApi";
import { membersApi } from "../api/membersApi";
import { ChurchAuthError } from "../api/organizationApi";
import {
  MEMBER_ROLE_LABELS,
  MembershipStatus,
  type OrganizationSummary,
} from "../types/organization.types";
import { CATEGORY_ICONS, getCategoryForOrganizationType, typeLabel, wordingFor } from "../ui/orgCategories";
import { Empty, ErrorNote, Loading, OrgLogo, OrgShell, PageHead, Section, Tile, errorText, orgPath } from "../ui/OrgShell";

type Membership = Awaited<ReturnType<typeof membersApi.getMyMembership>>;
type Row = { org: OrganizationSummary; membership: NonNullable<Membership> | null };

function day(value?: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "";
}

export default function OrganizationMemberPortalPage(): React.JSX.Element {
  const [params, setParams] = useSearchParams();
  const requested = params.get("organizationId") ?? "";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);

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
        else setError(errorText(err, "Your organizations could not be loaded."));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const active = rows.filter((r) => r.membership?.status === MembershipStatus.Active || r.membership?.isOwner);
  const pending = rows.filter((r) => r.membership?.status === MembershipStatus.Pending && !r.membership?.isOwner);

  const current = useMemo(
    () => active.find((r) => r.org.id === requested) ?? active[0] ?? null,
    [active, requested],
  );

  const pick = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("organizationId", id);
    setParams(next, { replace: true });
  };

  if (signedOut) {
    return (
      <OrgShell narrow>
        <Empty title="Sign in to see your organizations" text="Your churches, schools, teams and groups will appear here.">
          <Link to={"/login?returnTo=" + encodeURIComponent("/organization/me")} className="fko-btn fko-btn--primary">
            Sign in
          </Link>
          <Link to="/organizations" className="fko-btn fko-btn--secondary">
            Browse organizations
          </Link>
        </Empty>
      </OrgShell>
    );
  }

  const org = current?.org;
  const m = current?.membership ?? null;
  const w = wordingFor(org?.organizationType);
  const isOwner = Boolean(m?.isOwner || String(m?.role ?? "").toLowerCase() === "owner");
  const isAdmin = Boolean(isOwner || m?.isAdmin);
  const p = (s = "") => (org ? orgPath(org.id, s) : "/organizations");

  return (
    <OrgShell organizationId={org?.id} organizationName={org?.name} sidebar={false}>
      <PageHead
        eyebrow="Member portal"
        title="My organizations"
        subtitle="Everything for the organizations you belong to: groups, events, announcements and your history."
        actions={
          <>
            <Link to="/organizations" className="fko-btn fko-btn--secondary">
              Find organizations
            </Link>
            <Link to="/organizations/new" className="fko-btn fko-btn--primary">
              + Create an organization
            </Link>
          </>
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      {loading ? (
        <Loading rows={3} />
      ) : active.length === 0 ? (
        <Empty
          title="You're not in any organization yet"
          text="Find your church, school, team or club and ask to join, or open an account for your own organization."
        >
          <Link to="/organizations" className="fko-btn fko-btn--primary">
            Find an organization
          </Link>
          <Link to="/organizations/new" className="fko-btn fko-btn--secondary">
            Create an organization
          </Link>
        </Empty>
      ) : (
        <>
          {active.length > 1 && (
            <div className="fko-chiprow" role="tablist" aria-label="Your organizations">
              {active.map((r) => (
                <button
                  key={r.org.id}
                  type="button"
                  role="tab"
                  aria-selected={r.org.id === org?.id}
                  className={"fko-tab" + (r.org.id === org?.id ? " is-active" : "")}
                  onClick={() => pick(r.org.id)}
                >
                  <span aria-hidden="true">{CATEGORY_ICONS[getCategoryForOrganizationType(r.org.organizationType)]}</span> {r.org.name}
                </button>
              ))}
            </div>
          )}

          {org && (
            <section className="fko-hero">
              {org.logoUrl ? (
                <OrgLogo name={org.name} url={org.logoUrl} className="fko-hero__logo" />
              ) : (
                <span className="fko-hero__logo" aria-hidden="true">
                  {CATEGORY_ICONS[w.category]}
                </span>
              )}
              <div className="fko-hero__text">
                <span className="fko-eyebrow">{typeLabel(org.organizationType)}</span>
                <h2 className="fko-title">{org.name}</h2>
                <div className="fko-hero__meta">
                  <span className="fko-badge fko-badge--ok">
                    {isOwner ? "Owner" : MEMBER_ROLE_LABELS[m?.role as keyof typeof MEMBER_ROLE_LABELS] ?? "Member"}
                  </span>
                  {m?.joinedAt && <span>Member since {day(m.joinedAt)}</span>}
                  {m?.domain && <span>{m.domain}</span>}
                </div>
              </div>
              <div className="fko-hero__actions">
                <Link to={p()} className="fko-btn fko-btn--primary">
                  Open page
                </Link>
                {isAdmin && (
                  <Link to={p("/admin")} className="fko-btn fko-btn--secondary">
                    👑 Admin
                  </Link>
                )}
              </div>
            </section>
          )}

          <Section title="Take part">
            <div className="fko-tiles">
              <Tile to={p("/events")} icon="📅" title="Events" text="Upcoming services, meetings and activities." />
              <Tile to={p("/groups")} icon="👥" title="Groups" text="Join groups, teams and classes." />
              <Tile to={p("/departments")} icon="🏢" title={w.isFaith ? "Ministries" : "Departments"} text="Departments and teams you can serve in." />
              <Tile to={p("/communication")} icon="📣" title="Announcements" text="News and messages from leaders." />
              <Tile to={p("/live")} icon="🔴" title="Live" text="Watch live and past broadcasts." />
              <Tile to={p("/media")} icon="🎞️" title="Media" text="Videos, photos, documents and resources." />
            </div>
          </Section>

          <Section title="Me">
            <div className="fko-tiles">
              <Tile to={p("/my-badge")} icon="🪪" title="My badge" text="Your member ID with QR code. Show it, scan it or print it." />
              <Tile to={p("/my-history")} icon="🕘" title="My history" text="When you joined, your role, groups, attendance and visits." />
              <Tile to={p("/attendance")} icon="✅" title="Attendance" text="Check in and report an absence." />
              {m?.id && <Tile to={p(`/members/${encodeURIComponent(m.id)}`)} icon="👤" title="My member profile" text="What other members see about you." />}
              <Tile to={`/member/settings?organizationId=${encodeURIComponent(org?.id ?? "")}`} icon="⚙️" title="Member settings" text="Notifications, privacy and contact details." />
              <Tile to={p("/members")} icon="📇" title="Member directory" text="Find other members." />
              <Tile to={p("/visit")} icon="📍" title={w.visitTitle} text="Bring a friend or plan a visit." />
            </div>
          </Section>

          {isAdmin && (
            <Section title="Administration">
              <div className="fko-tiles">
                <Tile to={p("/admin")} icon="👑" title="Admin dashboard" text="Everything you manage in one place." />
                <Tile to={p("/admin/members")} icon="👥" title="Members & requests" text="Approve requests, share the join link, manage roles." />
                <Tile to={p("/admin/visits")} icon="📅" title="Visit requests" text="People who want to visit." />
                <Tile to={p("/admin/badges")} icon="🪪" title="Member badges" text="Badge template and printing." />
                <Tile to={p("/admin/settings")} icon="⚙️" title="Settings" text="Profile, approval rules and visibility." />
              </div>
            </Section>
          )}
        </>
      )}

      {!loading && pending.length > 0 && (
        <Section title="Waiting for approval" card>
          <ul className="fko-rows">
            {pending.map((r) => (
              <li key={r.org.id}>
                <Link to={orgPath(r.org.id)}>
                  <strong>{r.org.name}</strong>
                  <span className="fko-hint">
                    {typeLabel(r.org.organizationType)} · request sent{r.membership?.joinedAt ? ` ${day(r.membership.joinedAt)}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </OrgShell>
  );
}
