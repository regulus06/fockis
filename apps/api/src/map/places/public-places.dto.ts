import { PartialType } from "@nestjs/mapped-types";
import { Transform, Type } from "class-transformer";
import { IsIn, IsLatitude, IsLongitude, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

import { PUBLIC_PLACE_CATEGORIES } from "./public-place.schema";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class SavePublicPlaceDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsIn(PUBLIC_PLACE_CATEGORIES) category!: (typeof PUBLIC_PLACE_CATEGORIES)[number];
  @Type(() => Number) @IsLatitude() latitude!: number;
  @Type(() => Number) @IsLongitude() longitude!: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(600) description?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) @Matches(/^[0-9+()\-.\s]*$/, { message: "Phone can only contain numbers, spaces and + ( ) -" }) phone?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) website?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) openingHours?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) addressText?: string;
  @IsOptional() @Transform(trim) @Matches(/^[A-Za-z]{2}$/) countryCode?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) department?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) commune?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) neighborhood?: string;
}

export class UpdatePublicPlaceDto extends PartialType(SavePublicPlaceDto) {}

export class ReviewPublicPlaceDto {
  @IsIn(["approve", "reject", "remove"]) action!: "approve" | "reject" | "remove";
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) note?: string;
}
