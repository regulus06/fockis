
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
} from "class-validator";

export class ChangeEmailDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  newEmail!: string;

  // Required to verify the user's identity before requesting
  // an email change.
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;
}
