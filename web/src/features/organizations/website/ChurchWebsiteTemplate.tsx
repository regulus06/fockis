/**
 * ChurchWebsiteTemplate.tsx
 * -----------------------------------------------------------------------------
 * The Fockis Church Website Template — the public website every church gets at
 * /organizations/:organizationId. Layout follows the Fockis Community Church
 * reference design:
 *
 *   white header · cover hero with welcome, verse/mission line and service
 *   schedule card · church profile + Member Portal sidebar · quick navigation ·
 *   Upcoming Events · Latest Sermons · Our Ministries · Give · Prayer ·
 *   Visit Us strip · About · Mission & Vision · Contact (form) · footer
 *
 * The same layout serves every kind of organization: siteProfile.ts gives the
 * words and features (a church gets sermons, prayer requests and service
 * times; a business gets videos, a request card and opening hours).
 *
 * Everything shown comes from that church's own records (organization profile,
 * branches/service times, events, media, departments, announcements, follow
 * counts). Nothing is demo content: a section without data shows an empty
 * state, and admins get a hint about where to add it.
 *
 * Colours come from churchThemes.ts (Ocean Blue by default). `?theme=<id>`
 * in the URL previews another theme without saving anything.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  BellRing,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Church,
  Eye,
  Clock,
  HandHeart,
  HeartHandshake,
  IdCard,
  ImageIcon,
  LayoutDashboard,
  Loader2,
  Lock,
  Mail,
  Map as MapIcon,
  MapPin,
  Megaphone,
  Music,
  Eye as EyeIcon,
  Target,
  HandCoins,
  Pencil,
  MessageSquareText,
  Network,
  Phone,
  PlayCircle,
  ScrollText,
  Settings,
  Trash2,
  Upload,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { FockisEvent } from "../../events/types/event.types";
import { mediaUrl, type FollowStatus, type PublicAnnouncement } from "../api/dashboardApi";
import type { MediaItem } from "../api/mediaApi";
import type { Department, LiveEvent, Organization } from "../types/organization.types";
import FockisFMark from "../ui/FockisFMark";
import ChurchSiteHeader, { ChurchLogo, brandLines } from "./ChurchSiteHeader";
import { churchTheme, churchThemeVars, DEFAULT_CHURCH_THEME } from "./churchThemes";
import { listLatestSermons, listLatestVideos, listPublicMinistries, type PublicMinistry } from "./publicSiteApi";
import { isChurchType, siteProfile } from "./siteProfile";
import { usePublicSeo } from "./usePublicSeo";
import SocialIcons from "./SocialIcons";
import PageBrandingEditor from "../branding/PageBrandingEditor";
import { membersApi } from "../api/membersApi";
import MediaPlayerDialog, { type PlayableMedia } from "./MediaPlayerDialog";
import ContactChurchSection from "./ContactChurchSection";
import LiveServicesSection from "../live-center/LiveServicesSection";
import GiveDialog from "../giving/GiveDialog";
import HeroBackgroundDialog, { HERO_KEY, HeroBackdrop, heroFromBranding, heroFromCover, removeHeroBackground, saveHeroBackground, type HeroBg } from "./HeroBackground";
import { usePageBranding } from "../branding/usePageBranding";
import { givingApi, type GivingInfo } from "../giving/givingApi";
import { adminCenterApi } from "../settings-center/adminCenterApi";
import "../styles/ChurchWebsite.scss";

/* ============================================================================
 * Types
 * ========================================================================== */

export type ChurchSiteOrg = Organization & {
  bannerUrl?: string | null;
  bannerMediaType?: "image" | "video" | null;
  memberCount?: number;
  /** Optional saved theme id, when the server provides one. */
  websiteTheme?: string | null;
};

export interface ChurchSiteAccess {
  isOwner: boolean;
  isMember: boolean;
  isPending: boolean;
  isAdmin: boolean;
}

export interface ChurchWebsiteTemplateProps {
  org: ChurchSiteOrg;
  signedIn: boolean;
  access: ChurchSiteAccess;
  events: FockisEvent[];
  /** Departments the viewer may see (members). Guests get the public list. */
  departments: Department[];
  announcements: PublicAnnouncement[];
  live: LiveEvent | null;
  follow: FollowStatus | null;
  followBusy: boolean;
  onToggleFollow: () => void;
  /** Cover upload controls for admins, rendered in the admin strip. */
  adminTools?: ReactNode;
  /** Success / error message from the page. */
  notice?: ReactNode;
}

/* ============================================================================
 * Helpers
 * ========================================================================== */

/** Organization types that get church words and features (kept for existing imports). */
export { isChurchType };

const ABOUT_KEY = "website-about";

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

function eventDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { month: "", day: "", line: "" };
  return {
    month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    day: String(d.getDate()),
    line: `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} • ${d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })}`,
  };
}

function shortDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function duration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** "Sunday Worship – 10:00 AM" → { title, when }. Free text stays as the title. */
function splitServiceTime(raw: string): { title: string; when: string } {
  const text = raw.trim();
  const m = text.match(/^(.+?)\s*(?:[–—|]|\s-\s|:\s)\s*(.+)$/);
  if (m && /\d/.test(m[2])) return { title: m[1].trim(), when: m[2].trim() };
  return { title: text, when: "" };
}

function serviceIcon(title: string): LucideIcon {
  const t = title.toLowerCase();
  if (/bible|study|class|school/.test(t)) return BookOpen;
  if (/pray/.test(t)) return HeartHandshake;
  if (/youth|young|teen|kids|child/.test(t)) return UsersRound;
  if (/music|choir|worship night/.test(t)) return Music;
  return Clock;
}

function ministryIcon(name: string): LucideIcon {
  const t = name.toLowerCase();
  if (/music|worship|choir|praise/.test(t)) return Music;
  if (/pray/.test(t)) return HeartHandshake;
  if (/bible|study|school|teach/.test(t)) return BookOpen;
  if (/outreach|mission|evangel/.test(t)) return HandHeart;
  return UsersRound;
}


function SectionHead({ icon: Icon, title, id, action }: { icon: LucideIcon; title: string; id: string; action?: ReactNode }) {
  return (
    <div className="cw-head">
      <h2 id={id}>
        <Icon aria-hidden="true" /> {title}
      </h2>
      {action}
    </div>
  );
}

/* ============================================================================
 * Component
 * ========================================================================== */

export default function ChurchWebsiteTemplate({
  org,
  signedIn,
  access,
  events,
  departments,
  announcements,
  live,
  follow,
  followBusy,
  onToggleFollow,
  adminTools,
  notice,
}: ChurchWebsiteTemplateProps): React.JSX.Element {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const theme = churchTheme(params.get("theme") || org.websiteTheme || DEFAULT_CHURCH_THEME);
  const profile = useMemo(() => siteProfile(org.organizationType), [org.organizationType]);
  const themeVars = useMemo(() => churchThemeVars(theme), [theme]);

  const [photoBroken, setPhotoBroken] = useState(false);
  const [publicMinistries, setPublicMinistries] = useState<PublicMinistry[]>([]);
  const [sermons, setSermons] = useState<MediaItem[]>([]);
  const [sermonsLoading, setSermonsLoading] = useState(true);
  // Sermons play here in a player instead of opening (and downloading) the file.
  const [playing, setPlaying] = useState<PlayableMedia | null>(null);
  const play = (item: MediaItem) => {
    const url = mediaUrl(item.fileUrl);
    if (!url) return;
    setPlaying({
      title: item.title,
      subtitle: [item.speaker, shortDate(item.publishedAt ?? item.createdAt)].filter(Boolean).join(" • "),
      url,
      mediaType: item.mediaType,
      mimeType: item.mimeType,
      posterUrl: mediaUrl(item.thumbnailUrl),
    });
  };

  /* Hero background: saved in page branding ("website-hero"), editable by
     people with the Settings & Roles permission (checked by the server). */
  const branding = usePageBranding(org.id);
  const [bgDialog, setBgDialog] = useState<{ picker: boolean } | null>(null);
  const [pendingBg, setPendingBg] = useState<HeroBg | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [bgBusy, setBgBusy] = useState(false);
  const [bgNotice, setBgNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  useEffect(() => {
    if (!bgNotice) return;
    const t = window.setTimeout(() => setBgNotice(null), 5000);
    return () => window.clearTimeout(t);
  }, [bgNotice]);

  /* Give Online: whether this church accepts online gifts, and its funds. */
  // Settings & Roles → Quick Settings (what visitors see). Members and admins see everything.
  const [visibility, setVisibility] = useState<{ allowMembershipRequests: boolean; showLocationsPublicly: boolean; publicEvents: boolean; memberDirectory: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    adminCenterApi
      .publicSettings(org.id, controller.signal)
      .then((v) => !controller.signal.aborted && setVisibility(v))
      .catch(() => !controller.signal.aborted && setVisibility(null));
    return () => controller.abort();
  }, [org.id]);
  const insider = access.isMember || access.isAdmin;
  const showEvents = insider || visibility?.publicEvents !== false;
  const showLocations = insider || visibility?.showLocationsPublicly !== false;
  const showDirectory = access.isAdmin || visibility?.memberDirectory !== false;
  const joinOpen = visibility?.allowMembershipRequests !== false;

  const [giving, setGiving] = useState<GivingInfo | null>(null);
  const [giveOpen, setGiveOpen] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    givingApi
      .info(org.id, controller.signal)
      .then((info) => !controller.signal.aborted && setGiving(info))
      .catch(() => !controller.signal.aborted && setGiving(null));
    return () => controller.abort();
  }, [org.id, signedIn]);

  // Coming back from sign-in with ?give=1 opens the giving form.
  useEffect(() => {
    if (params.get("give") !== "1" || !giving?.enabled || !signedIn) return;
    setGiveOpen(true);
    const next = new URLSearchParams(params);
    next.delete("give");
    setParams(next, { replace: true });
  }, [params, giving?.enabled, signedIn, setParams]);

  /* Sermons + (for viewers who can't read departments) public ministries. */
  useEffect(() => {
    const controller = new AbortController();
    setSermonsLoading(true);
    (profile.mediaKind === "sermons" ? listLatestSermons : listLatestVideos)(org.id, controller.signal)
      .then((items) => !controller.signal.aborted && setSermons(items))
      .catch(() => !controller.signal.aborted && setSermons([]))
      .finally(() => !controller.signal.aborted && setSermonsLoading(false));
    return () => controller.abort();
  }, [org.id, profile.mediaKind]);

  /* The signed-in person's name and photo (header avatar), when a member. */
  const [viewer, setViewer] = useState<{ name?: string | null; avatarUrl?: string | null; profileHref?: string } | null>(null);
  useEffect(() => {
    if (!signedIn || !access.isMember) return setViewer(null);
    const controller = new AbortController();
    membersApi
      .getMyMembership(org.id, controller.signal)
      .then((m) =>
        !controller.signal.aborted &&
        setViewer(m ? { name: m.profile?.displayName ?? null, avatarUrl: m.profile?.avatarUrl ?? null, profileHref: `/organizations/${encodeURIComponent(org.id)}/members/${encodeURIComponent(m.id)}` } : null),
      )
      .catch(() => !controller.signal.aborted && setViewer(null));
    return () => controller.abort();
  }, [org.id, signedIn, access.isMember]);

  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutEditor, setAboutEditor] = useState(false);
  const [giveHistory, setGiveHistory] = useState(false);

  useEffect(() => {
    if (departments.length > 0) return;
    const controller = new AbortController();
    listPublicMinistries(org.id, controller.signal)
      .then((items) => !controller.signal.aborted && setPublicMinistries(items))
      .catch(() => !controller.signal.aborted && setPublicMinistries([]));
    return () => controller.abort();
  }, [org.id, departments.length]);

  /* ------------------------------------------------------------ derived */

  const p = (s = "") => `/organizations/${encodeURIComponent(org.id)}${s}`;
  const portal = `/organization/me?organizationId=${encodeURIComponent(org.id)}`;
  const signIn = "/login?returnTo=" + encodeURIComponent(p());
  const [brand1, brand2] = brandLines(org.name);

  const branches = org.branches ?? [];
  const main = branches.find((b) => b.isMainLocation) ?? branches[0];
  const address = main?.address ? [main.address.line1, main.address.line2, main.address.city, main.address.state, main.address.country].filter(Boolean).join(", ") : "";
  const cityLine = main?.address ? [main.address.city, main.address.country].filter(Boolean).join(", ") : "";
  const phone = main?.contact?.phone || org.contact?.phone || "";
  const email = main?.contact?.email || org.contact?.email || "";
  const website = safeUrl(org.website || org.contact?.website);
  const directions = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  const socials = Object.entries(org.contact?.socialLinks ?? {})
    .map(([k, v]) => [k, safeUrl(v)] as const)
    .filter((e): e is readonly [string, string] => Boolean(e[1]));

  const memberCount = org.counts?.members ?? org.memberCount;
  const followers = follow?.followers;
  const banner = mediaUrl(org.bannerUrl);
  const savedBg = heroFromBranding(branding.publishedFor(HERO_KEY));
  const coverBg = heroFromCover(banner, org.bannerMediaType === "video");
  const heroBg = (previewing && pendingBg) || savedBg || coverBg;

  async function savePending() {
    if (!pendingBg) return;
    setBgBusy(true);
    try {
      await saveHeroBackground(org.id, pendingBg);
      setPendingBg(null);
      setPreviewing(false);
      setBgNotice({ tone: "ok", text: "Background saved. It's now live on your website." });
    } catch (err) {
      setBgNotice({ tone: "error", text: err instanceof Error && err.message ? err.message : "The background could not be saved." });
    } finally {
      setBgBusy(false);
    }
  }

  async function removeSaved() {
    if (!window.confirm(coverBg ? "Remove the custom background? Your cover photo will show instead." : "Remove the background photo?")) return;
    setBgBusy(true);
    try {
      await removeHeroBackground(org.id);
      setBgNotice({ tone: "ok", text: "Background removed." });
    } catch (err) {
      setBgNotice({ tone: "error", text: err instanceof Error && err.message ? err.message : "The background could not be removed." });
    } finally {
      setBgBusy(false);
    }
  }
  const tagline = org.tagline || org.description?.split(/(?<=[.!?])\s/)[0] || "";
  const heroQuote = org.mission?.trim() || "";

  const schedule = useMemo(() => {
    const ordered = main ? [main, ...branches.filter((b) => b !== main)] : branches;
    return ordered.flatMap((b) => (b.serviceTimes ?? []).filter(Boolean)).slice(0, 5).map(splitServiceTime);
  }, [branches, main]);

  const ministries = useMemo(
    () =>
      (departments.length > 0
        ? departments.map((d) => ({ id: d.id, name: d.name, photoUrl: d.photoUrl ?? null }))
        : publicMinistries.map((d) => ({ id: d.id, name: d.name, photoUrl: d.photoUrl ?? null }))
      ).slice(0, 6),
    [departments, publicMinistries],
  );

  const upcoming = events.slice(0, 3);
  const [featured, ...moreSermons] = sermons;

  // Opens the "Contact Our Church" form below with "Prayer request" selected.
  const prayerHref = `#contact-${profile.request.type}`;
  const year = new Date().getFullYear();



  const givingOn = Boolean(giving?.enabled);
  const quick: { icon: LucideIcon; title: string; text: string; href: string; route?: boolean }[] = [
    { icon: PlayCircle, title: profile.contentQuick.title, text: profile.contentQuick.text, href: "#sermons" },
    ...(showEvents ? [{ icon: CalendarDays, title: "Events", text: "Upcoming Events", href: "#events" }] : []),
    { icon: UsersRound, title: profile.departments, text: "Get Involved", href: "#ministries" },
    ...(givingOn ? [{ icon: HandHeart, title: profile.give.nav, text: profile.give.quickText, href: "#give" }] : []),
    { icon: profile.isFaith ? HeartHandshake : MessageSquareText, title: profile.request.quickTitle, text: profile.request.quickText, href: `#contact-${profile.request.type}` },
    access.isMember
      ? { icon: IdCard, title: profile.isChurch ? "My Church" : "My Portal", text: "Member Portal", href: portal, route: true }
      : { icon: UserPlus, title: profile.joinTitle, text: access.isPending ? "Request sent" : joinOpen ? "Become a Member" : "Not accepting requests", href: p("/join"), route: true },
  ];

  // Only pages that exist for this organization; private pages check membership themselves.
  const portalLinks: { icon: LucideIcon; label: string; to?: string; onClick?: () => void; badge?: number }[] = [
    { icon: UserRound, label: "My Profile", to: viewer?.profileHref ?? "/member/settings" },
    { icon: IdCard, label: "My Membership", to: p("/my-badge") },
    { icon: CalendarDays, label: "My Attendance", to: p("/my-history") },
    ...(givingOn ? [{ icon: HandCoins, label: profile.isFaith ? "My Giving & Donations" : "My Donations", onClick: () => (setGiveHistory(true), setGiveOpen(true)) }] : []),
    { icon: UsersRound, label: "My Groups", to: p("/groups") },
    { icon: Network, label: `My ${profile.departments}`, to: profile.isFaith ? p("/ministries") : p("/departments") },
    { icon: CalendarDays, label: "My Events & Registrations", to: p("/events") },
    ...(profile.isFaith ? [{ icon: HeartHandshake, label: "Prayer Requests", to: "#contact-prayer" }] : [{ icon: Mail, label: "My Requests", to: "#contact" }]),
    { icon: Megaphone, label: "Announcements", to: p("/communication"), badge: announcements.length || undefined },
    ...(showDirectory ? [{ icon: ScrollText, label: "Member Directory", to: p("/members") }] : []),
  ];

  const adminHint = (text: string) => (access.isAdmin ? <small className="cw-hint">{text}</small> : null);

  const aboutImage = mediaUrl(branding.publishedFor(ABOUT_KEY)?.bannerDesktop?.url ?? null) ?? (banner && org.bannerMediaType !== "video" ? banner : null);
  const description = (org.description ?? "").trim();
  const aboutShort = description.length > 420 ? description.slice(0, 400).replace(/\s+\S*$/, "") + "…" : description;
  const leaders = (org.leadership ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const hasMore = description.length > aboutShort.length || leaders.length > 0;
  const contactImage = banner && org.bannerMediaType !== "video" ? banner : null;

  /* Search engines and link previews (public data only). */
  const canonicalPath = p();
  usePublicSeo({
    title: tagline ? `${org.name} — ${tagline}` : org.name,
    description: description || tagline || `${org.name} on Fockis Organizations.`,
    canonicalPath,
    image: banner && org.bannerMediaType !== "video" ? banner : mediaUrl(org.logoUrl),
    index: (org as { isDiscoverable?: boolean }).isDiscoverable !== false,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": profile.schemaType,
      name: org.name,
      url: new URL(canonicalPath, window.location.origin).toString(),
      ...(description ? { description: description.slice(0, 500) } : {}),
      ...(mediaUrl(org.logoUrl) ? { logo: new URL(mediaUrl(org.logoUrl) as string, window.location.origin).toString() } : {}),
      ...(phone ? { telephone: phone } : {}),
      ...(email ? { email } : {}),
      ...(showLocations && main?.address
        ? {
            address: {
              "@type": "PostalAddress",
              ...(main.address.line1 ? { streetAddress: [main.address.line1, main.address.line2].filter(Boolean).join(", ") } : {}),
              ...(main.address.city ? { addressLocality: main.address.city } : {}),
              ...(main.address.state ? { addressRegion: main.address.state } : {}),
              ...(main.address.country ? { addressCountry: main.address.country } : {}),
            },
          }
        : {}),
      ...(socials.length ? { sameAs: socials.map(([, href]) => href) } : {}),
    },
  });


  /* ------------------------------------------------------------- render */

  return (
    <div className="cw" id="top" style={themeVars as React.CSSProperties} data-theme={theme.id}>
      <ChurchSiteHeader
        org={org}
        signedIn={signedIn}
        active="home"
        onHomePage
        ministries={ministries}
        showNotificationDot={announcements.length > 0}
        labels={{ departments: profile.departments, content: profile.contentNav, give: givingOn ? profile.give.nav : null, events: showEvents }}
        viewer={viewer}
      />

      {access.isAdmin && (
        <div className="cw-adminbar">
          <span>
            You're viewing your public {profile.isChurch ? "church " : ""}website. Theme: <b>{theme.name}</b>
          </span>
          <span className="cw-adminbar__tools">
            {branding.canEdit && (
              <>
                <button type="button" className="cw-btn cw-btn--light cw-btn--sm" onClick={() => setBgDialog({ picker: false })} disabled={bgBusy}>
                  <ImageIcon aria-hidden="true" /> Change Background
                </button>
                <button type="button" className="cw-btn cw-btn--light cw-btn--sm" onClick={() => setBgDialog({ picker: true })} disabled={bgBusy}>
                  <Upload aria-hidden="true" /> Upload Photo
                </button>
                <button
                  type="button"
                  className="cw-btn cw-btn--light cw-btn--sm"
                  onClick={() => setPreviewing((v) => !v)}
                  disabled={!pendingBg || bgBusy}
                  title={pendingBg ? "Show your unsaved background on the page" : "Change the background first to preview it"}
                >
                  <Eye aria-hidden="true" /> {previewing ? "Stop preview" : "Preview"}
                </button>
                <button type="button" className="cw-btn cw-btn--light cw-btn--sm" onClick={() => void removeSaved()} disabled={!savedBg || bgBusy} title={savedBg ? "Remove the custom background" : "No custom background is saved"}>
                  <Trash2 aria-hidden="true" /> Remove Background
                </button>
              </>
            )}
            {adminTools}
            <Link to={p("/admin")} className="cw-btn cw-btn--light cw-btn--sm">
              <LayoutDashboard aria-hidden="true" /> Admin
            </Link>
            <Link to={p("/admin/settings")} className="cw-btn cw-btn--light cw-btn--sm">
              <Settings aria-hidden="true" /> Edit details
            </Link>
          </span>
        </div>
      )}
      {notice && <div className="cw-notice">{notice}</div>}
      {bgNotice && (
        <div className={"cw-notice cw-notice--" + bgNotice.tone} role="status">
          {bgNotice.text}
        </div>
      )}
      {previewing && pendingBg && (
        <div className="cw-previewbar" role="status">
          <span>
            <Eye aria-hidden="true" /> Previewing your new background — <b>not saved yet</b>. Visitors still see the current one.
          </span>
          <span className="cw-previewbar__actions">
            <button type="button" className="cw-btn cw-btn--light cw-btn--sm" onClick={() => setBgDialog({ picker: false })} disabled={bgBusy}>
              Keep editing
            </button>
            <button
              type="button"
              className="cw-btn cw-btn--light cw-btn--sm"
              onClick={() => {
                setPendingBg(null);
                setPreviewing(false);
              }}
              disabled={bgBusy}
            >
              Discard
            </button>
            <button type="button" className="cw-btn cw-btn--primary cw-btn--sm" onClick={() => void savePending()} disabled={bgBusy}>
              {bgBusy ? <Loader2 className="cw-spin" aria-hidden="true" /> : null} Save
            </button>
          </span>
        </div>
      )}

      {/* ------------------------------------------- hero + sidebar */}
      <div className="cw-top">
        <div className="cw-top__main">
          <section className={"cw-hero" + (heroBg ? "" : " cw-hero--plain")} aria-label="Welcome">
            <HeroBackdrop bg={heroBg} />
            {branding.canEdit && (
              <button type="button" className="cw-hero__editbg" onClick={() => setBgDialog({ picker: false })} disabled={bgBusy}>
                <ImageIcon aria-hidden="true" /> Change Background
              </button>
            )}

            <div className="cw-hero__inner">
              <div className="cw-hero__text">
                <span className="cw-hero__eyebrow">Welcome to</span>
                <h1>{org.name}</h1>
                {tagline && <p className="cw-hero__tagline">{tagline}</p>}
                {heroQuote && <p className="cw-hero__quote">“{heroQuote}”</p>}
                <div className="cw-hero__actions">
                  {live ? (
                    <Link to={p("/live")} className="cw-btn cw-btn--primary cw-btn--lg">
                      <PlayCircle aria-hidden="true" /> {profile.liveButton}
                    </Link>
                  ) : profile.visitButton ? (
                    <Link to={p("/visit")} className="cw-btn cw-btn--primary cw-btn--lg">
                      <MapPin aria-hidden="true" /> {profile.visitButton}
                    </Link>
                  ) : (
                    <a href="#contact" className="cw-btn cw-btn--primary cw-btn--lg">
                      <Mail aria-hidden="true" /> Contact Us
                    </a>
                  )}
                  <a href="#schedule" className="cw-btn cw-btn--white cw-btn--lg">
                    <CalendarDays aria-hidden="true" /> {profile.scheduleButton}
                  </a>
                </div>
              </div>

              <aside className="cw-schedule" id="schedule" aria-labelledby="cw-schedule-title">
                <h2 id="cw-schedule-title">
                  <CalendarDays aria-hidden="true" /> {profile.scheduleTitle}
                </h2>
                {schedule.length === 0 ? (
                  <p className="cw-schedule__empty">
                    {profile.scheduleEmpty}
                    {access.isAdmin && <small>Add them to your main location in Edit details → Locations.</small>}
                  </p>
                ) : (
                  <ul>
                    {schedule.map((s, i) => {
                      const Icon = serviceIcon(s.title);
                      return (
                        <li key={i}>
                          <span className="cw-schedule__icon">
                            <Icon aria-hidden="true" />
                          </span>
                          <span>
                            <strong>{s.title}</strong>
                            {s.when && <small>{s.when}</small>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </aside>
            </div>
          </section>

          <nav className="cw-quick" aria-label="Quick links">
            {quick.map((q) => {
              const body = (
                <>
                  <q.icon aria-hidden="true" />
                  <strong>{q.title}</strong>
                  <span>{q.text}</span>
                </>
              );
              return q.route ? (
                <Link key={q.title} to={q.href} className="cw-quick__item">
                  {body}
                </Link>
              ) : (
                <a key={q.title} href={q.href} className="cw-quick__item">
                  {body}
                </a>
              );
            })}
          </nav>

          <div className="cw-row2">
            {/* ------------------------------------------------- events */}
            {showEvents && (
            <section className="cw-card" id="events" aria-labelledby="cw-events">
              <SectionHead
                icon={CalendarDays}
                title="Upcoming Events"
                id="cw-events"
                action={
                  <Link to={signedIn ? p("/events") : "/events"} className="cw-more">
                    View All <ArrowRight aria-hidden="true" />
                  </Link>
                }
              />
              {upcoming.length === 0 ? (
                <p className="cw-empty">
                  No upcoming events right now. Check back soon.
                  {adminHint("Create one in Admin → Events.")}
                </p>
              ) : (
                <ul className="cw-events">
                  {upcoming.map((e) => {
                    const d = eventDate(e.startDate);
                    const img = mediaUrl(e.coverImageUrl);
                    return (
                      <li key={e.id}>
                        <Link to={`/events/${encodeURIComponent(e.id)}`} className="cw-event">
                          <span className="cw-event__date">
                            <small>{d.month}</small>
                            <b>{d.day}</b>
                          </span>
                          <span className="cw-event__img" style={img ? { backgroundImage: `url("${img}")` } : undefined}>
                            {!img && <CalendarDays aria-hidden="true" />}
                          </span>
                          <span className="cw-event__body">
                            <strong>{e.title}</strong>
                            <small>
                              {d.line}
                              {e.isOnline ? " • Online" : e.locationName ? ` • ${e.locationName}` : ""}
                            </small>
                          </span>
                          <ChevronRight className="cw-event__go" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            )}

            {/* ------------------------------------------------ sermons */}
            <section className="cw-card" id="sermons" aria-labelledby="cw-sermons">
              <SectionHead
                icon={PlayCircle}
                title={profile.contentTitle}
                id="cw-sermons"
                action={
                  signedIn ? (
                    <Link to={p("/media")} className="cw-more">
                      View All {profile.contentNav} <ArrowRight aria-hidden="true" />
                    </Link>
                  ) : undefined
                }
              />
              {sermonsLoading ? (
                <div className="cw-loading">
                  <Loader2 className="cw-spin" aria-hidden="true" /> Loading {profile.contentNav.toLowerCase()}…
                </div>
              ) : !featured ? (
                <p className="cw-empty">
                  {profile.contentNav} will appear here once they're published.
                  {adminHint(profile.mediaKind === "sermons" ? "Upload a video or audio in Admin → Media with the category “Sermon”." : "Upload a video or audio in Admin → Media and publish it.")}
                </p>
              ) : (
                <div className="cw-sermons">
                  <a href={mediaUrl(featured.fileUrl) ?? "#"} onClick={(e) => (e.preventDefault(), play(featured))} className="cw-sermon cw-sermon--featured">
                    <span className="cw-sermon__thumb" style={featured.thumbnailUrl ? { backgroundImage: `url("${mediaUrl(featured.thumbnailUrl)}")` } : undefined}>
                      <span className="cw-play" aria-hidden="true">
                        <PlayCircle />
                      </span>
                      {duration(featured.durationSeconds) && <span className="cw-sermon__dur">{duration(featured.durationSeconds)}</span>}
                    </span>
                    <strong>{featured.title}</strong>
                    <small>{[featured.speaker, shortDate(featured.publishedAt ?? featured.createdAt)].filter(Boolean).join(" • ")}</small>
                  </a>
                  {moreSermons.length > 0 && (
                    <ul className="cw-sermons__list">
                      {moreSermons.map((s) => (
                        <li key={s.id}>
                          <a href={mediaUrl(s.fileUrl) ?? "#"} onClick={(e) => (e.preventDefault(), play(s))} className="cw-sermon cw-sermon--row">
                            <span className="cw-sermon__thumb" style={s.thumbnailUrl ? { backgroundImage: `url("${mediaUrl(s.thumbnailUrl)}")` } : undefined}>
                              <span className="cw-play cw-play--sm" aria-hidden="true">
                                <PlayCircle />
                              </span>
                            </span>
                            <span>
                              <strong>{s.title}</strong>
                              <small>{[shortDate(s.publishedAt ?? s.createdAt), duration(s.durationSeconds)].filter(Boolean).join(" • ")}</small>
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* ----------------------------------------------------- sidebar */}
        <aside className="cw-side" aria-label="Profile and member portal">
          <div className="cw-card cw-profile">
            <div className="cw-profile__head">
              <span className="cw-profile__photo">
                {banner && org.bannerMediaType !== "video" && !photoBroken ? (
                  <img src={banner} alt="" onError={() => setPhotoBroken(true)} />
                ) : (
                  <ChurchLogo logoUrl={org.logoUrl} className="cw-profile__logo" />
                )}
              </span>
              <span>
                <strong>{org.name}</strong>
                {cityLine && (
                  <small>
                    <MapPin aria-hidden="true" /> {cityLine}
                  </small>
                )}
                {(typeof memberCount === "number" || typeof followers === "number") && (
                  <small>
                    <UsersRound aria-hidden="true" />
                    {[
                      typeof memberCount === "number" ? `${memberCount.toLocaleString()} Member${memberCount === 1 ? "" : "s"}` : null,
                      typeof followers === "number" ? `${followers.toLocaleString()} Follower${followers === 1 ? "" : "s"}` : null,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </small>
                )}
              </span>
            </div>

            <Link to={signedIn ? portal : signIn} className="cw-btn cw-btn--primary cw-btn--block">
              <UserRound aria-hidden="true" /> Member Portal
            </Link>

            {access.isMember ? (
              <ul className="cw-portal">
                {portalLinks.map((l) => {
                  const inner = (
                    <>
                      <l.icon aria-hidden="true" />
                      <span>{l.label}</span>
                      {l.badge ? <span className="cw-portal__badge">{l.badge}</span> : null}
                      <ChevronRight className="cw-portal__go" aria-hidden="true" />
                    </>
                  );
                  return (
                    <li key={l.label}>
                      {l.onClick ? (
                        <button type="button" onClick={l.onClick}>
                          {inner}
                        </button>
                      ) : l.to?.startsWith("#") ? (
                        <a href={l.to}>{inner}</a>
                      ) : (
                        <Link to={l.to ?? p()}>{inner}</Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="cw-guest">
                <p>{signedIn ? "Members can see their membership, groups, ministries, events and announcements here." : "Members sign in to see their profile, groups, ministries and announcements."}</p>
                <div className="cw-guest__actions">
                  {!signedIn && (
                    <Link to={signIn} className="cw-btn cw-btn--outline cw-btn--sm">
                      Sign in
                    </Link>
                  )}
                  {access.isPending ? (
                    <span className="cw-pill">Request sent</span>
                  ) : (
                    <Link to={p("/join")} className="cw-btn cw-btn--outline cw-btn--sm">
                      <UserPlus aria-hidden="true" /> Join
                    </Link>
                  )}
                  {signedIn && (
                    <button type="button" className={"cw-btn cw-btn--outline cw-btn--sm" + (follow?.following ? " is-on" : "")} onClick={onToggleFollow} disabled={followBusy} aria-pressed={Boolean(follow?.following)}>
                      {followBusy ? <Loader2 className="cw-spin" aria-hidden="true" /> : follow?.following ? <BellRing aria-hidden="true" /> : <Bell aria-hidden="true" />}
                      {follow?.following ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ---------------------------------------------- live services */}
      <LiveServicesSection organizationId={org.id} title={isChurchType(org.organizationType ? String(org.organizationType) : "") ? "Live Services" : "Livestreams"} />

      {/* ---------------------------------- ministries · give · prayer */}
      <div className={"cw-row3" + (givingOn || giving?.canManage || access.isAdmin ? "" : " cw-row3--nogive")}>
        <section className="cw-card" id="ministries" aria-labelledby="cw-min">
          <SectionHead
            icon={UsersRound}
            title={`Our ${profile.departments}`}
            id="cw-min"
            action={
              access.isMember ? (
                <Link to={profile.isFaith ? p("/ministries") : p("/departments")} className="cw-more">
                  View All {profile.departments} <ArrowRight aria-hidden="true" />
                </Link>
              ) : undefined
            }
          />
          {ministries.length === 0 ? (
            <p className="cw-empty">
              {profile.departments} will be listed here soon.
              {adminHint(`Add them in Admin → ${profile.departments}.`)}
            </p>
          ) : (
            <ul className="cw-ministries">
              {ministries.map((m) => {
                const img = mediaUrl(m.photoUrl);
                const Icon = ministryIcon(m.name);
                const inner = (
                  <>
                    <span className="cw-ministry__img" style={img ? { backgroundImage: `url("${img}")` } : undefined}>
                      {!img && <Icon aria-hidden="true" />}
                    </span>
                    <strong>{m.name}</strong>
                  </>
                );
                return (
                  <li key={m.id}>
                    <Link to={p(`/ministries/${encodeURIComponent(m.id)}`)} className="cw-ministry">
                      {inner}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {givingOn ? (
          <section className="cw-give" id="give" aria-labelledby="cw-give">
            <HandHeart className="cw-give__icon" aria-hidden="true" />
            <div>
              <h2 id="cw-give">{profile.give.title}</h2>
              <p>{profile.give.text}</p>
              <button
                type="button"
                className="cw-btn cw-btn--white"
                onClick={() => (signedIn ? (setGiveHistory(false), setGiveOpen(true)) : navigate("/login?returnTo=" + encodeURIComponent(p("?give=1#give"))))}
              >
                {signedIn ? profile.give.button : "Sign in to Give"} <ArrowRight aria-hidden="true" />
              </button>
              <small className="cw-give__secure">
                <Lock aria-hidden="true" /> Secure card payment
              </small>
              {giving?.canManage && (
                <Link to={p("/admin/giving")} className="cw-give__admin">
                  Manage giving (turn off, funds, gifts received)
                </Link>
              )}
            </div>
          </section>
        ) : giving?.canManage || access.isAdmin ? (
          // Online giving is off: only administrators see this card, to turn it on.
          <section className="cw-give cw-give--off" id="give" aria-labelledby="cw-give">
            <HandHeart className="cw-give__icon" aria-hidden="true" />
            <div>
              <h2 id="cw-give">{profile.give.title}</h2>
              <p>Online giving is turned off, so visitors don't see this card.</p>
              <Link to={p("/admin/giving")} className="cw-btn cw-btn--white">
                Turn on in Admin → Giving <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </section>
        ) : null}

        <section className="cw-card cw-prayer" id="prayer" aria-labelledby="cw-prayer">
          {profile.isFaith ? <HeartHandshake className="cw-prayer__icon" aria-hidden="true" /> : <MessageSquareText className="cw-prayer__icon" aria-hidden="true" />}
          <div>
            <h2 id="cw-prayer">{profile.request.title}</h2>
            <p>{profile.request.text}</p>
            <a href={prayerHref} className="cw-btn cw-btn--outline">
              {profile.request.button} <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </section>
      </div>

      {/* ------------------------------------------------- visit us */}
      {showLocations && (
      <section className="cw-visit" id="visit" aria-labelledby="cw-visit">
        <h2 id="cw-visit">
          <MapPin aria-hidden="true" /> Visit Us
        </h2>
        <div className="cw-visit__item">
          <MapPin aria-hidden="true" />
          <span>
            <strong>{main?.name && branches.length > 1 ? main.name : "Main Location"}</strong>
            <small>{address || "Address coming soon"}</small>
          </span>
        </div>
        {schedule[0] && (
          <div className="cw-visit__item">
            <Clock aria-hidden="true" />
            <span>
              <strong>{schedule[0].title}</strong>
              <small>{schedule[0].when || "See schedule"}</small>
            </span>
          </div>
        )}
        {phone && (
          <div className="cw-visit__item">
            <Phone aria-hidden="true" />
            <span>
              <strong>Contact Us</strong>
              <a href={`tel:${phone}`}>{phone}</a>
            </span>
          </div>
        )}
        {email && (
          <div className="cw-visit__item">
            <Mail aria-hidden="true" />
            <span>
              <strong>Email</strong>
              <a href={`mailto:${email}`}>{email}</a>
            </span>
          </div>
        )}
        {directions && (
          <a href={directions} target="_blank" rel="noreferrer" className="cw-btn cw-btn--outline cw-visit__dir">
            <MapIcon aria-hidden="true" /> Get Directions
          </a>
        )}
      </section>
      )}

      {/* ------------------------- about · mission & vision · contact */}
      <div className={"cw-info" + (org.mission || org.vision || access.isAdmin ? "" : " cw-info--nomv")}>
        <section className="cw-card cw-about" id="about" aria-labelledby="cw-about">
          <h2 id="cw-about" className="cw-about__title">
            <Church aria-hidden="true" /> About {org.name}
          </h2>
          <div className={"cw-about__body" + (aboutImage ? "" : " cw-about__body--noimg")}>
            {aboutImage && (
              <span className="cw-about__img">
                <img src={aboutImage} alt="" loading="lazy" />
                {branding.canEdit && (
                  <button type="button" className="cw-about__edit" onClick={() => setAboutEditor(true)} aria-label="Change the About image" title="Change the About image">
                    <Pencil aria-hidden="true" />
                  </button>
                )}
              </span>
            )}
            <div className="cw-about__text">
              <p>{aboutOpen ? description : aboutShort || `${org.name} hasn't added a description yet.`}</p>
              {aboutOpen && leaders.length > 0 && (
                <ul className="cw-leaders" aria-label="Leadership">
                  {leaders.slice(0, 6).map((l) => {
                    const src = mediaUrl(l.user?.avatarUrl);
                    return (
                      <li key={l.id}>
                        <span className="cw-leaders__avatar">{src ? <img src={src} alt="" /> : (l.user?.displayName ?? "?").slice(0, 1)}</span>
                        <span>
                          <strong>{l.user?.displayName}</strong>
                          <small>{l.title || String(l.role).replace(/_/g, " ")}</small>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {hasMore && (
                <button type="button" className="cw-btn cw-btn--outline cw-btn--sm" onClick={() => setAboutOpen((v) => !v)} aria-expanded={aboutOpen}>
                  {aboutOpen ? "Show less" : "Learn More"} <ArrowRight aria-hidden="true" />
                </button>
              )}
              {!aboutImage && branding.canEdit && (
                <button type="button" className="cw-btn cw-btn--outline cw-btn--sm" onClick={() => setAboutEditor(true)}>
                  <ImageIcon aria-hidden="true" /> Add an About image
                </button>
              )}
              {!description && adminHint("Add your description in Admin → Profile & Locations → About.")}
            </div>
          </div>
        </section>

        {(org.mission || org.vision || access.isAdmin) && (
          <section className="cw-card cw-mv" id="mission" aria-labelledby="cw-mv">
            <h2 id="cw-mv" className="cw-about__title">
              <Target aria-hidden="true" /> Our Mission &amp; Vision
            </h2>
            {org.mission && (
              <div className="cw-mv__item">
                <UsersRound aria-hidden="true" />
                <div>
                  <h3>Our Mission</h3>
                  <p>{org.mission}</p>
                </div>
              </div>
            )}
            {org.vision && (
              <div className="cw-mv__item">
                <EyeIcon aria-hidden="true" />
                <div>
                  <h3>Our Vision</h3>
                  <p>{org.vision}</p>
                </div>
              </div>
            )}
            {!org.mission && !org.vision && adminHint("Only you see this card: add your mission and vision in Admin → Profile & Locations → About.")}
          </section>
        )}

        <ContactChurchSection
          organizationId={org.id}
          organizationName={org.name}
          signedIn={signedIn}
          title={profile.contactTitle}
          intro={profile.contactText}
          types={profile.requestTypes}
          phone={phone || undefined}
          email={email || undefined}
          location={showLocations ? address || cityLine || undefined : cityLine || undefined}
          socials={socials.length ? <SocialIcons links={socials} className="cw-socials cw-socials--light" /> : undefined}
          imageUrl={contactImage}
          planVisitHref={profile.visitButton ? p("/visit") : null}
        />
      </div>

      {/* --------------------------------------------------- footer */}
      <footer className="cw-footer">
        <div className="cw-footer__inner">
          <div className="cw-footer__brand">
            <span className="cw-brand cw-brand--footer">
              <ChurchLogo logoUrl={org.logoUrl} className="cw-brand__logo" />
              <span className="cw-brand__text">
                <b>{brand1}</b>
                {brand2 && <span>{brand2}</span>}
              </span>
            </span>
            {tagline && <p>{tagline}</p>}
          </div>

          <div>
            <h3>Quick Links</h3>
            <a href="#top">Home</a>
            <a href="#about">About Us</a>
            {showEvents && <a href="#events">Events</a>}
            {givingOn && <a href="#give">{profile.give.nav}</a>}
            <a href="#contact">Contact</a>
          </div>

          {ministries.length > 0 && (
            <div>
              <h3>{profile.departments}</h3>
              {ministries.slice(0, 4).map((m) => (
                <Link key={m.id} to={p(`/ministries/${encodeURIComponent(m.id)}`)}>
                  {m.name}
                </Link>
              ))}
            </div>
          )}

          <div>
            <h3>Resources</h3>
            <a href="#sermons">{profile.contentNav}</a>
            {signedIn && <Link to={p("/media")}>Media</Link>}
            <a href={prayerHref}>{profile.request.quickTitle}</a>
            {profile.visitButton && <Link to={p("/visit")}>{profile.visitButton}</Link>}
          </div>

          <div className="cw-footer__contact">
            <h3>Contact</h3>
            {address && (
              <span>
                <MapPin aria-hidden="true" /> {address}
              </span>
            )}
            {phone && (
              <a href={`tel:${phone}`}>
                <Phone aria-hidden="true" /> {phone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`}>
                <Mail aria-hidden="true" /> {email}
              </a>
            )}
            {website && (
              <a href={website} target="_blank" rel="noreferrer">
                <Church aria-hidden="true" /> {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            )}
          </div>

          {socials.length > 0 && (
            <div className="cw-footer__social">
              <h3>Connect With Us</h3>
              <SocialIcons links={socials} />
            </div>
          )}
        </div>

        <div className="cw-footer__bottom">
          <span>
            © {year} {org.name}. All rights reserved.
          </span>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Use</Link>
          <Link to="/organizations" className="cw-footer__powered">
            Powered by <FockisFMark size={14} /> Fockis Organizations
          </Link>
        </div>
      </footer>
      {playing && <MediaPlayerDialog media={playing} onClose={() => setPlaying(null)} />}
      {bgDialog && (
        <HeroBackgroundDialog
          organizationId={org.id}
          churchName={org.name}
          initial={pendingBg ?? savedBg ?? (coverBg && !coverBg.video ? coverBg : null)}
          saved={Boolean(savedBg)}
          hasCover={Boolean(coverBg)}
          startWithPicker={bgDialog.picker}
          onClose={() => setBgDialog(null)}
          onPreview={(bg) => {
            setPendingBg(bg);
            setPreviewing(true);
            setBgDialog(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onSaved={(text) => {
            setPendingBg(null);
            setPreviewing(false);
            setBgDialog(null);
            setBgNotice({ tone: "ok", text });
          }}
          onRemoved={(text) => {
            setPendingBg(null);
            setPreviewing(false);
            setBgDialog(null);
            setBgNotice({ tone: "ok", text });
          }}
        />
      )}
      {giveOpen && giving?.enabled && <GiveDialog organizationId={org.id} info={giving} initialHistory={giveHistory} onClose={() => setGiveOpen(false)} />}
      {aboutEditor && <PageBrandingEditor organizationId={org.id} pageKey={ABOUT_KEY} pageLabel="About section image" icon={Church} initialTab="banner" onClose={() => setAboutEditor(false)} />}
    </div>
  );
}
