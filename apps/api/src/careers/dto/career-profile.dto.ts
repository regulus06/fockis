import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

import { Type } from "class-transformer";

const HTTP_URL = { require_protocol: true, protocols: ["http", "https"] };
const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

class EducationDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  school!: string;

  @IsOptional() @IsString() @MaxLength(150)
  degree?: string;

  @IsOptional() @IsString() @MaxLength(150)
  fieldOfStudy?: string;

  @IsOptional() @IsString() @MaxLength(20)
  startYear?: string;

  @IsOptional() @IsString() @MaxLength(20)
  endYear?: string;
}

class ExperienceDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  title!: string;

  @IsString() @IsNotEmpty() @MaxLength(150)
  company!: string;

  @IsOptional() @IsString() @MaxLength(150)
  location?: string;

  @IsOptional() @ValidateIf((_, v) => v !== "") @Matches(YEAR_MONTH, { message: "startDate must be YYYY-MM" })
  startDate?: string;

  @IsOptional() @ValidateIf((_, v) => v !== "") @Matches(YEAR_MONTH, { message: "endDate must be YYYY-MM" })
  endDate?: string;

  @IsOptional() @IsBoolean()
  current?: boolean;

  @IsOptional() @IsString() @MaxLength(3000)
  description?: string;
}

class CertificationDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @IsOptional() @IsString() @MaxLength(150)
  issuer?: string;

  @IsOptional() @IsString() @MaxLength(20)
  year?: string;

  @IsOptional() @IsBoolean()
  inProgress?: boolean;
}

export class UpdateCareerProfileDto {
  @IsOptional() @IsString() @MaxLength(150)
  headline?: string;

  @IsOptional() @IsString() @MaxLength(3000)
  summary?: string;

  @IsOptional() @IsString() @MaxLength(150)
  location?: string;

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @IsOptional() @ValidateIf((_, v) => v !== "") @IsUrl(HTTP_URL, { message: "LinkedIn URL must be a valid URL" }) @MaxLength(2048)
  linkedInUrl?: string;

  @IsOptional() @ValidateIf((_, v) => v !== "") @IsUrl(HTTP_URL, { message: "Website must be a valid URL" }) @MaxLength(2048)
  websiteUrl?: string;

  @IsOptional() @IsIn(["actively_looking", "open", "not_looking"])
  availability?: "actively_looking" | "open" | "not_looking";

  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @MaxLength(60, { each: true })
  skills?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => EducationDto)
  education?: EducationDto[];

  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => ExperienceDto)
  experience?: ExperienceDto[];

  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => CertificationDto)
  certifications?: CertificationDto[];
}

export class CreateJobAlertDto {
  @IsOptional() @IsString() @MaxLength(150)
  keywords?: string;

  @IsOptional() @IsString() @MaxLength(150)
  location?: string;

  @IsOptional() @IsIn(["", "job", "internship", "coop", "full_time", "part_time", "contract", "temporary"])
  type?: string;

  @IsOptional() @IsBoolean()
  remoteOnly?: boolean;
}
