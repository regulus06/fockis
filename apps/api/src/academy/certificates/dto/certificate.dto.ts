import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class SaveTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  baseTemplate!: string;

  @IsObject()
  design!: Record<string, unknown>;

  @IsOptional()
  @IsIn(["draft", "published"])
  status?: "draft" | "published";
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  baseTemplate?: string;

  @IsOptional()
  @IsObject()
  design?: Record<string, unknown>;

  @IsOptional()
  @IsIn(["draft", "published"])
  status?: "draft" | "published";
}

export class RecipientDto {
  @IsOptional()
  @IsMongoId()
  enrollmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class IssueCertificatesDto {
  @IsMongoId()
  templateId!: string;

  @IsIn(["course", "seminar", "workshop"])
  activityType!: "course" | "seminar" | "workshop";

  /** Course code, or event id for seminars/workshops. */
  @IsString()
  @IsNotEmpty()
  activityRef!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  activityName?: string;

  @IsOptional()
  @IsDateString()
  completionDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  institutionName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  duration?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  recipients!: RecipientDto[];
}

export class RevokeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
