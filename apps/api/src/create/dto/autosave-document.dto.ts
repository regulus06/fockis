import {
  IsArray,
  IsObject,
  IsOptional,
} from 'class-validator';

export class AutosaveDocumentContentDto {
  @IsOptional()
  @IsObject()
  fields?: Record<string, any>;

  @IsOptional()
  @IsArray()
  elements?: any[];
}

export class AutosaveDocumentDto {
  @IsObject()
  content!: AutosaveDocumentContentDto;
}