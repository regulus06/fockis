import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class UpdateDomainPolicyDto {
  @IsOptional()
  @IsBoolean()
  domainsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  freeDomainsEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freeDomainsPerUser?: number;

  @IsOptional()
  @IsBoolean()
  paidDomainsEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidDomainPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  allowManualAssignment?: boolean;

  @IsOptional()
  @IsBoolean()
  allowUserDomainChanges?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  domainChangePrice?: number;
}