/* ============================================================
   FOCKIS CAREERS — JOB TYPES
   Normalized from the NestJS Job schema (apps/api/src/careers).
============================================================ */

export type JobKind = 'job' | 'internship' | 'coop';
export type Workplace = 'remote' | 'hybrid' | 'onsite';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary';
export type ExperienceLevel = 'entry' | 'mid' | 'senior';
export type SalaryPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'negotiable';
export type ApplicationDeliveryMode = 'easy-apply' | 'external';

export interface JobCompanySummary {
  /** Employer account id — also the company page id. */
  id: string;
  name: string;
  initials: string;
  logoUrl?: string;
  verified: boolean;
}

export interface Job {
  id: string;
  title: string;
  company: JobCompanySummary;
  companyDescription: string;
  companyWebsite: string;
  description: string;
  city: string;
  stateProvince: string;
  country: string;
  /** "Columbus, OH" style display location. */
  location: string;
  workplace: Workplace;
  kind: JobKind;
  employmentType?: EmploymentType;
  experienceLevel?: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  salaryPeriod?: SalaryPeriod;
  /** Free-text salary from older listings. */
  salaryText: string;
  skills: string[];
  benefits: string[];
  applicationDeadline?: string;
  postedAt: string;
  applyMode: ApplicationDeliveryMode;
  /** Employer's own application page when applyMode is 'external'. */
  applicationUrl?: string;
}

export type JobSort = 'recent' | 'salary' | 'relevance';
export type DatePosted = 'any' | '24h' | 'week' | 'month';

export interface JobQuery {
  keyword?: string;
  location?: string;
  kinds?: JobKind[];
  employmentTypes?: EmploymentType[];
  experience?: ExperienceLevel[];
  remoteOnly?: boolean;
  workplaces?: Workplace[];
  /** Minimum of the job's pay range, normalized to a yearly figure when possible. */
  salaryFloor?: number;
  datePosted?: DatePosted;
  sort?: JobSort;
  page?: number;
  pageSize?: number;
}

export interface JobFacetCounts {
  kinds: Record<JobKind, number>;
  employmentTypes: Record<EmploymentType, number>;
  experience: Record<ExperienceLevel, number>;
  remote: number;
}

export interface JobSearchResult {
  items: Job[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  facets: JobFacetCounts;
}
