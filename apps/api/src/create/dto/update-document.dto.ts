import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { DocumentStatus } from '../schemas/create-document.schema';

export class UpdateDocumentContentDto {
  @IsOptional()
  @IsObject()
  fields?: Record<string, any>;

  @IsOptional()
  @IsArray()
  elements?: any[];
}

export class UpdateDocumentMetadataDto {
  @IsOptional()
  @IsString()
  pageSize?: string;

  @IsOptional()
  @IsString()
  orientation?: string;

  [key: string]: any;
}

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  status?: DocumentStatus;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: UpdateDocumentMetadataDto;

  @IsOptional()
  @IsObject()
  content?: UpdateDocumentContentDto;
}