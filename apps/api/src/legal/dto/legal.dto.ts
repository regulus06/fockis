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
  Max,
  MaxLength,
  Matches,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

import {
  APPROVAL_STATUSES,
  COMPLETION_STATUSES,
  EVIDENCE_RECORD_TYPES,
  HOLD_BASES,
  REQUEST_TYPES,
  RETENTION_RECORD_TYPES,
  RETENTION_STATUSES,
  VERIFICATION_STATUSES,
} from "../legal.constants";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const toInt = ({ value }: { value: unknown }) => (value === undefined || value === "" ? undefined : Number(value));

export class PageQueryDto {
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  page?: number;
}

/** Every sensitive read or action records why it was done. */
export class ReasonDto {
  @Transform(trim)
  @IsString()
  @MinLength(5, { message: "Record a reason (at least 5 characters)." })
  @MaxLength(1000)
  reason!: string;
}

export class HoldRecordDto {
  @IsIn(EVIDENCE_RECORD_TYPES)
  recordType!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  recordId!: string;
}

export class CreateHoldDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  caseReference!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title!: string;

  @IsIn(HOLD_BASES)
  legalBasis!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  basisDetails?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  scope?: string;

  /** Usernames or account IDs. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  subjects?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => HoldRecordDto)
  records?: HoldRecordDto[];

  @IsOptional()
  @IsDateString()
  reviewAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  requestId?: string;
}

export class UpdateHoldDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  scope?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  addSubjects?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => HoldRecordDto)
  addRecords?: HoldRecordDto[];

  @IsOptional()
  @IsDateString()
  reviewAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ListHoldsQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(["active", "released", "all"])
  status?: "active" | "released" | "all";

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class CreateRequestDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  authority!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  authorityContact?: string;

  @IsIn(REQUEST_TYPES)
  requestType!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  legalBasis?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  jurisdiction?: string;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(3000)
  requestedRecords!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  subjects?: string[];

  @IsOptional()
  @IsDateString()
  responseDeadline?: string;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @IsOptional()
  @IsBoolean()
  preservationRequested?: boolean;
}

export class VerifyRequestDto {
  @IsIn(VERIFICATION_STATUSES.filter((s) => s !== "pending"))
  status!: "verified" | "rejected";

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  note!: string;
}

export class ApproveRequestDto {
  @IsIn(APPROVAL_STATUSES.filter((s) => s !== "pending"))
  status!: "approved" | "partially_approved" | "denied";

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  note!: string;
}

export class UpdateRequestDto {
  @IsOptional()
  @IsIn(COMPLETION_STATUSES)
  completionStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  assignedTo?: string;

  @IsOptional()
  @IsDateString()
  responseDeadline?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

export class ListRequestsQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(["open", "overdue", "completed", "all"])
  view?: "open" | "overdue" | "completed" | "all";

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class PreserveDto {
  @IsIn(EVIDENCE_RECORD_TYPES.filter((t) => t !== "other"))
  recordType!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  recordId!: string;

  /** A hold or request must justify the preservation. */
  @IsOptional()
  @IsString()
  @MaxLength(24)
  holdId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  requestId?: string;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}

export class ListEvidenceQueryDto extends PageQueryDto {
  /** Username, account ID, record ID, record number, case reference or report ID. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(EVIDENCE_RECORD_TYPES)
  recordType?: string;

  @IsOptional()
  @IsIn(["preserved", "expired", "all"])
  status?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CreateExportDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  caseReference!: string;

  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MaxLength(24, { each: true })
  recordIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(24)
  requestId?: string;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}

export class UpdatePolicyDto {
  /** null clears the period (nothing is deleted automatically). */
  @IsOptional()
  @Transform(({ value }) => (value === null || value === "" ? null : Number(value)))
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(36500)
  retentionDays?: number | null;

  @IsOptional()
  @IsIn(["delete", "anonymize"])
  action?: "delete" | "anonymize";

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsIn(RETENTION_STATUSES)
  status?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  purpose?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  legalBasis?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  responsibleRole?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  nextReviewAt?: string;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}

export class RetentionTypeParam {
  @IsIn(RETENTION_RECORD_TYPES)
  recordType!: string;
}

export class RetentionRuleQuery {
  @IsOptional()
  @Transform(trim)
  @Matches(/^[a-z]{2,10}(-[a-z0-9]{1,10})?$|^global$/i, { message: "Use a jurisdiction code like US, EU, GB or US-CA." })
  jurisdiction?: string;
}

export class CreateJurisdictionRuleDto extends UpdatePolicyDto {
  @IsIn(RETENTION_RECORD_TYPES)
  recordType!: string;

  @Transform(trim)
  @Matches(/^[a-z]{2,10}(-[a-z0-9]{1,10})?$/i, { message: "Use a jurisdiction code like US, EU, GB or US-CA." })
  jurisdiction!: string;
}

export class AuditQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  action?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  caseReference?: string;
}

export class DeletionsQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(["requested", "processing", "completed", "completed_with_hold", "failed", "all"])
  status?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(64)
  search?: string;
}
