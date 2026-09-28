import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { CreateToolType } from '../interfaces/editor.interfaces';

export class DocumentContentDto {
  @IsOptional()
  @IsObject()
  fields?: Record<string, any>;

  @IsOptional()
  @IsArray()
  elements?: any[];
}

export class CreateDocumentDto {
  @IsOptional()
  @IsString()
  templateId?: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  type?: CreateToolType;

  @IsOptional()
  @IsObject()
  content?: DocumentContentDto;
}