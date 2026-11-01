/* ============================================================
   EMPLOYER CENTER — ACCOUNT, CONTEXT, DASHBOARD
   Mirrors apps/api/src/careers/services/employer.service.ts
============================================================ */

import type { EmployerCompany } from './EmployerProfile';
import type { EmployerJob } from './EmployerJob';

export type EmployerRole = 'owner' | 'admin' | 'recruiter' | 'hiring_manager';

export type EmployerCapability =
  | 'read'
  | 'manageApplicants'
  | 'manageJobs'
  | 'manageCompany'
  | 'manageTeam'
  | 'manageBilling';

export interface EmployerInvitation {
  companyId: string;
  companyName: string;
  logoUrl: string | null;
  role: EmployerRole;
  invitedAt: string | null;
}

export interface EmployerMe {
  user: { id: string; email: string | null; username: string | null };
  role: EmployerRole;
  capabilities: EmployerCapability[];
  isOwner: boolean;
  company: EmployerCompany | null;
  pendingInvitations: EmployerInvitation[];
  unreviewedApplications: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface EmployerActivity {
  id: string;
  type: 'application' | 'status' | 'interview' | string;
  message: string;
  at: string;
  link: string;
}

export interface EmployerDashboard {
  rangeDays: number;
  stats: {
    activeJobs: number;
    totalJobs: number;
    pendingApprovalJobs: number;
    newJobsThisWeek: number;
    applications: number;
    newApplicationsThisWeek: number;
    qualified: number;
    newQualifiedThisWeek: number;
    jobViews: number;
    upcomingInterviews: number;
  };
  applicationTrend: DailyCount[];
  applicationsByType: { type: string; label: string; count: number }[];
  recentJobs: EmployerJob[];
  recentActivity: EmployerActivity[];
}
