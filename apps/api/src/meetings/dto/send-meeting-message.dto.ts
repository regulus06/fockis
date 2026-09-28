import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class SendMeetingMessageDto {
  @IsString()
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];

  @IsOptional()
  @IsString()
  attachmentName?: string;
}