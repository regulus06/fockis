import {
  IsOptional,
  IsString,
  IsObject,
} from 'class-validator';

export class OcrDocumentDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}