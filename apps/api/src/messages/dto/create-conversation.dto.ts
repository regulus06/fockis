import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  ArrayMinSize,
} from "class-validator";

export class CreateConversationDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({
    each: true,
  })
  participantIds!: string[];

  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  groupName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  groupAvatar?: string;
}