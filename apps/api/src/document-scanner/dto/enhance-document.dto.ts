import {
  IsBoolean,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from "class-validator";

export class EnhanceDocumentDto {
  @IsOptional()
  @IsBoolean()
  grayscale?: boolean;

  @IsOptional()
  @IsBoolean()
  sharpen?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(3)
  contrast?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(3)
  brightness?: number;
}