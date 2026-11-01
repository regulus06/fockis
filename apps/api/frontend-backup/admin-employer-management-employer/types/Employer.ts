export type EmployerRole = 'owner' | 'admin' | 'hr_manager' | 'recruiter' | 'viewer';
export type EmployerVerificationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'more_information_required';
export type EmployerJobStatus = 'draft' | 'pending_approval' | 'published' | 'paused' | 'closed' | 'rejected';

export interface EmployerProfile {
  id: string;
  ownerId: string;
  companyName: string;
  slug: string;
  description?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  country: string;
  city: string;
  stateProvince?: string;
  verificationStatus: EmployerVerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmployerMembership {
  employerId: string;
  userId: string;
  role: EmployerRole;
  permissions: string[];
  status: 'invited' | 'active' | 'suspended';
}

export interface EmployerDashboardSummary {
  activeJobs: number;
  pendingJobs: number;
  totalApplicants: number;
  interviews: number;
}
