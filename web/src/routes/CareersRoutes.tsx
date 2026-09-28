import { Route } from "react-router-dom";
import { CareersLayout } from "../features/careers/components/CareersLayout";
import {
  CareersHomePage,
  JobSearchPage,
  InternshipsPage,
  CoopsPage,
  JobDetailsPage,
  ApplyPage,
  CareersDashboardPage,
  EmployerDashboardPage,
  CompanyProfilePage,
  CareerResourcesPage,
} from "../features/careers/pages";

export function CareersRoutes() {
  return (
    <Route element={<CareersLayout />}>
      <Route path="/careers" element={<CareersHomePage />} />
      <Route path="/careers/search" element={<JobSearchPage />} />
      <Route path="/careers/internships" element={<InternshipsPage />} />
      <Route path="/careers/co-ops" element={<CoopsPage />} />
      <Route path="/careers/jobs/:jobId" element={<JobDetailsPage />} />
      <Route path="/careers/jobs/:jobId/apply" element={<ApplyPage />} />
      <Route path="/careers/dashboard" element={<CareersDashboardPage />} />
      <Route path="/careers/employer" element={<EmployerDashboardPage />} />
      <Route path="/careers/companies/:companyId" element={<CompanyProfilePage />} />
      <Route path="/careers/resources" element={<CareerResourcesPage />} />
    </Route>
  );
}