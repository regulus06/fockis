/**
 * badgeApi.ts
 * -----------------------------------------------------------------------------
 * Member badges (ID cards). These routes live at the API root, not under
 * /church:
 *
 *   GET  /organizations/:id/badges/me
 *   GET  /organizations/:id/badges/design          PUT (admin)
 *   GET  /organizations/:id/badges?q=&page=        (admin)
 *   POST /organizations/:id/badges/issue-all       (admin)
 *   GET  /organizations/:id/badges/members/:membershipId
 *   POST /organizations/:id/badges/members/:membershipId/rebuild (admin)
 *   GET  /badges/verify/:token                     (public)
 * -----------------------------------------------------------------------------
 */

import { CHURCH_API_BASE, ChurchApiError, ChurchAuthError, getAuthToken } from "../api/organizationApi";

export type BadgeTemplate = "official" | "classic" | "modern" | "minimal" | "bold";

export const BADGE_TEMPLATES: { id: BadgeTemplate; name: string; description: string }[] = [
  { id: "official", name: "Official", description: "Upright ID card with blue waves, a large photo, the ministry and the QR code. Same design as My Badge." },
  { id: "classic", name: "Classic", description: "Upright card with a coloured header, photo in the middle and the QR code below." },
  { id: "modern", name: "Modern", description: "Wide card: photo on the left, details in the middle, QR code on the right." },
  { id: "minimal", name: "Minimal", description: "White card with a thin colour stripe and a large QR code. Prints well in black and white." },
  { id: "bold", name: "Event pass", description: "Full-colour lanyard pass with a punch hole, big name and a white QR panel." },
];

export interface Badge {
  id: string;
  organizationId: string;
  membershipId: string;
  userId: string;
  memberNumber: string;
  displayName: string;
  avatarUrl: string | null;
  organizationName: string;
  organizationLogoUrl: string | null;
  organizationType: string | null;
  role: string;
  status: string;
  joinedAt: string | null;
  departmentNames: string[];
  groupNames: string[];
  verifyToken: string | null;
  memberDomain: string | null;
  active: boolean;
  issuedAt: string;
  /* Added with the official badge (older API responses leave them out). */
  memberName?: string;
  customName?: string | null;
  customTitle?: string | null;
  ministryName?: string | null;
  ministry?: string | null;
  organizationLocation?: string | null;
  organizationBannerUrl?: string | null;
  badgeStatus?: BadgeAdminStatus;
  statusReason?: string | null;
  statusChangedAt?: string | null;
  expiresAt?: string | null;
  verifyState?: BadgeVerifyState;
  tokenIssuedAt?: string | null;
  photo?: BadgePhotoSettings | null;
  access?: BadgeAccess;
}

export type BadgeAdminStatus = "active" | "suspended" | "revoked";
export type BadgeVerifyState = "verified" | "pending" | "suspended" | "membership_inactive" | "revoked" | "expired" | "not_member";
export type PhotoShape = "circle" | "rounded" | "square" | "rectangle" | "oval" | "custom";

export interface BadgePhotoSettings {
  originalUrl?: string | null;
  shape: PhotoShape;
  /** custom shape: corner radius in % of the shorter side (0–50) */
  cornerRadius: number;
  x: number;
  y: number;
  zoom: number;
  rotation: number;
  aspect: number;
  fit: "fill" | "fit";
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  outputWidth: number;
  outputHeight: number;
}

export interface BadgeAccess {
  isSelf: boolean;
  canEdit: boolean;
  canEditPhoto: boolean;
  canManageStatus: boolean;
}

export interface BadgeManageView {
  badge: Badge;
  history: { at: string; action: string; note: string; actorName: string }[];
  verifications: { id: string; at: string; result: BadgeVerifyState; device: string }[];
  ministryOptions: string[];
}

export interface BadgeDesign {
  template: BadgeTemplate;
  accentColor: string;
  badgeTitle: string;
  numberPrefix: string;
  effectivePrefix?: string;
  showRole: boolean;
  showMemberSince: boolean;
  showDepartments: boolean;
  showGroups: boolean;
  showMemberDomain: boolean;
  footerText: string;
  allowMemberPhotoEdit?: boolean;
  showPhotoOnVerify?: boolean;
  showMinistryOnVerify?: boolean;
  canEdit?: boolean;
}

export const DEFAULT_DESIGN: BadgeDesign = {
  template: "official",
  accentColor: "#005a8d",
  badgeTitle: "Member",
  numberPrefix: "",
  showRole: true,
  showMemberSince: true,
  showDepartments: true,
  showGroups: false,
  showMemberDomain: false,
  footerText: "",
  allowMemberPhotoEdit: true,
  showPhotoOnVerify: true,
  showMinistryOnVerify: true,
};

export interface BadgeCheck {
  valid: boolean;
  displayName: string;
  avatarUrl: string | null;
  memberNumber: string;
  role: string;
  organizationId: string;
  organizationName: string;
  organizationLogoUrl: string | null;
  organizationType: string | null;
  memberSince: string | null;
  issuedAt: string;
  checkedAt: string;
  state?: BadgeVerifyState;
  tone?: "green" | "yellow" | "red";
  title?: string | null;
  membershipType?: string;
  ministry?: string | null;
  photoShape?: PhotoShape;
  organizationLocation?: string | null;
  expiresAt?: string | null;
}

/** API root: the /church base without "/church". */
const ROOT = CHURCH_API_BASE.replace(/\/church\/?$/, "");

async function call<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (auth) {
    const token = getAuthToken();
    if (!token) throw new ChurchAuthError("Sign in to continue.");
    headers.Authorization = `Bearer ${token}`;
  }
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  const payload = body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body);
  const res = await fetch(ROOT + path, { method, headers, body: payload });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message = (Array.isArray(data?.message) ? data.message[0] : data?.message) || `Request failed (${res.status}).`;
    if (res.status === 401) throw new ChurchAuthError(message);
    throw new ChurchApiError(message, res.status);
  }
  return data as T;
}

const org = (id: string) => `/organizations/${encodeURIComponent(id)}/badges`;

export const badgeApi = {
  mine: (organizationId: string) => call<Badge>("GET", `${org(organizationId)}/me`),
  design: (organizationId: string) => call<BadgeDesign>("GET", `${org(organizationId)}/design`),
  saveDesign: (organizationId: string, design: Partial<BadgeDesign>) => call<BadgeDesign>("PUT", `${org(organizationId)}/design`, design),
  list: (organizationId: string, q = "", page = 1, pageSize = 24) =>
    call<{ items: Badge[]; total: number; page: number; pageSize: number; hasMore: boolean }>(
      "GET",
      `${org(organizationId)}?page=${page}&pageSize=${pageSize}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    ),
  issueAll: (organizationId: string) => call<{ issued: number; total: number }>("POST", `${org(organizationId)}/issue-all`),
  member: (organizationId: string, membershipId: string) => call<Badge | null>("GET", `${org(organizationId)}/members/${encodeURIComponent(membershipId)}`),
  rebuild: (organizationId: string, membershipId: string) => call<Badge>("POST", `${org(organizationId)}/members/${encodeURIComponent(membershipId)}/rebuild`),
  uploadPhoto: (organizationId: string, membershipId: string, file: File, extra?: { original?: File | null; settings?: Omit<BadgePhotoSettings, "originalUrl"> }) => {
    const form = new FormData();
    form.append("file", file);
    if (extra?.original) form.append("original", extra.original);
    if (extra?.settings) form.append("settings", JSON.stringify(extra.settings));
    return call<{ avatarUrl: string; badge: Badge | null }>("POST", `${org(organizationId)}/members/${encodeURIComponent(membershipId)}/photo`, form);
  },
  manage: (organizationId: string, membershipId: string) =>
    call<BadgeManageView>("GET", `${org(organizationId)}/members/${encodeURIComponent(membershipId)}/manage`),
  updateDetails: (
    organizationId: string,
    membershipId: string,
    body: { customName?: string | null; customTitle?: string | null; ministryName?: string | null; expiresAt?: string | null },
  ) => call<Badge>("PATCH", `${org(organizationId)}/members/${encodeURIComponent(membershipId)}`, body),
  setStatus: (organizationId: string, membershipId: string, action: "suspend" | "revoke" | "reactivate", reason = "") =>
    call<Badge>("POST", `${org(organizationId)}/members/${encodeURIComponent(membershipId)}/status`, { action, reason }),
  regenerateQr: (organizationId: string, membershipId: string) =>
    call<Badge>("POST", `${org(organizationId)}/members/${encodeURIComponent(membershipId)}/regenerate-qr`),
  removePhoto: (organizationId: string, membershipId: string) =>
    call<{ avatarUrl: null; badge: Badge | null }>("DELETE", `${org(organizationId)}/members/${encodeURIComponent(membershipId)}/photo`),
  verify: (token: string) => call<BadgeCheck>("GET", `/badges/verify/${encodeURIComponent(token)}`, undefined, false),
};

/** Link encoded in the QR code. Uses the address the app is opened from. */
export function badgeVerifyUrl(token: string | null | undefined): string {
  if (!token) return "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/verify/church-member/${encodeURIComponent(token)}`;
}

export const VERIFY_STATE_LABEL: Record<BadgeVerifyState, string> = {
  verified: "Active",
  pending: "Pending",
  suspended: "Suspended",
  membership_inactive: "Inactive",
  revoked: "Revoked",
  expired: "Expired",
  not_member: "Not a member",
};

export const VERIFY_STATE_TONE: Record<BadgeVerifyState, "green" | "yellow" | "red"> = {
  verified: "green",
  pending: "yellow",
  suspended: "yellow",
  membership_inactive: "yellow",
  revoked: "red",
  expired: "red",
  not_member: "red",
};

/** Photos uploaded for a badge are served by the API (/badges/photos/…); other photo links are used as they are. */
export function badgePhotoSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("/badges/photos/") ? ROOT + url : url;
}

export const BADGE_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const BADGE_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
/** The photo editor takes these (GIF animations can't be cropped). */
export const BADGE_EDITOR_ACCEPT = "image/jpeg,image/png,image/webp";
