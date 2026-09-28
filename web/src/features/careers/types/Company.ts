export interface CompanyBenefit {
  id: string;
  label: string;
}

export interface Company {
  id: string;
  name: string;
  initials: string;
  logoUrl?: string;
  coverImageUrl?: string;
  verified: boolean;
  industry: string;
  location: string;
  employeeCount: string;
  website?: string;
  foundedYear?: number;
  about: string;
  mission?: string;
  benefits: CompanyBenefit[];
  rating?: number;
  reviewCount?: number;
}

export interface EmployerJobSummary {
  id: string;
  title: string;
  jobType: string;
  status: 'live' | 'draft' | 'closed';
  applicantCount: number;
  viewCount: number;
}

export interface EmployerStats {
  openJobs: number;
  totalApplicants: number;
  inInterview: number;
  hireRate: number;
}
