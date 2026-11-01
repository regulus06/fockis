import type { EmployerVerificationStatus } from './Employer';
export interface EmployerVerification {
  id: string;
  employerId: string;
  status: EmployerVerificationStatus;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  documentNames: string[];
}
