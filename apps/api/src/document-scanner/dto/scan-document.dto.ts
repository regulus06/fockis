import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

import { DocumentScanType } from "../types/document-scanner.types";

export class ScanDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsEnum(DocumentScanType)
  type?: DocumentScanType;
}