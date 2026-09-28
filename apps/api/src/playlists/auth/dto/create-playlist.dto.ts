import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import {
  ACCESS_TYPES,
  CONTENT_TYPES,
  PRODUCER_CATEGORIES,
  VISIBILITY_TYPES,
  type AccessType,
  type ContentType,
  type ProducerCategory,
  type Visibility,
} from '../../constants/playlist.constants';

/**
 * DTO for creating a playlist.
 *
 * The frontend submits this as multipart/form-data.
 * Fields such as tags, booleans, and numbers may therefore arrive as
 * strings and are transformed back into their expected types.
 */
export class CreatePlaylistDto {
  @IsString()
  @MaxLength(140)
  title!: string;

  @IsString()
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsEnum(PRODUCER_CATEGORIES)
  category!: ProducerCategory;

  @IsEnum(CONTENT_TYPES)
  contentType!: ContentType;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  genre?: string;

  @IsEnum(VISIBILITY_TYPES)
  visibility!: Visibility;

  @IsEnum(ACCESS_TYPES)
  access!: AccessType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  price?: number;

  @IsOptional()
  @IsISO8601()
  releaseDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    }

    return value;
  })
  tags?: string[];

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  allowComments?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  allowSharing?: boolean;
}