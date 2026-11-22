/**
 * GroupsPage.tsx
 * -----------------------------------------------------------------------------
 * Groups & Communities dashboard
 *   /organizations/:organizationId/groups          (members and leaders)
 *   /organizations/:organizationId/admin/groups    (administration menu)
 *
 * Church banner with live statistics, All / My / Featured / Joined /
 * Archived tabs, search + category / type / status / sort filters, grid or
 * list, group cards with their actions, and the right column: Portal View
 * (Admin / Leader or Member — a view, never a permission), Group Categories
 * and Quick Actions. Every permission is decided by the server.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowUpDown,
  CalendarDays,
  ChartColumn,
  CircleCheck,
  Coins,
  Eye,
  Info,
  Layers,
  LayoutGrid,
  List,
  LogOut,
  Mail,
  Pencil,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Star,
  Tag,
  Trash2,
  UserPlus,
  UserRound,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { useOrgAdmin } from "../hooks/useOrgAdmin";
import OrgAppShell from "../ui/OrgAppShell";
import { ChurchAuthError } from "../api/organizationApi";
import { mediaUrl } from "../api/dashboardApi";
import { errorMessage } from "../ui/orgUi";
import { platformCategoryOf } from "../ui/orgTerminology";
import OrganizationGroupManagement from "../admin/OrganizationGroupManagement";
import OrganizationGroupsPage from "../pages/OrganizationGroupsPage";
import { GROUP_CATEGORIES, GROUP_TYPES, categoryLabel, communitiesApi, matchesType, type Dashboard, type GroupSummary, type PolicyView } from "./communitiesApi";
import { DotsMenu, Empty, GroupCover, GroupIcon, GroupStatus, SkeletonCards, groupPath, lookFor, useToast, type MenuItem } from "./GroupParts";
import { GroupPolicyDialog, InviteDialog, JoinDialog, ProposalDialog } from "./GroupDialogs";
import { DeletedPanel, FinancesPanel, InvitationsPanel, ReportsPanel, RequestsPanel } from "./GroupPanels";
import GroupWizard from "./GroupWizard";
import "../ministries/ministries.scss";
import "./groups.scss";

type Tab = "all" | "mine" | "featured" | "joined" | "archived";
type View = "requests" | "invitations" | "deleted" | "reports" | "finances";
type Sort = "newest" | "oldest" | "members" | "active" | "alpha";
const PAGE = 8;
const VIEWS: Record<View, { title: string; icon: LucideIcon }> = {
  requests: { title: "Group Requests", icon: UsersRound },
  invitations: { title: "Group Invitations", icon: Mail },
  deleted: { title: "Deleted Groups", icon: Trash2 },
  reports: { title: "Group Reports", icon: ChartColumn },
  finances: { title: "Group Finances", icon: Coins },
};

export default function GroupsPage(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const admin = useOrgAdmin(organizationId);
  const toast = useToast();

  const [data, setData] = useState<Dashboard | null>(null);
  const [policy, setPolicy] = useState<PolicyView | null>(null);
  const [error, setError] = useState<{ text: string; signedOut: boolean } | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  const tab = (["all", "mine", "featured", "joined", "archived"].includes(params.get("tab") ?? "") ? params.get("tab") : "all") as Tab;
  const view = (Object.keys(VIEWS).includes(params.get("view") ?? "") ? params.get("view") : null) as View | null;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(params.get("category") ?? "all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("active");
  const [sort, setSort] = useState<Sort>("newest");
  const [layout, setLayout] = useState<"grid" | "list">(() => {
    try {
      return window.localStorage.getItem("gc-layout") === "list" ? "list" : "grid";
    } catch {
      return "grid";
    }
  });
  const [portal, setPortal] = useState<"admin" | "member">(() => {
    try {
      return window.localStorage.getItem("gc-portal") === "member" ? "member" : "admin";
    } catch {
      return "admin";
    }
  });
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<null | "propose" | "policy" | { wizard: string | null } | { invite: GroupSummary } | { join: GroupSummary }>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const c = new AbortController();
    setError(null);
    communitiesApi
      .dashboard(organizationId, c.signal)
      .then(setData)
      .catch((err) => !c.signal.aborted && setError({ text: errorMessage(err, "Groups could not be loaded."), signedOut: err instanceof ChurchAuthError }));
    communitiesApi
      .policy(organizationId, c.signal)
      .then(setPolicy)
      .catch(() => undefined);
    return () => c.abort();
  }, [organizationId, tick]);

  useEffect(() => setPage(1), [search, category, type, status, sort, tab]);
  useEffect(() => {
    try {
      window.localStorage.setItem("gc-layout", layout);
      window.localStorage.setItem("gc-portal", portal);
    } catch {
      /* storage unavailable */
    }
  }, [layout, portal]);

  const viewer = data?.viewer;
  // The Admin / Leader view only exists for people who manage something.
  const adminView = Boolean(viewer?.canManageAny) && portal === "admin";

  const setQuery = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") p.delete(k);
      else p.set(k, v);
    }
    setParams(p, { replace: false });
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    let list = data.groups;
    if (tab === "archived") list = list.filter((g) => g.status === "archived");
    else {
      list = list.filter((g) => g.status !== "archived");
      if (tab === "mine") list = list.filter((g) => g.isLeading);
      if (tab === "featured") list = list.filter((g) => g.featured);
      if (tab === "joined") list = list.filter((g) => g.isMember);
      if (status !== "all") list = list.filter((g) => g.status === status);
    }
    if (category !== "all") list = list.filter((g) => g.category === category);
    if (type !== "all") list = list.filter((g) => matchesType(g, type));
    if (q) list = list.filter((g) => `${g.name} ${g.description} ${categoryLabel(g.category)} ${g.leaders.join(" ")} ${g.location}`.toLowerCase().includes(q));
    const t = (s: string | null) => (s ? new Date(s).getTime() : 0);
    const by: Record<Sort, (a: GroupSummary, b: GroupSummary) => number> = {
      newest: (a, b) => t(b.createdAt) - t(a.createdAt),
      oldest: (a, b) => t(a.createdAt) - t(b.createdAt),
      members: (a, b) => b.memberCount - a.memberCount,
      active: (a, b) => b.activityScore - a.activityScore,
      alpha: (a, b) => a.name.localeCompare(b.name),
    };
    return [...list].sort(by[sort]);
  }, [data, tab, search, category, type, status, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const shown = filtered.slice((page - 1) * PAGE, page * PAGE);

  async function run(id: string, fn: () => Promise<unknown>, ok: string) {
    setBusyId(id);
    try {
      await fn();
      toast.show("ok", ok);
      reload();
    } catch (err) {
      toast.show("error", errorMessage(err, "That did not work. Please try again."));
    } finally {
      setBusyId(null);
    }
  }

  function menuFor(g: GroupSummary): MenuItem[] {
    const items: MenuItem[] = [{ label: "View Group", icon: Eye, onSelect: () => navigate(groupPath(organizationId, g.id)) }];
    const joinable = !g.isMember && g.status === "active" && g.visibility !== "private" && g.visibility !== "invitation";
    if (joinable && !g.hasPendingRequest) items.push({ label: g.requireApproval ? "Request to Join" : "Join Group", icon: UserPlus, onSelect: () => setDialog({ join: g }) });
    if (g.isMember && !(g.myRole === "leader" && !viewer?.canCreate))
      items.push({
        label: "Leave Group",
        icon: LogOut,
        onSelect: () => window.confirm(`Leave ${g.name}?`) && run(g.id, () => communitiesApi.leave(organizationId, g.id), `You left ${g.name}.`),
      });
    if ((g.canManage || g.isLeading) && g.status !== "archived") items.push({ label: "Invite Members", icon: Mail, onSelect: () => setDialog({ invite: g }) });
    if (adminView && g.canManage && g.status !== "archived") {
      items.push({ label: "Edit Group", icon: Pencil, onSelect: () => setDialog({ wizard: g.id }) });
      items.push({ label: "Manage Group", icon: Settings2, onSelect: () => navigate(groupPath(organizationId, g.id, "settings")) });
    }
    if (adminView && viewer?.canCreate) {
      if (g.status !== "archived")
        items.push({ label: g.featured ? "Remove from Featured" : "Feature Group", icon: Star, onSelect: () => run(g.id, () => communitiesApi.update(organizationId, g.id, { featured: !g.featured }), g.featured ? "Removed from featured." : `${g.name} is featured.`) });
      if (g.status === "archived") items.push({ label: "Restore Group", icon: ArchiveRestore, onSelect: () => run(g.id, () => communitiesApi.archive(organizationId, g.id, true), `${g.name} was restored.`) });
      else
        items.push({
          label: "Archive Group",
          icon: Archive,
          divider: true,
          onSelect: () => window.confirm(`Archive ${g.name}? Members and history are kept.`) && run(g.id, () => communitiesApi.archive(organizationId, g.id), `${g.name} was archived.`),
        });
    }
    if (adminView && viewer?.isFull)
      items.push({
        label: "Delete Group",
        icon: Trash2,
        danger: true,
        onSelect: () => window.confirm(`Delete ${g.name}? It can be restored from Deleted Groups.`) && run(g.id, () => communitiesApi.softDelete(organizationId, g.id), `${g.name} was deleted.`),
      });
    return items;
  }

  const isAdminRoute = location.pathname.includes("/admin/");
  const adminPath = `/organizations/${encodeURIComponent(organizationId)}/admin/groups`;
  const org = admin.org;
  const banner = mediaUrl((org as unknown as { bannerUrl?: string | null } | null)?.bannerUrl ?? null);

  // Non-church organizations keep the original groups screens.
  if (org && platformCategoryOf(org.organizationType) !== "faith") return isAdminRoute ? <OrganizationGroupManagement /> : <OrganizationGroupsPage />;

  /* ------------------------------------------------------------- pieces */

  const card = (g: GroupSummary) => (
    <article key={g.id} className={"gc-card" + (busyId === g.id ? " is-busy" : "")}>
      <Link to={groupPath(organizationId, g.id)} className="gc-card__link" aria-label={`Open ${g.name}`} />
      <div className="gc-card__media">
        <GroupCover photoUrl={g.photoUrl} category={g.category} />
        {g.featured && (
          <span className="gc-card__star" title="Featured">
            <Star aria-hidden="true" />
          </span>
        )}
        <span className="gc-card__menu">
          <DotsMenu items={menuFor(g)} label={`Actions for ${g.name}`} />
        </span>
        <span className="gc-card__icon">
          <GroupIcon category={g.category} logoUrl={g.logoUrl} size={42} />
        </span>
      </div>
      <div className="gc-card__body">
        <h3>{g.name}</h3>
        <p>{g.description || categoryLabel(g.category)}</p>
        <div className="gc-card__foot">
          <span className="gc-card__members">
            <UsersRound aria-hidden="true" /> <b>{g.memberCount}</b> Members
          </span>
          {g.hasPendingRequest ? <span className="mn-tone mn-tone--amber">Requested</span> : <GroupStatus status={g.status} />}
        </div>
      </div>
    </article>
  );

  const row = (g: GroupSummary) => (
    <article key={g.id} className={"mn-rowcard gc-rowcard" + (busyId === g.id ? " is-busy" : "")}>
      <GroupIcon category={g.category} logoUrl={g.logoUrl} size={42} />
      <div className="mn-rowcard__main">
        <Link to={groupPath(organizationId, g.id)}>
          <b>{g.name}</b>
        </Link>
        <span>{g.description || categoryLabel(g.category)}</span>
      </div>
      <span className="mn-rowcard__cell">{categoryLabel(g.category)}</span>
      <span className="mn-rowcard__cell">
        <UsersRound aria-hidden="true" /> {g.memberCount}
      </span>
      <span className="mn-rowcard__cell">
        <UserRound aria-hidden="true" /> {g.leaders[0] ?? "No leader"}
      </span>
      {g.hasPendingRequest ? <span className="mn-tone mn-tone--amber">Requested</span> : <GroupStatus status={g.status} />}
      <DotsMenu items={menuFor(g)} label={`Actions for ${g.name}`} />
    </article>
  );

  const quick: { key: string; label: string; icon: LucideIcon; onClick: () => void; badge?: number; show: boolean }[] = [
    { key: "manage", label: "Manage Groups", icon: Settings2, onClick: () => setQuery({ view: null, tab: viewer?.canCreate ? null : "mine" }), show: adminView },
    { key: "requests", label: "Group Requests", icon: UsersRound, onClick: () => setQuery({ view: "requests" }), badge: data?.counts.requests, show: true },
    { key: "invitations", label: "Group Invitations", icon: Mail, onClick: () => setQuery({ view: "invitations" }), badge: data?.counts.invitations, show: true },
    { key: "deleted", label: "Deleted Groups", icon: Trash2, onClick: () => setQuery({ view: "deleted" }), show: adminView && Boolean(viewer?.isFull) },
    { key: "reports", label: "Group Reports", icon: ChartColumn, onClick: () => setQuery({ view: "reports" }), show: adminView },
    { key: "finances", label: "Group Finances", icon: Coins, onClick: () => setQuery({ view: "finances" }), show: true },
    { key: "permissions", label: "Group Permissions", icon: ShieldCheck, onClick: () => setDialog("policy"), show: adminView && Boolean(viewer?.canConfigure) },
  ];

  const side = (
    <aside className="gc-side">
      {viewer?.canManageAny && (
        <section className="gc-box">
          <header className="gc-box__head">
            <UsersRound aria-hidden="true" />
            <h2>Portal View</h2>
          </header>
          <div className="gc-portal" role="radiogroup" aria-label="Portal view">
            <button type="button" role="radio" aria-checked={portal === "admin"} className={portal === "admin" ? "is-on" : ""} onClick={() => setPortal("admin")}>
              <ShieldCheck aria-hidden="true" /> Admin / Leader
            </button>
            <button type="button" role="radio" aria-checked={portal === "member"} className={portal === "member" ? "is-on" : ""} onClick={() => setPortal("member")}>
              <UsersRound aria-hidden="true" /> Member
            </button>
          </div>
          <p className="gc-portal__note">
            <Info aria-hidden="true" />
            {portal === "admin" ? (
              <span>
                You are in {viewer.canCreate ? "Administrator" : "Leader"} view.
                <small>{viewer.canCreate ? "Manage groups, members, finances, and settings." : `Manage the ${viewer.leadsGroups} group${viewer.leadsGroups === 1 ? "" : "s"} you lead.`}</small>
              </span>
            ) : (
              <span>
                You are in Member view.
                <small>See groups the way members do.</small>
              </span>
            )}
          </p>
        </section>
      )}

      <section className="gc-box">
        <header className="gc-box__head">
          <Layers aria-hidden="true" className="gc-blue" />
          <h2>Group Categories</h2>
        </header>
        <ul className="gc-cats">
          {GROUP_CATEGORIES.map(([k, label]) => {
            const L = lookFor(k);
            const on = category === k;
            return (
              <li key={k}>
                <button type="button" className={on ? "is-on" : ""} aria-pressed={on} onClick={() => setCategory(on ? "all" : k)}>
                  <L.icon aria-hidden="true" />
                  <span>{label}</span>
                  <b>{data?.categories[k] ?? 0}</b>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="gc-box">
        <header className="gc-box__head">
          <Zap aria-hidden="true" />
          <h2>Quick Actions</h2>
        </header>
        <div className="gc-quick">
          {adminView && viewer?.canCreate && (
            <button type="button" className="gc-quick__primary" onClick={() => setDialog({ wizard: null })}>
              <Plus aria-hidden="true" /> Create Group
            </button>
          )}
          {!viewer?.canCreate && viewer?.canPropose && (
            <button type="button" className="gc-quick__primary" onClick={() => setDialog("propose")}>
              <Send aria-hidden="true" /> Propose a Group
            </button>
          )}
          {quick
            .filter((q) => q.show)
            .map((q) => (
              <button key={q.key} type="button" className={"gc-quick__item" + (view === q.key ? " is-on" : "")} onClick={q.onClick}>
                <q.icon aria-hidden="true" />
                <span>{q.label}</span>
                {q.badge ? <b className="gc-badge">{q.badge}</b> : null}
              </button>
            ))}
        </div>
      </section>
    </aside>
  );

  const tabs: [Tab, string, LucideIcon, number | undefined][] = [
    ["all", "All Groups", LayoutGrid, data?.counts.all],
    ["mine", "My Groups", UserRound, data?.counts.mine],
    ["featured", "Featured", Star, data?.counts.featured],
    ["joined", "Joined", CircleCheck, data?.counts.joined],
    ["archived", "Archived", Archive, data?.counts.archived],
  ];

  return (
    <OrgAppShell variant={isAdminRoute ? "admin" : "member"} organization={admin.shellOrg} viewer={admin.shellViewer} activeNavTo={isAdminRoute ? adminPath : undefined}>
      <div className="gc-page">
        <div className="gc-main">
          {/* Church banner */}
          <section className="gc-hero" style={banner ? { ["--gc-hero-img" as string]: `url("${banner}")` } : undefined}>
            <span className="gc-hero__icon" aria-hidden="true">
              <UsersRound />
            </span>
            <div className="gc-hero__text">
              <p className="gc-hero__church">{org?.name ?? ""}</p>
              <h1>Groups &amp; Communities</h1>
              <p>Discover, join, and participate in groups that build fellowship, grow your faith, and serve together.</p>
              <ul className="gc-hero__stats">
                {(
                  [
                    [UsersRound, data?.stats.totalGroups, "Groups"],
                    [UsersRound, data?.stats.totalMembers, "Members"],
                    [CalendarDays, data?.stats.activeGroups, "Active Groups"],
                    [Star, data?.stats.featuredGroups, "Featured"],
                  ] as [LucideIcon, number | undefined, string][]
                ).map(([I, v, l]) => (
                  <li key={l}>
                    <I aria-hidden="true" />
                    <span>
                      <b>{v ?? "—"}</b>
                      {l}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {adminView && viewer?.canCreate && (
              <button type="button" className="gc-hero__create" onClick={() => setDialog({ wizard: null })}>
                <Plus aria-hidden="true" /> Create Group
              </button>
            )}
          </section>

          {error ? (
            <div className="mn-panel">
              <Empty
                icon={UsersRound}
                title={error.signedOut ? "Sign in to continue" : "Groups could not be loaded"}
                text={error.text}
                action={
                  error.signedOut ? (
                    <Link className="mn-btn mn-btn--primary" to="/login">
                      Sign in
                    </Link>
                  ) : (
                    <button type="button" className="mn-btn mn-btn--outline" onClick={reload}>
                      Try again
                    </button>
                  )
                }
              />
            </div>
          ) : view ? (
            <>
              <header className="gc-viewhead">
                <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm" onClick={() => setQuery({ view: null })}>
                  <ArrowLeft aria-hidden="true" /> All groups
                </button>
                <h2>
                  {(() => {
                    const V = VIEWS[view];
                    return <V.icon aria-hidden="true" />;
                  })()}
                  {VIEWS[view].title}
                </h2>
              </header>
              {view === "requests" && <RequestsPanel organizationId={organizationId} canPropose={Boolean(viewer?.canPropose)} notify={toast.show} onChanged={reload} />}
              {view === "invitations" && <InvitationsPanel organizationId={organizationId} notify={toast.show} onChanged={reload} />}
              {view === "deleted" && <DeletedPanel organizationId={organizationId} notify={toast.show} onChanged={reload} />}
              {view === "reports" && <ReportsPanel organizationId={organizationId} churchName={org?.name ?? "Church"} />}
              {view === "finances" && <FinancesPanel organizationId={organizationId} canOversee={Boolean(viewer?.canManageAny) && portal === "admin"} notify={toast.show} />}
            </>
          ) : (
            <>
              <nav className="gc-tabs" aria-label="Groups">
                {tabs
                  .filter(([k]) => k !== "mine" || viewer?.canManageAny)
                  .map(([k, label, Icon, n]) => (
                    <button key={k} type="button" className={"gc-tabs__tab" + (tab === k ? " is-active" : "")} aria-current={tab === k ? "page" : undefined} onClick={() => setQuery({ tab: k === "all" ? null : k })}>
                      <Icon aria-hidden="true" /> {label} {n != null && <span className="gc-tabs__count">{n}</span>}
                    </button>
                  ))}
              </nav>

              <div className="gc-toolbar">
                <label className="mn-search">
                  <Search aria-hidden="true" />
                  <input type="search" placeholder="Search groups..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search groups by name, description, category, leader or location" />
                </label>
                <label className="mn-select">
                  <Layers aria-hidden="true" />
                  <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
                    <option value="all">All Categories</option>
                    {GROUP_CATEGORIES.map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mn-select">
                  <Tag aria-hidden="true" />
                  <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Group type">
                    <option value="all">All Group Types</option>
                    {GROUP_TYPES.map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mn-select gc-status-select">
                  <span className={"gc-dot gc-dot--" + status} aria-hidden="true" />
                  <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" disabled={tab === "archived"}>
                    <option value="all">Status: All</option>
                    <option value="active">Status: Active</option>
                    <option value="inactive">Status: Inactive</option>
                    <option value="pending_approval">Status: Pending Approval</option>
                    {adminView && <option value="draft">Status: Draft</option>}
                  </select>
                </label>
                <label className="mn-select">
                  <ArrowUpDown aria-hidden="true" />
                  <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
                    <option value="newest">Sort: Newest</option>
                    <option value="oldest">Sort: Oldest</option>
                    <option value="members">Sort: Most Members</option>
                    <option value="active">Sort: Most Active</option>
                    <option value="alpha">Sort: Alphabetical</option>
                  </select>
                </label>
                <div className="mn-viewtoggle" role="group" aria-label="Layout">
                  <button type="button" className={layout === "grid" ? "is-on" : ""} aria-pressed={layout === "grid"} aria-label="Grid view" onClick={() => setLayout("grid")}>
                    <LayoutGrid aria-hidden="true" />
                  </button>
                  <button type="button" className={layout === "list" ? "is-on" : ""} aria-pressed={layout === "list"} aria-label="List view" onClick={() => setLayout("list")}>
                    <List aria-hidden="true" />
                  </button>
                </div>
              </div>

              {!data ? (
                <SkeletonCards />
              ) : filtered.length === 0 ? (
                <div className="mn-panel">
                  <Empty
                    icon={UsersRound}
                    title={
                      data.groups.length === 0
                        ? "No groups created yet"
                        : tab === "joined"
                          ? "You haven't joined a group yet"
                          : tab === "mine"
                            ? "You don't lead a group yet"
                            : tab === "archived"
                              ? "No archived groups"
                              : "No groups match"
                    }
                    text={
                      data.groups.length === 0
                        ? viewer?.canCreate
                          ? "Create the first group of your church."
                          : "Propose a group and church leadership will review it."
                        : tab === "joined"
                          ? "Browse All Groups to find a community to join."
                          : "Try another search, category, type or status."
                    }
                    action={
                      data.groups.length === 0 ? (
                        viewer?.canCreate ? (
                          <button type="button" className="mn-btn mn-btn--primary" onClick={() => setDialog({ wizard: null })}>
                            <Plus aria-hidden="true" /> Create Group
                          </button>
                        ) : viewer?.canPropose ? (
                          <button type="button" className="mn-btn mn-btn--primary" onClick={() => setDialog("propose")}>
                            <Send aria-hidden="true" /> Propose a Group
                          </button>
                        ) : undefined
                      ) : tab === "joined" ? (
                        <button type="button" className="mn-btn mn-btn--outline" onClick={() => setQuery({ tab: null })}>
                          Browse groups
                        </button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                <>
                  {layout === "grid" ? <div className="gc-grid">{shown.map(card)}</div> : <div className="mn-rows">{shown.map(row)}</div>}
                  <footer className="mn-pager">
                    <span>
                      Showing {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, filtered.length)} of {filtered.length} groups
                    </span>
                    {pages > 1 && (
                      <div className="mn-pager__nav">
                        <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                          ‹
                        </button>
                        {Array.from({ length: pages }, (_, i) => i + 1)
                          .filter((p) => pages <= 7 || p === 1 || p === pages || Math.abs(p - page) <= 1)
                          .map((p) => (
                            <button key={p} type="button" className={p === page ? "is-on" : ""} aria-current={p === page ? "page" : undefined} onClick={() => setPage(p)}>
                              {p}
                            </button>
                          ))}
                        <button type="button" aria-label="Next page" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
                          ›
                        </button>
                      </div>
                    )}
                  </footer>
                </>
              )}
            </>
          )}
        </div>
        {side}
      </div>

      {dialog === "propose" && (
        <ProposalDialog
          organizationId={organizationId}
          onClose={() => setDialog(null)}
          onDone={(submitted) => {
            setDialog(null);
            toast.show("ok", submitted ? "Thank you! Your proposal was sent to church leadership." : "Draft saved under Group Requests.");
            reload();
          }}
        />
      )}
      {dialog === "policy" && policy && (
        <GroupPolicyDialog
          organizationId={organizationId}
          policy={policy}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            toast.show("ok", "Group permissions saved.");
            reload();
          }}
        />
      )}
      {dialog && typeof dialog === "object" && "wizard" in dialog && (
        <GroupWizard
          organizationId={organizationId}
          groupId={dialog.wizard}
          defaults={policy?.defaults ?? null}
          canGovern={Boolean(viewer?.canCreate)}
          onClose={() => setDialog(null)}
          onSaved={(id, published) => {
            const editing = Boolean(dialog.wizard);
            setDialog(null);
            toast.show("ok", editing ? "Group saved." : published ? "Group created." : "Draft saved.");
            reload();
            if (!editing && published) navigate(groupPath(organizationId, id));
          }}
        />
      )}
      {dialog && typeof dialog === "object" && "invite" in dialog && (
        <InviteDialog
          organizationId={organizationId}
          groupId={dialog.invite.id}
          groupName={dialog.invite.name}
          allowEmail={Boolean(viewer?.canCreate)}
          onClose={() => setDialog(null)}
          onDone={(msg) => {
            setDialog(null);
            toast.show("ok", msg);
          }}
        />
      )}
      {dialog && typeof dialog === "object" && "join" in dialog && (
        <JoinDialog
          organizationId={organizationId}
          group={dialog.join}
          onClose={() => setDialog(null)}
          onDone={(joined) => {
            const n = dialog.join.name;
            setDialog(null);
            toast.show("ok", joined ? `Welcome to ${n}!` : "Request sent. The leaders will review it.");
            reload();
          }}
        />
      )}
      {toast.node}
    </OrgAppShell>
  );
}
