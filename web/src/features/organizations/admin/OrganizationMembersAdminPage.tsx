/**
 * OrganizationMembersAdminPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/admin/members — "Manage Members" from the
 * reference design. Uses the organization's own word for its people
 * (Members, Employees, Volunteers, Athletes…).
 *
 *   search · filter by role, status, department (server-side, paginated)
 *   approve / reject applications (also in bulk) · suspend / reactivate
 *   change role · add to a department · view profile and history
 *   export the records you are allowed to see (CSV built by the server)
 *
 * The join link, adding a member by hand and member IDs live on the
 * "Join link & add" tools page (/admin/members/tools), unchanged.
 * Every action is authorized again by the server.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  CircleCheck,
  CircleX,
  Download,
  Ellipsis,
  History,
  Link2,
  Loader2,
  Network,
  Pencil,
  RotateCcw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

import {
  approveMembershipRequest,
  disableMember,
  enableMember,
  listMembers,
  rejectMembershipRequest,
  updateMemberRole,
} from "../api/membersApi";
import { addDepartmentMember, listDepartments } from "../api/departmentsApi";
import { downloadMembersCsv } from "../api/dashboardApi";
import {
  MEMBER_ROLE_LABELS,
  MemberRole,
  MembershipStatus,
  type Department,
  type Member,
} from "../types/organization.types";
import { useOrgAdmin } from "../hooks/useOrgAdmin";
import AdminGate from "../ui/AdminGate";
import { termsFor } from "../ui/orgTerminology";
import { Alert, Avatar, EmptyState, Pagination, Skeleton, StatusBadge, errorMessage, formatDate } from "../ui/orgUi";
import "../styles/OrganizationAdminScreens.scss";

const PAGE_SIZE = 10;
const LEADER_ROLES = new Set<string>([MemberRole.Leader, MemberRole.DepartmentManager, MemberRole.GroupLeader, MemberRole.PastorDirector]);

function roleBadge(role?: string, isOwner?: boolean) {
  if (isOwner) return <span className="fo-badge fo-badge--violet">Owner</span>;
  const label = MEMBER_ROLE_LABELS[role as MemberRole] ?? (role ? role.replace(/_/g, " ") : "Member");
  if (role === MemberRole.Administrator) return <span className="fo-badge fo-badge--violet">{label}</span>;
  if (LEADER_ROLES.has(String(role))) return <span className="fo-badge fo-badge--leader">{label}</span>;
  return <span className="fo-badge">{label}</span>;
}

function RowMenu({
  member,
  departments,
  can,
  busy,
  onAction,
  profileTo,
}: {
  member: Member;
  departments: Department[];
  can: (p: string) => boolean;
  busy: boolean;
  onAction: (kind: string, value?: string) => void;
  profileTo: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const status = member.status;
  const owner = Boolean(member.isOwner);
  const act = (kind: string, value?: string) => {
    setOpen(false);
    onAction(kind, value);
  };

  return (
    <div className="fo-menu" ref={ref}>
      <button
        type="button"
        className="fo-iconbtn"
        aria-label={`More actions for ${member.profile?.displayName ?? "member"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
      >
        {busy ? <Loader2 className="fo-spin" aria-hidden="true" /> : <Ellipsis aria-hidden="true" />}
      </button>
      {open && (
        <div className="fo-menu__list" role="menu">
          <Link to={profileTo} className="fo-menu__item" role="menuitem">
            <History aria-hidden="true" /> Profile &amp; history
          </Link>
          {status === MembershipStatus.Pending && can("approve_member") && (
            <button type="button" className="fo-menu__item" role="menuitem" onClick={() => act("approve")}>
              <CircleCheck aria-hidden="true" /> Approve application
            </button>
          )}
          {status === MembershipStatus.Pending && can("reject_member") && (
            <button type="button" className="fo-menu__item fo-menu__item--danger" role="menuitem" onClick={() => act("reject")}>
              <CircleX aria-hidden="true" /> Reject application
            </button>
          )}
          {status === MembershipStatus.Active && !owner && can("update_member") && (
            <button type="button" className="fo-menu__item fo-menu__item--danger" role="menuitem" onClick={() => act("suspend")}>
              <Ban aria-hidden="true" /> Suspend membership
            </button>
          )}
          {status === MembershipStatus.Inactive && can("update_member") && (
            <button type="button" className="fo-menu__item" role="menuitem" onClick={() => act("reactivate")}>
              <RotateCcw aria-hidden="true" /> Reactivate membership
            </button>
          )}
          {!owner && status === MembershipStatus.Active && can("manage_administrators") && (
            <>
              <div className="fo-menu__sep" />
              <label className="fo-menu__item">
                <ShieldCheck aria-hidden="true" />
                <select
                  className="fo-select fo-menu__select"
                  value={member.role}
                  onChange={(e) => act("role", e.target.value)}
                  aria-label="Assign role"
                >
                  {Object.values(MemberRole).map((r) => (
                    <option key={r} value={r}>
                      Role: {MEMBER_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {status === MembershipStatus.Active && departments.length > 0 && can("manage_departments") && (
            <label className="fo-menu__item">
              <Network aria-hidden="true" />
              <select className="fo-select fo-menu__select" value="" onChange={(e) => e.target.value && act("department", e.target.value)} aria-label="Add to department">
                <option value="">Add to department…</option>
                {departments
                  .filter((d) => !(member.departmentIds ?? []).includes(d.id))
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrganizationMembersAdminPage(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const state = useOrgAdmin(organizationId);
  const [params, setParams] = useSearchParams();

  const search = params.get("search") ?? "";
  const role = params.get("role") ?? "";
  const status = params.get("status") ?? "";
  const departmentId = params.get("department") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [query, setQuery] = useState(search);
  const [items, setItems] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => setQuery(search), [search]);

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  // debounce typing into the search box
  useEffect(() => {
    if (query === search) return;
    const timer = window.setTimeout(() => setParam("search", query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query, search, setParam]);

  useEffect(() => {
    if (!state.allowed) return;
    const controller = new AbortController();
    listDepartments(organizationId, { page: 1, pageSize: 100 }, controller.signal)
      .then((r) => !controller.signal.aborted && setDepartments(Array.isArray(r?.items) ? r.items : []))
      .catch(() => undefined);
    return () => controller.abort();
  }, [organizationId, state.allowed]);

  useEffect(() => {
    if (!state.allowed) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listMembers(
      organizationId,
      {
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        role: (role || undefined) as MemberRole | undefined,
        status: (status || undefined) as MembershipStatus | undefined,
        departmentId: departmentId || undefined,
      },
      controller.signal,
    )
      .then((r) => {
        if (controller.signal.aborted) return;
        setItems(Array.isArray(r?.items) ? r.items : []);
        setTotal(Number(r?.total) || 0);
        setSelected(new Set());
      })
      .catch((err) => !controller.signal.aborted && setError(errorMessage(err, "Members could not be loaded.")))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [organizationId, state.allowed, page, search, role, status, departmentId, tick]);

  const departmentName = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);
  const p = (s = "") => `/organizations/${encodeURIComponent(organizationId)}${s}`;

  async function runAction(member: Member, kind: string, value?: string) {
    const name = member.profile?.displayName ?? "this member";
    if (kind === "reject" && !window.confirm(`Reject ${name}'s application?`)) return;
    if (kind === "suspend" && !window.confirm(`Suspend ${name}'s membership? They keep their history and can be reactivated.`)) return;
    setBusyId(member.id);
    setNotice(null);
    try {
      if (kind === "approve") await approveMembershipRequest(organizationId, member.id);
      else if (kind === "reject") await rejectMembershipRequest(organizationId, member.id);
      else if (kind === "suspend") await disableMember(organizationId, member.id);
      else if (kind === "reactivate") await enableMember(organizationId, member.id);
      else if (kind === "role" && value) await updateMemberRole(organizationId, member.id, value as MemberRole);
      else if (kind === "department" && value) await addDepartmentMember(organizationId, value, member.id);
      const done: Record<string, string> = {
        approve: `${name} was approved.`,
        reject: `${name}'s application was rejected.`,
        suspend: `${name}'s membership was suspended.`,
        reactivate: `${name}'s membership was reactivated.`,
        role: `${name}'s role was updated.`,
        department: `${name} was added to ${departmentName.get(value ?? "") ?? "the department"}.`,
      };
      setNotice({ tone: "ok", text: done[kind] ?? "Saved." });
      setTick((x) => x + 1);
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err, "That change could not be saved.") });
    } finally {
      setBusyId(null);
    }
  }

  async function bulk(kind: "approve" | "reject") {
    const targets = items.filter((m) => selected.has(m.id) && m.status === MembershipStatus.Pending);
    if (!targets.length) return;
    if (kind === "reject" && !window.confirm(`Reject ${targets.length} application(s)?`)) return;
    setBulkBusy(true);
    const results = await Promise.allSettled(
      targets.map((m) => (kind === "approve" ? approveMembershipRequest(organizationId, m.id) : rejectMembershipRequest(organizationId, m.id))),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - ok;
    setNotice({
      tone: failed ? "error" : "ok",
      text: `${ok} application(s) ${kind === "approve" ? "approved" : "rejected"}${failed ? `, ${failed} could not be changed` : ""}.`,
    });
    setBulkBusy(false);
    setTick((x) => x + 1);
  }

  async function exportCsv() {
    setExporting(true);
    setNotice(null);
    try {
      await downloadMembersCsv(organizationId, { search, role, status, departmentId });
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err, "The export failed.") });
    } finally {
      setExporting(false);
    }
  }

  return (
    <AdminGate state={state} organizationId={organizationId} returnTo={p("/admin/members")}>
      {() => {
        const t = termsFor(state.org?.organizationType);
        const can = state.can;
        const selectablePending = items.filter((m) => m.status === MembershipStatus.Pending);
        const selectedPending = selectablePending.filter((m) => selected.has(m.id)).length;
        const allChecked = items.length > 0 && items.every((m) => selected.has(m.id));
        const filtered = Boolean(search || role || status || departmentId);

        return (
          <>
            <nav className="fo-crumbs" aria-label="Breadcrumb">
              <Link to={p("/admin")}>
                <ArrowLeft aria-hidden="true" /> Admin
              </Link>
              <span aria-hidden="true">›</span>
              <strong>{t.people}</strong>
            </nav>

            <div className="fo-pagehead">
              <div>
                <h1>{t.people}</h1>
                <p>Manage your organization {t.people.toLowerCase()}, roles, and status.</p>
              </div>
              <div className="fo-pagehead__actions">
                {can("view_members") && (
                  <button type="button" className="fo-btn fo-btn--secondary" onClick={exportCsv} disabled={exporting}>
                    {exporting ? <Loader2 className="fo-spin" aria-hidden="true" /> : <Download aria-hidden="true" />} Export
                  </button>
                )}
                <Link to={p("/admin/members/tools#invite")} className="fo-btn fo-btn--secondary">
                  <Link2 aria-hidden="true" /> Invite
                </Link>
                {can("add_member") && (
                  <Link to={p("/admin/members/tools#add")} className="fo-btn fo-btn--primary">
                    <UserPlus aria-hidden="true" /> Add {t.person}
                  </Link>
                )}
              </div>
            </div>

            {notice && <Alert tone={notice.tone === "ok" ? "ok" : "error"}>{notice.text}</Alert>}

            <div className="fo-toolbar">
              <label className="fo-search">
                <span className="fo-sr">Search {t.people.toLowerCase()}</span>
                <Search aria-hidden="true" />
                <input className="fo-input" type="search" placeholder={`Search ${t.people.toLowerCase()}...`} value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
              <select className="fo-select" value={role} onChange={(e) => setParam("role", e.target.value)} aria-label="Filter by role">
                <option value="">All Roles</option>
                {Object.values(MemberRole).map((r) => (
                  <option key={r} value={r}>
                    {MEMBER_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <select className="fo-select" value={status} onChange={(e) => setParam("status", e.target.value)} aria-label="Filter by status">
                <option value="">All Status</option>
                <option value={MembershipStatus.Active}>Active</option>
                <option value={MembershipStatus.Pending}>Pending applications</option>
                <option value={MembershipStatus.Inactive}>Suspended</option>
                <option value={MembershipStatus.Archived}>Rejected / archived</option>
              </select>
              {departments.length > 0 && (
                <select className="fo-select" value={departmentId} onChange={(e) => setParam("department", e.target.value)} aria-label={`Filter by ${t.department.toLowerCase()}`}>
                  <option value="">All {t.departments}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedPending > 0 && (
              <div className="foa-bulk" role="region" aria-label="Bulk actions">
                <span>{selectedPending} application(s) selected</span>
                {can("approve_member") && (
                  <button type="button" className="fo-btn fo-btn--primary fo-btn--sm" disabled={bulkBusy} onClick={() => bulk("approve")}>
                    <CircleCheck aria-hidden="true" /> Approve
                  </button>
                )}
                {can("reject_member") && (
                  <button type="button" className="fo-btn fo-btn--danger fo-btn--sm" disabled={bulkBusy} onClick={() => bulk("reject")}>
                    <CircleX aria-hidden="true" /> Reject
                  </button>
                )}
              </div>
            )}

            {error && (
              <Alert>
                {error}{" "}
                <button type="button" className="fo-btn fo-btn--ghost fo-btn--sm" onClick={() => setTick((x) => x + 1)}>
                  Try again
                </button>
              </Alert>
            )}

            <div className="fo-card fo-card--flush">
              <div className="fo-tablewrap">
                <table className="fo-table">
                  <thead>
                    <tr>
                      <th className="fo-table__check">
                        <input
                          type="checkbox"
                          className="foa-check"
                          aria-label="Select all on this page"
                          checked={allChecked}
                          onChange={(e) => setSelected(e.target.checked ? new Set(items.map((m) => m.id)) : new Set())}
                        />
                      </th>
                      <th>{t.person}</th>
                      <th>Role</th>
                      <th>{t.department}</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th className="fo-table__actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody aria-busy={loading}>
                    {loading && items.length === 0
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={7}>
                              <Skeleton height={36} />
                            </td>
                          </tr>
                        ))
                      : items.map((m) => {
                          const profileTo = p(`/members/${encodeURIComponent(m.id)}`);
                          const deps = (m.departmentIds ?? []).map((id) => departmentName.get(id)).filter(Boolean) as string[];
                          const email = m.profile?.email ?? m.privateProfile?.email ?? null;
                          const joined = m.joinedAt ?? (m.status === MembershipStatus.Pending ? null : m.createdAt);
                          return (
                            <tr key={m.id}>
                              <td>
                                <input
                                  type="checkbox"
                                  className="foa-check"
                                  aria-label={`Select ${m.profile?.displayName ?? "member"}`}
                                  checked={selected.has(m.id)}
                                  onChange={(e) =>
                                    setSelected((s) => {
                                      const next = new Set(s);
                                      if (e.target.checked) next.add(m.id);
                                      else next.delete(m.id);
                                      return next;
                                    })
                                  }
                                />
                              </td>
                              <td>
                                <Link to={profileTo} className="fo-person">
                                  <Avatar name={m.profile?.displayName} url={m.profile?.avatarUrl} />
                                  <span>
                                    <span className="fo-person__name">{m.profile?.displayName ?? t.person}</span>
                                    {email && (
                                      <>
                                        <br />
                                        <span className="fo-person__sub">{email}</span>
                                      </>
                                    )}
                                  </span>
                                </Link>
                              </td>
                              <td>{roleBadge(m.role, m.isOwner)}</td>
                              <td>{deps.length ? deps.join(", ") : <span className="fo-muted">—</span>}</td>
                              <td>
                                <StatusBadge status={m.status} />
                              </td>
                              <td>{joined ? formatDate(joined) : <span className="fo-muted">—</span>}</td>
                              <td className="fo-table__actions">
                                <span className="foa-rowactions">
                                  {m.status === MembershipStatus.Pending && can("approve_member") && (
                                    <button type="button" className="fo-btn fo-btn--primary fo-btn--sm" disabled={busyId === m.id} onClick={() => void runAction(m, "approve")}>
                                      Approve
                                    </button>
                                  )}
                                  <Link to={profileTo} className="fo-iconbtn" aria-label={`Open ${m.profile?.displayName ?? "member"}`}>
                                    <Pencil aria-hidden="true" />
                                  </Link>
                                  <RowMenu
                                    member={m}
                                    departments={departments}
                                    can={can}
                                    busy={busyId === m.id}
                                    onAction={(kind, value) => void runAction(m, kind, value)}
                                    profileTo={profileTo}
                                  />
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>

              {!loading && items.length === 0 && !error && (
                <EmptyState
                  icon={Users}
                  title={filtered ? `No ${t.people.toLowerCase()} match these filters` : `No ${t.people.toLowerCase()} yet`}
                  text={filtered ? "Try a different search or clear the filters." : "Share your join link or add people by hand."}
                >
                  {filtered ? (
                    <button type="button" className="fo-btn fo-btn--secondary" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                      Clear filters
                    </button>
                  ) : (
                    <Link to={p("/admin/members/tools#invite")} className="fo-btn fo-btn--primary">
                      Invite {t.people.toLowerCase()}
                    </Link>
                  )}
                </EmptyState>
              )}

              <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={(n) => setParam("page", String(n))} noun={t.people.toLowerCase()} />
            </div>
          </>
        );
      }}
    </AdminGate>
  );
}
