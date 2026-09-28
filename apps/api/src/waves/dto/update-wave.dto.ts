import { IsOptional, IsString } from 'class-validator';

export class UpdateWaveDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  media?: string;

  // 🎧 NEW
  @IsOptional()
  @IsString()
  music?: string;

  @IsOptional()
  @IsString()
  musicTitle?: string;

  @IsOptional()
  @IsString()
  audience?: 'public' | 'friends' | 'private';
}