import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class NewsItem extends Document {
  @Prop({ required: true })
  tag: string;

  @Prop({ required: true })
  title: string;

  // Display date shown on the card (e.g. "Aug 4, 2026"). Sorting uses
  // createdAt from the timestamps option, not this field.
  @Prop({ required: true })
  date: string;

  @Prop()
  body?: string;

  @Prop({ default: true })
  published: boolean;
}

export const NewsItemSchema = SchemaFactory.createForClass(NewsItem);
