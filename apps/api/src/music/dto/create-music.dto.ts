import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';

import {
  MusicAccessType,
  MusicContentType,
  MusicGenre,
  MusicMediaKind,
  MusicPublishStatus,
} from '../schemas/music-content.schema';

// ============================================================================
// CREATE MUSIC DTO
// ============================================================================
//
// IMPORTANT:
//
// This DTO does NOT receive the actual media file.
//
// Upload lifecycle:
//
//   1. Client selects media.
//   2. Upload endpoint receives the media.
//   3. Upload endpoint validates the upload.
//   4. Upload endpoint stores the original file.
//   5. Upload endpoint returns mediaStorageKey.
//   6. This DTO receives that storage key.
//   7. MusicService creates the MusicContent record.
//   8. MusicMediaProcessingService validates/processes the media.
//
// File-size and duration validation therefore belongs to the upload/
// processing pipeline, NOT this DTO.
//
// Money:
//   priceCents is stored in the smallest currency unit.
//
// Example:
//   $1.00  -> 100
//   $9.99  -> 999
//   $19.99 -> 1999
// ============================================================================

export class CreateMusicDto {
  // ==========================================================================
  // CONTENT IDENTITY
  // ==========================================================================

  @IsEnum(MusicContentType)
  type!: MusicContentType;

  @IsEnum(MusicMediaKind)
  mediaKind!: MusicMediaKind;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  /**
   * SEO/public-friendly identifier.
   *
   * Example:
   *
   * "My First Song"
   *
   * becomes:
   *
   * "my-first-song"
   */
  @IsOptional()
  @IsString()
  @MaxLength(220)
  @Matches(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    {
      message:
        'slug must contain only lowercase letters, numbers, and hyphens',
    },
  )
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  // ==========================================================================
  // MEDIA STORAGE
  // ==========================================================================

  /**
   * Original uploaded media storage key.
   *
   * Example:
   *
   * music/uuid.mp3
   * music/uuid.mp4
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  mediaStorageKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  coverStorageKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  previewMediaStorageKey?: string;

  // ==========================================================================
  // DISCOVERY / CLASSIFICATION
  // ==========================================================================

  @IsOptional()
  @IsEnum(MusicGenre)
  genre?: MusicGenre;

  @IsOptional()
  @IsArray()
  @IsString({
    each: true,
  })
  tags?: string[];

  // ==========================================================================
  // ACCESS / PRICING
  // ==========================================================================

  @IsEnum(MusicAccessType)
  accessType!: MusicAccessType;

  /**
   * Canonical price field.
   *
   * Stored in the smallest currency unit.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  currencyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  country?: string;

  // ==========================================================================
  // PREVIEW
  // ==========================================================================

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  previewDurationSeconds?: number;

  // ==========================================================================
  // CONTENT SETTINGS
  // ==========================================================================

  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @IsOptional()
  @IsBoolean()
  allowSharing?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDownloads?: boolean;

  // ==========================================================================
  // EDITORIAL / EXCLUSIVITY
  // ==========================================================================

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isExclusive?: boolean;

  // ==========================================================================
  // PUBLISHING
  // ==========================================================================

  @IsOptional()
  @IsEnum(MusicPublishStatus)
  status?: MusicPublishStatus;

  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  // ==========================================================================
  // ALBUM
  // ==========================================================================

  @IsOptional()
  @IsString()
  @MaxLength(100)
  albumId?: string;
}