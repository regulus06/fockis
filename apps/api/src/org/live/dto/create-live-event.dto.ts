/**
 * create-live-event.dto.ts
 * Payload for POST /organizations/:organizationId/live. Mirrors
 * web/src/features/church/api/churchLiveApi.ts -> ScheduleLiveEventInput
 * (organizationId itself comes from the route param, not the body).
 *
 * There is no dedicated update-live-event.dto.ts in this module's file
 * list, so the PATCH endpoint's payload is an inline PartialType of this
 * class declared in church-live.controller.ts.
 */

import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

import { LiveEventVisibility } from '../services/church-live.service';

export class CreateLiveEventDto {
  @IsString()
  title!: string;

  @IsEnum(LiveEventVisibility)
  visibility!: LiveEventVisibility;

  @IsDateString()
  scheduledStart!: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  invitedGuestEmails?: string[];
}