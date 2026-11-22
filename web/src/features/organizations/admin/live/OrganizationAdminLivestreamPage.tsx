/**
 * OrganizationAdminLivestreamPage.tsx — Livestream management
 * Route: /organizations/:organizationId/admin/live
 * -----------------------------------------------------------------------------
 * Uses /church/organizations/:organizationId/live (apps/api/src/org/live).
 * The old page called a non-existent /church/livestreams endpoint without the
 * organization id ("Cannot GET /church/livestreams").
 *
 * Tabs: Livestreams · Scheduled · Past Streams · Analytics.
 * Statistics come from GET …/live/stats; while it loads or fails the cards
 * show a placeholder or an error, never zeros.
 * -----------------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  BarChart3,
  Ban,
  CalendarDays,
  Clock,
  Copy,
  ExternalLink,
  Film,
  Layers,
  LayoutGrid,
  List,
  MailPlus,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  Square,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";

import OrgAppShell from "../../ui/OrgAppShell";
import { useOrgAdmin } from "../../hooks/useOrgAdmin";
import { mediaUrl } from "../../api/dashboardApi";
import { errorMessage } from "../../ui/orgUi";
import { termsFor } from "../../ui/orgTerminology";
import { hasBanner } from "../../branding/PageBrandingParts";
import { pageKeyFromPath } from "../../branding/pageBrandingApi";
import { usePageBranding } from "../../branding/usePageBranding";
import { validZone } from "../../events-center/zonedTime";
import { liveApi, watchUrl, type LivePage, type LiveStats, type LiveStatus, type LiveVisibility, type Livestream } from "../../live-center/liveApi";
import { formatCount, StatusBadge, streamWhen, Thumb, VisibilityBadge } from "../../live-center/liveParts";
import SchedulePanel from "../../live-center/SchedulePanel";
import InvitationsDialog from "../../live-center/InvitationsDialog";
import { AttendanceDialog, LiveAnalyticsTab } from "../../live-center/LiveAnalytics";
import "../../live-center/liveCenter.scss";

type Tab = "all" | "scheduled" | "past" | "analytics";
const PAGE_SIZE = 10;

type Confirm = { kind: "start" | "end" | "cancel" | "delete" | "archive"; stream: Livestream };

const VISIBILITY_FILTERS: { value: "" | LiveVisibility; label: string }[] = [
  { value: "", label: "All" },
  { value: "public", label: "Public" },
  { value: "members", label: "Members Only" },
  { value: "private", label: "Private" },
  { value: "groups", label: "Selected Groups" },
];

const STATUS_FILTERS: { value: "" | LiveStatus | "archived"; label: string }[] = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "waiting", label: "Waiting for Host" },
  { value: "live", label: "Live Now" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "failed", label: "Failed" },
  { value: "archived", label: "Archived" },
];

export default function OrganizationAdminLivestreamPage(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const admin = useOrgAdmin(organizationId);
  const branding = usePageBranding(organizationId);
  const org = admin.org;
  const terms = termsFor(org?.organizationType ? String(org.organizationType) : "");
  const navTo = `/organizations/${encodeURIComponent(organizationId)}/admin/live`;
  const customBanner = hasBanner(branding.publishedFor(pageKeyFromPath(navTo, organizationId)));

  const [tab, setTab] = useState<Tab>(() => {
    const h = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    return h === "scheduled" || h === "past" || h === "analytics" ? h : "all";
  });
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [list, setList] = useState<LivePage | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<"" | LiveVisibility>("");
  const [status, setStatus] = useState<"" | LiveStatus | "archived">("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [panel, setPanel] = useState<{ editing: Livestream | null } | null>(null);
  const [invites, setInvites] = useState<Livestream | null>(null);
  const [attendance, setAttendance] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const notify = useCallback((tone: "ok" | "error", text: string) => setToast({ tone, text }), []);
  const defaultZone = validZone(null);

  useEffect(() => {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${tab}`);
  }, [tab]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Statistics (refreshed every 30 s while the page is open).
  useEffect(() => {
    if (!organizationId) return;
    const controller = new AbortController();
    const load = () =>
      liveApi
        .stats(organizationId, controller.signal)
        .then((s) => {
          setStats(s);
          setStatsError(null);
        })
        .catch((err) => !controller.signal.aborted && setStatsError(errorMessage(err, "Statistics could not be loaded.")));
    void load();
    const timer = window.setInterval(load, 30000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [organizationId, tick]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!organizationId || tab === "analytics") return;
    const controller = new AbortController();
    setLoading(true);
    liveApi
      .list(
        organizationId,
        {
          tab: status === "archived" ? "archived" : tab,
          search: query || undefined,
          visibility: visibility || undefined,
          status: status && status !== "archived" ? status : undefined,
          page,
          pageSize: PAGE_SIZE,
        },
        controller.signal,
      )
      .then((l) => {
        setList(l);
        setListError(null);
      })
      .catch((err) => !controller.signal.aborted && setListError(errorMessage(err, "Livestreams could not be loaded.")))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [organizationId, tab, query, visibility, status, page, tick]);

  // ?invitations=<id> (from an access-request notification) opens Manage Invitations.
  useEffect(() => {
    const id = params.get("invitations");
    if (!id || !organizationId) return;
    liveApi
      .get(organizationId, id)
      .then(setInvites)
      .catch(() => undefined)
      .finally(() => {
        params.delete("invitations");
        setParams(params, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function start(s: Livestream) {
    setBusy(s.id);
    try {
      const res = await liveApi.setState(organizationId, s.id, "live");
      notify("ok", `"${s.title}" is live.`);
      reload();
      if (res.watch?.studioUrl) navigate(res.watch.studioUrl);
    } catch (err) {
      notify("error", errorMessage(err, "The livestream could not be started."));
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  async function runConfirm(c: Confirm) {
    if (c.kind === "start") return start(c.stream);
    setBusy(c.stream.id);
    try {
      if (c.kind === "end") await liveApi.setState(organizationId, c.stream.id, "ended");
      else if (c.kind === "cancel") await liveApi.setState(organizationId, c.stream.id, "cancelled");
      else if (c.kind === "delete") await liveApi.remove(organizationId, c.stream.id);
      else await liveApi.archive(organizationId, c.stream.id, !c.stream.isArchived);
      notify(
        "ok",
        c.kind === "end"
          ? `"${c.stream.title}" has ended.`
          : c.kind === "cancel"
            ? `"${c.stream.title}" was cancelled.`
            : c.kind === "delete"
              ? `"${c.stream.title}" was deleted.`
              : c.stream.isArchived
                ? `"${c.stream.title}" was restored.`
                : `"${c.stream.title}" was archived.`,
      );
      setConfirm(null);
      reload();
    } catch (err) {
      notify("error", errorMessage(err, "That didn't work. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  async function copyLink(s: Livestream) {
    const url = watchUrl(organizationId, s.id);
    try {
      await navigator.clipboard.writeText(url);
      notify("ok", "Link copied. It only works for people allowed to watch.");
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  const items = list?.items ?? [];
  const pages = list ? Math.max(1, Math.ceil(list.total / PAGE_SIZE)) : 1;
  const cover = org?.bannerUrl ? mediaUrl(org.bannerUrl) : null;

  const statCards = [
    { k: "live", label: "Currently Live", value: stats?.currentlyLive, icon: Radio, tone: "red" as const },
    { k: "scheduled", label: "Scheduled", value: stats?.scheduled, icon: CalendarDays, tone: "blue" as const },
    { k: "viewers", label: "Current Viewers", value: stats?.currentViewers, icon: Users, tone: "blue" as const },
    { k: "past", label: "Previous Streams", value: stats?.previousStreams, icon: Video, tone: "blue" as const },
  ];

  const actions = {
    onStart: (s: Livestream) => setConfirm({ kind: "start", stream: s }),
    onEdit: (s: Livestream) => setPanel({ editing: s }),
    onInvites: (s: Livestream) => setInvites(s),
    onAttendance: (s: Livestream) => setAttendance(s.id),
    onConfirm: (kind: Confirm["kind"], s: Livestream) => setConfirm({ kind, stream: s }),
    onCopy: copyLink,
  };

  return (
    <OrgAppShell variant="admin" organization={admin.shellOrg} viewer={admin.shellViewer} activeNavTo={navTo}>
      <div className={`lv${panel ? " has-panel" : ""}`}>
        {toast && (
          <div className={`lv-toast lv-toast--${toast.tone}`} role="status">
            {toast.text}
            <button type="button" aria-label="Dismiss" onClick={() => setToast(null)}>
              <X />
            </button>
          </div>
        )}

        {!customBanner && (
          <header className="lv-hero">
            {cover && <div className="lv-hero__photo" style={{ backgroundImage: `url("${cover.replace(/"/g, "%22")}")` }} aria-hidden="true" />}
            <span className="lv-hero__icon" aria-hidden="true">
              <Radio />
            </span>
            <div className="lv-hero__text">
              <span className="lv-hero__eyebrow">
                <i aria-hidden="true" /> Admin console
              </span>
              <h1>Livestream</h1>
              <p>Manage live services, broadcasts, and online gatherings for your organization.</p>
            </div>
          </header>
        )}

        <div className="lv-layout">
          <div className="lv-main">
            <nav className="lv-tabs" role="tablist" aria-label="Livestream views">
              {(
                [
                  { id: "all", label: "Livestreams", icon: Radio },
                  { id: "scheduled", label: "Scheduled", icon: CalendarDays },
                  { id: "past", label: "Past Streams", icon: Film },
                  { id: "analytics", label: "Analytics", icon: BarChart3 },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={tab === t.id ? "is-on" : ""}
                  onClick={() => {
                    setTab(t.id);
                    setPage(1);
                    setStatus("");
                  }}
                >
                  <t.icon aria-hidden="true" /> {t.label}
                </button>
              ))}
            </nav>

            <div className="lv-stats" aria-live="polite">
              {statCards.map((c) => (
                <div key={c.k} className="lv-stat">
                  <span className={`lv-stat__icon lv-stat__icon--${c.tone}`}>
                    <c.icon aria-hidden="true" />
                  </span>
                  <div>
                    <span className="lv-stat__label">{c.label}</span>
                    {statsError ? (
                      <span className="lv-stat__error" title={statsError}>
                        Unavailable
                      </span>
                    ) : c.value === undefined ? (
                      <span className="lv-skeleton lv-skeleton--num" aria-label="Loading" />
                    ) : (
                      <strong>{formatCount(c.value)}</strong>
                    )}
                    {c.k === "live" && (stats?.currentlyLive ?? 0) > 0 && (
                      <span className="lv-livepill">
                        <i /> Live Now
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {statsError && (
              <div className="lv-alert lv-alert--error">
                {statsError}{" "}
                <button type="button" className="lv-link-btn" onClick={reload}>
                  Try again
                </button>
              </div>
            )}

            {tab === "analytics" ? (
              <LiveAnalyticsTab organizationId={organizationId} />
            ) : (
              <section className="lv-card">
                <header className="lv-card__head">
                  <div className="lv-card__title">
                    <Radio aria-hidden="true" />
                    <div>
                      <h2>{tab === "scheduled" ? "Scheduled" : tab === "past" ? "Past Streams" : "Livestreams"}</h2>
                      <p>Create, schedule, and manage your live broadcasts.</p>
                    </div>
                  </div>
                  <div className="lv-card__actions">
                    <Link className="lv-btn lv-btn--outline" to={`/organizations/${encodeURIComponent(organizationId)}/live`} target="_blank">
                      <ExternalLink aria-hidden="true" /> View Public Livestreams
                    </Link>
                    <button type="button" className="lv-btn lv-btn--primary" onClick={() => setPanel({ editing: null })}>
                      <Plus aria-hidden="true" /> Schedule Livestream
                    </button>
                  </div>
                </header>

                <div className="lv-filters">
                  <div className="lv-input-icon lv-search">
                    <Search aria-hidden="true" />
                    <input type="search" value={search} placeholder="Search livestreams…" aria-label="Search livestreams" onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <div className="lv-viewtoggle" role="group" aria-label="View">
                    <button type="button" aria-pressed={view === "list"} className={view === "list" ? "is-on" : ""} aria-label="List view" onClick={() => setView("list")}>
                      <List />
                    </button>
                    <button type="button" aria-pressed={view === "grid"} className={view === "grid" ? "is-on" : ""} aria-label="Grid view" onClick={() => setView("grid")}>
                      <LayoutGrid />
                    </button>
                  </div>
                </div>

                <div className="lv-chipfilters">
                  <div className="lv-chipfilter">
                    <span className="lv-chipfilter__label" id="lv-vis-label">
                      <ShieldCheck aria-hidden="true" /> Visibility
                    </span>
                    <div className="lv-fchips" role="group" aria-labelledby="lv-vis-label">
                      {VISIBILITY_FILTERS.map((o) => (
                        <button
                          key={o.value || "all"}
                          type="button"
                          className={`lv-fchip${visibility === o.value ? " is-on" : ""}`}
                          aria-pressed={visibility === o.value}
                          onClick={() => {
                            setVisibility(o.value);
                            setPage(1);
                          }}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="lv-chipfilter">
                    <span className="lv-chipfilter__label" id="lv-status-label">
                      <Layers aria-hidden="true" /> Status
                    </span>
                    <div className="lv-fchips" role="group" aria-labelledby="lv-status-label">
                      {STATUS_FILTERS.map((o) => (
                        <button
                          key={o.value || "all"}
                          type="button"
                          className={`lv-fchip${status === o.value ? " is-on" : ""}`}
                          aria-pressed={status === o.value}
                          onClick={() => {
                            setStatus(o.value);
                            setPage(1);
                          }}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {listError ? (
                  <div className="lv-alert lv-alert--error">
                    {listError}{" "}
                    <button type="button" className="lv-link-btn" onClick={reload}>
                      Try again
                    </button>
                  </div>
                ) : loading && !list ? (
                  <div className="lv-rows-skeleton">
                    {Array.from({ length: 4 }, (_, i) => (
                      <div key={i} className="lv-skeleton lv-skeleton--row" />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <div className="lv-empty lv-empty--big">
                    <Radio aria-hidden="true" />
                    <strong>{query || visibility || status ? "No livestreams match your filters." : tab === "past" ? "No past livestreams yet." : "No livestreams yet."}</strong>
                    {!query && !visibility && !status && tab !== "past" && (
                      <button type="button" className="lv-btn lv-btn--primary lv-btn--sm" onClick={() => setPanel({ editing: null })}>
                        <Plus aria-hidden="true" /> Schedule your first livestream
                      </button>
                    )}
                  </div>
                ) : view === "list" ? (
                  <div className={`lv-table-wrap${loading ? " is-loading" : ""}`}>
                    <table className="lv-table lv-streams">
                      <thead>
                        <tr>
                          <th scope="col">Livestream</th>
                          <th scope="col">Date &amp; Time</th>
                          <th scope="col">Visibility</th>
                          <th scope="col">Status</th>
                          <th scope="col">Viewers</th>
                          <th scope="col">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((s) => (
                          <StreamRow key={s.id} s={s} organizationId={organizationId} busy={busy === s.id} {...actions} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={`lv-grid${loading ? " is-loading" : ""}`}>
                    {items.map((s) => (
                      <StreamCard key={s.id} s={s} organizationId={organizationId} busy={busy === s.id} {...actions} />
                    ))}
                  </div>
                )}

                {list && list.total > PAGE_SIZE && (
                  <nav className="lv-pager" aria-label="Pages">
                    <button type="button" className="lv-btn lv-btn--ghost lv-btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Previous
                    </button>
                    <span>
                      Page {page} of {pages} · {list.total} livestreams
                    </span>
                    <button type="button" className="lv-btn lv-btn--ghost lv-btn--sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                      Next
                    </button>
                  </nav>
                )}
              </section>
            )}
          </div>

          {panel && (
            <SchedulePanel
              key={panel.editing?.id ?? "new"}
              organizationId={organizationId}
              editing={panel.editing}
              defaultZone={defaultZone}
              departmentsLabel={terms.departments}
              onClose={() => setPanel(null)}
              onSaved={(s, how) => {
                setPanel(null);
                notify("ok", how === "draft" ? `"${s.title}" saved as a draft.` : how === "created" ? `"${s.title}" was scheduled.` : `"${s.title}" was saved.`);
                reload();
                if (how === "created" && s.visibility === "private") setInvites(s);
              }}
            />
          )}
        </div>
      </div>

      {invites && (
        <InvitationsDialog
          organizationId={organizationId}
          stream={invites}
          onClose={() => setInvites(null)}
          onStreamChanged={(s) => {
            setInvites(s);
            reload();
          }}
        />
      )}
      {attendance && <AttendanceDialog organizationId={organizationId} liveId={attendance} onClose={() => setAttendance(null)} />}
      {confirm && <ConfirmDialog c={confirm} busy={busy === confirm.stream.id} onClose={() => setConfirm(null)} onConfirm={() => runConfirm(confirm)} />}
    </OrgAppShell>
  );
}

/* ------------------------------------------------------------------- rows */

interface RowProps {
  s: Livestream;
  organizationId: string;
  busy: boolean;
  onStart: (s: Livestream) => void;
  onEdit: (s: Livestream) => void;
  onInvites: (s: Livestream) => void;
  onAttendance: (s: Livestream) => void;
  onConfirm: (kind: Confirm["kind"], s: Livestream) => void;
  onCopy: (s: Livestream) => void;
}

function PrimaryAction({ s, organizationId, busy, onStart, onEdit }: RowProps) {
  const watch = `/organizations/${encodeURIComponent(organizationId)}/live/${encodeURIComponent(s.id)}`;
  if (s.isArchived) return null;
  if (s.status === "live") {
    return s.sourceType === "fockis_live" && s.liveStreamId ? (
      <Link className="lv-btn lv-btn--primary lv-btn--sm" to={`/live/studio/${encodeURIComponent(s.liveStreamId)}`}>
        <Play aria-hidden="true" /> Open Studio
      </Link>
    ) : (
      <Link className="lv-btn lv-btn--primary lv-btn--sm" to={watch}>
        <Play aria-hidden="true" /> Watch Live
      </Link>
    );
  }
  if (s.status === "scheduled" || s.status === "waiting" || s.status === "failed") {
    return (
      <button type="button" className="lv-btn lv-btn--primary lv-btn--sm" disabled={busy} onClick={() => onStart(s)}>
        <Play aria-hidden="true" /> Start
      </button>
    );
  }
  if (s.status === "completed" && s.sourceType === "fockis_live" && s.liveStreamId && s.settings.allowReplay) {
    return (
      <Link className="lv-btn lv-btn--outline lv-btn--sm" to={`${watch}?replay=1`}>
        <Video aria-hidden="true" /> View Recording
      </Link>
    );
  }
  if (s.status === "draft") {
    return (
      <button type="button" className="lv-btn lv-btn--outline lv-btn--sm" onClick={() => onEdit(s)}>
        Publish…
      </button>
    );
  }
  return null;
}

function RowMenu(props: RowProps) {
  const { s, organizationId, onEdit, onInvites, onAttendance, onConfirm, onCopy } = props;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
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
  const watch = `/organizations/${encodeURIComponent(organizationId)}/live/${encodeURIComponent(s.id)}`;
  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  const upcoming = s.status === "scheduled" || s.status === "waiting" || s.status === "draft";
  return (
    <div className="lv-menu" ref={ref}>
      <button type="button" className="lv-icon-btn lv-icon-btn--box" aria-haspopup="menu" aria-expanded={open} aria-label={`More actions for ${s.title}`} onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal />
      </button>
      {open && (
        <div className="lv-menu__pop" role="menu">
          <Link role="menuitem" to={watch}>
            <Play aria-hidden="true" /> Watch / preview
          </Link>
          {s.status !== "draft" && (
            <button type="button" role="menuitem" onClick={pick(() => onCopy(s))}>
              <Copy aria-hidden="true" /> Copy Link
            </button>
          )}
          <button type="button" role="menuitem" onClick={pick(() => onInvites(s))}>
            <MailPlus aria-hidden="true" /> Manage Invitations
          </button>
          <button type="button" role="menuitem" onClick={pick(() => onAttendance(s))}>
            <BarChart3 aria-hidden="true" /> View Analytics
          </button>
          {s.status === "completed" && s.liveStreamId && s.settings.allowReplay && (
            <Link role="menuitem" to={`${watch}?replay=1`}>
              <Film aria-hidden="true" /> View Recording
            </Link>
          )}
          {!s.isArchived && s.status !== "completed" && s.status !== "cancelled" && (
            <button type="button" role="menuitem" onClick={pick(() => onEdit(s))}>
              <Pencil aria-hidden="true" /> Edit
            </button>
          )}
          {s.status === "live" && (
            <button type="button" role="menuitem" className="is-danger" onClick={pick(() => onConfirm("end", s))}>
              <Square aria-hidden="true" /> End livestream
            </button>
          )}
          {(upcoming || s.status === "live") && (
            <button type="button" role="menuitem" className="is-danger" onClick={pick(() => onConfirm("cancel", s))}>
              <Ban aria-hidden="true" /> Cancel livestream
            </button>
          )}
          {s.status !== "live" && (
            <button type="button" role="menuitem" onClick={pick(() => onConfirm("archive", s))}>
              {s.isArchived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />} {s.isArchived ? "Restore" : "Archive"}
            </button>
          )}
          {(upcoming || s.status === "cancelled") && (
            <button type="button" role="menuitem" className="is-danger" onClick={pick(() => onConfirm("delete", s))}>
              <Trash2 aria-hidden="true" /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function linkWarning(s: Livestream): string | null {
  if (s.sourceType !== "meeting" || s.visibility === "public" || !s.meeting) return null;
  const m = s.meeting;
  const open = m.visibility === "public" || (m.allowGuests && !m.requireApproval && !m.waitingRoom);
  return open ? "The linked meeting admits anyone with its link." : null;
}

function StreamRow(props: RowProps) {
  const { s, busy, onEdit } = props;
  const when = streamWhen(s);
  const warn = linkWarning(s);
  return (
    <tr className={busy ? "is-busy" : ""}>
      <td data-label="Livestream">
        <div className="lv-stream">
          <Thumb stream={s} />
          <div>
            <strong>{s.title}</strong>
            {s.description && <small>{s.description}</small>}
            {s.sourceType === "meeting" && (
              <small className="lv-source">
                <Video aria-hidden="true" /> Fockis Meeting
              </small>
            )}
            {warn && <small className="lv-warn-inline">⚠ {warn}</small>}
          </div>
        </div>
      </td>
      <td data-label="Date & Time">
        <span className="lv-when">
          <span>
            <CalendarDays aria-hidden="true" /> {when.date}
          </span>
          <span>
            <Clock aria-hidden="true" /> {when.time}
          </span>
        </span>
      </td>
      <td data-label="Visibility">
        <VisibilityBadge value={s.visibility} />
      </td>
      <td data-label="Status">
        <StatusBadge value={s.status} />
        {s.isArchived && <small className="lv-muted"> · Archived</small>}
      </td>
      <td data-label="Viewers">
        {s.status === "live" ? (
          <span className="lv-viewers">
            <Users aria-hidden="true" /> {formatCount(s.viewerCount)}
          </span>
        ) : s.status === "completed" && (s.uniqueViewers ?? 0) > 0 ? (
          <span className="lv-viewers" title="People who joined">
            <Users aria-hidden="true" /> {formatCount(s.uniqueViewers ?? 0)}
          </span>
        ) : (
          <span className="lv-muted">—</span>
        )}
      </td>
      <td data-label="Actions">
        <div className="lv-actions">
          <PrimaryAction {...props} />
          {!s.isArchived && s.status !== "completed" && s.status !== "cancelled" && (
            <button type="button" className="lv-icon-btn lv-icon-btn--box" aria-label={`Edit ${s.title}`} title="Edit" onClick={() => onEdit(s)}>
              <Pencil />
            </button>
          )}
          <RowMenu {...props} />
        </div>
      </td>
    </tr>
  );
}

function StreamCard(props: RowProps) {
  const { s } = props;
  const when = streamWhen(s);
  return (
    <article className="lv-gcard">
      <div className="lv-gcard__media">
        <Thumb stream={s} className="lv-gcard__img" />
        <StatusBadge value={s.status} />
      </div>
      <div className="lv-gcard__body">
        <strong>{s.title}</strong>
        <small>
          {when.date} · {when.time}
        </small>
        <div className="lv-gcard__meta">
          <VisibilityBadge value={s.visibility} />
          {s.status === "live" && (
            <span className="lv-viewers">
              <Users aria-hidden="true" /> {formatCount(s.viewerCount)}
            </span>
          )}
        </div>
      </div>
      <div className="lv-gcard__foot">
        <PrimaryAction {...props} />
        <RowMenu {...props} />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ dialog */

function ConfirmDialog({ c, busy, onClose, onConfirm }: { c: Confirm; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const s = c.stream;
  const text = useMemo(() => {
    switch (c.kind) {
      case "start":
        return {
          title: "Start this livestream?",
          body:
            s.sourceType === "meeting"
              ? "It will show as Live Now. Allowed viewers get the meeting link through the Join button. Start the meeting itself in Fockis Meetings."
              : "Fockis Live opens the studio. Allowed viewers can watch as soon as you go on camera.",
          action: "Start",
          danger: false,
        };
      case "end":
        return { title: "End this livestream?", body: "The broadcast ends for everyone and viewing sessions are closed.", action: "End livestream", danger: true };
      case "cancel":
        return { title: "Cancel this livestream?", body: "It stays in the list as cancelled. People who may watch are notified.", action: "Cancel livestream", danger: true };
      case "delete":
        return { title: "Delete this livestream?", body: "This removes it and its invitations. It can't be undone.", action: "Delete", danger: true };
      default:
        return s.isArchived
          ? { title: "Restore this livestream?", body: "It returns to your lists.", action: "Restore", danger: false }
          : { title: "Archive this livestream?", body: "It leaves your lists and public pages. Attendance and analytics are kept.", action: "Archive", danger: false };
    }
  }, [c.kind, s]);
  return (
    <div className="lv-modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lv-modal__box" role="alertdialog" aria-modal="true" aria-labelledby="lv-confirm-title">
        <header className="lv-modal__head">
          <h2 id="lv-confirm-title">{text.title}</h2>
          <button type="button" className="lv-icon-btn" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="lv-modal__body">
          <p>
            <strong>{s.title}</strong>
          </p>
          <p className="lv-muted">{text.body}</p>
        </div>
        <footer className="lv-modal__foot">
          <button type="button" className="lv-btn lv-btn--ghost" onClick={onClose}>
            Keep it
          </button>
          <button type="button" className={`lv-btn ${text.danger ? "lv-btn--danger" : "lv-btn--primary"}`} disabled={busy} onClick={onConfirm}>
            {busy ? "Working…" : text.action}
          </button>
        </footer>
      </div>
    </div>
  );
}
