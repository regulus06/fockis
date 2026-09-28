import {
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';

export class CreateProducerProfileDto {
  // ============================================================
  // PRODUCER NAME
  // ============================================================

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  producerName!: string;

  // ============================================================
  // BIO
  // ============================================================

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bio?: string;

  // ============================================================
  // GENRES
  // ============================================================
  //
  // A producer can select multiple genres.
  //
  // Example:
  // genres: ['hip-hop', 'rnb', 'trap', 'afrobeats']
  //
  // Minimum: 1
  // Maximum: 10
  // ============================================================

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  genres!: string[];

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