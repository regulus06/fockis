/**
 * OrgAppShell.tsx
 * -----------------------------------------------------------------------------
 * The Fockis Organizations application frame from the reference designs:
 *
 *   ┌──────────────┬───────────────────────────────────────────────┐
 *   │ Fockis        │ [logo  Organization name ▾]      🔔   (avatar) │
 *   │ Organizations ├───────────────────────────────────────────────┤
 *   │  ▣ Dashboard  │                                               │
 *   │  ○ Members    │   page content                                │
 *   │  …            │                                               │
 *   └──────────────┴───────────────────────────────────────────────┘
 *
 * Three menus:
 *   - "admin"    organization administration (admins only; pages check access)
 *   - "member"   the member portal ("My Church", "My Company"…)
 *   - "platform" Fockis Organizations itself (discover, my organizations, create)
 *
 * Menu links only point at screens that exist. Specialized modules appear
 * only for the kinds of organization they belong to.
 *
 * Page branding: every menu entry can have its own uploaded thumbnail
 * (shown instead of the icon) and its page its own banner/logo. The page
 * key comes from the link's route, so new menu entries get this for free.
 * Editors (Settings & Roles permission, checked by the server) see an edit
 * pencil on each entry and a "Customize page" button in the top bar.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen, UserCog } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  Compass,
  FolderOpen,
  Globe,
  History,
  House,
  IdCard,
  LayoutDashboard,
  Megaphone,
  Menu,
  MessageSquare,
  Network,
  Palette,
  Pencil,
  PencilLine,
  Plus,
  Radio,
  Settings,
  UserRound,
  Users,
  UsersRound,
  X,
} from "lucide-react";

import { categoryInfo, modulesFor, platformCategoryOf, termsFor, welcomesVisitors } from "./orgTerminology";
import { Avatar, FockisOrgBrand, OrgLogoBox, useOrgFonts } from "./orgUi";
import "./fockisOrgTheme.scss";
import { PageBanner, PageThumb } from "../branding/PageBrandingParts";
import PageBrandingEditor from "../branding/PageBrandingEditor";
import { pageKeyFromPath } from "../branding/pageBrandingApi";
import { usePageBranding } from "../branding/usePageBranding";
import { SIDEBAR_BG_KEY, sidebarBgFrom, sidebarBgProps } from "../branding/sidebarBackground";
import { DASHBOARD_THEME_KEY, themeFrom, themeVars } from "../branding/dashboardTheme";
import CustomizeDialog from "../branding/CustomizeDialog";
import { logout } from "../../../utils/auth";
import { useNoIndex } from "../website/usePublicSeo";

const COLLAPSE_KEY = "fockis.orgSidebarCollapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

export type ShellVariant = "admin" | "member" | "platform";

export interface ShellOrganization {
  id: string;
  name: string;
  organizationType?: string | null;
  logoUrl?: string | null;
}

export interface ShellViewer {
  name?: string | null;
  avatarUrl?: string | null;
  memberId?: string | null;
  isAdmin?: boolean;
  roleLabel?: string | null;
}

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Page-branding key; derived from `to` when not set. */
  key?: string;
}

const enc = encodeURIComponent;

function adminNav(org: ShellOrganization): { main: NavItem[]; modules: NavItem[] } {
  const p = (s = "") => `/organizations/${enc(org.id)}${s}`;
  const t = termsFor(org.organizationType);
  const main: NavItem[] = [
    { to: p("/admin"), label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: p("/admin/members"), label: t.people, icon: Users },
    { to: p("/admin/departments"), label: t.departments, icon: Network },
    { to: p("/admin/groups"), label: t.groups, icon: UsersRound },
    { to: p("/admin/events"), label: "Events", icon: CalendarDays },
    { to: p("/attendance"), label: "Attendance", icon: ClipboardCheck },
    { to: p("/communication"), label: "Communication", icon: MessageSquare },
    { to: p("/admin/media"), label: "Media & Documents", icon: FolderOpen },
    { to: p("/admin/live"), label: "Live", icon: Radio },
    { to: p("/admin/badges"), label: "Member badges", icon: IdCard },
    { to: `/church/admin/organizations/${enc(org.id)}/edit`, label: "Profile & Locations", icon: PencilLine },
    { to: p("/admin/domains"), label: "Fockis domains", icon: Globe },
    { to: p("/admin/settings"), label: "Settings & Roles", icon: Settings },
  ];
  if (welcomesVisitors(org.organizationType)) {
    main.splice(6, 0, { to: p("/admin/visits"), label: "Visit requests", icon: CalendarCheck });
  }
  const existing = new Set(main.map((m) => m.to));
  const modules = modulesFor(org.organizationType)
    .filter((m) => m.available && m.path && !existing.has(p(m.path)))
    .map((m) => ({ to: p(m.path), label: m.label, icon: Building2 }));
  return { main, modules };
}

function memberNav(org: ShellOrganization, viewer?: ShellViewer): NavItem[] {
  const p = (s = "") => `/organizations/${enc(org.id)}${s}`;
  const t = termsFor(org.organizationType);
  const items: NavItem[] = [
    { to: `/organization/me?organizationId=${enc(org.id)}`, label: "Overview", icon: House, end: true },
  ];
  if (viewer?.memberId) items.push({ to: p(`/members/${enc(viewer.memberId)}`), label: "My Profile", icon: UserRound, key: "my-profile" });
  items.push(
    { to: p("/my-badge"), label: "My Membership", icon: IdCard },
    { to: p("/groups"), label: platformCategoryOf(org.organizationType) === "faith" ? t.groups : `My ${t.groups}`, icon: UsersRound },
    // Faith organizations use the Ministries dashboard (join, apply, propose).
    { to: platformCategoryOf(org.organizationType) === "faith" ? p("/ministries") : p("/departments"), label: `My ${t.departments}`, icon: Network },
    { to: p("/events"), label: "My Events", icon: CalendarDays },
    { to: p("/live"), label: "Livestreams", icon: Radio },
    { to: p("/attendance"), label: "My Attendance", icon: ClipboardCheck },
    { to: p("/my-history"), label: "My History", icon: History },
    { to: p("/media"), label: "My Documents", icon: FolderOpen },
    { to: p("/communication"), label: "My Notifications", icon: Megaphone },
    { to: `/member/settings?organizationId=${enc(org.id)}`, label: "My Settings", icon: Settings },
  );
  return items;
}

const PLATFORM_NAV: NavItem[] = [
  { to: "/organizations", label: "Home", icon: House, end: true },
  { to: "/organizations/discover", label: "Discover", icon: Compass },
  { to: "/organization/me", label: "My Organizations", icon: Building2 },
  { to: "/organizations/new", label: "Create Organization", icon: Plus },
];

/** NavLink "active" that also understands the "?organizationId=" member overview link. */
function isLinkActive(to: string, pathname: string, search: string, end?: boolean): boolean {
  const [path, query] = to.split("?");
  if (query) return pathname === path && search.includes(query);
  return end ? pathname === path : pathname === path || pathname.startsWith(path + "/");
}

export interface ShellSection {
  label?: string;
  items: NavItem[];
}

/** The menu sections of the shell (also used by the Sidebar Appearance preview). */
export function shellSections(variant: ShellVariant, org: ShellOrganization | null, viewer?: ShellViewer): ShellSection[] {
  const terms = termsFor(org?.organizationType);
  const cat = categoryInfo(org?.organizationType);
  let sections: ShellSection[] = [];
  if (variant === "admin" && org) {
    const nav = adminNav(org);
    sections = [{ label: "Organization management", items: nav.main }];
    if (nav.modules.length) sections.push({ label: `${cat.short} tools`, items: nav.modules });
    sections.push({
      label: "Switch view",
      items: [
        { to: `/organization/me?organizationId=${enc(org.id)}`, label: terms.myOrg, icon: House },
        { to: `/organizations/${enc(org.id)}`, label: "Public page", icon: Globe, end: true },
      ],
    });
  } else if (variant === "member" && org) {
    sections = [{ label: terms.myOrg, items: memberNav(org, viewer) }];
    const extra: NavItem[] = [{ to: `/organizations/${enc(org.id)}`, label: "Public page", icon: Globe, end: true }];
    if (viewer?.isAdmin) extra.unshift({ to: `/organizations/${enc(org.id)}/admin`, label: "Administration", icon: LayoutDashboard });
    sections.push({ label: "More", items: extra });
  } else {
    sections = [{ items: PLATFORM_NAV }];
  }
  return sections;
}

export default function OrgAppShell({
  variant,
  organization,
  organizations,
  onSelectOrganization,
  viewer,
  notificationCount,
  sideExtra,
  activeNavTo,
  children,
}: {
  variant: ShellVariant;
  organization?: ShellOrganization | null;
  /** When given, the top-bar organization card becomes a switcher. */
  organizations?: ShellOrganization[];
  onSelectOrganization?: (id: string) => void;
  viewer?: ShellViewer;
  notificationCount?: number;
  /** Extra sidebar content under the menu (e.g. Quick Actions). */
  sideExtra?: ReactNode;
  /** Highlight this menu link (pages that live outside its route, e.g. a member profile under Members). */
  activeNavTo?: string;
  children: ReactNode;
}): React.JSX.Element {
  useOrgFonts();
  // Dashboards and member pages are private: ask search engines not to index them.
  useNoIndex(variant !== "platform");
  const { pathname, search } = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [userMenu, setUserMenu] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setUserMenu(false);
  }, [pathname, search]);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* private mode */
    }
  }, [collapsed]);

  useEffect(() => {
    if (!userMenu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !userMenuRef.current?.contains(e.target as Node)) setUserMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [userMenu]);

  const branding = usePageBranding(organization?.id);
  const [editing, setEditing] = useState<{ key: string; label: string; icon: LucideIcon; tab?: "thumbnail" | "banner" } | null>(null);

  const org = organization ?? null;
  const cat = categoryInfo(org?.organizationType);
  const sections = shellSections(variant, org, viewer);

  // Customize Page: theme colors + sidebar background (image, or the navy default).
  const theme = themeFrom(org ? branding.publishedFor(DASHBOARD_THEME_KEY) : null);
  const sideBg = sidebarBgProps(org ? sidebarBgFrom(branding.publishedFor(SIDEBAR_BG_KEY)) : null, undefined, theme.colors.sidebar);

  const isActiveItem = (item: NavItem) =>
    activeNavTo ? item.to === activeNavTo : isLinkActive(item.to, pathname, search, item.end);

  const keyOf = (item: NavItem) => item.key ?? (org ? pageKeyFromPath(item.to, org.id) : "");
  const canBrand = Boolean(org && branding.canEdit);
  // The menu entry for the page on screen (the longest matching link wins).
  const active =
    org &&
    sections
      .flatMap((sec) => sec.items)
      .filter((item) => isActiveItem(item))
      .sort((a, b) => b.to.length - a.to.length)[0];
  const activeBranding = active ? branding.publishedFor(keyOf(active)) : null;

  const subtitle =
    variant === "admin" ? (viewer?.roleLabel ?? "Admin") : variant === "member" ? "Member Portal" : (org ? cat.label : null);

  return (
    <div className={"fo fo-app" + (open ? " is-open" : "") + (collapsed ? " fo-app--collapsed" : "")} style={themeVars(theme.colors)}>
      <aside className={"fo-app__side " + sideBg.className} style={sideBg.style} aria-label="Organization menu">
        <FockisOrgBrand />
        <nav className="fo-nav">
          {sections.map((section, i) => (
            <div key={i}>
              {section.label && <div className="fo-nav__label">{section.label}</div>}
              {section.items.map((item) => {
                const link = (
                  <NavLink
                    key={item.to + item.label}
                    to={item.to}
                    end={item.end}
                    className={() => "fo-nav__link" + (isActiveItem(item) ? " is-active" : "")}
                    title={collapsed ? item.label : undefined}
                  >
                    <PageThumb content={org ? branding.publishedFor(keyOf(item)) : null} icon={item.icon} />
                    <span className="fo-nav__text">{item.label}</span>
                  </NavLink>
                );
                if (!canBrand) return link;
                return (
                  <div className="pb-navrow" key={item.to + item.label}>
                    {link}
                    <button
                      type="button"
                      className="pb-navrow__edit"
                      title="Edit thumbnail"
                      aria-label={`Edit thumbnail for ${item.label}`}
                      onClick={() => setEditing({ key: keyOf(item), label: item.label, icon: item.icon })}
                    >
                      <Pencil aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
        {sideExtra}
      </aside>
      <div className="fo-app__scrim" onClick={() => setOpen(false)} aria-hidden="true" />

      <div className="fo-app__main">
        <header className={"fo-app__top" + (!org && !viewer?.name ? " fo-app__top--bare" : "")}>
          <button
            type="button"
            className="fo-iconbtn fo-app__menu-btn"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="fo-iconbtn fo-app__collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand the menu" : "Collapse the menu"}
            title={collapsed ? "Expand the menu" : "Collapse the menu"}
            aria-pressed={collapsed}
          >
            {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          </button>

          {org ? (
            <div className="fo-orgswitch">
              <OrgLogoBox name={org.name} url={org.logoUrl} icon={cat.icon} />
              <span className="fo-orgswitch__text">
                {organizations && organizations.length > 1 && onSelectOrganization ? (
                  <label>
                    <span className="fo-sr">Organization</span>
                    <select value={org.id} onChange={(e) => onSelectOrganization(e.target.value)}>
                      {organizations.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <span className="fo-orgswitch__name">{org.name}</span>
                )}
                {subtitle && <span className="fo-orgswitch__sub">{subtitle}</span>}
              </span>
            </div>
          ) : (
            <span />
          )}

          <div className="fo-topactions">
            {canBrand && active && (
              <button
                type="button"
                className="pb-page-customize"
                onClick={() => setCustomizing(true)}
                title={`Customize the ${active.label} page`}
                aria-label={`Customize page: ${active.label}`}
              >
                <Palette aria-hidden="true" />
                <span>Customize page</span>
              </button>
            )}
            {org && (
              <Link to={`/organizations/${enc(org.id)}/communication`} className="fo-iconbtn" aria-label="Announcements and notifications">
                <Bell aria-hidden="true" />
                {notificationCount ? <span className="fo-iconbtn__dot">{notificationCount > 99 ? "99+" : notificationCount}</span> : null}
              </Link>
            )}
            {viewer?.name ? (
              <div className="fo-usermenu" ref={userMenuRef}>
                <button type="button" className="fo-usermenu__btn" onClick={() => setUserMenu((v) => !v)} aria-haspopup="menu" aria-expanded={userMenu} aria-label="Account menu">
                  <Avatar name={viewer.name} url={viewer.avatarUrl} />
                  <ChevronDown aria-hidden="true" className="fo-usermenu__chev" />
                </button>
                {userMenu && (
                  <div className="fo-usermenu__pop" role="menu">
                    <div className="fo-usermenu__who">
                      <b>{viewer.name}</b>
                      {subtitle && <small>{subtitle}</small>}
                    </div>
                    {viewer.memberId && org && (
                      <Link role="menuitem" to={`/organizations/${enc(org.id)}/members/${enc(viewer.memberId)}`}>
                        <UserRound aria-hidden="true" /> My profile
                      </Link>
                    )}
                    {org && (
                      <Link role="menuitem" to={`/organization/me?organizationId=${enc(org.id)}`}>
                        <House aria-hidden="true" /> {termsFor(org.organizationType).myOrg}
                      </Link>
                    )}
                    {org && (
                      <Link role="menuitem" to={`/organizations/${enc(org.id)}`}>
                        <Globe aria-hidden="true" /> Public page
                      </Link>
                    )}
                    {org && variant === "admin" && (
                      <Link role="menuitem" to={`/organizations/${enc(org.id)}/admin/settings`}>
                        <Settings aria-hidden="true" /> Settings &amp; Roles
                      </Link>
                    )}
                    <Link role="menuitem" to="/settings">
                      <UserCog aria-hidden="true" /> Account settings
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      className="fo-usermenu__out"
                      onClick={() => {
                        logout();
                        window.location.assign("/login");
                      }}
                    >
                      <LogOut aria-hidden="true" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </header>

        <main className="fo-app__content">
          {active && <PageBanner content={activeBranding} fallbackTitle={active.label} />}
          {children}
        </main>
      </div>

      {customizing && org && (
        <CustomizeDialog
          organization={org}
          activePage={active ? { key: keyOf(active), label: active.label } : null}
          onEditPage={() => {
            setCustomizing(false);
            if (active) setEditing({ key: keyOf(active), label: active.label, icon: active.icon, tab: "banner" });
          }}
          onClose={() => setCustomizing(false)}
        />
      )}
      {editing && org && (
        <PageBrandingEditor
          organizationId={org.id}
          pageKey={editing.key}
          pageLabel={editing.label}
          icon={editing.icon}
          initialTab={editing.tab}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
