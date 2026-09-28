import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from "class-validator";

import {
  Type,
} from "class-transformer";

import {
  AdvertisementDestination,
  AdvertisementPlacement,
  AdvertisementType,
} from "../schemas/advertisement.schema";


/* ============================================================================
   UPDATE CAROUSEL ITEM
============================================================================ */

export class UpdateCarouselItemDto {

  @IsUrl()
  mediaUrl!: string;


  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;


  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;


  @IsOptional()
  @IsUrl()
  destinationUrl?: string;

}


/* ============================================================================
   UPDATE AD DTO
============================================================================ */

export class UpdateAdDto {


  /* ==========================================================================
     BASIC INFORMATION
  ========================================================================== */

  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;


  @IsOptional()
  @IsEnum(AdvertisementType)
  type?: AdvertisementType;


  @IsOptional()
  @IsString()
  @MaxLength(120)
  headline?: string;


  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;


  /* ==========================================================================
     MEDIA
  ========================================================================== */

  @IsOptional()
  @IsUrl()
  mediaUrl?: string;


  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;


  @IsOptional()
  @IsUrl()
  appIconUrl?: string;


  @IsOptional()
  @IsArray()
  @ValidateNested({
    each: true,
  })
  @Type(() => UpdateCarouselItemDto)
  carouselItems?: UpdateCarouselItemDto[];


  /* ==========================================================================
     DESTINATION
  ========================================================================== */

  @IsOptional()
  @IsEnum(AdvertisementDestination)
  destinationType?: AdvertisementDestination;


  @IsOptional()
  @IsUrl()
  destinationUrl?: string;


  @IsOptional()
  @IsMongoId()
  destinationId?: string;


  /* ==========================================================================
     PLACEMENTS
  ========================================================================== */

  @IsOptional()
  @IsArray()
  @IsEnum(AdvertisementPlacement, {
    each: true,
  })
  placements?: AdvertisementPlacement[];


  /* ==========================================================================
     CALL TO ACTION
  ========================================================================== */

  @IsOptional()
  @IsString()
  @MaxLength(50)
  callToAction?: string;

}