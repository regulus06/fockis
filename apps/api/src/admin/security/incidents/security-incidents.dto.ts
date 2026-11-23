import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import { INCIDENT_KINDS, INCIDENT_STATUSES, RECOVERY_STATUSES, RESTRICTION_STATUSES } from "./security-incident.schema";

export class IncidentListQueryDto {
  @IsOptional() @IsIn(INCIDENT_STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsIn(["warning", "high", "critical"]) level?: string;
  @IsOptional() @IsIn(INCIDENT_KINDS as unknown as string[]) kind?: string;
  @IsOptional() @IsIn(["true", "false"]) open?: string;
  @IsOptional() @IsString() @MaxLength(60) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class IncidentNoteDto {
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class ResolveIncidentDto {
  @IsString() @MaxLength(1000) note!: string;
  @IsOptional() @IsBoolean() liftRestriction?: boolean;
}

export class RestrictionListQueryDto {
  @IsOptional() @IsIn(["active", ...(RESTRICTION_STATUSES as unknown as string[])]) status?: string;
  @IsOptional() @IsString() @MaxLength(40) userId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class ReviewRestrictionDto {
  @IsIn(["lift", "keep"]) action!: "lift" | "keep";
  @IsString() @MaxLength(1000) note!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(168) extendHours?: number;
}

export class RecoveryListQueryDto {
  @IsOptional() @IsIn(["active", ...(RECOVERY_STATUSES as unknown as string[])]) status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class ReviewRecoveryDto {
  @IsIn(["start_review", "approve", "reject", "close"]) action!: "start_review" | "approve" | "reject" | "close";
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  /** Approve only: sign the account out everywhere. */
  @IsOptional() @IsBoolean() revokeSessions?: boolean;
  /** Approve only: require a new password at next sign-in. */
  @IsOptional() @IsBoolean() requirePasswordChange?: boolean;
}

/** Public recovery request (POST /auth/recovery). */
export class PublicRecoveryRequestDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MaxLength(1000) message!: string;
}
