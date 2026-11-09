/**
 * OrganizationAdminDashboard.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/admin (and /admin/dashboard)
 *
 * Owners and admins only (active membership + owner, admin role or the
 * server's isAdmin flag). Shows what needs attention (pending join requests,
 * new visit requests) and links to every admin tool.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getOrganization } from "../api/organizationsApi";
import { listMembers, membersApi } from "../api/membersApi";
import { ChurchAuthError } from "../api/organizationApi";
import { visitsApi } from "../api/visitsApi";
import { MembershipStatus, type Organization } from "../types/organization.types";
import { typeLabel, wordingFor } from "../ui/orgCategories";
import { Empty, ErrorNote, Loading, OrgShell, PageHead, Section, Tile, errorText, orgPath } from "../ui/OrgShell";

const ADMIN_ROLES = new Set(["owner", "admin", "administrator", "pastor", "leader"]);

export default function OrganizationAdminDashboard(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();

  const [org, setOrg] = useState<Organization | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ members?: number; pending?: number; visits?: number }>({});

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setAllowed(null);
      setError(null);
      try {
        const [o, me] = await Promise.all([getOrganization(organizationId, signal), membersApi.getMyMembership(organizationId, signal)]);
        if (signal?.aborted) return;
        setOrg(o);
        const active = String(me?.status ?? "").toLowerCase() === MembershipStatus.Active;
        const ok = Boolean(me && (me.isOwner || (active && (me.isAdmin || ADMIN_ROLES.has(String(me.role).toLowerCase())))));
        setAllowed(ok);
        if (!ok) return;

        const [activeRes, pendingRes, visitRes] = await Promise.allSettled([
          listMembers(organizationId, { page: 1, pageSize: 1, status: MembershipStatus.Active }, signal),
          listMembers(organizationId, { page: 1, pageSize: 1, status: MembershipStatus.Pending }, signal),
          visitsApi.listForAdmin(organizationId, { status: "new" }),
        ]);
        if (signal?.aborted) return;
        setCounts({
          members: activeRes.status === "fulfilled" ? Number(activeRes.value.total) || 0 : undefined,
          pending: pendingRes.status === "fulfilled" ? Number(pendingRes.value.total) || 0 : undefined,
          visits: visitRes.status === "fulfilled" ? visitRes.value.counts?.new ?? 0 : undefined,
        });
      } catch (err) {
        if (signal?.aborted) return;
        if (err instanceof ChurchAuthError) setSignedOut(true);
        setError(errorText(err, "The admin dashboard could not be loaded."));
        setAllowed(false);
      }
    },
    [organizationId],
  );

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);

  const p = (s = "") => orgPath(organizationId, s);

  if (allowed === null) {
    return (
      <OrgShell organizationId={organizationId}>
        <Loading rows={6} />
      </OrgShell>
    );
  }

  if (!allowed) {
    return (
      <OrgShell organizationId={organizationId} organizationName={org?.name}>
        <Empty
          title={signedOut ? "Sign in to manage this organization" : "Only admins can open this page"}
          text={
            signedOut
              ? "Your session has ended."
              : `You need to be the owner or an admin of ${org?.name ?? "this organization"}. Ask the owner to give you admin access.`
          }
        >
          {signedOut ? (
            <Link to={"/login?returnTo=" + encodeURIComponent(p("/admin"))} className="fko-btn fko-btn--primary">
              Sign in
            </Link>
          ) : (
            <button type="button" className="fko-btn fko-btn--secondary" onClick={() => void load()}>
              Check again
            </button>
          )}
          <Link to={p()} className="fko-btn fko-btn--secondary">
            Back to the organization
          </Link>
        </Empty>
        {error && !signedOut && <ErrorNote>{error}</ErrorNote>}
      </OrgShell>
    );
  }

  const w = wordingFor(org?.organizationType);

  return (
    <OrgShell organizationId={organizationId} organizationName={org?.name}>
      <PageHead
        eyebrow={org ? `${typeLabel(org.organizationType)} · Admin` : "Admin"}
        title={org?.name ?? "Admin dashboard"}
        subtitle="Manage people, activities and your organization's profile."
        actions={
          <>
            <Link to={p()} className="fko-btn fko-btn--secondary">
              View public page
            </Link>
            <Link to={`/church/admin/organizations/${encodeURIComponent(organizationId)}/edit`} className="fko-btn fko-btn--primary">
              Edit profile
            </Link>
          </>
        }
      />

      <section className="fko-stats">
        <Link to={p("/admin/members")} className="fko-card fko-stat fko-stat--link">
          <span>Members</span>
          <strong>{counts.members ?? "—"}</strong>
        </Link>
        <Link to={p("/admin/members")} className={"fko-card fko-stat fko-stat--link" + (counts.pending ? " fko-stat--alert" : "")}>
          <span>Join requests</span>
          <strong>{counts.pending ?? "—"}</strong>
        </Link>
        <Link to={p("/admin/visits")} className={"fko-card fko-stat fko-stat--link" + (counts.visits ? " fko-stat--alert" : "")}>
          <span>New visit requests</span>
          <strong>{counts.visits ?? "—"}</strong>
        </Link>
        <Link to={p("/admin/groups")} className="fko-card fko-stat fko-stat--link">
          <span>Groups</span>
          <strong>{org?.counts?.groups ?? "—"}</strong>
        </Link>
      </section>

      <Section title="People">
        <div className="fko-tiles">
          <Tile to={p("/admin/members")} icon="👥" title="Members & requests" badge={counts.pending} text="Approve join requests, copy your join link, roles and member IDs." />
          <Tile to={p("/admin/visits")} icon="📅" title="Visit requests" badge={counts.visits} text="Contact visitors and mark how each visit went." />
          <Tile to={p("/admin/badges")} icon="🪪" title="Member badges" text="Choose a badge template, see and print every member's ID badge with QR code." />
          <Tile to={p("/attendance")} icon="✅" title="Attendance" text="Check-ins and absence reports." />
          <Tile to={p("/communication")} icon="📣" title="Announcements" text="Send news and messages to members." />
        </div>
      </Section>

      <Section title="Structure">
        <div className="fko-tiles">
          <Tile to={p("/admin/departments")} icon="🏢" title={w.isFaith ? "Ministries & departments" : "Departments & teams"} text="Create departments and choose their leaders." />
          <Tile to={p("/admin/groups")} icon="🫂" title="Groups" text="Small groups, classes, teams and committees." />
        </div>
      </Section>

      <Section title="Activities">
        <div className="fko-tiles">
          <Tile to={p("/admin/events")} icon="🗓️" title="Events" text="Create and publish events." />
          <Tile to={p("/admin/live")} icon="🔴" title="Live" text="Schedule and run livestreams." />
          <Tile to={p("/admin/media")} icon="🎞️" title="Media library" text="Videos, photos, documents and resources." />
        </div>
      </Section>

      <Section title="Organization">
        <div className="fko-tiles">
          <Tile to={`/church/admin/organizations/${encodeURIComponent(organizationId)}/edit`} icon="✏️" title="Profile" text="Name, type, description, logo, contact and locations." />
          <Tile to={p("/admin/settings")} icon="⚙️" title="Settings" text="Who can join, approval rules and visibility." />
          <Tile to={p("/admin/domains")} icon="🌐" title="Fockis domains" text="Your organization address and member addresses." />
          <Tile to={p("/admin/settings?tab=danger")} icon="🗑️" title="Archive or delete" text="Hide the organization, or delete it for good (owner only)." />
        </div>
      </Section>
    </OrgShell>
  );
}
