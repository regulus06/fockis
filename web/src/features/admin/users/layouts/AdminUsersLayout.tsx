import React from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import "../styles/Users.scss";

interface NavigationItem {
  label: string;
  path: string;
  icon: string;
  end?: boolean;
  requiresUser?: boolean;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

const AdminUsersLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const pathParts = location.pathname
    .split("/")
    .filter(Boolean);

  const isAdminUsersPath =
    pathParts[0] === "admin" &&
    pathParts[1] === "users";

  /**
   * /admin/users
   * /admin/users/:id
   * /admin/users/:id/activity
   */
  const possibleUserId =
    isAdminUsersPath && pathParts.length >= 3
      ? pathParts[2]
      : undefined;

  const subPage =
    pathParts.length >= 4
      ? pathParts[3]
      : undefined;

  /**
   * These are the user sub-pages that currently
   * exist in the frontend.
   *
   * Additional pages can be added here later without
   * changing the overall navigation structure.
   */
  const validSubPages = [
    "activity",
    "bookings",
    "payments",
    "reports",
    "messages",
  ];

  const userId =
    possibleUserId &&
    (!subPage ||
      validSubPages.includes(subPage))
      ? possibleUserId
      : undefined;

  const isUsersIndexPage =
    isAdminUsersPath &&
    pathParts.length === 2;

  const isUserDetailsPage =
    Boolean(userId) &&
    pathParts.length === 3;

  const isUserSubPage =
    Boolean(userId) &&
    pathParts.length === 4 &&
    validSubPages.includes(subPage ?? "");

  const userBasePath = userId
    ? `/admin/users/${userId}`
    : "/admin/users";

  const navigationSections: NavigationSection[] = [
    {
      title: "USERS",
      items: [
        {
          label: "All Users",
          path: "/admin/users",
          end: true,
          icon: "👥",
          requiresUser: false,
        },
      ],
    },

    {
      title: "USER MANAGEMENT",
      items: [
        {
          label: "Overview",
          path: userBasePath,
          end: true,
          icon: "▣",
          requiresUser: true,
        },
        {
          label: "Profile",
          path: userId
            ? `${userBasePath}/profile`
            : "/admin/users",
          icon: "◉",
          requiresUser: true,
        },
        {
          label: "Account",
          path: userId
            ? `${userBasePath}/account`
            : "/admin/users",
          icon: "⚙",
          requiresUser: true,
        },
        {
          label: "Security",
          path: userId
            ? `${userBasePath}/security`
            : "/admin/users",
          icon: "🔒",
          requiresUser: true,
        },
        {
          label: "Roles & Permissions",
          path: userId
            ? `${userBasePath}/roles`
            : "/admin/users",
          icon: "◆",
          requiresUser: true,
        },
        {
          label: "Verification",
          path: userId
            ? `${userBasePath}/verification`
            : "/admin/users",
          icon: "✓",
          requiresUser: true,
        },
        {
          label: "Premium",
          path: userId
            ? `${userBasePath}/premium`
            : "/admin/users",
          icon: "★",
          requiresUser: true,
        },
        {
          label: "Fockis ID",
          path: userId
            ? `${userBasePath}/fockis-id`
            : "/admin/users",
          icon: "F",
          requiresUser: true,
        },
      ],
    },

    {
      title: "ACTIVITY & RECORDS",
      items: [
        {
          label: "Activity",
          path: userId
            ? `${userBasePath}/activity`
            : "/admin/users",
          icon: "◷",
          requiresUser: true,
        },
        {
          label: "Messages",
          path: userId
            ? `${userBasePath}/messages`
            : "/admin/users",
          icon: "✉",
          requiresUser: true,
        },
        {
          label: "Bookings",
          path: userId
            ? `${userBasePath}/bookings`
            : "/admin/users",
          icon: "▣",
          requiresUser: true,
        },
        {
          label: "Payments",
          path: userId
            ? `${userBasePath}/payments`
            : "/admin/users",
          icon: "$",
          requiresUser: true,
        },
        {
          label: "Reports",
          path: userId
            ? `${userBasePath}/reports`
            : "/admin/users",
          icon: "⚑",
          requiresUser: true,
        },
      ],
    },

    {
      title: "FOCKIS SERVICES",
      items: [
        {
          label: "Fockis Shop",
          path: userId
            ? `${userBasePath}/shop`
            : "/admin/users",
          icon: "🛍",
          requiresUser: true,
        },
        {
          label: "Live",
          path: userId
            ? `${userBasePath}/live`
            : "/admin/users",
          icon: "●",
          requiresUser: true,
        },
        {
          label: "Music",
          path: userId
            ? `${userBasePath}/music`
            : "/admin/users",
          icon: "♫",
          requiresUser: true,
        },
        {
          label: "Travel",
          path: userId
            ? `${userBasePath}/travel`
            : "/admin/users",
          icon: "✈",
          requiresUser: true,
        },
        {
          label: "Real Estate",
          path: userId
            ? `${userBasePath}/real-estate`
            : "/admin/users",
          icon: "⌂",
          requiresUser: true,
        },
        {
          label: "Fockis AI",
          path: userId
            ? `${userBasePath}/ai`
            : "/admin/users",
          icon: "✦",
          requiresUser: true,
        },
        {
          label: "Finance",
          path: userId
            ? `${userBasePath}/finance`
            : "/admin/users",
          icon: "$",
          requiresUser: true,
        },
      ],
    },

    {
      title: "ADMIN",
      items: [
        {
          label: "Admin History",
          path: userId
            ? `${userBasePath}/admin-history`
            : "/admin/users",
          icon: "▤",
          requiresUser: true,
        },
      ],
    },
  ];

  const handleBackToDashboard = () => {
    navigate("/admin");
  };

  const handleBackToUsers = () => {
    navigate("/admin/users");
  };

  const renderNavigationItem = (
    item: NavigationItem,
  ) => {
    const disabled =
      Boolean(item.requiresUser) && !userId;

    if (disabled) {
      return (
        <button
          key={item.label}
          type="button"
          className="admin-users-sidebar__link is-disabled"
          disabled
          title="Select a user first"
        >
          <span
            className="admin-users-sidebar__link-icon"
            aria-hidden="true"
          >
            {item.icon}
          </span>

          <span className="admin-users-sidebar__link-label">
            {item.label}
          </span>
        </button>
      );
    }

    return (
      <NavLink
        key={`${item.label}-${item.path}`}
        to={item.path}
        end={item.end}
        className={({ isActive }) =>
          [
            "admin-users-sidebar__link",
            isActive ? "is-active" : "",
          ]
            .filter(Boolean)
            .join(" ")
        }
      >
        <span
          className="admin-users-sidebar__link-icon"
          aria-hidden="true"
        >
          {item.icon}
        </span>

        <span className="admin-users-sidebar__link-label">
          {item.label}
        </span>
      </NavLink>
    );
  };

  return (
    <div className="admin-users-shell">
      <aside className="admin-users-sidebar">
        <div className="admin-users-sidebar__brand">
          <div
            className="admin-users-sidebar__logo"
            aria-hidden="true"
          >
            F
          </div>

          <div className="admin-users-sidebar__brand-copy">
            <strong>Fockis</strong>
            <span>User Administration</span>
          </div>
        </div>

        {userId && (
          <div className="admin-users-sidebar__selected-user">
            <span className="admin-users-sidebar__selected-user-label">
              SELECTED USER
            </span>

            <button
              type="button"
              className="admin-users-sidebar__selected-user-button"
              onClick={() =>
                navigate(userBasePath)
              }
              title="Open user overview"
            >
              <span
                className="admin-users-sidebar__selected-user-icon"
                aria-hidden="true"
              >
                👤
              </span>

              <span>
                <strong>User Account</strong>
                <small>
                  {userId}
                </small>
              </span>
            </button>

            <button
              type="button"
              className="admin-users-sidebar__change-user"
              onClick={handleBackToUsers}
            >
              ← Change user
            </button>
          </div>
        )}

        <nav
          className="admin-users-sidebar__navigation"
          aria-label="User administration navigation"
        >
          {navigationSections.map(
            (section) => (
              <section
                key={section.title}
                className="admin-users-sidebar__section"
              >
                <div className="admin-users-sidebar__section-title">
                  {section.title}
                </div>

                <div className="admin-users-sidebar__section-items">
                  {section.items.map(
                    renderNavigationItem,
                  )}
                </div>
              </section>
            ),
          )}
        </nav>

        <div className="admin-users-sidebar__footer">
          <button
            type="button"
            className="admin-users-sidebar__back"
            onClick={handleBackToDashboard}
          >
            <span aria-hidden="true">
              ←
            </span>

            <span>
              Admin Dashboard
            </span>
          </button>
        </div>
      </aside>

      <div className="admin-users-main">
        <header className="admin-users-header">
          <div className="admin-users-header__title">
            <span className="admin-users-header__eyebrow">
              FOCKIS ADMIN
            </span>

            <h1>
              {isUserDetailsPage ||
              isUserSubPage
                ? "User Details"
                : "User Management"}
            </h1>

            {isUsersIndexPage && (
              <p className="admin-users-header__subtitle">
                Manage Fockis users, accounts,
                security, verification, and
                platform access.
              </p>
            )}

            {userId && (
              <div className="admin-users-header__user-context">
                <span>
                  User ID:
                </span>

                <strong>
                  {userId}
                </strong>
              </div>
            )}
          </div>

          <div className="admin-users-header__actions">
            {userId && (
              <button
                type="button"
                className="admin-users-header__back-users"
                onClick={handleBackToUsers}
              >
                ← All Users
              </button>
            )}

            <button
              type="button"
              className="admin-users-header__refresh"
              onClick={() =>
                window.location.reload()
              }
              aria-label="Refresh user administration"
              title="Refresh"
            >
              ↻
            </button>
          </div>
        </header>

        <main className="admin-users-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminUsersLayout;