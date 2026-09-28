import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
} from "mongoose";

import {
  GiftCategory,
} from "../enums/gift-category.enum";

import {
  GiftRarity,
} from "../enums/gift-rarity.enum";

export type GiftDocument = Gift & Document;

@Schema({
  timestamps: true,
})
export class Gift {

  @Prop({
    required: true,
    unique: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
  })
  emoji!: string;

  @Prop({
    required: true,
  })
  description!: string;

  /**
   * Gift category.
   *
   * POPULAR is supported for manually featured gifts.
   *
   * LOVE / FUN / SPECIAL are the main
   * content categories.
   */
  @Prop({
    required: true,
    enum: Object.values(GiftCategory),
    index: true,
  })
  category!: GiftCategory;

  /**
   * Gift rarity.
   */
  @Prop({
    required: true,
    enum: Object.values(GiftRarity),
    index: true,
  })
  rarity!: GiftRarity;

  @Prop({
    required: true,
    min: 1,
  })
  coinPrice!: number;

  /**
   * Gift image displayed
   * in the gift picker.
   */
  @Prop({
    default: "",
  })
  image!: string;

  /**
   * Large LIVE animation.
   */
  @Prop({
    default: "",
  })
  animation!: string;

  /**
   * Sound effect.
   */
  @Prop({
    default: "",
  })
  sound!: string;

  /**
   * Seconds animation stays
   * on screen.
   */
  @Prop({
    default: 8,
    min: 1,
  })
  duration!: number;

  /**
   * Controls whether the gift
   * is available.
   */
  @Prop({
    default: true,
    index: true,
  })
  isActive!: boolean;

  /**
   * Full screen LIVE effect.
   */
  @Prop({
    default: false,
  })
  fullScreenAnimation!: boolean;
}

export const GiftSchema =
  SchemaFactory.createForClass(Gift);