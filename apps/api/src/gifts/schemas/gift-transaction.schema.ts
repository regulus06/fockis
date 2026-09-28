import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
  Types,
} from "mongoose";

export type GiftTransactionDocument =
  GiftTransaction & Document;

@Schema({
  timestamps: true,
})
export class GiftTransaction {

  /*
   * ============================================================
   * PERSON WHO SENDS THE GIFT
   * ============================================================
   */

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  senderId!: Types.ObjectId;

  /*
   * ============================================================
   * PERSON RECEIVING THE GIFT
   * ============================================================
   */

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  receiverId!: Types.ObjectId;

  /*
   * ============================================================
   * GIFT SELECTED
   * ============================================================
   */

  @Prop({
    type: Types.ObjectId,
    ref: "Gift",
    required: true,
    index: true,
  })
  giftId!: Types.ObjectId;

  /*
   * ============================================================
   * COINS REMOVED FROM SENDER
   * ============================================================
   */

  @Prop({
    type: Number,
    required: true,
    min: 1,
  })
  coinsSpent!: number;

  /*
   * ============================================================
   * LIVE SESSION ID
   *
   * Optional because the same gift system can now be used for:
   *
   * - LIVE gifts
   * - Post gifts
   * - Feed gifts
   *
   * Explicit type is required because the default is null.
   * ============================================================
   */

  @Prop({
    type: String,
    default: null,
    index: true,
  })
  liveId!: string | null;

  /*
   * ============================================================
   * POST ID
   *
   * This allows gifts to be sent directly under a Fockis post,
   * photo, or video.
   *
   * Optional for LIVE gifts.
   * ============================================================
   */

  @Prop({
    type: Types.ObjectId,
    ref: "Post",
    default: null,
    index: true,
  })
  postId!: Types.ObjectId | null;

  /*
   * ============================================================
   * ANIMATION
   *
   * Example:
   *
   * volcano.webm
   * dragon.webm
   * heart.webm
   * ============================================================
   */

  @Prop({
    type: String,
    default: "",
  })
  animation!: string;

  /*
   * ============================================================
   * GIFT EMOJI
   *
   * Stored on the transaction so historical gift records
   * still have display information even if the gift catalog
   * changes later.
   * ============================================================
   */

  @Prop({
    type: String,
    default: "",
  })
  emoji!: string;

  /*
   * ============================================================
   * GIFT NAME
   *
   * Stored for historical display.
   * ============================================================
   */

  @Prop({
    type: String,
    default: "",
  })
  giftName!: string;

  /*
   * ============================================================
   * SOUND
   * ============================================================
   */

  @Prop({
    type: String,
    default: "",
  })
  sound!: string;

  /*
   * ============================================================
   * DURATION
   * ============================================================
   */

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  duration!: number;

  /*
   * ============================================================
   * FULL SCREEN ANIMATION
   * ============================================================
   */

  @Prop({
    type: Boolean,
    default: false,
  })
  fullScreenAnimation!: boolean;
}

export const GiftTransactionSchema =
  SchemaFactory.createForClass(
    GiftTransaction,
  );
