import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateNested } from "class-validator";
import { INSTITUTION_TYPES } from "../schemas/institution.schema";

export class SaveInstitutionDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(160) name?: string;
  @IsOptional() @IsString() @Matches(/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/, { message: "The domain name must be 3–30 lowercase letters, numbers or dashes." }) slug?: string;
  @IsOptional() @IsIn(INSTITUTION_TYPES) type?: (typeof INSTITUTION_TYPES)[number];
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @IsString() @MaxLength(80) country?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(300) website?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(120) registrationNumber?: string;
  @IsOptional() @IsString() @MaxLength(1000) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(400) proofStorageKey?: string;
  @IsOptional() @IsString() @MaxLength(260) proofFileName?: string;
  @IsOptional() @IsBoolean() allowApplications?: boolean;
}

export class ApplyDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsEmail() personalEmail!: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(160) program?: string;
  @IsOptional() @IsString() @MaxLength(2000) message?: string;
}

export class NewStudentDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsEmail() personalEmail?: string;
  /** Optional preferred username (before @school.fockis.com). */
  @IsOptional() @IsString() @Matches(/^[a-z0-9][a-z0-9._-]{1,30}$/i, { message: "Usernames use letters, numbers, dots, dashes or underscores." }) username?: string;
}

export class BulkStudentsDto {
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => NewStudentDto)
  students!: NewStudentDto[];
}

export class ReasonDto {
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}

export class AddStaffDto {
  @IsEmail() email!: string;
  @IsOptional() @IsIn(["admin", "staff"]) role?: "admin" | "staff";
}

export class TeacherDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(120) department?: string;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @IsOptional() @IsString() @MaxLength(1000) photoUrl?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsBoolean() contactEnabled?: boolean;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) contactPhone?: string;
  @IsOptional() @IsString() @MaxLength(200) officeHours?: string;
  @IsOptional() @IsString() @MaxLength(1000) meetingUrl?: string;
}
