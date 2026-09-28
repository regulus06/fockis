import React from "react";
import { NavLink } from "react-router-dom";

import type { ChurchPermissions } from "../types/church.types";

import { useFockisTranslation } from "../../../i18n/useFockisTranslation";

import "../styles/ChurchComponents.scss";

/* ============================================================================
   TYPES
========================================================================== */

export type ChurchSidebarSection =
  | "overview"
  | "leadership"
  | "branches"
  | "departments"
  | "groups"
  | "members"
  | "events"
  | "live"
  | "attendance"
  | "communication"
  | "media";

export interface ChurchSidebarViewer {
  /**
   * Whether the current viewer is authenticated.
   */
  isAuthenticated?: boolean;

  /**
   * Whether the viewer currently has an active membership.
   */
  isActiveMember?: boolean;

  /**
   * Whether the viewer owns the organization.
   * Ownership is ultimately determined by the backend.
   */
  isOwner?: boolean;

  /**
   * Backend-derived organization permissions.
   * These are used for UI visibility only.
   * The backend must still enforce authorization.
   */
  permissions?: ChurchPermissions | null;
}

export interface ChurchSidebarProps {
  organizationId: string;

  /**
   * Organization names are database/user-created content.
   * They must never be passed through the translation system.
   */
  organizationName?: string;

  /**
   * Current viewer authorization information.
   */
  viewer?: ChurchSidebarViewer;

  /**
   * Optional explicit section filter.
   * This can hide sections but must never grant access.
   */
  visibleSections?: ChurchSidebarSection[];

  className?: string;
}

/* ============================================================================
   NAVIGATION
========================================================================== */

interface NavItem {
  key: ChurchSidebarSection;

  /**
   * Translation key used by the Fockis i18n system.
   */
  translationKey: string;

  path: (organizationId: string) => string;

  end?: boolean;

  /**
   * Public sections do not require organization permission.
   */
  public?: boolean;

  /**
   * Permission required for authenticated organization access.
   */
  canView?: (permissions: ChurchPermissions) => boolean;
}

function orgPath(id: string, suffix?: string): string {
  const base = "/church/organizations/" + encodeURIComponent(id);

  return suffix ? base + suffix : base;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "overview",
    translationKey: "church.navigation.overview",
    path: (id) => orgPath(id),
    end: true,
    public: true,
  },

  {
    key: "leadership",
    translationKey: "church.navigation.leadership",
    path: (id) => orgPath(id, "#leadership"),
    public: true,
  },

  {
    key: "branches",
    translationKey: "church.navigation.branches",
    path: (id) => orgPath(id, "#branches"),
    public: true,
  },

  {
    key: "departments",
    translationKey: "church.navigation.departments",
    path: (id) => orgPath(id, "/departments"),
    canView: (permissions) =>
      permissions.canManageDepartments || permissions.canViewOrganization,
  },

  {
    key: "groups",
    translationKey: "church.navigation.groups",
    path: (id) => orgPath(id, "/groups"),
    canView: (permissions) =>
      permissions.canManageGroups || permissions.canViewOrganization,
  },

  {
    key: "members",
    translationKey: "church.navigation.members",
    path: (id) => orgPath(id, "/members"),
    canView: (permissions) =>
      permissions.canViewMemberDirectory || permissions.canManageMembers,
  },

  {
    key: "events",
    translationKey: "church.navigation.events",
    path: (id) => orgPath(id, "/events"),
    canView: (permissions) =>
      permissions.canManageEvents || permissions.canViewOrganization,
  },

  {
    key: "live",
    translationKey: "church.navigation.live",
    path: (id) => orgPath(id, "/live"),
    canView: (permissions) =>
      permissions.canManageLive || permissions.canViewOrganization,
  },

  {
    key: "attendance",
    translationKey: "church.navigation.attendance",
    path: (id) => orgPath(id, "/attendance"),
    canView: (permissions) => permissions.canRecordAttendance,
  },

  {
    key: "communication",
    translationKey: "church.navigation.communication",
    path: (id) => orgPath(id, "/communication"),
    canView: (permissions) => permissions.canManageCommunication,
  },

  {
    key: "media",
    translationKey: "church.navigation.media",
    path: (id) => orgPath(id, "/media"),
    canView: (permissions) =>
      permissions.canManageMedia || permissions.canViewOrganization,
  },
];

/* ============================================================================
   PERMISSION LOGIC
========================================================================== */

/**
 * Determines whether a navigation item should be displayed.
 * IMPORTANT:
 * This function controls UI visibility only.
 * The backend must independently enforce every protected
 * route and API endpoint.
 */
function canViewItem(item: NavItem, viewer?: ChurchSidebarViewer): boolean {
  /*
   * Public organization sections are always visible.
   */
  if (item.public) {
    return true;
  }

  /**
   * Protected section.
   */
  if (!viewer) {
    return false;
  }

  /**
   * Owner gets full organization access.
   * This mirrors the backend ownership model where the
   * organization owner does not depend on permissions.
   */
  if (viewer.isOwner) {
    return true;
  }

  /**
   * Protected organization sections require active membership.
   */
  if (!viewer.isActiveMember) {
    return false;
  }

  /**
   * No permission object means the viewer has not been granted
   * the corresponding organization access information.
   */
  if (!viewer.permissions) {
    return false;
  }

  /**
   * Use the backend-derived permission model.
   */
  if (!item.canView) {
    return false;
  }

  return item.canView(viewer.permissions);
}

/* ============================================================================
   COMPONENT
========================================================================== */

export default function ChurchSidebar({
  organizationId,
  organizationName,
  viewer,
  visibleSections,
  className,
}: ChurchSidebarProps): React.JSX.Element {
  const { t } = useFockisTranslation();

  /**
   * First apply authorization.
   * visibleSections can only further restrict what is shown.
   */
  const authorizedItems = NAV_ITEMS.filter((item) =>
    canViewItem(item, viewer),
  );

  const items = visibleSections
    ? authorizedItems.filter((item) => visibleSections.includes(item.key))
    : authorizedItems;

  /**
   * Always keep the organization ID in the URL
   * exactly as provided by the caller, but safely
   * encode it for routing.
   */
  const encodedOrganizationId = encodeURIComponent(organizationId.trim());

  return (
    <nav
      className={["church-sidebar", className ?? ""].filter(Boolean).join(" ")}
      aria-label={t("church.navigation.organizationNavigation")}
    >
      {organizationName && organizationName.trim() && (
        <div className="church-sidebar__heading">{organizationName}</div>
      )}

      <ul className="church-sidebar__list">
        {items.map((item) => (
          <li key={item.key} className="church-sidebar__item">
            <NavLink
              to={item.path(encodedOrganizationId)}
              end={item.end}
              className={({ isActive }) =>
                [
                  "church-sidebar__link",
                  isActive ? "church-sidebar__link--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              {t(item.translationKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}