import type {
  MusicAccessType,
  MusicContentType,
  MusicGenre,
  MusicMediaKind,
} from './music.types';

/* ============================================================================
   PUBLISHING
   ============================================================================ */

export type PublishMode =
  | 'draft'
  | 'publish'
  | 'schedule';

/* ============================================================================
   CREATION MODE
   ============================================================================ */

export type CreationMode =
  | 'single'
  | 'series';

/* ============================================================================
   SERIES RELEASE
   ============================================================================ */

export type SeriesReleaseMode =
  | 'all_now'
  | 'drip'
  | 'custom';

export type SeriesFrequency =
  | 'daily'
  | 'weekly';

/* ============================================================================
   COUNTRY / CURRENCY
   ============================================================================ */

export interface CountryCurrency {
  code: string;
  name: string;
  flag: string;
  currency: string;
  currencyName: string;
  symbol: string;
  locale: string;
  decimals: number;
}

/* ============================================================================
   EXTENDED CREATOR CONTENT TYPES
   ============================================================================

   These are supported by the Create Release interface.

   They are kept separate from MusicContentType here so the release picker
   can support creator-oriented content while the core music type definitions
   can remain backward-compatible.

   ============================================================================ */

export type CreatorContentType =
  | 'movie'
  | 'fashion'
  | 'event'
  | 'announcement'
  | 'creator_update';

/**
 * Every content type that can appear in the Create Release selector.
 */
export type CreateReleaseContentType =
  | MusicContentType
  | CreatorContentType;

/* ============================================================================
   MAIN CREATE FORM
   ============================================================================ */

export interface FormState {
  /**
   * Core content type used by the existing music API.
   */
  contentType: MusicContentType;

  mediaKind: MusicMediaKind;

  title: string;

  description: string;

  genre: MusicGenre | '';

  tags: string;

  mediaUrl: string;

  coverImageUrl: string;

  accessType: MusicAccessType;

  price: string;

  previewDurationSeconds: string;

  releaseDate: string;

  isFeatured: boolean;

  isExclusive: boolean;

  countryCode: string;
}

/* ============================================================================
   SERIES EPISODE
   ============================================================================

   Each episode has its own media type.

   This allows:

   Episode 1 -> Audio
   Episode 2 -> Audio
   Episode 3 -> Video
   Episode 4 -> Audio

   The creator can therefore build mixed-media series.
   ============================================================================ */

export interface SeriesEpisode {
  id: string;

  title: string;

  description: string;

  /**
   * Media type for this individual episode.
   */
  mediaKind:
    | 'audio'
    | 'video';

  /**
   * Optional hosted media URL.
   *
   * If the creator uploads a device file,
   * this remains empty and the context will
   * use the uploaded file's storage key.
   */
  mediaUrl: string;

  /**
   * Optional episode artwork / thumbnail URL.
   */
  coverImageUrl: string;

  /**
   * Used when the series uses custom release dates.
   */
  releaseDate: string;
}

/* ============================================================================
   CONTENT TYPE OPTION
   ============================================================================ */

export interface ContentTypeOption {
  /**
   * The Create Release selector supports both the existing MusicContentType
   * values and the additional creator-oriented values.
   */
  value: CreateReleaseContentType;

  label: string;

  description: string;

  mediaKind: MusicMediaKind;

  icon: string;

  category:
    | 'music'
    | 'video'
    | 'creator';
}

/* ============================================================================
   ACCESS OPTION
   ============================================================================ */

export interface AccessOption {
  value: MusicAccessType;

  label: string;

  description: string;
}