/**
 * AdminShell.tsx — Media Administration Center frame (/news/admin/:outletId/*).
 * Navigation is filtered by the member's newsroom permissions; the API checks
 * every call again on the server.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Navigate, Outlet, useParams } from "react-router-dom";
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarClock,
  ExternalLink,
  FileText,
  FolderTree,
  Globe,
  HandHeart,
  Headphones,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Link2,
  Megaphone,
  MessageSquare,
  PenSquare,
  Radio as RadioIcon,
  Search,
  Settings,
  ShieldCheck,
  Siren,
  Tv,
  UserCog,
  Users,
  Video,
  Menu,
  X,
} from "lucide-react";

import FockisSidebar from "../../../components/fockis/FockisSidebar/FockisSidebar";
import { Empty, OutletLogo, Skeleton, Verified, loginPath, signedIn, useToast } from "../NewsParts";
import { newsApi, newsError, type OutletAdmin, type WebsiteInfo } from "../newsApi";

import "../../../styles/FockisFeedPage.scss";
import "../news.scss";

export interface AdminCtx {
  outlet: OutletAdmin;
  website: WebsiteInfo | null;
  can: (perm: string) => boolean;
  reload: () => void;
  notify: (tone: "ok" | "error", text: string) => void;
}

const Ctx = createContext<AdminCtx | null>(null);
export const useAdmin = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin outside AdminShell");
  return c;
};

type Item = { to: string; label: string; icon: typeof FileText; perm?: string; end?: boolean };

const NAV: { group: string; items: Item[] }[] = [
  {
    group: "Newsroom",
    items: [
      { to: "", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "articles", label: "Articles", icon: FileText, end: true },
      { to: "articles/new", label: "Write News", icon: PenSquare, perm: "write_articles" },
      { to: "breaking", label: "Breaking News", icon: Siren, perm: "manage_breaking" },
      { to: "categories", label: "Categories", icon: FolderTree },
      { to: "journalists", label: "Journalists", icon: Users },
      { to: "editors", label: "Editors", icon: UserCog },
      { to: "review", label: "Editorial Review", icon: BookOpenCheck, perm: "review_articles" },
      { to: "scheduled", label: "Scheduled Articles", icon: CalendarClock, perm: "publish_articles" },
      { to: "library", label: "Media Library", icon: ImageIcon, perm: "manage_media_library" },
    ],
  },
  {
    group: "Broadcast",
    items: [
      { to: "videos", label: "Videos", icon: Video },
      { to: "live-tv", label: "Live TV", icon: Tv },
      { to: "radio", label: "Live Radio", icon: RadioIcon },
      { to: "podcasts", label: "Podcasts", icon: Headphones },
    ],
  },
  {
    group: "Audience & Revenue",
    items: [
      { to: "ads", label: "Advertisements", icon: Megaphone, perm: "manage_ads" },
      { to: "subscribers", label: "Subscribers", icon: Bell },
      { to: "comments", label: "Comments", icon: MessageSquare, perm: "moderate_comments" },
      { to: "donations", label: "Support & Donations", icon: HandHeart, perm: "view_finance" },
      { to: "requests", label: "Media Requests", icon: Inbox },
      { to: "analytics", label: "Analytics", icon: BarChart3, perm: "view_analytics" },
    ],
  },
  {
    group: "Website",
    items: [
      { to: "seo", label: "SEO", icon: Search, perm: "manage_settings" },
      { to: "website", label: "Website Design", icon: Globe },
      { to: "domains", label: "Domain Management", icon: Link2 },
      { to: "settings", label: "Settings", icon: Settings, perm: "manage_settings" },
      { to: "team", label: "Team & Roles", icon: ShieldCheck },
    ],
  },
];

export function YourWebsiteCard({ website, outletId }: { website: WebsiteInfo | null; outletId: string }) {
  return (
    <div className="nma-site">
      <div className="nma-site__head">
        <b>Your Website</b>
        {website ? (
          <span className={`nma-site__status nma-site__status--${website.status}`}>
            <span aria-hidden="true">●</span> {website.status === "published" ? "Published" : website.status === "suspended" ? "Suspended" : "Draft"}
          </span>
        ) : (
          <span className="nma-site__status">Not created</span>
        )}
      </div>
      {website ? (
        <>
          <a className="nma-site__url" href={website.url} target="_blank" rel="noreferrer">
            <span>{website.url.replace(/^https?:\/\//, "")}</span>
            <ExternalLink />
          </a>
          <a className="nma-site__btn" href={website.url} target="_blank" rel="noreferrer">
            View Live Website
          </a>
        </>
      ) : (
        <Link className="nma-site__btn" to={`/news/admin/${outletId}/website`}>
          Set up your website
        </Link>
      )}
    </div>
  );
}

export default function AdminShell() {
  const { outletId = "" } = useParams<{ outletId: string }>();
  const toast = useToast();
  const [outlet, setOutlet] = useState<OutletAdmin | null>(null);
  const [website, setWebsite] = useState<WebsiteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [menu, setMenu] = useState(false);
  const [mobileFk, setMobileFk] = useState(false);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!signedIn()) return;
    let alive = true;
    newsApi
      .outlet(outletId)
      .then((o) => alive && setOutlet(o))
      .catch((err) => alive && setError(newsError(err, "You don't have access to this newsroom.")));
    newsApi
      .website(outletId)
      .then((w) => alive && setWebsite(w.website))
      .catch(() => alive && setWebsite(null));
    return () => {
      alive = false;
    };
  }, [outletId, tick]);

  if (!signedIn()) return <Navigate to={loginPath()} replace />;

  const can = (p: string) => Boolean(outlet?.viewer.permissions.includes(p));
  const base = `/news/admin/${outletId}`;

  return (
    <div className="fk-app nm-app nma-app">
      <header className="fk-mobile-header">
        <button type="button" className="fk-mobile-menu-button" onClick={() => setMobileFk(true)} aria-label="Open Fockis navigation">
          <span />
          <span />
          <span />
        </button>
        <div className="fk-mobile-header__brand">
          <span className="fk-mobile-header__logo-text">Media Admin</span>
        </div>
        <button type="button" className="nma-menubtn" onClick={() => setMenu(true)} aria-label="Newsroom menu">
          <Menu />
        </button>
      </header>
      {mobileFk && <button type="button" className="fk-sidebar-backdrop" onClick={() => setMobileFk(false)} aria-label="Close" />}
      <div className="nma-frame">
        <aside className="nma-fk">
          <FockisSidebar collapsed mobileOpen={mobileFk} onClose={() => setMobileFk(false)} />
        </aside>
        {menu && <button type="button" className="nma-backdrop" onClick={() => setMenu(false)} aria-label="Close newsroom menu" />}
        <aside className={`nma-side${menu ? " is-open" : ""}`} aria-label="Media administration">
          <div className="nma-side__brand">
            {outlet ? (
              <Link to={`/news/${outlet.slug}`} className="nma-side__outlet">
                <OutletLogo outlet={outlet} size={42} />
                <span>
                  <b>
                    {outlet.name} {outlet.verified && <Verified size={14} />}
                  </b>
                  <small>{outlet.viewer.roleLabel}</small>
                </span>
              </Link>
            ) : (
              <Skeleton h={42} />
            )}
            <button type="button" className="nma-side__close" onClick={() => setMenu(false)} aria-label="Close menu">
              <X />
            </button>
          </div>
          <nav className="nma-nav">
            {NAV.map((g) => (
              <div key={g.group} className="nma-nav__group">
                <span className="nma-nav__label">{g.group}</span>
                {g.items
                  .filter((i) => !i.perm || can(i.perm))
                  .map((i) => (
                    <NavLink key={i.to} to={i.to ? `${base}/${i.to}` : base} end={i.end} className={({ isActive }) => `nma-nav__item${isActive ? " is-active" : ""}`} onClick={() => setMenu(false)}>
                      <i.icon aria-hidden="true" />
                      <span>{i.label}</span>
                    </NavLink>
                  ))}
              </div>
            ))}
          </nav>
          <YourWebsiteCard website={website} outletId={outletId} />
          <Link to="/news/admin" className="nma-side__switch">
            Switch media
          </Link>
        </aside>
        <main className="nma-main">
          {error && <Empty title="Newsroom not available" text={error} action={<Link to="/news/admin" className="nm-btn nm-btn--primary">My media organizations</Link>} />}
          {!outlet && !error && <Skeleton h={320} />}
          {outlet && (
            <Ctx.Provider value={{ outlet, website, can, reload, notify: toast.show }}>
              <Outlet />
            </Ctx.Provider>
          )}
        </main>
      </div>
      {toast.node}
    </div>
  );
}

export function PageTitle({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <header className="nma-title">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="nma-title__actions">{actions}</div>}
    </header>
  );
}
