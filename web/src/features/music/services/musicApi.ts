import { apiClient } from '../../careers/services/apiClient';

import type {
  MusicContent,
  MusicQueryParams,
  MusicQueryResult,
  ResolvedAccess,
} from '../types/music.types';

/**
 * ============================================================================
 * MUSIC API
 * ============================================================================
 *
 * Central API client for Fockis Music.
 *
 * Backend base routes:
 *
 *   /music
 *   /music/charts
 *   /music/explore
 *   /music/tracks
 *   /music/videos
 *   /music/albums
 *   /music/producers/:producerId
 *   /music/producers/me/content
 *
 * Authentication is handled by the shared apiClient.
 */

/**
 * Convert music query parameters into a URL query string.
 */
function toSearchParams(
  params: MusicQueryParams = {},
): string {
  const usp = new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        usp.set(
          key,
          String(value),
        );
      }
    },
  );

  const qs = usp.toString();

  return qs
    ? `?${qs}`
    : '';
}

/**
 * ============================================================================
 * CHART TYPES
 * ============================================================================
 *
 * These values correspond to the backend MusicController:
 *
 *   GET /music/charts?type=trending
 *   GET /music/charts?type=top_music
 *   GET /music/charts?type=top_videos
 *   GET /music/charts?type=top_earning
 *   GET /music/charts?type=rising
 *   GET /music/charts?type=new
 *   GET /music/charts?type=free
 */
export type MusicChartType =
  | 'trending'
  | 'top_music'
  | 'top_videos'
  | 'top_earning'
  | 'rising'
  | 'new'
  | 'free';

/**
 * Response returned by:
 *
 *   GET /music/charts
 */
export interface MusicChartsResponse {
  type: MusicChartType;

  items: MusicContent[];
}

/**
 * ============================================================================
 * SERIES EPISODE PAYLOAD
 * ============================================================================
 *
 * The backend CreateMusicDto expects storage keys for uploaded media.
 */
export interface CreateMusicSeriesEpisodePayload {
  type: string;

  mediaKind:
    | 'audio'
    | 'video';

  title: string;

  slug: string;

  description?: string;

  genre?: string;

  tags: string[];

  /**
   * Storage key returned by:
   *
   * POST /music/studio/upload
   */
  mediaStorageKey: string;

  /**
   * Optional artwork storage key.
   */
  coverStorageKey?: string;

  /**
   * Optional preview media storage key.
   */
  previewMediaStorageKey?: string;

  /**
   * Optional public thumbnail URL.
   */
  thumbnailUrl?: string;

  accessType:
    | 'free'
    | 'preview_paid'
    | 'paid'
    | 'premium'
    | 'exclusive';

  /**
   * Price in minor currency units.
   */
  priceMinor?: number;

  /**
   * Price in cents.
   */
  priceCents?: number;

  currency?: string;

  country?: string;

  currencyName?: string;

  previewDurationSeconds?: number;

  status:
    | 'draft'
    | 'scheduled'
    | 'published';

  releaseDate?: string;

  isFeatured?: boolean;

  isExclusive?: boolean;

  allowComments?: boolean;

  allowSharing?: boolean;

  allowDownloads?: boolean;

  /**
   * Optional series metadata.
   */
  seriesId?: string;

  seriesTitle?: string;

  episodeNumber?: number;

  seriesTotalEpisodes?: number;
}

/**
 * ============================================================================
 * CREATE PAYLOAD
 * ============================================================================
 *
 * The create-release flow builds several different payload combinations,
 * therefore this remains intentionally flexible.
 */
export type CreateMusicPayload =
  Record<string, unknown>;

/**
 * ============================================================================
 * STUDIO UPLOAD RESPONSE
 * ============================================================================
 */
export interface MusicStudioUploadResponse {
  success: boolean;

  type:
    | 'audio'
    | 'video'
    | 'image';

  filename: string;

  originalName: string;

  mimetype: string;

  size: number;

  /**
   * Storage key used by the Music backend.
   */
  storageKey: string;

  /**
   * Public URL for the uploaded file.
   */
  url: string;

  /**
   * Server-side path.
   */
  path: string;

  /**
   * Video thumbnail URL, if generated.
   */
  thumbnailUrl: string | null;

  /**
   * Video thumbnail path, if generated.
   */
  thumbnailPath: string | null;
}

/**
 * ============================================================================
 * MUSIC API
 * ============================================================================
 */
export const musicApi = {
  /**
   * ==========================================================================
   * HOME
   * ==========================================================================
   *
   * GET /music
   */
  home: (): Promise<MusicQueryResult> =>
    apiClient.get<MusicQueryResult>(
      '/music',
    ),

  /**
   * ==========================================================================
   * CHARTS
   * ==========================================================================
   *
   * IMPORTANT:
   * Charts must use the backend ranking endpoints rather than trying to
   * calculate rankings from /music/explore on the frontend.
   *
   * Examples:
   *
   *   /music/charts?type=trending&limit=50
   *   /music/charts?type=top_music&limit=50
   *   /music/charts?type=top_videos&limit=50
   */
  charts: (
    params: {
      type?: MusicChartType;
      limit?: number;
    } = {},
  ): Promise<MusicChartsResponse> =>
    apiClient.get<MusicChartsResponse>(
      `/music/charts${toSearchParams(
        params as MusicQueryParams,
      )}`,
    ),

  /**
   * ==========================================================================
   * EXPLORE
   * ==========================================================================
   *
   * GET /music/explore
   */
  explore: (
    params: MusicQueryParams = {},
  ): Promise<MusicQueryResult> =>
    apiClient.get<MusicQueryResult>(
      `/music/explore${toSearchParams(
        params,
      )}`,
    ),

  /**
   * ==========================================================================
   * TRACKS
   * ==========================================================================
   *
   * GET /music/tracks
   */
  tracks: (
    params: MusicQueryParams = {},
  ): Promise<MusicQueryResult> =>
    apiClient.get<MusicQueryResult>(
      `/music/tracks${toSearchParams(
        params,
      )}`,
    ),

  /**
   * ==========================================================================
   * MUSIC VIDEOS
   * ==========================================================================
   *
   * GET /music/videos
   */
  videos: (
    params: MusicQueryParams = {},
  ): Promise<MusicQueryResult> =>
    apiClient.get<MusicQueryResult>(
      `/music/videos${toSearchParams(
        params,
      )}`,
    ),

  /**
   * ==========================================================================
   * ALBUMS
   * ==========================================================================
   *
   * GET /music/albums
   */
  albums: (
    params: MusicQueryParams = {},
  ): Promise<MusicQueryResult> =>
    apiClient.get<MusicQueryResult>(
      `/music/albums${toSearchParams(
        params,
      )}`,
    ),

  /**
   * ==========================================================================
   * GET SINGLE CONTENT
   * ==========================================================================
   *
   * GET /music/:id
   */
  getById: (
    id: string,
  ): Promise<{
    content: MusicContent;
    access: ResolvedAccess;
  }> =>
    apiClient.get<{
      content: MusicContent;
      access: ResolvedAccess;
    }>(
      `/music/${id}`,
    ),

  /**
   * ==========================================================================
   * CREATE MUSIC / VIDEO
   * ==========================================================================
   *
   * The media file should first be uploaded through:
   *
   *   POST /music/studio/upload
   *
   * The returned storageKey is then submitted here.
   */
  create: (
    payload: CreateMusicPayload,
  ): Promise<MusicContent> =>
    apiClient.post<MusicContent>(
      '/music',
      payload,
    ),

  /**
   * ==========================================================================
   * CREATE ONE SERIES EPISODE
   * ==========================================================================
   */
  createSeriesEpisode: (
    payload: CreateMusicSeriesEpisodePayload,
  ): Promise<MusicContent> =>
    apiClient.post<MusicContent>(
      '/music',
      payload,
    ),

  /**
   * ==========================================================================
   * CREATE ALL SERIES EPISODES
   * ==========================================================================
   *
   * Episodes are created sequentially.
   */
  createSeriesEpisodes: async (
    episodes: CreateMusicSeriesEpisodePayload[],
    onProgress?: (
      completed: number,
      total: number,
    ) => void,
  ): Promise<MusicContent[]> => {
    const created: MusicContent[] = [];

    for (
      let index = 0;
      index < episodes.length;
      index += 1
    ) {
      const episode =
        await musicApi.createSeriesEpisode(
          episodes[index],
        );

      created.push(
        episode,
      );

      onProgress?.(
        index + 1,
        episodes.length,
      );
    }

    return created;
  },

  /**
   * ==========================================================================
   * MUSIC STUDIO FILE UPLOAD
   * ==========================================================================
   *
   * POST /music/studio/upload
   */
  uploadStudioFile: (
    file: File,
    context?: string,
  ): Promise<MusicStudioUploadResponse> => {
    const formData =
      new FormData();

    formData.append(
      'file',
      file,
    );

    const query = context
      ? `?context=${encodeURIComponent(
          context,
        )}`
      : '';

    return apiClient.post<MusicStudioUploadResponse>(
      `/music/studio/upload${query}`,
      formData,
    );
  },

  /**
   * ==========================================================================
   * UPDATE MUSIC CONTENT
   * ==========================================================================
   *
   * PATCH /music/:id
   */
  update: (
    id: string,
    payload: Record<string, unknown>,
  ): Promise<MusicContent> =>
    apiClient.patch<MusicContent>(
      `/music/${id}`,
      payload,
    ),

  /**
   * ==========================================================================
   * DELETE MUSIC CONTENT
   * ==========================================================================
   *
   * DELETE /music/:id
   */
  remove: (
    id: string,
  ): Promise<unknown> =>
    apiClient.delete<unknown>(
      `/music/${id}`,
    ),

  /**
   * ==========================================================================
   * PREVIEW PLAY
   * ==========================================================================
   *
   * POST /music/:id/preview
   */
  recordPreviewPlay: (
    id: string,
  ): Promise<unknown> =>
    apiClient.post<unknown>(
      `/music/${id}/preview`,
    ),

  /**
   * ==========================================================================
   * SHARE
   * ==========================================================================
   *
   * POST /music/:id/share
   */
  recordShare: (
    id: string,
  ): Promise<unknown> =>
    apiClient.post<unknown>(
      `/music/${id}/share`,
    ),

  /**
   * ==========================================================================
   * ACCESS
   * ==========================================================================
   *
   * GET /music/:id/access
   */
  getAccess: (
    id: string,
  ): Promise<ResolvedAccess> =>
    apiClient.get<ResolvedAccess>(
      `/music/${id}/access`,
    ),

  /**
   * ==========================================================================
   * PRODUCER STOREFRONT
   * ==========================================================================
   *
   * GET /music/producers/:producerId
   */
  storefront: (
    producerId: string,
    params: MusicQueryParams = {},
  ): Promise<MusicQueryResult> =>
    apiClient.get<MusicQueryResult>(
      `/music/producers/${producerId}${toSearchParams(
        params,
      )}`,
    ),

  /**
   * ==========================================================================
   * MY PRODUCER STUDIO CONTENT
   * ==========================================================================
   *
   * GET /music/producers/me/content
   */
  myStudioContent: (): Promise<MusicContent[]> =>
    apiClient.get<MusicContent[]>(
      '/music/producers/me/content',
    ),
};