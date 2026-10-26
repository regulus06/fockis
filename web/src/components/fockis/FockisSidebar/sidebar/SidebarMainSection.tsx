import React from "react";
import { NavLink } from "react-router-dom";
import { useAdminSessionStore } from "../../../../features/admin/store/adminSessionStore";

interface SidebarMainSectionProps {
  onNavigate?: () => void;
}

interface SidebarUser {
  role?: string | null;
  roles?: string[] | null;
  isSuperAdmin?: boolean | null;
  is_super_admin?: boolean | null;
}

function normalizeRole(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isSuperAdmin(user: SidebarUser | null): boolean {
  if (!user) return false;

  if (
    user.isSuperAdmin === true ||
    user.is_super_admin === true
  ) {
    return true;
  }

  const allowedRoles = new Set([
    "super_admin",
    "superadmin",
    "super_admin_user",
  ]);

  if (allowedRoles.has(normalizeRole(user.role))) {
    return true;
  }

  return (
    Array.isArray(user.roles) &&
    user.roles.some((role) =>
      allowedRoles.has(normalizeRole(role))
    )
  );
}

/** The saved login user (written at login). Read fresh on every render. */
function readStoredUser(): SidebarUser | null {
  try {
    const raw = localStorage.getItem("user");
    const parsed: unknown = raw ? JSON.parse(raw) : null;

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as SidebarUser)
      : null;
  } catch {
    return null;
  }
}

/** The role inside the login token (the backend puts it there). */
function readTokenUser(): SidebarUser | null {
  try {
    const token = (
      localStorage.getItem("accessToken") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      ""
    )
      .replace(/^Bearer\s+/i, "")
      .trim();

    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const json = atob(
      payload.replace(/-/g, "+").replace(/_/g, "/"),
    );

    return JSON.parse(json) as SidebarUser;
  } catch {
    return null;
  }
}

export default function SidebarMainSection({
  onNavigate,
}: SidebarMainSectionProps) {
  const currentAdmin = useAdminSessionStore(
    (state) => state.currentAdmin
  );

  // Checked on every render (the sidebar re-renders on navigation), so
  // logging in as a Super Admin shows the link without a page reload.
  const showAdminDashboard =
    isSuperAdmin(currentAdmin as SidebarUser | null) ||
    isSuperAdmin(readStoredUser()) ||
    isSuperAdmin(readTokenUser());

  const handleNavigation = () => {
    onNavigate?.();
  };

  const navClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    [
      "fk-sidebar__nav-item",
      isActive ? "fk-sidebar__nav-item--active" : "",
    ]
      .filter(Boolean)
      .join(" ");

  const navigationItems = [
    { to: "/fockis-preview", label: "Feed", icon: "🏠" },
    { to: "/settings", label: "Account Settings", icon: "⚙️" },
    { to: "/music", label: "Fockis Music", icon: "🎵" },
    { to: "/meetings", label: "Meetings", icon: "🎥" },
    { to: "/my-live", label: "My Live", icon: "🔴" },
    { to: "/events", label: "Events", icon: "📅" },
    { to: "/businesses", label: "Businesses", icon: "🏢" },

    // Manager pages
    { to: "/business/manager", label: "Business Manager", icon: "📊" },
    { to: "/marketing/dashboard", label: "Marketing Manager", icon: "📣" },
    { to: "/ads", label: "Ads Manager", icon: "📢" },

    { to: "/shop", label: "Fockis Shop", icon: "🛍️" },
    { to: "/seller", label: "Seller Center", icon: "🏪" },
    { to: "/travel", label: "Fockis Travel", icon: "✈️" },
    { to: "/subscriptions", label: "Subscriptions", icon: "💳" },
    { to: "/map", label: "Map", icon: "🗺️" },
    { to: "/fockis-ai", label: "Fockis AI", icon: "✦" },
    { to: "/church", label: "Fockis Org", icon: "🏛️" },
  ];

  return (
    <div className="fk-sidebar__nav-group">
      <span className="fk-sidebar__section-label">
        Main
      </span>

      {navigationItems.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={navClass}
          onClick={handleNavigation}
          aria-label={label}
        >
          <span
            className="fk-sidebar__nav-icon"
            aria-hidden="true"
          >
            {icon}
          </span>

          <span className="fk-sidebar__nav-label">
            {label}
          </span>
        </NavLink>
      ))}

      {showAdminDashboard && (
        <NavLink
          to="/admin/dashboard"
          className={navClass}
          onClick={handleNavigation}
          aria-label="Admin Dashboard"
        >
          <span
            className="fk-sidebar__nav-icon"
            aria-hidden="true"
          >
            🛡️
          </span>

          <span className="fk-sidebar__nav-label">
            Admin Dashboard
          </span>
        </NavLink>
      )}
    </div>
  );
}