import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProgramCategory =
  | 'technology'
  | 'business'
  | 'healthcare'
  | 'trades';

export type ProgramIcon =
  | 'shield'
  | 'server'
  | 'code'
  | 'briefcase'
  | 'health'
  | 'wrench'
  | 'media';

@Schema({ _id: false })
export class CurriculumRow {
  @Prop({ required: true })
  code!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  credits!: string;
}

export const CurriculumRowSchema =
  SchemaFactory.createForClass(CurriculumRow);

@Schema({ timestamps: true })
export class Program extends Document {
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  slug!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({
    required: true,
    enum: [
      'technology',
      'business',
      'healthcare',
      'trades',
    ],
  })
  cat!: ProgramCategory;

  @Prop({ required: true })
  level!: string;

  @Prop({ required: true })
  desc!: string;

  @Prop({
    required: true,
    enum: [
      'shield',
      'server',
      'code',
      'briefcase',
      'health',
      'wrench',
      'media',
    ],
  })
  icon!: ProgramIcon;

  @Prop({
    type: [CurriculumRowSchema],
    default: [],
  })
  curriculum!: CurriculumRow[];
}

export const ProgramSchema =
  SchemaFactory.createForClass(Program);