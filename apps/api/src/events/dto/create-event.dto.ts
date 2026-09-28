import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from "class-validator";

import {
  EventCategory,
  EventVisibility,
  EventCoverMediaType,
} from "../schemas/event.schema";

export class CreateEventDto {
  /* ==========================================================================
     TITLE
  ========================================================================== */

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  title!: string;


  /* ==========================================================================
     DESCRIPTION
  ========================================================================== */

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;


  /* ==========================================================================
     CATEGORY
  ========================================================================== */

  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;


  /* ==========================================================================
     VISIBILITY
  ========================================================================== */

  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;


  /* ==========================================================================
     START DATE
  ========================================================================== */

  @IsDateString()
  startDate!: string;


  /* ==========================================================================
     END DATE
  ========================================================================== */

  @IsDateString()
  endDate!: string;


  /* ==========================================================================
     LOCATION
  ========================================================================== */

  @IsOptional()
  @IsString()
  @MaxLength(255)
  locationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;


  /* ==========================================================================
     COORDINATES
  ========================================================================== */

  @IsOptional()
  @IsNumber()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @IsLongitude()
  longitude?: number;


  /* ==========================================================================
     ONLINE EVENT
  ========================================================================== */

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @IsUrl()
  onlineUrl?: string;


  /* ==========================================================================
     COVER IMAGE
  ========================================================================== */

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverImageUrl?: string;


  /* ==========================================================================
     COVER VIDEO
  ========================================================================== */

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverVideoUrl?: string;


  /* ==========================================================================
     COVER MEDIA TYPE
  ========================================================================== */

  @IsOptional()
  @IsEnum(EventCoverMediaType)
  coverMediaType?: EventCoverMediaType;


  /* ==========================================================================
     COVER IMAGE FILE
  ========================================================================== */

  @IsOptional()
  @IsString()
  @MaxLength(10_000_000)
  coverImageFile?: string;
}