/**
 * useSidebarViewer
 * Loads the signed-in person's access to one organization so
 * OrganizationSidebar shows the right links (My history for members,
 * Visit requests for admins). Visibility only — the server checks access.
 */

import { useEffect, useState } from "react";

import { getOrganizationAuthorization } from "../api/organizationsApi";
import type { ChurchSidebarViewer } from "../components/OrganizationSidebar";

export function useSidebarViewer(organizationId: string): ChurchSidebarViewer | undefined {
  const [viewer, setViewer] = useState<ChurchSidebarViewer | undefined>(undefined);

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    getOrganizationAuthorization(organizationId)
      .then((a) => {
        if (cancelled) return;
        const v = a.viewer ?? {};
        setViewer({
          isAuthenticated: v.isAuthenticated ?? a.isAuthenticated ?? true,
          isActiveMember: v.isActiveMember ?? a.isActiveMember ?? a.currentUserMembershipStatus === "active",
          isOwner: v.isOwner ?? a.isOwner ?? a.currentUserIsOwner ?? false,
          permissions: v.permissions ?? a.permissions ?? null,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return viewer;
}
