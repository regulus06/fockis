import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

import type { AcademyRole } from "../schemas/academy-user.schema";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  name!: string;

  // ==========================================================================
  // NORMAL REGISTRATION ROLES
  // ==========================================================================
  // Administrator is intentionally NOT included.
  // Administrators must be created through bootstrapAdmin() or promoted
  // by an existing administrator.
  // ==========================================================================

  @IsOptional()
  @IsString()
  @IsIn([
    "student",
    "instructor",
    "advisor",
    "admissions",
    "employer",
    "staff",
  ])
  role?: Exclude<AcademyRole, "administrator">;
}