import type { EmployerVerificationStatus } from './EmployerVerification';

export interface EmployerCompany {
  id: string;
  companyName: string;
  industry: string;
  companySize: string;
  website: string;
  foundedYear: number | null;
  country: string;
  city: string;
  stateProvince: string;
  tagline: string;
  about: string;
  logoUrl: string;
  coverImageUrl: string;
  socialLinks: {
    linkedin: string;
    x: string;
    facebook: string;
    instagram: string;
    youtube: string;
  };
  media: { id: string; url: string; caption: string }[];
  verificationStatus: EmployerVerificationStatus;
  teamSize: number;
  plan: string;
  updatedAt: string | null;
}

/** Kept for backward compatibility with earlier imports. */
export type EmployerProfile = EmployerCompany;

export interface EmployerProfileResponse {
  company: EmployerCompany | null;
  openJobs: number;
  suggestedCompanyName: string;
}

export interface EmployerProfileInput {
  companyName: string;
  industry?: string;
  companySize?: string;
  website?: string;
  foundedYear?: number;
  country?: string;
  city?: string;
  stateProvince?: string;
  tagline?: string;
  about?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  socialLinks?: Partial<EmployerCompany['socialLinks']>;
  media?: { url: string; caption?: string }[];
}
