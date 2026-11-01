import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
export class CreateEmployerProfileDto {
  @IsString() @IsNotEmpty() @MaxLength(160) companyName!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) country!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) city!: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) website?: string;
  @IsOptional() @IsString() @MaxLength(120) industry?: string;
}
