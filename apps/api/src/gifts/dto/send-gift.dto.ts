import {
  IsMongoId,
  IsOptional,
  IsString,
} from "class-validator";

export class SendGiftDto {
  @IsMongoId()
  senderId!: string;

  @IsMongoId()
  receiverId!: string;

  @IsMongoId()
  giftId!: string;

  /**
   * Fockis feed post that received the gift.
   *
   * Optional because LIVE gifts may not belong
   * to a feed post.
   */
  @IsOptional()
  @IsMongoId()
  postId?: string;

  /**
   * LIVE session ID.
   *
   * Optional because feed gifts do not have
   * a live session.
   */
  @IsOptional()
  @IsString()
  liveId?: string;
}