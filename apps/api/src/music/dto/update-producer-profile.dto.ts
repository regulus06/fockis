import {
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ArrayMaxSize,
} from 'class-validator';

export class UpdateProducerProfileDto {
  // ============================================================
  // PRODUCER NAME
  // ============================================================

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  producerName?: string;

  // ============================================================
  // BIO
  // ============================================================

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bio?: string;

  // ============================================================
  // PRODUCER GENRES
  // ============================================================
  //
  // Producers can select multiple genres.
  //
  // Example:
  // ['hip-hop', 'rnb', 'trap', 'afrobeats']
  //
  // Maximum: 10 genres
  // ============================================================

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  genres?: string[];

  // ============================================================
  // PROFILE IMAGE
  // ============================================================

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  profileImage?: string;

  // ============================================================
  // COVER IMAGE
  // ============================================================

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  coverImage?: string;

  // ============================================================
  // WEBSITE
  // ============================================================

  @IsOptional()
  @IsUrl({
    require_protocol: true,
  })
  @MaxLength(1000)
  website?: string;

  // ============================================================
  // SOCIAL LINKS
  // ============================================================

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  youtube?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  tiktok?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  spotify?: string;
}