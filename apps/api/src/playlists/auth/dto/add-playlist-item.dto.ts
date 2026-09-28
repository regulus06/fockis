import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import {
  MEDIA_KINDS,
  type MediaKind,
} from '../../constants/playlist.constants';

/**
 * DTO for adding a track/item to a playlist.
 */
export class AddPlaylistItemDto {
  @IsString()
  title!: string;

  @IsString()
  artist!: string;

  @IsEnum(MEDIA_KINDS)
  mediaKind!: MediaKind;

  @IsNumber()
  @Min(1)
  durationSeconds!: number;

  @IsOptional()
  @IsString()
  previewUrl?: string;

  @IsOptional()
  @IsString()
  streamUrl?: string;

  @IsOptional()
  @IsString()
  posterUrl?: string;
}