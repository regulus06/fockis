import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateDomainDto {
  @IsString()
  @IsNotEmpty()
  domain!: string;

  @IsOptional()
  @IsString()
  domainType?: string;

  @IsOptional()
  @IsString()
  parentDomainId?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  assignedMembershipId?: string;
}