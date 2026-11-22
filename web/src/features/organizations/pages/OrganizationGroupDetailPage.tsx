/**
 * OrganizationGroupDetailPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/groups/:groupId
 *
 * The page of ONE group. Opened by the "View" buttons on group cards, the
 * Member Portal "Where I belong" chips, and the admin group list.
 *
 * Tabs (backed by existing endpoints only):
 *   Overview — description, type, schedule, location, capacity, leaders
 *   Members  — GET /organizations/:organizationId/groups/:groupId/members
 *
 * Access is enforced by the backend (ChurchGroupsService.getById /
 * listMembers). This page only shows what the API returns.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { getGroup, joinGroup, leaveGroup, listGroupMembers } from "../api/groupsApi";
import { getMyMembership } from "../api/membersApi";
import { getOrganization } from "../api/organizationsApi";
import { ChurchAuthError, ChurchForbiddenError } from "../api/organizationApi";
import { GROUP_TYPE_LABELS, type ChurchGroup, type Member } from "../types/organization.types";
import { Empty, ErrorNote, Loading, OrgShell, PageHead, Section, errorText, orgPath } from "../ui/OrgShell";
import "../styles/OrganizationGroupDetailPage.scss";

type Tab = "overview" | "members";

const PAGE_SIZE = 24;

export default function OrganizationGroupDetailPage(): React.JSX.Element {
  const { organizationId = "", groupId = "" } = useParams<{ organizationId: string; groupId: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "members" ? "members" : "overview";

  const [orgName, setOrgName] = useState<string | undefined>();
  const [group, setGroup] = useState<ChurchGroup | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  /* ---------------------------------------------------------------- load */

  const loadGroup = useCallback(
    async (signal?: AbortSignal) => {
      const g = await getGroup(organizationId, groupId, signal);
      setGroup(g);
      return g;
    },
    [organizationId, groupId],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setSignedOut(false);
    setForbidden(false);

    getOrganization(organizationId, ctrl.signal)
      .then((o) => !ctrl.signal.aborted && setOrgName(o.name))
      .catch(() => undefined);

    getMyMembership(organizationId, ctrl.signal)
      .then((m) => !ctrl.signal.aborted && setIsAdmin(Boolean(m?.isOwner || m?.isAdmin)))
      .catch(() => undefined);

    loadGroup(ctrl.signal)
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        if (err instanceof ChurchAuthError) setSignedOut(true);
        else if (err instanceof ChurchForbiddenError) setForbidden(true);
        setError(errorText(err, "This group could not be loaded."));
      })
      .finally(() => !ctrl.signal.aborted && setLoading(false));

    return () => ctrl.abort();
  }, [organizationId, loadGroup]);

  const setTab = (next: Tab) => {
    const p = new URLSearchParams(params);
    if (next === "overview") p.delete("tab");
    else p.set("tab", next);
    setParams(p, { replace: true });
  };

  /* ------------------------------------------------------------- actions */

  const onJoinLeave = async () => {
    if (!group) return;
    const leaving = Boolean(group.isCurrentUserMember);
    if (leaving && !window.confirm(`Leave ${group.name}?`)) return;
    setBusy(true);
    setActionError(null);
    try {
      if (leaving) await leaveGroup(organizationId, group.id);
      else await joinGroup(organizationId, group.id);
      await loadGroup();
    } catch (err) {
      setActionError(errorText(err, leaving ? "You could not leave this group." : "You could not join this group."));
    } finally {
      setBusy(false);
    }
  };

  /* -------------------------------------------------------------- render */

  const backTo = orgPath(organizationId, "/groups");

  if (loading) {
    return (
      <OrgShell organizationId={organizationId} organizationName={orgName}>
        <Loading rows={2} />
      </OrgShell>
    );
  }

  if (!group) {
    return (
      <OrgShell organizationId={organizationId} organizationName={orgName}>
        <Empty
          title={signedOut ? "Sign in to see this group" : forbidden ? "This group is for its members" : "Group not found"}
          text={signedOut ? undefined : error ?? undefined}
        >
          {signedOut ? (
            <Link
              to={"/login?returnTo=" + encodeURIComponent(orgPath(organizationId, `/groups/${encodeURIComponent(groupId)}`))}
              className="fko-btn fko-btn--primary"
            >
              Sign in
            </Link>
          ) : (
            <Link to={backTo} className="fko-btn fko-btn--secondary">
              Back to groups
            </Link>
          )}
        </Empty>
      </OrgShell>
    );
  }

  const typeLabel = GROUP_TYPE_LABELS[group.groupType] ?? "Group";

  return (
    <OrgShell organizationId={organizationId} organizationName={orgName}>
      <nav className="fko-groupdetail__crumbs" aria-label="Breadcrumb">
        <Link to={backTo}>Groups</Link>
        <span aria-hidden="true">/</span>
        <span>{group.name}</span>
      </nav>

      {group.photoUrl && (
        <div className="fko-groupdetail__cover">
          <img src={group.photoUrl} alt="" />
        </div>
      )}

      <PageHead
        eyebrow={orgName ? `${orgName} · ${typeLabel}` : typeLabel}
        title={group.name}
        subtitle={`${group.memberCount} ${group.memberCount === 1 ? "member" : "members"}`}
        actions={
          <>
            {isAdmin && (
              <button
                type="button"
                className="fko-btn fko-btn--secondary"
                onClick={() => navigate(orgPath(organizationId, `/admin/groups#${encodeURIComponent(group.id)}`))}
              >
                Manage group
              </button>
            )}
            <button
              type="button"
              className={"fko-btn " + (group.isCurrentUserMember ? "fko-btn--ghost" : "fko-btn--primary")}
              onClick={onJoinLeave}
              disabled={busy}
            >
              {busy ? "Saving…" : group.isCurrentUserMember ? "Leave group" : "Join group"}
            </button>
          </>
        }
      />

      {actionError && <ErrorNote>{actionError}</ErrorNote>}

      <div className="fko-tabs fko-groupdetail__tabs" role="tablist" aria-label="Group sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "overview"}
          className={"fko-tab" + (tab === "overview" ? " is-active" : "")}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "members"}
          className={"fko-tab" + (tab === "members" ? " is-active" : "")}
          onClick={() => setTab("members")}
        >
          Members <span className="fko-tab__count">{group.memberCount}</span>
        </button>
      </div>

      {tab === "overview" ? <OverviewTab group={group} typeLabel={typeLabel} /> : <MembersTab organizationId={organizationId} groupId={group.id} />}
    </OrgShell>
  );
}

/* ---------------------------------------------------------------- overview */

function OverviewTab({ group, typeLabel }: { group: ChurchGroup; typeLabel: string }): React.JSX.Element {
  const leaders = group.leaders ?? [];
  return (
    <div className="fko-groupdetail__grid">
      <Section title="About" card>
        {group.description ? <p className="fko-prose">{group.description}</p> : <p className="fko-muted">No description yet.</p>}
      </Section>

      <Section title="Details" card>
        <dl className="fko-kv">
          <div>
            <dt>Type</dt>
            <dd>{typeLabel}</dd>
          </div>
          {group.meetingSchedule && (
            <div>
              <dt>Meets</dt>
              <dd>{group.meetingSchedule}</dd>
            </div>
          )}
          {group.location && (
            <div>
              <dt>Location</dt>
              <dd>{group.location}</dd>
            </div>
          )}
          <div>
            <dt>Members</dt>
            <dd>{group.capacity ? `${group.memberCount} of ${group.capacity}` : group.memberCount}</dd>
          </div>
        </dl>
      </Section>

      <Section title={leaders.length === 1 ? "Leader" : "Leaders"} card>
        {leaders.length === 0 ? (
          <p className="fko-muted">No leader assigned yet.</p>
        ) : (
          <ul className="fko-people">
            {leaders.map((l) => (
              <li key={l.id}>
                <PersonAvatar name={l.displayName} url={l.avatarUrl} />
                <strong>{l.displayName}</strong>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

/* ----------------------------------------------------------------- members */

function MembersTab({ organizationId, groupId }: { organizationId: string; groupId: string }): React.JSX.Element {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      setQuery(search.trim());
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    listGroupMembers(organizationId, groupId, { page, pageSize: PAGE_SIZE, search: query || undefined }, ctrl.signal)
      .then((res) => {
        if (ctrl.signal.aborted) return;
        setItems(res.items);
        setTotal(res.total);
        setHasMore(res.hasMore);
      })
      .catch((err) => !ctrl.signal.aborted && setError(errorText(err, "Members could not be loaded.")))
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [organizationId, groupId, page, query]);

  return (
    <Section card>
      <div className="fko-groupdetail__toolbar">
        <input
          type="search"
          className="fko-search"
          placeholder="Search members"
          aria-label="Search members"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="fko-muted">{total} total</span>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {loading ? (
        <Loading rows={2} />
      ) : items.length === 0 ? (
        <p className="fko-muted">{query ? "No members match your search." : "This group has no members yet."}</p>
      ) : (
        <ul className="fko-people fko-people--grid">
          {items.map((m) => (
            <li key={m.id}>
              <PersonAvatar name={m.profile?.displayName} url={m.profile?.avatarUrl} />
              <Link to={orgPath(organizationId, `/members/${encodeURIComponent(m.id)}`)}>{m.profile?.displayName ?? "Member"}</Link>
            </li>
          ))}
        </ul>
      )}

      {(page > 1 || hasMore) && (
        <div className="fko-actions fko-groupdetail__pager">
          <button type="button" className="fko-btn fko-btn--secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="fko-muted">Page {page}</span>
          <button type="button" className="fko-btn fko-btn--secondary" disabled={!hasMore || loading} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </Section>
  );
}

function PersonAvatar({ name, url }: { name?: string | null; url?: string | null }): React.JSX.Element {
  if (url) return <img className="fko-avatar" src={url} alt="" />;
  return (
    <span className="fko-avatar" aria-hidden="true">
      {(name ?? "?").trim().slice(0, 1).toUpperCase()}
    </span>
  );
}
