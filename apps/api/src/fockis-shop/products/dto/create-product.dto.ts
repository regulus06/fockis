
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from "class-validator";
import { Transform } from "class-transformer";

export class CreateProductDto {
  // BASIC INFO
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  location?: string;

  // PRICE
  @Transform(({ value }) =>
    value === "" || value === null || value === undefined
      ? value
      : Number(value),
  )
  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === "" || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsNumber()
  @Min(0)
  @Max(100)
  discount?: number;

  // STOCK
  @Transform(({ value }) =>
    value === "" || value === null || value === undefined
      ? value
      : Number(value),
  )
  @IsNumber()
  @Min(0)
  stock!: number;

  // CATEGORY
  @IsString()
  category!: string;

  // MEDIA
  @IsOptional()
  @IsArray()
  images?: string[];

  // STORE CONNECTION
  @IsString()
  storeId!: string;

  // SHIPPING PACKAGE
  @IsOptional()
  @Transform(({ value }) =>
    value === "" || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsNumber()
  @Min(0.000001)
  shippingWeight?: number;

  @IsOptional()
  @IsIn(["lb", "oz", "kg", "g"])
  shippingWeightUnit?: "lb" | "oz" | "kg" | "g";

  @IsOptional()
  @Transform(({ value }) =>
    value === "" || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsNumber()
  @Min(0.000001)
  shippingLength?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === "" || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsNumber()
  @Min(0.000001)
  shippingWidth?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === "" || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsNumber()
  @Min(0.000001)
  shippingHeight?: number;

  @IsOptional()
  @IsIn(["in", "cm", "ft", "mm", "m"])
  shippingDimensionUnit?: "in" | "cm" | "ft" | "mm" | "m";

  // MARKETPLACE DISPLAY
  @IsOptional()
  @IsArray()
  displayLocations?: string[];

  // FEED PROMOTION
  @IsOptional()
  @Transform(({ value }) =>
    value === "" || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsNumber()
  @Min(1)
  feedDays?: number;

  // STORY PROMOTION
  @IsOptional()
  @Transform(({ value }) =>
    value === "" || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsNumber()
  @Min(1)
  storyDays?: number;
}
