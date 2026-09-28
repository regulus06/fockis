import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateOrganizationBadgeDto {
  @IsString()
  organizationId!: string;

  @IsString()
  membershipId!: string;

  @IsOptional()
  @IsString()
  memberId?: string;

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
  @IsDateString()
  joinedAt?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}