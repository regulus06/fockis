import type {
  ApplicationStatus,
  EmployerJobStatus,
  EmployerJobType,
  EmployerWorkplaceType,
  EmploymentType,
  ExperienceLevel,
  InterviewType,
  SalaryPeriod,
} from '../types';

export const EMPLOYER_BASE_PATH = '/careers/employer';
export const EMPLOYER_JOB_TYPES = ['job', 'internship', 'coop'] as const;
export const EMPLOYER_WORKPLACE_TYPES = ['remote', 'hybrid', 'onsite'] as const;

export const JOB_TYPE_LABELS: Record<EmployerJobType, string> = {
  job: 'Job',
  internship: 'Internship',
  coop: 'Co-op',
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  temporary: 'Temporary',
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  entry: 'Entry level',
  mid: 'Mid level',
  senior: 'Senior level',
};

export const WORKPLACE_LABELS: Record<EmployerWorkplaceType, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
};

export const JOB_STATUS_LABELS: Record<EmployerJobStatus, string> = {
  active: 'Active',
  pending_approval: 'Pending approval',
  paused: 'Paused',
  expired: 'Expired',
};

/** "offer" is shown as Hired — the backend has no separate hired state. */
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'New',
  viewed: 'Reviewed',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offer: 'Hired',
  rejected: 'Rejected',
};

export const SALARY_PERIOD_LABELS: Record<SalaryPeriod, string> = {
  hourly: 'per hour',
  daily: 'per day',
  weekly: 'per week',
  monthly: 'per month',
  yearly: 'per year',
  negotiable: 'Negotiable',
};

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  video: 'Video call',
  phone: 'Phone call',
  onsite: 'On-site',
};

export const CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP', 'HTG', 'MXN', 'BRL', 'AUD', 'JPY', 'INR'];

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];

export const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Education',
  'Finance',
  'Retail',
  'Manufacturing',
  'Hospitality',
  'Construction',
  'Media & Entertainment',
  'Non-profit',
  'Government',
  'Transportation & Logistics',
  'Energy',
  'Other',
];

export const COUNTRIES = [
  'United States',
  'Canada',
  'Haiti',
  'Mexico',
  'Dominican Republic',
  'United Kingdom',
  'France',
  'Germany',
  'Spain',
  'Brazil',
  'India',
  'Nigeria',
  'Australia',
  'Japan',
];

export function timezoneOptions(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  try {
    const zones = intl.supportedValuesOf?.('timeZone');
    if (zones?.length) return zones;
  } catch {
    /* older browsers */
  }
  return ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Port-au-Prince', 'Europe/London', 'Europe/Paris'];
}

export const browserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};
