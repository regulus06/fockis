/**
 * Shared enum value lists — kept in one place so schemas and DTOs never
 * drift apart. These mirror the frontend's `playlist.types.ts` exactly.
 */

export const CONTENT_TYPES = [
  'music',
  'video',
  'mixed',
  'podcast',
  'beats',
  'dj-mix',
  'album',
  'collection',
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const MEDIA_KINDS = ['audio', 'video'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const ACCESS_TYPES = ['free', 'paid', 'premium', 'exclusive'] as const;
export type AccessType = (typeof ACCESS_TYPES)[number];

export const VISIBILITY_TYPES = ['public', 'unlisted', 'private'] as const;
export type Visibility = (typeof VISIBILITY_TYPES)[number];

export const PLAYLIST_STATUSES = ['draft', 'published', 'unpublished'] as const;
export type PlaylistStatus = (typeof PLAYLIST_STATUSES)[number];

export const PRODUCER_CATEGORIES = [
  'music-producer',
  'recording-artist',
  'dj',
  'video-producer',
  'filmmaker',
  'beat-producer',
  'podcast-creator',
] as const;
export type ProducerCategory = (typeof PRODUCER_CATEGORIES)[number];

export const SORT_OPTIONS = [
  'recent',
  'popular',
  'most-played',
  'top-rated',
  'price',
  'new-releases',
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const LIBRARY_TABS = [
  'all',
  'music',
  'videos',
  'purchased',
  'premium',
  'favorites',
  'recent',
] as const;
export type LibraryTab = (typeof LIBRARY_TABS)[number];

export const PURCHASE_STATUSES = ['pending', 'completed', 'failed', 'refunded'] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];