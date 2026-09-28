import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateJobDto {
  @IsString() title: string;
  @IsString() company: string;
  @IsString() loc: string;
  @IsString() pay: string;
  @IsIn(['job', 'internship', 'apprenticeship']) type: 'job' | 'internship' | 'apprenticeship';
  @IsString() desc: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
