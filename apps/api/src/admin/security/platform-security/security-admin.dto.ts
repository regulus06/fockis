import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

/**
 * Body of PATCH /admin/security/policy and POST /admin/security/policy/preview.
 *
 * `accounts` and `managed` contain only the settings being changed. Every key
 * and value is validated against the policy definitions in the service.
 */
export class UpdatePlatformSecurityPolicyDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedVersion?: number;

  @IsOptional()
  @IsObject()
  accounts?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  managed?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  delegatedFields?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsBoolean()
  confirmHighRisk?: boolean;
}

export class SecurityAdminActionDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}
