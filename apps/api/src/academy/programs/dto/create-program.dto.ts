import {
  IsArray,
  IsIn,
  IsString,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

import type {
  ProgramCategory,
  ProgramIcon,
} from '../schemas/program.schema';

class CurriculumRowDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  credits!: string;
}

export class CreateProgramDto {
  @IsString()
  slug!: string;

  @IsString()
  name!: string;

  @IsIn([
    'technology',
    'business',
    'healthcare',
    'trades',
  ])
  cat!: ProgramCategory;

  @IsString()
  level!: string;

  @IsString()
  desc!: string;

  @IsIn([
    'shield',
    'server',
    'code',
    'briefcase',
    'health',
    'wrench',
    'media',
  ])
  icon!: ProgramIcon;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurriculumRowDto)
  curriculum!: CurriculumRowDto[];
}