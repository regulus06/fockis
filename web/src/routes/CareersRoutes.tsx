import { Navigate, Route, useLocation } from "react-router-dom";

import { CareersLayout } from "../features/careers/components/CareersLayout";
import { CareersSeekerLayout } from "../features/careers/components/CareersSeekerLayout";

import {
  CareersHomePage,
  JobSearchPage,
  InternshipsPage,
  CoopsPage,
  JobDetailsPage,
  ApplyPage,
  CompaniesPage,
  CompanyProfilePage,
  CareersDashboardPage,
  MyApplicationsPage,
  SavedJobsPage,
  CareerProfilePage,
  JobAlertsPage,
  CareerResourcesPage,
} from "../features/careers/pages";

/** Old search URL → the new job listing, keeping the query string. */
function SearchRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/careers/jobs${search}`} replace />;
}

/**
 * Fockis Careers (job seeker side). The Employer Center lives at
 * /careers/employer/* and is registered separately in App.tsx.
 */
export function CareersRoutes() {
  return (
    <>
      {/* Public: top navigation */}
      <Route element={<CareersLayout />}>
        <Route path="/careers" element={<CareersHomePage />} />
        <Route path="/careers/jobs" element={<JobSearchPage />} />
        <Route path="/careers/search" element={<SearchRedirect />} />
        <Route path="/careers/internships" element={<InternshipsPage />} />
        <Route path="/careers/co-ops" element={<CoopsPage />} />
        <Route path="/careers/jobs/:jobId" element={<JobDetailsPage />} />
        <Route path="/careers/jobs/:jobId/apply" element={<ApplyPage />} />
        <Route path="/careers/companies" element={<CompaniesPage />} />
        <Route path="/careers/companies/:companyId" element={<CompanyProfilePage />} />
      </Route>

      {/* Signed-in job seeker workspace: sidebar navigation */}
      <Route element={<CareersSeekerLayout />}>
        <Route path="/careers/dashboard" element={<CareersDashboardPage />} />
        <Route path="/careers/applications" element={<MyApplicationsPage />} />
        <Route path="/careers/saved-jobs" element={<SavedJobsPage />} />
        <Route path="/careers/profile" element={<CareerProfilePage />} />
        <Route path="/careers/resume" element={<CareerProfilePage focus="resume" />} />
        <Route path="/careers/alerts" element={<JobAlertsPage />} />
        <Route path="/careers/resources" element={<CareerResourcesPage />} />
      </Route>
    </>
  );
}

export default CareersRoutes;
