import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

import {
  Type,
} from "class-transformer";

/* ============================================================================
 * AGENDA
 * ========================================================================== */

export class CreateMeetingAgendaDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

/* ============================================================================
 * SECURITY
 * ========================================================================== */

export class CreateMeetingSecurityDto {
  @IsOptional()
  @IsBoolean()
  waitingRoomEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  allowJoinBeforeHost?: boolean;

  @IsOptional()
  @IsBoolean()
  muteParticipantsOnEntry?: boolean;

  @IsOptional()
  @IsIn([
    "host_only",
    "everyone",
  ])
  screenShareWhoCanShare?:
    | "host_only"
    | "everyone";

  @IsOptional()
  @IsBoolean()
  locked?: boolean;
}

/* ============================================================================
 * AI SECRETARY
 * ========================================================================== */

export class CreateMeetingSecretaryDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  takeNotes?: boolean;

  @IsOptional()
  @IsBoolean()
  generateTranscript?: boolean;

  @IsOptional()
  @IsBoolean()
  identifyMainPoints?: boolean;

  @IsOptional()
  @IsBoolean()
  identifyDecisions?: boolean;

  @IsOptional()
  @IsBoolean()
  identifyActionItems?: boolean;

  @IsOptional()
  @IsBoolean()
  identifyQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  generateSummary?: boolean;

  @IsOptional()
  @IsBoolean()
  generatePdfReport?: boolean;
}

/* ============================================================================
 * CREATE MEETING
 * ========================================================================== */

export class CreateMeetingDto {
  /* --------------------------------------------------------------------------
   * BASIC INFORMATION
   * ------------------------------------------------------------------------ */

  @IsString()
  topic!: string;

  @IsOptional()
  @IsString()
  description?: string;

  /* --------------------------------------------------------------------------
   * MEETING ACCESS / VISIBILITY
   * ------------------------------------------------------------------------ */

  /**
   * Controls who can access the meeting.
   *
   * private:
   *   Private Fockis meeting.
   *
   * invite_only:
   *   Only explicitly invited participants.
   *
   * members:
   *   Members of the relevant organization/group.
   *
   * organization:
   *   Organization-wide meeting.
   *
   * public:
   *   Public meeting.
   */
  @IsOptional()
  @IsIn([
    "private",
    "invite_only",
    "members",
    "organization",
    "public",
  ])
  visibility?:
    | "private"
    | "invite_only"
    | "members"
    | "organization"
    | "public";

  /**
   * Whether participants need approval before being admitted.
   */
  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  /**
   * Whether guests who are not invited/members are allowed.
   */
  @IsOptional()
  @IsBoolean()
  allowGuests?: boolean;

  /**
   * Maximum total number of participants.
   *
   * This represents the total meeting capacity, including the host.
   *
   * Example:
   *
   * maxParticipants = 20
   *
   * means:
   *   1 host + up to 19 additional participants.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  maxParticipants?: number;

  /* --------------------------------------------------------------------------
   * START TIME
   * ------------------------------------------------------------------------ */

  /**
   * Meeting start datetime.
   *
   * Example:
   *
   * 2026-08-20T10:00:00.000-04:00
   */
  @IsISO8601()
  startTime!: string;

  /* --------------------------------------------------------------------------
   * END TIME
   * ------------------------------------------------------------------------ */

  /**
   * Meeting end datetime.
   *
   * Example:
   *
   * 2026-08-20T10:30:00.000-04:00
   */
  @IsISO8601()
  endTime!: string;

  /* --------------------------------------------------------------------------
   * DURATION
   * ------------------------------------------------------------------------ */

  /**
   * Meeting duration in minutes.
   */
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes!: number;

  /* --------------------------------------------------------------------------
   * TIMEZONE
   * ------------------------------------------------------------------------ */

  @IsOptional()
  @IsString()
  timezone?: string;

  /* --------------------------------------------------------------------------
   * PASSCODE
   * ------------------------------------------------------------------------ */

  @IsOptional()
  @IsString()
  passcode?: string;

  /* --------------------------------------------------------------------------
   * INVITED USERS
   * ------------------------------------------------------------------------ */

  @IsOptional()
  @IsArray()
  @IsMongoId({
    each: true,
  })
  inviteeIds?: string[];

  /* --------------------------------------------------------------------------
   * AGENDA
   * ------------------------------------------------------------------------ */

  @IsOptional()
  @IsArray()
  @ValidateNested({
    each: true,
  })
  @Type(() => CreateMeetingAgendaDto)
  agenda?: CreateMeetingAgendaDto[];

  /* --------------------------------------------------------------------------
   * SECURITY
   * ------------------------------------------------------------------------ */

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateMeetingSecurityDto)
  security?: CreateMeetingSecurityDto;

  /* --------------------------------------------------------------------------
   * AI SECRETARY
   * ------------------------------------------------------------------------ */

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateMeetingSecretaryDto)
  secretary?: CreateMeetingSecretaryDto;

  /* --------------------------------------------------------------------------
   * RECORDING
   * ------------------------------------------------------------------------ */

  @IsOptional()
  @IsBoolean()
  recordingEnabled?: boolean;
}