import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';



export type TourDocument =
  HydratedDocument<Tour>;



@Schema({
  timestamps: true,
})
export class Tour {


  @Prop({
    type: Types.ObjectId,
    ref: 'Property',
    required: true,
  })
  property: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  tenant: Types.ObjectId;



  @Prop({
    type: Types.ObjectId,
    ref: 'Agent',
  })
  agent?: Types.ObjectId;



  @Prop({
    required: true,
  })
  scheduledDate: Date;



  @Prop()
  scheduledTime?: string;



  @Prop({
    enum: [
      'pending',
      'confirmed',
      'cancelled',
      'completed',
      'no_show',
    ],
    default: 'pending',
  })
  status: string;



  @Prop()
  notes?: string;



  @Prop()
  tenantMessage?: string;



  @Prop()
  agentMessage?: string;



  @Prop({
    default: false,
  })
  reminderSent: boolean;



  @Prop()
  location?: string;


}


export const TourSchema =
  SchemaFactory.createForClass(
    Tour,
  );