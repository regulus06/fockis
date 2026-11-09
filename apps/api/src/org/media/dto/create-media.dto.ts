/**
 * create-media.dto.ts
 * Payload for POST /organizations/:organizationId/media (JSON).
 *
 * The file itself is either
 *   - uploaded first with POST /organizations/:organizationId/media/upload
 *     (multipart, field "file"), which returns the stored fileUrl, or
 *   - an external link (YouTube, Vimeo, Google Drive, any https URL).
 *
 * organizationId comes from the route, never from the body.
 */

import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from "class-validator";

import { ChurchMediaType, ChurchMediaVisibility } from "../schemas/church-media.schema";

/** What the media is for (independent of its format). */
export const MEDIA_CATEGORIES = [
  "sermon",
  "message",
  "presentation",
  "training",
  "event",
  "worship",
  "resource",
  "announcement",
  "other",
] as const;

export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];

export class CreateMediaDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsEnum(ChurchMediaType)
  mediaType!: ChurchMediaType;

  /** Uploaded file path (/uploads/organization-media/...) or an https link. */
  @IsString()
  @MaxLength(2000)
  fileUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(60 * 60 * 24)
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  speaker?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(MEDIA_CATEGORIES as unknown as string[])
  category?: MediaCategory;

  @IsOptional()
  @IsEnum(ChurchMediaVisibility)
  visibility?: ChurchMediaVisibility;

  /** true = published now; false = saved as a draft (admins only). */
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  /* Filled in from the upload response. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  fileSize?: number;
}
