import {
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateOrganizationBadgeDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  organizationLogoUrl?: string | null;

  @IsOptional()
  @IsString()
  organizationType?: string | null;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}