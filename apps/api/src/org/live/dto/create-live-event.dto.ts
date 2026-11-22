/**
 * create-live-event.dto.ts
 * Payload for POST /organizations/:organizationId/live and (all fields
 * optional) PATCH /organizations/:organizationId/live/:liveEventId.
 * organizationId comes from the route. ChurchLiveService validates the rest
 * (time order, own uploads, meeting link, group ids) and applies defaults.
 */

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { LiveEventVisibility, LiveSourceType } from '../schemas/live-event.schema';

export class LiveEventSettingsDto {
  @IsOptional() @IsBoolean() showOnPublicPage?: boolean;
  @IsOptional() @IsBoolean() showLockedPreview?: boolean;
  @IsOptional() @IsBoolean() enableChat?: boolean;
  @IsOptional() @IsBoolean() enableComments?: boolean;
  @IsOptional() @IsBoolean() enableRecording?: boolean;
  @IsOptional() @IsBoolean() allowReplay?: boolean;
  @IsOptional() @IsBoolean() allowSharing?: boolean;
  @IsOptional() @IsBoolean() notifyMembers?: boolean;
  @IsOptional() @IsBoolean() requireRegistration?: boolean;
  @IsOptional() @IsBoolean() waitingRoom?: boolean;
  @IsOptional() @IsBoolean() requireApproval?: boolean;
  @IsOptional() @IsBoolean() allowGuests?: boolean;
  @IsOptional() @IsBoolean() attendanceEnabled?: boolean;
  @IsOptional() @IsBoolean() allowAccessRequests?: boolean;
  @IsOptional() @IsBoolean() bearerLinks?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(120) earlyJoinMinutes?: number;
}

export class CreateLiveEventDto {
  @IsOptional() @IsString() @MaxLength(150) title?: string;

  @IsOptional() @IsEnum(LiveEventVisibility) visibility?: LiveEventVisibility;

  @IsOptional() @IsDateString() scheduledStart?: string;

  @IsOptional() @ValidateIf((_o, v) => v !== null && v !== '') @IsDateString() scheduledEnd?: string | null;

  @IsOptional() @IsString() @MaxLength(64) timeZone?: string;

  @IsOptional() @IsString() @MaxLength(140) location?: string;

  @IsOptional() @ValidateIf((_o, v) => v !== null && v !== '') @IsString() branchId?: string | null;

  @IsOptional() @IsString() @MaxLength(2000) description?: string;

  @IsOptional() @ValidateIf((_o, v) => v !== null && v !== '') @IsString() @MaxLength(500) posterUrl?: string | null;

  @IsOptional() @ValidateIf((_o, v) => v !== null && v !== '') @IsString() @MaxLength(500) coverUrl?: string | null;

  @IsOptional() @IsEnum(LiveSourceType) sourceType?: LiveSourceType;

  @IsOptional() @IsString() @MaxLength(2000) meetingUrl?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) allowedGroupIds?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) allowedDepartmentIds?: string[];

  /** Legacy invite list (still accepted for older clients). */
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsEmail({}, { each: true }) invitedGuestEmails?: string[];

  @IsOptional() @ValidateNested() @Type(() => LiveEventSettingsDto) settings?: LiveEventSettingsDto;

  @IsOptional() @ValidateIf((_o, v) => v !== null && v !== '') @IsString() eventId?: string | null;

  /** Save as draft (create) / move back to draft or publish (update). */
  @IsOptional() @IsBoolean() isDraft?: boolean;
}
