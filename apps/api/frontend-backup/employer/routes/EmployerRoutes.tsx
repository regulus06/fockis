import { Route, Routes } from 'react-router-dom';
import { EmployerProtectedRoute } from '../components/EmployerProtectedRoute';
import * as Pages from '../pages';

export function EmployerRoutes() {
  return (
    <EmployerProtectedRoute>
      <Routes>
        <Route index element={<Pages.EmployerCenterPage />} />
        <Route path="profile" element={<Pages.EmployerProfilePage />} />
        <Route path="verification" element={<Pages.EmployerVerificationPage />} />
        <Route path="jobs" element={<Pages.EmployerJobsPage />} />
        <Route path="jobs/new" element={<Pages.EmployerCreateJobPage />} />
        <Route path="jobs/:jobId" element={<Pages.EmployerJobDetailsPage />} />
        <Route path="jobs/:jobId/edit" element={<Pages.EmployerEditJobPage />} />
        <Route path="applicants" element={<Pages.EmployerApplicantsPage />} />
        <Route path="applicants/:applicationId" element={<Pages.EmployerApplicantDetailsPage />} />
        <Route path="interviews" element={<Pages.EmployerInterviewsPage />} />
        <Route path="team" element={<Pages.EmployerTeamPage />} />
        <Route path="analytics" element={<Pages.EmployerAnalyticsPage />} />
        <Route path="billing" element={<Pages.EmployerBillingPage />} />
        <Route path="settings" element={<Pages.EmployerSettingsPage />} />
        <Route path="*" element={<Pages.EmployerNotFoundPage />} />
      </Routes>
    </EmployerProtectedRoute>
  );
}
