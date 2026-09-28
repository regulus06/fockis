import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

import {
  ContentPriceCurrency,
  ContentType,
} from "../types/content-monetization.types";

export class CreateContentPriceDto {
  @IsString()
  contentId!: string;

  @IsEnum(ContentType)
  contentType!: ContentType;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  isPaid!: boolean;

  @IsNumber()
  @Min(0)
  streamPrice!: number;

  @IsNumber()
  @Min(0)
  downloadPrice!: number;

  @IsEnum(ContentPriceCurrency)
  currency!: ContentPriceCurrency;

  @IsBoolean()
  downloadEnabled!: boolean;

  @IsBoolean()
  downloadIncludedWithStream!: boolean;
}