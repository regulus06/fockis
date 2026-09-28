import { IsEmail, IsOptional, IsString } from 'class-validator';

export class ApplyJobDto {
  @IsOptional()
  @IsString()
  applicantName?: string;

  @IsOptional()
  @IsEmail()
  applicantEmail?: string;
}
