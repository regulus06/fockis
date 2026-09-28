import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from "class-validator";

import { Type } from "class-transformer";

/* ============================================================
   EDUCATION
============================================================ */

class EducationDto {
  @IsString()
  school!: string;

  @IsString()
  major!: string;

  @IsString()
  graduationDate!: string;
}

/* ============================================================
   EXPERIENCE
============================================================ */

class ExperienceDto {
  @IsString()
  roleTitle!: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsString()
  description!: string;
}

/* ============================================================
   CREATE APPLICATION DTO
============================================================ */

export class CreateApplicationDto {
  /*
   * The candidate must NOT submit userId.
   *
   * userId is taken from the authenticated JWT:
   * req.user.id
   */

  @IsString()
  jobId!: string;

  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;

  @IsString()
  location!: string;

  /* ==========================================================
     OPTIONAL PROFILE INFORMATION
  ========================================================== */

  @IsOptional()
  @IsUrl()
  linkedInUrl?: string;

  @IsOptional()
  @IsString()
  resumeFileName?: string;

  @IsOptional()
  @IsString()
  resumeUrl?: string;

  /* ==========================================================
     EDUCATION
  ========================================================== */

  @ValidateNested()
  @Type(() => EducationDto)
  education!: EducationDto;

  /* ==========================================================
     EXPERIENCE
  ========================================================== */

  @IsOptional()
  @ValidateNested()
  @Type(() => ExperienceDto)
  experience?: ExperienceDto;

  /* ==========================================================
     SKILLS
  ========================================================== */

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  /* ==========================================================
     COVER LETTER
  ========================================================== */

  @IsOptional()
  @IsString()
  coverLetter?: string;

  /* ==========================================================
     WORK AUTHORIZATION
  ========================================================== */

  @IsBoolean()
  workAuthorized!: boolean;

  /* ==========================================================
     AVAILABILITY
  ========================================================== */

  @IsOptional()
  @IsString()
  availableStartDate?: string;

  /* ==========================================================
     CUSTOM APPLICATION QUESTIONS
  ========================================================== */

  @IsOptional()
  @IsObject()
  answers?: Record<string, string>;
}