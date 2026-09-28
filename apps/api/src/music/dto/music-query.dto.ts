import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

import {
  MusicAccessType,
  MusicContentType,
  MusicGenre,
} from '../schemas/music-content.schema';

export type MusicSort =
  | 'trending'
  | 'most_played'
  | 'most_viewed'
  | 'most_purchased'
  | 'highest_rated'
  | 'top_music'
  | 'top_videos'
  | 'top_earning'
  | 'rising'
  | 'newest'
  | 'price_asc'
  | 'price_desc';

export class MusicQueryDto {
  @IsOptional()
  @IsEnum(MusicContentType)
  type?: MusicContentType;

  @IsOptional()
  @IsEnum(MusicGenre)
  genre?: MusicGenre;

  @IsOptional()
  @IsEnum(MusicAccessType)
  accessType?: MusicAccessType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  producerId?: string;

  @IsOptional()
  @IsIn([
    'trending',
    'most_played',
    'most_viewed',
    'most_purchased',
    'highest_rated',
    'top_music',
    'top_videos',
    'top_earning',
    'rising',
    'newest',
    'price_asc',
    'price_desc',
  ])
  sort?: MusicSort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 24;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}