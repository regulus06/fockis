import { IsEmail, IsIn, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateApplicationDto {
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsEmail() email: string;
  @IsString() phone: string;

  @IsMongoId()
  programId: string;

  @IsOptional() @IsString() startTerm?: string;

  @IsOptional()
  @IsIn(['first_time', 'transfer', 'returning', 'international', 'veteran'])
  applicantType?: string;
}
