/**
 * OrganizationIdentityLauncherPage.tsx
 * -----------------------------------------------------------------------------
 * /organization-identity — opens Organization Identity (Fockis domains and
 * managed member accounts) for one of your organizations.
 *
 *   - one organization: goes straight to /organizations/:id/identity
 *   - several: lets you choose
 *   - none: offers to find or create an organization
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { listOrganizations } from "../../organizations/api/organizationsApi";
import { ChurchAuthError } from "../../organizations/api/organizationApi";
import type { OrganizationSummary } from "../../organizations/types/organization.types";
import { CATEGORY_ICONS, getCategoryForOrganizationType, typeLabel } from "../../organizations/ui/orgCategories";
import { Empty, ErrorNote, Loading, OrgLogo, OrgShell, PageHead, errorText } from "../../organizations/ui/OrgShell";

const identityPath = (id: string) => `/organizations/${encodeURIComponent(id)}/identity`;

export default function OrganizationIdentityLauncherPage(): React.JSX.Element {
  const [orgs, setOrgs] = useState<OrganizationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    listOrganizations({ mine: true, page: 1, pageSize: 50 }, controller.signal)
      .then((res) => !controller.signal.aborted && setOrgs((res?.items ?? []).filter((o) => o?.id)))
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ChurchAuthError) setSignedOut(true);
        else setError(errorText(err, "Your organizations could not be loaded."));
        setOrgs([]);
      });
    return () => controller.abort();
  }, []);

  if (orgs && orgs.length === 1 && !error) return <Navigate to={identityPath(orgs[0].id)} replace />;

  return (
    <OrgShell narrow>
      <PageHead
        eyebrow="Organization Identity"
        title="Fockis domains & member accounts"
        subtitle="Give your organization its own Fockis address and create accounts for your members."
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      {orgs === null ? (
        <Loading rows={2} />
      ) : signedOut ? (
        <Empty title="Sign in to manage your organization's identity">
          <Link to={"/login?returnTo=" + encodeURIComponent("/organization-identity")} className="fko-btn fko-btn--primary">
            Sign in
          </Link>
        </Empty>
      ) : orgs.length === 0 ? (
        <Empty
          title="You don't have an organization yet"
          text="Organization Identity is for organizations you own or manage. Create your organization first, or ask to join one."
        >
          <Link to="/organizations/new" className="fko-btn fko-btn--primary">
            Create an organization
          </Link>
          <Link to="/organizations" className="fko-btn fko-btn--secondary">
            Find organizations
          </Link>
        </Empty>
      ) : (
        <section className="fko-card">
          <h2 className="fko-subtitle">Choose an organization</h2>
          <ul className="fko-rows">
            {orgs.map((o) => (
              <li key={o.id}>
                <Link to={identityPath(o.id)} className="fko-identity-row">
                  {o.logoUrl ? (
                    <OrgLogo name={o.name} url={o.logoUrl} />
                  ) : (
                    <span className="fko-orgcard__logo" aria-hidden="true">
                      {CATEGORY_ICONS[getCategoryForOrganizationType(o.organizationType)]}
                    </span>
                  )}
                  <span>
                    <strong>{o.name}</strong>
                    <br />
                    <span className="fko-hint">{o.domain || typeLabel(o.organizationType)}</span>
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </OrgShell>
  );
}
