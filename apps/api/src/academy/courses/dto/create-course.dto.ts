import {
  Type,
} from "class-transformer";

import {
  IsArray,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsIn,
} from "class-validator";

export class CourseModuleDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  order!: number;

  @IsString()
  @IsNotEmpty()
  title!: string;
}

export class CourseAssignmentDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsIn([
    "upcoming",
    "submitted",
    "graded",
  ])
  status?: string;

  @IsOptional()
  @IsString()
  gradeLabel?: string;
}

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsMongoId()
  programId?: string;

  @IsOptional()
  @IsMongoId()
  instructorId?: string;

  @IsOptional()
  @IsString()
  instructor?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({
    each: true,
  })
  @Type(() => CourseModuleDto)
  modules?: CourseModuleDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({
    each: true,
  })
  @Type(() => CourseAssignmentDto)
  assignments?: CourseAssignmentDto[];
}