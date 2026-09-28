import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}