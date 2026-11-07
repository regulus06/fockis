import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export const KINDS = ["course", "seminar", "live_class", "workshop"] as const;
export const LESSON_TYPES = ["video", "pdf", "text", "quiz", "live"] as const;
export const LEVELS = ["beginner", "intermediate", "advanced", "all"] as const;
export const VISIBILITY = ["public", "hidden", "private", "draft", "school"] as const;

export class QuizQuestionDto {
  @IsString() @MinLength(1) @MaxLength(600)
  prompt!: string;

  @IsArray() @ArrayMaxSize(8) @IsString({ each: true }) @MaxLength(300, { each: true })
  options!: string[];

  @IsInt() @Min(0) @Max(7)
  answer!: number;

  @IsOptional() @IsString() @MaxLength(600)
  explain?: string;
}

export class QuizDto {
  @IsInt() @Min(0) @Max(100)
  passPct!: number;

  @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => QuizQuestionDto)
  questions!: QuizQuestionDto[];
}

export class StudioLessonDto {
  /** Keep the key of an existing lesson so learner progress is preserved. */
  @IsOptional() @IsString() @MaxLength(40)
  key?: string;

  @IsString() @MinLength(1) @MaxLength(160)
  title!: string;

  @IsIn(LESSON_TYPES)
  type!: (typeof LESSON_TYPES)[number];

  @IsOptional() @IsBoolean()
  preview?: boolean;

  @IsOptional() @IsInt() @Min(0) @Max(10000)
  durationMin?: number;

  @IsOptional() @IsISO8601()
  startsAt?: string;

  @IsOptional() @IsString() @MaxLength(120)
  section?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  videoUrl?: string;

  @IsOptional() @IsString() @MaxLength(400)
  storageKey?: string;

  @IsOptional() @IsString() @MaxLength(260)
  fileName?: string;

  @IsOptional() @IsString() @MaxLength(120)
  mimeType?: string;

  @IsOptional() @IsNumber()
  size?: number;

  @IsOptional() @IsString() @MaxLength(50000)
  body?: string;

  @IsOptional() @ValidateNested() @Type(() => QuizDto)
  quiz?: QuizDto;

  @IsOptional() @IsString() @MaxLength(1000)
  joinUrl?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  recordingUrl?: string;
}

export class SaveStudioCourseDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(160)
  name?: string;

  @IsOptional() @IsIn(KINDS)
  kind?: (typeof KINDS)[number];

  @IsOptional() @IsString() @MaxLength(120)
  brandName?: string;

  @IsOptional() @IsString() @MaxLength(80)
  category?: string;

  @IsOptional() @IsIn(LEVELS)
  level?: (typeof LEVELS)[number];

  @IsOptional() @IsString() @MaxLength(60)
  language?: string;

  @IsOptional() @IsString() @MaxLength(300)
  summary?: string;

  @IsOptional() @IsString() @MaxLength(20000)
  description?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  coverUrl?: string;

  @IsOptional() @IsBoolean()
  isFree?: boolean;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100000)
  price?: number;

  @IsOptional() @IsString() @Length(3, 3)
  currency?: string;

  @IsOptional() @IsISO8601()
  startsAt?: string;

  @IsOptional() @IsInt() @Min(0) @Max(100000)
  capacity?: number;

  @IsOptional() @IsIn(VISIBILITY)
  visibility?: (typeof VISIBILITY)[number];

  @IsOptional() @IsBoolean()
  enrollmentOpen?: boolean;

  @IsOptional() @IsBoolean()
  certificateEnabled?: boolean;

  @IsOptional() @IsMongoId()
  certificateTemplateId?: string;

  @IsOptional() @IsBoolean()
  clearCertificateTemplate?: boolean;

  /** Offer this class as one of my approved schools. */
  @IsOptional() @IsMongoId()
  institutionId?: string;

  /** The school teacher who teaches this class ("" = none). */
  @IsOptional() @IsString() @MaxLength(40)
  teacherKey?: string;

  /** Offer it as myself again. */
  @IsOptional() @IsBoolean()
  clearInstitution?: boolean;

  @IsOptional() @IsArray() @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => StudioLessonDto)
  lessons?: StudioLessonDto[];
}

export class ClaimPaymentDto {
  @IsString() @MinLength(3) @MaxLength(200)
  paymentIntentId!: string;
}

export class QuizAnswersDto {
  @IsArray() @ArrayMaxSize(100) @IsInt({ each: true })
  answers!: number[];
}
