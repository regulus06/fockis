import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import { EventCategory } from "../schemas/event.schema";
import { EmptyToUndefined, OptionalBoolean } from "./event-dto.helpers";
import { TIME_ZONE_PATTERN } from "./create-event.dto";

export const EVENT_WHEN_VALUES = [
  "any",
  "live",
  "today",
  "tomorrow",
  "this-week",
  "this-weekend",
  "next-30-days",
] as const;

export const EVENT_FORMAT_VALUES = ["any", "online", "in-person"] as const;
export const EVENT_AVAILABILITY_VALUES = ["any", "open"] as const;
export const EVENT_SORT_VALUES = ["relevance", "date", "popularity", "distance"] as const;

export type EventWhen = (typeof EVENT_WHEN_VALUES)[number];
export type EventFormat = (typeof EVENT_FORMAT_VALUES)[number];
export type EventAvailability = (typeof EVENT_AVAILABILITY_VALUES)[number];
export type EventSort = (typeof EVENT_SORT_VALUES)[number];

/**
 * GET /events/discover
 *
 * Calendar ranges ("today", "this weekend") depend on the viewer's local
 * calendar, so the client sends the instants that bound its local "today"
 * (dayStart/dayEnd, ISO). Without them UTC days are used.
 */
export class DiscoverEventsQueryDto {
  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @IsOptional()
  @EmptyToUndefined()
  @IsIn(EVENT_WHEN_VALUES as unknown as string[])
  when?: EventWhen;

  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  from?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  to?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  dayStart?: string;

  /** Viewer's IANA time zone, used for "this weekend". */
  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  @MaxLength(64)
  @Matches(TIME_ZONE_PATTERN)
  tz?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsIn(EVENT_FORMAT_VALUES as unknown as string[])
  format?: EventFormat;

  @IsOptional()
  @EmptyToUndefined()
  @IsIn(EVENT_AVAILABILITY_VALUES as unknown as string[])
  availability?: EventAvailability;

  @IsOptional()
  @EmptyToUndefined()
  @IsIn(EVENT_SORT_VALUES as unknown as string[])
  sort?: EventSort;

  @IsOptional()
  @EmptyToUndefined()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @EmptyToUndefined()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @IsOptional()
  @EmptyToUndefined()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  radiusKm?: number;

  @IsOptional()
  @EmptyToUndefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  page?: number;

  @IsOptional()
  @EmptyToUndefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

/** GET /events/sections */
export class EventSectionsQueryDto {
  @IsOptional()
  @EmptyToUndefined()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @EmptyToUndefined()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @IsOptional()
  @EmptyToUndefined()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  radiusKm?: number;

  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  dayStart?: string;

  @IsOptional()
  @EmptyToUndefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  limit?: number;
}

/** GET /events (legacy list) */
export class ListEventsQueryDto {
  @IsOptional()
  @OptionalBoolean()
  @IsBoolean()
  includeEnded?: boolean;
}
