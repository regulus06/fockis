import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { travelPartnerAdminApi } from "../api/travelPartnerAdminApi";

interface AdminRouteGuardProps {
  children: ReactNode;
}

/**
 * Gate for the Travel admin section. Mirrors the top-level
 * features/admin/routes/AdminRouteGuard.tsx but is kept local so the Travel
 * admin module can be mounted independently (e.g. for a role that only
 * manages Travel and has no access to the rest of the admin app).
 */
export default function AdminRouteGuard({
  children,
}: AdminRouteGuardProps) {
  const location = useLocation();

  if (!travelPartnerAdminApi.hasAuthToken()) {
    return (
      <Navigate
        to={`/admin/sign-in?returnTo=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}
