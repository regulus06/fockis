import { PartialType } from "@nestjs/mapped-types";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

import { LANDMARK_RELATIONS, LOCATION_KINDS, ROUTE_MODES } from "./place.schemas";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class LandmarkDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsIn(LANDMARK_RELATIONS)
  relation?: (typeof LANDMARK_RELATIONS)[number];
}

export class BuildingDto {
  @IsIn(["osm", "pin"])
  source!: "osm" | "pin";

  @IsOptional()
  @IsString()
  @MaxLength(40)
  osmId?: string;

  @IsOptional()
  @IsObject()
  footprint?: { type: "Polygon"; coordinates: number[][][] } | null;
}

export class SaveLocationDto {
  @IsOptional()
  @IsIn(LOCATION_KINDS)
  kind?: (typeof LOCATION_KINDS)[number];

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;

  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000)
  accuracyM?: number;

  @IsOptional()
  @IsIn(["gps", "pin", "search", "building"])
  captureMethod?: "gps" | "pin" | "search" | "building";

  @IsOptional()
  @ValidateNested()
  @Type(() => BuildingDto)
  building?: BuildingDto;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) country?: string;
  @IsOptional() @Transform(trim) @Matches(/^[A-Za-z]{2}$/) countryCode?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) department?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) commune?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) communalSection?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) neighborhood?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) locality?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) streetAddress?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) directions?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => LandmarkDto)
  landmarks?: LandmarkDto[];

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateLocationDto extends PartialType(SaveLocationDto) {}

export class ShareLocationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}

class PointDto {
  @Type(() => Number) @IsLatitude() lat!: number;
  @Type(() => Number) @IsLongitude() lon!: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) label?: string;
}

export class PlanRouteDto {
  @ValidateNested() @Type(() => PointDto) origin!: PointDto;
  @ValidateNested() @Type(() => PointDto) destination!: PointDto;
  @IsIn(ROUTE_MODES) mode!: (typeof ROUTE_MODES)[number];
  @IsOptional() @IsBoolean() alternatives?: boolean;
  @IsOptional() @IsBoolean() avoidHighways?: boolean;
  @IsOptional() @IsString() @MaxLength(10) language?: string;
}

export class PlanFlightDto {
  @ValidateNested() @Type(() => PointDto) origin!: PointDto;
  @ValidateNested() @Type(() => PointDto) destination!: PointDto;
  /** IATA codes to override the suggested airports. */
  @IsOptional() @IsString() @Matches(/^[A-Za-z]{3}$/) departure?: string;
  @IsOptional() @IsString() @Matches(/^[A-Za-z]{3}$/) arrival?: string;
  @IsOptional() @IsString() @MaxLength(10) language?: string;
}

export class SaveRouteDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(80) name!: string;
  @ValidateNested() @Type(() => PointDto) origin!: PointDto;
  @ValidateNested() @Type(() => PointDto) destination!: PointDto;
  @IsIn(ROUTE_MODES) mode!: (typeof ROUTE_MODES)[number];
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) distanceM?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) durationS?: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) summary?: string;
}

/* ---------------------------------------------------------------- verification */

export class RequestVerificationDto {
  /** Optional reply to the reviewer ("I added the gate colour"). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class ReviewAddressDto {
  @IsIn(["verify", "needs_info", "reject"])
  action!: "verify" | "needs_info" | "reject";

  /** Required to reject or ask for information; shown to the owner. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
