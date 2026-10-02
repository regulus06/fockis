export type JobType =
  | 'full-time'
  | 'part-time'
  | 'internship'
  | 'co-op'
  | 'contract'
  | 'temporary';

export type WorkArrangement = 'remote' | 'hybrid' | 'on-site';

export type ExperienceLevel = 'student' | 'entry' | 'mid' | 'senior';

export type ApplicationDeliveryMode = 'easy-apply' | 'external';

export interface JobSkill {
  id: string;
  label: string;
}

export interface JobCompanySummary {
  id: string;
  name: string;
  initials: string;
  logoUrl?: string;
  verified: boolean;
  industry?: string;
}

export interface Job {
  id: string;
  title: string;
  company: JobCompanySummary;
  location: string;
  arrangement: WorkArrangement;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  salaryUnit: 'hr' | 'yr';
  isPaid: boolean;
  term?: string;
  durationWeeks?: number;
  academicCredit?: boolean;
  description: string;
  responsibilities: string[];
  qualifications: string[];
  preferredQualifications?: string;
  benefits?: string;
  skills: JobSkill[];
  applicationDeadline?: string;
  postedAt: string;
  applyMode: ApplicationDeliveryMode;
  industry: string;
}

export interface JobFilters {
  keyword?: string;
  location?: string;
  jobTypes: JobType[];
  arrangements: WorkArrangement[];
  experienceLevels: ExperienceLevel[];
  industries: string[];
  minSalary?: number;
  datePosted?: '24h' | 'week' | 'month' | 'any';
  benefits?: string[];
  sort: 'recommended' | 'recent' | 'salary';
  page: number;
  pageSize: number;
}

export interface JobSearchResult {
  items: Job[];
  total: number;
  page: number;
  pageSize: number;
}
