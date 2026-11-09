/**
 * Fockis Academy — Creator Studio + learner API (apps/api/src/academy/studio).
 *
 *   /academy/studio/*  any signed-in Academy account publishes courses, seminars,
 *                      workshops and live classes (free or paid)
 *   /academy/learn/*   course page, free enrollment, paid checkout hand-off,
 *                      lesson progress, quizzes, protected files
 *
 * Uses only the Academy token ("academyToken"), never the main Fockis token.
 * Payments go through the existing Fockis checkout (features/payments).
 */
import { getAcademyApiBaseUrl } from "./academyApi";
import { academyToken } from "./academySession";

export type Kind = "course" | "seminar" | "live_class" | "workshop";
export type LessonType = "video" | "pdf" | "text" | "quiz" | "live" | "assignment";
export type Level = "beginner" | "intermediate" | "advanced" | "all";
export type Visibility = "public" | "hidden" | "private" | "draft" | "school";

export const KIND_LABEL: Record<Kind, string> = {
  course: "Course",
  seminar: "Seminar",
  live_class: "Live class",
  workshop: "Workshop",
};
export const LESSON_LABEL: Record<LessonType, string> = {
  video: "Video",
  pdf: "PDF",
  text: "Reading",
  quiz: "Test",
  live: "Live session",
  assignment: "Homework",
};
export const LESSON_ICON: Record<LessonType, string> = {
  video: "play",
  pdf: "file",
  text: "book",
  quiz: "quiz",
  live: "video",
  assignment: "clipboard",
};

export interface QuizQuestion {
  prompt: string;
  options: string[];
  answer: number;
  explain?: string;
}

export interface EditorLesson {
  key?: string;
  title: string;
  type: LessonType;
  preview?: boolean;
  durationMin?: number;
  startsAt?: string;
  /** Homework: hand-in deadline (ISO). */
  dueAt?: string;
  section?: string;
  videoUrl?: string;
  storageKey?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  body?: string;
  quiz?: { passPct: number; questions: QuizQuestion[] };
  joinUrl?: string;
  recordingUrl?: string;
}

export interface StudioCourse {
  _id?: string;
  code: string;
  name: string;
  kind: Kind;
  brandName?: string;
  category?: string;
  level?: Level;
  language?: string;
  summary?: string;
  description?: string;
  coverUrl?: string;
  isFree: boolean;
  price: number;
  currency: string;
  startsAt?: string;
  capacity?: number;
  visibility: Visibility;
  enrollmentOpen: boolean;
  certificateEnabled?: boolean;
  certificateTemplateId?: string;
  /** Offered by one of the creator's approved schools. */
  institutionId?: string;
  /** The school teacher who teaches it. */
  teacherKey?: string;
  teacherName?: string;
  lessons: EditorLesson[];
  learners?: number;
  completed?: number;
  revenue?: Record<string, number>;
  updatedAt?: string;
  createdAt?: string;
  /** Taken down by Fockis (admin center). Hidden and closed to new learners. */
  takenDown?: boolean;
  takenDownReason?: string;
}

export type StudioSave = Partial<Omit<StudioCourse, "code" | "lessons" | "_id" | "learners" | "completed" | "revenue">> & {
  lessons?: EditorLesson[];
  clearCertificateTemplate?: boolean;
  clearInstitution?: boolean;
};

export interface QuizResult {
  lessonKey: string;
  score: number;
  passed: boolean;
  attempts: number;
  at: string;
}

export interface EnrollmentSummary {
  enrollmentId: string;
  enrollmentNumber?: string;
  progress: number;
  grade?: string;
  completedLessonKeys: string[];
  completedModuleOrders?: number[];
  quizResults: QuizResult[];
  accessType: "free" | "paid" | "granted";
  completedAt?: string;
  certificateId?: string;
  certificate?: { certificateNumber?: string; verificationId?: string } | null;
}

export interface PageLesson {
  key: string;
  order: number;
  title: string;
  type: LessonType;
  preview: boolean;
  durationMin?: number;
  startsAt?: string;
  dueAt?: string;
  section?: string;
  locked: boolean;
  videoUrl?: string;
  hasFile?: boolean;
  fileName?: string;
  mimeType?: string;
  body?: string;
  joinUrl?: string;
  recordingUrl?: string;
  quiz?: { passPct: number; questions: { prompt: string; options: string[] }[] };
}

export interface CoursePage {
  code: string;
  name: string;
  kind: Kind;
  brandName?: string;
  category?: string;
  level?: Level;
  language?: string;
  summary?: string;
  description?: string;
  coverUrl?: string;
  isFree: boolean;
  price: number;
  currency: string;
  startsAt?: string;
  capacity: number;
  seatsLeft: number | null;
  visibility: Visibility;
  enrollmentOpen: boolean;
  certificateEnabled: boolean;
  /** Verified school offering the class. */
  school: { name: string; slug: string; verified: boolean } | null;
  /** Only that school's students can join. */
  membersOnly: boolean;
  /** The school teacher who teaches this class. */
  teacher: {
    name: string;
    title?: string;
    department?: string;
    bio?: string;
    photoUrl?: string;
    /** Only for enrolled students, and only if the school allows contact. */
    contact?: { email?: string; phone?: string; officeHours?: string; meetingUrl?: string } | null;
  } | null;
  instructor: string;
  instructorId: string;
  learners: number;
  totalMinutes: number;
  updatedAt?: string;
  modules: { order: number; title: string }[];
  lessons: PageLesson[];
  access: {
    signedIn: boolean;
    isOwner: boolean;
    /** Academy administrator/staff looking at someone else's class: can review, not edit. */
    staffView?: boolean;
    enrolled: boolean;
    canEnroll: boolean;
    reason?: string;
    enrollment: EnrollmentSummary | null;
  };
}

export interface CheckoutInfo {
  purpose: string;
  referenceId: string;
  amount: number;
  currency: string;
  title: string;
  kind: Kind;
  provider: string;
  coverUrl?: string;
  metadata: Record<string, string>;
}

export interface Learner {
  enrollmentId: string;
  enrollmentNumber?: string;
  name: string;
  email?: string;
  enrolledAt?: string;
  progress: number;
  completedAt?: string;
  accessType: string;
  paidAmount?: number;
  paidCurrency?: string;
  certificateId?: string;
  quizzes: (QuizResult | null)[];
}

export interface MyLearningItem extends EnrollmentSummary {
  code: string;
  name: string;
  kind: Kind;
  brandName?: string;
  instructor: string;
  coverUrl?: string;
  lessons: number;
  nextLesson: { key: string; title: string; type: LessonType } | null;
  nextLive: { key: string; title: string; startsAt: string } | null;
}

export class StudioError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Lesson and homework files come back as a link to the Academy API itself
 * ("/learn/media/<signed token>"), which streams the file. Make it a full
 * address so <video>, <iframe> and downloads load it from the API server.
 */
function withFullUrl<T extends { url: string }>(r: T): T {
  if (!r?.url || /^https?:\/\//i.test(r.url)) return r;
  const base = getAcademyApiBaseUrl().replace(/\/+$/, "");
  return { ...r, url: `${base}${r.url.startsWith("/") ? "" : "/"}${r.url}` };
}

async function call<T>(path: string, init: RequestInit = {}, auth: "required" | "optional" = "required"): Promise<T> {
  const headers = new Headers(init.headers);
  const token = academyToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else if (auth === "required") throw new StudioError("Please sign in to your Academy account.", 401);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const res = await fetch(`${getAcademyApiBaseUrl()}${path}`, { ...init, headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const m = data?.message;
    throw new StudioError(Array.isArray(m) ? m.join(", ") : m || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

const enc = encodeURIComponent;
const json = (body: unknown) => JSON.stringify(body);

// ---------------------------------------------------------------- creator
export const studioApi = {
  mine: () => call<StudioCourse[]>("/studio/courses"),
  /** Schools I own or work for (only approved ones can offer classes). */
  schools: () =>
    call<{ _id: string; name: string; slug: string; status: string; teachers: { key: string; name: string; title?: string; department?: string }[] }[]>("/studio/schools"),
  create: (body: StudioSave) => call<StudioCourse>("/studio/courses", { method: "POST", body: json(body) }),
  get: (code: string) => call<StudioCourse>(`/studio/courses/${enc(code)}`),
  update: (code: string, body: StudioSave) => call<StudioCourse>(`/studio/courses/${enc(code)}`, { method: "PATCH", body: json(body) }),
  remove: (code: string) => call<{ deleted?: boolean; archived?: boolean; learners?: number }>(`/studio/courses/${enc(code)}`, { method: "DELETE" }),
  learners: (code: string) => call<Learner[]>(`/studio/courses/${enc(code)}/learners`),
};

export interface UploadResult {
  storageKey: string;
  fileName: string;
  mimeType: string;
  size: number;
  url?: string;
}

/** Upload with progress (XHR, so large videos show a progress bar). */
export function uploadStudioFile(file: File, kind: "video" | "pdf" | "image", onProgress?: (pct: number) => void): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const token = academyToken();
    if (!token) return reject(new StudioError("Please sign in to your Academy account.", 401));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${getAcademyApiBaseUrl()}/studio/upload?kind=${kind}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: { message?: string | string[] } & Partial<UploadResult> = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as UploadResult);
      else {
        const m = data?.message;
        reject(new StudioError(Array.isArray(m) ? m.join(", ") : m || `Upload failed (${xhr.status})`, xhr.status));
      }
    };
    xhr.onerror = () => reject(new StudioError("Upload failed — check your connection.", 0));
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}

// ---------------------------------------------------------------- creator approval
export type CreatorStatus = "none" | "pending" | "approved" | "rejected" | "suspended";

export interface CreatorProfile {
  kind: "person" | "business";
  displayName: string;
  businessName?: string;
  phone?: string;
  country?: string;
  city?: string;
  website?: string;
  topics?: string;
  about: string;
  experience?: string;
  sampleUrl?: string;
}

export interface CreatorAccess {
  status: CreatorStatus;
  trusted: boolean;
  profile: CreatorProfile | null;
  reason: string;
  appliedAt: string | null;
  reviewedAt: string | null;
  /** May create classes under their own name or business. */
  canTeach: boolean;
  /** Approved schools they belong to (may always create classes offered by these). */
  schoolIds: string[];
  canApply: boolean;
}

export const creatorApi = {
  access: () => call<CreatorAccess>("/studio/creator"),
  apply: (body: CreatorProfile) => call<CreatorAccess>("/studio/creator/apply", { method: "POST", body: json(body) }),
};

// ---------------------------------------------------------------- homework
export type SubmissionStatus = "submitted" | "returned" | "graded";

export interface Submission {
  id: string;
  lessonKey: string;
  text: string;
  files: { index: number; fileName: string; mimeType?: string; size?: number }[];
  status: SubmissionStatus;
  grade: string;
  feedback: string;
  attempts: number;
  submittedAt: string;
  gradedAt: string | null;
  gradedByName: string;
  late: boolean;
}

export interface OwnerSubmissions {
  assignments: { key: string; title: string; dueAt: string | null; learners: number; handedIn: number; toReview: number }[];
  items: (Submission & { lessonTitle: string; student: { id: string; name: string; email: string } })[];
}

export const MAX_HOMEWORK_FILES = 3;
export const MAX_HOMEWORK_MB = 25;

export const homeworkApi = {
  /** My hand-in for a homework lesson (null if not handed in yet). */
  mine: (code: string, key: string) => call<Submission | null>(`/learn/${enc(code)}/lessons/${enc(key)}/submission`),
  /** Hand in (or hand in again): text, previous files to keep (by index) and new files. */
  submit: (code: string, key: string, text: string, keep: number[], files: File[]) => {
    const fd = new FormData();
    fd.append("text", text);
    fd.append("keep", keep.join(","));
    files.forEach((f) => fd.append("files", f));
    return call<Submission>(`/learn/${enc(code)}/lessons/${enc(key)}/submission`, { method: "POST", body: fd });
  },
  myFile: (submissionId: string, index: number) => call<{ url: string; fileName: string }>(`/learn/submissions/${enc(submissionId)}/files/${index}`).then(withFullUrl),
  // class owner
  list: (code: string) => call<OwnerSubmissions>(`/studio/courses/${enc(code)}/submissions`),
  review: (code: string, id: string, action: "grade" | "return", grade: string, feedback: string) =>
    call<Submission>(`/studio/courses/${enc(code)}/submissions/${enc(id)}/review`, { method: "POST", body: json({ action, grade, feedback }) }),
  ownerFile: (code: string, id: string, index: number) => call<{ url: string; fileName: string }>(`/studio/courses/${enc(code)}/submissions/${enc(id)}/files/${index}`).then(withFullUrl),
};

// ---------------------------------------------------------------- learner
export const learnApi = {
  page: (code: string) => call<CoursePage>(`/learn/${enc(code)}`, {}, "optional"),
  mine: () => call<MyLearningItem[]>("/learn/mine"),
  enroll: (code: string) => call<EnrollmentSummary>(`/learn/${enc(code)}/enroll`, { method: "POST" }),
  checkout: (code: string) => call<CheckoutInfo>(`/learn/${enc(code)}/checkout`, { method: "POST" }),
  claim: (code: string, paymentIntentId: string) => call<EnrollmentSummary>(`/learn/${enc(code)}/claim`, { method: "POST", body: json({ paymentIntentId }) }),
  complete: (code: string, key: string) => call<EnrollmentSummary>(`/learn/${enc(code)}/lessons/${enc(key)}/complete`, { method: "POST" }),
  quiz: (code: string, key: string, answers: number[]) =>
    call<{ score: number; passed: boolean; passPct: number; correct: number; total: number; results: { correct: boolean; answer: number; explain?: string }[]; enrollment: EnrollmentSummary }>(
      `/learn/${enc(code)}/lessons/${enc(key)}/quiz`,
      { method: "POST", body: json({ answers }) },
    ),
  /** Courses created before the Studio (module list only). */
  completeModule: (code: string, order: number) =>
    call<{ progress: number; completedModuleOrders: number[] }>(`/courses/${enc(code)}/modules/${order}/complete`, { method: "POST" }),
  file: (code: string, key: string, download = false) =>
    call<{ url: string; fileName?: string; mimeType?: string }>(`/learn/${enc(code)}/lessons/${enc(key)}/file${download ? "?download=1" : ""}`, {}, "optional").then(withFullUrl),
};

// ---------------------------------------------------------------- helpers

/** Covers uploaded in the Studio are served by the API's public /uploads/media gateway. */
export function mediaUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  try {
    return new URL(url, getAcademyApiBaseUrl()).href;
  } catch {
    return url;
  }
}

export function formatPrice(isFree: boolean, price: number, currency = "USD"): string {
  if (isFree || !(price > 0)) return "Free";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

export function formatWhen(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function minutesLabel(total: number): string {
  if (!total) return "";
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** YouTube / Vimeo links → embeddable player URL; anything else is played as a file. */
export function embedFor(url: string): { kind: "iframe" | "video"; src: string } {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return { kind: "iframe", src: `https://www.youtube.com/embed/${u.pathname.slice(1)}` };
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop();
      if (id) return { kind: "iframe", src: `https://www.youtube.com/embed/${id}` };
    }
    if (host.endsWith("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id && /^\d+$/.test(id)) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}` };
    }
  } catch {
    /* fall through */
  }
  return { kind: "video", src: url };
}

/** Is the learner also signed in to the main Fockis app (needed to pay)? */
export function hasFockisSession(): boolean {
  try {
    return ["accessToken", "access_token", "token", "authToken"].some((k) => !!localStorage.getItem(k)?.trim());
  } catch {
    return false;
  }
}
