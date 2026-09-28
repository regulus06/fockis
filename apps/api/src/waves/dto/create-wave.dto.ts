import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWaveDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsOptional()
  @IsString()
  userPhoto?: string;

  @IsOptional()
  @IsString()
  content?: string;

  // video / image URL from upload pipeline
  @IsOptional()
  @IsString()
  media?: string;
}