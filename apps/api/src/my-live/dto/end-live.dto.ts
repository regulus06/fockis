import {
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class EndLiveDto {
  @IsOptional()
  @IsString()
  @MaxLength(250)
  reason?: string;
}