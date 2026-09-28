import {
  IsArray,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

import {
  Type,
} from "class-transformer";

class CourseModuleUpdateDto {
  @IsNumber()
  @Min(0)
  order!: number;

  @IsString()
  title!: string;
}

class CourseAssignmentUpdateDto {
  @IsString()
  title!: string;

  @Type(() => Date)
  dueDate!: Date;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  gradeLabel?: string;
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

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
  @ValidateNested({ each: true })
  @Type(() => CourseModuleUpdateDto)
  modules?: CourseModuleUpdateDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseAssignmentUpdateDto)
  assignments?: CourseAssignmentUpdateDto[];
}