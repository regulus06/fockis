import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true })
export class Story extends Document {
  @Prop({ required: true })
  userId!: string;

  @Prop()
  username!: string;

  @Prop()
  avatar!: string;

  @Prop({ required: true })
  media!: string;

  @Prop({
    enum: ["image", "video"],
    default: "image",
  })
  type!: string;

  @Prop({ default: false })
  isProductStory!: boolean;

  @Prop({ default: null })
  productId?: string;

  @Prop({ default: null })
  productName?: string;

  @Prop({ default: null })
  productImage?: string;

  @Prop({ default: null })
  price?: number;

  @Prop({ default: null })
  shopLink?: string;

  @Prop({ default: null })
  sellerId?: string;

  @Prop({
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
  })
  expiresAt!: Date;
}

export const StorySchema = SchemaFactory.createForClass(Story);

// TTL index
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });