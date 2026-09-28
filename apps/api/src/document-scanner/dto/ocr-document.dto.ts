import {
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class OcrDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  language?: string;
}