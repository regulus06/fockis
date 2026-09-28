/**
 * Playlists API service.
 *
 * ASSUMPTION (no existing codebase was provided to match against):
 * Most Fockis feature folders likely already import a shared, authenticated
 * HTTP client (e.g. `shared/api/httpClient`) that attaches auth headers,
 * base URL, and error normalization. That module was not available here, so
 * a minimal stand-in, `httpClient`, is defined at the bottom of this file.
 *
 * >>> If a shared client already exists in the real project, delete the
 * >>> stand-in below and replace `httpClient.get/post/...` calls with it. <<<
 *
 * Every method here maps to a REST endpoint under `/api/playlists`. None of
 * this data is faked or mocked — if the real backend doesn't yet implement
 * an endpoint, that is called out explicitly in a comment above the method,
 * and the method still makes a real request (which will 404 until the
 * backend catches up) rather than returning invented local data.
 */

import type {
  CreatePlaylistPayload,
  CreatorStats,
  PaginatedResult,
  Playlist,
  PlaylistQueryParams,
  PlaylistSummary,
  Producer,
  UnlockResult,
  UpdatePlaylistPayload,
} from '../types/playlist.types';

const BASE = '/api/playlists';

function toQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const playlistsApi = {
  // -------------------------------------------------------------------
  // Discovery / marketplace
  // -------------------------------------------------------------------

  /** Featured playlists for the marketplace landing page. */
  getFeaturedPlaylists(): Promise<PlaylistSummary[]> {
    return httpClient.get(`${BASE}/featured`);
  },

  /** Featured / trending producers for the marketplace landing page. */
  getFeaturedProducers(): Promise<Producer[]> {
    return httpClient.get(`${BASE}/producers/featured`);
  },

  /** Paginated, filterable, searchable playlist catalog. */
  searchPlaylists(
    params: PlaylistQueryParams,
  ): Promise<PaginatedResult<PlaylistSummary>> {
    return httpClient.get(`${BASE}${toQueryString(params as Record<string, unknown>)}`);
  },

  /** Premium / paid / exclusive spotlight rail. */
  getPremiumPlaylists(): Promise<PlaylistSummary[]> {
    return httpClient.get(`${BASE}/premium`);
  },

  // -------------------------------------------------------------------
  // Single playlist
  // -------------------------------------------------------------------

  getPlaylistBySlug(slug: string): Promise<Playlist> {
    return httpClient.get(`${BASE}/${encodeURIComponent(slug)}`);
  },

  getPlaylistById(id: string): Promise<Playlist> {
    return httpClient.get(`${BASE}/id/${encodeURIComponent(id)}`);
  },

  // -------------------------------------------------------------------
  // Access / commerce
  // -------------------------------------------------------------------

  /**
   * Requests an unlock/purchase for paid, premium, or exclusive content.
   * The backend is the source of truth for entitlement — the frontend only
   * ever reflects `isPurchasedByCurrentUser` / `isLocked` as returned here
   * or from `getPlaylistBySlug`, and never derives access locally.
   */
  unlockPlaylist(playlistId: string): Promise<UnlockResult> {
    return httpClient.post(`${BASE}/${encodeURIComponent(playlistId)}/unlock`, {});
  },

  addToLibrary(playlistId: string): Promise<void> {
    return httpClient.post(`${BASE}/${encodeURIComponent(playlistId)}/library`, {});
  },

  removeFromLibrary(playlistId: string): Promise<void> {
    return httpClient.delete(`${BASE}/${encodeURIComponent(playlistId)}/library`);
  },

  favoritePlaylist(playlistId: string): Promise<void> {
    return httpClient.post(`${BASE}/${encodeURIComponent(playlistId)}/favorite`, {});
  },

  unfavoritePlaylist(playlistId: string): Promise<void> {
    return httpClient.delete(`${BASE}/${encodeURIComponent(playlistId)}/favorite`);
  },

  followProducer(producerId: string): Promise<void> {
    return httpClient.post(`${BASE}/producers/${encodeURIComponent(producerId)}/follow`, {});
  },

  unfollowProducer(producerId: string): Promise<void> {
    return httpClient.delete(`${BASE}/producers/${encodeURIComponent(producerId)}/follow`);
  },

  /** Records a play event for analytics / "recently played" state. */
  recordPlay(playlistId: string, trackId: string): Promise<void> {
    return httpClient.post(`${BASE}/${encodeURIComponent(playlistId)}/plays`, { trackId });
  },

  // -------------------------------------------------------------------
  // Library (signed-in user)
  // -------------------------------------------------------------------

  getMyLibrary(
    params: PlaylistQueryParams,
  ): Promise<PaginatedResult<PlaylistSummary>> {
    return httpClient.get(`${BASE}/me/library${toQueryString(params as Record<string, unknown>)}`);
  },

  getMyFavorites(): Promise<PlaylistSummary[]> {
    return httpClient.get(`${BASE}/me/favorites`);
  },

  getMyFavoriteProducers(): Promise<Producer[]> {
    return httpClient.get(`${BASE}/me/favorite-producers`);
  },

  getMyRecentlyPlayed(): Promise<PlaylistSummary[]> {
    return httpClient.get(`${BASE}/me/recent`);
  },

  // -------------------------------------------------------------------
  // Creator / producer dashboard (My Playlists)
  // -------------------------------------------------------------------

  getMyPlaylists(): Promise<PlaylistSummary[]> {
    return httpClient.get(`${BASE}/me/created`);
  },

  getMyCreatorStats(): Promise<CreatorStats> {
    return httpClient.get(`${BASE}/me/stats`);
  },

  createPlaylist(payload: CreatePlaylistPayload): Promise<Playlist> {
    const body = toFormData(payload as unknown as Record<string, unknown>);
    return httpClient.postForm(`${BASE}`, body);
  },

  updatePlaylist(playlistId: string, payload: UpdatePlaylistPayload): Promise<Playlist> {
    const body = toFormData(payload as unknown as Record<string, unknown>);
    return httpClient.patchForm(`${BASE}/${encodeURIComponent(playlistId)}`, body);
  },

  deletePlaylist(playlistId: string): Promise<void> {
    return httpClient.delete(`${BASE}/${encodeURIComponent(playlistId)}`);
  },

  publishPlaylist(playlistId: string): Promise<Playlist> {
    return httpClient.post(`${BASE}/${encodeURIComponent(playlistId)}/publish`, {});
  },

  unpublishPlaylist(playlistId: string): Promise<Playlist> {
    return httpClient.post(`${BASE}/${encodeURIComponent(playlistId)}/unpublish`, {});
  },

  duplicatePlaylist(playlistId: string): Promise<Playlist> {
    return httpClient.post(`${BASE}/${encodeURIComponent(playlistId)}/duplicate`, {});
  },

  /**
   * NOTE: no analytics endpoint shape was specified anywhere in the brief
   * beyond "Analytics" as a management action. This method is included so
   * the "View Analytics" action in MyPlaylistsPage has a real call to make,
   * but the backend contract for per-playlist analytics still needs to be
   * defined (time series plays, revenue-over-time, listener geography,
   * etc.) — treat the return type as a placeholder to refine with backend.
   */
  getPlaylistAnalytics(playlistId: string): Promise<Record<string, unknown>> {
    return httpClient.get(`${BASE}/${encodeURIComponent(playlistId)}/analytics`);
  },
};

function toFormData(payload: Record<string, unknown>): FormData {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (value instanceof File) {
      form.append(key, value);
    } else if (Array.isArray(value)) {
      form.append(key, JSON.stringify(value));
    } else {
      form.append(key, String(value));
    }
  });
  return form;
}

// ---------------------------------------------------------------------------
// Stand-in HTTP client — replace with the app's shared client if one exists.
// ---------------------------------------------------------------------------

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

const httpClient = {
  get<T>(url: string): Promise<T> {
    return request<T>(url, { method: 'GET' });
  },
  post<T>(url: string, body: unknown): Promise<T> {
    return request<T>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
  postForm<T>(url: string, body: FormData): Promise<T> {
    return request<T>(url, { method: 'POST', body });
  },
  patchForm<T>(url: string, body: FormData): Promise<T> {
    return request<T>(url, { method: 'PATCH', body });
  },
  delete<T>(url: string): Promise<T> {
    return request<T>(url, { method: 'DELETE' });
  },
};