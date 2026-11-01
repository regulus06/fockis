import { Navigate, Route, Routes } from 'react-router-dom';

import { EmployerProtectedRoute } from '../components/EmployerProtectedRoute';
import { EmployerLayout } from '../components/EmployerLayout';
import * as Pages from '../pages';

export { EMPLOYER_ROUTE_BASE } from './employerRouteConfig';

/** Same token keys the careers apiClient sends as the Bearer token. */
function getIsAuthenticated(): boolean {
  return ['access_token', 'token', 'jwt', 'authToken', 'auth_token'].some((key) =>
    Boolean(localStorage.getItem(key)),
  );
}

/**
 * Mounted in App.tsx at /careers/employer/*.
 * Every page renders inside the shared EmployerLayout (sidebar + top bar).
 */
export function EmployerRoutes() {
  return (
    <EmployerProtectedRoute isAuthenticated={getIsAuthenticated()}>
      <Routes>
        <Route element={<EmployerLayout />}>
          <Route index element={<Pages.EmployerCenterPage />} />

          <Route path="jobs" element={<Pages.EmployerJobsPage />} />
          <Route path="jobs/new" element={<Pages.EmployerCreateJobPage />} />
          <Route path="jobs/:jobId" element={<Pages.EmployerJobDetailsPage />} />
          <Route path="jobs/:jobId/edit" element={<Pages.EmployerEditJobPage />} />

          <Route path="applicants" element={<Pages.EmployerApplicantsPage />} />
          <Route path="applications" element={<Navigate to="/careers/employer/applicants" replace />} />
          <Route path="applicants/:applicationId" element={<Pages.EmployerApplicantDetailsPage />} />
          <Route path="candidates" element={<Pages.EmployerCandidatesPage />} />
          <Route path="interviews" element={<Pages.EmployerInterviewsPage />} />

          <Route path="profile" element={<Pages.EmployerProfilePage />} />
          <Route path="verification" element={<Pages.EmployerVerificationPage />} />
          <Route path="team" element={<Pages.EmployerTeamPage />} />

          <Route path="analytics" element={<Pages.EmployerAnalyticsPage />} />
          <Route path="resources" element={<Pages.EmployerResourcesPage />} />
          <Route path="billing" element={<Pages.EmployerBillingPage />} />
          <Route path="settings" element={<Pages.EmployerSettingsPage />} />

          <Route path="*" element={<Pages.EmployerNotFoundPage />} />
        </Route>
      </Routes>
    </EmployerProtectedRoute>
  );
}

export default EmployerRoutes;
