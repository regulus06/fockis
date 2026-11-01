import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { PERMISSIONS, type PermissionValue } from "../permissions/permission.constants";
import { PermissionRouteGuard } from "../routes/PermissionRouteGuard";
import PolicyLibrary from "./components/PolicyLibrary";
import PolicyLayout from "./PolicyLayout";
import PolicyEditorPage from "./pages/PolicyEditorPage";
import PolicyOverviewPage, { PolicyStatsRow } from "./pages/PolicyOverviewPage";
import { AcceptancesPage, AuditPage, SettingsPage } from "./pages/RecordsPages";
import RulesPage from "./pages/RulesPage";
import { ApprovalsPage, VersionDetailPage, VersionsPage } from "./pages/VersionsApprovalsPages";

const P = PERMISSIONS;

function guard(anyOf: PermissionValue[], element: ReactNode) {
  return <PermissionRouteGuard requireAny={anyOf}>{element}</PermissionRouteGuard>;
}

/** Admin Center → Policy & Compliance (mounted at /admin/policy-compliance/*). The API enforces every permission. */
export default function PolicyComplianceRoutes() {
  return (
    <Routes>
      <Route element={<PolicyLayout />}>
        <Route index element={<PolicyOverviewPage />} />
        <Route
          path="policies"
          element={
            <>
              <PolicyStatsRow />
              <PolicyLibrary />
            </>
          }
        />
        <Route path="policies/new" element={guard([P.POLICY_EDIT], <PolicyEditorPage />)} />
        <Route path="policies/:policyId" element={<PolicyEditorPage />} />
        <Route path="rules" element={<RulesPage />} />
        <Route path="versions" element={<VersionsPage />} />
        <Route path="versions/:versionId" element={<VersionDetailPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="acceptances" element={guard([P.POLICY_ACCEPTANCE_VIEW], <AcceptancesPage />)} />
        <Route path="audit" element={guard([P.POLICY_AUDIT_VIEW], <AuditPage />)} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/admin/policy-compliance" replace />} />
      </Route>
    </Routes>
  );
}
