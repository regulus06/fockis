import type { DailyCount } from './Employer';
import type { ApplicationMethod, EmployerJobStatus, EmployerJobType } from './EmployerJob';

export interface EmployerJobPerformance {
  jobId: string;
  title: string;
  type: EmployerJobType;
  status: EmployerJobStatus;
  applicationMethod: ApplicationMethod;
  views: number;
  applications: number;
  qualified: number;
  conversionRate: number | null;
}

export interface EmployerAnalytics {
  range: { from: string; to: string };
  totals: {
    jobViews: number;
    jobViewsScope: 'lifetime';
    applications: number;
    qualified: number;
    conversionRate: number | null;
    conversionScope: 'lifetime';
  };
  applicationsOverTime: DailyCount[];
  jobPerformance: EmployerJobPerformance[];
  topJobs: EmployerJobPerformance[];
  funnel: { stage: string; label: string; count: number }[];
  sources: {
    fockisApplications: number;
    externalListings: number;
    externalViews: number;
  };
}
