/**
 * OrgPublicRoutes.tsx — opening an organization's public page by name.
 *
 *   /o/:handle                 → the organization's page (address bar keeps the name)
 *   /o/<old name>              → replaced by /o/<current name>
 *   /organizations/:id         → replaced by /o/<name> (old links keep working)
 *   <prefix>.fockis.com/       → the organization's page on its own address
 *
 * The existing page component is reused: it receives the organization's ID,
 * and every link inside it keeps using /organizations/:id/... paths.
 */

import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";

import OrganizationPage from "../pages/OrganizationPage";
import { isOrganizationHost, publicLinksApi, publicPath, type ResolvedOrganization } from "./publicLinks";

/** Renders the organization page for an ID while the address bar shows something else. */
export function OrganizationPageAt({ organizationId }: { organizationId: string }) {
  return <OrganizationPage key={organizationId} organizationId={organizationId} />;
}

function Loading() {
  return <div style={{ minHeight: "60vh" }} aria-busy="true" />;
}

/** /o/:handle */
export function OrgHandleRoute() {
  const { handle = "" } = useParams<{ handle: string }>();
  const location = useLocation();
  const [state, setState] = useState<{ for: string; result: ResolvedOrganization | null; failed: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    publicLinksApi
      .resolve(handle)
      .then((result) => alive && setState({ for: handle, result, failed: false }))
      .catch(() => alive && setState({ for: handle, result: null, failed: true }));
    return () => {
      alive = false;
    };
  }, [handle]);

  if (!state || state.for !== handle) return <Loading />;
  if (state.failed || !state.result) return <Navigate to="/organizations" replace />;
  if (state.result.handle !== handle.toLowerCase()) {
    return <Navigate to={`${publicPath(state.result.handle)}${location.search}${location.hash}`} replace />;
  }
  return <OrganizationPageAt organizationId={state.result.organizationId} />;
}

/** /organizations/:organizationId → /o/<name>; shows the page by ID if the name can't be found. */
export function OrganizationIdRoute() {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const location = useLocation();
  const [state, setState] = useState<{ for: string; handle: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    publicLinksApi
      .resolve(organizationId)
      .then((r) => alive && setState({ for: organizationId, handle: r.handle }))
      .catch(() => alive && setState({ for: organizationId, handle: null }));
    return () => {
      alive = false;
    };
  }, [organizationId]);

  if (!state || state.for !== organizationId) return <Loading />;
  if (state.handle) return <Navigate to={`${publicPath(state.handle)}${location.search}${location.hash}`} replace />;
  return <OrganizationPage />;
}

/**
 * An organization's own Fockis address. "/" shows its page; every other path,
 * or an address that doesn't belong to an organization, shows `fallback`.
 */
export function OrganizationHostRoute({ fallback }: { fallback: ReactNode }) {
  const [state, setState] = useState<{ result: ResolvedOrganization | null } | null>(null);

  useEffect(() => {
    let alive = true;
    publicLinksApi
      .byHost(window.location.hostname)
      .then((result) => alive && setState({ result }))
      .catch(() => alive && setState({ result: null }));
    return () => {
      alive = false;
    };
  }, []);

  if (!state) return <Loading />;
  if (!state.result) return <>{fallback}</>;
  return <OrganizationHostPage organizationId={state.result.organizationId} fallback={fallback} />;
}

function OrganizationHostPage({ organizationId, fallback }: { organizationId: string; fallback: ReactNode }) {
  const location = useLocation();
  if (location.pathname === "/" || location.pathname === "") return <OrganizationPageAt organizationId={organizationId} />;
  return <>{fallback}</>;
}

export { isOrganizationHost };
