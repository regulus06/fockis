import { Navigate, Route, Routes } from "react-router-dom";

import { PermissionRouteGuard } from "../routes/PermissionRouteGuard";
import { PERMISSIONS } from "../permissions/permission.constants";

import SecurityLayout from "./SecurityLayout";
import SecurityOverviewPage from "./pages/SecurityOverviewPage";
import AuthenticationPoliciesPage from "./pages/AuthenticationPoliciesPage";
import PolicySectionPage from "./pages/PolicySectionPage";
import OrganizationPoliciesPage from "./pages/OrganizationPoliciesPage";
import SecurityAuditPage from "./pages/SecurityAuditPage";
import { AccountRecoveryCard, LockedAccountsCard } from "./components/AccountCards";

const P = PERMISSIONS;

/**
 * Admin Center → Security & Identity (mounted at /admin/security/*).
 *
 * The backend enforces every permission; these guards only keep the UI in
 * step with what the administrator can open.
 */
export default function SecurityRoutes() {
  return (
    <Routes>
      <Route element={<SecurityLayout />}>
        <Route index element={<SecurityOverviewPage />} />
        <Route path="authentication" element={<AuthenticationPoliciesPage />} />
        <Route path="password" element={<PolicySectionPage key="password" section="password" />} />
        <Route
          path="login-protection"
          element={
            <PolicySectionPage key="login" section="login">
              <LockedAccountsCard />
            </PolicySectionPage>
          }
        />
        <Route path="sessions" element={<PolicySectionPage key="sessions" section="sessions" />} />
        <Route path="two-factor" element={<PolicySectionPage key="twoFactor" section="twoFactor" />} />
        <Route path="alerts" element={<PolicySectionPage key="alerts" section="alerts" />} />
        <Route
          path="account-protection"
          element={
            <PolicySectionPage key="protection" section="protection">
              <AccountRecoveryCard />
            </PolicySectionPage>
          }
        />
        <Route path="organizations" element={<OrganizationPoliciesPage />} />
        <Route
          path="audit"
          element={
            <PermissionRouteGuard requireAny={[P.SECURITY_AUDIT_VIEW, P.AUDIT_VIEW]}>
              <SecurityAuditPage />
            </PermissionRouteGuard>
          }
        />

        {/* Earlier placeholder routes */}
        <Route path="events" element={<Navigate to="/admin/security/audit" replace />} />
        <Route path="policies" element={<Navigate to="/admin/security/authentication" replace />} />
        <Route path="*" element={<Navigate to="/admin/security" replace />} />
      </Route>
    </Routes>
  );
}
