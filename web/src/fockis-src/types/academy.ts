export type ProgramCategory =
  | "technology"
  | "business"
  | "healthcare"
  | "trades";

export interface Program {
  id: string;
  _id?: string;
  name: string;
  cat: ProgramCategory;
  level: string;
  desc: string;
  icon:
    | "shield"
    | "server"
    | "code"
    | "briefcase"
    | "health"
    | "wrench"
    | "media";
}

export interface CurriculumRow {
  code: string;
  name: string;
  credits: string;
}

export interface Course {
  code: string;
  name: string;
  progress: number;
  grade: string;
}

export interface AcademyCourseModule {
  order: number;
  title: string;
}

export interface AcademyCourse {
  _id: string;
  code: string;
  name: string;
  programId?: string;
  instructorId?: string;
  instructor: string;
  description?: string;
  modules: AcademyCourseModule[];
  assignments?: AcademyCourseAssignment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademyCourseAssignment {
  title: string;
  dueDate: string;
  status:
    | "upcoming"
    | "submitted"
    | "graded";
  gradeLabel?: string;
}

export interface FacultyMember {
  _id?: string;
  name: string;
  dept: string;
  pos: string;
  edu: string;
  tag: string;
  bio?: string;
  photoUrl?: string;
}

export type JobType =
  | "job"
  | "internship"
  | "apprenticeship";

export interface JobListing {
  _id?: string;
  title: string;
  company: string;
  loc: string;
  pay: string;
  type: JobType;
  desc: string;
  active?: boolean;
}

export interface NewsItem {
  _id?: string;
  tag: string;
  title: string;
  date: string;
  body?: string;
  published?: boolean;
}

export interface CampusEvent {
  _id?: string;
  date?: string;
  d: string;
  m: string;
  title: string;
  loc: string;
}

export interface ContactFormValues {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}