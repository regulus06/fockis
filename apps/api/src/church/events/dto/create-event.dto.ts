/**
 * create-event.dto.ts
 * ---------------------------------------------------------------------------
 * Payload for:
 *
 * POST /organizations/:organizationId/events
 *
 * Mirrors:
 * web/src/features/church/types/church.types.ts -> CreateEventInput
 *
 * organizationId comes from the route parameter, not the request body.
 * ---------------------------------------------------------------------------
 */

import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";

import { EventType } from "../../enums/event-type.enum";

export class CreateEventDto {
  @IsString()
  title!: string;

  @IsEnum(EventType)
  eventType!: EventType;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @IsString()
  onlineUrl?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  requiresRsvp?: boolean;
}