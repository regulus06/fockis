import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  MaxLength,
  Length,
} from "class-validator";

export class CreateUserDto {
  // ============================================================
  // USERNAME
  // ============================================================

  @IsString()
  @IsNotEmpty({
    message: "Username is required.",
  })
  @MinLength(2)
  @MaxLength(30)
  username!: string;

  // ============================================================
  // EMAIL
  // ============================================================

  @IsEmail(
    {},
    {
      message: "Please provide a valid email address.",
    },
  )
  @IsNotEmpty({
    message: "Email is required.",
  })
  email!: string;

  // ============================================================
  // PASSWORD
  // ============================================================

  @IsString()
  @IsNotEmpty({
    message: "Password is required.",
  })
  @MinLength(12, {
    message:
      "Password must be at least 12 characters long.",
  })
  @MaxLength(100)
  password!: string;

  // ============================================================
  // FIRST NAME
  // ============================================================

  @IsString()
  @MaxLength(50)
  firstName?: string;

  // ============================================================
  // LAST NAME
  // ============================================================

  @IsString()
  @MaxLength(50)
  lastName?: string;

  // ============================================================
  // COUNTRY
  // ============================================================
  //
  // REQUIRED FOR EVERY NEW ACCOUNT.
  //
  // The frontend sends:
  //
  // HT
  //
  // The backend creates:
  //
  // countryCode = HT
  // callingCode = +509
  //
  // The frontend NEVER sends callingCode.
  // ============================================================

  @IsString()
  @IsNotEmpty({
    message: "Country is required.",
  })
  @Length(2, 2, {
    message:
      "Country code must contain exactly 2 letters.",
  })
  @Matches(/^[A-Za-z]{2}$/, {
    message:
      "Country code must be a valid two-letter country code.",
  })
  countryCode!: string;
}