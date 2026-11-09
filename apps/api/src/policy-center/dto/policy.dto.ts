import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

import {
  COMMENT_PERMISSIONS,
  CORRECTION_FIELDS,
  ENFORCEMENT_MODES,
  MESSAGE_PERMISSIONS,
  OPTIONAL_CONSENTS,
  POLICY_AUDIENCES,
  POLICY_CATEGORIES,
  POLICY_STATUSES,
  RULE_MODULES,
} from "../policy.constants";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const toInt = ({ value }: { value: unknown }) => (value === undefined || value === "" ? undefined : Number(value));
const toBool = ({ value }: { value: unknown }) => value === true || value === "true";

export const VERSION_PATTERN = /^\d{1,3}(\.\d{1,3}){0,2}$/;

/* ---------------- policies ---------------- */

export class SectionDto {
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  heading!: string;

  @IsString()
  @MaxLength(20000)
  body!: string;
}

export class DocumentRefDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @Transform(trim)
  @IsString()
  @Matches(/^(\/[^\s]*|https:\/\/[^\s]+)$/, { message: "Use a Fockis path or an https link." })
  @MaxLength(500)
  url!: string;
}

export class CreatePolicyDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title!: string;

  @Transform(trim)
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Use lowercase letters, numbers and dashes." })
  @MaxLength(80)
  slug!: string;

  @IsIn(POLICY_CATEGORIES)
  category!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsIn(POLICY_AUDIENCES)
  audience?: string;

  @IsOptional()
  @IsBoolean()
  requiredAcceptance?: boolean;

  @Transform(trim)
  @Matches(VERSION_PATTERN, { message: "Use a version like 1.0 or 2.3.1." })
  version!: string;

  @IsArray()
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections!: SectionDto[];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  changeSummary?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  reviewDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => DocumentRefDto)
  documents?: DocumentRefDto[];
}

/** Saves the working draft (creates one from the published text if none exists). */
export class SaveDraftDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsIn(POLICY_CATEGORIES)
  category?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsIn(POLICY_AUDIENCES)
  audience?: string;

  @IsOptional()
  @IsBoolean()
  requiredAcceptance?: boolean;

  @IsOptional()
  @Transform(trim)
  @Matches(VERSION_PATTERN, { message: "Use a version like 1.0 or 2.3.1." })
  version?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections?: SectionDto[];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  changeSummary?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  reviewDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => DocumentRefDto)
  documents?: DocumentRefDto[];
}

export class NoteDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class RequiredNoteDto {
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: "Explain the reason (at least 5 characters)." })
  @MaxLength(2000)
  note!: string;
}

export class ScheduleDto {
  @IsDateString()
  publishAt!: string;
}

export class RestoreVersionDto {
  @Transform(trim)
  @Matches(VERSION_PATTERN, { message: "Use a version like 1.0 or 2.3.1." })
  newVersion!: string;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  changeSummary!: string;
}

export class ListPoliciesQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(POLICY_CATEGORIES)
  category?: string;

  @IsOptional()
  @IsIn(POLICY_STATUSES)
  status?: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  page?: number;
}

export class ListVersionsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(24)
  policyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  page?: number;
}

/* ---------------- operational rules ---------------- */

export class SaveRuleDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Use lowercase letters, numbers and dashes." })
  @MaxLength(80)
  slug?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsIn(POLICY_CATEGORIES)
  category?: string;

  @IsOptional()
  @IsIn(RULE_MODULES)
  module?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  content?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  changeSummary?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsIn(ENFORCEMENT_MODES)
  enforcement?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  enforcementNotes?: string;
}

export class ListRulesQueryDto {
  @IsOptional()
  @IsIn(RULE_MODULES)
  module?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;
}

/* ---------------- acceptance & audit ---------------- */

export class AcceptanceQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(24)
  policyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  version?: string;

  /** Username or account ID. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(64)
  user?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  page?: number;
}

export class PolicyAuditQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  action?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  targetId?: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  page?: number;
}

export class UpdatePolicySettingsDto {
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(30)
  @Max(1825)
  defaultReviewDays?: number;

  @IsOptional()
  @IsBoolean()
  requireIndependentApproval?: boolean;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(90)
  approvalDeadlineDays?: number;

  @IsOptional()
  @IsBoolean()
  notifyUsersOnRequiredUpdate?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyApprovers?: boolean;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(365)
  acceptanceGraceDays?: number;
}

export class DataRequestsQueryDto {
  @IsOptional()
  @IsIn(["export", "correction"])
  type?: string;

  @IsOptional()
  @IsIn(["open", "completed", "all"])
  view?: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  page?: number;
}

export class ResolveCorrectionDto {
  @IsIn(["completed", "rejected"])
  status!: "completed" | "rejected";

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  response!: string;
}

/* ---------------- user side ---------------- */

export class AcceptPolicyDto {
  @IsString()
  @MaxLength(24)
  versionId!: string;
}

export class UpdatePrivacyDto {
  @IsOptional()
  @IsIn(["public", "private"])
  profileVisibility?: "public" | "private";

  @IsOptional()
  @IsIn(MESSAGE_PERMISSIONS)
  messaging?: string;

  @IsOptional()
  @IsIn(COMMENT_PERMISSIONS)
  comments?: string;

  @IsOptional()
  @IsBoolean()
  searchable?: boolean;
}

export class UpdateConsentDto {
  @IsIn(OPTIONAL_CONSENTS)
  key!: string;

  @IsBoolean()
  value!: boolean;
}

export class CorrectionRequestDto {
  @IsIn(CORRECTION_FIELDS)
  field!: string;

  @Transform(trim)
  @IsString()
  @MinLength(10, { message: "Describe what is wrong and what it should say (at least 10 characters)." })
  @MaxLength(2000)
  details!: string;
}

export class MuteDto {
  @IsString()
  @MaxLength(64)
  user!: string;
}

export class BoolQueryDto {
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  all?: boolean;
}
