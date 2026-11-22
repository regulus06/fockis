import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class EmergencyContactDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(60) relationship?: string;
  @IsOptional() @IsString() @MaxLength(40) @Matches(/^[+()\d\s.-]*$/, { message: "Enter a valid phone number." }) phone?: string;
}

export class BaptismDto {
  @IsIn(["not_recorded", "scheduled", "completed"]) status!: "not_recorded" | "scheduled" | "completed";
  @IsOptional() @IsString() @Matches(DATE, { message: "Use a valid baptism date." }) date?: string | null;
  @IsOptional() @IsString() @MaxLength(160) location?: string;
  @IsOptional() @IsString() @MaxLength(120) officiant?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class ConfirmationDto {
  @IsIn(["not_recorded", "scheduled", "completed"]) status!: "not_recorded" | "scheduled" | "completed";
  @IsOptional() @IsString() @Matches(DATE, { message: "Use a valid confirmation date." }) date?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) details?: string;
}

export class FamilyPersonDto {
  @IsOptional() @IsString() @MaxLength(40) id?: string;
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(60) relationship?: string;
  @IsOptional() @IsString() @Matches(/^[a-f0-9]{24}$/i, { message: "Invalid linked member." }) membershipId?: string | null;
  @IsOptional() @IsString() @Matches(DATE, { message: "Use a valid birth date." }) birthDate?: string | null;
}

export class FamilyDto {
  @IsOptional() @ValidateNested() @Type(() => FamilyPersonDto) spouse?: FamilyPersonDto | null;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => FamilyPersonDto) children?: FamilyPersonDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => FamilyPersonDto) household?: FamilyPersonDto[];
}

/** PATCH /members/:memberId/profile — only the sections sent are changed. */
export class UpdateMemberProfileDto {
  @IsOptional() @IsString() @MaxLength(80) preferredName?: string;
  @IsOptional() @IsString() @MaxLength(40) gender?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(40, { each: true }) languages?: string[];
  @IsOptional() @ValidateNested() @Type(() => EmergencyContactDto) emergencyContact?: EmergencyContactDto | null;

  @IsOptional() @IsString() @MaxLength(40) membershipNumber?: string;
  @IsOptional() @IsString() @MaxLength(60) membershipType?: string;
  @IsOptional() @IsString() @MaxLength(60) churchRole?: string;

  @IsOptional() @ValidateNested() @Type(() => BaptismDto) baptism?: BaptismDto;
  @IsOptional() @ValidateNested() @Type(() => ConfirmationDto) confirmation?: ConfirmationDto;
  @IsOptional() @IsString() @MaxLength(5000) faithJourney?: string;

  @IsOptional() @ValidateNested() @Type(() => FamilyDto) family?: FamilyDto;
}

export class AssignMinistryDto {
  @IsString() @Matches(/^[a-f0-9]{24}$/i, { message: "Choose a ministry." }) departmentId!: string;
  @IsOptional() @IsString() @MaxLength(60) role?: string;
  @IsOptional() @IsString() @Matches(/^[a-f0-9]{24}$/i, { message: "Choose a valid leader." }) leaderMembershipId?: string | null;
  @IsOptional() @IsString() @Matches(DATE, { message: "Use a valid start date." }) startDate?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) responsibilities?: string;
}

export class AddHistoryDto {
  @IsIn(["milestone", "record"]) kind!: "milestone" | "record";
  @IsString() @MaxLength(40) type!: string;
  @IsString() @MaxLength(160) title!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsString() @Matches(DATE, { message: "Use a valid date." }) date!: string;
}

export class AddNoteDto {
  @IsString() @MaxLength(40) category!: string;
  @IsIn(["admin", "pastoral"]) visibility!: "admin" | "pastoral";
  @IsString() @MaxLength(5000) body!: string;
}

export class DocumentFieldsDto {
  @IsString() @MaxLength(40) category!: string;
  @IsString() @MaxLength(160) title!: string;
  @IsOptional() @IsString() @Matches(DATE, { message: "Use a valid issue date." }) issuedAt?: string;
  @IsOptional() @IsString() @Matches(DATE, { message: "Use a valid expiration date." }) expiresAt?: string;
}

export class CertificateDto {
  @IsIn(["membership", "baptism", "confirmation"]) kind!: "membership" | "baptism" | "confirmation";
  @IsOptional() @IsBoolean() reissue?: boolean;
}
