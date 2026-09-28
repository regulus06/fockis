import {
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class JoinMeetingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  passcode?: string;
}