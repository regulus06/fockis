/**
 * RequireOrgAdmin.tsx
 * -----------------------------------------------------------------------------
 * Route guard for every organization administration page
 * (/organizations/:organizationId/admin/…, the legacy /church/… admin paths
 * and the profile editor).
 *
 * Only the owner and active administrators get through. Everyone else — members
 * included — sees a "Only administrators can open this page" screen with a link
 * to their member portal, and the admin page is never rendered.
 *
 * This is the website side. The server checks the same thing on every request,
 * so nothing changes even if someone calls the API directly.
 * -----------------------------------------------------------------------------
 */

import type { ReactNode } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { LogIn, ShieldAlert } from "lucide-react";

import { useOrgAdmin } from "../hooks/useOrgAdmin";
import OrgAppShell from "./OrgAppShell";
import { EmptyState, Skeleton } from "./orgUi";

export default function RequireOrgAdmin({ children }: { children: ReactNode }): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const { pathname, search } = useLocation();
  const state = useOrgAdmin(organizationId);

  if (!organizationId) return <Navigate to="/organization/me" replace />;

  if (state.allowed === null) {
    return (
      <OrgAppShell variant="member" organization={state.shellOrg}>
        <Skeleton height={36} width={280} style={{ marginBottom: 20 }} />
        <Skeleton height={320} />
      </OrgAppShell>
    );
  }

  if (!state.allowed) {
    const portal = `/organization/me?organizationId=${encodeURIComponent(organizationId)}`;
    return (
      <OrgAppShell
        variant={state.signedOut ? "platform" : "member"}
        organization={state.signedOut ? null : state.shellOrg}
        viewer={state.me ? { name: state.me.profile?.displayName, avatarUrl: state.me.profile?.avatarUrl, memberId: state.me.id } : undefined}
      >
        <div className="fo-card">
          <EmptyState
            icon={state.signedOut ? LogIn : ShieldAlert}
            title={state.signedOut ? "Sign in to continue" : "Only administrators can open this page"}
            text={
              state.signedOut
                ? "Your session has ended."
                : `This part of ${state.org?.name ?? "the organization"} is managed by its owner and administrators. Your own information is in your member portal.`
            }
          >
            {state.signedOut ? (
              <Link to={"/login?returnTo=" + encodeURIComponent(pathname + search)} className="fo-btn fo-btn--primary">
                Sign in
              </Link>
            ) : (
              <Link to={portal} className="fo-btn fo-btn--primary">
                Go to my member portal
              </Link>
            )}
            <Link to={`/organizations/${encodeURIComponent(organizationId)}`} className="fo-btn fo-btn--secondary">
              View public page
            </Link>
          </EmptyState>
        </div>
      </OrgAppShell>
    );
  }

  return <>{children}</>;
}

/**
 * Old /church/admin/<section> links had no organization in the address.
 * Send them to the right admin page when ?organizationId= is given, or to the
 * member portal otherwise (which shows admin links only to administrators).
 */
export function LegacyAdminRedirect({ section = "" }: { section?: string }): React.JSX.Element {
  const { search } = useLocation();
  const id = new URLSearchParams(search).get("organizationId");
  if (id) return <Navigate to={`/organizations/${encodeURIComponent(id)}/admin${section ? `/${section}` : ""}`} replace />;
  return <Navigate to="/organization/me" replace />;
}
