import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class CampusEvent extends Document {
  // Full date drives sorting/filtering; d/m are the pre-split display
  // fields the EventRow card renders directly (e.g. d="02", m="SEP").
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  d: string;

  @Prop({ required: true })
  m: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  loc: string;
}

export const CampusEventSchema = SchemaFactory.createForClass(CampusEvent);
