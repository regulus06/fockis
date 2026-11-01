export type EmployerVerificationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

export interface EmployerVerificationDocument {
  name: string;
  url: string;
}

export interface EmployerVerification {
  verification: {
    status: EmployerVerificationStatus;
    legalName?: string;
    businessEmail?: string;
    website?: string;
    registrationNumber?: string;
    documents: EmployerVerificationDocument[];
    submittedAt?: string;
    reviewedAt?: string;
    reviewerNote?: string;
  };
  history: { status: string; note?: string; at: string }[];
  companyName: string;
  website: string;
}

export interface SubmitVerificationPayload {
  legalName: string;
  businessEmail: string;
  website: string;
  registrationNumber?: string;
  documents: EmployerVerificationDocument[];
}
