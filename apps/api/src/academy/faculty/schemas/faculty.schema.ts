import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Faculty extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  dept: string;

  @Prop({ required: true })
  pos: string;

  @Prop({ required: true })
  edu: string;

  @Prop({ required: true })
  tag: string;

  @Prop()
  bio?: string;

  @Prop()
  photoUrl?: string;
}

export const FacultySchema = SchemaFactory.createForClass(Faculty);
