/**
 * ministryApi.ts
 * -----------------------------------------------------------------------------
 * Data for the ministry page (/organizations/:organizationId/ministries/:id).
 *
 *   GET  …/public-ministries/:id/overview   public, published data only
 *   PATCH …/departments/:id                  schedule, leader titles, banner
 *   POST …/events                            ministry event (departmentId)
 *   POST …/announcements                     ministry announcement
 *   POST …/media/upload + POST …/media       photos and Bible studies, tagged
 *                                            "ministry:<id>" so they show here
 * -----------------------------------------------------------------------------
 */

import { churchPatch, churchPost, churchRequest, getAuthToken } from "../api/organizationApi";
import { createMedia, uploadMediaFile, type MediaKind } from "../api/mediaApi";
import type { PublicMinistryDetail } from "../website/publicSiteApi";

export interface MinistryMeeting {
  name: string;
  /** Display text ("Sundays"), generated from the structured fields below. */
  day: string;
  /** Display text ("1:00 PM"). */
  startTime: string;
  endTime: string;
  location: string;
  /* Structured schedule — one attendance session per meeting date. */
  key?: string;
  frequency?: "" | "once" | "weekly" | "biweekly" | "monthly";
  weekdays?: number[];
  anchorDate?: string;
  endDate?: string;
  /** 24-hour "HH:mm" in timeZone. */
  startClock?: string;
  endClock?: string;
  timeZone?: string;
  attendance?: boolean;
}

export interface MinistryLeader {
  membershipId: string;
  displayName: string;
  avatarUrl: string | null;
  title: string;
}

export interface MinistryEventItem {
  id: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  location: string;
  isOnline: boolean;
  coverImageUrl: string | null;
  requiresRsvp: boolean;
}

export interface MinistryAnnouncementItem {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  publishedAt: string | null;
}

export interface MinistryPhoto {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string | null;
}

export interface MinistryStudy {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  speaker: string;
  mediaType: string;
  publishedAt: string | null;
}

export interface MinistryOverview {
  ministry: PublicMinistryDetail;
  stats: { members: number; leaders: number; upcomingEvents: number; bibleStudies: number; averageAttendance: number | null };
  leaders: MinistryLeader[];
  meetingSchedule: MinistryMeeting[];
  events: MinistryEventItem[];
  announcements: MinistryAnnouncementItem[];
  photos: MinistryPhoto[];
  studies: MinistryStudy[];
}

const org = (id: string) => `/organizations/${encodeURIComponent(id)}`;
export const ministryTag = (ministryId: string) => `ministry:${ministryId}`;

export function getMinistryOverview(organizationId: string, ministryId: string, signal?: AbortSignal): Promise<MinistryOverview> {
  // Signed-in members also see members-only ministries (the server decides).
  return churchRequest<MinistryOverview>(`${org(organizationId)}/public-ministries/${encodeURIComponent(ministryId)}/overview`, {
    signal,
    anonymous: !getAuthToken(),
  });
}

export function saveMinistrySchedule(organizationId: string, ministryId: string, meetingSchedule: MinistryMeeting[]) {
  return churchPatch(`${org(organizationId)}/departments/${encodeURIComponent(ministryId)}`, { meetingSchedule });
}

export function saveLeaderTitles(organizationId: string, ministryId: string, leaderTitles: Record<string, string>) {
  return churchPatch(`${org(organizationId)}/departments/${encodeURIComponent(ministryId)}`, { leaderTitles });
}

export function createMinistryEvent(
  organizationId: string,
  ministryId: string,
  input: { title: string; startsAt: string; endsAt?: string; location?: string; description?: string; requiresRsvp?: boolean; capacity?: number | null },
) {
  return churchPost(`${org(organizationId)}/events`, {
    ...input,
    eventType: "department_event",
    departmentId: ministryId,
  });
}

export function createMinistryAnnouncement(organizationId: string, ministryId: string, input: { title: string; body: string; pinned?: boolean; publicPost: boolean }) {
  return churchPost(`${org(organizationId)}/announcements`, {
    title: input.title,
    body: input.body,
    pinned: Boolean(input.pinned),
    // "everyone" shows on the public ministry page; "department" stays with ministry members.
    audience: input.publicPost ? "everyone" : "department",
    departmentId: ministryId,
  });
}

function kindOf(file: File): MediaKind {
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

/** Uploads photos to the ministry gallery (public + published). */
export async function uploadMinistryPhotos(organizationId: string, ministryId: string, files: File[], onProgress?: (done: number) => void) {
  let done = 0;
  for (const file of files) {
    const up = await uploadMediaFile(organizationId, file);
    await createMedia(organizationId, {
      title: file.name.replace(/\.[^.]+$/, ""),
      mediaType: "photo",
      fileUrl: up.fileUrl,
      fileName: up.fileName,
      mimeType: up.mimeType ?? undefined,
      fileSize: up.fileSize ?? undefined,
      category: "event",
      visibility: "public",
      published: true,
      tags: [ministryTag(ministryId)],
    });
    done += 1;
    onProgress?.(done);
  }
}

/** Adds a Bible study (uploaded file or a web link such as YouTube). */
export async function addMinistryStudy(
  organizationId: string,
  ministryId: string,
  input: { title: string; speaker?: string; description?: string; durationMinutes?: number; file?: File | null; link?: string; thumbnail?: File | null },
) {
  let fileUrl = input.link?.trim() ?? "";
  let mediaType: MediaKind = /youtu|vimeo|\.mp4|\.webm/i.test(fileUrl) ? "video" : /\.mp3|\.m4a|\.wav/i.test(fileUrl) ? "audio" : "video";
  let meta: { fileName?: string; mimeType?: string; fileSize?: number } = {};
  if (input.file) {
    const up = await uploadMediaFile(organizationId, input.file);
    fileUrl = up.fileUrl;
    mediaType = kindOf(input.file);
    meta = { fileName: up.fileName, mimeType: up.mimeType ?? undefined, fileSize: up.fileSize ?? undefined };
  }
  if (!fileUrl) throw new Error("Choose a file or paste a link.");
  let thumbnailUrl: string | undefined;
  if (input.thumbnail) thumbnailUrl = (await uploadMediaFile(organizationId, input.thumbnail)).fileUrl;
  return createMedia(organizationId, {
    title: input.title,
    description: input.description,
    speaker: input.speaker,
    mediaType,
    fileUrl,
    thumbnailUrl,
    durationSeconds: input.durationMinutes ? Math.round(input.durationMinutes * 60) : undefined,
    category: "training",
    visibility: "public",
    published: true,
    tags: [ministryTag(ministryId)],
    ...meta,
  });
}
