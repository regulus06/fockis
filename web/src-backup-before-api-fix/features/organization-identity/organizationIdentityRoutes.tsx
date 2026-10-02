import type { RouteObject } from "react-router-dom";

import OrganizationIdentityHomePage from "./pages/OrganizationIdentityHomePage";
import OrganizationManagedUsersPage from "./pages/OrganizationManagedUsersPage";
import OrganizationCreateUserPage from "./pages/OrganizationCreateUserPage";
import OrganizationUserDetailsPage from "./pages/OrganizationUserDetailsPage";

import OrganizationDomainsPage from "./pages/OrganizationDomainsPage";
import OrganizationAddDomainPage from "./pages/OrganizationAddDomainPage";
import OrganizationDomainDetailsPage from "./pages/OrganizationDomainDetailsPage";

import OrganizationIdentitySettingsPage from "./pages/OrganizationIdentitySettingsPage";

/**
 * Organization Identity Routes
 *
 * These routes are intended to be mounted beneath:
 *
 * /organizations/:organizationId/
 *
 * Examples:
 *
 * /organizations/123/identity
 * /organizations/123/identity/users
 * /organizations/123/identity/users/create
 * /organizations/123/identity/users/456
 * /organizations/123/identity/domains
 * /organizations/123/identity/domains/new
 * /organizations/123/identity/domains/456
 * /organizations/123/identity/settings
 */
export function createOrganizationIdentityRoutes(
  organizationId: string,
): RouteObject[] {
  return [
    // ========================================================================
    // IDENTITY HOME
    // ========================================================================

    {
      path: "identity",
      element: (
        <OrganizationIdentityHomePage
          organizationId={organizationId}
        />
      ),
    },

    // ========================================================================
    // MANAGED USERS
    // ========================================================================

    {
      path: "identity/users",
      element: (
        <OrganizationManagedUsersPage
          organizationId={organizationId}
        />
      ),
    },

    {
      path: "identity/users/create",
      element: <OrganizationCreateUserPage />,
    },

    {
      path: "identity/users/:userId",
      element: <OrganizationUserDetailsPage />,
    },

    // ========================================================================
    // DOMAINS
    // ========================================================================

    /**
     * Domain list
     *
     * /organizations/:organizationId/identity/domains
     */
    {
      path: "identity/domains",
      element: (
        <OrganizationDomainsPage
          organizationId={organizationId}
        />
      ),
    },

    /**
     * Add / Create domain
     *
     * OrganizationDomainsPage navigates to:
     *
     * /organizations/:organizationId/identity/domains/new
     *
     * Therefore this route MUST be "new".
     */
    {
      path: "identity/domains/new",
      element: <OrganizationAddDomainPage />,
    },

    /**
     * Domain details / verification
     *
     * /organizations/:organizationId/identity/domains/:domainId
     */
    {
      path: "identity/domains/:domainId",
      element: <OrganizationDomainDetailsPage />,
    },

    // ========================================================================
    // IDENTITY SETTINGS
    // ========================================================================

    /**
     * Identity settings
     *
     * OrganizationIdentitySettingsPage currently does not accept
     * an organizationId prop, so organizationId is intentionally
     * not passed here.
     */
    {
      path: "identity/settings",
      element: <OrganizationIdentitySettingsPage />,
    },
  ];
}

export default createOrganizationIdentityRoutes;