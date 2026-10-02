export type ApplicationStatus =
  | 'applied'
  | 'viewed'
  | 'shortlisted'
  | 'interview'
  | 'offer'
  | 'rejected';

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

export interface ApplicationPayload {
  jobId: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedInUrl?: string;
  resumeFileName?: string;
  resumeUrl?: string;
  education: ApplicationEducation;
  experience?: ApplicationExperience;
  skills: string[];
  coverLetter?: string;
  workAuthorized: boolean;
  availableStartDate?: string;
  answers?: Record<string, string>;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  jobType: string;
  status: ApplicationStatus;
  submittedAt: string;
  updatedAt: string;
}

export const APPLICATION_STEPS = [
  'Personal Info',
  'Resume',
  'Education',
  'Experience',
  'Skills',
  'Cover Letter',
  'Questions',
  'Review',
  'Submit',
] as const;

export type ApplicationStepName = (typeof APPLICATION_STEPS)[number];
