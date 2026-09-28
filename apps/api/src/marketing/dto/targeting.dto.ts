import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

import {
  TargetGender,
} from "../schemas/ad-targeting.schema";

export class TargetingDto {
  @IsOptional()
  @IsInt()
  @Min(13)
  @Max(100)
  minimumAge?: number;

  @IsOptional()
  @IsInt()
  @Min(13)
  @Max(100)
  maximumAge?: number;

  @IsOptional()
  @IsEnum(TargetGender)
  gender?: TargetGender;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  states?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  behaviors?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  devices?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  operatingSystems?: string[];

  @IsOptional()
  @IsBoolean()
  audienceExpansion?: boolean;
}