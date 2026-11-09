/**
 * mediaApi.ts
 * -----------------------------------------------------------------------------
 * Documents & Media library. Mirrors
 * apps/api/src/org/media/controllers/church-media.controller.ts.
 *
 * A media item points either at a file uploaded to Fockis
 * (POST …/media/upload, then create with the returned fileUrl) or at an
 * external web link (YouTube, Vimeo, Google Drive…).
 * -----------------------------------------------------------------------------
 */

import {
  CHURCH_API_BASE,
  ChurchApiError,
  ChurchAuthError,
  churchDelete,
  churchGet,
  churchPatch,
  churchPost,
  getAuthToken,
} from "./organizationApi";

export type MediaKind = "photo" | "video" | "audio" | "document";
export type MediaVisibility = "public" | "members" | "private";
export type MediaCategory =
  | "sermon"
  | "message"
  | "presentation"
  | "training"
  | "event"
  | "worship"
  | "resource"
  | "announcement"
  | "other";

export interface MediaItem {
  id: string;
  organizationId: string;
  mediaType: MediaKind;
  category: MediaCategory | null;
  visibility: MediaVisibility;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  fileUrl: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  durationSeconds: number | null;
  speaker: string;
  featured: boolean;
  published: boolean;
  publishedAt: string | null;
  createdAt: string | null;
  tags: string[];
}

export interface MediaList {
  items: MediaItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  canManage?: boolean;
}

export interface MediaInput {
  title: string;
  mediaType: MediaKind;
  fileUrl: string;
  description?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  speaker?: string;
  tags?: string[];
  category?: MediaCategory;
  visibility?: MediaVisibility;
  published?: boolean;
  featured?: boolean;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}

export interface UploadedMedia {
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  mediaType: MediaKind;
}

const base = (orgId: string) => `/organizations/${encodeURIComponent(orgId)}/media`;

export const MEDIA_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

export const MEDIA_MAX_BYTES = 500 * 1024 * 1024;

export function listMedia(
  organizationId: string,
  query: { page?: number; pageSize?: number; search?: string; mediaType?: string; category?: string; status?: string } = {},
  signal?: AbortSignal,
): Promise<MediaList> {
  return churchGet<MediaList>(
    base(organizationId),
    {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search || undefined,
      mediaType: query.mediaType || undefined,
      category: query.category || undefined,
      status: query.status || undefined,
    },
    signal,
  );
}

export function createMedia(organizationId: string, input: MediaInput): Promise<MediaItem> {
  return churchPost<MediaItem>(base(organizationId), input);
}

export function updateMedia(organizationId: string, mediaId: string, input: Partial<MediaInput>): Promise<MediaItem> {
  return churchPatch<MediaItem>(`${base(organizationId)}/${encodeURIComponent(mediaId)}`, input);
}

export function deleteMedia(organizationId: string, mediaId: string): Promise<void> {
  return churchDelete<void>(`${base(organizationId)}/${encodeURIComponent(mediaId)}`);
}

/**
 * Uploads one file with progress (0–100). Uses XMLHttpRequest because fetch
 * cannot report upload progress.
 */
export function uploadMediaFile(
  organizationId: string,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<UploadedMedia> {
  const token = getAuthToken();
  if (!token) return Promise.reject(new ChurchAuthError("Your Fockis session is missing. Please sign in again."));

  return new Promise<UploadedMedia>((resolvePromise, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${CHURCH_API_BASE}${base(organizationId)}/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText || "null");
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolvePromise(body as UploadedMedia);
        return;
      }
      const raw = (body as { message?: string | string[] } | null)?.message;
      const message = Array.isArray(raw) ? raw.join(" ") : raw || (xhr.status === 413 ? "That file is too large." : "The file could not be uploaded.");
      reject(xhr.status === 401 ? new ChurchAuthError(message) : new ChurchApiError(message, xhr.status));
    };
    xhr.onerror = () => reject(new ChurchApiError("The upload was interrupted. Check your connection and try again.", 0));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort());

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

/** Guess the media type of a web link. */
export function kindFromUrl(url: string): MediaKind | null {
  const u = url.trim().toLowerCase();
  if (!u) return null;
  if (/youtube\.com|youtu\.be|vimeo\.com|\.(mp4|webm|mov)(\?|$)/.test(u)) return "video";
  if (/soundcloud\.com|spotify\.com|\.(mp3|m4a|wav|ogg)(\?|$)/.test(u)) return "audio";
  if (/\.(jpe?g|png|webp|gif|heic)(\?|$)/.test(u)) return "photo";
  if (/\.(pdf|docx?|pptx?|xlsx?|txt|csv)(\?|$)|docs\.google\.com|drive\.google\.com/.test(u)) return "document";
  return null;
}

/** YouTube / Vimeo embed address, or null. */
export function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${encodeURIComponent(u.pathname.slice(1))}`;
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v") ?? (u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2] : null);
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

/** YouTube thumbnail for a link, when there is one. */
export function youtubeThumbnail(url: string): string | null {
  const e = embedUrl(url);
  const m = e && /youtube\.com\/embed\/([^/?]+)/.exec(e);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

export function formatBytes(n?: number | null): string {
  if (!n) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export function formatDuration(seconds?: number | null): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
