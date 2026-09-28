/**
 * create-announcement.dto.ts
 * -----------------------------------------------------------------------------
 * Payload for POST /organizations/:organizationId/announcements.
 *
 * Mirrors:
 * web/src/features/church/types/church.types.ts
 *
 * organizationId comes from the route parameter, not the request body.
 * -----------------------------------------------------------------------------
 */

import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  AnnouncementAudience,
} from '../schemas/announcement.schema';

export class CreateAnnouncementDto {
  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsEnum(AnnouncementAudience)
  audience!: AnnouncementAudience;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}