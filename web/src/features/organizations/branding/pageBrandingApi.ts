/**
 * pageBrandingApi.ts
 * -----------------------------------------------------------------------------
 * Client for /church/organizations/:id/page-branding (per-page sidebar
 * thumbnail, banner and logo). The server checks every permission; the
 * `canEdit` flag here only decides which buttons are shown.
 * -----------------------------------------------------------------------------
 */

import { CHURCH_API_BASE, ChurchAuthError, churchPost, churchPut, churchRequest, getAuthToken } from "../api/organizationApi";

export type ThumbAspect = "1:1" | "4:3" | "16:9" | "3:4";
export type BannerAspect = "16:9" | "3:1" | "2:1";
export type ImageShape = "rounded" | "circle" | "square";

export interface BrandImage {
  url: string;
  sourceUrl?: string;
  zoom?: number;
  x?: number;
  y?: number;
  rotate?: number;
  aspect?: string;
  shape?: ImageShape;
}

export interface PageBrandingContent {
  thumbnail?: BrandImage | null;
  logo?: BrandImage | null;
  bannerDesktop?: BrandImage | null;
  bannerMobile?: BrandImage | null;
  showBanner?: boolean;
  bannerHeight?: "small" | "medium" | "large";
  textAlign?: "left" | "center" | "right";
  overlayColor?: string;
  overlayOpacity?: number;
  title?: string;
  subtitle?: string;
  description?: string;
  /** Sidebar background only: image position, scaling, dark overlay on/off. */
  bgPosition?: "top" | "center" | "bottom";
  bgFit?: "cover" | "contain";
  overlay?: boolean;
  /** Dashboard theme only (pageKey "dashboard-theme"). */
  theme?: { primary?: string; secondary?: string; button?: string; navActive?: string; sidebar?: string };
  headerStyle?: "image" | "gradient" | "solid";
  showTagline?: boolean;
}

export interface PublicPageBranding {
  pageKey: string;
  resourceId: string;
  content: PageBrandingContent;
  publishedAt: string | null;
}

export interface ManagedPageBranding {
  pageKey: string;
  resourceId: string;
  draft: PageBrandingContent | null;
  published: PageBrandingContent | null;
  hasPrevious: boolean;
  hasUnpublishedChanges: boolean;
  updatedAt: string | null;
  publishedAt: string | null;
}

const base = (orgId: string) => `/organizations/${encodeURIComponent(orgId)}/page-branding`;

export const pageBrandingApi = {
  published: (orgId: string) =>
    churchRequest<{ items: PublicPageBranding[] }>(base(orgId), { anonymous: true }),

  manage: (orgId: string) => churchRequest<{ canEdit: boolean; items: ManagedPageBranding[] }>(`${base(orgId)}/manage`),

  saveDraft: (orgId: string, pageKey: string, content: PageBrandingContent, resourceId = "") =>
    churchPut<ManagedPageBranding>(`${base(orgId)}/${encodeURIComponent(pageKey)}`, { resourceId, content }),

  publish: (orgId: string, pageKey: string, content?: PageBrandingContent, resourceId = "") =>
    churchPost<ManagedPageBranding>(`${base(orgId)}/${encodeURIComponent(pageKey)}/publish`, content ? { resourceId, content } : { resourceId }),

  restore: (orgId: string, pageKey: string, resourceId = "") =>
    churchPost<ManagedPageBranding>(`${base(orgId)}/${encodeURIComponent(pageKey)}/restore`, { resourceId }),

  discard: (orgId: string, pageKey: string, resourceId = "") =>
    churchPost<ManagedPageBranding | null>(`${base(orgId)}/${encodeURIComponent(pageKey)}/discard`, { resourceId }),

  reset: (orgId: string, pageKey: string, resourceId = "") =>
    churchPost<ManagedPageBranding | null>(`${base(orgId)}/${encodeURIComponent(pageKey)}/reset`, { resourceId }),

  /** Upload one image (the original or a cropped result). */
  upload(orgId: string, file: Blob, fileName: string, onProgress?: (percent: number) => void): Promise<{ fileUrl: string }> {
    const token = getAuthToken();
    if (!token) return Promise.reject(new ChurchAuthError("Your Fockis session is missing. Please sign in again."));
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${CHURCH_API_BASE}${base(orgId)}/upload`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let body: { fileUrl?: string; message?: string | string[] } = {};
        try {
          body = JSON.parse(xhr.responseText || "{}");
        } catch {
          /* not JSON */
        }
        if (xhr.status >= 200 && xhr.status < 300 && body.fileUrl) resolve({ fileUrl: body.fileUrl });
        else {
          const m = Array.isArray(body.message) ? body.message.join(" ") : body.message;
          reject(new Error(m || (xhr.status === 413 ? "That image is too large (max 15 MB)." : "The image could not be uploaded.")));
        }
      };
      xhr.onerror = () => reject(new Error("Unable to reach the Organizations server."));
      const form = new FormData();
      form.append("file", file, fileName);
      xhr.send(form);
    });
  },
};

/* ------------------------------------------------------------- page keys */

/**
 * The page identifier for a route, derived from the route itself so any page
 * added to a menu later gets its own thumbnail/banner without code changes:
 *   /organizations/ID/admin/members → "admin-members"
 *   /organizations/ID/attendance    → "attendance"
 *   /organizations/ID               → "home"
 */
export function pageKeyFromPath(to: string, organizationId: string): string {
  const path = to.split("#")[0].split("?")[0];
  const ids = [organizationId, encodeURIComponent(organizationId), encodeURIComponent(encodeURIComponent(organizationId))];
  let rest = path;
  for (const id of ids) rest = rest.split(`/organizations/${id}`).join("");
  const slug = rest
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
  return slug || "home";
}

export const BRANDING_ERROR = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;
