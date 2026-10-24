import {
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class PublishRecordingDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  caption?: string;
}
