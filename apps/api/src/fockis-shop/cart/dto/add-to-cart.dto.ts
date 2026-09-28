import {
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CartVariantDto {
  @IsString()
  variantId!: string;

  @IsString()
  optionsLabel!: string;
}

export class AddToCartDto {
  @IsMongoId()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  // --------------------------------------------------------------------------
  // FRONTEND CART DISPLAY DATA
  // --------------------------------------------------------------------------

  @IsOptional()
  @IsString()
  productSlug?: string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  productImageUrl?: string;

  @IsOptional()
  @IsString()
  productEmoji?: string;

  // --------------------------------------------------------------------------
  // SELLER
  // --------------------------------------------------------------------------

  @IsOptional()
  @IsMongoId()
  sellerId?: string | null;

  @IsOptional()
  @IsString()
  sellerName?: string | null;

  // --------------------------------------------------------------------------
  // STORE
  // --------------------------------------------------------------------------

  @IsOptional()
  @IsMongoId()
  storeId?: string;

  @IsOptional()
  @IsString()
  storeSlug?: string;

  @IsOptional()
  @IsString()
  storeName?: string;

  // --------------------------------------------------------------------------
  // PRICING
  // --------------------------------------------------------------------------

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  originalPrice?: number;

  @IsOptional()
  @IsNumber()
  salePrice?: number | null;

  @IsOptional()
  @IsString()
  currency?: string;

  // --------------------------------------------------------------------------
  // PRODUCT METADATA
  // --------------------------------------------------------------------------

  @IsOptional()
  @IsString()
  sku?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => CartVariantDto)
  variant?: CartVariantDto | null;
}