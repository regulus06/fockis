import type { Job } from './Job';

export type ApplicationStatus = 'applied' | 'viewed' | 'shortlisted' | 'interview' | 'offer' | 'rejected';

export interface ApplicationEducation {
  school: string;
  major: string;
  graduationDate: string;
}

export interface ApplicationExperience {
  roleTitle: string;
  company?: string;
  description: string;
}

/** Body for POST /careers/applications (CreateApplicationDto). */
export interface ApplicationPayload {
  jobId: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedInUrl?: string;
  education: ApplicationEducation;
  experience?: ApplicationExperience;
  skills: string[];
  coverLetter?: string;
  workAuthorized: boolean;
  availableStartDate?: string;
  answers?: Record<string, string>;
  /** Attach the resume stored on the career profile. */
  useProfileResume?: boolean;
}

export interface MyApplication {
  id: string;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
  job: Job | null;
  resumeFileName: string | null;
  coverLetter: string | null;
  statusHistory: { status: ApplicationStatus; changedAt: string }[];
}
