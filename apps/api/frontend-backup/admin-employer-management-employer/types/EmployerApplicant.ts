export interface EmployerApplicant {
  id: string;
  applicationId: string;
  jobId: string;
  jobTitle: string;
  fullName: string;
  email: string;
  status: 'applied' | 'viewed' | 'shortlisted' | 'interview' | 'offer' | 'rejected';
  submittedAt: string;
}
