import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  IsNotEmpty,
  MaxLength,
} from "class-validator";

import { Transform } from "class-transformer";

const toNumber = ({ value }: { value: unknown }) =>
  value === "" || value === null || value === undefined
    ? value
    : Number(value);

export class CreateProductDto {
  // =====================================================
  // BASIC INFO
  // =====================================================

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
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

  // =====================================================
  // BRAND OWNERSHIP
  // =====================================================

  @IsOptional()
  @IsIn([
    "OWN_BRAND",
    "THIRD_PARTY_BRAND",
    "UNBRANDED",
  ])
  brandOwnership?:
    | "OWN_BRAND"
    | "THIRD_PARTY_BRAND"
    | "UNBRANDED";

  // =====================================================
  // PRODUCT SOURCE
  // =====================================================

  @IsOptional()
  @IsIn([
    "SELF_MANUFACTURED",
    "SUPPLIER",
    "DROPSHIPPING",
  ])
  productSource?:
    | "SELF_MANUFACTURED"
    | "SUPPLIER"
    | "DROPSHIPPING";

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplierName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  sourcingDetails?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  fulfillmentDetails?: string;

  // =====================================================
  // PRICE
  // =====================================================

  @Transform(toNumber)
  @IsNumber()
  @Min(0.000001)
  price!: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  @Max(100)
  discount?: number;

  // =====================================================
  // STOCK
  // =====================================================

  @Transform(toNumber)
  @IsNumber()
  @Min(0)
  stock!: number;

  // =====================================================
  // CATEGORY
  // =====================================================

  @IsString()
  @IsNotEmpty()
  category!: string;

  // =====================================================
  // MEDIA
  // =====================================================

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  // =====================================================
  // STORE CONNECTION
  // =====================================================

  @IsString()
  @IsNotEmpty()
  storeId!: string;

  // =====================================================
  // SHIPPING PACKAGE
  // =====================================================

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0.000001)
  shippingWeight?: number;

  @IsOptional()
  @IsIn(["lb", "oz", "kg", "g"])
  shippingWeightUnit?: "lb" | "oz" | "kg" | "g";

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0.000001)
  shippingLength?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0.000001)
  shippingWidth?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(0.000001)
  shippingHeight?: number;

  @IsOptional()
  @IsIn(["in", "cm", "ft", "mm", "m"])
  shippingDimensionUnit?: "in" | "cm" | "ft" | "mm" | "m";

  // =====================================================
  // MARKETPLACE DISPLAY
  // =====================================================

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  displayLocations?: string[];

  // =====================================================
  // FEED PROMOTION
  // =====================================================

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(1)
  feedDays?: number;

  // =====================================================
  // STORY PROMOTION
  // =====================================================

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(1)
  storyDays?: number;
}