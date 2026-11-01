import type { Job } from './Job';

export interface CompanySummary {
  id: string;
  name: string;
  logoUrl: string | null;
  industry: string;
  location: string;
  tagline: string;
  verified: boolean;
  openJobs: number;
}

export interface Company extends Omit<CompanySummary, 'openJobs'> {
  coverImageUrl: string | null;
  companySize: string;
  website: string;
  foundedYear: number | null;
  about: string;
  socialLinks: Partial<Record<'linkedin' | 'x' | 'facebook' | 'instagram' | 'youtube', string>>;
  media: { url: string; caption: string }[];
  openJobs: number;
  jobs: Job[];
}
