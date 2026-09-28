import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateNewsDto {
  @IsString() tag: string;
  @IsString() title: string;
  @IsString() date: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsBoolean() published?: boolean;
}
