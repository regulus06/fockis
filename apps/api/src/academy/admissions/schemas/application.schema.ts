import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ApplicationStatus = 'submitted' | 'under_review' | 'accepted' | 'denied' | 'enrolled';

@Schema({ timestamps: true })
export class Application extends Document {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ type: Types.ObjectId, ref: 'Program', required: true })
  programId: Types.ObjectId;

  @Prop()
  startTerm?: string;

  @Prop({
    enum: ['first_time', 'transfer', 'returning', 'international', 'veteran'],
    default: 'first_time',
  })
  applicantType: string;

  @Prop({ default: 'submitted', enum: ['submitted', 'under_review', 'accepted', 'denied', 'enrolled'] })
  status: ApplicationStatus;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);
