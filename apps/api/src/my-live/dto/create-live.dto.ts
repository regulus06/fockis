import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

import { Type } from "class-transformer";

export class LiveProductDto {
  @IsString()
  @MaxLength(100)
  productId!: string;

  @IsString()
  @MaxLength(250)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  @Max(999999999)
  price!: number;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  @Max(999999999)
  salePrice?: number;
}

export class CreateLiveDto {
  @IsString()
  @MaxLength(150)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  thumbnailUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({
    each: true,
  })
  @Type(() => LiveProductDto)
  products?: LiveProductDto[];
}