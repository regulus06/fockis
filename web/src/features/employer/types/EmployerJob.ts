export type EmployerJobType = 'job' | 'internship' | 'coop';
export type EmployerWorkplaceType = 'remote' | 'hybrid' | 'onsite';
export type EmployerJobStatus = 'active' | 'pending_approval' | 'paused' | 'expired';
export type ApplicationMethod = 'fockis' | 'external';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary';
export type ExperienceLevel = 'entry' | 'mid' | 'senior';
export type SalaryPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'negotiable';

export interface EmployerJob {
  id: string;
  title: string;
  company: string;
  companyDescription: string;
  companyWebsite: string;
  type: EmployerJobType;
  workplaceType: EmployerWorkplaceType;
  employmentType?: EmploymentType | null;
  experienceLevel?: ExperienceLevel | null;
  country: string;
  city: string;
  stateProvince: string;
  location: string;
  description: string;
  salary: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  salaryPeriod: SalaryPeriod | '';
  skills: string[];
  benefits: string[];
  applicationDeadline: string | null;
  applicationMethod: ApplicationMethod;
  applicationUrl: string | null;
  isActive: boolean;
  isApproved: boolean;
  status: EmployerJobStatus;
  viewCount: number;
  applicationsCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface EmployerJobDetail extends EmployerJob {
  pipeline: Record<string, number>;
}

export interface EmployerJobList {
  items: EmployerJob[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  statusCounts: Partial<Record<EmployerJobStatus, number>>;
}

/** Body accepted by POST /careers and PATCH /careers/:id (CreateJobDto). */
export interface JobPayload {
  title: string;
  company: string;
  companyDescription?: string;
  companyWebsite?: string;
  country: string;
  city: string;
  stateProvince?: string;
  location?: string;
  type: EmployerJobType;
  workplaceType: EmployerWorkplaceType;
  employmentType?: EmploymentType;
  experienceLevel?: ExperienceLevel;
  description: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  salaryPeriod?: SalaryPeriod;
  remote?: boolean;
  applicationDeadline?: string;
  skills?: string[];
  benefits?: string[];
  applicationMethod: ApplicationMethod;
  applicationUrl?: string;
}
