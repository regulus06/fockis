import type { EmployerInterview } from './EmployerInterview';

export type ApplicationStatus =
  | 'applied'
  | 'viewed'
  | 'shortlisted'
  | 'interview'
  | 'offer'
  | 'rejected';

export interface EmployerApplicantRow {
  id: string;
  candidateUserId: string;
  fullName: string;
  email: string;
  location: string;
  profilePicture: string | null;
  skills: string[];
  jobId: string;
  jobTitle: string;
  status: ApplicationStatus;
  appliedAt: string | null;
}

export interface EmployerApplicantList {
  items: EmployerApplicantRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  counts: { all: number; newThisWeek: number } & Partial<Record<ApplicationStatus, number>>;
}

export interface EmployerApplicantDetail {
  id: string;
  candidateUserId: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  profilePicture: string | null;
  linkedInUrl: string | null;
  resumeFileName: string | null;
  resumeUrl: string | null;
  education: { school: string; major: string; graduationDate: string } | null;
  experience: { roleTitle: string; company?: string; description: string } | null;
  skills: string[];
  coverLetter: string | null;
  workAuthorized: boolean;
  availableStartDate: string | null;
  answers: Record<string, string>;
  status: ApplicationStatus;
  appliedAt: string | null;
  job: { id: string; title: string; type: string; location: string } | null;
  statusHistory: { status: ApplicationStatus; changedAt: string }[];
  notes: { id: string; body: string; authorName: string; createdAt: string }[];
  interviews: EmployerInterview[];
}

export interface EmployerCandidate {
  userId: string;
  fullName: string;
  email: string;
  location: string;
  profilePicture: string | null;
  skills: string[];
  education: EmployerApplicantDetail['education'];
  experience: EmployerApplicantDetail['experience'];
  availableStartDate: string | null;
  latestApplicationId: string;
  latestStatus: ApplicationStatus;
  appliedJobs: { id: string; title: string }[];
  lastAppliedAt: string | null;
  saved: boolean;
}
