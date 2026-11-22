/**
 * publicSiteApi.ts
 * -----------------------------------------------------------------------------
 * Data the public church website needs beyond what OrganizationPage already
 * loads. Both calls work signed out.
 *
 *   GET /organizations/:id/public-ministries   (name, type, description, photo)
 *   GET /organizations/:id/media?category=sermon (server returns only what
 *                                                 this viewer may see;
 *                                                 no category: any media)
 * -----------------------------------------------------------------------------
 */

import { churchRequest, getAuthToken } from "../api/organizationApi";
import type { MediaItem } from "../api/mediaApi";

export interface PublicMinistry {
  id: string;
  name: string;
  departmentType?: string;
  description?: string;
  photoUrl?: string | null;
}

const org = (id: string) => `/organizations/${encodeURIComponent(id)}`;

function itemsOf<T>(res: { items?: T[] } | T[] | null | undefined): T[] {
  return Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
}

export async function listPublicMinistries(organizationId: string, signal?: AbortSignal): Promise<PublicMinistry[]> {
  const res = await churchRequest<{ items?: PublicMinistry[] } | PublicMinistry[]>(`${org(organizationId)}/public-ministries`, {
    query: { limit: 12 },
    signal,
    anonymous: true,
  });
  return itemsOf(res);
}

/** Latest published sermons; falls back to "message" recordings. */
export async function listLatestSermons(organizationId: string, signal?: AbortSignal): Promise<MediaItem[]> {
  const get = (category: string) =>
    churchRequest<{ items?: MediaItem[] } | MediaItem[]>(`${org(organizationId)}/media`, {
      query: { page: 1, pageSize: 3, category },
      signal,
      anonymous: !getAuthToken(),
    }).then((r) => itemsOf(r).filter((m) => m.published !== false && (m.mediaType === "video" || m.mediaType === "audio")));

  const sermons = await get("sermon");
  return sermons.length > 0 ? sermons : get("message");
}

/** Latest published videos / audio of any category (non-faith organizations). */
export async function listLatestVideos(organizationId: string, signal?: AbortSignal): Promise<MediaItem[]> {
  const res = await churchRequest<{ items?: MediaItem[] } | MediaItem[]>(`${org(organizationId)}/media`, {
    query: { page: 1, pageSize: 6 },
    signal,
    anonymous: !getAuthToken(),
  });
  return itemsOf(res)
    .filter((m) => m.published !== false && (m.mediaType === "video" || m.mediaType === "audio"))
    .slice(0, 3);
}

export interface PublicMinistryDetail extends PublicMinistry {
  organizationId: string;
}

export function getPublicMinistry(organizationId: string, ministryId: string, signal?: AbortSignal): Promise<PublicMinistryDetail> {
  return churchRequest<PublicMinistryDetail>(`${org(organizationId)}/public-ministries/${encodeURIComponent(ministryId)}`, {
    signal,
    anonymous: true,
  });
}
