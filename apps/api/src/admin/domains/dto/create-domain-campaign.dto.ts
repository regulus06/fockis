import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateDomainCampaignDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsNumber()
  @Min(0)
  freeDomainLimit!: number;

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