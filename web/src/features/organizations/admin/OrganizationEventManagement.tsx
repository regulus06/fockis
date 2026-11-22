/**
 * OrganizationEventManagement.tsx — Events, Live & Attendance
 * Route: /organizations/:organizationId/admin/events
 * -----------------------------------------------------------------------------
 * Events tab: organization events are Fockis platform events linked to the
 * organization, so they reuse the existing event pages, registrations,
 * tickets and payments, QR / manual check-in, exports and meeting access
 * (GET /events/:id/join). The server checks the organization's Manage events
 * permission on every call; this page only decides what to show.
 *
 * Live Services and Attendance tabs keep the existing live and attendance
 * APIs (events-center/LiveAttendanceTabs).
 * -----------------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  BarChart3,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  Download,
  Eye,
  LayoutGrid,
  LayoutTemplate,
  Layers,
  List,
  Lock,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  QrCode,
  Radio,
  Search,
  Settings,
  Tag,
  Trash2,
  Users,
  Video,
  X,
  Zap,
  Ban,
  Link2,
} from "lucide-react";

import OrgAppShell from "../ui/OrgAppShell";
import { useOrgAdmin } from "../hooks/useOrgAdmin";
import { mediaUrl } from "../api/dashboardApi";
import { errorMessage } from "../ui/orgUi";
import { termsFor } from "../ui/orgTerminology";
import { isChurchType } from "../website/siteProfile";
import { eventsApi, isAbortError } from "../../events/services/eventsApi";
import { registrationApi } from "../../events/registrations/registrationApi";
import type { FockisEvent } from "../../events/types/event.types";
import EventForm from "../events-center/EventForm";
import CatalogManager from "../events-center/CatalogManager";
import { AttendanceTab, LiveTab } from "../events-center/LiveAttendanceTabs";
import { downloadCsv } from "../events-center/csv";
import {
  orgEventsApi,
  type CatalogKind,
  type CatalogTemplate,
  type EventCatalog,
  type ManageList,
  type ManageTab,
  type ManagedEvent,
} from "../events-center/orgEventsApi";
import { validZone, zonedWhen } from "../events-center/zonedTime";
import "../events-center/eventsCenter.scss";

type PageTab = "events" | "live" | "attendance";

const LIST_TABS: { id: ManageTab; label: string }[] = [
  { id: "all", label: "All Events" },
  { id: "upcoming", label: "Upcoming" },
  { id: "ongoing", label: "Ongoing" },
  { id: "past", label: "Past" },
  { id: "drafts", label: "Drafts" },
  { id: "archived", label: "Archived" },
];

const EMPTY_CATALOG: EventCatalog = { timeZone: "", types: [], categories: [], locations: [], templates: [] };
const PAGE_SIZE = 10;

/* ------------------------------------------------------------------ helpers */

type Status = "draft" | "archived" | "cancelled" | "ongoing" | "past" | "upcoming";

function statusOf(e: FockisEvent, now = Date.now()): Status {
  if (e.isArchived) return "archived";
  if (e.isDraft) return "draft";
  if (e.isCancelled) return "cancelled";
  const s = new Date(e.startDate).getTime();
  const end = new Date(e.endDate).getTime();
  if (now >= end) return "past";
  if (now >= s) return "ongoing";
  return "upcoming";
}

const STATUS_LABEL: Record<Status, string> = {
  draft: "Draft",
  archived: "Archived",
  cancelled: "Cancelled",
  ongoing: "Ongoing",
  past: "Past",
  upcoming: "Upcoming",
};

function hasOnline(e: FockisEvent): boolean {
  return e.isOnline || Boolean(e.registrationSettings?.attendanceOptions?.includes("online")) || Boolean(e.registration?.hasOnlineMeeting);
}

function formatOf(e: FockisEvent): "online" | "hybrid" | "in_person" {
  if (e.isOnline) return "online";
  return hasOnline(e) ? "hybrid" : "in_person";
}

const FORMAT_LABEL = { online: "Online Only", hybrid: "In-person & Online", in_person: "In-person" } as const;

function humanize(id: string): string {
  return id.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function registeredOf(e: ManagedEvent): number {
  const mode = e.registrationSettings?.mode ?? e.registration?.mode;
  if (mode === "required") return e.registration?.registeredSeats ?? e.registrationCounts.confirmed ?? 0;
  return e.attendeeCount;
}

/* ===================================================================== page */

export default function OrganizationEventManagement(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const admin = useOrgAdmin(organizationId);
  const org = admin.org;
  const orgType = org?.organizationType ? String(org.organizationType) : "";
  const terms = termsFor(orgType);
  const isChurch = isChurchType(orgType);
  const [tab, setTab] = useState<PageTab>(() => {
    const h = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    return h === "live" || h === "attendance" ? h : "events";
  });

  useEffect(() => {
    window.history.replaceState(null, "", `#${tab}`);
  }, [tab]);

  const navTo = `/organizations/${encodeURIComponent(organizationId)}/admin/events`;
  const servicesWord = isChurch ? "Services" : terms.gatherings === "Events" ? "Events" : terms.gatherings;
  const subtitle = isChurch
    ? "Create and manage church events, live services, and member attendance in one place."
    : `Create and manage events, live ${servicesWord.toLowerCase()}, and ${terms.person.toLowerCase()} attendance in one place.`;
  const cover = org?.bannerUrl ? mediaUrl(org.bannerUrl) : null;

  return (
    <OrgAppShell variant="admin" organization={admin.shellOrg} viewer={admin.shellViewer} activeNavTo={navTo}>
      <div className="oe">
        <header className="oe-hero">
          {cover && <div className="oe-hero__photo" style={{ backgroundImage: `url("${cover.replace(/"/g, "%22")}")` }} aria-hidden="true" />}
          <div className="oe-hero__text">
            <span className="oe-hero__eyebrow">
              <i aria-hidden="true" /> Admin console
            </span>
            <h1>Events, Live &amp; Attendance</h1>
            <p>{subtitle}</p>
          </div>
        </header>

        <nav className="oe-tabs" role="tablist" aria-label="Events, Live and Attendance">
          {(
            [
              { id: "events", label: "Events", icon: CalendarDays },
              { id: "live", label: `Live ${servicesWord}`, icon: Radio },
              { id: "attendance", label: "Attendance", icon: Users },
            ] as const
          ).map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-on" : ""} onClick={() => setTab(t.id)}>
              <t.icon aria-hidden="true" /> {t.label}
            </button>
          ))}
        </nav>

        {tab === "events" && organizationId && <EventsTab organizationId={organizationId} isChurch={isChurch} />}
        {tab === "live" && organizationId && <LiveTab organizationId={organizationId} servicesWord={servicesWord} />}
        {tab === "attendance" && organizationId && <AttendanceTab organizationId={organizationId} peopleWord={terms.people} />}
      </div>
    </OrgAppShell>
  );
}

/* =============================================================== events tab */

type Confirm =
  | { kind: "cancel"; event: ManagedEvent }
  | { kind: "delete"; event: ManagedEvent }
  | { kind: "archive"; event: ManagedEvent };

function EventsTab({ organizationId, isChurch }: { organizationId: string; isChurch: boolean }) {
  const [catalog, setCatalog] = useState<EventCatalog>(EMPTY_CATALOG);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [list, setList] = useState<ManageList | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listTab, setListTab] = useState<ManageTab>("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"list" | "grid">("list");
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState<FockisEvent | null>(null);
  const [template, setTemplate] = useState<{ t: CatalogTemplate; n: number } | null>(null);
  const [manage, setManage] = useState<CatalogKind | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [analytics, setAnalytics] = useState<ManagedEvent | null>(null);
  const [regsOpen, setRegsOpen] = useState(false);
  const [toast, setToast] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLElement>(null);

  const zone = validZone(catalog.timeZone);
  const notify = useCallback((tone: "ok" | "error", text: string) => setToast({ tone, text }), []);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Event catalog (types, categories, locations, templates) + time zone.
  useEffect(() => {
    const controller = new AbortController();
    orgEventsApi
      .catalog(organizationId, controller.signal)
      .then((c) => {
        setCatalog(c);
        setCatalogError(null);
      })
      .catch((err) => !isAbortError(err) && setCatalogError(errorMessage(err, "Event settings could not be loaded.")));
    return () => controller.abort();
  }, [organizationId]);

  // Debounced search.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    orgEventsApi
      .manage(organizationId, { tab: listTab, search: query, type: typeFilter, page, limit: PAGE_SIZE }, controller.signal)
      .then((l) => {
        setList(l);
        setListError(null);
      })
      .catch((err) => !isAbortError(err) && setListError(errorMessage(err, "Events could not be loaded.")))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [organizationId, listTab, query, typeFilter, page, tick]);

  const typeName = useCallback((id?: string) => (id ? catalog.types.find((t) => t.id === id)?.name ?? humanize(id) : "—"), [catalog.types]);

  function startEdit(e: FockisEvent) {
    setEditing(e);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function newEvent() {
    setEditing(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function join(e: FockisEvent) {
    // Open the tab now (popup blockers), then send it to the link the server allows.
    const win = window.open("", "_blank");
    try {
      const res = await registrationApi.join(e.id);
      if (win) {
        win.opener = null;
        win.location.href = res.url;
      } else window.location.assign(res.url);
    } catch (err) {
      win?.close();
      notify("error", errorMessage(err, "The meeting can't be opened."));
    }
  }

  async function runConfirm(c: Confirm, reason: string) {
    setBusy(c.event.id);
    try {
      if (c.kind === "cancel") {
        await eventsApi.cancel(c.event.id, reason);
        notify("ok", `"${c.event.title}" was cancelled.`);
      } else if (c.kind === "delete") {
        await eventsApi.delete(c.event.id);
        if (editing?.id === c.event.id) setEditing(null);
        notify("ok", `"${c.event.title}" was deleted.`);
      } else {
        await (c.event.isArchived ? orgEventsApi.restore(c.event.id) : orgEventsApi.archive(c.event.id));
        notify("ok", c.event.isArchived ? `"${c.event.title}" was restored.` : `"${c.event.title}" was archived.`);
      }
      setConfirm(null);
      reload();
    } catch (err) {
      notify("error", errorMessage(err, "That didn't work. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  async function exportAttendance() {
    try {
      const all = await orgEventsApi.manage(organizationId, { tab: "all", limit: 100 });
      const past = await orgEventsApi.manage(organizationId, { tab: "archived", limit: 100 });
      const rows = [...all.items, ...past.items].map((e) => {
        const when = zonedWhen(e.startDate, e.endDate, zone);
        return [
          e.title,
          typeName(e.eventType),
          when.date,
          when.time,
          FORMAT_LABEL[formatOf(e)],
          STATUS_LABEL[statusOf(e)],
          registeredOf(e),
          e.registrationCounts.checked_in ?? 0,
          e.registrationCounts.waitlisted ?? 0,
          e.registrationCounts.pending_approval ?? 0,
          e.capacity ?? "",
        ];
      });
      if (!rows.length) {
        notify("error", "There are no events to export yet.");
        return;
      }
      downloadCsv(
        `event-attendance-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Event", "Type", "Date", "Time", "Format", "Status", "Registered / Going", "Checked in", "Waitlisted", "Pending approval", "Capacity"],
        rows,
      );
    } catch (err) {
      notify("error", errorMessage(err, "The export failed."));
    }
  }

  async function saveTemplate(t: Omit<CatalogTemplate, "id" | "archived">) {
    try {
      const next = await orgEventsApi.saveCatalog(organizationId, { templates: [...catalog.templates, { ...t, id: "", archived: false }] });
      setCatalog(next);
      notify("ok", `Template "${t.name}" saved.`);
    } catch (err) {
      notify("error", errorMessage(err, "The template could not be saved."));
    }
  }

  const counts = list?.counts;
  const items = list?.items ?? [];
  const pages = list ? Math.max(1, Math.ceil(list.total / PAGE_SIZE)) : 1;
  const activeTemplates = catalog.templates.filter((t) => !t.archived);

  return (
    <>
      {toast && (
        <div className={`oe-toast oe-toast--${toast.tone}`} role="status">
          {toast.text}
          <button type="button" aria-label="Dismiss" onClick={() => setToast(null)}>
            <X />
          </button>
        </div>
      )}
      {catalogError && <div className="oe-alert oe-alert--error">{catalogError}</div>}

      <div className="oe-layout">
        <div ref={formRef} className="oe-layout__main">
          <EventForm
            organizationId={organizationId}
            catalog={catalog}
            zone={zone}
            editing={editing}
            template={template}
            isChurch={isChurch}
            onSaved={(ev, how) => {
              notify("ok", how === "draft" ? `"${ev.title}" saved as a draft.` : how === "created" ? `"${ev.title}" was created.` : `"${ev.title}" was saved.`);
              setEditing(null);
              reload();
            }}
            onCancelEdit={() => setEditing(null)}
            onManage={setManage}
            onSaveTemplate={saveTemplate}
          />
        </div>

        <aside className="oe-layout__side">
          <section className="oe-card oe-side">
            <h2>
              <Settings aria-hidden="true" /> Event Settings
            </h2>
            <ul className="oe-side__list">
              {(
                [
                  { k: "categories", l: "Event Categories", i: Tag, n: catalog.categories.filter((x) => !x.archived).length },
                  { k: "types", l: "Event Types", i: Layers, n: catalog.types.filter((x) => !x.archived).length },
                  { k: "locations", l: "Event Locations", i: MapPin, n: catalog.locations.filter((x) => !x.archived).length },
                ] as const
              ).map((r) => (
                <li key={r.k}>
                  <r.i aria-hidden="true" />
                  <span>
                    {r.l} <small>({r.n})</small>
                  </span>
                  <button type="button" className="oe-link-btn" onClick={() => setManage(r.k)} disabled={Boolean(catalogError)}>
                    Manage
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="oe-card oe-side">
            <h2>
              <Zap aria-hidden="true" /> Quick Actions
            </h2>
            <div className="oe-quick">
              <button type="button" className="oe-quick__btn is-primary" onClick={newEvent}>
                <Plus aria-hidden="true" /> Create Event
              </button>
              <button type="button" className="oe-quick__btn" onClick={() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <CalendarDays aria-hidden="true" /> Manage Events
              </button>
              <button type="button" className="oe-quick__btn" onClick={() => setManage("templates")} disabled={Boolean(catalogError)}>
                <LayoutTemplate aria-hidden="true" /> Event Templates
                {activeTemplates.length > 0 && <span className="oe-count">{activeTemplates.length}</span>}
              </button>
              <button type="button" className="oe-quick__btn" onClick={() => setRegsOpen(true)}>
                <Users aria-hidden="true" /> Event Registrations
                {(list?.pendingRegistrations ?? 0) > 0 && (
                  <span className="oe-badge" aria-label={`${list?.pendingRegistrations} waiting for approval`}>
                    {list?.pendingRegistrations}
                  </span>
                )}
              </button>
              <button type="button" className="oe-quick__btn" onClick={exportAttendance}>
                <Download aria-hidden="true" /> Export Attendance
              </button>
            </div>
          </section>
        </aside>
      </div>

      <section ref={listRef} className="oe-card oe-list" aria-labelledby="oe-list-title">
        <header className="oe-card__head">
          <h2 id="oe-list-title">
            <CalendarDays aria-hidden="true" /> All Events
          </h2>
        </header>

        <div className="oe-list__bar">
          <div className="oe-pills" role="tablist" aria-label="Filter events">
            {LIST_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={listTab === t.id}
                className={listTab === t.id ? "is-on" : ""}
                onClick={() => {
                  setListTab(t.id);
                  setPage(1);
                }}
              >
                {t.label}
                {counts && t.id !== "all" && counts[t.id] > 0 && <span className="oe-pills__n">{counts[t.id]}</span>}
              </button>
            ))}
          </div>
          <div className="oe-list__tools">
            <div className="oe-input-icon oe-search">
              <Search aria-hidden="true" />
              <input type="search" value={search} placeholder="Search events…" aria-label="Search events" onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="oe-select oe-select--sm">
              <Layers aria-hidden="true" />
              <select
                aria-label="Filter by type"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Types</option>
                {catalog.types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="oe-select__chev" aria-hidden="true" />
            </div>
            <div className="oe-viewtoggle" role="group" aria-label="View">
              <button type="button" aria-pressed={view === "grid"} className={view === "grid" ? "is-on" : ""} onClick={() => setView("grid")} aria-label="Grid view">
                <LayoutGrid />
              </button>
              <button type="button" aria-pressed={view === "list"} className={view === "list" ? "is-on" : ""} onClick={() => setView("list")} aria-label="List view">
                <List />
              </button>
            </div>
          </div>
        </div>

        {listError ? (
          <div className="oe-alert oe-alert--error">{listError}</div>
        ) : loading && !list ? (
          <p className="oe-empty">Loading events…</p>
        ) : items.length === 0 ? (
          <div className="oe-empty oe-empty--big">
            <CalendarPlus aria-hidden="true" />
            <strong>{query || typeFilter ? "No events match your search." : listTab === "all" ? "No events yet." : `No ${LIST_TABS.find((t) => t.id === listTab)?.label.toLowerCase()} events.`}</strong>
            {listTab === "all" && !query && !typeFilter && (
              <button type="button" className="oe-btn oe-btn--primary oe-btn--sm" onClick={newEvent}>
                <Plus aria-hidden="true" /> Create your first event
              </button>
            )}
          </div>
        ) : view === "list" ? (
          <div className={`oe-table-wrap${loading ? " is-loading" : ""}`}>
            <table className="oe-table oe-events">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Type</th>
                  <th scope="col">Date &amp; Time</th>
                  <th scope="col">Location / Online</th>
                  <th scope="col">Registrations</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="oe-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <EventRow
                    key={e.id}
                    e={e}
                    zone={zone}
                    typeName={typeName}
                    busy={busy === e.id}
                    onEdit={() => startEdit(e)}
                    onAnalytics={() => setAnalytics(e)}
                    onJoin={() => join(e)}
                    onConfirm={(kind) => setConfirm({ kind, event: e })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`oe-cards${loading ? " is-loading" : ""}`}>
            {items.map((e) => (
              <EventCard
                key={e.id}
                e={e}
                zone={zone}
                typeName={typeName}
                onEdit={() => startEdit(e)}
                onAnalytics={() => setAnalytics(e)}
                onJoin={() => join(e)}
                onConfirm={(kind) => setConfirm({ kind, event: e })}
              />
            ))}
          </div>
        )}

        {list && list.total > PAGE_SIZE && (
          <nav className="oe-pager" aria-label="Pages">
            <button type="button" className="oe-btn oe-btn--ghost oe-btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {page} of {pages} · {list.total} events
            </span>
            <button type="button" className="oe-btn oe-btn--ghost oe-btn--sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </nav>
        )}
      </section>

      {manage && (
        <CatalogManager
          organizationId={organizationId}
          catalog={catalog}
          initial={manage}
          onClose={() => setManage(null)}
          onSaved={(next) => {
            setCatalog(next);
            notify("ok", "Event settings saved.");
          }}
          onUseTemplate={(t) => {
            setEditing(null);
            setTemplate((prev) => ({ t, n: (prev?.n ?? 0) + 1 }));
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      )}
      {confirm && <ConfirmDialog c={confirm} busy={busy === confirm.event.id} onClose={() => setConfirm(null)} onConfirm={(reason) => runConfirm(confirm, reason)} />}
      {analytics && <AnalyticsDialog e={analytics} zone={zone} typeName={typeName} onClose={() => setAnalytics(null)} />}
      {regsOpen && <RegistrationsDialog organizationId={organizationId} zone={zone} onClose={() => setRegsOpen(false)} />}
    </>
  );
}

/* ------------------------------------------------------------------ rows */

interface RowProps {
  e: ManagedEvent;
  zone: string;
  typeName: (id?: string) => string;
  busy?: boolean;
  onEdit: () => void;
  onAnalytics: () => void;
  onJoin: () => void;
  onConfirm: (kind: Confirm["kind"]) => void;
}

function Thumb({ e }: { e: FockisEvent }) {
  const src = e.coverMediaType !== "video" && e.coverImageUrl ? mediaUrl(e.coverImageUrl) : null;
  return src ? <img className="oe-thumb" src={src} alt="" loading="lazy" /> : <span className="oe-thumb oe-thumb--empty" aria-hidden="true"><CalendarDays /></span>;
}

function canJoin(e: FockisEvent): boolean {
  const s = statusOf(e);
  return hasOnline(e) && (s === "upcoming" || s === "ongoing");
}

function EventRow({ e, zone, typeName, busy, onEdit, onAnalytics, onJoin, onConfirm }: RowProps) {
  const when = zonedWhen(e.startDate, e.endDate, zone);
  const status = statusOf(e);
  const fmt = formatOf(e);
  const pending = e.registrationCounts.pending_approval ?? 0;
  return (
    <tr className={busy ? "is-busy" : ""}>
      <td data-label="Event">
        <div className="oe-ev">
          <Thumb e={e} />
          <div>
            <Link to={`/events/${encodeURIComponent(e.id)}`} className="oe-ev__title">
              {e.title}
            </Link>
            <small className="oe-ev__fmt">
              {fmt !== "in_person" && <Video aria-hidden="true" />}
              {FORMAT_LABEL[fmt]}
              {e.visibility !== "public" && (
                <span title="Not on the public page">
                  <Lock aria-hidden="true" />
                </span>
              )}
            </small>
          </div>
        </div>
      </td>
      <td data-label="Type">
        <span className="oe-type">{typeName(e.eventType)}</span>
      </td>
      <td data-label="Date & Time">
        <span className="oe-when">
          {when.date}
          <small>{when.time}</small>
        </span>
      </td>
      <td data-label="Location / Online">
        <span className="oe-where">
          {fmt !== "online" ? (
            <span>
              <MapPin aria-hidden="true" /> {e.locationName || e.address || "—"}
            </span>
          ) : (
            <span>
              <Video aria-hidden="true" /> Online{e.meetingProvider ? ` (${/fockis/i.test(e.meetingProvider) ? "Fockis Meeting" : e.meetingProvider})` : ""}
            </span>
          )}
          {fmt !== "in_person" &&
            (canJoin(e) ? (
              <button type="button" className="oe-link-btn" onClick={onJoin}>
                <Link2 aria-hidden="true" /> Join Online
              </button>
            ) : (
              <small className="oe-muted">Online link {e.onlineUrl ? "saved" : "missing"}</small>
            ))}
        </span>
      </td>
      <td data-label="Registrations">
        <span className="oe-regs">
          <Users aria-hidden="true" /> {registeredOf(e).toLocaleString()}
          {e.capacity ? ` / ${e.capacity.toLocaleString()}` : ""}
          {pending > 0 && <span className="oe-badge oe-badge--sm" title={`${pending} waiting for approval`}>{pending}</span>}
        </span>
      </td>
      <td data-label="Status">
        <span className={`oe-status oe-status--${status}`}>{STATUS_LABEL[status]}</span>
      </td>
      <td className="oe-right">
        <div className="oe-actions">
          {canJoin(e) && (
            <button type="button" className="oe-btn oe-btn--primary oe-btn--sm oe-join" onClick={onJoin}>
              <Video aria-hidden="true" /> Join Meeting
            </button>
          )}
          <button type="button" className="oe-icon-btn oe-icon-btn--box" aria-label={`Edit ${e.title}`} title="Edit" onClick={onEdit}>
            <Pencil />
          </button>
          <button type="button" className="oe-icon-btn oe-icon-btn--box" aria-label={`Analytics for ${e.title}`} title="Analytics" onClick={onAnalytics}>
            <BarChart3 />
          </button>
          <RowMenu e={e} onConfirm={onConfirm} />
        </div>
      </td>
    </tr>
  );
}

function EventCard({ e, zone, typeName, onEdit, onAnalytics, onJoin, onConfirm }: RowProps) {
  const when = zonedWhen(e.startDate, e.endDate, zone);
  const status = statusOf(e);
  const fmt = formatOf(e);
  return (
    <article className="oe-evcard">
      <div className="oe-evcard__media">
        <Thumb e={e} />
        <span className={`oe-status oe-status--${status}`}>{STATUS_LABEL[status]}</span>
      </div>
      <div className="oe-evcard__body">
        <span className="oe-type">{typeName(e.eventType)}</span>
        <Link to={`/events/${encodeURIComponent(e.id)}`} className="oe-ev__title">
          {e.title}
        </Link>
        <small>
          {when.date} · {when.time}
        </small>
        <small>
          {fmt === "online" ? <Video aria-hidden="true" /> : <MapPin aria-hidden="true" />} {fmt === "online" ? "Online" : e.locationName || e.address} · {FORMAT_LABEL[fmt]}
        </small>
        <small>
          <Users aria-hidden="true" /> {registeredOf(e)}
          {e.capacity ? ` / ${e.capacity}` : ""} registered
        </small>
      </div>
      <div className="oe-evcard__foot">
        {canJoin(e) && (
          <button type="button" className="oe-btn oe-btn--primary oe-btn--sm" onClick={onJoin}>
            <Video aria-hidden="true" /> Join Meeting
          </button>
        )}
        <button type="button" className="oe-icon-btn oe-icon-btn--box" aria-label={`Edit ${e.title}`} onClick={onEdit}>
          <Pencil />
        </button>
        <button type="button" className="oe-icon-btn oe-icon-btn--box" aria-label={`Analytics for ${e.title}`} onClick={onAnalytics}>
          <BarChart3 />
        </button>
        <RowMenu e={e} onConfirm={onConfirm} />
      </div>
    </article>
  );
}

function RowMenu({ e, onConfirm }: { e: ManagedEvent; onConfirm: (kind: Confirm["kind"]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (ev: MouseEvent | KeyboardEvent) => {
      if (ev instanceof KeyboardEvent ? ev.key === "Escape" : !ref.current?.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const id = encodeURIComponent(e.id);
  const status = statusOf(e);
  return (
    <div className="oe-menu" ref={ref}>
      <button type="button" className="oe-icon-btn oe-icon-btn--box" aria-haspopup="menu" aria-expanded={open} aria-label={`More actions for ${e.title}`} onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal />
      </button>
      {open && (
        <div className="oe-menu__pop" role="menu">
          <Link role="menuitem" to={`/events/${id}`}>
            <Eye aria-hidden="true" /> View
          </Link>
          <Link role="menuitem" to={`/events/${id}/registrations`}>
            <Users aria-hidden="true" /> Registrations
          </Link>
          <Link role="menuitem" to={`/events/${id}/check-in`}>
            <QrCode aria-hidden="true" /> Check-in
          </Link>
          {(status === "upcoming" || status === "ongoing") && (
            <button type="button" role="menuitem" onClick={() => (setOpen(false), onConfirm("cancel"))}>
              <Ban aria-hidden="true" /> Cancel event
            </button>
          )}
          <button type="button" role="menuitem" onClick={() => (setOpen(false), onConfirm("archive"))}>
            {e.isArchived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />} {e.isArchived ? "Restore" : "Archive"}
          </button>
          <button type="button" role="menuitem" className="is-danger" onClick={() => (setOpen(false), onConfirm("delete"))}>
            <Trash2 aria-hidden="true" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- dialogs */

function Modal({ title, onClose, children, foot, wide }: { title: string; onClose: () => void; children: React.ReactNode; foot?: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="oe-modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`oe-modal__box${wide ? " is-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="oe-modal__head">
          <h2>{title}</h2>
          <button type="button" className="oe-icon-btn" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="oe-modal__body">{children}</div>
        {foot && <footer className="oe-modal__foot">{foot}</footer>}
      </div>
    </div>
  );
}

function ConfirmDialog({ c, busy, onClose, onConfirm }: { c: Confirm; busy: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const regs = registeredOf(c.event);
  const regTotal = Object.entries(c.event.registrationCounts).filter(([k]) => k !== "checked_in").reduce((n, [, v]) => n + v, 0);
  const blocked = c.kind === "delete" && regTotal > 0;
  const title = c.kind === "cancel" ? "Cancel this event?" : c.kind === "delete" ? "Delete this event?" : c.event.isArchived ? "Restore this event?" : "Archive this event?";
  const action = c.kind === "cancel" ? "Cancel event" : c.kind === "delete" ? "Delete permanently" : c.event.isArchived ? "Restore" : "Archive";
  return (
    <Modal
      title={title}
      onClose={onClose}
      foot={
        <>
          <button type="button" className="oe-btn oe-btn--ghost" onClick={onClose}>
            Keep it
          </button>
          <button type="button" className={`oe-btn ${c.kind === "archive" ? "oe-btn--primary" : "oe-btn--danger"}`} disabled={busy || blocked} onClick={() => onConfirm(reason)}>
            {busy ? "Working…" : action}
          </button>
        </>
      }
    >
      <p>
        <strong>{c.event.title}</strong>
      </p>
      {c.kind === "cancel" && (
        <>
          <p className="oe-muted">The event stays visible as cancelled, the Join button is removed{regs > 0 ? ` and the ${regs} registered people are told` : ""}. Paid registrations follow your refund process.</p>
          <label className="oe-field">
            <span>Reason (optional, shown to attendees)</span>
            <textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        </>
      )}
      {c.kind === "delete" &&
        (blocked ? (
          <p className="oe-muted">This event has registrations. Cancel or archive it instead so attendees, payments and check-ins keep their history.</p>
        ) : (
          <p className="oe-muted">This permanently removes the event and its page. It can't be undone. To keep the history, archive it instead.</p>
        ))}
      {c.kind === "archive" && (
        <p className="oe-muted">{c.event.isArchived ? "The event returns to your events list and, if published, to the public page." : "The event leaves your lists and the public page. Registrations and attendance are kept, and you can restore it any time."}</p>
      )}
    </Modal>
  );
}

function AnalyticsDialog({ e, zone, typeName, onClose }: { e: ManagedEvent; zone: string; typeName: (id?: string) => string; onClose: () => void }) {
  const c = e.registrationCounts;
  const when = zonedWhen(e.startDate, e.endDate, zone);
  const registered = registeredOf(e);
  const fill = e.capacity ? Math.min(100, Math.round((registered / e.capacity) * 100)) : null;
  const tiles = [
    { l: e.registrationSettings?.mode === "required" ? "Registered" : "Going", v: registered },
    { l: "Interested", v: e.interestedCount },
    { l: "Checked in", v: c.checked_in ?? 0 },
    { l: "Waitlisted", v: c.waitlisted ?? 0 },
    { l: "Pending approval", v: c.pending_approval ?? 0 },
    { l: "Awaiting payment", v: c.pending_payment ?? 0 },
    { l: "Cancelled", v: c.cancelled ?? 0 },
  ];
  return (
    <Modal
      title="Event analytics"
      onClose={onClose}
      foot={
        <Link className="oe-btn oe-btn--primary" to={`/events/${encodeURIComponent(e.id)}/registrations`}>
          <Users aria-hidden="true" /> Open registrations
        </Link>
      }
    >
      <p>
        <strong>{e.title}</strong>
        <br />
        <small className="oe-muted">
          {typeName(e.eventType)} · {when.date}, {when.time}
        </small>
      </p>
      <div className="oe-tiles">
        {tiles.map((t) => (
          <div key={t.l} className="oe-tile">
            <strong>{t.v.toLocaleString()}</strong>
            <span>{t.l}</span>
          </div>
        ))}
      </div>
      {fill !== null && (
        <div className="oe-fill" aria-label={`${fill}% of capacity`}>
          <div className="oe-fill__bar">
            <i style={{ width: `${fill}%` }} />
          </div>
          <small>
            {registered} of {e.capacity} places ({fill}%)
          </small>
        </div>
      )}
      <p className="oe-muted">Check-ins come from QR and manual check-in. Opening the meeting link is not counted as attendance.</p>
    </Modal>
  );
}

function RegistrationsDialog({ organizationId, zone, onClose }: { organizationId: string; zone: string; onClose: () => void }) {
  const [items, setItems] = useState<ManagedEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    orgEventsApi
      .manage(organizationId, { tab: "all", limit: 100 }, controller.signal)
      .then((l) => setItems(l.items))
      .catch((err) => !isAbortError(err) && setError(errorMessage(err, "Registrations could not be loaded.")));
    return () => controller.abort();
  }, [organizationId]);
  const rows = useMemo(
    () =>
      (items ?? [])
        .filter((e) => !e.isDraft)
        .map((e) => ({ e, pending: e.registrationCounts.pending_approval ?? 0, total: Object.entries(e.registrationCounts).filter(([k]) => k !== "checked_in").reduce((a, [, v]) => a + v, 0) }))
        .filter((r) => r.total > 0 || r.e.registrationSettings?.mode === "required")
        .sort((a, b) => b.pending - a.pending || new Date(a.e.startDate).getTime() - new Date(b.e.startDate).getTime()),
    [items],
  );
  return (
    <Modal title="Event Registrations" onClose={onClose} wide>
      {error ? (
        <div className="oe-alert oe-alert--error">{error}</div>
      ) : !items ? (
        <p className="oe-empty">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="oe-empty">No events use registration yet. Turn on “Require RSVP” when you create an event.</p>
      ) : (
        <ul className="oe-reglist">
          {rows.map(({ e, pending, total }) => {
            const when = zonedWhen(e.startDate, e.endDate, zone);
            return (
              <li key={e.id}>
                <div>
                  <strong>{e.title}</strong>
                  <small>
                    {when.date} · {total} registration{total === 1 ? "" : "s"}
                    {e.registrationCounts.waitlisted ? ` · ${e.registrationCounts.waitlisted} waitlisted` : ""}
                  </small>
                </div>
                {pending > 0 && <span className="oe-badge">{pending} pending</span>}
                <Link className="oe-btn oe-btn--outline oe-btn--sm" to={`/events/${encodeURIComponent(e.id)}/registrations`}>
                  Manage
                </Link>
                <Link className="oe-btn oe-btn--ghost oe-btn--sm" to={`/events/${encodeURIComponent(e.id)}/check-in`}>
                  <QrCode aria-hidden="true" /> Check-in
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
