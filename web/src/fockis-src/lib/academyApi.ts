import { FOCKIS_API_URL } from "../../config/fockisConfig";

export type AcademyRole =
  | "student"
  | "instructor"
  | "advisor"
  | "admissions"
  | "employer"
  | "staff"
  | "administrator";

const BASE = (
  import.meta.env.VITE_ACADEMY_API_URL ||
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL + "/academy"
).replace(/\/+$/, "");

export function getAcademyApiBaseUrl(): string {
  return BASE;
}

export class AcademyApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status = 0, data?: unknown) {
    super(message);
    this.name = "AcademyApiError";
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = false,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (authenticated) {
    const token =
      localStorage.getItem("academyToken") ||
      localStorage.getItem("academy_token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token");

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType =
    response.headers.get("content-type") || "";

  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data
        ? Array.isArray(
            (data as { message?: unknown }).message,
          )
          ? (
              (data as { message: unknown[] }).message
            ).join(", ")
          : String(
              (data as { message?: unknown }).message,
            )
        : typeof data === "string" && data.trim()
          ? data
          : `Request failed with status ${response.status}`;

    throw new AcademyApiError(
      message,
      response.status,
      data,
    );
  }

  return data as T;
}

async function get<T>(
  path: string,
  authenticated = false,
): Promise<T> {
  return request<T>(
    path,
    { method: "GET" },
    authenticated,
  );
}

async function post<T>(
  path: string,
  body?: unknown,
  authenticated = false,
): Promise<T> {
  return request<T>(
    path,
    {
      method: "POST",
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    },
    authenticated,
  );
}

async function patch<T>(
  path: string,
  body?: unknown,
  authenticated = false,
): Promise<T> {
  return request<T>(
    path,
    {
      method: "PATCH",
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    },
    authenticated,
  );
}

async function put<T>(
  path: string,
  body?: unknown,
  authenticated = false,
): Promise<T> {
  return request<T>(
    path,
    {
      method: "PUT",
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    },
    authenticated,
  );
}

async function del<T>(
  path: string,
  authenticated = false,
): Promise<T> {
  return request<T>(
    path,
    {
      method: "DELETE",
    },
    authenticated,
  );
}

/* ============================================================
   AUTH
============================================================ */

export interface AcademyUser {
  _id?: string;
  id?: string;
  email: string;
  name: string;
  role: AcademyRole;
  studentSlug?: string;
  isActive?: boolean;
  twoFactorEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface AcademyLoginInput {
  email: string;
  password: string;
}

export interface AcademyLoginResponse {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  user?: AcademyUser;
  [key: string]: unknown;
}

export function getStoredToken(): string | null {
  return (
    localStorage.getItem("academyToken") ||
    localStorage.getItem("academy_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token")
  );
}

export async function login(
  email: string,
  password: string,
): Promise<AcademyLoginResponse> {
  const result =
    await post<AcademyLoginResponse>(
      "/auth/login",
      {
        email,
        password,
      },
    );

  const token =
    result.accessToken ||
    result.token;

  if (token) {
    localStorage.setItem(
      "academyToken",
      token,
    );
  }

  return result;
}

export function logout(): void {
  localStorage.removeItem("academyToken");
  localStorage.removeItem("academy_token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
}

export async function getMe(): Promise<AcademyUser> {
  return get<AcademyUser>(
    "/auth/me",
    true,
  );
}

export async function getCurrentUser(): Promise<AcademyUser> {
  return getMe();
}

/* ============================================================
   PROGRAMS
============================================================ */

export interface AcademyProgram {
  _id?: string;
  id?: string;
  name: string;
  code?: string;
  description?: string;
  degree?: string;
  department?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ProgramInput {
  name: string;
  code?: string;
  description?: string;
  degree?: string;
  department?: string;
  isActive?: boolean;
}

export async function getPrograms(): Promise<AcademyProgram[]> {
  const result =
    await get<AcademyProgram[]>(
      "/programs",
      true,
    );

  return Array.isArray(result)
    ? result
    : [];
}

export async function getProgram(
  id: string,
): Promise<AcademyProgram> {
  return get<AcademyProgram>(
    `/programs/${encodeURIComponent(id)}`,
    true,
  );
}

export async function createProgram(
  dto: ProgramInput,
): Promise<AcademyProgram> {
  return post<AcademyProgram>(
    "/programs",
    dto,
    true,
  );
}

export async function updateProgram(
  id: string,
  dto: Partial<ProgramInput>,
): Promise<AcademyProgram> {
  return patch<AcademyProgram>(
    `/programs/${encodeURIComponent(id)}`,
    dto,
    true,
  );
}

export async function deleteProgram(
  id: string,
): Promise<unknown> {
  return del(
    `/programs/${encodeURIComponent(id)}`,
    true,
  );
}

/* ============================================================
   CURRICULUM
============================================================ */

export interface AcademyCurriculum {
  _id?: string;
  id?: string;
  programId?: string;
  programCode?: string;
  courseCode?: string;
  courseName?: string;
  code?: string;
  name?: string;
  title?: string;
  description?: string;
  credits?: number;
  semester?: string;
  year?: number;
  term?: string;
  order?: number;
  required?: boolean;
  courses?: AcademyCourse[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export async function getCurriculum(
  programIdOrCode: string,
): Promise<
  AcademyCurriculum |
  AcademyCurriculum[]
> {
  return get<
    AcademyCurriculum |
    AcademyCurriculum[]
  >(
    `/programs/${encodeURIComponent(
      programIdOrCode,
    )}/curriculum`,
    true,
  );
}

/* ============================================================
   COURSES
============================================================ */

export interface CourseModuleInput {
  order: number;
  title: string;
}

export interface CourseInstructor {
  _id?: string;
  id?: string;
  name: string;
  email?: string;
  role?: AcademyRole;
}

export interface AcademyCourse {
  _id: string;
  code: string;
  name: string;
  programId?: string;
  instructorId?: string;
  instructor: string;
  instructorUser?: CourseInstructor | null;
  description?: string;
  modules: CourseModuleInput[];
  assignments?: unknown[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CourseInput {
  code: string;
  name: string;
  programId?: string;
  instructorId?: string;
  instructor: string;
  description?: string;
  modules?: CourseModuleInput[];
  assignments?: unknown[];
}

export async function getCourses(): Promise<AcademyCourse[]> {
  const result =
    await get<AcademyCourse[]>(
      "/courses",
      true,
    );

  return Array.isArray(result)
    ? result
    : [];
}

export async function getCourse(
  code: string,
): Promise<AcademyCourse> {
  return get<AcademyCourse>(
    `/courses/${encodeURIComponent(code)}`,
    true,
  );
}

export async function getCourseModules(
  courseCode: string,
): Promise<string[]> {
  return get<string[]>(
    `/courses/${encodeURIComponent(
      courseCode,
    )}/modules`,
    true,
  );
}

export async function getCourseAssignments(
  courseCode: string,
): Promise<unknown[]> {
  return get<unknown[]>(
    `/courses/${encodeURIComponent(
      courseCode,
    )}/assignments`,
    true,
  );
}

export async function createCourse(
  dto: CourseInput,
): Promise<AcademyCourse> {
  return post<AcademyCourse>(
    "/courses",
    dto,
    true,
  );
}

export async function updateCourse(
  code: string,
  dto: Partial<CourseInput>,
): Promise<AcademyCourse> {
  return patch<AcademyCourse>(
    `/courses/${encodeURIComponent(code)}`,
    dto,
    true,
  );
}

export async function deleteCourse(
  code: string,
): Promise<{
  deleted: boolean;
  courseCode: string;
}> {
  return del<{
    deleted: boolean;
    courseCode: string;
  }>(
    `/courses/${encodeURIComponent(code)}`,
    true,
  );
}

export async function getAllEnrollments(): Promise<any[]> {
  const result =
    await get<any[]>(
      "/courses/enrollments/all",
      true,
    );

  return Array.isArray(result)
    ? result
    : [];
}

/* ============================================================
   STUDENTS
============================================================ */

export interface AcademyStudent {
  _id?: string;
  id?: string;
  studentId?: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  studentSlug?: string;
  programId?: string;
  programCode?: string;
  programName?: string;
  enrollmentStatus?: string;
  status?: string;
  role?: AcademyRole;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface StudentInput {
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  studentSlug?: string;
  programId?: string;
  programCode?: string;
  enrollmentStatus?: string;
  status?: string;
  isActive?: boolean;
  password?: string;
}

export async function getStudents(): Promise<AcademyStudent[]> {
  const result =
    await get<AcademyStudent[]>(
      "/students",
      true,
    );

  return Array.isArray(result)
    ? result
    : [];
}

export async function getStudent(
  id: string,
): Promise<AcademyStudent> {
  return get<AcademyStudent>(
    `/students/${encodeURIComponent(id)}`,
    true,
  );
}

export async function createStudent(
  dto: StudentInput,
): Promise<AcademyStudent> {
  return post<AcademyStudent>(
    "/students",
    dto,
    true,
  );
}

export async function updateStudent(
  id: string,
  dto: Partial<StudentInput>,
): Promise<AcademyStudent> {
  return patch<AcademyStudent>(
    `/students/${encodeURIComponent(id)}`,
    dto,
    true,
  );
}

export async function deleteStudent(
  id: string,
): Promise<unknown> {
  return del(
    `/students/${encodeURIComponent(id)}`,
    true,
  );
}

/* ============================================================
   STUDENT COURSES
============================================================ */

export interface StudentCourse
  extends AcademyCourse {
  enrollmentId?: string;
  studentId?: string;
  enrolledAt?: string;
  enrollmentStatus?: string;
  progress?: number;
  grade?: string;
}

export async function getStudentCourses(): Promise<StudentCourse[]> {
  const result =
    await get<StudentCourse[]>(
      "/courses/student",
      true,
    );

  return Array.isArray(result)
    ? result
    : [];
}

/* ============================================================
   STUDENT DASHBOARD
============================================================ */

export interface StudentDashboard {
  student?: AcademyUser | null;
  courses?: StudentCourse[];
  enrollments?: unknown[];
  assignments?: unknown[];
  upcomingEvents?: AcademyEvent[];
  announcements?: AcademyNews[];
  notifications?: unknown[];
  stats?: {
    courses?: number;
    credits?: number;
    completedCourses?: number;
    currentGpa?: number;
    gpa?: number;
  };
  [key: string]: unknown;
}

export async function getStudentDashboard(): Promise<StudentDashboard> {
  return get<StudentDashboard>(
    "/students/dashboard",
    true,
  );
}

/* ============================================================
   USERS
============================================================ */

export async function getAcademyUsers(): Promise<AcademyUser[]> {
  const result =
    await get<AcademyUser[]>(
      "/users",
      true,
    );

  return Array.isArray(result)
    ? result
    : [];
}

export async function getAcademyUser(
  id: string,
): Promise<AcademyUser> {
  return get<AcademyUser>(
    `/users/${encodeURIComponent(id)}`,
    true,
  );
}

export async function updateUserRole(
  id: string,
  role: AcademyRole,
): Promise<AcademyUser> {
  return patch<AcademyUser>(
    `/users/${encodeURIComponent(id)}/role`,
    { role },
    true,
  );
}

export async function updateAcademyUser(
  id: string,
  dto: Partial<AcademyUser>,
): Promise<AcademyUser> {
  return patch<AcademyUser>(
    `/users/${encodeURIComponent(id)}`,
    dto,
    true,
  );
}

export async function deleteAcademyUser(
  id: string,
): Promise<unknown> {
  return del(
    `/users/${encodeURIComponent(id)}`,
    true,
  );
}

/* ============================================================
   STATS
============================================================ */

export interface AcademyStats {
  programs: number;
  courses: number;
  enrollments: number;
  faculty: number;
  instructors: number;
  students: number;
  events: number;
  news: number;
  applications: number;
  pendingApplications: number;
  jobs: number;
  jobApplications: number;
  contactMessages: number;
  newContactMessages: number;
  users: number;
  messages: number;
  admissions: number;
  [key: string]: unknown;
}

const DEFAULT_STATS: AcademyStats = {
  programs: 0,
  courses: 0,
  enrollments: 0,
  faculty: 0,
  instructors: 0,
  students: 0,
  events: 0,
  news: 0,
  applications: 0,
  pendingApplications: 0,
  jobs: 0,
  jobApplications: 0,
  contactMessages: 0,
  newContactMessages: 0,
  users: 0,
  messages: 0,
  admissions: 0,
};

export async function getAcademyStats(): Promise<AcademyStats> {
  const result =
    await get<Partial<AcademyStats>>(
      "/stats",
      true,
    );

  return {
    ...DEFAULT_STATS,
    ...(result || {}),
  };
}

/* ============================================================
   ACTIVITY
============================================================ */

export type AcademyActivityType =
  | "admissions_application"
  | "job_application"
  | "contact_message"
  | string;

export interface ActivityItem {
  type: AcademyActivityType;
  title: string;
  status: string;
  createdAt: string;
  id: string;
  [key: string]: unknown;
}

export async function getRecentActivity(
  limit = 12,
): Promise<ActivityItem[]> {
  const result =
    await get<ActivityItem[]>(
      `/activity/recent?limit=${encodeURIComponent(
        String(limit),
      )}`,
      true,
    );

  return Array.isArray(result)
    ? result
    : [];
}

/* ============================================================
   FACULTY
============================================================ */

export interface AcademyFaculty {
  _id?: string;
  id?: string;
  name: string;
  email?: string;
  title?: string;
  position?: string;
  department?: string;
  bio?: string;
  biography?: string;
  photoUrl?: string;
  imageUrl?: string;
  avatarUrl?: string;
  office?: string;
  officeLocation?: string;
  phone?: string;
  specialties?: string[];
  specializations?: string[];
  courses?: string[];
  role?: AcademyRole;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export async function getFaculty(): Promise<AcademyFaculty[]> {
  const result =
    await get<AcademyFaculty[]>(
      "/faculty",
      true,
    );

  return Array.isArray(result)
    ? result
    : [];
}

export async function getFacultyMember(
  id: string,
): Promise<AcademyFaculty> {
  return get<AcademyFaculty>(
    `/faculty/${encodeURIComponent(id)}`,
    true,
  );
}

export async function createFaculty(
  dto: Partial<AcademyFaculty>,
): Promise<AcademyFaculty> {
  return post<AcademyFaculty>(
    "/faculty",
    dto,
    true,
  );
}

export async function updateFaculty(
  id: string,
  dto: Partial<AcademyFaculty>,
): Promise<AcademyFaculty> {
  return patch<AcademyFaculty>(
    `/faculty/${encodeURIComponent(id)}`,
    dto,
    true,
  );
}

export async function deleteFaculty(
  id: string,
): Promise<unknown> {
  return del(
    `/faculty/${encodeURIComponent(id)}`,
    true,
  );
}

/* ============================================================
   CONTENT
============================================================ */

export interface AcademyContent {
  _id?: string;
  id?: string;
  section: string;
  title?: string;
  content?: string;
  body?: string;
  slug?: string;
  type?: string;
  key?: string;
  value?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface AcademyContentSection {
  id?: string;
  _id?: string;
  name: string;
  slug?: string;
  title?: string;
  description?: string;
  content?: AcademyContent[];
  items?: AcademyContent[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export async function getContent(
  section: string,
): Promise<
  AcademyContent |
  AcademyContent[]
> {
  return get<
    AcademyContent |
    AcademyContent[]
  >(
    `/content/${encodeURIComponent(section)}`,
    true,
  );
}

export async function getAllContent(): Promise<AcademyContent[]> {
  const result =
    await get<AcademyContent[]>(
      "/content",
      true,
    );

  return Array.isArray(result)
    ? result
    : [];
}

export async function getContentSections(): Promise<
  AcademyContentSection[]
> {
  const result =
    await get<
      AcademyContentSection[] |
      AcademyContent[]
    >(
      "/content/sections",
      true,
    );

  if (!Array.isArray(result)) {
    return [];
  }

  return result.map((item) => {
    const raw = item as AcademyContentSection &
      AcademyContent;

    return {
      ...raw,
      id: raw.id || raw._id || raw.slug || raw.section,
      name:
        raw.name ||
        raw.title ||
        raw.section ||
        raw.slug ||
        "",
    };
  });
}

export async function createContent(
  dto: Partial<AcademyContent>,
): Promise<AcademyContent> {
  return post<AcademyContent>(
    "/content",
    dto,
    true,
  );
}

export async function createContentItem(
  dto: Partial<AcademyContent>,
): Promise<AcademyContent> {
  return createContent(dto);
}

export async function updateContent(
  id: string,
  dto: Partial<AcademyContent>,
): Promise<AcademyContent> {
  return patch<AcademyContent>(
    `/content/${encodeURIComponent(id)}`,
    dto,
    true,
  );
}

export async function updateContentItem(
  id: string,
  dto: Partial<AcademyContent>,
): Promise<AcademyContent> {
  return updateContent(id, dto);
}

export async function deleteContent(
  id: string,
): Promise<unknown> {
  return del(
    `/content/${encodeURIComponent(id)}`,
    true,
  );
}

export async function deleteContentItem(
  id: string,
): Promise<unknown> {
  return deleteContent(id);
}

/* ============================================================
   EVENTS
============================================================ */

export interface AcademyEvent {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  category?: string;
  imageUrl?: string;
  registrationUrl?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export async function getEvents(): Promise<AcademyEvent[]> {
  const result =
    await get<AcademyEvent[]>(
      "/events",
      true,
    );

  return Array.isArray(result)
    ? result
    : [];
}

export async function getEvent(
  id: string,
): Promise<AcademyEvent> {
  return get<AcademyEvent>(
    `/events/${encodeURIComponent(id)}`,
    true,
  );
}

export async function createEvent(
  dto: Partial<AcademyEvent>,
): Promise<AcademyEvent> {
  return post<AcademyEvent>(
    "/events",
    dto,
    true,
  );
}

export async function updateEvent(
  id: string,
  dto: Partial<AcademyEvent>,
): Promise<AcademyEvent> {
  return patch<AcademyEvent>(
    `/events/${encodeURIComponent(id)}`,
    dto,
    true,
  );
}

export async function deleteEvent(
  id: string,
): Promise<unknown> {
  return del(
    `/events/${encodeURIComponent(id)}`,
    true,
  );
}

/* ============================================================
   NEWS
============================================================ */

export interface AcademyNews {
  _id?: string;
  id?: string;
  title: string;
  slug?: string;
  excerpt?: string;
  summary?: string;
  content?: string;
  body?: string;
  imageUrl?: string;
  category?: string;
  author?: string;
  publishedAt?: string;
  date?: string;
  isPublished?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export async function getNews(): Promise<AcademyNews[]> {
  const result =
    await get<AcademyNews[]>(
      "/news",
    );

  return Array.isArray(result)
    ? result
    : [];
}

export async function getNewsArticle(
  idOrSlug: string,
): Promise<AcademyNews> {
  return get<AcademyNews>(
    `/news/${encodeURIComponent(idOrSlug)}`,
  );
}

export async function getAllNews(): Promise<AcademyNews[]> {
  const result =
    await get<AcademyNews[]>(
      "/news/admin/all",
      true,
    );

  return Array.isArray(result)
    ? result
    : [];
}

export async function getAllNewsForAdmin(): Promise<AcademyNews[]> {
  return getAllNews();
}

export async function createNews(
  dto: Partial<AcademyNews>,
): Promise<AcademyNews> {
  return post<AcademyNews>(
    "/news",
    dto,
    true,
  );
}

export async function updateNews(
  id: string,
  dto: Partial<AcademyNews>,
): Promise<AcademyNews> {
  return patch<AcademyNews>(
    `/news/${encodeURIComponent(id)}`,
    dto,
    true,
  );
}

export async function deleteNews(
  id: string,
): Promise<unknown> {
  return del(
    `/news/${encodeURIComponent(id)}`,
    true,
  );
}

/* ============================================================
   ADMISSIONS
============================================================ */

export interface AdmissionApplication {
  _id?: string;
  id?: string;
  applicationId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone?: string;
  programId?: string;
  programCode?: string;
  programName?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  previousSchool?: string;
  educationLevel?: string;
  personalStatement?: string;
  essay?: string;
  message?: string;
  status?: string;
  notes?: string;
  adminNotes?: string;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface AdmissionApplicationInput {
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone?: string;
  programId?: string;
  programCode?: string;
  programName?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  previousSchool?: string;
  educationLevel?: string;
  personalStatement?: string;
  essay?: string;
  message?: string;
}

export async function getApplications(): Promise<AdmissionApplication[]> {
  const result =
    await get<AdmissionApplication[]>(
      "/admissions/applications",
      true,
    );

  return Array.isArray(result)
    ? result
    : [];
}

export async function getAdmissionApplications(): Promise<AdmissionApplication[]> {
  return getApplications();
}

export async function getApplication(
  id: string,
): Promise<AdmissionApplication> {
  return get<AdmissionApplication>(
    `/admissions/applications/${encodeURIComponent(id)}`,
    true,
  );
}

export async function getAdmissionApplication(
  id: string,
): Promise<AdmissionApplication> {
  return getApplication(id);
}

export async function submitAdmissionApplication(
  data: AdmissionApplicationInput,
): Promise<AdmissionApplication> {
  return post<AdmissionApplication>(
    "/admissions/applications",
    data,
  );
}

export async function updateApplicationStatus(
  id: string,
  status: string,
): Promise<AdmissionApplication> {
  return patch<AdmissionApplication>(
    `/admissions/applications/${encodeURIComponent(id)}/status`,
    { status },
    true,
  );
}

export async function updateAdmissionApplicationStatus(
  id: string,
  status: string,
): Promise<AdmissionApplication> {
  return updateApplicationStatus(
    id,
    status,
  );
}

export async function updateApplication(
  id: string,
  dto: Partial<AdmissionApplication>,
): Promise<AdmissionApplication> {
  return patch<AdmissionApplication>(
    `/admissions/applications/${encodeURIComponent(id)}`,
    dto,
    true,
  );
}

export async function deleteApplication(
  id: string,
): Promise<unknown> {
  return del(
    `/admissions/applications/${encodeURIComponent(id)}`,
    true,
  );
}

/* ============================================================
   CONTACT
============================================================ */

export interface ContactFormInput {
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  category?: string;
}

export interface ContactFormResponse {
  success?: boolean;
  message?: string;
  id?: string;
  _id?: string;
  [key: string]: unknown;
}

export async function submitContactForm(
  data: ContactFormInput,
): Promise<ContactFormResponse> {
  return post<ContactFormResponse>(
    "/contact",
    data,
  );
}

export interface ContactMessage {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  category?: string;
  status?: string;
  isRead?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  const result =
    await get<ContactMessage[]>(
      "/contact",
      true,
    );

  return Array.isArray(result)
    ? result
    : [];
}

export async function updateContactMessage(
  id: string,
  dto: Partial<ContactMessage>,
): Promise<ContactMessage> {
  return patch<ContactMessage>(
    `/contact/${encodeURIComponent(id)}`,
    dto,
    true,
  );
}

export async function updateContactMessageStatus(
  id: string,
  status: string,
): Promise<ContactMessage> {
  return patch<ContactMessage>(
    `/contact/${encodeURIComponent(id)}/status`,
    { status },
    true,
  );
}

export async function deleteContactMessage(
  id: string,
): Promise<unknown> {
  return del(
    `/contact/${encodeURIComponent(id)}`,
    true,
  );
}

/* ============================================================
   JOBS
============================================================ */

export interface AcademyJob {
  _id?: string;
  id?: string;
  title: string;
  company?: string;
  companyName?: string;
  location?: string;
  description?: string;
  requirements?: string[];
  employmentType?: string;
  salary?: string;
  salaryRange?: string;
  applicationUrl?: string;
  deadline?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface JobInput {
  title: string;
  company?: string;
  companyName?: string;
  location?: string;
  description?: string;
  requirements?: string[];
  employmentType?: string;
  salary?: string;
  salaryRange?: string;
  applicationUrl?: string;
  deadline?: string;
  isActive?: boolean;
}

export interface JobApplicationInput {
  jobId: string;
  name?: string;
  email?: string;
  phone?: string;
  resumeUrl?: string;
  coverLetter?: string;
  message?: string;
}

export interface JobApplication {
  _id?: string;
  id?: string;
  jobId: string;
  studentId?: string;
  name?: string;
  email?: string;
  phone?: string;
  resumeUrl?: string;
  coverLetter?: string;
  message?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export async function getJobs(): Promise<AcademyJob[]> {
  const result =
    await get<AcademyJob[]>(
      "/jobs",
      true,
    );

  return Array.isArray(result)
    ? result
    : [];
}

export async function getJob(
  jobId: string,
): Promise<AcademyJob> {
  return get<AcademyJob>(
    `/jobs/${encodeURIComponent(jobId)}`,
    true,
  );
}

export async function createJob(
  dto: JobInput,
): Promise<AcademyJob> {
  return post<AcademyJob>(
    "/jobs",
    dto,
    true,
  );
}

export async function updateJob(
  id: string,
  dto: Partial<JobInput>,
): Promise<AcademyJob> {
  return patch<AcademyJob>(
    `/jobs/${encodeURIComponent(id)}`,
    dto,
    true,
  );
}

export async function deleteJob(
  id: string,
): Promise<unknown> {
  return del(
    `/jobs/${encodeURIComponent(id)}`,
    true,
  );
}

export async function submitJobApplication(
  application: JobApplicationInput,
): Promise<JobApplication> {
  return post<JobApplication>(
    "/jobs/applications",
    application,
    true,
  );
}

export async function getMyJobApplications(): Promise<JobApplication[]> {
  const result =
    await get<JobApplication[]>(
      "/jobs/applications/me",
      true,
    );

  return Array.isArray(result)
    ? result
    : [];
}

export async function getJobApplications(): Promise<JobApplication[]> {
  const result =
    await get<JobApplication[]>(
      "/jobs/applications",
      true,
    );

  return Array.isArray(result)
    ? result
    : [];
}

export async function updateJobApplicationStatus(
  id: string,
  status: string,
): Promise<JobApplication> {
  return patch<JobApplication>(
    `/jobs/applications/${encodeURIComponent(id)}/status`,
    { status },
    true,
  );
}

/* ============================================================
   ENROLLMENTS
============================================================ */

export interface AcademyEnrollment {
  _id?: string;
  id?: string;
  studentId?: string;
  courseId?: string;
  courseCode?: string;
  status?: string;
  grade?: string;
  progress?: number;
  enrolledAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export async function getEnrollments(): Promise<AcademyEnrollment[]> {
  const result =
    await get<AcademyEnrollment[]>(
      "/enrollments",
      true,
    );

  return Array.isArray(result)
    ? result
    : [];
}

export async function getEnrollment(
  id: string,
): Promise<AcademyEnrollment> {
  return get<AcademyEnrollment>(
    `/enrollments/${encodeURIComponent(id)}`,
    true,
  );
}

export async function updateEnrollment(
  id: string,
  dto: Partial<AcademyEnrollment>,
): Promise<AcademyEnrollment> {
  return patch<AcademyEnrollment>(
    `/enrollments/${encodeURIComponent(id)}`,
    dto,
    true,
  );
}

export async function deleteEnrollment(
  id: string,
): Promise<unknown> {
  return del(
    `/enrollments/${encodeURIComponent(id)}`,
    true,
  );
}