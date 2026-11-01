import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { PERMISSIONS, type PermissionValue } from "../permissions/permission.constants";
import { PermissionRouteGuard } from "../routes/PermissionRouteGuard";
import LegalLayout from "./layout/LegalLayout";
import LegalOverviewPage from "./pages/LegalOverviewPage";
import { EvidenceArchivePage, EvidenceRecordPage } from "./pages/EvidencePages";
import { HoldDetailPage, HoldsPage, NewHoldPage } from "./pages/HoldsPages";
import { NewRequestPage, RequestDetailPage, RequestsPage } from "./pages/RequestsPages";
import { AuditPage, DeletionsPage, ExportsPage, RetentionPage } from "./pages/LegalListsPages";

const P = PERMISSIONS;

function guard(anyOf: PermissionValue[], element: ReactNode) {
  return <PermissionRouteGuard requireAny={anyOf}>{element}</PermissionRouteGuard>;
}

/** Admin Center → Legal & Evidence (mounted at /admin/legal/*). The API enforces every permission. */
export default function LegalRoutes() {
  return (
    <Routes>
      <Route element={<LegalLayout />}>
        <Route index element={<LegalOverviewPage />} />
        <Route path="evidence" element={<EvidenceArchivePage />} />
        <Route path="evidence/:recordId" element={guard([P.LEGAL_EVIDENCE_VIEW], <EvidenceRecordPage />)} />
        <Route path="deletions" element={guard([P.LEGAL_DELETIONS_VIEW], <DeletionsPage />)} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="requests/new" element={guard([P.LEGAL_REQUESTS_MANAGE], <NewRequestPage />)} />
        <Route path="requests/:requestId" element={<RequestDetailPage />} />
        <Route path="holds" element={<HoldsPage />} />
        <Route path="holds/new" element={guard([P.LEGAL_HOLDS_MANAGE], <NewHoldPage />)} />
        <Route path="holds/:holdId" element={<HoldDetailPage />} />
        <Route path="exports" element={<ExportsPage />} />
        <Route path="audit" element={guard([P.LEGAL_AUDIT_VIEW], <AuditPage />)} />
        <Route path="retention" element={<RetentionPage />} />
        <Route path="*" element={<Navigate to="/admin/legal" replace />} />
      </Route>
    </Routes>
  );
}
