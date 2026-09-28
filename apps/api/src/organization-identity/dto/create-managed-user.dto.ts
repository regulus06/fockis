import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class CreateManagedUserDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsString()
  @MinLength(3)
  username!: string;

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
  role!: string;

  @IsOptional()
  @IsString()
  customRole?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  domainId?: string;

  @IsOptional()
  @IsEmail()
  recoveryEmail?: string;

  @IsBoolean()
  sendActivationEmail!: boolean;

  @IsBoolean()
  requirePasswordChange!: boolean;

  @IsBoolean()
  requireTwoFactor!: boolean;
}