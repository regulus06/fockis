import { publicSiteUrl } from "./siteUrl";
/**
 * Fockis Academy certificates API (apps/api/src/academy/certificates).
 * Uses the same base URL and Academy login token as academyApi.ts.
 */
import { getAcademyApiBaseUrl, getStoredToken } from "./academyApi";
import type { CertData, CertDesign } from "../components/academy/certificates/certificateDesign";

export class CertApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  const token = auth ? getStoredToken() : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${getAcademyApiBaseUrl()}/certificates${path}`, { ...init, headers });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const b = await res.json();
      msg = Array.isArray(b?.message) ? b.message.join(", ") : b?.message || msg;
    } catch {
      /* ignore */
    }
    throw new CertApiError(msg, res.status);
  }
  return res.json() as Promise<T>;
}

export interface CertTemplate {
  _id: string;
  name: string;
  baseTemplate: string;
  design: CertDesign;
  status: "draft" | "published";
  updatedAt?: string;
}

export interface IssuedCert {
  _id: string;
  certificateNumber: string;
  verificationId: string;
  templateId: string;
  design: CertDesign;
  studentId?: string;
  enrollmentNumber?: string;
  recipientName: string;
  recipientEmail?: string;
  activityType: "course" | "seminar" | "workshop";
  activityRef: string;
  activityName: string;
  instructorName: string;
  institutionName?: string;
  duration?: string;
  finalGrade?: string;
  completionDate: string;
  issuedAt: string;
  status: "valid" | "revoked";
  history?: { action: string; reason?: string; byName?: string; at: string }[];
}

export interface RosterStudent {
  enrollmentId: string;
  enrollmentNumber?: string;
  studentId: string;
  name: string;
  email: string;
  progress: number;
  grade?: string;
  eligible: boolean;
  certificateNumber: string | null;
}

export interface VerifyResult {
  kind: "certificate" | "enrollment";
  status: "valid" | "revoked";
  certificateNumber?: string;
  verificationId?: string;
  recipientName: string;
  activityType: string;
  activityName: string;
  instructorName?: string;
  institutionName?: string;
  enrollmentNumber?: string | null;
  completionDate?: string;
  issuedAt?: string;
  revokedAt?: string | null;
  revokedReason?: string | null;
  design?: CertDesign;
  courseCode?: string;
  progress?: number;
  enrolledAt?: string | null;
  certificates?: { certificateNumber: string; status: string }[];
}

export const listTemplates = () => call<CertTemplate[]>("/templates");
export const getTemplate = (id: string) => call<CertTemplate>(`/templates/${encodeURIComponent(id)}`);
export const createTemplate = (body: { name: string; baseTemplate: string; design: CertDesign; status?: string }) => call<CertTemplate>("/templates", { method: "POST", body: JSON.stringify(body) });
export const updateTemplate = (id: string, body: Partial<{ name: string; baseTemplate: string; design: CertDesign; status: string }>) => call<CertTemplate>(`/templates/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
export const duplicateTemplate = (id: string) => call<CertTemplate>(`/templates/${encodeURIComponent(id)}/duplicate`, { method: "POST" });
export const deleteTemplate = (id: string) => call<{ deleted: boolean }>(`/templates/${encodeURIComponent(id)}`, { method: "DELETE" });

export const getRoster = (courseCode: string) => call<{ course: { code: string; name: string }; students: RosterStudent[] }>(`/roster/${encodeURIComponent(courseCode)}`);
export const issueCertificates = (body: {
  templateId: string;
  activityType: "course" | "seminar" | "workshop";
  activityRef: string;
  activityName?: string;
  completionDate?: string;
  institutionName?: string;
  duration?: string;
  recipients: { enrollmentId?: string; name?: string; email?: string }[];
}) => call<{ issued: IssuedCert[]; skipped: string[] }>("/issue", { method: "POST", body: JSON.stringify(body) });
export const listIssued = () => call<IssuedCert[]>("/issued");
export const revokeCertificate = (id: string, reason: string) => call<IssuedCert>(`/${encodeURIComponent(id)}/revoke`, { method: "PATCH", body: JSON.stringify({ reason }) });
export const restoreCertificate = (id: string) => call<IssuedCert>(`/${encodeURIComponent(id)}/restore`, { method: "PATCH" });

export const myCertificates = () => call<IssuedCert[]>("/mine");
export const verifyCode = (code: string) => call<VerifyResult>(`/verify/${encodeURIComponent(code.trim())}`, {}, false);

/** Public verification link printed in the QR code. */
export function verificationUrl(verificationId: string) {
  return `${publicSiteUrl()}/academy/verify/${encodeURIComponent(verificationId)}`;
}

const fmtDate = (iso?: string) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "";
};

/** Variable values for an issued certificate (what {{…}} becomes). */
export function certData(c: Pick<IssuedCert, "recipientName" | "activityName" | "activityType" | "instructorName" | "institutionName" | "completionDate" | "issuedAt" | "certificateNumber" | "verificationId" | "enrollmentNumber" | "duration" | "finalGrade">): CertData {
  return {
    student_name: c.recipientName,
    course_name: c.activityName,
    activity_type: c.activityType,
    instructor_name: c.instructorName ?? "",
    institution_name: c.institutionName || "Fockis Academy",
    completion_date: fmtDate(c.completionDate),
    issue_date: fmtDate(c.issuedAt),
    certificate_number: c.certificateNumber ?? "",
    verification_id: c.verificationId ?? "",
    verification_url: c.verificationId ? verificationUrl(c.verificationId) : "",
    enrollment_number: c.enrollmentNumber ?? "",
    duration: c.duration ?? "",
    final_grade: c.finalGrade ?? "",
  };
}
