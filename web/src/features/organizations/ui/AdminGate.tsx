/**
 * AdminGate — wraps an administration screen in the admin shell and shows
 * the loading, signed-out and not-allowed states.
 */

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import type { OrgAdminState } from "../hooks/useOrgAdmin";
import OrgAppShell from "./OrgAppShell";
import { EmptyState, LoadingCards, Skeleton } from "./orgUi";

export default function AdminGate({
  state,
  organizationId,
  returnTo,
  children,
}: {
  state: OrgAdminState;
  organizationId: string;
  returnTo: string;
  children: () => ReactNode;
}): React.JSX.Element {
  const { allowed, signedOut, org, error, shellOrg, shellViewer, reload } = state;

  if (allowed === null) {
    return (
      <OrgAppShell variant="admin" organization={shellOrg}>
        <Skeleton height={34} width={280} style={{ marginBottom: 20 }} />
        <LoadingCards count={4} />
        <Skeleton height={300} />
      </OrgAppShell>
    );
  }

  if (!allowed) {
    return (
      <OrgAppShell variant={signedOut ? "platform" : "member"} organization={signedOut ? null : shellOrg} viewer={shellViewer}>
        <div className="fo-card">
          <EmptyState
            icon={ShieldAlert}
            title={signedOut ? "Sign in to manage this organization" : "Only administrators can open this page"}
            text={
              signedOut
                ? "Your session has ended."
                : (error ?? `You need to be the owner or an administrator of ${org?.name ?? "this organization"}.`)
            }
          >
            {signedOut ? (
              <Link to={"/login?returnTo=" + encodeURIComponent(returnTo)} className="fo-btn fo-btn--primary">
                Sign in
              </Link>
            ) : (
              <button type="button" className="fo-btn fo-btn--secondary" onClick={reload}>
                Check again
              </button>
            )}
            <Link to={`/organizations/${encodeURIComponent(organizationId)}`} className="fo-btn fo-btn--secondary">
              Back to the organization
            </Link>
          </EmptyState>
        </div>
      </OrgAppShell>
    );
  }

  return (
    <OrgAppShell variant="admin" organization={shellOrg} viewer={shellViewer}>
      {children()}
    </OrgAppShell>
  );
}
