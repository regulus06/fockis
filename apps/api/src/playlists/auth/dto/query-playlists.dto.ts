import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  ACCESS_TYPES,
  CONTENT_TYPES,
  LIBRARY_TABS,
  SORT_OPTIONS,
  type AccessType,
  type ContentType,
  type LibraryTab,
  type SortOption,
} from '../../constants/playlist.constants';

/**
 * New DTO (not in the original file list): shared query shape for
 * `GET /playlists` (marketplace browse) and `GET /playlists/me/library`,
 * matching the frontend's `PlaylistQueryParams`.
 */
export class QueryPlaylistsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn([...CONTENT_TYPES, 'all'])
  contentType?: ContentType | 'all';

  @IsOptional()
  @IsIn([...ACCESS_TYPES, 'all'])
  access?: AccessType | 'all';

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsEnum(SORT_OPTIONS)
  sort?: SortOption;

  @IsOptional()
  @IsEnum(LIBRARY_TABS)
  tab?: LibraryTab;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}