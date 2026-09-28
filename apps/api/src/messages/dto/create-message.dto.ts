import {
  IsArray,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsNumber,
} from "class-validator";

import {
  Type,
} from "class-transformer";

/* ============================================================================
   ATTACHMENT DTO
============================================================================ */

export class CreateAttachmentDto {
  @IsString()
  id!: string;

  @IsIn([
    "image",
    "video",
    "audio",
    "document",
  ])
  kind!:
    | "image"
    | "video"
    | "audio"
    | "document";

  @IsString()
  url!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsNumber()
  size!: number;

  @IsString()
  mimeType!: string;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  waveform?: number[];

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  caption?: string;
}

/* ============================================================================
   REPLY DTO
============================================================================ */

export class CreateReplyDto {
  @IsMongoId()
  messageId!: string;

  @IsString()
  @MaxLength(255)
  senderName!: string;

  @IsString()
  @MaxLength(500)
  preview!: string;

  @IsString()
  @IsIn([
    "text",
    "image",
    "video",
    "audio",
    "document",
    "file",
    "system",
  ])
  type!: string;
}

/* ============================================================================
   CREATE MESSAGE DTO
============================================================================ */

export class CreateMessageDto {
  @IsMongoId()
  conversationId!: string;

  @IsString()
  @IsIn([
    "text",
    "image",
    "video",
    "audio",
    "document",
    "file",
    "system",
  ])
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  text?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({
    each: true,
  })
  @Type(() => CreateAttachmentDto)
  attachments?: CreateAttachmentDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateReplyDto)
  replyTo?: CreateReplyDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  systemLabel?: string;
}