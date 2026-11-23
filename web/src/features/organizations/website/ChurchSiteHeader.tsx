/**
 * ChurchSiteHeader.tsx
 * -----------------------------------------------------------------------------
 * The white website header shared by every public page of an organization
 * website (home page, ministry pages): logo + two-line name, navigation with
 * a blue active pill, About / Ministries / Media dropdowns, notifications,
 * the signed-in person's avatar and the Member Portal button. Collapses into
 * a drawer on small screens. Words follow the kind of organization (labels).
 *
 * Also exports the default church logo mark (cross over a wave) used when a
 * church has not uploaded its own logo.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronDown, Menu, UserRound, X } from "lucide-react";

import { mediaUrl } from "../api/dashboardApi";

export interface ChurchHeaderOrg {
  id: string;
  name: string;
  logoUrl?: string | null;
}

export interface ChurchHeaderMinistry {
  id: string;
  name: string;
}

/** Splits "Fockis Community Church" into "Fockis" / "Community Church". */
export function brandLines(name: string): [string, string] {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return [name, ""];
  return [words[0], words.slice(1).join(" ")];
}

/** Default logo: a navy cross rising out of two blue waves. */
export function CrossMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 56" className={className} aria-hidden="true" fill="none">
      {/* cross */}
      <path d="M29 3h6v11h11v6H35v24h-6V20H18v-6h11z" fill="var(--cw-logo-cross, #0b2a6b)" />
      {/* main wave */}
      <path
        d="M3 41c7-5.2 15-6.6 23-3.6 8.4 3.2 15.7 3.4 24.4-.6 3.6-1.7 7-3.9 10.6-6.8-2.4 5.4-6.4 9.6-12 12.4-9 4.4-17.8 4.2-26.6.8-6.4-2.4-12.6-3-19.4-2.2z"
        fill="var(--cw-logo-wave, #1463d9)"
      />
      {/* thin under-wave */}
      <path
        d="M9 50.5c6.4-2.7 13.4-3 20.6-.8 7.6 2.3 14.6 1.8 21.6-1.7-6 4.8-13.4 6.6-21.8 4.6-6.6-1.6-13.2-2.4-20.4-2.1z"
        fill="var(--cw-logo-wave, #1463d9)"
        opacity=".75"
      />
    </svg>
  );
}

export function ChurchLogo({ logoUrl, className }: { logoUrl?: string | null; className: string }) {
  const src = mediaUrl(logoUrl);
  const [broken, setBroken] = useState(false);
  if (src && !broken) return <img src={src} alt="" className={className} onError={() => setBroken(true)} />;
  return <CrossMark className={className} />;
}

/** Signed-in person's photo; falls back to initials (or an icon) when missing or unreachable. */
function HeaderAvatar({ url, name }: { url?: string | null; name?: string | null }) {
  const src = mediaUrl(url);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  if (src && !broken) return <img src={src} alt="" onError={() => setBroken(true)} />;
  return name ? <b>{initials(name)}</b> : <UserRound aria-hidden="true" />;
}

type NavKey = "home" | "about" | "ministries" | "sermons" | "events" | "give" | "media" | "contact";

export interface ChurchHeaderLabels {
  /** "Ministries", "Departments"… */
  departments: string;
  /** "Sermons", "Videos"… */
  content: string;
  /** "Give", "Donate"… — null hides the item (giving off). */
  give: string | null;
  /** Hide the Events item (events not public). */
  events?: boolean;
}

export interface ChurchSiteHeaderProps {
  org: ChurchHeaderOrg;
  signedIn: boolean;
  /** Which item gets the blue pill. */
  active: NavKey;
  /** True on the home page: links become in-page anchors. */
  onHomePage: boolean;
  ministries: ChurchHeaderMinistry[];
  showNotificationDot?: boolean;
  labels?: ChurchHeaderLabels;
  /** Signed-in person (avatar). */
  viewer?: { name?: string | null; avatarUrl?: string | null; profileHref?: string } | null;
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

const DEFAULT_LABELS: ChurchHeaderLabels = { departments: "Ministries", content: "Sermons", give: "Give", events: true };

type Item = { key: NavKey; label: string; href: string; route?: boolean; children?: { label: string; href: string; route?: boolean }[] };

export default function ChurchSiteHeader({ org, signedIn, active, onHomePage, ministries, showNotificationDot, labels = DEFAULT_LABELS, viewer }: ChurchSiteHeaderProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const [drop, setDrop] = useState<NavKey | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  const home = `/organizations/${encodeURIComponent(org.id)}`;
  const portal = `/organization/me?organizationId=${encodeURIComponent(org.id)}`;
  const signIn = "/login?returnTo=" + encodeURIComponent(onHomePage ? home : window.location.pathname);
  const [brand1, brand2] = brandLines(org.name);
  // On the home page sections are anchors; elsewhere a normal link that lands on the section.
  const to = (hash: string) => (onHomePage ? hash : `${home}${hash}`);

  useEffect(() => {
    if (!menuOpen && !drop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setDrop(null);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.(".cw-drop")) setDrop(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [menuOpen, drop]);

  const close = () => {
    setMenuOpen(false);
    setDrop(null);
  };
  const cls = (key: NavKey) => "cw-nav__link" + (active === key ? " is-active" : "");

  const items: Item[] = [
    { key: "home", label: "Home", href: onHomePage ? "#top" : home, route: !onHomePage },
    {
      key: "about",
      label: "About Us",
      href: to("#about"),
      children: [
        { label: "About Us", href: to("#about") },
        { label: "Mission & Vision", href: to("#mission") },
        { label: "Visit Us", href: to("#visit") },
        { label: "Contact", href: to("#contact") },
      ],
    },
    {
      key: "ministries",
      label: labels.departments,
      href: to("#ministries"),
      children: ministries.length
        ? [
            ...ministries.map((m) => ({ label: m.name, href: `${home}/ministries/${encodeURIComponent(m.id)}`, route: true })),
            { label: `All ${labels.departments.toLowerCase()}`, href: to("#ministries") },
          ]
        : undefined,
    },
    { key: "sermons", label: labels.content, href: to("#sermons") },
    ...(labels.events === false ? [] : [{ key: "events" as const, label: "Events", href: to("#events") }]),
    ...(labels.give ? [{ key: "give" as const, label: labels.give, href: to("#give") }] : []),
    {
      key: "media",
      label: "Media",
      href: signedIn ? `${home}/media` : to("#sermons"),
      route: signedIn,
      children: [
        { label: labels.content, href: to("#sermons") },
        ...(signedIn ? [{ label: "Media & Documents", href: `${home}/media`, route: true }] : []),
        { label: "Live", href: `${home}/live`, route: true },
      ],
    },
    { key: "contact", label: "Contact", href: to("#contact") },
  ];

  const link = (c: { label: string; href: string; route?: boolean }, className: string, role?: string) =>
    c.route ? (
      <Link key={c.label + c.href} to={c.href} className={className} role={role} onClick={close}>
        {c.label}
      </Link>
    ) : (
      <a key={c.label + c.href} href={c.href} className={className} role={role} onClick={close}>
        {c.label}
      </a>
    );

  return (
    <header className="cw-header">
      <div className="cw-header__inner">
        {onHomePage ? (
          <a href="#top" className="cw-brand" aria-label={`${org.name} home`}>
            <ChurchLogo logoUrl={org.logoUrl} className="cw-brand__logo" />
            <span className="cw-brand__text">
              <b>{brand1}</b>
              {brand2 && <span>{brand2}</span>}
            </span>
          </a>
        ) : (
          <Link to={home} className="cw-brand" aria-label={`${org.name} home`}>
            <ChurchLogo logoUrl={org.logoUrl} className="cw-brand__logo" />
            <span className="cw-brand__text">
              <b>{brand1}</b>
              {brand2 && <span>{brand2}</span>}
            </span>
          </Link>
        )}

        <nav className={"cw-nav" + (menuOpen ? " is-open" : "")} aria-label={`${org.name} website`} ref={navRef}>
          {items.map((n) =>
            n.children ? (
              <div key={n.key} className={"cw-drop" + (drop === n.key ? " is-open" : "")}>
                <button type="button" className={cls(n.key) + " cw-drop__toggle"} aria-expanded={drop === n.key} aria-haspopup="menu" onClick={() => setDrop(drop === n.key ? null : n.key)}>
                  {n.label} <ChevronDown aria-hidden="true" />
                </button>
                <div className="cw-drop__menu" role="menu">
                  {n.children.map((c, i) => link(c, i === n.children!.length - 1 && n.key === "ministries" ? "cw-drop__all" : "", "menuitem"))}
                </div>
              </div>
            ) : (
              link(n, cls(n.key))
            ),
          )}
          <Link to={signedIn ? portal : signIn} className="cw-btn cw-btn--primary cw-nav__portal" onClick={close}>
            <UserRound aria-hidden="true" /> Member Portal
          </Link>
        </nav>

        <div className="cw-header__tools">
          {signedIn && (
            <Link to="/notifications" className="cw-iconbtn" aria-label="Notifications">
              <Bell aria-hidden="true" />
              {showNotificationDot && <span className="cw-iconbtn__dot" aria-hidden="true" />}
            </Link>
          )}
          {signedIn && (
            <Link to={viewer?.profileHref ?? "/profile"} className="cw-header__me" aria-label="My profile" title={viewer?.name ?? "My profile"}>
              <HeaderAvatar url={viewer?.avatarUrl} name={viewer?.name} />
            </Link>
          )}
          <Link to={signedIn ? portal : signIn} className="cw-btn cw-btn--primary cw-header__portal">
            <UserRound aria-hidden="true" /> Member Portal
          </Link>
          <button type="button" className="cw-iconbtn cw-header__menu" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}
