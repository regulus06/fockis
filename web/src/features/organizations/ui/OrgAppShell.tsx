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
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
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
  PencilLine,
  Plus,
  Radio,
  Settings,
  UserRound,
  Users,
  UsersRound,
  X,
} from "lucide-react";

import { categoryInfo, modulesFor, termsFor, welcomesVisitors } from "./orgTerminology";
import { Avatar, FockisOrgBrand, OrgLogoBox, useOrgFonts } from "./orgUi";
import "./fockisOrgTheme.scss";

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

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
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
  if (viewer?.memberId) items.push({ to: p(`/members/${enc(viewer.memberId)}`), label: "My Profile", icon: UserRound });
  items.push(
    { to: p("/my-badge"), label: "My Membership", icon: IdCard },
    { to: p("/groups"), label: `My ${t.groups}`, icon: UsersRound },
    { to: p("/departments"), label: `My ${t.departments}`, icon: Network },
    { to: p("/events"), label: "My Events", icon: CalendarDays },
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

export default function OrgAppShell({
  variant,
  organization,
  organizations,
  onSelectOrganization,
  viewer,
  notificationCount,
  children,
}: {
  variant: ShellVariant;
  organization?: ShellOrganization | null;
  /** When given, the top-bar organization card becomes a switcher. */
  organizations?: ShellOrganization[];
  onSelectOrganization?: (id: string) => void;
  viewer?: ShellViewer;
  notificationCount?: number;
  children: ReactNode;
}): React.JSX.Element {
  useOrgFonts();
  const { pathname, search } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname, search]);

  const org = organization ?? null;
  const terms = termsFor(org?.organizationType);
  const cat = categoryInfo(org?.organizationType);

  let sections: { label?: string; items: NavItem[] }[] = [];
  if (variant === "admin" && org) {
    const nav = adminNav(org);
    sections = [{ items: nav.main }];
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

  const subtitle =
    variant === "admin" ? (viewer?.roleLabel ?? "Admin") : variant === "member" ? "Member Portal" : (org ? cat.label : null);

  return (
    <div className={"fo fo-app" + (open ? " is-open" : "")}>
      <aside className="fo-app__side" aria-label="Organization menu">
        <FockisOrgBrand />
        <nav className="fo-nav">
          {sections.map((section, i) => (
            <div key={i}>
              {section.label && <div className="fo-nav__label">{section.label}</div>}
              {section.items.map((item) => (
                <NavLink
                  key={item.to + item.label}
                  to={item.to}
                  end={item.end}
                  className={() => "fo-nav__link" + (isLinkActive(item.to, pathname, search, item.end) ? " is-active" : "")}
                >
                  <item.icon aria-hidden="true" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
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
            {org && (
              <Link to={`/organizations/${enc(org.id)}/communication`} className="fo-iconbtn" aria-label="Announcements and notifications">
                <Bell aria-hidden="true" />
                {notificationCount ? <span className="fo-iconbtn__dot">{notificationCount > 99 ? "99+" : notificationCount}</span> : null}
              </Link>
            )}
            {viewer?.name ? (
              viewer.memberId && org ? (
                <Link to={`/organizations/${enc(org.id)}/members/${enc(viewer.memberId)}`} aria-label="My profile">
                  <Avatar name={viewer.name} url={viewer.avatarUrl} />
                </Link>
              ) : (
                <Avatar name={viewer.name} url={viewer.avatarUrl} />
              )
            ) : null}
          </div>
        </header>

        <main className="fo-app__content">{children}</main>
      </div>
    </div>
  );
}
