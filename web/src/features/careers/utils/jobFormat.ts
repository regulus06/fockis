import type { EmploymentType, ExperienceLevel, Job, JobKind, SalaryPeriod, Workplace } from '../types';

export const KIND_LABELS: Record<JobKind, string> = { job: 'Job', internship: 'Internship', coop: 'Co-op' };

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  temporary: 'Temporary',
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  entry: 'Entry Level',
  mid: 'Mid Level',
  senior: 'Senior Level',
};

export const WORKPLACE_LABELS: Record<Workplace, string> = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' };

const PERIOD_SUFFIX: Record<SalaryPeriod, string> = {
  hourly: 'hour',
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
  negotiable: '',
};

const SYMBOLS: Record<string, string> = { USD: '$', CAD: 'CA$', EUR: '€', GBP: '£', AUD: 'A$', JPY: '¥', INR: '₹', BRL: 'R$', MXN: 'MX$' };

function money(value: number, currency: string) {
  const symbol = SYMBOLS[currency] ?? '';
  const text = new Intl.NumberFormat('en-US', { maximumFractionDigits: value < 1000 ? 2 : 0 }).format(value);
  return symbol ? `${symbol}${text}` : `${text} ${currency}`;
}

/** "$90,000 – $130,000 / year", or the legacy free-text salary. */
export function formatSalary(job: Job): string {
  if (job.salaryPeriod === 'negotiable' && job.salaryMin === undefined) return 'Negotiable';
  const suffix = job.salaryPeriod && PERIOD_SUFFIX[job.salaryPeriod] ? ` / ${PERIOD_SUFFIX[job.salaryPeriod]}` : '';
  if (job.salaryMin !== undefined && job.salaryMax !== undefined && job.salaryMax !== job.salaryMin) {
    return `${money(job.salaryMin, job.currency)} – ${money(job.salaryMax, job.currency)}${suffix}`;
  }
  const single = job.salaryMin ?? job.salaryMax;
  if (single !== undefined) return `${money(single, job.currency)}${suffix}`;
  return job.salaryText;
}

/** Primary type label: employment type when set, otherwise the job kind. */
export function typeLabel(job: Job): string {
  if (job.kind !== 'job') return KIND_LABELS[job.kind];
  return job.employmentType ? EMPLOYMENT_LABELS[job.employmentType] : 'Job';
}

/** "Columbus, OH (Hybrid)" or "Remote". */
export function placeLabel(job: Job): string {
  if (job.workplace === 'remote') return job.location ? `Remote · ${job.location}` : 'Remote';
  const where = job.location || job.country;
  return job.workplace === 'hybrid' ? `${where} (Hybrid)` : where;
}

export function postedLabel(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
}

export const isNewJob = (job: Job) => Boolean(job.postedAt) && Date.now() - new Date(job.postedAt).getTime() < 3 * 86_400_000;

export const deadlinePassed = (job: Job) =>
  Boolean(job.applicationDeadline) && new Date(job.applicationDeadline!).getTime() < Date.now();

export function formatDate(iso?: string | null): string {
  if (!iso || Number.isNaN(Date.parse(iso))) return '—';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
}

/**
 * Splits a plain-text description into an intro and titled sections
 * ("What you will do", "Requirements"…) using short heading lines.
 */
export function splitDescription(text: string): { intro: string[]; sections: { heading: string; items: string[] }[] } {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const intro: string[] = [];
  const sections: { heading: string; items: string[] }[] = [];
  let current: { heading: string; items: string[] } | null = null;

  const isHeading = (line: string, next?: string) =>
    line.length > 0 &&
    line.length <= 60 &&
    !/^[•\-*–]/.test(line) &&
    !/[.!?]$/.test(line) &&
    Boolean(next && /^[•\-*–]/.test(next));

  lines.forEach((line, index) => {
    if (!line) return;
    if (isHeading(line, lines.slice(index + 1).find(Boolean))) {
      current = { heading: line.replace(/:$/, ''), items: [] };
      sections.push(current);
      return;
    }
    const item = line.replace(/^[•\-*–]\s*/, '');
    if (current && /^[•\-*–]/.test(line)) current.items.push(item);
    else if (current && current.items.length === 0) current.items.push(item);
    else if (current) {
      current = null;
      intro.push(line);
    } else intro.push(line);
  });

  return { intro, sections };
}

export const REQUIREMENT_HEADING = /(require|qualif|looking for|who you are|must have|nice to have|skills)/i;
export const RESPONSIBILITY_HEADING = /(responsib|what you('|’)?ll do|what you will do|duties|the role|day to day)/i;
