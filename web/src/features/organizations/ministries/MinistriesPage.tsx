/**
 * MinistriesPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/admin/departments   (administration menu)
 * /organizations/:organizationId/ministries          (any active member)
 *
 * The Ministries dashboard: stats, All / My / Applications / Activities /
 * Reports tabs, search + category / status / sort filters, grid or list,
 * ministry cards with their actions, and the "Who can create ministries",
 * "Ministry creation flow" and "Suggest a new ministry" panels.
 *
 * What each person sees and may do comes from the server
 * (GET …/ministries/dashboard); every action is checked again there.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  ArrowUpDown,
  ChartColumn,
  CalendarCheck,
  CalendarDays,
  Check,
  CircleCheck,
  ClipboardCheck,
  ClipboardList,
  Crown,
  ExternalLink,
  FileSearch,
  Layers,
  LayoutGrid,
  Lightbulb,
  List,
  Pencil,
  Plus,
  Power,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  UserCog,
  UserPlus,
  UserRound,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { useOrgAdmin } from "../hooks/useOrgAdmin";
import OrganizationDepartmentManagement from "../admin/OrganizationDepartmentManagement";
import { platformCategoryOf } from "../ui/orgTerminology";
import OrgAppShell from "../ui/OrgAppShell";
import { ChurchAuthError } from "../api/organizationApi";
import { errorMessage } from "../ui/orgUi";
import {
  MINISTRY_CATEGORIES,
  POLICY_LEVEL_LABELS,
  categoryLabel,
  ministriesApi,
  type MinistriesDashboard,
  type MinistrySummary,
  type PolicyLevel,
} from "./ministriesApi";
import { DotsMenu, Empty, MinistryCover, MinistryIcon, PersonAvatar, SkeletonCards, StatusPill, useToast, type MenuItem } from "./MinistryParts";
import { ApplyDialog, PolicyDialog, ProposalDialog } from "./MinistryDialogs";
import MinistryWizard from "./MinistryWizard";
import { ActivitiesTab, ApplicationsTab, ReportsTab } from "./DashboardTabs";
import "./ministries.scss";

type Tab = "all" | "mine" | "applications" | "activities" | "reports";
type Sort = "newest" | "oldest" | "alpha" | "members" | "active" | "updated";
const PAGE_SIZE = 8;

const SORTS: [Sort, string][] = [
  ["newest", "Newest First"],
  ["oldest", "Oldest First"],
  ["alpha", "Alphabetical"],
  ["members", "Most Members"],
  ["active", "Most Active"],
  ["updated", "Recently Updated"],
];

const ROLE_ROWS: { key: string; label: string; icon: LucideIcon; tone: string }[] = [
  { key: "owner", label: "Church Owner", icon: Crown, tone: "#f59e0b" },
  { key: "pastor_director", label: "Senior Pastor", icon: UserRound, tone: "#8b3df5" },
  { key: "administrator", label: "Church Administrator", icon: Settings2, tone: "#2f6bff" },
  { key: "department_manager", label: "Ministry Coordinator", icon: UsersRound, tone: "#2f6bff" },
  { key: "leader", label: "Ministry Leader", icon: UserCog, tone: "#f97316" },
  { key: "group_leader", label: "Assistant Leader", icon: Users, tone: "#8b3df5" },
  { key: "member", label: "Church Member", icon: UserRound, tone: "#2f6bff" },
];

function Stat({ icon: Icon, value, label, tone }: { icon: LucideIcon; value: number | string; label: string; tone: string }) {
  return (
    <div className="mn-stat">
      <span className={`mn-stat__icon mn-stat__icon--${tone}`}>
        <Icon aria-hidden="true" />
      </span>
      <div>
        <b>{value}</b>
        <span>{label}</span>
      </div>
    </div>
  );
}

export default function MinistriesPage(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const admin = useOrgAdmin(organizationId);
  const toast = useToast();

  const [data, setData] = useState<MinistriesDashboard | null>(null);
  const [error, setError] = useState<{ text: string; signedOut: boolean } | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  const tab = (["all", "mine", "applications", "activities", "reports"].includes(params.get("tab") ?? "") ? params.get("tab") : "all") as Tab;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("active");
  const [sort, setSort] = useState<Sort>("newest");
  const [view, setView] = useState<"grid" | "list">(() => (typeof window !== "undefined" && window.localStorage?.getItem("mn-view") === "list" ? "list" : "grid"));
  const [page, setPage] = useState(1);

  const [dialog, setDialog] = useState<null | "propose" | "policy" | { wizard: string | null } | { apply: MinistrySummary }>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const c = new AbortController();
    setError(null);
    ministriesApi
      .dashboard(organizationId, c.signal)
      .then(setData)
      .catch((err) => !c.signal.aborted && setError({ text: errorMessage(err, "Ministries could not be loaded."), signedOut: err instanceof ChurchAuthError }));
    return () => c.abort();
  }, [organizationId, tick]);

  useEffect(() => setPage(1), [search, category, status, sort, tab]);
  useEffect(() => {
    try {
      window.localStorage.setItem("mn-view", view);
    } catch {
      /* storage unavailable */
    }
  }, [view]);

  const goTab = (t: Tab) => {
    const p = new URLSearchParams(params);
    if (t === "all") p.delete("tab");
    else p.set("tab", t);
    setParams(p, { replace: true });
  };

  const viewer = data?.viewer;
  const ministryPath = (id: string, t?: string) => `/organizations/${encodeURIComponent(organizationId)}/ministries/${encodeURIComponent(id)}${t ? `?tab=${t}` : ""}`;

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    let list = data.ministries.filter((m) => (tab === "mine" ? m.isMember || m.isLeader : true));
    if (status !== "all") list = list.filter((m) => m.status === status);
    else list = list.filter((m) => m.status !== "archived");
    if (category !== "all") list = list.filter((m) => m.category === category);
    if (q) list = list.filter((m) => `${m.name} ${m.description} ${m.leaders.map((l) => l.displayName).join(" ")} ${categoryLabel(m.category)}`.toLowerCase().includes(q));
    const t = (s: string | null) => (s ? new Date(s).getTime() : 0);
    const by: Record<Sort, (a: MinistrySummary, b: MinistrySummary) => number> = {
      newest: (a, b) => t(b.createdAt) - t(a.createdAt),
      oldest: (a, b) => t(a.createdAt) - t(b.createdAt),
      alpha: (a, b) => a.name.localeCompare(b.name),
      members: (a, b) => b.memberCount - a.memberCount,
      active: (a, b) => b.recentActivities + b.upcomingActivities - (a.recentActivities + a.upcomingActivities),
      updated: (a, b) => t(b.updatedAt) - t(a.updatedAt),
    };
    return [...list].sort(by[sort]);
  }, [data, tab, search, category, status, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  function menuFor(m: MinistrySummary): MenuItem[] {
    const items: MenuItem[] = [{ label: "Open", icon: ExternalLink, onSelect: () => navigate(ministryPath(m.id)) }];
    if (m.canManage && m.status !== "archived") {
      items.push(
        { label: "Edit", icon: Pencil, onSelect: () => setDialog({ wizard: m.id }) },
        { label: "Manage Members", icon: UsersRound, onSelect: () => navigate(ministryPath(m.id, "members")) },
        { label: "Manage Teams", icon: Users, onSelect: () => navigate(ministryPath(m.id, "teams")) },
      );
      if (viewer?.canCreate) items.push({ label: "Assign Leader", icon: UserCog, onSelect: () => setDialog({ wizard: m.id }) });
    }
    items.push({ label: "View Activities", icon: CalendarDays, onSelect: () => navigate(ministryPath(m.id, "events")) });
    if (m.canManage) items.push({ label: "View Reports", icon: ChartColumn, onSelect: () => navigate(ministryPath(m.id, "reports")) });
    if (!m.isMember && !m.isLeader && m.status === "active" && m.joinMode !== "invite") {
      items.push({ label: m.joinMode === "open" ? "Join Ministry" : "Apply to Join", icon: UserPlus, onSelect: () => setDialog({ apply: m }) });
    }
    if (viewer?.canCreate) {
      if (m.status === "active")
        items.push({ label: "Deactivate", icon: Power, divider: true, onSelect: () => run(m.id, () => ministriesApi.update(organizationId, m.id, { ministryStatus: "inactive" }), `${m.name} is now inactive.`) });
      if (m.status === "inactive")
        items.push({ label: "Activate", icon: Power, divider: true, onSelect: () => run(m.id, () => ministriesApi.update(organizationId, m.id, { ministryStatus: "active" }), `${m.name} is active again.`) });
      if (m.status === "archived") items.push({ label: "Restore", icon: ArchiveRestore, onSelect: () => run(m.id, () => ministriesApi.restore(organizationId, m.id), `${m.name} was restored.`) });
      else
        items.push({
          label: "Archive",
          icon: Archive,
          danger: true,
          onSelect: () => {
            if (window.confirm(`Archive ${m.name}? Members and history are kept and it can be restored later.`)) run(m.id, () => ministriesApi.archive(organizationId, m.id), `${m.name} was archived.`);
          },
        });
    }
    return items;
  }

  const isAdminView = admin.allowed === true;
  const adminPath = `/organizations/${encodeURIComponent(organizationId)}/admin/departments`;
  const managed = (data?.ministries ?? []).filter((m) => m.canManage && m.status !== "archived");

  /* ----------------------------------------------------------------- render */

  const leaderLine = (m: MinistrySummary) =>
    m.leaders.length ? (
      <>
        Leader: <b>{m.leaders[0].displayName}</b>
        {m.leaders.length > 1 && <em> +{m.leaders.length - 1}</em>}
      </>
    ) : (
      <span className="mn-muted">No leader yet</span>
    );

  const cards = (
    <div className={view === "grid" ? "mn-grid" : "mn-rows"}>
      {shown.map((m) =>
        view === "grid" ? (
          <article key={m.id} className={"mn-card" + (busyId === m.id ? " is-busy" : "")}>
            <Link to={ministryPath(m.id)} className="mn-card__link" aria-label={`Open ${m.name}`} />
            <div className="mn-card__media">
              <MinistryCover photoUrl={m.photoUrl} category={m.category} iconKey={m.iconKey} color={m.color} />
              <span className="mn-card__icon">
                <MinistryIcon category={m.category} iconKey={m.iconKey} color={m.color} size={38} />
              </span>
            </div>
            <div className="mn-card__body">
              <h3>{m.name}</h3>
              <p>{m.description || categoryLabel(m.category)}</p>
              <ul className="mn-card__meta">
                <li>
                  <UsersRound aria-hidden="true" /> <b>{m.memberCount}</b> Members
                </li>
                <li>
                  <UserRound aria-hidden="true" /> {leaderLine(m)}
                </li>
              </ul>
              <div className="mn-card__foot">
                <StatusPill status={m.status} />
                {m.pendingApplications > 0 && (
                  <span className="mn-dotbadge" title="Pending applications">
                    {m.pendingApplications}
                  </span>
                )}
                <DotsMenu items={menuFor(m)} label={`Actions for ${m.name}`} />
              </div>
            </div>
          </article>
        ) : (
          <article key={m.id} className={"mn-rowcard" + (busyId === m.id ? " is-busy" : "")}>
            <MinistryIcon category={m.category} iconKey={m.iconKey} color={m.color} size={42} />
            <div className="mn-rowcard__main">
              <Link to={ministryPath(m.id)}>
                <b>{m.name}</b>
              </Link>
              <span>{m.description || categoryLabel(m.category)}</span>
            </div>
            <span className="mn-rowcard__cell">{categoryLabel(m.category)}</span>
            <span className="mn-rowcard__cell">
              <UsersRound aria-hidden="true" /> {m.memberCount}
            </span>
            <span className="mn-rowcard__cell mn-rowcard__leader">
              {m.leaders[0] ? <PersonAvatar name={m.leaders[0].displayName} src={m.leaders[0].avatarUrl} size={26} /> : null}
              {m.leaders[0]?.displayName ?? <span className="mn-muted">No leader</span>}
            </span>
            <StatusPill status={m.status} />
            <DotsMenu items={menuFor(m)} label={`Actions for ${m.name}`} />
          </article>
        ),
      )}
    </div>
  );

  const policy = data?.policy;
  const levelOf = (key: string): PolicyLevel => (key === "owner" ? "full" : (policy?.roles[key] ?? "none"));
  const createsDirectly = (l: PolicyLevel) => l === "full" || l === "create";

  const side = (
    <aside className="mn-side">
      <section className="mn-box">
        <header className="mn-box__head">
          <ShieldCheck aria-hidden="true" />
          <h2>Who Can Create Ministries?</h2>
        </header>
        <ul className="mn-roles">
          {ROLE_ROWS.map((r) => {
            const level = levelOf(r.key);
            const info = POLICY_LEVEL_LABELS[level];
            const mark = createsDirectly(level) || level === "manage_assigned" || level === "restricted" || level === "propose";
            return (
              <li key={r.key}>
                <span className="mn-roles__icon" style={{ color: r.tone, background: `${r.tone}18` }}>
                  <r.icon aria-hidden="true" />
                </span>
                <div>
                  <b>
                    {r.label} <span>– {info.label}</span>
                  </b>
                  <small>{r.key === "member" && level === "propose" ? "Apply to join ministries (cannot create)" : info.text}</small>
                </div>
                <span className={"mn-roles__mark" + (mark ? " is-yes" : " is-no")} aria-label={mark ? "Allowed" : "Not allowed"}>
                  {mark ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
                </span>
              </li>
            );
          })}
        </ul>
        {viewer?.canConfigure && (
          <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm mn-box__action" onClick={() => setDialog("policy")}>
            <Settings2 aria-hidden="true" /> Edit permissions
          </button>
        )}
      </section>

      <section className="mn-box mn-box--flow">
        <header className="mn-box__head">
          <Lightbulb aria-hidden="true" className="mn-bulb" />
          <h2>Ministry Creation Flow</h2>
        </header>
        <ol className="mn-flow">
          {[
            { icon: UserPlus, title: "Submit Proposal", by: "(by Member)" },
            { icon: FileSearch, title: "Review", by: "(by Admin/ Pastor)" },
            { icon: Check, title: "Approve", by: "(by Pastor/ Owner)", done: true },
            { icon: Layers, title: "Create Ministry", by: "(by Authorized Admin)" },
          ].map((s, i) => (
            <li key={s.title}>
              {i > 0 && <ArrowRight className="mn-flow__arrow" aria-hidden="true" />}
              <span className={"mn-flow__icon" + (s.done ? " is-done" : "")}>
                <s.icon aria-hidden="true" />
              </span>
              <b>{s.title}</b>
              <small>{s.by}</small>
            </li>
          ))}
        </ol>
      </section>

      {(viewer?.canPropose ?? true) && (
        <section className="mn-box mn-box--suggest">
          <div className="mn-suggest">
            <span className="mn-suggest__icon">
              <UsersRound aria-hidden="true" />
            </span>
            <div>
              <h2>Suggest a New Ministry</h2>
              <p>Members can submit a ministry proposal for review and approval.</p>
            </div>
          </div>
          <button type="button" className="mn-btn mn-btn--outline mn-btn--block" onClick={() => setDialog("propose")} disabled={!viewer?.canPropose}>
            Submit Proposal
          </button>
        </section>
      )}
    </aside>
  );

  const count = (n?: number) => (n != null ? <span className="mn-tabs__count">{n}</span> : null);

  // Businesses, schools, clubs… keep their departments screen.
  if (admin.org && platformCategoryOf(admin.org.organizationType) !== "faith") return <OrganizationDepartmentManagement />;

  return (
    <OrgAppShell variant={isAdminView ? "admin" : "member"} organization={admin.shellOrg} viewer={admin.shellViewer} activeNavTo={isAdminView ? adminPath : undefined}>
      <div className="mn-page">
        <div className="mn-main">
          <header className="mn-head">
            <span className="mn-head__icon" aria-hidden="true">
              <UsersRound />
            </span>
            <div className="mn-head__text">
              <h1>Ministries</h1>
              <p>Manage all church ministries, leaders, teams, members, activities, and resources.</p>
            </div>
            <div className="mn-head__actions">
              {viewer?.canPropose && (
                <button type="button" className="mn-btn mn-btn--outline mn-btn--lg" onClick={() => setDialog("propose")}>
                  <Send aria-hidden="true" /> Ministry Proposal
                </button>
              )}
              {viewer?.canCreate && (
                <button type="button" className="mn-btn mn-btn--primary mn-btn--lg" onClick={() => setDialog({ wizard: null })}>
                  <Plus aria-hidden="true" /> Create Ministry
                </button>
              )}
            </div>
          </header>

          {error ? (
            <div className="mn-panel">
              <Empty
                icon={UsersRound}
                title={error.signedOut ? "Sign in to continue" : "Ministries could not be loaded"}
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
          ) : (
            <>
              <div className="mn-stats">
                {data ? (
                  <>
                    <Stat icon={Layers} value={data.stats.totalMinistries} label="Total Ministries" tone="blue" />
                    <Stat icon={CircleCheck} value={data.stats.activeMinistries} label="Active Ministries" tone="green" />
                    <Stat icon={UsersRound} value={data.stats.ministryMembers} label="Ministry Members" tone="purple" />
                    <Stat icon={Crown} value={data.stats.ministryLeaders} label="Ministry Leaders" tone="amber" />
                    <Stat icon={CalendarCheck} value={data.stats.upcomingActivities} label="Upcoming Activities" tone="violet" />
                    <Stat icon={ClipboardCheck} value={data.stats.pendingApplications} label="Pending Applications" tone="orange" />
                  </>
                ) : (
                  Array.from({ length: 6 }).map((_, i) => <div key={i} className="mn-stat mn-sk" style={{ height: 82 }} />)
                )}
              </div>

              <nav className="mn-tabs" aria-label="Ministries sections">
                {(
                  [
                    ["all", "All Ministries", LayoutGrid, data?.counts.all],
                    ["mine", "My Ministries", UserRound, data?.counts.mine],
                    ["applications", "Applications", ClipboardList, data?.counts.applications],
                    ["activities", "Activities", CalendarDays, undefined],
                    ["reports", "Reports", ChartColumn, undefined],
                  ] as [Tab, string, LucideIcon, number | undefined][]
                )
                  .filter(([k]) => k !== "reports" || viewer?.canCreate || managed.length > 0)
                  .map(([k, label, Icon, n]) => (
                    <button key={k} type="button" className={"mn-tabs__tab" + (tab === k ? " is-active" : "")} aria-current={tab === k ? "page" : undefined} onClick={() => goTab(k)}>
                      <Icon aria-hidden="true" /> {label} {count(n)}
                    </button>
                  ))}
              </nav>

              {(tab === "all" || tab === "mine") && (
                <>
                  <div className="mn-toolbar">
                    <label className="mn-search">
                      <Search aria-hidden="true" />
                      <input type="search" placeholder="Search ministries..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search ministries" />
                    </label>
                    <label className="mn-select">
                      <Layers aria-hidden="true" />
                      <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
                        <option value="all">All Categories</option>
                        {MINISTRY_CATEGORIES.map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="mn-select">
                      <CircleCheck aria-hidden="true" />
                      <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="pending_approval">Pending Approval</option>
                        <option value="draft">Draft</option>
                        {viewer?.canCreate && <option value="archived">Archived</option>}
                      </select>
                    </label>
                    <label className="mn-select">
                      <ArrowUpDown aria-hidden="true" />
                      <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
                        {SORTS.map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="mn-viewtoggle" role="group" aria-label="Layout">
                      <button type="button" className={view === "grid" ? "is-on" : ""} aria-pressed={view === "grid"} aria-label="Grid view" onClick={() => setView("grid")}>
                        <LayoutGrid aria-hidden="true" />
                      </button>
                      <button type="button" className={view === "list" ? "is-on" : ""} aria-pressed={view === "list"} aria-label="List view" onClick={() => setView("list")}>
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
                        title={data.ministries.length === 0 ? "No ministries yet" : tab === "mine" ? "You are not in a ministry yet" : "No ministries match"}
                        text={
                          data.ministries.length === 0
                            ? viewer?.canCreate
                              ? "Create the first ministry of your church."
                              : "Suggest a ministry and church leadership will review it."
                            : tab === "mine"
                              ? "Browse All Ministries to join or apply."
                              : "Try another search, category or status."
                        }
                        action={
                          data.ministries.length === 0 && viewer?.canCreate ? (
                            <button type="button" className="mn-btn mn-btn--primary" onClick={() => setDialog({ wizard: null })}>
                              <Plus aria-hidden="true" /> Create Ministry
                            </button>
                          ) : undefined
                        }
                      />
                    </div>
                  ) : (
                    <>
                      {cards}
                      <footer className="mn-pager">
                        <span>
                          Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} ministries
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

              {tab === "applications" && data && (
                <ApplicationsTab
                  organizationId={organizationId}
                  canReviewProposals={data.viewer.canReview}
                  canPropose={data.viewer.canPropose}
                  notify={toast.show}
                  onChanged={reload}
                  openProposal={() => setDialog("propose")}
                />
              )}
              {tab === "activities" && data && <ActivitiesTab organizationId={organizationId} managed={managed} notify={toast.show} onChanged={reload} />}
              {tab === "reports" && data && <ReportsTab organizationId={organizationId} churchName={admin.org?.name ?? "Church"} />}
            </>
          )}
        </div>
        {side}
      </div>

      {dialog === "propose" && (
        <ProposalDialog
          organizationId={organizationId}
          onClose={() => setDialog(null)}
          onDone={(_, submitted) => {
            setDialog(null);
            toast.show("ok", submitted ? "Thank you! Your proposal was sent to church leadership." : "Draft saved. Find it under Applications.");
            reload();
          }}
        />
      )}
      {dialog === "policy" && policy && (
        <PolicyDialog
          organizationId={organizationId}
          policy={policy}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            toast.show("ok", "Ministry permissions saved.");
            reload();
          }}
        />
      )}
      {dialog && typeof dialog === "object" && "wizard" in dialog && (
        <MinistryWizard
          organizationId={organizationId}
          ministryId={dialog.wizard}
          policy={policy ?? null}
          canGovern={Boolean(viewer?.canCreate)}
          onClose={() => setDialog(null)}
          onSaved={(id, published) => {
            const editing = Boolean(dialog.wizard);
            setDialog(null);
            toast.show("ok", editing ? "Ministry saved." : published ? "Ministry created." : "Draft saved.");
            reload();
            if (!editing && published) navigate(ministryPath(id));
          }}
        />
      )}
      {dialog && typeof dialog === "object" && "apply" in dialog && (
        <ApplyDialog
          organizationId={organizationId}
          ministry={dialog.apply}
          onClose={() => setDialog(null)}
          onDone={(approved) => {
            const name = dialog.apply.name;
            setDialog(null);
            toast.show("ok", approved ? `Welcome to ${name}!` : "Application sent. The leaders will review it.");
            reload();
          }}
        />
      )}
      {toast.node}
    </OrgAppShell>
  );
}
