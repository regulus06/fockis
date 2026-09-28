import {
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreatePdfDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}