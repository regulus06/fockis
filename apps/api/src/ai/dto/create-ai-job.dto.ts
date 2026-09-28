import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

import { Type } from "class-transformer";

/**
 * ============================================================================
 * AI VIDEO OPTIONS
 * ============================================================================
 */

class AiVideoOptionsDto {
  @IsInt()
  @Min(15)
  @Max(1200)
  durationSeconds!: number;

  @IsOptional()
  @IsIn(["16:9", "9:16"])
  aspectRatio?: "16:9" | "9:16";

  @IsOptional()
  @IsString()
  @MaxLength(200)
  style?: string;

  @IsOptional()
  @IsBoolean()
  voiceover?: boolean;

  @IsOptional()
  @IsBoolean()
  captions?: boolean;

  @IsOptional()
  @IsBoolean()
  music?: boolean;

  /**
   * Google Cloud Storage URI for the optional
   * starting image.
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imageGcsUri?: string;

  /**
   * MIME type for the starting image.
   */
  @IsOptional()
  @IsString()
  @IsIn([
    "image/jpeg",
    "image/png",
    "image/webp",
  ])
  imageMimeType?: string;
}

/**
 * ============================================================================
 * CREATE AI JOB DTO
 * ============================================================================
 */

export class CreateAiJobDto {
  @IsIn([
    "video",
    "music",
    "image",
    "design",
    "voice",
    "document",
    "translation",
  ])
  type!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  prompt!: string;

  @IsOptional()
  @IsString()
  @IsIn([
    "auto",
    "standard",
    "quality",
  ])
  model?:
    | "auto"
    | "standard"
    | "quality";

  @IsOptional()
  @ValidateNested()
  @Type(() => AiVideoOptionsDto)
  options?: AiVideoOptionsDto;
}