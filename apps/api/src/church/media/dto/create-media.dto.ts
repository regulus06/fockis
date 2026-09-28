/**
 * create-media.dto.ts
 * Payload for POST /organizations/:organizationId/media. Mirrors
 * web/src/features/church/types/church.types.ts -> ChurchMedia's writable
 * fields (organizationId itself comes from the route param, not the body).
 */

import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";

import { ChurchMediaType } from "../schemas/church-media.schema";

export class CreateMediaDto {
  @IsString()
  title!: string;

  @IsEnum(ChurchMediaType)
  mediaType!: ChurchMediaType;

  @IsString()
  fileUrl!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  speaker?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}