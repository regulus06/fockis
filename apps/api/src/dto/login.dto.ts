import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  /** "Keep me signed in": the token lasts for the policy's remember-me duration. */
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
