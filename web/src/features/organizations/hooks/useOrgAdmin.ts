/**
 * useOrgAdmin
 * Loads an organization plus the signed-in person's membership and decides
 * whether the administration screens should open. Visibility only: every
 * admin endpoint checks access again on the server.
 */

import { useCallback, useEffect, useState } from "react";

import { getOrganization } from "../api/organizationsApi";
import { membersApi, type MyMembershipResponse } from "../api/membersApi";
import { ChurchAuthError } from "../api/organizationApi";
import { MEMBER_ROLE_LABELS, MembershipStatus, type Organization } from "../types/organization.types";
import { errorMessage } from "../ui/orgUi";
import type { ShellOrganization, ShellViewer } from "../ui/OrgAppShell";

// Same rule as the server (ADMIN_MEMBER_ROLES): leaders and members are not administrators.
const ADMIN_ROLES = new Set(["owner", "administrator", "pastor_director"]);

export interface OrgAdminState {
  org: Organization | null;
  me: MyMembershipResponse | null;
  allowed: boolean | null;
  signedOut: boolean;
  error: string | null;
  /** Server permission keys granted to this administrator (owner: all). */
  can: (permission: string) => boolean;
  shellOrg: ShellOrganization | null;
  shellViewer: ShellViewer | undefined;
  reload: () => void;
}

export function useOrgAdmin(organizationId: string): OrgAdminState {
  const [org, setOrg] = useState<Organization | null>(null);
  const [me, setMe] = useState<MyMembershipResponse | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setAllowed(null);
    setError(null);
    setSignedOut(false);
    Promise.all([getOrganization(organizationId, controller.signal), membersApi.getMyMembership(organizationId, controller.signal)])
      .then(([o, m]) => {
        if (controller.signal.aborted) return;
        setOrg(o);
        setMe(m ?? null);
        const active = String(m?.status ?? "").toLowerCase() === MembershipStatus.Active;
        setAllowed(Boolean(m && (m.isOwner || (active && (m.isAdmin || ADMIN_ROLES.has(String(m.role).toLowerCase()))))));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ChurchAuthError) setSignedOut(true);
        setError(errorMessage(err, "This organization could not be loaded."));
        setAllowed(false);
      });
    return () => controller.abort();
  }, [organizationId, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const can = useCallback(
    (permission: string) => Boolean(me?.isOwner || (Array.isArray(me?.permissions) && me.permissions.includes(permission))),
    [me],
  );

  const shellOrg: ShellOrganization | null = org
    ? { id: org.id, name: org.name, organizationType: org.organizationType, logoUrl: org.logoUrl }
    : organizationId
      ? { id: organizationId, name: "Loading…" }
      : null;

  const roleLabel = me?.isOwner ? "Owner" : me?.role ? (MEMBER_ROLE_LABELS[me.role] ?? "Admin") : "Admin";
  const shellViewer: ShellViewer | undefined = me
    ? { name: me.profile?.displayName, avatarUrl: me.profile?.avatarUrl, memberId: me.id, isAdmin: true, roleLabel }
    : undefined;

  return { org, me, allowed, signedOut, error, can, shellOrg, shellViewer, reload };
}
