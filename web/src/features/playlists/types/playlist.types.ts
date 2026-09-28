/**
 * Fockis Media — Playlist & Marketplace domain types.
 *
 * NOTE ON SCOPE
 * This project had no pre-existing playlist feature to extend, so these types
 * are authored from scratch to satisfy the UI in this feature folder. If a
 * backend contract already exists elsewhere in the Fockis codebase, reconcile
 * field names against it before wiring up `playlistsApi.ts` to a real host.
 */

// ---------------------------------------------------------------------------
// Enums / literal unions
// ---------------------------------------------------------------------------

export type ContentType =
  | 'music'
  | 'video'
  | 'mixed'
  | 'podcast'
  | 'beats'
  | 'dj-mix'
  | 'album'
  | 'collection';

export type MediaKind = 'audio' | 'video';

export type AccessType = 'free' | 'paid' | 'premium' | 'exclusive';

export type Visibility = 'public' | 'unlisted' | 'private';

export type PlaylistStatus = 'draft' | 'published' | 'unpublished';

export type ProducerCategory =
  | 'music-producer'
  | 'recording-artist'
  | 'dj'
  | 'video-producer'
  | 'filmmaker'
  | 'beat-producer'
  | 'podcast-creator';

export type SortOption =
  | 'recent'
  | 'popular'
  | 'most-played'
  | 'top-rated'
  | 'price'
  | 'new-releases';

export type LibraryTab =
  | 'all'
  | 'music'
  | 'videos'
  | 'purchased'
  | 'premium'
  | 'favorites'
  | 'recent';

// ---------------------------------------------------------------------------
// Core entities
// ---------------------------------------------------------------------------

export interface Producer {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  category: ProducerCategory;
  verified: boolean;
  followerCount: number;
  releaseCount: number;
  bio?: string;
  isFollowedByCurrentUser?: boolean;
}

export interface Track {
  id: string;
  playlistId: string;
  order: number;
  title: string;
  artist: string;
  mediaKind: MediaKind;
  durationSeconds: number;
  /** Public preview stream, safe to expose regardless of access level. */
  previewUrl?: string;
  /**
   * Full-quality stream URL. The backend must only populate this field when
   * the requesting user is authorized to access it — the frontend never
   * derives or guesses this URL, and never persists it beyond the player
   * session.
   */
  streamUrl?: string;
  posterUrl?: string;
  isLocked: boolean;
}

export interface Playlist {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImageUrl: string;
  bannerImageUrl?: string;
  contentType: ContentType;
  mediaKind: MediaKind;
  genre?: string;
  tags: string[];
  creator: Producer;
  access: AccessType;
  price?: number;
  currency?: string;
  visibility: Visibility;
  status: PlaylistStatus;
  isFeatured: boolean;
  allowComments: boolean;
  allowSharing: boolean;
  releaseDate: string; // ISO date
  createdAt: string;
  updatedAt: string;
  trackCount: number;
  totalDurationSeconds: number;
  playCount: number;
  followerCount: number;
  favoriteCount: number;
  rating?: number;
  tracks: Track[];
  // Viewer-relative flags — populated by the API for the current session.
  isFavoritedByCurrentUser?: boolean;
  isPurchasedByCurrentUser?: boolean;
  isOwnedByCurrentUser?: boolean;
}

/** Lightweight shape used in grids/lists where full track data isn't needed. */
export type PlaylistSummary = Omit<Playlist, 'tracks'> & { tracks?: never };

// ---------------------------------------------------------------------------
// Requests / payloads
// ---------------------------------------------------------------------------

export interface CreatePlaylistPayload {
  title: string;
  description: string;
  coverImageFile?: File;
  coverImageUrl?: string;
  category: ProducerCategory;
  contentType: ContentType;
  genre?: string;
  visibility: Visibility;
  access: AccessType;
  price?: number;
  releaseDate?: string;
  tags: string[];
  isFeatured: boolean;
  allowComments: boolean;
  allowSharing: boolean;
}

export type UpdatePlaylistPayload = Partial<CreatePlaylistPayload> & {
  status?: PlaylistStatus;
};

export interface PlaylistQueryParams {
  search?: string;
  contentType?: ContentType | 'all';
  access?: AccessType | 'all';
  genre?: string;
  sort?: SortOption;
  tab?: LibraryTab;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface CreatorStats {
  totalPlaylists: number;
  totalPlays: number;
  totalFollowers: number;
  revenueCents: number;
  currency: string;
  premiumContentCount: number;
  publishedContentCount: number;
}

export interface UnlockResult {
  playlistId: string;
  success: boolean;
  /** Present when the purchase requires redirecting to a checkout flow. */
  checkoutUrl?: string;
}