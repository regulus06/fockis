export type Availability = 'actively_looking' | 'open' | 'not_looking';

export interface CareerEducation {
  id?: string;
  school: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
}

export interface CareerExperience {
  id?: string;
  title: string;
  company: string;
  location: string;
  /** YYYY-MM */
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface CareerCertification {
  id?: string;
  name: string;
  issuer: string;
  year: string;
  inProgress: boolean;
}

export interface CareerProfile {
  headline: string;
  summary: string;
  location: string;
  phone: string;
  linkedInUrl: string;
  websiteUrl: string;
  availability: Availability;
  skills: string[];
  education: CareerEducation[];
  experience: CareerExperience[];
  certifications: CareerCertification[];
  resume: { fileName: string; mimeType: string; size: number; uploadedAt: string } | null;
  jobAlertCount: number;
  completeness: number;
  updatedAt: string | null;
}

export type CareerProfileInput = Partial<Omit<CareerProfile, 'resume' | 'jobAlertCount' | 'completeness' | 'updatedAt'>>;

export interface JobAlert {
  id: string;
  keywords: string;
  location: string;
  type: string;
  remoteOnly: boolean;
  createdAt: string;
  lastViewedAt: string;
  newMatches: number;
  totalMatches: number;
}

/** Subset of GET /users/me used by Careers. */
export interface FockisUser {
  _id?: string;
  id?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string | null;
  profilePicture?: string;
  location?: string;
}
