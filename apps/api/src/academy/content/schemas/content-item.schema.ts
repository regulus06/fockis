import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ContentItem extends Document {
  @Prop({ required: true, index: true })
  section: string;

  @Prop({ required: true, default: 0 })
  order: number;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: Object, default: {} })
  meta?: Record<string, string>;
}

export const ContentItemSchema = SchemaFactory.createForClass(ContentItem);
