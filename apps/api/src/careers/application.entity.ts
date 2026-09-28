export type ApplicationStatus = 'applied' | 'viewed' | 'shortlisted' | 'interview' | 'offer' | 'rejected';

export interface ApplicationEntity {
  id: string;
  jobId: string;
  userId: string; // from auth context — see applications.controller.ts note
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedInUrl?: string;
  resumeFileName?: string;
  resumeUrl?: string;
  education: { school: string; major: string; graduationDate: string };
  experience?: { roleTitle: string; company?: string; description: string };
  skills: string[];
  coverLetter?: string;
  workAuthorized: boolean;
  availableStartDate?: string;
  answers?: Record<string, string>;
  status: ApplicationStatus;
  submittedAt: string;
  updatedAt: string;
}
