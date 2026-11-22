import { Transform, Type } from "class-transformer";
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

const trim = () => Transform(({ value }) => (typeof value === "string" ? value.trim() : value));

/** POST /events/:eventId/register */
export class RegisterForEventDto {
  @trim()
  @IsString()
  @IsNotEmpty({ message: "Enter your full name." })
  @MaxLength(120)
  attendeeName!: string;

  @trim()
  @IsEmail({}, { message: "Enter a valid email address." })
  @MaxLength(254)
  attendeeEmail!: string;

  @IsOptional()
  @trim()
  @IsString()
  @MaxLength(40)
  @Matches(/^[+()\d\s.-]*$/, { message: "Enter a valid phone number." })
  phone?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  attendeeCount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  ticketTypeId?: string;

  @IsOptional()
  @IsIn(["in_person", "online"])
  attendanceMode?: "in_person" | "online";

  /** { [questionId]: answer } — checked against the organizer's questions. */
  @IsOptional()
  @IsObject()
  answers?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  accessibilityNeeds?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialRequests?: string;

  @IsBoolean()
  @Equals(true, { message: "Please agree to the event terms and privacy policy." })
  agreeToTerms!: boolean;

  /** Names of the other people on a group registration (optional). */
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  guestNames?: string[];

  /** Two-letter country for the payment (paid events). */
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;
}

export class ConfirmRegistrationPaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  paymentIntentId!: string;
}

export class CancelRegistrationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RegistrationStatusDto {
  @IsIn(["approve", "reject", "cancel", "promote"])
  action!: "approve" | "reject" | "cancel" | "promote";

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CheckInDto {
  /** Scanned QR text, or a typed registration number (FKE-XXXX-XXXX). */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  registrationId?: string;

  /** Individual check-in: which attendee of the registration (0-based). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(19)
  attendeeIndex?: number;

  /** Undo a check-in made by mistake. */
  @IsOptional()
  @IsBoolean()
  undo?: boolean;

  /** Validate the ticket and return it without checking anyone in (group tickets). */
  @IsOptional()
  @IsBoolean()
  preview?: boolean;
}
