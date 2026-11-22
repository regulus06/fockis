/**
 * create-department.dto.ts
 * ---------------------------------------------------------------------------
 * Payload for:
 *
 * POST /organizations/:organizationId/departments
 *
 * organizationId comes from the route and MUST NOT be accepted from the
 * request body.
 *
 * createdByUserId is also NOT accepted from the client.
 * The backend gets the authenticated user ID from JWT authentication.
 * ---------------------------------------------------------------------------
 */

import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  Matches,
  Max,
  Min,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

import { DepartmentType } from "../../enums/department-type.enum";
import { MINISTRY_CATEGORIES } from "../../ministries/ministry.schemas";

export class MinistryMeetingDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  day?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  startTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  /* Structured schedule — see MinistryMeeting in department.schema.ts */

  @IsOptional()
  @IsString()
  @MaxLength(64)
  key?: string;

  @IsOptional()
  @IsIn(["", "once", "weekly", "biweekly", "monthly"])
  frequency?: "" | "once" | "weekly" | "biweekly" | "monthly";

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays?: number[];

  @IsOptional()
  @Matches(/^(\d{4}-\d{2}-\d{2})?$/)
  anchorDate?: string;

  @IsOptional()
  @Matches(/^(\d{4}-\d{2}-\d{2})?$/)
  endDate?: string;

  @IsOptional()
  @Matches(/^(([01]\d|2[0-3]):[0-5]\d)?$/)
  startClock?: string;

  @IsOptional()
  @Matches(/^(([01]\d|2[0-3]):[0-5]\d)?$/)
  endClock?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeZone?: string;

  @IsOptional()
  @IsBoolean()
  attendance?: boolean;
}

export class CreateDepartmentDto {
  @IsString()
  name!: string;

  @IsEnum(DepartmentType)
  departmentType!: DepartmentType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  leaderIds?: string[];

  /** Leader positions keyed by Membership ID. */
  @IsOptional()
  @IsObject()
  leaderTitles?: Record<string, string>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MinistryMeetingDto)
  meetingSchedule?: MinistryMeetingDto[];

  /* ---- Ministries management (org/ministries) ---- */

  @IsOptional()
  @IsIn(MINISTRY_CATEGORIES as unknown as string[])
  category?: string;

  /** Only "active" (publish) or "draft" (save draft) are accepted here. */
  @IsOptional()
  @IsIn(["active", "draft", "inactive"])
  ministryStatus?: "active" | "draft" | "inactive";

  /** Partial MinistrySettings; cleaned server-side. */
  @IsOptional()
  @IsObject()
  ministrySettings?: Record<string, unknown>;
}
