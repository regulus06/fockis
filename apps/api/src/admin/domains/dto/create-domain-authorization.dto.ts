import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateDomainAuthorizationDto {
  @IsIn([
    "user",
    "organization",
  ])
  targetType!: "user" | "organization";

  @IsString()
  targetId!: string;

  @IsNumber()
  @Min(0)
  freeDomainQuantity!: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}