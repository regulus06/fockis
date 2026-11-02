import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsMongoId,
} from "class-validator";

/** POST /messages/bulk-delete */
export class BulkDeleteMessagesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsMongoId({ each: true })
  messageIds!: string[];

  @IsIn(["me", "everyone"])
  scope!: "me" | "everyone";
}

/** PATCH /messages/conversations/:id/(pin|archive|mute|unread) */
export class ConversationFlagDto {
  @IsBoolean()
  value!: boolean;
}

/** Legacy body for PATCH /messages/conversations/:id/mute */
export class MuteConversationDto {
  @IsBoolean()
  muted!: boolean;
}
