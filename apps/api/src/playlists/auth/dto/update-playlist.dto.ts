import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreatePlaylistDto } from './create-playlist.dto';
import { PLAYLIST_STATUSES, type PlaylistStatus } from '../../constants/playlist.constants';

export class UpdatePlaylistDto extends PartialType(CreatePlaylistDto) {
  @IsOptional()
  @IsEnum(PLAYLIST_STATUSES)
  status?: PlaylistStatus;
}