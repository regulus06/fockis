import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

import { Type } from "class-transformer";

import {
  EMPLOYER_TEAM_ROLES,
} from "../schemas/employer-company.schema";

import {
  INTERVIEW_RECOMMENDATIONS,
  INTERVIEW_TYPES,
} from "../schemas/employer-interview.schema";

const HTTP_URL = {
  require_protocol: true,
  protocols: ["http", "https"],
};

const OBJECT_ID = /^[a-fA-F0-9]{24}$/;

/* ============================================================
   JOBS
============================================================ */

export class SetJobActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

/* ============================================================
   APPLICANTS
============================================================ */

export class AddApplicantNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body!: string;
}

/* ============================================================
   COMPANY PROFILE
============================================================ */

class SocialLinksDto {
  @IsOptional() @ValidateIf((_, v) => v !== "") @IsUrl(HTTP_URL) @MaxLength(2048)
  linkedin?: string;

  @IsOptional() @ValidateIf((_, v) => v !== "") @IsUrl(HTTP_URL) @MaxLength(2048)
  x?: string;

  @IsOptional() @ValidateIf((_, v) => v !== "") @IsUrl(HTTP_URL) @MaxLength(2048)
  facebook?: string;

  @IsOptional() @ValidateIf((_, v) => v !== "") @IsUrl(HTTP_URL) @MaxLength(2048)
  instagram?: string;

  @IsOptional() @ValidateIf((_, v) => v !== "") @IsUrl(HTTP_URL) @MaxLength(2048)
  youtube?: string;
}

class MediaItemDto {
  @IsUrl(HTTP_URL)
  @MaxLength(2048)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;
}

export class UpdateCompanyProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  companyName!: string;

  @IsOptional() @IsString() @MaxLength(120)
  industry?: string;

  @IsOptional() @IsString() @MaxLength(50)
  companySize?: string;

  @IsOptional() @ValidateIf((_, v) => v !== "") @IsUrl(HTTP_URL) @MaxLength(2048)
  website?: string;

  @IsOptional() @IsInt() @Min(1800) @Max(2100)
  foundedYear?: number;

  @IsOptional() @IsString() @MaxLength(100)
  country?: string;

  @IsOptional() @IsString() @MaxLength(100)
  city?: string;

  @IsOptional() @IsString() @MaxLength(100)
  stateProvince?: string;

  @IsOptional() @IsString() @MaxLength(300)
  tagline?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  about?: string;

  @IsOptional() @ValidateIf((_, v) => v !== "") @IsUrl(HTTP_URL) @MaxLength(2048)
  logoUrl?: string;

  @IsOptional() @ValidateIf((_, v) => v !== "") @IsUrl(HTTP_URL) @MaxLength(2048)
  coverImageUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  media?: MediaItemDto[];
}

/* ============================================================
   VERIFICATION
============================================================ */

class VerificationDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsUrl(HTTP_URL)
  @MaxLength(2048)
  url!: string;
}

export class SubmitVerificationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  legalName!: string;

  @IsEmail()
  @MaxLength(254)
  businessEmail!: string;

  @IsUrl(HTTP_URL)
  @MaxLength(2048)
  website!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string;

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => VerificationDocumentDto)
  documents!: VerificationDocumentDto[];
}

/* ============================================================
   TEAM
============================================================ */

export class InviteTeamMemberDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsIn(EMPLOYER_TEAM_ROLES as unknown as string[])
  role!: (typeof EMPLOYER_TEAM_ROLES)[number];
}

export class UpdateTeamMemberDto {
  @IsIn(EMPLOYER_TEAM_ROLES as unknown as string[])
  role!: (typeof EMPLOYER_TEAM_ROLES)[number];
}

/* ============================================================
   INTERVIEWS
============================================================ */

export class ScheduleInterviewDto {
  @Matches(OBJECT_ID, { message: "applicationId must be a valid id" })
  applicationId!: string;

  @IsDateString()
  startsAt!: string;

  @IsOptional() @IsInt() @Min(5) @Max(600)
  durationMinutes?: number;

  @IsOptional() @IsString() @MaxLength(100)
  timezone?: string;

  @IsIn(INTERVIEW_TYPES as unknown as string[])
  type!: (typeof INTERVIEW_TYPES)[number];

  @ValidateIf((dto: ScheduleInterviewDto) => dto.type === "video")
  @IsUrl(HTTP_URL, { message: "A valid meeting link is required for video interviews" })
  @MaxLength(2048)
  meetingUrl?: string;

  @ValidateIf((dto: ScheduleInterviewDto) => dto.type === "onsite")
  @IsString()
  @IsNotEmpty({ message: "A location is required for on-site interviews" })
  @MaxLength(300)
  location?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}

export class RescheduleInterviewDto {
  @IsOptional() @IsDateString()
  startsAt?: string;

  @IsOptional() @IsInt() @Min(5) @Max(600)
  durationMinutes?: number;

  @IsOptional() @IsString() @MaxLength(100)
  timezone?: string;

  @IsOptional() @IsIn(INTERVIEW_TYPES as unknown as string[])
  type?: (typeof INTERVIEW_TYPES)[number];

  @IsOptional() @ValidateIf((_, v) => v !== "") @IsUrl(HTTP_URL) @MaxLength(2048)
  meetingUrl?: string;

  @IsOptional() @IsString() @MaxLength(300)
  location?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}

export class InterviewFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsIn(INTERVIEW_RECOMMENDATIONS as unknown as string[])
  recommendation!: (typeof INTERVIEW_RECOMMENDATIONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comments?: string;
}

/* ============================================================
   SETTINGS + BILLING
============================================================ */

class NotificationSettingsDto {
  @IsOptional() @IsBoolean() newApplications?: boolean;
  @IsOptional() @IsBoolean() applicationStatusChanges?: boolean;
  @IsOptional() @IsBoolean() interviewReminders?: boolean;
  @IsOptional() @IsBoolean() weeklySummary?: boolean;
  @IsOptional() @IsBoolean() productUpdates?: boolean;
}

export class UpdateEmployerSettingsDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(150)
  companyName?: string;

  @IsOptional() @ValidateIf((_, v) => v !== "") @IsEmail() @MaxLength(254)
  contactEmail?: string;

  @IsOptional() @ValidateIf((_, v) => v !== "") @IsUrl(HTTP_URL) @MaxLength(2048)
  website?: string;

  @IsOptional() @IsString() @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notifications?: NotificationSettingsDto;
}

export class UpgradeRequestDto {
  @IsIn(["growth", "enterprise"])
  plan!: "growth" | "enterprise";
}

/** Choose an employer plan (prices are set in the Admin Center). */
export class ChoosePlanDto {
  @IsString()
  @MaxLength(50)
  plan!: string;
}

export class ClaimPlanPaymentDto {
  @IsString()
  @MaxLength(200)
  paymentIntentId!: string;
}
