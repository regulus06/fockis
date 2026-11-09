/**
 * OrganizationPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId — the organization's public website, from the
 * reference design: its own top bar, a full-width cover hero with the name,
 * tagline and calls to action, a quick-links card, then About / mission /
 * vision, upcoming events, departments (ministries…), groups, announcements,
 * members, locations, contact and leadership.
 *
 * Works signed out. The server decides what each viewer gets back:
 *   - guests get the public profile only (GET via the public client)
 *   - signed-in people get their membership and permissions too; sections
 *     such as groups or the member directory load only when allowed
 *   - announcements come back filtered by audience on the server
 *
 * Owner / media admins can change or remove the cover from here.
 * Section ids (about, events, departments, groups, announcements, members,
 * locations, contact, leadership) are used by the top bar.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  BellRing,
  CalendarDays,
  Eye,
  Globe,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Megaphone,
  Network,
  Phone,
  PlayCircle,
  Target,
  Trash2,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { getOrganizationEvents } from "../../events/services/eventsApi";
import type { FockisEvent } from "../../events/types/event.types";
import { deleteOrganizationCover, getOrganization, leaveOrganization, uploadOrganizationCover } from "../api/organizationsApi";
import { listDepartments } from "../api/departmentsApi";
import { listGroups } from "../api/groupsApi";
import { listMembers } from "../api/membersApi";
import { getCurrentLiveService } from "../api/organizationLiveApi";
import { publicOrganizationApi } from "../api/visitsApi";
import { getAuthToken } from "../api/organizationApi";
import {
  followOrganization,
  getFollowStatus,
  listVisibleAnnouncements,
  mediaUrl,
  unfollowOrganization,
  type FollowStatus,
  type PublicAnnouncement,
} from "../api/dashboardApi";
import {
  GROUP_TYPE_LABELS,
  MembershipStatus,
  type ChurchGroup,
  type Department,
  type LiveEvent,
  type Member,
  type Organization,
} from "../types/organization.types";
import { typeLabel } from "../ui/orgCategories";
import { categoryInfo, termsFor, welcomesVisitors } from "../ui/orgTerminology";
import { Alert, Avatar, EmptyState, OrgLogoBox, errorMessage, formatDate, useOrgFonts } from "../ui/orgUi";
import FockisFMark from "../ui/FockisFMark";
import "../ui/fockisOrgTheme.scss";
import "../styles/OrganizationPublicSite.scss";

type Permissions = Record<string, boolean | undefined>;
type Viewer = { isAuthenticated?: boolean; isActiveMember?: boolean; isOwner?: boolean; permissions?: Permissions | null };
type Org = Organization & {
  bannerUrl?: string | null;
  bannerMediaType?: "image" | "video" | null;
  currentUserIsOwner?: boolean;
  viewer?: Viewer | null;
  permissions?: Permissions | null;
  memberCount?: number;
};

const MAX_COVER = 100 * 1024 * 1024;

function safeUrl(value?: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function dateParts(iso: string): { month: string; day: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { month: "", day: "", time: "" };
  return {
    month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    day: String(d.getDate()).padStart(2, "0"),
    time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

function joinLabel(type?: string | null): string {
  const c = categoryInfo(type).id;
  if (c === "faith") return /church|christian|ministry|fellowship/.test(String(type)) ? "Join Our Church" : "Join Our Community";
  if (c === "business") return "Join Our Team";
  if (c === "nonprofit") return "Volunteer With Us";
  if (c === "sports") return "Join the Club";
  return "Become a Member";
}

export default function OrganizationPage(): React.JSX.Element {
  useOrgFonts("#f6f9fd");
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const signedIn = Boolean(getAuthToken());

  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<ChurchGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<FockisEvent[]>([]);
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([]);
  const [live, setLive] = useState<LiveEvent | null>(null);
  const [follow, setFollow] = useState<FollowStatus | null>(null);
  const [busy, setBusy] = useState<null | "cover" | "follow" | "leave">(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const o = (signedIn ? await getOrganization(organizationId, controller.signal) : await publicOrganizationApi.get(organizationId)) as Org;
        if (controller.signal.aborted) return;
        setOrg(o);
        setLoading(false);

        const p = o.viewer?.permissions ?? o.permissions ?? {};
        const owner = o.viewer?.isOwner === true || o.currentUserIsOwner === true;
        const can = (...keys: string[]) => owner || keys.some((k) => p?.[k] === true);

        const jobs: [string, Promise<unknown>][] = [
          ["events", getOrganizationEvents(o.id)],
          ["announcements", listVisibleAnnouncements(o.id, 3, controller.signal)],
          ["follow", getFollowStatus(o.id, controller.signal)],
        ];
        if (can("canViewDepartments", "canManageDepartments", "canViewOrganization"))
          jobs.push(["departments", listDepartments(o.id, { page: 1, pageSize: 6 }, controller.signal)]);
        if (can("canViewGroups", "canManageGroups", "canViewOrganization")) jobs.push(["groups", listGroups(o.id, { page: 1, pageSize: 6 }, controller.signal)]);
        if (can("canViewMembers", "canViewMemberDirectory", "canManageMembers"))
          jobs.push(["members", listMembers(o.id, { page: 1, pageSize: 8, status: MembershipStatus.Active }, controller.signal)]);
        if (can("canViewLive", "canManageLive", "canViewOrganization")) jobs.push(["live", getCurrentLiveService(o.id, controller.signal)]);

        const results = await Promise.allSettled(jobs.map((j) => j[1]));
        if (controller.signal.aborted) return;
        results.forEach((r, i) => {
          if (r.status !== "fulfilled") return;
          const v = r.value as { items?: unknown[] } | unknown[] | null;
          const items = (Array.isArray(v) ? v : Array.isArray((v as { items?: unknown[] })?.items) ? (v as { items: unknown[] }).items : []) as never[];
          switch (jobs[i][0]) {
            case "departments":
              setDepartments(items);
              break;
            case "groups":
              setGroups(items);
              break;
            case "members":
              setMembers(items);
              break;
            case "announcements":
              setAnnouncements(items);
              break;
            case "follow":
              setFollow(r.value as FollowStatus);
              break;
            case "events":
              setEvents(
                (items as FockisEvent[])
                  .filter((e) => new Date(e.endDate || e.startDate).getTime() >= Date.now() - 3 * 3600_000)
                  .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate))
                  .slice(0, 6),
              );
              break;
            case "live":
              setLive((r.value as LiveEvent | null) ?? null);
              break;
          }
        });
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(errorMessage(err, "This organization could not be loaded."));
          setLoading(false);
        }
      }
    })();
    return () => controller.abort();
  }, [organizationId, signedIn]);

  const access = useMemo(() => {
    const v = org?.viewer ?? {};
    const p = v.permissions ?? org?.permissions ?? {};
    const status = org?.currentUserMembershipStatus ?? null;
    const isOwner = v.isOwner === true || org?.currentUserIsOwner === true;
    const isMember = v.isActiveMember === true || status === MembershipStatus.Active || isOwner;
    const isAdmin = isOwner || Object.entries(p ?? {}).some(([k, val]) => val === true && k.startsWith("canManage"));
    return { isOwner, isMember, isPending: status === MembershipStatus.Pending, isAdmin, canCover: isOwner || p?.canManageMedia === true };
  }, [org]);

  /* ---------------------------------------------------------- actions */

  async function onCover(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !org) return;
    if (!/^(image|video)\//.test(file.type)) return setNotice({ tone: "error", text: "Choose a picture or a video." });
    if (file.size > MAX_COVER) return setNotice({ tone: "error", text: "That file is larger than 100 MB." });
    setBusy("cover");
    setNotice(null);
    try {
      const res = await uploadOrganizationCover(org.id, file);
      setOrg((o) => (o ? { ...o, bannerUrl: res.bannerUrl ?? o.bannerUrl, bannerMediaType: (res.bannerMediaType as Org["bannerMediaType"]) ?? o.bannerMediaType } : o));
      setNotice({ tone: "ok", text: "Cover updated." });
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err, "The cover could not be uploaded.") });
    } finally {
      setBusy(null);
    }
  }

  async function removeCover() {
    if (!org || !window.confirm("Remove the cover?")) return;
    setBusy("cover");
    try {
      await deleteOrganizationCover(org.id);
      setOrg((o) => (o ? { ...o, bannerUrl: null, bannerMediaType: null } : o));
      setNotice({ tone: "ok", text: "Cover removed." });
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err, "The cover could not be removed.") });
    } finally {
      setBusy(null);
    }
  }

  async function toggleFollow() {
    if (!org) return;
    setBusy("follow");
    try {
      setFollow(follow?.following ? await unfollowOrganization(org.id) : await followOrganization(org.id));
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err, "That didn't work. Please try again.") });
    } finally {
      setBusy(null);
    }
  }

  async function leave() {
    if (!org || !window.confirm(`Leave ${org.name}?`)) return;
    setBusy("leave");
    try {
      await leaveOrganization(org.id);
      setOrg((o) => (o ? { ...o, currentUserMembershipStatus: null, viewer: { ...o.viewer, isActiveMember: false, permissions: null } } : o));
      setGroups([]);
      setDepartments([]);
      setMembers([]);
      setLive(null);
      setNotice({ tone: "ok", text: `You left ${org.name}.` });
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err, "You could not leave this organization.") });
    } finally {
      setBusy(null);
    }
  }

  /* ------------------------------------------------------------ states */

  if (loading) {
    return (
      <div className="fo fos">
        <div className="fos-bar">
          <div className="fos-wrap fos-bar__inner">
            <div className="fo-skeleton" style={{ width: 220, height: 28 }} />
          </div>
        </div>
        <div className="fo-skeleton" style={{ height: 420, borderRadius: 0 }} />
        <div className="fos-wrap" style={{ paddingTop: 30 }}>
          <div className="fo-skeleton" style={{ height: 120 }} />
        </div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="fo fos fos--center">
        <div className="fo-card" style={{ maxWidth: 520 }}>
          <EmptyState icon={Globe} title="Organization not found" text={error ?? "It may have been removed or made private."}>
            <Link to="/organizations/discover" className="fo-btn fo-btn--primary">
              Browse organizations
            </Link>
          </EmptyState>
        </div>
      </div>
    );
  }

  const t = termsFor(org.organizationType);
  const cat = categoryInfo(org.organizationType);
  const visits = welcomesVisitors(org.organizationType);
  const p = (s = "") => `/organizations/${encodeURIComponent(org.id)}${s}`;
  const website = safeUrl(org.website || org.contact?.website);
  const socials = Object.entries(org.contact?.socialLinks ?? {}).filter(([, v]) => v) as [string, string][];
  const branches = org.branches ?? [];
  const leaders = (org.leadership ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const main = branches.find((b) => b.isMainLocation) ?? branches[0];
  const memberCount = org.counts?.members ?? org.memberCount;
  const banner = mediaUrl(org.bannerUrl);
  const tagline = org.tagline || org.description?.split(/(?<=[.!?])\s/)[0] || "";

  const quick = [
    { href: "#events", icon: CalendarDays, title: "Upcoming Events", text: "See what's next", show: true },
    { href: live ? p("/live") : "#about", icon: PlayCircle, title: live ? "Watch Live" : "About Us", text: live ? "Live right now" : "Who we are", show: true, route: Boolean(live) },
    { href: "#departments", icon: Network, title: `Our ${t.departments}`, text: "Serve & get involved", show: departments.length > 0 },
    { href: "#locations", icon: MapPin, title: branches.length > 1 ? "Our Locations" : "Visit Us", text: main?.address?.city ?? "Find us", show: true },
    { href: "#contact", icon: Mail, title: "Contact", text: "Get in touch", show: departments.length === 0 },
  ].filter((q) => q.show);

  const nav = [
    { href: "#top", label: "Home" },
    { href: "#about", label: "About" },
    departments.length > 0 ? { href: "#departments", label: t.departments } : null,
    { href: "#events", label: "Events" },
    groups.length > 0 ? { href: "#groups", label: t.groups } : null,
    { href: "#announcements", label: "News" },
    { href: "#contact", label: "Contact" },
  ].filter(Boolean) as { href: string; label: string }[];

  const ctaJoin = access.isAdmin ? (
    <Link to={p("/admin")} className="fo-btn fo-btn--light">
      <LayoutDashboard aria-hidden="true" /> Admin dashboard
    </Link>
  ) : access.isMember ? (
    <Link to={`/organization/me?organizationId=${encodeURIComponent(org.id)}`} className="fo-btn fo-btn--light">
      Member portal
    </Link>
  ) : access.isPending ? (
    <span className="fo-btn fo-btn--light" aria-disabled="true">
      Request sent
    </span>
  ) : (
    <Link to={p("/join")} className="fo-btn fo-btn--light">
      <UserPlus aria-hidden="true" /> {joinLabel(org.organizationType)}
    </Link>
  );

  return (
    <div className="fo fos" id="top">
      {/* ------------------------------------------------------- top bar */}
      <header className="fos-bar">
        <div className="fos-wrap fos-bar__inner">
          <a href="#top" className="fos-bar__brand">
            <OrgLogoBox name={org.name} url={org.logoUrl} icon={cat.icon} className="fos-bar__logo" />
            <span>{org.name}</span>
          </a>
          <nav className="fos-bar__nav" aria-label={`${org.name} sections`}>
            {nav.map((n) => (
              <a key={n.href} href={n.href}>
                {n.label}
              </a>
            ))}
            {signedIn && <Link to={p("/media")}>Media</Link>}
          </nav>
          {access.isMember || access.isPending ? (
            <span className="fo-badge fo-badge--ok fos-bar__status">{access.isOwner ? "Owner" : access.isMember ? "Member" : "Pending"}</span>
          ) : (
            <Link to={p("/join")} className="fo-btn fo-btn--primary fo-btn--sm">
              Join
            </Link>
          )}
        </div>
      </header>

      {/* ---------------------------------------------------------- hero */}
      <section className={"fos-hero" + (banner ? "" : " fos-hero--plain")}>
        {banner &&
          (org.bannerMediaType === "video" ? (
            <video className="fos-hero__media" src={banner} autoPlay muted loop playsInline />
          ) : (
            <div className="fos-hero__media" style={{ backgroundImage: `url("${banner}")` }} />
          ))}
        <div className="fos-hero__shade" />
        <div className="fos-wrap fos-hero__inner">
          <span className="fos-hero__eyebrow">
            <cat.icon aria-hidden="true" /> {typeLabel(org.organizationType)} · {cat.label}
          </span>
          <h1>{org.name}</h1>
          {tagline && <p className="fos-hero__tagline">{tagline}</p>}
          <div className="fos-hero__actions">
            {visits && !access.isMember && (
              <Link to={p("/visit")} className="fo-btn fo-btn--primary">
                Plan a Visit
              </Link>
            )}
            {ctaJoin}
            {signedIn ? (
              <button type="button" className={"fo-btn fos-follow" + (follow?.following ? " is-on" : "")} onClick={toggleFollow} disabled={busy === "follow"} aria-pressed={Boolean(follow?.following)}>
                {busy === "follow" ? <Loader2 className="fo-spin" aria-hidden="true" /> : follow?.following ? <BellRing aria-hidden="true" /> : <Bell aria-hidden="true" />}
                {follow?.following ? "Following" : "Follow"}
              </button>
            ) : (
              <Link to={"/login?returnTo=" + encodeURIComponent(p())} className="fo-btn fos-follow">
                <Bell aria-hidden="true" /> Follow
              </Link>
            )}
          </div>
          <div className="fos-hero__meta">
            {main?.address?.city && (
              <span>
                <MapPin aria-hidden="true" /> {main.address.city}
              </span>
            )}
            {typeof memberCount === "number" && memberCount > 0 && (
              <span>
                <UsersRound aria-hidden="true" /> {memberCount.toLocaleString()} {memberCount === 1 ? t.person.toLowerCase() : t.people.toLowerCase()}
              </span>
            )}
            {typeof follow?.followers === "number" && follow.followers > 0 && (
              <span>
                <Bell aria-hidden="true" /> {follow.followers.toLocaleString()} follower{follow.followers === 1 ? "" : "s"}
              </span>
            )}
            {org.domain && (
              <span>
                <Globe aria-hidden="true" /> {org.domain}
              </span>
            )}
          </div>
        </div>
        {access.canCover && (
          <div className="fos-hero__cover-tools">
            <input ref={fileInput} type="file" accept="image/*,video/*" hidden onChange={onCover} />
            <button type="button" className="fo-btn fo-btn--light fo-btn--sm" disabled={busy === "cover"} onClick={() => fileInput.current?.click()}>
              {busy === "cover" ? <Loader2 className="fo-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
              {banner ? "Change cover" : "Add cover"}
            </button>
            {banner && (
              <button type="button" className="fo-btn fo-btn--light fo-btn--sm" disabled={busy === "cover"} onClick={removeCover} aria-label="Remove cover">
                <Trash2 aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </section>

      {/* --------------------------------------------------- quick links */}
      <div className="fos-wrap">
        <nav className="fos-quick" aria-label="Quick links">
          {quick.map((q) =>
            q.route ? (
              <Link key={q.title} to={q.href} className="fos-quick__item">
                <q.icon aria-hidden="true" />
                <strong>{q.title}</strong>
                <span>{q.text}</span>
              </Link>
            ) : (
              <a key={q.title} href={q.href} className="fos-quick__item">
                <q.icon aria-hidden="true" />
                <strong>{q.title}</strong>
                <span>{q.text}</span>
              </a>
            ),
          )}
        </nav>

        {notice && (
          <div style={{ marginTop: 18 }}>
            <Alert tone={notice.tone === "ok" ? "ok" : "error"}>{notice.text}</Alert>
          </div>
        )}

        {live && (
          <Link to={p("/live")} className="fos-live">
            <span className="fos-live__dot" aria-hidden="true" /> LIVE
            <strong>{live.title}</strong>
            <span className="fos-live__go">
              Watch now <ArrowRight aria-hidden="true" />
            </span>
          </Link>
        )}

        {/* ------------------------------------------------------ events */}
        <section className="fos-section" id="events" aria-labelledby="fos-events">
          <div className="fos-section__head">
            <h2 id="fos-events">Upcoming Events</h2>
            {signedIn && (
              <Link to={p("/events")} className="fo-btn fo-btn--ghost fo-btn--sm">
                All events <ArrowRight aria-hidden="true" />
              </Link>
            )}
          </div>
          {events.length === 0 ? (
            <p className="fos-empty">No upcoming events right now. Check back soon.</p>
          ) : (
            <div className="fos-events">
              {events.map((e) => {
                const d = dateParts(e.startDate);
                const img = mediaUrl(e.coverImageUrl);
                return (
                  <Link key={e.id} to={`/events/${encodeURIComponent(e.id)}`} className="fos-event">
                    <span className="fos-event__img" style={img ? { backgroundImage: `url("${img}")` } : undefined}>
                      {!img && <CalendarDays aria-hidden="true" />}
                    </span>
                    <span className="fos-event__body">
                      <span className="fos-event__date">
                        <small>{d.month}</small>
                        <b>{d.day}</b>
                      </span>
                      <span>
                        <strong>{e.title}</strong>
                        <small>
                          {d.time}
                          {e.isOnline ? " · Online" : e.locationName ? ` · ${e.locationName}` : ""}
                        </small>
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <div className="fos-grid">
          <div className="fos-main">
            {/* ---------------------------------------------------- about */}
            <section className="fo-card fos-card" id="about" aria-labelledby="fos-about">
              <h2 id="fos-about">About {org.name}</h2>
              <p className="fos-prose">{org.description || `${org.name} hasn't added a description yet.`}</p>
              {(org.mission || org.vision) && (
                <div className="fos-mv">
                  {org.mission && (
                    <div>
                      <span className="fos-mv__icon">
                        <Target aria-hidden="true" />
                      </span>
                      <h3>Our Mission</h3>
                      <p>{org.mission}</p>
                    </div>
                  )}
                  {org.vision && (
                    <div>
                      <span className="fos-mv__icon fos-mv__icon--violet">
                        <Eye aria-hidden="true" />
                      </span>
                      <h3>Our Vision</h3>
                      <p>{org.vision}</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* --------------------------------------------- departments */}
            {departments.length > 0 && (
              <section className="fos-section" id="departments" aria-labelledby="fos-deps">
                <div className="fos-section__head">
                  <h2 id="fos-deps">Our {t.departments}</h2>
                  <Link to={p("/departments")} className="fo-btn fo-btn--ghost fo-btn--sm">
                    View all <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
                <div className="fos-tiles">
                  {departments.map((d) => (
                    <Link key={d.id} to={p("/departments")} className="fos-tile">
                      <span className="fos-tile__icon">
                        <Network aria-hidden="true" />
                      </span>
                      <strong>{d.name}</strong>
                      {d.description && <span>{d.description}</span>}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* -------------------------------------------------- groups */}
            {groups.length > 0 && (
              <section className="fos-section" id="groups" aria-labelledby="fos-groups">
                <div className="fos-section__head">
                  <h2 id="fos-groups">{t.groups}</h2>
                  <Link to={p("/groups")} className="fo-btn fo-btn--ghost fo-btn--sm">
                    View all <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
                <div className="fos-tiles">
                  {groups.map((g) => (
                    <Link key={g.id} to={p("/groups")} className="fos-tile">
                      <span className="fos-tile__icon fos-tile__icon--violet">
                        <UsersRound aria-hidden="true" />
                      </span>
                      <strong>{g.name}</strong>
                      <span>
                        {GROUP_TYPE_LABELS[g.groupType] ?? "Group"}
                        {g.memberCount ? ` · ${g.memberCount} ${t.people.toLowerCase()}` : ""}
                        {g.meetingSchedule ? ` · ${g.meetingSchedule}` : ""}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ------------------------------------------- announcements */}
            <section className="fo-card fos-card" id="announcements" aria-labelledby="fos-news">
              <div className="fos-section__head">
                <h2 id="fos-news">Announcements</h2>
                {access.isMember && (
                  <Link to={p("/communication")} className="fo-btn fo-btn--ghost fo-btn--sm">
                    All <ArrowRight aria-hidden="true" />
                  </Link>
                )}
              </div>
              {announcements.length === 0 ? (
                <p className="fos-empty">No public announcements yet.</p>
              ) : (
                <ul className="fos-news">
                  {announcements.map((a) => (
                    <li key={a.id}>
                      <Megaphone aria-hidden="true" />
                      <div>
                        <strong>{a.title}</strong>
                        <small>{formatDate(a.publishedAt ?? a.createdAt)}</small>
                        <p>{a.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ------------------------------------------------- members */}
            {members.length > 0 && (
              <section className="fo-card fos-card" id="members" aria-labelledby="fos-members">
                <div className="fos-section__head">
                  <h2 id="fos-members">{t.people}</h2>
                  <Link to={p("/members")} className="fo-btn fo-btn--ghost fo-btn--sm">
                    Directory <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
                <ul className="fos-people">
                  {members.map((m) => (
                    <li key={m.id}>
                      <Link to={p(`/members/${encodeURIComponent(m.id)}`)}>
                        <Avatar name={m.profile?.displayName} url={m.profile?.avatarUrl} />
                        <span>{m.profile?.displayName ?? t.person}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!access.isMember && (
              <section className="fos-cta">
                <div>
                  <h2>{visits ? "We'd love to meet you" : `Become part of ${org.name}`}</h2>
                  <p>{visits ? "Plan a visit and we'll be ready to welcome you, or ask to join online." : "Send a membership request — an administrator will review it."}</p>
                </div>
                <div className="fos-cta__actions">
                  {visits && (
                    <Link to={p("/visit")} className="fo-btn fo-btn--light">
                      Plan a Visit
                    </Link>
                  )}
                  {!access.isPending && (
                    <Link to={p("/join")} className="fo-btn fo-btn--primary">
                      Request membership
                    </Link>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* ------------------------------------------------- sidebar */}
          <aside className="fos-side">
            <section className="fo-card fos-card" id="contact" aria-labelledby="fos-contact">
              <h2 id="fos-contact">Contact</h2>
              <ul className="fos-contact">
                {org.contact?.email && (
                  <li>
                    <Mail aria-hidden="true" />
                    <a href={`mailto:${org.contact.email}`}>{org.contact.email}</a>
                  </li>
                )}
                {org.contact?.phone && (
                  <li>
                    <Phone aria-hidden="true" />
                    <a href={`tel:${org.contact.phone}`}>{org.contact.phone}</a>
                  </li>
                )}
                {website && (
                  <li>
                    <Globe aria-hidden="true" />
                    <a href={website} target="_blank" rel="noreferrer">
                      {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  </li>
                )}
                {!org.contact?.email && !org.contact?.phone && !website && <li className="fos-empty">No contact details yet.</li>}
              </ul>
              {socials.length > 0 && (
                <div className="fos-socials">
                  {socials.map(([k, v]) => {
                    const href = safeUrl(v);
                    return href ? (
                      <a key={k} href={href} target="_blank" rel="noreferrer" className="fo-badge">
                        {k === "x" ? "X" : k[0].toUpperCase() + k.slice(1)}
                      </a>
                    ) : null;
                  })}
                </div>
              )}
            </section>

            <section className="fo-card fos-card" id="locations" aria-labelledby="fos-locs">
              <h2 id="fos-locs">{branches.length > 1 ? "Branches & Locations" : "Location"}</h2>
              {branches.length === 0 ? (
                <p className="fos-empty">No location added yet.</p>
              ) : (
                <ul className="fos-locs">
                  {branches.map((b) => {
                    const addr = [b.address?.line1, b.address?.line2, b.address?.city, b.address?.state, b.address?.country].filter(Boolean).join(", ");
                    return (
                      <li key={b.id}>
                        <MapPin aria-hidden="true" />
                        <div>
                          <strong>
                            {b.name} {b.isMainLocation && branches.length > 1 && <span className="fo-badge">Main</span>}
                          </strong>
                          {addr && <span>{addr}</span>}
                          {b.serviceTimes && b.serviceTimes.length > 0 && (
                            <span>
                              {cat.id === "faith" ? "Services" : "Hours"}: {b.serviceTimes.join(" · ")}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="fo-card fos-card" id="leadership" aria-labelledby="fos-lead">
              <h2 id="fos-lead">Leadership</h2>
              {leaders.length === 0 ? (
                <p className="fos-empty">No leaders listed yet.</p>
              ) : (
                <ul className="fos-leaders">
                  {leaders.map((l) => (
                    <li key={l.id}>
                      <Avatar name={l.user?.displayName} url={l.user?.avatarUrl} />
                      <span>
                        <strong>{l.user?.displayName}</strong>
                        <small>{l.title || String(l.role).replace(/_/g, " ")}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {access.isMember && !access.isOwner && (
              <button type="button" className="fo-btn fo-btn--ghost fo-btn--sm" disabled={busy === "leave"} onClick={leave}>
                <LogOut aria-hidden="true" /> Leave {org.name}
              </button>
            )}
            {!signedIn && (
              <div className="fo-alert fo-alert--info">
                <span>
                  {t.people} can see {t.groups.toLowerCase()}, events and the directory.{" "}
                  <Link to={"/login?returnTo=" + encodeURIComponent(p())}>Sign in</Link>
                </span>
              </div>
            )}
          </aside>
        </div>
      </div>

      <footer className="fos-footer">
        <div className="fos-wrap fos-footer__inner">
          <span>
            © {new Date().getFullYear()} {org.name}
          </span>
          <Link to="/organizations" className="fos-footer__powered">
            Powered by <FockisFMark size={16} /> <b>Fockis</b> Organizations
          </Link>
        </div>
      </footer>
    </div>
  );
}
