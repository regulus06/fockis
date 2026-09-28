import React, { useEffect, useRef, useState } from "react";

import { Link, NavLink, useNavigate } from "react-router-dom";

import type { ChurchNotification, UserRef } from "../types/church.types";

import { useFockisTranslation } from "../../../i18n/useFockisTranslation";

import "../styles/ChurchComponents.scss";

/* ============================================================================
   PROPS
========================================================================== */

export interface ChurchHeaderProps {
  currentUser?: UserRef | null;
  organizationName?: string;
  organizationId?: string;
  notifications?: ChurchNotification[];
  onSearch?: (query: string) => void;
  onSignOut?: () => void;
  className?: string;
}

/* ============================================================================
   ICONS
========================================================================== */

function SearchIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true" focusable="false">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />

      <path
        d="m17 17-3.2-3.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BellIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M10 2.5c-2.2 0-4 1.8-4 4v2.2c0 .6-.2 1.2-.6 1.7l-1 1.3c-.6.8 0 2 1 2h9.2c1 0 1.6-1.2 1-2l-1-1.3c-.4-.5-.6-1.1-.6-1.7V6.5c0-2.2-1.8-4-4-4Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      <path
        d="M8.2 16.2a1.8 1.8 0 0 0 3.6 0"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }): React.JSX.Element {
  if (open) {
    return (
      <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true" focusable="false">
        <path
          d="M4 4l12 12M16 4 4 16"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M3 5.5h14M3 10h14M3 14.5h14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ============================================================================
   HELPERS
========================================================================== */

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

/**
 * All guest-facing text is routed through i18n.
 * This keeps the component from hardcoding English/French/
 * Haitian Creole/Spanish UI text.
 */
function getGuestLabel(t: (key: string) => string): string {
  const translated = t("church.navigation.guest");

  if (translated && translated !== "church.navigation.guest") {
    return translated;
  }

  return "Guest";
}

/* ============================================================================
   PRIMARY NAVIGATION
========================================================================== */

const PRIMARY_LINKS = [
  {
    translationKey: "church.navigation.home",
    to: "/church",
  },
  {
    translationKey: "church.navigation.organizations",
    to: "/church/organizations",
  },
  {
    translationKey: "church.navigation.myChurch",
    to: "/church/me",
  },
  {
    translationKey: "church.navigation.planVisit",
    to: "/church/plan-visit",
  },
] as const;

/* ============================================================================
   ORGANIZATION NAVIGATION
========================================================================== */

interface OrganizationLink {
  translationKey: string;
  to: string;
}

function getOrganizationLinks(organizationId?: string): OrganizationLink[] {
  const id = organizationId?.trim();

  if (!id) {
    return [];
  }

  const base = "/church/organizations/" + encodeURIComponent(id);

  return [
    { translationKey: "church.navigation.overview", to: base },
    { translationKey: "church.navigation.members", to: base + "/members" },
    {
      translationKey: "church.navigation.departments",
      to: base + "/departments",
    },
    { translationKey: "church.navigation.groups", to: base + "/groups" },
    { translationKey: "church.navigation.events", to: base + "/events" },
    { translationKey: "church.navigation.live", to: base + "/live" },
    { translationKey: "church.navigation.media", to: base + "/media" },
    {
      translationKey: "church.navigation.communication",
      to: base + "/communication",
    },
    {
      translationKey: "church.navigation.attendance",
      to: base + "/attendance",
    },
  ];
}

/* ============================================================================
   COMPONENT
========================================================================== */

export default function ChurchHeader({
  currentUser,
  organizationName,
  organizationId,
  notifications = [],
  onSearch,
  onSignOut,
  className,
}: ChurchHeaderProps): React.JSX.Element {
  const navigate = useNavigate();

  const { t } = useFockisTranslation();

  /* ==========================================================================
     STATE
  ========================================================================== */

  const [mobileOpen, setMobileOpen] = useState(false);

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [organizationMenuOpen, setOrganizationMenuOpen] = useState(false);

  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  const [searchValue, setSearchValue] = useState("");

  /* ==========================================================================
     REFS
  ========================================================================== */

  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const notificationsRef = useRef<HTMLDivElement | null>(null);

  const organizationMenuRef = useRef<HTMLDivElement | null>(null);

  const adminMenuRef = useRef<HTMLDivElement | null>(null);

  /* ==========================================================================
     DERIVED STATE
  ========================================================================== */

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  const organizationLinks = getOrganizationLinks(organizationId);

  const guestLabel = getGuestLabel(t);

  /* ==========================================================================
     OUTSIDE CLICK HANDLER
  ========================================================================== */

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      const target = event.target as Node;

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }

      if (
        organizationMenuRef.current &&
        !organizationMenuRef.current.contains(target)
      ) {
        setOrganizationMenuOpen(false);
      }

      if (adminMenuRef.current && !adminMenuRef.current.contains(target)) {
        setAdminMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* ==========================================================================
     MOBILE
  ========================================================================== */

  const closeMobile = (): void => {
    setMobileOpen(false);
  };

  /* ==========================================================================
     SEARCH
  ========================================================================== */

  const handleSearchSubmit = (event: React.FormEvent): void => {
    event.preventDefault();

    const query = searchValue.trim();

    onSearch?.(query);

    if (query) {
      navigate(
        "/church/organizations?search=" + encodeURIComponent(query),
      );
    }
  };

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <header
      className={["church-header", className ?? ""].filter(Boolean).join(" ")}
    >
      <div className="church-header__row">
        {/* ================================================================
            BRAND
        ================================================================ */}

        <div className="church-header__brand-group">
          <button
            type="button"
            className="church-header__mobile-toggle"
            aria-label={
              mobileOpen
                ? t("church.navigation.closeMenu")
                : t("church.navigation.openMenu")
            }
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <MenuIcon open={mobileOpen} />
          </button>

          <Link
            to="/church"
            className="church-header__brand"
            onClick={closeMobile}
            aria-label={t("church.navigation.home")}
          >
            <span className="church-header__brand-mark" aria-hidden="true">
              F
            </span>

            <span className="church-header__brand-text">
              Fockis{" "}
              <span className="church-header__brand-accent">
                {t("church.navigation.church")}
              </span>
            </span>
          </Link>

          {/* ============================================================
              CURRENT ORGANIZATION
          ============================================================ */}

          {organizationName && organizationId && (
            <>
              <span className="church-header__divider" aria-hidden="true" />

              <Link
                to={"/church/organizations/" + encodeURIComponent(organizationId)}
                className="church-header__org-context"
              >
                {organizationName}
              </Link>
            </>
          )}
        </div>

        {/* ================================================================
            PRIMARY NAVIGATION
        ================================================================ */}

        <nav className="church-header__nav" aria-label={t("church.navigation.primary")}>
          {PRIMARY_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/church"}
              className={({ isActive }) =>
                ["church-header__nav-link", isActive ? "is-active" : ""]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              {t(link.translationKey)}
            </NavLink>
          ))}

          {/* ============================================================
              ORGANIZATION MENU
          ============================================================ */}

          {organizationId && (
            <div className="church-header__popover" ref={organizationMenuRef}>
              <button
                type="button"
                className="church-header__nav-link"
                aria-expanded={organizationMenuOpen}
                onClick={() => setOrganizationMenuOpen((open) => !open)}
              >
                {t("church.navigation.churchMenu")}
              </button>

              {organizationMenuOpen && (
                <div className="church-header__dropdown">
                  <div className="church-header__dropdown-title">
                    {organizationName || t("church.navigation.myOrganization")}
                  </div>

                  {organizationLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        [isActive ? "is-active" : ""].filter(Boolean).join(" ")
                      }
                      onClick={() => setOrganizationMenuOpen(false)}
                    >
                      {t(link.translationKey)}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              ADMIN MENU
          ============================================================ */}

          <div className="church-header__popover" ref={adminMenuRef}>
            <button
              type="button"
              className="church-header__nav-link"
              aria-expanded={adminMenuOpen}
              onClick={() => setAdminMenuOpen((open) => !open)}
            >
              {t("church.navigation.admin")}
            </button>

            {adminMenuOpen && (
              <div className="church-header__dropdown">
                <div className="church-header__dropdown-title">
                  {t("church.navigation.administration")}
                </div>

                <Link
                  to="/church/admin/dashboard"
                  onClick={() => setAdminMenuOpen(false)}
                >
                  {t("church.navigation.dashboard")}
                </Link>

                <Link
                  to="/church/admin/organizations/new"
                  onClick={() => setAdminMenuOpen(false)}
                >
                  {t("church.navigation.createOrganization")}
                </Link>

                <Link
                  to="/church/admin/members"
                  onClick={() => setAdminMenuOpen(false)}
                >
                  {t("church.navigation.manageMembers")}
                </Link>

                <Link
                  to="/church/admin/departments"
                  onClick={() => setAdminMenuOpen(false)}
                >
                  {t("church.navigation.manageDepartments")}
                </Link>

                <Link
                  to="/church/admin/groups"
                  onClick={() => setAdminMenuOpen(false)}
                >
                  {t("church.navigation.manageGroups")}
                </Link>

                <Link
                  to="/church/admin/events"
                  onClick={() => setAdminMenuOpen(false)}
                >
                  {t("church.navigation.manageEvents")}
                </Link>

                <Link
                  to="/church/admin/live"
                  onClick={() => setAdminMenuOpen(false)}
                >
                  {t("church.navigation.livestreamManager")}
                </Link>

                <Link
                  to="/church/admin/settings"
                  onClick={() => setAdminMenuOpen(false)}
                >
                  {t("church.navigation.settings")}
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* ================================================================
            SEARCH
        ================================================================ */}

        <form
          className="church-header__search"
          role="search"
          onSubmit={handleSearchSubmit}
        >
          <SearchIcon />

          <input
            type="search"
            placeholder={t("church.search.organizationsEventsMembers")}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            aria-label={t("church.search.ariaLabel")}
          />
        </form>

        {/* ================================================================
            ACTIONS
        ================================================================ */}

        <div className="church-header__actions">
          {/* ============================================================
              NOTIFICATIONS
          ============================================================ */}

          <div className="church-header__popover" ref={notificationsRef}>
            <button
              type="button"
              className="church-header__icon-btn"
              aria-label={t("church.notifications.ariaLabel")}
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen((open) => !open)}
            >
              <BellIcon />

              {unreadCount > 0 && (
                <span
                  className="church-header__badge"
                  aria-label={t("church.notifications.unreadCount", {
                    count: unreadCount,
                  })}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div
                className="church-header__dropdown church-header__dropdown--wide"
                role="menu"
              >
                <div className="church-header__dropdown-title">
                  {t("church.notifications.title")}
                </div>

                {notifications.length === 0 ? (
                  <p className="church-header__dropdown-empty">
                    {t("church.notifications.empty")}
                  </p>
                ) : (
                  <ul className="church-header__notification-list">
                    {notifications.slice(0, 6).map((notification) => (
                      <li
                        key={notification.id}
                        className={notification.isRead ? "" : "is-unread"}
                      >
                        <Link
                          to={
                            notification.linkPath ??
                            "/church/me/notifications"
                          }
                          onClick={() => setNotificationsOpen(false)}
                        >
                          <span className="church-header__notification-title">
                            {notification.title}
                          </span>

                          <span className="church-header__notification-body">
                            {notification.body}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  to="/church/me/notifications"
                  className="church-header__dropdown-footer-link"
                  onClick={() => setNotificationsOpen(false)}
                >
                  {t("church.notifications.viewAll")}
                </Link>
              </div>
            )}
          </div>

          {/* ============================================================
              USER MENU
          ============================================================ */}

          <div className="church-header__popover" ref={userMenuRef}>
            <button
              type="button"
              className="church-header__user-btn"
              aria-label={t("church.navigation.accountMenu")}
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen((open) => !open)}
            >
              <span className="church-header__avatar">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="" />
                ) : (
                  initialsFor(currentUser?.displayName ?? guestLabel)
                )}
              </span>
            </button>

            {userMenuOpen && (
              <div className="church-header__dropdown" role="menu">
                <div className="church-header__dropdown-title">
                  {currentUser?.displayName ?? guestLabel}
                </div>

                <Link
                  to="/church/me"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                >
                  {t("church.navigation.myChurch")}
                </Link>

                <Link
                  to="/church/me/profile"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                >
                  {t("church.navigation.myProfile")}
                </Link>

                <Link
                  to="/church/me/events"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                >
                  {t("church.navigation.myEvents")}
                </Link>

                <Link
                  to="/church/me/attendance"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                >
                  {t("church.navigation.myAttendance")}
                </Link>

                <Link
                  to="/church/me/messages"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                >
                  {t("church.navigation.messages")}
                </Link>

                <Link
                  to="/church/me/notifications"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                >
                  {t("church.navigation.notifications")}
                </Link>

                {onSignOut && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);

                      onSignOut();
                    }}
                    role="menuitem"
                    className="church-header__signout"
                  >
                    {t("church.navigation.signOut")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================
          MOBILE MENU
      ================================================================ */}

      {mobileOpen && (
        <div className="church-header__mobile-panel">
          <form
            className="church-header__search church-header__search--mobile"
            role="search"
            onSubmit={handleSearchSubmit}
          >
            <SearchIcon />

            <input
              type="search"
              placeholder={t("church.search.mobile")}
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              aria-label={t("church.search.ariaLabel")}
            />
          </form>

          <nav
            className="church-header__mobile-nav"
            aria-label={t("church.navigation.primaryMobile")}
          >
            {/* ==========================================================
                PRIMARY MOBILE LINKS
            =========================================================== */}

            {PRIMARY_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/church"}
                className={({ isActive }) =>
                  ["church-header__nav-link", isActive ? "is-active" : ""]
                    .filter(Boolean)
                    .join(" ")
                }
                onClick={closeMobile}
              >
                {t(link.translationKey)}
              </NavLink>
            ))}

            {/* ==========================================================
                ORGANIZATION LINKS
            =========================================================== */}

            {organizationId && (
              <>
                <div className="church-header__mobile-section-title">
                  {organizationName || t("church.navigation.myOrganization")}
                </div>

                {organizationLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      ["church-header__nav-link", isActive ? "is-active" : ""]
                        .filter(Boolean)
                        .join(" ")
                    }
                    onClick={closeMobile}
                  >
                    {t(link.translationKey)}
                  </NavLink>
                ))}
              </>
            )}

            {/* ==========================================================
                ADMINISTRATION
            =========================================================== */}

            <div className="church-header__mobile-section-title">
              {t("church.navigation.administration")}
            </div>

            <Link
              to="/church/admin/dashboard"
              className="church-header__nav-link"
              onClick={closeMobile}
            >
              {t("church.navigation.admin")} {t("church.navigation.dashboard")}
            </Link>

            <Link
              to="/church/admin/organizations/new"
              className="church-header__nav-link"
              onClick={closeMobile}
            >
              {t("church.navigation.createOrganization")}
            </Link>

            <Link
              to="/church/admin/members"
              className="church-header__nav-link"
              onClick={closeMobile}
            >
              {t("church.navigation.manageMembers")}
            </Link>

            <Link
              to="/church/admin/departments"
              className="church-header__nav-link"
              onClick={closeMobile}
            >
              {t("church.navigation.manageDepartments")}
            </Link>

            <Link
              to="/church/admin/groups"
              className="church-header__nav-link"
              onClick={closeMobile}
            >
              {t("church.navigation.manageGroups")}
            </Link>

            <Link
              to="/church/admin/events"
              className="church-header__nav-link"
              onClick={closeMobile}
            >
              {t("church.navigation.manageEvents")}
            </Link>

            <Link
              to="/church/admin/live"
              className="church-header__nav-link"
              onClick={closeMobile}
            >
              {t("church.navigation.livestreamManager")}
            </Link>

            <Link
              to="/church/admin/settings"
              className="church-header__nav-link"
              onClick={closeMobile}
            >
              {t("church.navigation.settings")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}