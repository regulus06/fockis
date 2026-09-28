import {
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class InviteLiveGuestDto {
  @IsMongoId()
  guestUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class RespondLiveGuestDto {
  @IsIn(["accepted", "declined"])
  status!: "accepted" | "declined";
}

export class RemoveLiveGuestDto {
  @IsMongoId()
  guestUserId!: string;
}