import { buildFockisUploadUrl } from "../../../config/fockisConfig";
import { buildMediaUrl } from "../../../utils/fockisFeedHelpers";

import type { FockisEvent } from "../types/event.types";

/**
 * Event covers are written by Multer to ./uploads/events and served by the
 * API's static /uploads handler, so they resolve to
 * <API origin>/uploads/events/<file>. (The feed's buildMediaUrl is not used
 * here: it rewrites /uploads paths to the single-segment /post-media/:file
 * gateway, which cannot serve files in a sub-folder.) Absolute URLs,
 * blob: and data: previews pass through unchanged.
 */
export function eventMediaUrl(path?: string | null): string {
  return path ? buildFockisUploadUrl(path) : "";
}

/** Profile pictures use the same resolver as post headers. */
export function avatarUrl(path?: string | null): string {
  return path ? buildMediaUrl(path) : "";
}

export function eventCover(event: Pick<FockisEvent, "coverMediaType" | "coverImageUrl" | "coverVideoUrl">) {
  if (event.coverMediaType === "video" && event.coverVideoUrl) {
    return { type: "video" as const, url: eventMediaUrl(event.coverVideoUrl) };
  }

  if (event.coverImageUrl) {
    return { type: "image" as const, url: eventMediaUrl(event.coverImageUrl) };
  }

  return { type: "none" as const, url: "" };
}

export function eventPlace(event: Pick<FockisEvent, "isOnline" | "locationName" | "address">): string {
  if (event.isOnline) return "Online event";

  return event.locationName || event.address || "Location to be announced";
}

export function eventUrl(id: string): string {
  return `/events/${encodeURIComponent(id)}`;
}

export function absoluteEventUrl(id: string): string {
  if (typeof window === "undefined") return eventUrl(id);

  return `${window.location.origin}${eventUrl(id)}`;
}
