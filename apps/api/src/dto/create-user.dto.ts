import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

// Must match the policies listed on the sign-up checkbox (web/src/pages/Register.tsx).
const ALLOWED_POLICIES = [
  "terms",
  "privacy",
  "community-guidelines",
  "child-safety",
  "payments",
  "shop-advertising",
  "copyright",
] as const;

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: "Username is required." })
  @MinLength(2)
  @MaxLength(30)
  username!: string;

  @IsEmail({}, { message: "Please provide a valid email address." })
  @IsNotEmpty({ message: "Email is required." })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: "Password is required." })
  @MinLength(12, {
    message: "Password must be at least 12 characters long.",
  })
  @MaxLength(100)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @IsString()
  @IsNotEmpty({ message: "Country is required." })
  @Length(2, 2, {
    message: "Country code must contain exactly 2 letters.",
  })
  @Matches(/^[A-Za-z]{2}$/, {
    message: "Country code must be a valid two-letter country code.",
  })
  countryCode!: string;

  @IsBoolean({
    message: "You must accept the terms and policies.",
  })
  termsAccepted!: boolean;

  @IsArray({
    message: "Accepted policies must be an array.",
  })
  @ArrayMinSize(1, {
    message: "You must accept the required policies.",
  })
  @ArrayMaxSize(ALLOWED_POLICIES.length, {
    message: "Too many policies were submitted.",
  })
  @IsString({ each: true })
  @IsIn([...ALLOWED_POLICIES], {
    each: true,
    message: "An accepted policy is invalid.",
  })
  acceptedPolicies!: string[];

  @IsString()
  @IsNotEmpty({
    message: "Policy acceptance version is required.",
  })
  @MaxLength(50)
  policyAcceptanceVersion!: string;

  // Accepted for compatibility with the frontend.
  // The server must generate the authoritative timestamp.
  @IsOptional()
  @IsString()
  @MaxLength(50)
  policyAcceptedAt?: string;
}