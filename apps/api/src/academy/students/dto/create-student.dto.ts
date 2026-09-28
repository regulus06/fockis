import { IsEmail, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateStudentDto {
  @IsOptional() @IsString() slug?: string;
  @IsString() name: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(4) gpa?: number;
  @IsOptional() @IsNumber() @Min(0) creditsCompleted?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) attendancePct?: number;
}
