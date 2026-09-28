import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class UpdateDomainCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freeDomainLimit?: number;

  @IsOptional()
  @IsBoolean()
  appliesToUsers?: boolean;

  @IsOptional()
  @IsBoolean()
  appliesToOrganizations?: boolean;

  @IsOptional()
  @IsArray()
  userIds?: string[];
}