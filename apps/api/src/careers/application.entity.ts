
/**
 * CAREERS APPLICATION ENTITY
 *
 * Represents a candidate's application to a job.
 */

export type ApplicationStatus =
  | "applied"
  | "viewed"
  | "shortlisted"
  | "interview"
  | "offer"
  | "rejected";

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

export interface ApplicationEntity {
  id: string;
  jobId: string;

  /**
   * Authenticated applicant ID.
   * Always obtained from the JWT/authentication context.
   */
  userId: string;

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

  status: ApplicationStatus;

  submittedAt: string;
  updatedAt: string;
}
