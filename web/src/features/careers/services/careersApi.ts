import { apiClient } from './apiClient';

import type {
  EmploymentType,
  ExperienceLevel,
  Job,
  JobFacetCounts,
  JobKind,
  JobQuery,
  JobSearchResult,
  SalaryPeriod,
  Workplace,
} from '../types';

/* ============================================================
   BACKEND SHAPE (apps/api/src/careers/schemas/job.schema.ts)
============================================================ */

export interface BackendJob {
  _id?: string;
  id?: string;
  title?: string;
  employerId?: string;
  company?: string;
  companyDescription?: string;
  companyWebsite?: string;
  country?: string;
  city?: string;
  stateProvince?: string;
  type?: string;
  workplaceType?: string;
  employmentType?: string;
  experienceLevel?: string;
  description?: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  salaryPeriod?: string;
  applicationDeadline?: string | Date;
  skills?: string[];
  benefits?: string[];
  applicationMethod?: string;
  applicationUrl?: string;
  createdAt?: string | Date;
}

/* ============================================================
   NORMALIZATION
============================================================ */

const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'CO';
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  const v = str(value).toLowerCase();
  return (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

function legacySalary(text: string): { min?: number; max?: number } {
  const numbers = (text.match(/[\d,]+(?:\.\d+)?/g) ?? [])
    .map((n) => Number(n.replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);
  return { min: numbers[0], max: numbers[1] };
}

export function normalizeJob(raw: BackendJob, logos?: Map<string, string | null>): Job {
  const id = String(raw._id ?? raw.id ?? '');
  const companyName = str(raw.company) || 'Company';
  const companyId = String(raw.employerId ?? '');
  const city = str(raw.city);
  const stateProvince = str(raw.stateProvince);
  const country = str(raw.country);
  const salaryText = str(raw.salary);
  const legacy = legacySalary(salaryText);
  const url = str(raw.applicationUrl);

  return {
    id,
    title: str(raw.title),
    company: {
      id: companyId,
      name: companyName,
      initials: initialsOf(companyName),
      logoUrl: logos?.get(companyId) ?? undefined,
      verified: false,
    },
    companyDescription: str(raw.companyDescription),
    companyWebsite: str(raw.companyWebsite),
    description: str(raw.description),
    city,
    stateProvince,
    country,
    location: [city, stateProvince].filter(Boolean).join(', ') || country,
    workplace: oneOf<Workplace>(raw.workplaceType, ['remote', 'hybrid', 'onsite']) ?? 'onsite',
    kind: oneOf<JobKind>(raw.type, ['job', 'internship', 'coop']) ?? 'job',
    employmentType: oneOf<EmploymentType>(raw.employmentType, ['full_time', 'part_time', 'contract', 'temporary']),
    experienceLevel: oneOf<ExperienceLevel>(raw.experienceLevel, ['entry', 'mid', 'senior']),
    salaryMin: typeof raw.salaryMin === 'number' ? raw.salaryMin : legacy.min,
    salaryMax: typeof raw.salaryMax === 'number' ? raw.salaryMax : legacy.max,
    currency: str(raw.currency) || 'USD',
    salaryPeriod: oneOf<SalaryPeriod>(raw.salaryPeriod, ['hourly', 'daily', 'weekly', 'monthly', 'yearly', 'negotiable']),
    salaryText,
    skills: Array.isArray(raw.skills) ? raw.skills.filter(Boolean) : [],
    benefits: Array.isArray(raw.benefits) ? raw.benefits.filter(Boolean) : [],
    applicationDeadline: raw.applicationDeadline ? new Date(raw.applicationDeadline).toISOString() : undefined,
    postedAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : '',
    applyMode: raw.applicationMethod === 'external' && url ? 'external' : 'easy-apply',
    applicationUrl: raw.applicationMethod === 'external' && url ? url : undefined,
  };
}

/* ============================================================
   CACHED JOB LIST
   GET /careers returns every active, approved job. Filtering,
   facet counts and pagination run in the browser.
============================================================ */

let cache: { at: number; jobs: Job[] } | null = null;
let inflight: Promise<Job[]> | null = null;
const CACHE_MS = 60_000;

async function companyLogos(): Promise<Map<string, string | null>> {
  try {
    const companies = await apiClient.get<{ id: string; logoUrl: string | null }[]>('/careers/companies');
    return new Map(companies.map((c) => [c.id, c.logoUrl]));
  } catch {
    return new Map();
  }
}

export async function fetchAllJobs(force = false): Promise<Job[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.jobs;
  if (inflight) return inflight;
  inflight = (async () => {
    const [raw, logos] = await Promise.all([apiClient.get<BackendJob[]>('/careers'), companyLogos()]);
    if (!Array.isArray(raw)) throw new Error('The Careers API returned an unexpected response.');
    const jobs = raw.filter((job) => job?._id ?? job?.id).map((job) => normalizeJob(job, logos));
    cache = { at: Date.now(), jobs };
    return jobs;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/* ============================================================
   SEARCH
============================================================ */

const PERIOD_TO_YEAR: Record<SalaryPeriod, number> = {
  hourly: 2080,
  daily: 260,
  weekly: 52,
  monthly: 12,
  yearly: 1,
  negotiable: 1,
};

/** Yearly figure for comparing pay across periods. */
export function annualPay(job: Job, which: 'min' | 'max' = 'min'): number | null {
  const value = which === 'min' ? job.salaryMin ?? job.salaryMax : job.salaryMax ?? job.salaryMin;
  if (value === undefined) return null;
  return value * PERIOD_TO_YEAR[job.salaryPeriod ?? 'yearly'];
}

function matchesText(job: Job, keyword: string) {
  const text = `${job.title} ${job.company.name} ${job.description} ${job.skills.join(' ')}`.toLowerCase();
  return keyword
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));
}

function matchesLocation(job: Job, location: string) {
  const loc = location.toLowerCase().trim();
  if (!loc) return true;
  if (loc === 'remote') return job.workplace === 'remote';
  return `${job.city} ${job.stateProvince} ${job.country}`.toLowerCase().includes(loc);
}

const DAY = 86_400_000;
const DATE_LIMITS: Record<string, number> = { '24h': DAY, week: 7 * DAY, month: 30 * DAY };

function emptyFacets(): JobFacetCounts {
  return {
    kinds: { job: 0, internship: 0, coop: 0 },
    employmentTypes: { full_time: 0, part_time: 0, contract: 0, temporary: 0 },
    experience: { entry: 0, mid: 0, senior: 0 },
    remote: 0,
  };
}

export function searchJobsIn(jobs: Job[], query: JobQuery): JobSearchResult {
  // Text, location and date narrow the result set; facet counts are
  // computed on that set so each checkbox shows how many it would add.
  const base = jobs.filter((job) => {
    if (query.keyword?.trim() && !matchesText(job, query.keyword)) return false;
    if (query.location?.trim() && !matchesLocation(job, query.location)) return false;
    if (query.datePosted && query.datePosted !== 'any') {
      const limit = DATE_LIMITS[query.datePosted];
      if (!job.postedAt || Date.now() - new Date(job.postedAt).getTime() > limit) return false;
    }
    if (query.salaryFloor) {
      const pay = annualPay(job, 'max');
      if (pay === null || pay < query.salaryFloor) return false;
    }
    return true;
  });

  const facets = emptyFacets();
  for (const job of base) {
    facets.kinds[job.kind] += 1;
    if (job.employmentType) facets.employmentTypes[job.employmentType] += 1;
    if (job.experienceLevel) facets.experience[job.experienceLevel] += 1;
    if (job.workplace === 'remote') facets.remote += 1;
  }

  const filtered = base.filter((job) => {
    if (query.kinds?.length && !query.kinds.includes(job.kind)) return false;
    if (query.employmentTypes?.length && (!job.employmentType || !query.employmentTypes.includes(job.employmentType))) return false;
    if (query.experience?.length && (!job.experienceLevel || !query.experience.includes(job.experienceLevel))) return false;
    if (query.remoteOnly && job.workplace !== 'remote') return false;
    if (query.workplaces?.length && !query.workplaces.includes(job.workplace)) return false;
    return true;
  });

  const sort = query.sort ?? 'recent';
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'salary') return (annualPay(b, 'max') ?? -1) - (annualPay(a, 'max') ?? -1);
    if (sort === 'relevance' && query.keyword) {
      const score = (job: Job) => (job.title.toLowerCase().includes(query.keyword!.toLowerCase()) ? 2 : 0) + (job.skills.some((s) => s.toLowerCase().includes(query.keyword!.toLowerCase())) ? 1 : 0);
      const diff = score(b) - score(a);
      if (diff) return diff;
    }
    return new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime();
  });

  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 10));
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(pages, Math.max(1, query.page ?? 1));

  return {
    items: sorted.slice((page - 1) * pageSize, page * pageSize),
    total: sorted.length,
    page,
    pageSize,
    pages,
    facets,
  };
}

export const careersApi = {
  fetchAllJobs,

  searchJobs: async (query: JobQuery = {}) => searchJobsIn(await fetchAllJobs(), query),

  /** GET /careers/:id — also counts a view for the employer. */
  getJobById: async (id: string): Promise<Job> => {
    const normalizedId = id?.trim();
    if (!normalizedId) throw new Error('A valid job ID is required.');
    const [raw, logos] = await Promise.all([
      apiClient.get<BackendJob>(`/careers/${encodeURIComponent(normalizedId)}`),
      cache ? Promise.resolve(new Map(cache.jobs.map((j) => [j.company.id, j.company.logoUrl ?? null]))) : companyLogos(),
    ]);
    if (!raw || typeof raw !== 'object' || !(raw._id ?? raw.id)) throw new Error('The server returned an invalid job.');
    return normalizeJob(raw, logos);
  },

  similarJobs: async (job: Job, limit = 4): Promise<Job[]> => {
    const jobs = await fetchAllJobs();
    const skills = new Set(job.skills.map((s) => s.toLowerCase()));
    return jobs
      .filter((other) => other.id !== job.id)
      .map((other) => ({
        other,
        score:
          (other.kind === job.kind ? 2 : 0) +
          (other.company.id === job.company.id ? 1 : 0) +
          other.skills.filter((s) => skills.has(s.toLowerCase())).length * 2 +
          (other.title.split(/\s+/).some((w) => w.length > 3 && job.title.toLowerCase().includes(w.toLowerCase())) ? 2 : 0),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.other);
  },
};

export default careersApi;
