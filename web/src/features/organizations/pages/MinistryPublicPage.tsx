/**
 * MinistryPublicPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/ministries/:ministryId[?tab=…]
 *
 * A ministry's page, following the Fockis ministry dashboard design:
 *
 *   church header · breadcrumb · ministry banner
 *   left: ministry navigation   center: stats + content   right: leadership,
 *   meeting schedule, quick actions
 *
 * One reusable page for every ministry. Visitors see public, published
 * information; members also get Members / Discussions / Documents; ministry
 * managers (organization owner or people with the matching permission) get
 * the admin actions — every action calls the real API.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Crown,
  FileText,
  Globe,
  Home,
  ChartColumn,
  HandCoins,
  ImagePlus,
  Images,
  Inbox,
  Info,
  LayoutDashboard,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  MessagesSquare,
  MoreHorizontal,
  PlayCircle,
  Settings,
  Trash2,
  UserPlus,
  UserRound,
  UsersRound,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { getOrganization } from "../api/organizationsApi";
import { getAuthToken } from "../api/organizationApi";
import { publicOrganizationApi } from "../api/visitsApi";
import { joinDepartment, updateDepartment } from "../api/departmentsApi";
import { listMembers } from "../api/membersApi";
import { listEvents } from "../api/eventsApi";
import { mediaUrl } from "../api/dashboardApi";
import { uploadMediaFile } from "../api/mediaApi";
import { MembershipStatus, type ChurchEvent, type Member, type Organization } from "../types/organization.types";
import { Alert, errorMessage, useOrgFonts } from "../ui/orgUi";
import ChurchSiteHeader from "../website/ChurchSiteHeader";
import MinistryBanner from "../website/MinistryBanner";
import MediaPlayerDialog, { type PlayableMedia } from "../website/MediaPlayerDialog";
import PhotoLightbox from "../website/PhotoLightbox";
import { churchTheme, churchThemeVars, DEFAULT_CHURCH_THEME } from "../website/churchThemes";
import { listPublicMinistries, type PublicMinistry } from "../website/publicSiteApi";
import {
  getMinistryOverview,
  uploadMinistryPhotos,
  type MinistryEventItem,
  type MinistryLeader,
  type MinistryOverview,
  type MinistryStudy,
} from "../ministry/ministryApi";
import { AnnouncementDialog, EventDialog, LeaderTitleDialog, ScheduleDialog, StudyDialog } from "../ministry/MinistryDialogs";
import MinistryAttendance from "../ministry/attendance/MinistryAttendance";
import { attendanceApi, type AttendanceAccess } from "../ministry/attendance/attendanceApi";
import { ministriesApi, type MinistryAccess } from "../ministries/ministriesApi";
import MinistryManageTab, { type ManageTabKey } from "../ministries/MinistryManageTabs";
import { ApplyDialog } from "../ministries/MinistryDialogs";
import "../styles/ChurchWebsite.scss";
import "../styles/MinistryPage.scss";

type Permissions = Record<string, boolean | undefined>;
type Org = Organization & {
  currentUserIsOwner?: boolean;
  websiteTheme?: string | null;
  viewer?: { isOwner?: boolean; isActiveMember?: boolean; permissions?: Permissions | null } | null;
  permissions?: Permissions | null;
};

type Tab =
  | "overview"
  | "about"
  | "members"
  | "leadership"
  | "schedule"
  | "events"
  | "studies"
  | "announcements"
  | "gallery"
  | "website"
  | "attendance"
  /* Ministries management (ministries/MinistryManageTabs) */
  | "teams"
  | "applications"
  | "finances"
  | "documents"
  | "reports"
  | "settings";

type Dialog = null | "event" | "announcement" | "study" | "schedule" | "apply" | { leader: MinistryLeader };

const BANNER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BANNER_MAX = 10 * 1024 * 1024;

/* ============================================================================
 * Helpers
 * ========================================================================== */

function dateBox(iso: string | null) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return { month: "", day: "", line: "" };
  return {
    month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    day: String(d.getDate()).padStart(2, "0"),
    line: `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })} • ${d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })}`,
  };
}

function eventWhen(e: MinistryEventItem): string {
  const s = e.startsAt ? new Date(e.startsAt) : null;
  const en = e.endsAt ? new Date(e.endsAt) : null;
  if (!s) return "";
  const day = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (en && en.toDateString() !== s.toDateString()) return `${s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} – ${day(en)}`;
  return `${day(s)} • ${time(s)}`;
}

function shortDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function duration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/** "Youth Ministry" → "Youth". Used for "Upcoming Youth Events", "Join Youth Ministry". */
function shortName(name: string) {
  const first = name.replace(/\s+(ministry|ministries|department|team)$/i, "").trim();
  return first || name;
}

function Card({ icon: Icon, title, action, children, className = "", id }: { icon: LucideIcon; title: string; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section className={"mp-card " + className} aria-label={title} id={id}>
      <div className="mp-card__head">
        <h2>
          <Icon aria-hidden="true" /> {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <p className="mp-empty">
      {children}
      {hint && <small>{hint}</small>}
    </p>
  );
}

function LeaderAvatar({ leader, size = 46 }: { leader: MinistryLeader; size?: number }) {
  const src = mediaUrl(leader.avatarUrl);
  const [broken, setBroken] = useState(false);
  return (
    <span className="mp-avatar" style={{ width: size, height: size }}>
      {src && !broken ? <img src={src} alt="" onError={() => setBroken(true)} /> : initials(leader.displayName)}
    </span>
  );
}

/* ============================================================================
 * Page
 * ========================================================================== */

export default function MinistryPublicPage(): React.JSX.Element {
  useOrgFonts("#f2f6fc");
  const { organizationId = "", ministryId = "" } = useParams<{ organizationId: string; ministryId: string }>();
  const [params, setParams] = useSearchParams();
  const signedIn = Boolean(getAuthToken());
  const bannerInput = useRef<HTMLInputElement | null>(null);
  const photoInput = useRef<HTMLInputElement | null>(null);

  const [org, setOrg] = useState<Org | null>(null);
  const [data, setData] = useState<MinistryOverview | null>(null);
  const [ministries, setMinistries] = useState<PublicMinistry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "banner" | "join" | "photos">(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [playing, setPlaying] = useState<PlayableMedia | null>(null);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  // What the viewer may do with attendance (server-decided).
  const [att, setAtt] = useState<AttendanceAccess | null>(null);
  // What the viewer may do with this ministry (server-decided).
  const [ma, setMa] = useState<MinistryAccess | null>(null);

  // Member-only lists, loaded when their tab opens.
  const [members, setMembers] = useState<Member[] | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [allEvents, setAllEvents] = useState<ChurchEvent[] | null>(null);

  const tabParam = params.get("tab") as Tab | null;

  /* -------------------------------------------------------------- load */

  useEffect(() => {
    const controller = new AbortController();
    if (reloadKey === 0) setLoading(true);
    setError(null);
    (async () => {
      try {
        const [o, overview, list] = await Promise.all([
          (signedIn ? getOrganization(organizationId, controller.signal) : publicOrganizationApi.get(organizationId)) as Promise<Org>,
          getMinistryOverview(organizationId, ministryId, controller.signal),
          listPublicMinistries(organizationId, controller.signal).catch(() => [] as PublicMinistry[]),
        ]);
        if (controller.signal.aborted) return;
        setOrg(o);
        setData(overview);
        setMinistries(list);
      } catch (err) {
        if (!controller.signal.aborted) setError(errorMessage(err, "This ministry could not be loaded."));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [organizationId, ministryId, signedIn, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    attendanceApi
      .access(organizationId, ministryId, controller.signal)
      .then((a) => !controller.signal.aborted && setAtt(a))
      .catch(() => !controller.signal.aborted && setAtt(null));
    ministriesApi
      .access(organizationId, ministryId, controller.signal)
      .then((a) => !controller.signal.aborted && setMa(a))
      .catch(() => !controller.signal.aborted && setMa(null));
    return () => controller.abort();
  }, [organizationId, ministryId, signedIn, reloadKey]);

  /* ------------------------------------------------------------ access */

  const access = useMemo(() => {
    const p = org?.viewer?.permissions ?? org?.permissions ?? {};
    const isOwner = org?.viewer?.isOwner === true || org?.currentUserIsOwner === true;
    const can = (k: string) => isOwner || p?.[k] === true;
    const isMember = isOwner || org?.viewer?.isActiveMember === true || org?.currentUserMembershipStatus === MembershipStatus.Active;
    return {
      isOwner,
      isMember,
      isPending: org?.currentUserMembershipStatus === MembershipStatus.Pending,
      // Church leadership, or a leader of this ministry (ministry policy).
      manageMinistry: can("canManageDepartments") || ma?.canManage === true,
      manageEvents: can("canManageEvents"),
      manageAnnouncements: can("canManageCommunication"),
      manageMedia: can("canManageMedia"),
      recordAttendance: can("canRecordAttendance"),
      viewDirectory: can("canViewMemberDirectory") || can("canManageMembers"),
    };
  }, [org, ma]);

  const isManager = access.manageMinistry || access.manageEvents || access.manageAnnouncements || access.manageMedia;

  const tabs = useMemo(() => {
    const t: { key: Tab | string; label: string; icon: LucideIcon; to?: string; show: boolean }[] = [];
    const home = `/organizations/${encodeURIComponent(organizationId)}`;
    t.push({ key: "overview", label: "Overview", icon: LayoutDashboard, show: true });
    t.push({ key: "about", label: `About ${data?.ministry.name ?? "Ministry"}`, icon: Info, show: true });
    t.push({ key: "members", label: "Members", icon: UsersRound, show: access.isMember });
    t.push({ key: "applications", label: "Join Requests", icon: Inbox, show: ma?.canManage === true });
    t.push({ key: "leadership", label: "Leadership", icon: UserRound, show: true });
    t.push({ key: "teams", label: "Teams", icon: UsersRound, show: Boolean(ma?.isMember || ma?.canCoordinate) });
    t.push({ key: "schedule", label: "Meetings & Schedule", icon: CalendarDays, show: true });
    t.push({ key: "events", label: "Events & Registration", icon: CalendarDays, show: true });
    t.push({
      key: "attendance",
      label: att?.canView ? "Attendance" : "My Attendance",
      icon: ClipboardCheck,
      show: Boolean(att?.canView || (att?.isMember && att.settings.membersSeeOwnHistory)),
    });
    t.push({ key: "studies", label: "Bible Studies & Resources", icon: BookOpen, show: true });
    t.push({ key: "announcements", label: "Announcements", icon: Megaphone, show: true });
    t.push({ key: "gallery", label: "Gallery (Photos & Videos)", icon: Images, show: true });
    t.push({ key: "discussions", label: "Discussions", icon: MessagesSquare, to: `${home}/communication`, show: access.isMember });
    t.push({ key: "documents", label: "Documents", icon: FileText, show: Boolean(ma?.isMember || ma?.canCoordinate) });
    t.push({ key: "finances", label: "Finances", icon: HandCoins, show: ma?.canViewFinances === true });
    t.push({ key: "reports", label: "Reports", icon: ChartColumn, show: ma?.canManage === true });
    t.push({ key: "website", label: "Website Management", icon: Globe, show: isManager });
    t.push({ key: "settings", label: "Settings", icon: Settings, show: ma?.canManage === true });
    return t.filter((x) => x.show);
  }, [access, data, isManager, organizationId, att, ma]);

  const tab: Tab = tabs.some((t) => t.key === tabParam && !t.to) ? (tabParam as Tab) : "overview";

  function go(next: Tab) {
    const p = new URLSearchParams(params);
    for (const k of ["view", "session", "member", "date"]) p.delete(k);
    if (next === "overview") p.delete("tab");
    else p.set("tab", next);
    setParams(p, { replace: false });
    setNavOpen(false);
    const grid = document.querySelector(".mp-grid");
    if (grid && grid.getBoundingClientRect().top < 0) window.scrollTo({ top: window.scrollY + grid.getBoundingClientRect().top - 80, behavior: "smooth" });
  }

  /* Members / all-events lists for their tabs. */
  useEffect(() => {
    if (tab !== "members" || members !== null || !access.isMember) return;
    const controller = new AbortController();
    listMembers(organizationId, { departmentId: ministryId, page: 1, pageSize: 100, status: MembershipStatus.Active }, controller.signal)
      .then((res) => !controller.signal.aborted && setMembers(res.items ?? []))
      .catch((err) => !controller.signal.aborted && setMembersError(errorMessage(err, "Members could not be loaded.")));
    return () => controller.abort();
  }, [tab, members, access.isMember, organizationId, ministryId]);

  useEffect(() => {
    if (tab !== "events" || allEvents !== null || !signedIn) return;
    const controller = new AbortController();
    listEvents(organizationId, { departmentId: ministryId, from: new Date().toISOString(), page: 1, pageSize: 50 }, controller.signal)
      .then((res) => !controller.signal.aborted && setAllEvents(res.items ?? []))
      .catch(() => !controller.signal.aborted && setAllEvents([]));
    return () => controller.abort();
  }, [tab, allEvents, signedIn, organizationId, ministryId]);

  const theme = churchTheme(params.get("theme") || org?.websiteTheme || DEFAULT_CHURCH_THEME);
  const themeVars = useMemo(() => churchThemeVars(theme), [theme]);

  /* ----------------------------------------------------------- actions */

  function done(message: string) {
    setDialog(null);
    setNotice({ tone: "ok", text: message });
    setAllEvents(null);
    reload();
  }

  async function onBannerFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !data) return;
    if (!BANNER_TYPES.includes(file.type)) return setNotice({ tone: "error", text: "Choose a JPG, PNG or WebP picture." });
    if (file.size > BANNER_MAX) return setNotice({ tone: "error", text: "That picture is larger than 10 MB." });
    setBusy("banner");
    setNotice(null);
    try {
      const up = await uploadMediaFile(organizationId, file);
      await updateDepartment(organizationId, ministryId, { photoUrl: up.fileUrl });
      done("Banner photo updated.");
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err, "The banner photo could not be uploaded.") });
    } finally {
      setBusy(null);
    }
  }

  async function removeBanner() {
    if (!window.confirm("Remove the banner photo?")) return;
    setBusy("banner");
    try {
      await updateDepartment(organizationId, ministryId, { photoUrl: "" });
      done("Banner photo removed.");
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err, "The banner photo could not be removed.") });
    } finally {
      setBusy(null);
    }
  }

  async function onPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const bad = files.find((f) => !BANNER_TYPES.includes(f.type) || f.size > BANNER_MAX);
    if (bad) return setNotice({ tone: "error", text: `“${bad.name}” must be a JPG, PNG or WebP picture under 10 MB.` });
    setBusy("photos");
    setNotice({ tone: "ok", text: `Uploading ${files.length} photo${files.length === 1 ? "" : "s"}…` });
    try {
      await uploadMinistryPhotos(organizationId, ministryId, files);
      done(`${files.length} photo${files.length === 1 ? "" : "s"} added to the gallery.`);
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err, "The photos could not be uploaded.") });
      reload();
    } finally {
      setBusy(null);
    }
  }

  async function join() {
    if (!data) return;
    // Ministries that review members take an application instead.
    if (ma && ma.settings.joinMode !== "open") {
      setDialog("apply");
      return;
    }
    setBusy("join");
    try {
      await joinDepartment(organizationId, ministryId);
      done(`You joined ${data.ministry.name}.`);
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err, "You could not join this ministry.") });
    } finally {
      setBusy(null);
    }
  }

  /* ------------------------------------------------------------ states */

  if (loading) {
    return (
      <div className="cw" style={themeVars as React.CSSProperties}>
        <div className="cw-loading cw-loading--page">
          <Loader2 className="cw-spin" aria-hidden="true" /> Loading…
        </div>
      </div>
    );
  }

  if (error || !org || !data) {
    return (
      <div className="cw" style={themeVars as React.CSSProperties}>
        <div className="mp-missing">
          <h1>Ministry not found</h1>
          <p>{error ?? "It may have been removed or made private."}</p>
          <Link to={`/organizations/${encodeURIComponent(organizationId)}`} className="cw-btn cw-btn--primary">
            Back to the church
          </Link>
        </div>
      </div>
    );
  }

  const m = data.ministry;
  const short = shortName(m.name);
  const home = `/organizations/${encodeURIComponent(org.id)}`;
  const email = org.contact?.email;
  const signIn = "/login?returnTo=" + encodeURIComponent(window.location.pathname + window.location.search);
  const eventHref = (id: string) => (signedIn ? `${home}/events/${encodeURIComponent(id)}` : signIn);

  /* ---------------------------------------------------------- pieces */

  const statCards: { icon: LucideIcon; value: string; label: string }[] = [
    { icon: UsersRound, value: data.stats.members.toLocaleString(), label: "Members" },
    { icon: Crown, value: data.stats.leaders.toLocaleString(), label: "Leaders" },
    { icon: CalendarDays, value: data.stats.upcomingEvents.toLocaleString(), label: "Upcoming Events" },
    { icon: BookOpen, value: data.stats.bibleStudies.toLocaleString(), label: "Bible Studies" },
    { icon: BadgeCheck, value: data.stats.averageAttendance === null ? "—" : `${data.stats.averageAttendance}%`, label: "Avg. Attendance" },
  ];

  const more = (label: string, to: Tab) => (
    <button type="button" className="mp-more" onClick={() => go(to)}>
      {label} <ArrowRight aria-hidden="true" />
    </button>
  );

  const eventRows = (items: MinistryEventItem[]) =>
    items.length === 0 ? (
      <Empty hint={access.manageEvents ? "Use Quick Actions → Create Event." : undefined}>No upcoming events right now.</Empty>
    ) : (
      <ul className="mp-events">
        {items.map((e) => {
          const d = dateBox(e.startsAt);
          const img = mediaUrl(e.coverImageUrl);
          return (
            <li key={e.id}>
              <Link to={eventHref(e.id)} className="mp-event">
                <span className="mp-event__date">
                  <small>{d.month}</small>
                  <b>{d.day}</b>
                </span>
                <span className="mp-event__img" style={img ? { backgroundImage: `url("${img}")` } : undefined}>
                  {!img && <CalendarDays aria-hidden="true" />}
                </span>
                <span className="mp-event__body">
                  <strong>{e.title}</strong>
                  <small>
                    <Clock aria-hidden="true" /> {eventWhen(e)}
                  </small>
                  {(e.location || e.isOnline) && (
                    <small>
                      <MapPin aria-hidden="true" /> {e.isOnline ? "Online" : e.location}
                    </small>
                  )}
                </span>
                {e.requiresRsvp && <span className="mp-badge">Registration open</span>}
                <ChevronRight className="mp-event__go" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    );

  const studyRows = (items: MinistryStudy[]) =>
    items.length === 0 ? (
      <Empty hint={access.manageMedia ? "Use Quick Actions → Add Bible Study." : undefined}>No Bible studies yet.</Empty>
    ) : (
      <ul className="mp-studies">
        {items.map((s) => {
          const thumb = mediaUrl(s.thumbnailUrl);
          return (
            <li key={s.id}>
              <a
                href={mediaUrl(s.url) ?? "#"}
                className="mp-study"
                onClick={(e) => {
                  e.preventDefault();
                  const url = mediaUrl(s.url);
                  if (url) setPlaying({ title: s.title, subtitle: [s.speaker, shortDate(s.publishedAt), duration(s.durationSeconds)].filter(Boolean).join(" • "), url, mediaType: s.mediaType, posterUrl: thumb });
                }}
              >
                <span className="mp-study__thumb" style={thumb ? { backgroundImage: `url("${thumb}")` } : undefined}>
                  <span className="mp-play" aria-hidden="true">
                    {s.mediaType === "document" ? <FileText /> : <PlayCircle />}
                  </span>
                </span>
                <span>
                  <strong>{s.title}</strong>
                  <small>
                    <Clock aria-hidden="true" /> {[shortDate(s.publishedAt), duration(s.durationSeconds)].filter(Boolean).join(" • ")}
                  </small>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    );

  // Photos open in a viewer over the page (with a close button), not a new tab.
  const lightboxPhotos = data.photos.map((p) => ({ src: mediaUrl(p.url) ?? "", title: p.title })).filter((p) => p.src);
  const openPhoto = (id: string) => {
    const i = data.photos.filter((p) => mediaUrl(p.url)).findIndex((p) => p.id === id);
    if (i >= 0) setPhotoIndex(i);
  };

  const photoGrid = (limit: number) =>
    data.photos.length === 0 ? (
      <Empty hint={access.manageMedia ? "Use Quick Actions → Upload Photo." : undefined}>No photos yet.</Empty>
    ) : (
      <ul className={"mp-photos" + (limit > 4 ? " mp-photos--all" : "")}>
        {data.photos.slice(0, limit).map((p) => {
          const src = mediaUrl(p.thumbnailUrl || p.url);
          return (
            <li key={p.id}>
              <button type="button" className="mp-photo-btn" onClick={() => openPhoto(p.id)} title={p.title} aria-label={p.title ? `Open photo: ${p.title}` : "Open photo"}>
                <img src={src ?? ""} alt={p.title} loading="lazy" />
              </button>
            </li>
          );
        })}
      </ul>
    );

  const leaderList = (full: boolean) =>
    data.leaders.length === 0 ? (
      <Empty hint={access.manageMinistry ? "Assign leaders in Settings." : undefined}>Leaders will be listed here.</Empty>
    ) : (
      <ul className={"mp-leaders" + (full ? " mp-leaders--full" : "")}>
        {data.leaders.slice(0, full ? undefined : 3).map((l) => (
          <li key={l.membershipId}>
            <LeaderAvatar leader={l} size={full ? 64 : 46} />
            <span>
              <strong>{l.displayName}</strong>
              <small>{l.title || "Ministry Leader"}</small>
            </span>
            {access.manageMinistry && (
              <button type="button" className="mp-dots" aria-label={`Edit ${l.displayName}'s position`} onClick={() => setDialog({ leader: l })}>
                <MoreHorizontal aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
    );

  const scheduleList = (
    <>
      {data.meetingSchedule.length === 0 ? (
        <Empty hint={access.manageMinistry ? "Add meetings with “Edit Schedule”." : undefined}>Meeting times will be posted soon.</Empty>
      ) : (
        <ul className="mp-schedule">
          {data.meetingSchedule.map((s, i) => (
            <li key={i}>
              <span className="mp-schedule__icon">
                <CalendarDays aria-hidden="true" />
              </span>
              <span>
                <strong>{s.name}</strong>
                <small>{[s.day, [s.startTime, s.endTime].filter(Boolean).join(" – ")].filter(Boolean).join(", ")}</small>
                {s.location &&
                  (/^https?:\/\//i.test(s.location) ? (
                    <a href={s.location} target="_blank" rel="noreferrer">
                      Join online
                    </a>
                  ) : (
                    <small>{s.location}</small>
                  ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  const joinButton = ma?.isMember ? (
    <span className="cw-pill mp-pill-block">You are a member of {m.name}</span>
  ) : ma?.hasPendingApplication ? (
    <span className="cw-pill mp-pill-block">Your application is waiting for review</span>
  ) : access.isMember && ma && (ma.settings.joinMode === "invite" || ma.status !== "active") ? (
    <span className="cw-pill mp-pill-block">{ma.status !== "active" ? "Not accepting members right now" : "Members are added by the ministry leaders"}</span>
  ) : access.isMember ? (
    <button type="button" className="cw-btn cw-btn--primary cw-btn--block" onClick={join} disabled={busy === "join"}>
      {busy === "join" ? <Loader2 className="cw-spin" aria-hidden="true" /> : <UserPlus aria-hidden="true" />} {ma && ma.settings.joinMode === "application" ? "Apply to Join" : "Join"} {m.name}
    </button>
  ) : access.isPending ? (
    <span className="cw-pill mp-pill-block">Membership request pending</span>
  ) : (
    <Link to={signedIn ? `${home}/join` : signIn} className="cw-btn cw-btn--primary cw-btn--block">
      <UserPlus aria-hidden="true" /> Join {m.name}
    </Link>
  );

  /* ------------------------------------------------------------ tabs */

  let content: ReactNode;
  switch (tab) {
    case "about":
      content = (
        <div className="mp-col">
          <Card icon={Info} title={`About ${m.name}`}>
            <p className="mp-prose">{m.description || `${m.name} hasn't added a description yet.`}</p>
            {access.manageMinistry && (
              <p className="mp-note">
                Edit the name and description in{" "}
                <button type="button" className="mn-link" onClick={() => go("settings")}>
                  Settings
                </button>
                .
              </p>
            )}
          </Card>
          <div className="mp-two">
            <Card icon={UserRound} title="Leadership">
              {leaderList(false)}
            </Card>
            <Card icon={CalendarDays} title="Meetings">
              {scheduleList}
            </Card>
          </div>
        </div>
      );
      break;

    case "members":
      content = (
        <Card icon={UsersRound} title={`${m.name} Members`} action={<span className="mp-count">{data.stats.members.toLocaleString()} active</span>}>
          {membersError ? (
            <Empty>{access.viewDirectory ? membersError : "The member list is visible to ministry leaders and people allowed to view the member directory."}</Empty>
          ) : members === null ? (
            <div className="cw-loading">
              <Loader2 className="cw-spin" aria-hidden="true" /> Loading members…
            </div>
          ) : members.length === 0 ? (
            <Empty hint={access.manageMinistry ? "Add members from Settings → ministry members." : undefined}>No members yet.</Empty>
          ) : (
            <ul className="mp-people">
              {members.map((p) => {
                const src = mediaUrl(p.profile?.avatarUrl);
                return (
                  <li key={p.id}>
                    <Link to={`${home}/members/${encodeURIComponent(p.id)}`}>
                      <span className="mp-avatar" style={{ width: 44, height: 44 }}>
                        {src ? <img src={src} alt="" /> : initials(p.profile?.displayName ?? "?")}
                      </span>
                      <span>{p.profile?.displayName ?? "Member"}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      );
      break;

    case "leadership":
      content = (
        <Card icon={UserRound} title="Ministry Leadership">
          {leaderList(true)}
        </Card>
      );
      break;

    case "schedule":
      content = (
        <Card
          icon={CalendarDays}
          title={`${short} Meeting Schedule`}
          action={
            access.manageMinistry ? (
              <button type="button" className="cw-btn cw-btn--outline cw-btn--sm" onClick={() => setDialog("schedule")}>
                Edit Schedule
              </button>
            ) : undefined
          }
        >
          {scheduleList}
        </Card>
      );
      break;

    case "events":
      content = (
        <Card
          icon={CalendarDays}
          title={`Upcoming ${short} Events`}
          action={
            access.manageEvents ? (
              <button type="button" className="cw-btn cw-btn--primary cw-btn--sm" onClick={() => setDialog("event")}>
                Create Event
              </button>
            ) : undefined
          }
        >
          {signedIn && allEvents === null ? (
            <div className="cw-loading">
              <Loader2 className="cw-spin" aria-hidden="true" /> Loading events…
            </div>
          ) : (
            eventRows(
              signedIn && allEvents
                ? allEvents.map((e) => ({
                    id: e.id,
                    title: e.title,
                    startsAt: e.startsAt,
                    endsAt: e.endsAt ?? null,
                    location: e.location ?? "",
                    isOnline: Boolean(e.isOnline),
                    coverImageUrl: e.coverImageUrl ?? null,
                    requiresRsvp: Boolean((e as { requiresRsvp?: boolean }).requiresRsvp),
                  }))
                : data.events,
            )
          )}
        </Card>
      );
      break;

    case "studies":
      content = (
        <Card
          icon={BookOpen}
          title="Bible Studies & Resources"
          action={
            access.manageMedia ? (
              <button type="button" className="cw-btn cw-btn--primary cw-btn--sm" onClick={() => setDialog("study")}>
                Add Bible Study
              </button>
            ) : undefined
          }
        >
          {studyRows(data.studies)}
        </Card>
      );
      break;

    case "announcements":
      content = (
        <Card
          icon={Megaphone}
          title="Announcements"
          action={
            access.manageAnnouncements ? (
              <button type="button" className="cw-btn cw-btn--primary cw-btn--sm" onClick={() => setDialog("announcement")}>
                New Announcement
              </button>
            ) : undefined
          }
        >
          {data.announcements.length === 0 ? (
            <Empty>No public announcements yet.</Empty>
          ) : (
            <ul className="mp-news">
              {data.announcements.map((a) => (
                <li key={a.id}>
                  <strong>
                    {a.pinned && <span className="mp-badge">Pinned</span>} {a.title}
                  </strong>
                  <small>
                    {shortDate(a.publishedAt)} • {m.name}
                  </small>
                  <p>{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      );
      break;

    case "gallery":
      content = (
        <Card
          icon={Images}
          title="Photo Gallery"
          action={
            access.manageMedia ? (
              <button type="button" className="cw-btn cw-btn--primary cw-btn--sm" onClick={() => photoInput.current?.click()} disabled={busy === "photos"}>
                {busy === "photos" ? <Loader2 className="cw-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />} Upload Photos
              </button>
            ) : undefined
          }
        >
          {photoGrid(48)}
        </Card>
      );
      break;

    case "website":
      content = (
        <div className="mp-col">
          <Card icon={Globe} title="Manage Ministry Banner">
            <p className="mp-note">
              The banner shows on this ministry's page and as its picture on the church website. Use a wide landscape photo (about 1600 × 400), JPG, PNG or WebP, up to 10 MB.
            </p>
            <div className="mp-banner-preview">
              <MinistryBanner ministryName={m.name} organizationName={org.name} description={m.description} imageUrl={m.photoUrl} ministryType={m.departmentType} />
            </div>
            <div className="mp-actions-row">
              <button type="button" className="cw-btn cw-btn--primary" onClick={() => bannerInput.current?.click()} disabled={busy === "banner" || !access.manageMinistry || !access.manageMedia}>
                {busy === "banner" ? <Loader2 className="cw-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />} Upload Banner Photo
              </button>
              {m.photoUrl && (
                <button type="button" className="cw-btn cw-btn--outline" onClick={removeBanner} disabled={busy === "banner" || !access.manageMinistry}>
                  <Trash2 aria-hidden="true" /> Remove photo
                </button>
              )}
            </div>
          </Card>
          <Card icon={Settings} title="Ministry Details">
            <p className="mp-note">The ministry name and description in the banner come from the ministry record.</p>
            <div className="mp-actions-row">
              {access.manageMinistry && (
                <Link to={`${home}/admin/departments`} className="cw-btn cw-btn--outline">
                  Edit name & description
                </Link>
              )}
              {access.manageMinistry && (
                <button type="button" className="cw-btn cw-btn--outline" onClick={() => setDialog("schedule")}>
                  Edit meeting schedule
                </button>
              )}
              <button type="button" className="cw-btn cw-btn--outline" onClick={() => go("overview")}>
                Preview page
              </button>
            </div>
          </Card>
        </div>
      );
      break;

    case "teams":
    case "applications":
    case "finances":
    case "documents":
    case "reports":
    case "settings":
      content = ma ? (
        <MinistryManageTab tab={tab as ManageTabKey} organizationId={organizationId} ministryId={ministryId} ministryName={m.name} access={ma} onChanged={reload} />
      ) : null;
      break;

    default:
      content = (
        <div className="mp-col">
          <div className="mp-stats">
            {statCards.map((s) => (
              <div key={s.label} className="mp-stat">
                <s.icon aria-hidden="true" />
                <b>{s.value}</b>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          <div className="mp-two">
            <Card icon={CalendarDays} title={`Upcoming ${short} Events`} action={more("View All Events", "events")}>
              {eventRows(data.events.slice(0, 3))}
            </Card>

            <Card icon={Megaphone} title="Latest Announcement" action={more("View All", "announcements")}>
              {data.announcements[0] ? (
                <article className="mp-latest">
                  <span className="mp-latest__img" style={m.photoUrl ? { backgroundImage: `url("${mediaUrl(m.photoUrl)}")` } : undefined}>
                    {!m.photoUrl && <Megaphone aria-hidden="true" />}
                  </span>
                  <strong>{data.announcements[0].title}</strong>
                  <small>
                    {shortDate(data.announcements[0].publishedAt)} • {m.name}
                  </small>
                  <p>{data.announcements[0].body}</p>
                  <button type="button" className="cw-btn cw-btn--primary cw-btn--sm" onClick={() => go("announcements")}>
                    Read More
                  </button>
                </article>
              ) : (
                <Empty hint={access.manageAnnouncements ? "Use Quick Actions → Create Announcement." : undefined}>No announcements yet.</Empty>
              )}
            </Card>
          </div>

          <div className="mp-two mp-two--gallery">
            <Card icon={Images} title="Photo Gallery" action={more("View All Photos", "gallery")}>
              {photoGrid(4)}
            </Card>
            <Card icon={BookOpen} title="Recent Bible Studies" action={more("View All Studies", "studies")}>
              {studyRows(data.studies.slice(0, 3))}
            </Card>
          </div>
        </div>
      );
  }

  /* ----------------------------------------------------------- render */

  return (
    <div className="cw mp" style={themeVars as React.CSSProperties} data-theme={theme.id}>
      <ChurchSiteHeader org={org} signedIn={signedIn} active="ministries" onHomePage={false} ministries={ministries} />

      <nav className="mp-crumbs" aria-label="Breadcrumb">
        <Link to={home}>
          <Home aria-hidden="true" /> Home
        </Link>
        <ChevronRight aria-hidden="true" />
        <a href={`${home}#ministries`}>Ministries</a>
        <ChevronRight aria-hidden="true" />
        <span aria-current="page">{m.name}</span>
      </nav>

      <div className="mp-banner-wrap">
        <MinistryBanner ministryName={m.name} organizationName={org.name} description={m.description} imageUrl={m.photoUrl} ministryType={m.departmentType} />
      </div>

      <input ref={bannerInput} type="file" accept={BANNER_TYPES.join(",")} hidden onChange={onBannerFile} />
      <input ref={photoInput} type="file" accept={BANNER_TYPES.join(",")} multiple hidden onChange={onPhotos} />

      {notice && (
        <div className="mp-notice">
          <Alert tone={notice.tone === "ok" ? "ok" : "error"}>{notice.text}</Alert>
        </div>
      )}

      <div className="mp-grid">
        {/* -------------------------------------------- left navigation */}
        <aside className={"mp-side" + (navOpen ? " is-open" : "")} aria-label={`${m.name} navigation`}>
          <button type="button" className="mp-side__toggle" onClick={() => setNavOpen((v) => !v)} aria-expanded={navOpen}>
            {navOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />} {tabs.find((t) => t.key === tab)?.label ?? "Overview"}
          </button>
          <div className="mp-side__card">
            <h2 className="mp-side__title">
              <UsersRound aria-hidden="true" /> {m.name}
            </h2>
            <ul>
              {tabs.map((t) => (
                <li key={t.key}>
                  {t.to ? (
                    <Link to={t.to} className="mp-side__link">
                      <t.icon aria-hidden="true" /> {t.label}
                    </Link>
                  ) : (
                    <button type="button" className={"mp-side__link" + (tab === t.key ? " is-active" : "")} aria-current={tab === t.key ? "page" : undefined} onClick={() => go(t.key as Tab)}>
                      <t.icon aria-hidden="true" /> {t.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* ------------------------------------------------ main content */}
        {tab === "attendance" && att ? (
          <MinistryAttendance
            organizationId={organizationId}
            ministryId={ministryId}
            ministryName={m.name}
            ministryPhotoUrl={m.photoUrl ?? null}
            canView={att.canView}
            canManage={att.canManage}
            goTab={(t) => go(t as Tab)}
          />
        ) : (
          <>
        <main className="mp-main">{content}</main>

        {/* ------------------------------------------------ right column */}
        <aside className="mp-right" aria-label="Leadership, schedule and quick actions">
          <Card icon={UsersRound} title="Ministry Leadership">
            {leaderList(false)}
            {data.leaders.length > 0 && (
              <button type="button" className="cw-btn cw-btn--outline cw-btn--block" onClick={() => go("leadership")}>
                View Leadership Team <ArrowRight aria-hidden="true" />
              </button>
            )}
          </Card>

          <Card icon={CalendarDays} title={`${short} Meeting Schedule`}>
            {scheduleList}
            <button type="button" className="cw-btn cw-btn--outline cw-btn--block" onClick={() => (access.manageMinistry && data.meetingSchedule.length === 0 ? setDialog("schedule") : go("schedule"))}>
              {access.manageMinistry && data.meetingSchedule.length === 0 ? "Add Meetings" : "View Full Schedule"} <ArrowRight aria-hidden="true" />
            </button>
          </Card>

          <Card icon={Zap} title="Quick Actions" className="mp-quick">
            {joinButton}
            {email && (
              <a href={`mailto:${email}?subject=${encodeURIComponent(m.name)}`} className="cw-btn cw-btn--outline cw-btn--block">
                <Mail aria-hidden="true" /> Contact {short} Team
              </a>
            )}
            {access.manageEvents && (
              <button type="button" className="cw-btn cw-btn--outline cw-btn--block" onClick={() => setDialog("event")}>
                <CalendarDays aria-hidden="true" /> Create Event
              </button>
            )}
            {access.manageAnnouncements && (
              <button type="button" className="cw-btn cw-btn--outline cw-btn--block" onClick={() => setDialog("announcement")}>
                <Megaphone aria-hidden="true" /> Create Announcement
              </button>
            )}
            {access.manageMedia && (
              <button type="button" className="cw-btn cw-btn--outline cw-btn--block" onClick={() => photoInput.current?.click()} disabled={busy === "photos"}>
                {busy === "photos" ? <Loader2 className="cw-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />} Upload Photo
              </button>
            )}
            {access.manageMedia && (
              <button type="button" className="cw-btn cw-btn--outline cw-btn--block" onClick={() => setDialog("study")}>
                <BookOpen aria-hidden="true" /> Add Bible Study
              </button>
            )}
            {access.manageMinistry && access.manageMedia && (
              <button type="button" className="cw-btn cw-btn--outline cw-btn--block" onClick={() => bannerInput.current?.click()} disabled={busy === "banner"}>
                {busy === "banner" ? <Loader2 className="cw-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />} Upload Banner Photo
              </button>
            )}
          </Card>
        </aside>
          </>
        )}
      </div>

      {playing && <MediaPlayerDialog media={playing} onClose={() => setPlaying(null)} />}
      {photoIndex !== null && lightboxPhotos.length > 0 && (
        <PhotoLightbox photos={lightboxPhotos} index={Math.min(photoIndex, lightboxPhotos.length - 1)} onIndex={setPhotoIndex} onClose={() => setPhotoIndex(null)} />
      )}
      {dialog === "apply" && ma && (
        <ApplyDialog
          organizationId={organizationId}
          ministry={{ id: ministryId, name: m.name, joinMode: ma.settings.joinMode }}
          onClose={() => setDialog(null)}
          onDone={(approved) => done(approved ? `You joined ${m.name}.` : "Application sent. The ministry leaders will review it.")}
        />
      )}
      {dialog === "event" && <EventDialog organizationId={organizationId} ministryId={ministryId} onClose={() => setDialog(null)} onDone={done} />}
      {dialog === "announcement" && <AnnouncementDialog organizationId={organizationId} ministryId={ministryId} onClose={() => setDialog(null)} onDone={done} />}
      {dialog === "study" && <StudyDialog organizationId={organizationId} ministryId={ministryId} onClose={() => setDialog(null)} onDone={done} />}
      {dialog === "schedule" && (
        <ScheduleDialog
          organizationId={organizationId}
          ministryId={ministryId}
          onClose={() => setDialog(null)}
          onDone={done}
          initial={data.meetingSchedule}
          defaultTimeZone={att?.settings.timeZone}
        />
      )}
      {dialog && typeof dialog === "object" && (
        <LeaderTitleDialog organizationId={organizationId} ministryId={ministryId} onClose={() => setDialog(null)} onDone={done} leader={dialog.leader} leaders={data.leaders} />
      )}
    </div>
  );
}
