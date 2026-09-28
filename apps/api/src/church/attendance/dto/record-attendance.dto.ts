/**
 * record-attendance.dto.ts
 * -----------------------------------------------------------------------------
 * Payload for:
 *
 * POST /organizations/:organizationId/attendance
 *
 * Mirrors:
 * web/src/features/church/types/church.types.ts
 *
 * `organizationId` comes from the route parameter and is therefore not part
 * of this request body.
 * -----------------------------------------------------------------------------
 */

import {
  IsEnum,
  IsString,
} from "class-validator";

import {
  AttendanceType,
} from "../../enums/attendance-type.enum";

export class RecordAttendanceDto {
  @IsString()
  eventId!: string;

  @IsString()
  memberId!: string;

  @IsEnum(AttendanceType)
  attendanceType!: AttendanceType;
}