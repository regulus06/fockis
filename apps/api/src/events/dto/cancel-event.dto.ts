import { IsOptional, IsString, MaxLength } from "class-validator";

export class CancelEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: "The reason can be at most 1,000 characters." })
  reason?: string;
}
