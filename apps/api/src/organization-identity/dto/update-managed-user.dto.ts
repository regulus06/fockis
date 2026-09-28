import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
} from "class-validator";

export class UpdateManagedUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsIn([
    "owner",
    "admin",
    "manager",
    "staff",
    "teacher",
    "student",
    "member",
    "custom",
  ])
  role?: string;

  @IsOptional()
  @IsString()
  customRole?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  recoveryEmail?: string;

  @IsOptional()
  @IsBoolean()
  requirePasswordChange?: boolean;

  @IsOptional()
  @IsBoolean()
  requireTwoFactor?: boolean;
}