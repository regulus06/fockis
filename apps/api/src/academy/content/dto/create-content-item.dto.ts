import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateContentItemDto {
  @IsString() section: string;
  @IsOptional() @IsNumber() order?: number;
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsObject() meta?: Record<string, string>;
}
