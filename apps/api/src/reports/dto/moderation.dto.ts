import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

import {
  APPEAL_MAX,
  AppealStatus,
  CaseAction,
  CasePriority,
  CaseStatus,
  ModerationConsequence,
  NOTE_MAX,
  ReportReason,
  ReportTargetType,
} from "../reports.constants";

const trim = () => Transform(({ value }) => (typeof value === "string" ? value.trim() : value));
const emptyToUndefined = () => Transform(({ value }) => (value === "" ? undefined : value));

/** GET /admin/moderation/cases */
export class ListCasesQueryDto {
  @IsOptional() @emptyToUndefined() @IsEnum(ReportTargetType)
  targetType?: ReportTargetType;

  /** A status, or "open" for every open status. */
  @IsOptional() @emptyToUndefined() @IsIn([...Object.values(CaseStatus), "open", "all"])
  status?: CaseStatus | "open" | "all";

  @IsOptional() @emptyToUndefined() @IsEnum(ReportReason)
  reason?: ReportReason;

  @IsOptional() @emptyToUndefined() @IsEnum(CasePriority)
  priority?: CasePriority;

  @IsOptional() @emptyToUndefined() @IsDateString()
  from?: string;

  @IsOptional() @emptyToUndefined() @IsDateString()
  to?: string;

  @IsOptional() @emptyToUndefined() @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  minReports?: number;

  /** A moderator id, "me" or "unassigned". */
  @IsOptional() @emptyToUndefined() @IsString() @MaxLength(32)
  assignedTo?: string;

  @IsOptional() @emptyToUndefined() @IsIn(Object.values(AppealStatus))
  appealStatus?: AppealStatus;

  /** Case id, target id or reported username. */
  @IsOptional() @emptyToUndefined() @trim() @IsString() @MaxLength(80)
  q?: string;

  @IsOptional() @emptyToUndefined() @IsIn(["priority", "newest", "oldest", "reports"])
  sort?: "priority" | "newest" | "oldest" | "reports";

  @IsOptional() @emptyToUndefined() @Type(() => Number) @IsInt() @Min(1) @Max(10000)
  page?: number;

  @IsOptional() @emptyToUndefined() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;
}

export class AssignCaseDto {
  /** Moderator to assign, or null to unassign. */
  @ValidateIf((_, value) => value !== null)
  @IsMongoId({ message: "Invalid moderator ID." })
  assigneeId!: string | null;
}

export class AddNoteDto {
  @trim() @IsString() @MinLength(1, { message: "Write a note first." }) @MaxLength(NOTE_MAX)
  body!: string;
}

/** POST /admin/moderation/cases/:id/actions */
export class CaseActionDto {
  @IsEnum(CaseAction)
  action!: CaseAction;

  /** Why (recorded in the audit trail). Required for decisions. */
  @IsOptional() @trim() @IsString() @MaxLength(NOTE_MAX)
  reason?: string;

  /** Only for confirm_violation. */
  @IsOptional() @IsArray() @ArrayMaxSize(5) @IsEnum(ModerationConsequence, { each: true })
  consequences?: ModerationConsequence[];

  /** Rule violated (defaults to the case's top reason). */
  @IsOptional() @IsEnum(ReportReason)
  rule?: ReportReason;

  /** Days for restrict_posting / suspend_temporary. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365)
  durationDays?: number;

  /** Message shown to the account owner with the decision. */
  @IsOptional() @trim() @IsString() @MaxLength(NOTE_MAX)
  userMessage?: string;

  /** High-impact actions must be explicitly confirmed. */
  @IsOptional() @IsBoolean()
  confirm?: boolean;
}

export class SetReportEligibilityDto {
  @IsBoolean()
  eligible!: boolean;

  @IsOptional() @trim() @IsString() @MaxLength(NOTE_MAX)
  reason?: string;
}

/** User: POST /moderation/decisions/:caseId/appeal */
export class SubmitAppealDto {
  @trim() @IsString() @MinLength(10, { message: "Tell us a little more (at least 10 characters)." }) @MaxLength(APPEAL_MAX)
  message!: string;
}

/** Staff: POST /admin/moderation/cases/:id/appeal-decision */
export class AppealDecisionDto {
  @IsIn([AppealStatus.UPHELD, AppealStatus.OVERTURNED])
  outcome!: AppealStatus.UPHELD | AppealStatus.OVERTURNED;

  @trim() @IsString() @MinLength(3, { message: "Record why." }) @MaxLength(NOTE_MAX)
  note!: string;

  @IsOptional() @IsBoolean()
  confirm?: boolean;
}

export class UpdateModerationSettingsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000)
  reviewThreshold?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000)
  highPriorityThreshold?: number;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsEnum(ReportReason, { each: true })
  urgentReasons?: ReportReason[];

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000)
  maxReportsPerDay?: number;

  @IsOptional() @IsBoolean()
  notifyOnNewCase?: boolean;
}
