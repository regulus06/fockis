export interface EmployerJob {
  id: string;
  title: string;
  company: string;
  type: 'job' | 'internship' | 'coop';
  workplaceType: 'remote' | 'hybrid' | 'onsite';
  country: string;
  city: string;
  description: string;
  status: 'draft' | 'pending_approval' | 'published' | 'paused' | 'closed' | 'rejected';
  isActive: boolean;
  isApproved: boolean;
  applicantCount: number;
  createdAt: string;
  updatedAt: string;
}
