import { useEffect, useMemo, useState, type ComponentType } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Clapperboard,
  CreditCard,
  Home,
  Landmark,
  LayoutDashboard,
  LogIn,
  LogOut,
  Map as MapIcon,
  Megaphone,
  MessageSquareText,
  Music,
  Plane,
  Radio,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserPlus,
  Users,
  UserRoundCog,
  Video,
  X,
} from "lucide-react";

import { useNotifications } from "../../../features/notifications/hooks/useNotifications";
import { useFockisProfile } from "../../../features/gifts/fockisprofile/hooks/useFockisProfile";
import { useAdminSessionStore } from "../../../features/admin/store/adminSessionStore";
import { buildFockisUploadUrl } from "../../../config/fockisConfig";
import { getToken } from "../../../utils/auth";
import FockisMark from "../FockisMark";

import "./FockisNav.scss";

export interface FockisSidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onCreatePost?: () => void;
  onClose?: () => void;
}

type Icon = ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;
interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  badge?: number;
  /** Also active on these path prefixes. */
  match?: string[];
  end?: boolean;
}

/** Other Fockis areas. Not in the main list, but every page stays one click away. */
const MORE_ITEMS: NavItem[] = [
  { to: "/music", label: "Fockis Music", icon: Music },
  { to: "/meetings", label: "Meetings", icon: Video },
  { to: "/my-live", label: "My Live", icon: Radio },
  { to: "/businesses", label: "Businesses", icon: Building2 },
  { to: "/ads", label: "Ads Manager", icon: Megaphone },
  { to: "/seller", label: "Seller Center", icon: Store },
  { to: "/travel", label: "Fockis Travel", icon: Plane },
  { to: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/map", label: "Map", icon: MapIcon },
  { to: "/fockis-ai", label: "Fockis AI", icon: Bot },
  { to: "/academy", label: "Fockis Academy", icon: BookOpen },
  { to: "/church", label: "Fockis Org", icon: Landmark },
];

/** Careers pages for job seekers, so "Careers" stays highlighted while browsing them. */
const CAREERS_SEEKER_PATHS = [
  "/careers/jobs",
  "/careers/search",
  "/careers/internships",
  "/careers/co-ops",
  "/careers/companies",
  "/careers/dashboard",
  "/careers/applications",
  "/careers/saved-jobs",
  "/careers/profile",
  "/careers/resume",
  "/careers/alerts",
  "/careers/resources",
];

interface SidebarUser {
  _id?: string;
  id?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatar?: string;
  profilePicture?: string;
  profileImage?: string;
  avatarUrl?: string;
  verified?: boolean;
  isVerified?: boolean;
  role?: string;
  roles?: string[];
  isSuperAdmin?: boolean;
  isAdmin?: boolean;
}

function readStoredUser(): SidebarUser | null {
  try {
    const raw = localStorage.getItem("user");
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as SidebarUser) : null;
  } catch {
    return null;
  }
}

const role = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");

function isStaff(user: SidebarUser | null) {
  if (!user) return false;
  if (user.isSuperAdmin || user.isAdmin) return true;
  const roles = [user.role, ...(Array.isArray(user.roles) ? user.roles : [])].map(role);
  return roles.some((r) => ["super_admin", "superadmin", "admin", "administrator"].includes(r));
}

function avatarUrl(user: SidebarUser | null) {
  const raw = user?.profilePicture || user?.avatar || user?.profileImage || user?.avatarUrl || "";
  if (!raw) return "";
  return /^(https?:|data:|blob:)/.test(raw) ? raw : buildFockisUploadUrl(raw);
}

function displayName(user: SidebarUser | null) {
  if (!user) return "";
  return user.fullName || user.name || [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username || "";
}

/** Disconnects every realtime connection this tab may have opened. */
async function disconnectRealtime() {
  const tasks: Promise<unknown>[] = [
    import("../../../socket/client").then((m) => m.disconnectNotificationSocket()),
    import("../../../messages/services/messageSocket").then((m) => m.messageSocket?.disconnect?.()),
    import("../../../socket").then((m) => m.socket?.disconnect?.()),
  ];
  await Promise.allSettled(tasks);
}

export default function FockisSidebar({ collapsed = false, mobileOpen = false, onClose }: FockisSidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const signedIn = Boolean(getToken());

  const { profile } = useFockisProfile();
  const currentAdmin = useAdminSessionStore((state) => state.currentAdmin);
  const user: SidebarUser | null = (profile?.user as SidebarUser | undefined) ?? (signedIn ? readStoredUser() : null);
  const { unreadCount } = useNotifications();
  const [unreadMessages, setUnreadMessages] = useState(0);

  const moreActive = MORE_ITEMS.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
  const [moreOpen, setMoreOpen] = useState(moreActive);

  useEffect(() => {
    if (moreActive) setMoreOpen(true);
  }, [moreActive]);

  useEffect(() => {
    if (!signedIn) return undefined;
    let alive = true;
    import("../../../messages/services/conversationsApi")
      .then(({ conversationsApi }) => conversationsApi.list())
      .then((list: unknown) => {
        if (!alive || !Array.isArray(list)) return;
        setUnreadMessages(list.reduce((sum: number, c: { unreadCount?: number }) => sum + (Number(c?.unreadCount) || 0), 0));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [signedIn]);

  const mainItems: NavItem[] = useMemo(
    () => [
      { to: "/fockis-preview", label: "Home (Feed)", icon: Home, end: true },
      { to: "/waves", label: "Waves (Reels)", icon: Clapperboard },
      { to: "/shop", label: "Fockis Shop", icon: ShoppingBag },
      { to: "/messages", label: "Messages", icon: MessageSquareText, badge: unreadMessages },
      { to: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
      { to: "/groups", label: "Groups", icon: Users },
      { to: "/events", label: "Events", icon: CalendarDays },
      { to: "/organizations", label: "Organizations", icon: Building2 },
      // Job seekers: every Careers page except the Employer Center.
      { to: "/careers", label: "Careers", icon: Briefcase, end: true, match: CAREERS_SEEKER_PATHS },
      // Employers: post jobs, see applicants (the form to become an employer is here too).
      { to: "/careers/employer", label: "Employer Center", icon: UserRoundCog },
    ],
    [unreadCount, unreadMessages],
  );

  const accountItems: NavItem[] = [
    { to: "/settings", label: "Settings", icon: Settings, end: true },
    { to: "/settings/policy", label: "Policy, Privacy & Safety", icon: ShieldCheck },
    { to: "/help", label: "Help & Support", icon: CircleHelp },
  ];

  const showAdmin = isStaff(currentAdmin as SidebarUser | null) || isStaff(user);

  function closeMobile() {
    if (mobileOpen) onClose?.();
  }

  async function handleLogout() {
    // In the Fockis app: stop this phone ringing for this account's calls.
    await import("../../../messages/calls/nativeBridge")
      .then((m) => m.unregisterThisPhone())
      .catch(() => undefined);
    await disconnectRealtime();
    try {
      for (const key of ["token", "accessToken", "access_token", "refreshToken", "userId", "user", "currentUser"]) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      }
    } catch {
      /* storage may be unavailable */
    }
    closeMobile();
    navigate("/login", { replace: true });
    // Clears in-memory stores (profile, feed, chats) of the previous account.
    window.setTimeout(() => window.location.reload(), 0);
  }

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const extraActive = item.match?.some((prefix) => pathname.startsWith(prefix));
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={closeMobile}
        className={({ isActive }) => ["fk-nav__item", isActive || extraActive ? "is-active" : ""].filter(Boolean).join(" ")}
        title={collapsed ? item.label : undefined}
      >
        <Icon size={21} strokeWidth={1.9} aria-hidden />
        <span className="fk-nav__label">{item.label}</span>
        {item.badge ? (
          <span className={`fk-nav__badge${item.to === "/notifications" ? " fk-nav__badge--alert" : ""}`} aria-label={`${item.badge} unread`}>
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        ) : null}
      </NavLink>
    );
  };

  const name = displayName(user);
  const picture = avatarUrl(user);
  const verified = Boolean(user?.verified || user?.isVerified);

  return (
    <aside
      className={["fk-sidebar", "fk-nav", collapsed ? "fk-sidebar--collapsed" : "", mobileOpen ? "fk-sidebar--mobile-open" : ""].filter(Boolean).join(" ")}
      aria-label="Fockis"
    >
      <div className="fk-nav__brand">
        <NavLink to="/fockis-preview" className="fk-nav__logo" onClick={closeMobile} aria-label="Fockis home">
          <span className="fk-nav__logo-mark">
            <FockisMark />
          </span>
          <span className="fk-nav__logo-text">Fockis</span>
        </NavLink>
        {mobileOpen && (
          <button type="button" className="fk-nav__close" onClick={onClose} aria-label="Close navigation">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="fk-nav__scroll" aria-label="Main navigation">
        <div className="fk-nav__group">{mainItems.map(renderItem)}</div>

        <div className="fk-nav__group">
          <button type="button" className={`fk-nav__item fk-nav__more${moreOpen ? " is-open" : ""}`} onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen}>
            <LayoutDashboard size={21} strokeWidth={1.9} aria-hidden />
            <span className="fk-nav__label">More from Fockis</span>
            <ChevronDown size={17} className="fk-nav__chevron" aria-hidden />
          </button>
          {moreOpen && <div className="fk-nav__sub">{MORE_ITEMS.map(renderItem)}</div>}
          {showAdmin && renderItem({ to: "/admin/dashboard", label: "Admin Dashboard", icon: LayoutDashboard, match: ["/admin/"] })}
        </div>

        <hr className="fk-nav__divider" />

        <div className="fk-nav__group">{accountItems.map(renderItem)}</div>
      </nav>

      <div className="fk-nav__account">
        {signedIn ? (
          <>
            <button
              type="button"
              className="fk-nav__profile"
              onClick={() => {
                closeMobile();
                navigate("/profile");
              }}
            >
              <span className="fk-nav__avatar">
                {picture ? <img src={picture} alt="" /> : <span>{(name || "F").charAt(0).toUpperCase()}</span>}
              </span>
              <span className="fk-nav__who">
                <strong>
                  <span>{name || "Your profile"}</span>
                  {verified && <BadgeCheck size={17} className="fk-nav__verified" aria-label="Verified" />}
                </strong>
                {user?.username && <small>@{user.username}</small>}
              </span>
            </button>
            <NavLink to="/settings/account" onClick={closeMobile} className={({ isActive }) => `fk-nav__item fk-nav__item--plain${isActive ? " is-active" : ""}`}>
              <Settings size={20} strokeWidth={1.9} aria-hidden />
              <span className="fk-nav__label">Account Settings</span>
            </NavLink>
            <button type="button" className="fk-nav__logout" onClick={() => void handleLogout()}>
              <LogOut size={20} strokeWidth={1.9} aria-hidden />
              <span>Log Out</span>
            </button>
          </>
        ) : (
          <div className="fk-nav__guest">
            <NavLink to="/login" onClick={closeMobile} className="fk-nav__guest-btn fk-nav__guest-btn--primary">
              <LogIn size={18} aria-hidden /> Log In
            </NavLink>
            <NavLink to="/register" onClick={closeMobile} className="fk-nav__guest-btn">
              <UserPlus size={18} aria-hidden /> Sign Up
            </NavLink>
          </div>
        )}
      </div>
    </aside>
  );
}
