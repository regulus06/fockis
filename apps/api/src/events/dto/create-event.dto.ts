import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

import {
  EventCategory,
  EventCoverMediaType,
  EventVisibility,
} from "../schemas/event.schema";

import {
  EmptyToUndefined,
  NullableNumber,
  OptionalBoolean,
  Trimmed,
} from "./event-dto.helpers";

/** IANA zone such as "America/New_York" or "UTC". */
export const TIME_ZONE_PATTERN = /^(?:UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+){1,2})$/;

export class CreateEventDto {
  @Trimmed()
  @IsString()
  @IsNotEmpty({ message: "Give your event a title." })
  @MinLength(2, { message: "The title must be at least 2 characters." })
  @MaxLength(150, { message: "The title can be at most 150 characters." })
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: "The description can be at most 5,000 characters." })
  description?: string;

  @IsOptional()
  @IsEnum(EventCategory, { message: "Choose a valid category." })
  category?: EventCategory;

  @IsOptional()
  @IsEnum(EventVisibility, { message: "Choose a valid visibility." })
  visibility?: EventVisibility;

  @IsDateString({}, { message: "Enter a valid start date and time." })
  startDate!: string;

  @IsDateString({}, { message: "Enter a valid end date and time." })
  endDate!: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  @MaxLength(64)
  @Matches(TIME_ZONE_PATTERN, { message: "Invalid time zone." })
  timeZone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  locationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @NullableNumber()
  @ValidateIf((_, value) => value !== null)
  @IsLatitude({ message: "Latitude must be between -90 and 90." })
  latitude?: number | null;

  @IsOptional()
  @NullableNumber()
  @ValidateIf((_, value) => value !== null)
  @IsLongitude({ message: "Longitude must be between -180 and 180." })
  longitude?: number | null;

  @IsOptional()
  @OptionalBoolean()
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @EmptyToUndefined()
  @IsUrl({ require_protocol: true, protocols: ["http", "https"] }, { message: "The online meeting link must start with http:// or https://." })
  @MaxLength(2000)
  onlineUrl?: string;

  @IsOptional()
  @NullableNumber()
  @ValidateIf((_, value) => value !== null)
  @IsInt({ message: "Capacity must be a whole number." })
  @Min(1, { message: "Capacity must be at least 1." })
  @Max(1_000_000)
  capacity?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverVideoUrl?: string;

  @IsOptional()
  @IsEnum(EventCoverMediaType)
  coverMediaType?: EventCoverMediaType;
}
