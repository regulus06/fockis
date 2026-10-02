// ============================================================================
// FOCKIS MUSIC — FRONTEND TYPES
// ============================================================================
//
// IMPORTANT:
// These values intentionally match the backend MusicContentType enum.
//
// Do NOT add UI-only values such as "movie", "fashion", "event", etc. here.
// UI aliases should be converted to one of these canonical API values before
// creating or querying MusicContent records.
// ============================================================================

export type MusicContentType =
  | 'song'
  | 'single'
  | 'album'
  | 'ep'
  | 'beat'
  | 'instrumental'
  | 'music'
  | 'audio'
  | 'track'
  | 'music_video'
  | 'video'
  | 'live_performance'
  | 'interview'
  | 'behind_the_scenes'
  | 'tutorial'
  | 'exclusive'
  | 'exclusive_video';

export type MusicMediaKind =
  | 'audio'
  | 'video';

export type MusicAccessType =
  | 'free'
  | 'preview_paid'
  | 'paid'
  | 'premium'
  | 'exclusive';

export type MusicGenre =
  | 'hip_hop'
  | 'rnb'
  | 'afrobeats'
  | 'amapiano'
  | 'pop'
  | 'rock'
  | 'electronic'
  | 'gospel'
  | 'jazz'
  | 'latin'
  | 'reggae'
  | 'other';

// ============================================================================
// PUBLICATION STATUS
// ============================================================================

/**
 * Publication lifecycle.
 *
 * A newly submitted item can enter PROCESSING before becoming PUBLISHED.
 */
export type MusicPublishStatus =
  | 'draft'
  | 'scheduled'
  | 'processing'
  | 'published'
  | 'failed'
  | 'taken_down';

// ============================================================================
// MEDIA PROCESSING STATUS
// ============================================================================

/**
 * Media processing lifecycle.
 *
 * This is separate from publication status because media can be uploaded
 * and processed independently of whether the content is published.
 */
export type MusicMediaProcessingState =
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'failed';

// ============================================================================
// MEDIA ASSET
// ============================================================================

/**
 * Media asset returned by the API.
 *
 * Optional fields are intentional for compatibility with older records
 * and partially processed content.
 */
export interface MusicMediaAsset {
  storageKey?: string;
  url?: string;
  processingState?: MusicMediaProcessingState;
  durationSeconds?: number;
  mimeType?: string;
  sizeBytes?: number;
}

// ============================================================================
// PROCESSING STATUS USED BY THE UI
// ============================================================================

/**
 * Convenience union used by the UI when determining whether media
 * can currently be played.
 */
export type MusicProcessingStatus =
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'unknown';

// ============================================================================
// MUSIC CONTENT
// ============================================================================

/**
 * Complete Music content record returned by the API.
 */
export interface MusicContent {
  id: string;

  producerId: string;

  producerName?: string;

  producerVerified?: boolean;

  /**
   * Canonical backend content type.
   */
  type: MusicContentType;

  /**
   * Physical media format.
   */
  mediaKind: MusicMediaKind;

  title: string;

  slug: string;

  description?: string;

  coverImageUrl?: string;

  thumbnailUrl?: string;

  genre?: MusicGenre;

  tags: string[];

  /**
   * Backend media asset.
   *
   * Optional for compatibility with older API responses.
   */
  media?: MusicMediaAsset;

  /**
   * Optional preview media returned by some API responses.
   */
  previewMedia?: MusicMediaAsset;

  durationSeconds?: number;

  accessType: MusicAccessType;

  /**
   * Legacy price field.
   *
   * Amount is stored in the minor unit of the currency.
   */
  priceCents: number;

  /**
   * Preferred generic minor-unit price.
   */
  priceMinor?: number;

  currency: string;

  /**
   * Optional creator/selling country.
   */
  country?: string;

  currencyName?: string;

  previewDurationSeconds: number;

  /**
   * Publication status.
   */
  status: MusicPublishStatus;

  releaseDate?: string;

  // ==========================================================================
  // SERIES METADATA
  // ==========================================================================

  /**
   * Optional series information.
   */
  seriesId?: string;

  seriesTitle?: string;

  episodeNumber?: number;

  seriesTotalEpisodes?: number;

  // ==========================================================================
  // FLAGS
  // ==========================================================================

  isFeatured: boolean;

  isExclusive: boolean;

  // ==========================================================================
  // ANALYTICS / COUNTERS
  // ==========================================================================

  playCount: number;

  viewCount: number;

  favoriteCount: number;

  purchaseCount: number;

  shareCount?: number;

  paidListenCount?: number;

  paidPlayCount?: number;

  paidViewCount?: number;

  revenueCents?: number;

  earningsCents?: number;

  uniqueListenerCount?: number;

  followerCount?: number;

  rankScore?: number;

  // ==========================================================================
  // TIMESTAMPS
  // ==========================================================================

  createdAt: string;

  updatedAt?: string;
}

// ============================================================================
// PROCESSING HELPERS
// ============================================================================

/**
 * Determine the effective processing state of a content record without
 * requiring every API response to contain the media object.
 */
export function getMusicProcessingState(
  content?: MusicContent | null,
): MusicProcessingStatus {
  if (!content) {
    return 'unknown';
  }

  const mediaState = content.media?.processingState;

  if (
    mediaState === 'uploading' ||
    mediaState === 'processing' ||
    mediaState === 'ready' ||
    mediaState === 'failed'
  ) {
    return mediaState;
  }

  if (content.status === 'processing') {
    return 'processing';
  }

  if (content.status === 'failed') {
    return 'failed';
  }

  if (content.status === 'published') {
    return 'ready';
  }

  return 'unknown';
}

/**
 * Whether the media is safe for the frontend to attempt playback.
 */
export function isMusicMediaReady(
  content?: MusicContent | null,
): boolean {
  return getMusicProcessingState(content) === 'ready';
}

/**
 * Whether content media is currently being processed.
 */
export function isMusicMediaProcessing(
  content?: MusicContent | null,
): boolean {
  const state = getMusicProcessingState(content);

  return (
    state === 'uploading' ||
    state === 'processing'
  );
}

/**
 * Whether media processing has failed.
 */
export function hasMusicMediaProcessingFailed(
  content?: MusicContent | null,
): boolean {
  return getMusicProcessingState(content) === 'failed';
}

// ============================================================================
// ACCESS
// ============================================================================

export type AccessLevel =
  | 'full'
  | 'preview'
  | 'denied';

export interface ResolvedAccess {
  contentId: string;

  accessType: MusicAccessType;

  level: AccessLevel;

  reason:
    | 'free'
    | 'owner'
    | 'entitled'
    | 'preview_available'
    | 'no_entitlement';

  previewDurationSeconds: number;
}

// ============================================================================
// PLAYBACK
// ============================================================================

export interface PlaybackUrlResponse {
  url: string;

  level: AccessLevel;

  expiresInSeconds: number;
}

// ============================================================================
// QUERY
// ============================================================================

export interface MusicQueryParams {
  type?: MusicContentType;

  genre?: MusicGenre;

  accessType?: MusicAccessType;

  search?: string;

  producerId?: string;

  sort?:
    | 'trending'
    | 'most_played'
    | 'most_viewed'
    | 'most_purchased'
    | 'highest_rated'
    | 'newest'
    | 'price_asc'
    | 'price_desc';

  limit?: number;

  offset?: number;
}

export interface MusicQueryResult {
  items: MusicContent[];

  total: number;

  limit: number;

  offset: number;
}

// ============================================================================
// PURCHASE
// ============================================================================

export interface InitiatePurchaseResponse {
  purchaseId: string;

  clientSecret: string;

  amountCents: number;

  currency: string;
}