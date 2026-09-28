import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type JobType = 'job' | 'internship' | 'apprenticeship';

@Schema({ timestamps: true })
export class Job extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  company: string;

  @Prop({ required: true })
  loc: string;

  @Prop({ required: true })
  pay: string;

  @Prop({ required: true, enum: ['job', 'internship', 'apprenticeship'] })
  type: JobType;

  @Prop({ required: true })
  desc: string;

  @Prop({ default: true })
  active: boolean;
}

export const JobSchema = SchemaFactory.createForClass(Job);
