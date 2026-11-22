/**
 * RequestsPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/admin/requests — Requests & Inquiries.
 * Lives under Communication in the admin menu. Every permission is checked on
 * the server; the page only hides what the viewer can't use.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  ChartColumn,
  CircleCheck,
  CircleCheckBig,
  Clock,
  Eye,
  Folder,
  Globe,
  Inbox,
  Layers,
  MailOpen,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  UserPlus,
  UsersRound,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

import { useOrgAdmin } from "../hooks/useOrgAdmin";
import OrgAppShell from "../ui/OrgAppShell";
import { ChurchAuthError } from "../api/organizationApi";
import { errorMessage } from "../ui/orgUi";
import {
  REQUEST_TYPES,
  STATUS_OPTIONS,
  TYPE_LABEL,
  fmtDay,
  fmtTime,
  requestsApi,
  type RequestDetail,
  type RequestList,
  type RequestSort,
  type RequestStaff,
  type RequestStatus,
  type RequestSummary,
  type RequestTab,
} from "./requestsApi";
import { RequesterBadge, RowMenu, RqAvatar, RqToast, StatusPill, TypeLabel } from "./RequestParts";
import RequestDetailsPanel from "./RequestDetailsPanel";
import { AssignDialog, ConfirmDialog, NewRequestDialog, ReportsDialog, RequestWorkspace, StatusDialog, type WorkspaceTab } from "./RequestDialogs";
import "../ui/fockisOrgTheme.scss";
import "./requests.scss";

const TABS: { key: RequestTab; label: string; icon: LucideIcon }[] = [
  { key: "all", label: "All Requests", icon: Inbox },
  { key: "member", label: "Member Requests", icon: UsersRound },
  { key: "public", label: "Public Requests", icon: Globe },
  { key: "mine", label: "My Assigned", icon: UserPlus },
  { key: "archived", label: "Archived", icon: Folder },
];

const SORTS: { value: RequestSort; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "priority", label: "Priority" },
  { value: "updated", label: "Recently Updated" },
];

const WIDE = "(min-width: 1281px)";

function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : true));
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

type Dialog =
  | { kind: "new" }
  | { kind: "reports" }
  | { kind: "workspace"; tab: WorkspaceTab }
  | { kind: "status" }
  | { kind: "assign" }
  | { kind: "delete" }
  | null;

export default function RequestsPage(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const admin = useOrgAdmin(organizationId);
  const [params, setParams] = useSearchParams();
  const wide = useMedia(WIDE);

  const [tab, setTab] = useState<RequestTab>("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<RequestSort>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [list, setList] = useState<RequestList | null>(null);
  const [listError, setListError] = useState<{ text: string; signedOut: boolean; forbidden: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const [staff, setStaff] = useState<RequestStaff | null>(null);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const selectedId = params.get("request");
  const autoSelected = useRef(false);

  const select = useCallback(
    (id: string | null, openDrawer = true) => {
      const p = new URLSearchParams(params);
      if (id) p.set("request", id);
      else p.delete("request");
      setParams(p, { replace: true });
      if (id && openDrawer) setDrawer(true);
    },
    [params, setParams],
  );

  // Debounce the search box.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  // List + stats.
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    requestsApi
      .list(organizationId, { tab, q, type, status, sort, page, pageSize }, c.signal)
      .then((res) => {
        setList(res);
        setListError(null);
        const pages = Math.max(1, Math.ceil(res.total / res.pageSize));
        if (page > pages) setPage(pages);
      })
      .catch((err) => {
        if (c.signal.aborted) return;
        const forbidden = (err as { status?: number })?.status === 403;
        setListError({ text: errorMessage(err, "Requests could not be loaded."), signedOut: err instanceof ChurchAuthError, forbidden });
      })
      .finally(() => !c.signal.aborted && setLoading(false));
    return () => c.abort();
  }, [organizationId, tab, q, type, status, sort, page, pageSize, tick]);

  // People / ministries to assign to.
  useEffect(() => {
    const c = new AbortController();
    requestsApi
      .staff(organizationId, c.signal)
      .then(setStaff)
      .catch(() => undefined);
    return () => c.abort();
  }, [organizationId]);

  // Desktop: show the first request when nothing is selected.
  useEffect(() => {
    if (!wide || selectedId || autoSelected.current || !list?.items.length) return;
    autoSelected.current = true;
    select(list.items[0].id, false);
  }, [wide, selectedId, list, select]);

  // Selected request.
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    const c = new AbortController();
    setDetailLoading(true);
    setDetailError(null);
    requestsApi
      .get(organizationId, selectedId, c.signal)
      .then(setDetail)
      .catch((err) => {
        if (c.signal.aborted) return;
        setDetail(null);
        setDetailError(errorMessage(err, "This request could not be opened."));
      })
      .finally(() => !c.signal.aborted && setDetailLoading(false));
    return () => c.abort();
  }, [organizationId, selectedId]);

  const access = list?.access ?? staff?.access ?? null;
  const refresh = () => setTick((t) => t + 1);
  const notify = (text: string, tone: "ok" | "error" = "ok") => setToast({ text, tone });

  const changed = (r: RequestDetail, message?: string, tone: "ok" | "error" = "ok") => {
    setDetail(r);
    refresh();
    if (message) notify(message, tone);
  };

  const run = async (fn: () => Promise<RequestDetail>, message: string) => {
    setBusy(true);
    try {
      changed(await fn(), message);
    } catch (err) {
      notify(errorMessage(err, "That didn’t work. Please try again."), "error");
    } finally {
      setBusy(false);
    }
  };

  /** Loads a request (if needed) and opens a dialog for it. */
  const openFor = async (id: string, d: NonNullable<Dialog>) => {
    if (detail?.id !== id) {
      select(id, false);
      try {
        setDetail(await requestsApi.get(organizationId, id));
      } catch (err) {
        return notify(errorMessage(err, "This request could not be opened."), "error");
      }
    }
    setDialog(d);
  };

  const quick = async (id: string, fn: (rid: string) => Promise<RequestDetail>, message: string) => {
    select(id, false);
    await run(() => fn(id), message);
  };

  const setStatusOf = (id: string, s: Exclude<RequestStatus, "archived">) =>
    run(() => requestsApi.update(organizationId, id, { status: s }), s === "resolved" ? "Request resolved." : `Status changed to ${STATUS_OPTIONS.find((o) => o.value === s)?.label}.`);

  const stats = list?.stats;
  const statCards: { icon: LucideIcon; value: number | undefined; label: string; tone: string; onClick: () => void }[] = [
    { icon: MailOpen, value: stats?.total, label: "Total requests", tone: "blue", onClick: () => { setTab("all"); setStatus(""); setPage(1); } },
    { icon: CircleCheck, value: stats?.new, label: "New", tone: "green", onClick: () => { setStatus("new"); setPage(1); } },
    { icon: CalendarDays, value: stats?.inProgress, label: "In Progress", tone: "violet", onClick: () => { setStatus("in_progress"); setPage(1); } },
    { icon: CircleCheckBig, value: stats?.resolved, label: "Resolved", tone: "purple", onClick: () => { setStatus("resolved"); setPage(1); } },
    { icon: Clock, value: stats?.overdue, label: "Overdue", tone: "red", onClick: () => { setSort("oldest"); setPage(1); } },
  ];

  const total = list?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, pages - 4));
    return Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);
  }, [page, pages]);

  const rowMenu = (r: RequestSummary) => (
    <RowMenu
      label={`Actions for ${r.subject}`}
      items={[
        { label: "View Details", icon: Eye, onSelect: () => select(r.id) },
        { label: "Assign Request", icon: UserPlus, onSelect: () => void openFor(r.id, { kind: "assign" }), hidden: !access?.canAssign || r.status === "archived" },
        { label: "Change Status", icon: RefreshCw, onSelect: () => void openFor(r.id, { kind: "status" }), hidden: r.status === "archived" },
        { label: "Reply", icon: Send, onSelect: () => void openFor(r.id, { kind: "workspace", tab: "conversation" }), hidden: r.status === "archived" },
        {
          label: "Mark as Resolved",
          icon: CircleCheckBig,
          onSelect: () => void quick(r.id, (id) => requestsApi.update(organizationId, id, { status: "resolved" }), "Request resolved."),
          hidden: r.status === "resolved" || r.status === "archived",
        },
        { label: "Archive", icon: Archive, onSelect: () => void quick(r.id, (id) => requestsApi.archive(organizationId, id), "Request archived."), hidden: !access?.canAssign || r.status === "archived" },
        { label: "Restore", icon: ArchiveRestore, onSelect: () => void quick(r.id, (id) => requestsApi.restore(organizationId, id), "Request restored."), hidden: !access?.canAssign || r.status !== "archived" },
        { label: "Delete", icon: Trash2, danger: true, onSelect: () => void openFor(r.id, { kind: "delete" }), hidden: !access?.canDelete },
      ]}
    />
  );

  const panel = (
    <RequestDetailsPanel
      request={detail}
      loading={detailLoading}
      error={detailError}
      staff={staff}
      access={access}
      busy={busy}
      onOpenWorkspace={(t = "conversation") => detail && setDialog({ kind: "workspace", tab: t })}
      onStatus={(s) => detail && void setStatusOf(detail.id, s)}
      onAssign={(m) => detail && void run(() => requestsApi.update(organizationId, detail.id, { assignedToMembershipId: m }), m ? "Request assigned." : "Assignment removed.")}
      onArchive={() => detail && void run(() => requestsApi.archive(organizationId, detail.id), "Request archived.")}
      onRestore={() => detail && void run(() => requestsApi.restore(organizationId, detail.id), "Request restored.")}
      onClose={wide ? undefined : () => setDrawer(false)}
    />
  );

  const isAdmin = admin.allowed === true;
  const commPath = `/organizations/${encodeURIComponent(organizationId)}/communication`;

  return (
    <OrgAppShell variant={isAdmin ? "admin" : "member"} organization={admin.shellOrg} viewer={admin.shellViewer} activeNavTo={commPath}>
      <div className="rq">
        <div className="rq__main">
          <header className="rq-head">
            <MailOpen className="rq-head__icon" aria-hidden="true" />
            <div className="rq-head__text">
              <h1>Requests &amp; Inquiries</h1>
              <p>All requests from members and people who visit your church online.</p>
            </div>
            <div className="rq-head__actions">
              {access?.canReport && (
                <button type="button" className="rq-btn rq-btn--secondary" onClick={() => setDialog({ kind: "reports" })}>
                  <ChartColumn aria-hidden="true" /> Reports
                </button>
              )}
              {access?.canCreate && (
                <button type="button" className="rq-btn rq-btn--primary rq-btn--lg" onClick={() => setDialog({ kind: "new" })}>
                  <Plus aria-hidden="true" /> New Request
                </button>
              )}
            </div>
          </header>

          {listError && !list ? (
            <section className="rq-card rq-blocked" role="alert">
              <ShieldAlert aria-hidden="true" />
              <h2>{listError.forbidden ? "Staff only" : listError.signedOut ? "Sign in to continue" : "Requests could not be loaded"}</h2>
              <p>{listError.forbidden ? "Requests & Inquiries is for the church’s administrators, pastors and ministry leaders." : listError.text}</p>
              {listError.signedOut ? (
                <Link to="/login" className="rq-btn rq-btn--primary">
                  Sign in
                </Link>
              ) : !listError.forbidden ? (
                <button type="button" className="rq-btn rq-btn--primary" onClick={refresh}>
                  Try again
                </button>
              ) : null}
            </section>
          ) : (
            <>
              <section className="rq-stats" aria-label="Request statistics">
                {statCards.map((s) => (
                  <button key={s.label} type="button" className="rq-stat" onClick={s.onClick}>
                    <span className={`rq-stat__icon rq-stat__icon--${s.tone}`}>
                      <s.icon aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{s.value ?? "–"}</strong>
                      <small>{s.label}</small>
                    </span>
                  </button>
                ))}
              </section>

              <nav className="rq-tabs" aria-label="Request lists" role="tablist">
                {TABS.map((t) => {
                  const count = list?.tabCounts[t.key];
                  return (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={tab === t.key}
                      className={tab === t.key ? "is-on" : ""}
                      onClick={() => {
                        setTab(t.key);
                        setPage(1);
                        setStatus(t.key === "archived" ? "" : status === "archived" ? "" : status);
                      }}
                    >
                      <t.icon aria-hidden="true" />
                      {t.label}
                      {count !== undefined && count > 0 && <span className="rq-tabs__count">{count}</span>}
                    </button>
                  );
                })}
              </nav>

              <div className="rq-filters">
                <label className="rq-search">
                  <Search aria-hidden="true" />
                  <input type="search" placeholder="Search requests (name, email, subject)…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search requests" />
                </label>
                <label className="rq-select">
                  <Layers aria-hidden="true" />
                  <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Request type">
                    <option value="">All Request Types</option>
                    {REQUEST_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rq-select">
                  <CircleCheck aria-hidden="true" />
                  <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rq-select">
                  <ArrowUpDown aria-hidden="true" />
                  <select value={sort} onChange={(e) => { setSort(e.target.value as RequestSort); setPage(1); }} aria-label="Sort">
                    {SORTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <section className={`rq-card rq-list ${loading ? "is-loading" : ""}`} aria-busy={loading}>
                {list && list.items.length === 0 ? (
                  <div className="rq-empty">
                    <Inbox aria-hidden="true" />
                    <strong>{q || type || status ? "No requests match these filters" : tab === "archived" ? "Nothing archived" : tab === "mine" ? "Nothing assigned to you" : "No requests yet"}</strong>
                    <span>
                      {q || type || status
                        ? "Try another search or clear the filters."
                        : "Requests from your church’s Contact form and those you add yourself appear here."}
                    </span>
                    {(q || type || status) && (
                      <button
                        type="button"
                        className="rq-btn rq-btn--secondary"
                        onClick={() => {
                          setSearch("");
                          setType("");
                          setStatus("");
                        }}
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <table className="rq-table">
                      <thead>
                        <tr>
                          <th>Requester</th>
                          <th>Request Type</th>
                          <th>Subject / Message</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th>
                            <span className="rq-sr">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {!list
                          ? Array.from({ length: 5 }).map((_, i) => (
                              <tr key={i} className="rq-skel-row">
                                <td colSpan={6}>
                                  <span className="rq-skel" />
                                </td>
                              </tr>
                            ))
                          : list.items.map((r) => (
                              <tr
                                key={r.id}
                                className={`${selectedId === r.id ? "is-selected" : ""} ${r.priority === "urgent" ? "is-urgent" : ""}`}
                                onClick={() => select(r.id)}
                              >
                                <td>
                                  <div className="rq-requester">
                                    <RqAvatar name={r.requesterName} url={r.avatarUrl} />
                                    <div>
                                      <button type="button" className="rq-requester__name" onClick={(e) => { e.stopPropagation(); select(r.id); }}>
                                        {r.requesterName}
                                      </button>
                                      <RequesterBadge type={r.requesterType} />
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <TypeLabel type={r.requestType} label={TYPE_LABEL[r.requestType]} />
                                </td>
                                <td>
                                  <div className="rq-subject">
                                    <strong>
                                      {r.priority !== "normal" && <span className={`rq-flag rq-flag--${r.priority}`}>{r.priority === "urgent" ? "Urgent" : "High"}</span>}
                                      {r.subject}
                                    </strong>
                                    <span>{r.preview}</span>
                                  </div>
                                </td>
                                <td className="rq-date">
                                  {fmtDay(r.createdAt)}
                                  <span>{fmtTime(r.createdAt)}</span>
                                </td>
                                <td>
                                  <StatusPill status={r.status} overdue={r.overdue} />
                                </td>
                                <td className="rq-actions-cell" onClick={(e) => e.stopPropagation()}>
                                  {rowMenu(r)}
                                </td>
                              </tr>
                            ))}
                      </tbody>
                    </table>

                    <ul className="rq-cards">
                      {(list?.items ?? []).map((r) => (
                        <li key={r.id} className={`${selectedId === r.id ? "is-selected" : ""} ${r.priority === "urgent" ? "is-urgent" : ""}`}>
                          <button type="button" className="rq-cards__main" onClick={() => select(r.id)}>
                            <span className="rq-cards__top">
                              <RqAvatar name={r.requesterName} url={r.avatarUrl} size={40} />
                              <span>
                                <strong>{r.requesterName}</strong>
                                <RequesterBadge type={r.requesterType} />
                              </span>
                              <StatusPill status={r.status} overdue={r.overdue} />
                            </span>
                            <span className="rq-cards__subject">
                              {r.priority !== "normal" && <span className={`rq-flag rq-flag--${r.priority}`}>{r.priority === "urgent" ? "Urgent" : "High"}</span>}
                              {r.subject}
                            </span>
                            <span className="rq-cards__preview">{r.preview}</span>
                            <span className="rq-cards__meta">
                              <TypeLabel type={r.requestType} label={TYPE_LABEL[r.requestType]} />
                              <span>
                                {fmtDay(r.createdAt)} · {fmtTime(r.createdAt)}
                              </span>
                            </span>
                          </button>
                          <div className="rq-cards__menu">{rowMenu(r)}</div>
                        </li>
                      ))}
                    </ul>

                    <footer className="rq-pager">
                      <span>
                        Showing {from}–{to} of {total} requests
                        <label className="rq-pager__size">
                          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} aria-label="Requests per page">
                            {[5, 10, 25, 50].map((n) => (
                              <option key={n} value={n}>
                                {n} per page
                              </option>
                            ))}
                          </select>
                        </label>
                      </span>
                      <nav aria-label="Pages">
                        <button type="button" className="rq-page" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} aria-label="Previous page">
                          <ChevronLeft aria-hidden="true" />
                        </button>
                        {pageNumbers.map((n) => (
                          <button key={n} type="button" className={`rq-page ${n === page ? "is-on" : ""}`} onClick={() => setPage(n)} aria-current={n === page ? "page" : undefined}>
                            {n}
                          </button>
                        ))}
                        <button type="button" className="rq-page" onClick={() => setPage((p) => p + 1)} disabled={page >= pages} aria-label="Next page">
                          <ChevronRight aria-hidden="true" />
                        </button>
                      </nav>
                    </footer>
                  </>
                )}
              </section>
            </>
          )}
        </div>

        {wide ? (
          !listError || list ? panel : null
        ) : (
          drawer &&
          selectedId && (
            <div className="rq-drawer" role="dialog" aria-modal="true" aria-label="Request details" onClick={() => setDrawer(false)}>
              <div className="rq-drawer__sheet" onClick={(e) => e.stopPropagation()}>
                {panel}
              </div>
            </div>
          )
        )}
      </div>

      {dialog?.kind === "new" && (
        <NewRequestDialog
          orgId={organizationId}
          staff={staff}
          onClose={() => setDialog(null)}
          onCreated={(r) => {
            setDialog(null);
            setTab("all");
            setPage(1);
            select(r.id, !wide);
            changed(r, `Request ${r.requestNumber} created.`);
          }}
        />
      )}
      {dialog?.kind === "reports" && <ReportsDialog orgId={organizationId} onClose={() => setDialog(null)} />}
      {dialog?.kind === "workspace" && detail && access && (
        <RequestWorkspace orgId={organizationId} request={detail} staff={staff} access={access} initialTab={dialog.tab} onClose={() => setDialog(null)} onChanged={changed} />
      )}
      {dialog?.kind === "status" && detail && (
        <StatusDialog
          request={detail}
          onClose={() => setDialog(null)}
          onSave={async (s) => {
            await setStatusOf(detail.id, s);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "assign" && detail && (
        <AssignDialog
          request={detail}
          staff={staff}
          onClose={() => setDialog(null)}
          onSave={async (m) => {
            await run(() => requestsApi.update(organizationId, detail.id, { assignedToMembershipId: m }), m ? "Request assigned." : "Assignment removed.");
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "delete" && detail && (
        <ConfirmDialog
          title="Delete request?"
          body={`“${detail.subject}” from ${detail.requesterName} will be deleted with its replies, notes and history. This can’t be undone. Archive it instead if you may need it later.`}
          confirmLabel="Delete permanently"
          danger
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            try {
              await requestsApi.remove(organizationId, detail.id);
              setDialog(null);
              setDetail(null);
              select(null, false);
              autoSelected.current = false;
              refresh();
              notify("Request deleted.");
            } catch (err) {
              notify(errorMessage(err, "The request could not be deleted."), "error");
            }
          }}
        />
      )}
      {toast && <RqToast text={toast.text} tone={toast.tone} onClose={() => setToast(null)} />}
    </OrgAppShell>
  );
}
