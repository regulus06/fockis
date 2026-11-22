/**
 * ministry-attendance.dto.ts — request validation for ministry attendance.
 * Official status / late minutes are never accepted from the client: the
 * service recomputes them from the arrival time and the session's start.
 */

import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import { MinistryAttendanceStatus } from "./ministry-attendance.schemas";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export class RecordAttendanceBodyDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsMongoId({ each: true })
  membershipIds!: string[];

  @IsIn(Object.values(MinistryAttendanceStatus))
  status!: MinistryAttendanceStatus;

  /** Actual arrival, "HH:mm" in the meeting's local time. */
  @IsOptional()
  @Matches(HHMM)
  arrivalTime?: string;

  @IsOptional()
  @Matches(YMD)
  arrivalDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  /** Replace existing records (a correction, written to the audit history). */
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}

export class FinalizeBodyDto {
  @IsIn(["absent", "excused", "leave"])
  unrecorded!: "absent" | "excused" | "leave";
}

export class ReasonBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class WindowBodyDto {
  @IsIn(["open", "close"])
  action!: "open" | "close";
}

export class CheckInBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  token?: string;
}

export class CreateSessionBodyDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @Matches(YMD)
  date!: string;

  @Matches(HHMM)
  startTime!: string;

  @IsOptional()
  @Matches(HHMM)
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;
}

export class AttendanceSettingsBodyDto {
  @IsOptional() @IsBoolean() qrCheckIn?: boolean;
  @IsOptional() @IsBoolean() selfCheckIn?: boolean;
  @IsOptional() @IsBoolean() manualAttendance?: boolean;
  @IsOptional() @IsBoolean() allowCorrections?: boolean;
  @IsOptional() @IsBoolean() requireCorrectionReason?: boolean;
  @IsOptional() @IsBoolean() allowCorrectionsAfterFinalize?: boolean;
  @IsOptional() @IsBoolean() allowReopen?: boolean;
  @IsOptional() @IsBoolean() allowVisitors?: boolean;
  @IsOptional() @IsBoolean() membersSeeOwnHistory?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  opensMinutesBefore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  closesMinutesAfter?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeZone?: string;
}
