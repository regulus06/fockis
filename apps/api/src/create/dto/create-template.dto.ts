import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { CreateToolType } from '../interfaces/editor.interfaces';

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsOptional()
  type?: CreateToolType;

  @IsOptional()
  @IsArray()
  fields?: any[];

  @IsOptional()
  @IsArray()
  elements?: any[];

  @IsOptional()
  @IsObject()
  canvas?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}