import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
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
   CAROUSEL ITEM
============================================================================ */

export class CreateCarouselItemDto {

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mediaUrl?: string;


  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;


  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;


  @IsOptional()
  @IsString()
  @MaxLength(2000)
  destinationUrl?: string;
}


/* ============================================================================
   CREATE AD DTO
============================================================================ */

export class CreateAdDto {

  /* ==========================================================================
     CAMPAIGN
  ========================================================================== */

  @IsMongoId()
  campaignId!: string;


  /* ==========================================================================
     BASIC INFORMATION
  ========================================================================== */

  @IsString()
  @MaxLength(150)
  name!: string;


  @IsEnum(AdvertisementType)
  type!: AdvertisementType;


  @IsString()
  @MaxLength(120)
  headline!: string;


  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;


  /* ==========================================================================
     MEDIA
  ========================================================================== */

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mediaUrl?: string;


  @IsOptional()
  @IsString()
  @MaxLength(2000)
  thumbnailUrl?: string;


  @IsOptional()
  @IsString()
  @MaxLength(2000)
  appIconUrl?: string;


  @IsOptional()
  @IsArray()
  @ValidateNested({
    each: true,
  })
  @Type(() => CreateCarouselItemDto)
  carouselItems?: CreateCarouselItemDto[];


  /* ==========================================================================
     DESTINATION
  ========================================================================== */

  @IsEnum(AdvertisementDestination)
  destinationType!: AdvertisementDestination;


  @IsOptional()
  @IsString()
  @MaxLength(2000)
  destinationUrl?: string;


  @IsOptional()
  @IsMongoId()
  destinationId?: string;


  /* ==========================================================================
     PLACEMENTS
  ========================================================================== */

  @IsArray()
  @IsEnum(AdvertisementPlacement, {
    each: true,
  })
  placements!: AdvertisementPlacement[];


  /* ==========================================================================
     CALL TO ACTION
  ========================================================================== */

  @IsOptional()
  @IsString()
  @MaxLength(50)
  callToAction?: string;


  /* ==========================================================================
     OPTIONAL AD-LEVEL SCHEDULE

     If these are not supplied, the advertisement follows the campaign
     schedule.

     If supplied, BOTH schedules must be valid for delivery.

     Example:

       campaign:
         Aug 1 - Aug 30

       ad:
         Aug 10 - Aug 20

     The ad only appears Aug 10-Aug 20.
  ========================================================================== */

  @IsOptional()
  @IsDateString()
  startDate?: string;


  @IsOptional()
  @IsDateString()
  endDate?: string;
}