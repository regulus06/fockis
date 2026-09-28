import {
  IsBoolean,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdateMessageSettingsDto {
  @IsBoolean()
  @IsOptional()
  messagingEnabled?: boolean;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxMessageLength?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxMessagesPerMinute?: number;

  @IsBoolean()
  @IsOptional()
  reactionsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  repliesEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  forwardingEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  editingEnabled?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  editWindowMinutes?: number;

  @IsBoolean()
  @IsOptional()
  deletionEnabled?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  deletionWindowHours?: number;

  @IsBoolean()
  @IsOptional()
  readReceiptsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  typingIndicatorsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  onlineStatusEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  linkPreviewsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  messageSearchEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  pinningEnabled?: boolean;
}