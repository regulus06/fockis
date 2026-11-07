/**
 * ============================================================================
 * FOCKIS ACADEMY — LEARNING MARKETPLACE DATA
 * ============================================================================
 *
 * Data for the redesigned homepage, course catalog, course details and the
 * instructor dashboard. Everything here reads the REAL Academy backend
 * (apps/api/src/academy) through the same base URL and Academy login token
 * that academyApi.ts already uses. Nothing is mocked.
 *
 * New backend endpoints used (added in this redesign):
 *   GET   /academy/courses/catalog   public courses only (visibility = public)
 *   PATCH /academy/courses/:code     now also accepts { visibility, enrollmentOpen }
 */

import {
  getAcademyStats,
  getRecentActivity,
  type AcademyStats,
  type ActivityItem,
  getAcademyApiBaseUrl,
  getStoredToken,
  updateCourse,
  type AcademyCourse,
  type CourseInput,
} from "./academyApi";

export type Visibility = "public" | "hidden" | "private" | "draft";

/** A course as returned by the backend, including the new visibility fields. */
export type LearnCourse = AcademyCourse & {
  visibility?: Visibility;
  enrollmentOpen?: boolean;
};

export class LearnApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "LearnApiError";
    this.status = status;
  }
}

async function getJson<T>(path: string, authenticated: boolean): Promise<T> {
  const headers = new Headers();
  if (authenticated) {
    const token = getStoredToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${getAcademyApiBaseUrl()}${path}`, { headers });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && typeof body.message === "string") message = body.message;
    } catch {
      /* non-JSON error body */
    }
    throw new LearnApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

/**
 * Public catalog: only courses whose visibility is public (or not set yet).
 *
 * If the running API is an older build without GET /courses/catalog, Nest
 * matches "catalog" as a course code and answers 404 `Course "CATALOG" not
 * found`. In that case fall back to GET /courses and apply the same public
 * filter here, so the catalog keeps working until the API is redeployed.
 */
export async function getCatalogCourses(): Promise<LearnCourse[]> {
  try {
    const result = await getJson<LearnCourse[]>("/courses/catalog", false);
    return Array.isArray(result) ? result : [];
  } catch (e) {
    const oldApi = e instanceof LearnApiError && (e.status === 404 || /catalog/i.test(e.message));
    if (!oldApi) throw e;
    const all = await getJson<LearnCourse[]>("/courses", false);
    return (Array.isArray(all) ? all : []).filter((c) => !c.visibility || c.visibility === "public");
  }
}

/** Courses owned by the signed-in Academy instructor. */
export async function getMyCourses(): Promise<LearnCourse[]> {
  const result = await getJson<LearnCourse[]>("/courses/mine", true);
  return Array.isArray(result) ? result : [];
}

export interface EnrollmentRow {
  _id?: string;
  studentId?: string | { _id?: string };
  courseCode?: string;
  progress?: number;
  createdAt?: string;
  [key: string]: unknown;
}

/** All enrollments (instructor/staff/admin only on the backend). */
export async function getEnrollmentRows(): Promise<EnrollmentRow[]> {
  const result = await getJson<EnrollmentRow[]>("/courses/enrollments/all", true);
  return Array.isArray(result) ? result : [];
}

/** Owner-only on the backend; never removes enrollments. */
export async function setCourseVisibility(code: string, visibility: Visibility): Promise<LearnCourse> {
  return updateCourse(code, { visibility } as Partial<CourseInput>) as Promise<LearnCourse>;
}

export async function setCourseEnrollmentOpen(code: string, enrollmentOpen: boolean): Promise<LearnCourse> {
  return updateCourse(code, { enrollmentOpen } as Partial<CourseInput>) as Promise<LearnCourse>;
}

/** Display name of a course's instructor (populated user, else stored name). */
export function instructorName(c: AcademyCourse): string {
  const populated = c.instructorId as unknown;
  if (populated && typeof populated === "object" && "name" in populated) {
    const name = (populated as { name?: unknown }).name;
    if (typeof name === "string" && name) return name;
  }
  return c.instructor || "Fockis Academy";
}

/** Readable short date. */
export function shortDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Lightweight in-memory text search over course name, code, description and instructor. */
export function matchesQuery(c: AcademyCourse, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [c.name, c.code, c.description, instructorName(c)].some((v) => typeof v === "string" && v.toLowerCase().includes(needle));
}

/**
 * Admin stats. The backend serves them at /academy/admin/stats and
 * /academy/admin/recent-activity (DashboardController); academyApi.ts asks
 * for /academy/stats and /academy/activity/recent. Try the old paths first,
 * then the real ones, so the admin dashboard works with either.
 */
export async function getAdminStats(): Promise<AcademyStats> {
  try {
    return await getAcademyStats();
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status !== 404) throw e;
    const raw = await getJson<Partial<AcademyStats>>("/admin/stats", true);
    return { programs: 0, courses: 0, enrollments: 0, faculty: 0, instructors: 0, students: 0, events: 0, news: 0, applications: 0, pendingApplications: 0, jobs: 0, jobApplications: 0, contactMessages: 0, newContactMessages: 0, users: 0, messages: 0, admissions: 0, ...raw };
  }
}

export async function getAdminActivity(limit = 8): Promise<ActivityItem[]> {
  try {
    return await getRecentActivity(limit);
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status !== 404) throw e;
    const raw = await getJson<ActivityItem[]>(`/admin/recent-activity?limit=${limit}`, true);
    return Array.isArray(raw) ? raw : [];
  }
}
