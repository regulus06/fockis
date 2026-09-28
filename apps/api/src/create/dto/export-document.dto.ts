import {
  IsOptional,
  IsString,
} from 'class-validator';

export class ExportDocumentDto {
  @IsOptional()
  @IsString()
  format?: string;
}